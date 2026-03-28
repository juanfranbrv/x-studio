'use server'

import { z } from 'zod'
import { ApifyClient } from 'apify-client'
import { fetchMutation, fetchQuery } from 'convex/nextjs'
import { api } from '../../../convex/_generated/api'
import { generateTextUnified } from '@/lib/gemini'
import type { AnalyzeBrandDNAResponse, BrandDNA } from '@/lib/brand-types'
import sharp from 'sharp'
import { clusterColors } from '@/lib/color-utils'
import { analyzeBrandDNA, assignStudioColorRolesAction } from './analyze-brand-dna'

/**
 * Extracts brand colors from a profile picture.
 * Unlike the web logo extractor, this one preserves white/light colors
 * (they are valid brand colors in logos, not just backgrounds).
 * Returns 4-5 clustered, distinct colors with roles.
 */
async function extractColorsFromProfilePic(
  imageUrl: string
): Promise<{ color: string; sources: string[]; score: number; role: 'Fondo' | 'Texto' | 'Acento' }[]> {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return []

    const buffer = Buffer.from(await res.arrayBuffer())
    const image = sharp(buffer)
    const { width, height, channels } = await image.metadata()
    if (!width || !height) return []

    const raw = await image.raw().toBuffer()
    const ch = channels ?? 3
    const colorCounts = new Map<string, number>()
    const step = width * height > 10000 ? 3 : 1

    for (let i = 0; i < raw.length; i += ch * step) {
      const r = raw[i], g = raw[i + 1], b = raw[i + 2]
      const a = ch === 4 ? raw[i + 3] : 255
      if (a < 50) continue // skip transparent

      // Only skip pure black — keep whites and all brand colors
      if (r < 8 && g < 8 && b < 8) continue

      const qr = Math.round(r / 12) * 12
      const qg = Math.round(g / 12) * 12
      const qb = Math.round(b / 12) * 12
      const hex = `#${((1 << 24) + (qr << 16) + (qg << 8) + qb).toString(16).slice(1).toUpperCase()}`
      colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1)
    }

    const totalPixels = (width * height) / step
    // Take top candidates by frequency
    const candidates = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 60)
      .map(([hex, count]) => ({ hex, weight: count / totalPixels }))

    // Aggressive clustering (threshold 35) — merges near-duplicate browns/shades
    const clusters = clusterColors(candidates, 35)

    // Keep max 5 distinct colors, sorted by score descending
    const top5 = clusters
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((c) => ({
        color: c.representative,
        sources: ['logo'] as string[],
        score: c.score,
      }))

    return assignStudioColorRolesAction(top5)
  } catch {
    return []
  }
}

/** Downloads an external image URL and uploads it to Convex storage.
 *  Returns the permanent Convex URL, or null on failure. */
async function uploadExternalImageToConvex(externalUrl: string): Promise<string | null> {
  try {
    const res = await fetch(externalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
        Accept: 'image/*,*/*;q=0.8',
        Referer: 'https://www.instagram.com/',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    if (!contentType.startsWith('image/')) return null

    const buffer = await res.arrayBuffer()
    const uploadUrl = await fetchMutation(api.assets.generateUploadUrl, {})
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      body: buffer,
      headers: { 'Content-Type': contentType },
    })
    if (!uploadRes.ok) return null
    const { storageId } = await uploadRes.json()
    const url = await fetchQuery(api.assets.getImageUrl, { storageId })
    return url ?? null
  } catch {
    return null
  }
}

const APIFY_TOKEN = process.env.APIFY_API_TOKEN
const DEFAULT_INTELLIGENCE_MODEL = 'wisdom/gemini-2.5-flash'

const InstagramBrandSchema = z.object({
  brand_name: z.string(),
  tagline: z.string(),
  business_overview: z.string(),
  brand_values: z.array(z.string()).min(1),
  tone_of_voice: z.array(z.string()).min(1),
  visual_aesthetic: z.array(z.string()).min(1),
  target_audience: z.array(z.string()).min(1),
  text_assets: z.object({
    marketing_hooks: z.array(z.string()).min(1),
    visual_keywords: z.array(z.string()).min(1),
    ctas: z.array(z.string()).min(1),
    brand_context: z.string(),
  }),
})

async function scrapeInstagram(handle: string) {
  if (!APIFY_TOKEN) {
    throw new Error('APIFY_API_TOKEN not configured')
  }

  const cleanHandle = handle.replace(/^@/, '').trim()
  const client = new ApifyClient({ token: APIFY_TOKEN })

  const run = await client.actor('apify/instagram-profile-scraper').call({
    usernames: [cleanHandle],
    resultsLimit: 6,
  })

  const { items } = await client.dataset(run.defaultDatasetId).listItems()

  if (!items.length) {
    throw new Error(`No data found for @${cleanHandle}`)
  }

  const profile = items[0] as any
  const posts = (profile.latestPosts || []).slice(0, 12)
  const imageUrls = posts.map((p: any) => p.displayUrl || p.imageUrl).filter(Boolean) as string[]
  const captions = posts.map((p: any) => p.caption).filter(Boolean) as string[]

  return {
    username: cleanHandle,
    fullName: profile.fullName || cleanHandle,
    biography: profile.biography || '',
    externalUrl: profile.externalUrl || null,
    profilePicUrl: profile.profilePicUrl || null,
    followersCount: profile.followersCount || 0,
    imageUrls,
    captions,
  }
}

export async function analyzeBrandInstagram(
  handle: string,
  clerkUserId: string,
  preferredLanguage: string = 'es'
): Promise<AnalyzeBrandDNAResponse> {
  const langLabel = preferredLanguage === 'es' ? 'Spanish' : preferredLanguage === 'en' ? 'English' : preferredLanguage

  try {
    // Step 1: Scrape Instagram
    const igData = await scrapeInstagram(handle)

    // Step 2: Get admin-configured intelligence model
    const intelligenceModel = await fetchQuery(api.admin.getSetting, { key: 'model_intelligence' }) as string || DEFAULT_INTELLIGENCE_MODEL

    // Step 3: AI analysis of bio + captions + optional web analysis in parallel
    const captionsSample = igData.captions.slice(0, 8).join('\n---\n')

    const jsonStructure = `{
  "brand_name": string,
  "tagline": string,
  "business_overview": string,
  "brand_values": string[],
  "tone_of_voice": string[],
  "visual_aesthetic": string[],
  "target_audience": string[],
  "text_assets": {
    "marketing_hooks": string[],
    "visual_keywords": string[],
    "ctas": string[],
    "brand_context": string
  }
}`

    const aiPrompt = `You are a brand strategist. Analyze this Instagram profile and generate a complete brand identity.

Profile: @${igData.username}
Full Name: ${igData.fullName}
Bio: ${igData.biography}
Followers: ${igData.followersCount}

Recent captions:
${captionsSample}

IMPORTANT: Generate ALL text content in ${langLabel}.
Respond ONLY with a valid JSON object (no markdown, no explanation) matching this structure:
${jsonStructure}

Include 5 brand_values, 3 tone_of_voice adjectives, 3 visual_aesthetic adjectives, 3 target_audience profiles, 5 marketing_hooks, 5 visual_keywords, 3 ctas.`

    // Start web analysis in parallel if external URL exists
    const webPromise = igData.externalUrl
      ? analyzeBrandDNA(igData.externalUrl, false, clerkUserId).catch(() => null)
      : Promise.resolve(null)

    // AI analysis using admin-configured model
    const rawText = await generateTextUnified(
      { name: '', brand_dna: {} as BrandDNA },
      aiPrompt,
      intelligenceModel,
      undefined,
      'You are a brand strategist that responds exclusively with valid JSON objects. No markdown, no explanation.'
    )

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI returned no JSON')
    const aiResult = InstagramBrandSchema.parse(JSON.parse(jsonMatch[0]))

    // Wait for web analysis
    const webResult = await webPromise

    // Upload profile pic to Convex so it's always accessible (Instagram CDN blocks hotlinking)
    const profilePicConvexUrl = igData.profilePicUrl
      ? await uploadExternalImageToConvex(igData.profilePicUrl)
      : null

    // Extract colors from profile pic (since there's no web to scrape)
    const logoForColors = profilePicConvexUrl || igData.profilePicUrl
    const logoColors = logoForColors
      ? await extractColorsFromProfilePic(logoForColors).catch(() => [])
      : []

    // Build base brand DNA
    const brandData: BrandDNA = {
      url: igData.externalUrl || `https://instagram.com/${igData.username}`,
      brand_name: aiResult.brand_name || igData.fullName,
      tagline: aiResult.tagline,
      business_overview: aiResult.business_overview,
      brand_values: aiResult.brand_values,
      tone_of_voice: aiResult.tone_of_voice,
      visual_aesthetic: aiResult.visual_aesthetic,
      target_audience: aiResult.target_audience,
      colors: logoColors,
      fonts: [
        { family: 'Inter', role: 'heading' as const },
        { family: 'Inter', role: 'body' as const },
      ],
      favicon_url: profilePicConvexUrl || igData.profilePicUrl || undefined,
      logo_url: profilePicConvexUrl || igData.profilePicUrl || undefined,
      logos: profilePicConvexUrl
        ? [{ url: profilePicConvexUrl, selected: true }]
        : igData.profilePicUrl
          ? [{ url: igData.profilePicUrl, selected: true }]
          : [],
      images: igData.imageUrls.slice(0, 6).map((url) => ({ url, selected: false })),
      preferred_language: preferredLanguage,
      text_assets: aiResult.text_assets,
      social_links: [{ platform: 'instagram', url: `https://instagram.com/${igData.username}`, username: igData.username }],
    }

    // Merge web data if available
    if (webResult?.success && webResult.data) {
      const web = webResult.data
      if (web.colors?.length) {
        brandData.colors = web.colors.slice(0, 5).map((c) => ({ ...c, selected: true }))
      }
      if (web.fonts?.length) {
        brandData.fonts = web.fonts
      }
      if (web.url) brandData.url = web.url
      if (web.logo_url) brandData.logo_url = web.logo_url
      if (web.favicon_url) brandData.favicon_url = web.favicon_url
    }

    return { success: true, data: brandData }
  } catch (error: any) {
    console.error('[analyze-brand-instagram] Error:', error.message)

    // Fallback: try Microlink screenshot + scratch generation
    try {
      const cleanHandle = handle.replace(/^@/, '').trim()
      const igUrl = `https://www.instagram.com/${cleanHandle}/`
      const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(igUrl)}&screenshot=true&meta=true`
      const resp = await fetch(microlinkUrl, { signal: AbortSignal.timeout(15000) })
      const data = await resp.json()

      if (data.status === 'success' && data.data) {
        const meta = data.data
        const screenshotUrl = meta.screenshot?.url
        const title = meta.title || cleanHandle
        const description = meta.description || ''

        const { generateBrandFromScratch } = await import('./generate-brand-from-scratch')
        const result = await generateBrandFromScratch(
          title,
          description || `Instagram profile @${cleanHandle}`,
          preferredLanguage
        )

        if (result.success && result.data) {
          result.data.url = igUrl
          if (screenshotUrl) result.data.screenshot_url = screenshotUrl
        }

        return result
      }
    } catch (fallbackError: any) {
      console.error('[analyze-brand-instagram] Fallback also failed:', fallbackError.message)
    }

    return {
      success: false,
      error: error.message || 'Failed to analyze Instagram profile',
    }
  }
}
