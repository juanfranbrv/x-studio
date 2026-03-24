'use server'

import { z } from 'zod'
import sharp from 'sharp'
import { ApifyClient } from 'apify-client'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { api } from '../../../convex/_generated/api'
import { generateTextUnified } from '@/lib/gemini'
import type { AnalyzeBrandDNAResponse, BrandDNA } from '@/lib/brand-types'
import { clusterColors, assignStudioColorRoles } from '@/lib/color-utils'
import { analyzeBrandDNA } from './analyze-brand-dna'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN
const DEFAULT_INTELLIGENCE_MODEL = 'wisdom/gemini-2.5-flash'

/**
 * Extracts dominant colors from a remote image URL using sharp pixel analysis.
 * Skips near-white, near-black and transparent pixels to focus on brand colors.
 */
async function extractColorsFromImageUrl(imageUrl: string, maxColors = 8): Promise<string[]> {
  try {
    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) })
    if (!response.ok) return []

    const buffer = Buffer.from(await response.arrayBuffer())
    const image = sharp(buffer)
    const { width, height, channels } = await image.metadata()
    if (!width || !height) return []

    const rawBuffer = await image.raw().toBuffer()
    const colorCounts = new Map<string, number>()
    const ch = channels ?? 3
    const step = width * height > 10000 ? 3 : 1

    for (let i = 0; i < rawBuffer.length; i += ch * step) {
      const r = rawBuffer[i]
      const g = rawBuffer[i + 1]
      const b = rawBuffer[i + 2]
      const a = ch === 4 ? rawBuffer[i + 3] : 255

      if (a < 50) continue

      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const l = (max + min) / 2 / 255

      // Skip near-white, pure white, near-black
      if (l > 0.92 || (r > 248 && g > 248 && b > 248) || (r < 8 && g < 8 && b < 8)) continue

      // Quantize to nearest 10
      const qr = Math.round(r / 10) * 10
      const qg = Math.round(g / 10) * 10
      const qb = Math.round(b / 10) * 10

      const hex = `#${((1 << 24) + (qr << 16) + (qg << 8) + qb).toString(16).slice(1).toUpperCase()}`
      colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1)
    }

    return Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxColors)
      .map(([hex]) => hex)
  } catch {
    return []
  }
}

/**
 * Builds a deduplicated brand palette from profile pic + post images.
 * Returns up to 5 clustered colors in BrandDNA format.
 */
async function extractInstagramPalette(
  profilePicUrl: string | null,
  imageUrls: string[]
): Promise<BrandDNA['colors']> {
  const sources: Array<{ url: string; weight: number; label: string }> = []

  if (profilePicUrl) sources.push({ url: profilePicUrl, weight: 3, label: 'instagram-profile' })
  imageUrls.slice(0, 3).forEach((url) => sources.push({ url, weight: 1, label: 'instagram-post' }))

  if (!sources.length) return []

  const allColors = await Promise.allSettled(sources.map((s) => extractColorsFromImageUrl(s.url)))

  const votes: { hex: string; weight: number }[] = []
  sources.forEach((s, idx) => {
    const result = allColors[idx]
    if (result.status === 'fulfilled') {
      result.value.forEach((hex, rank) =>
        votes.push({ hex, weight: s.weight * (1 - rank * 0.08) })
      )
    }
  })

  if (!votes.length) return []

  const raw = clusterColors(votes, 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((c) => ({
      color: c.representative,
      sources: ['instagram'],
      score: Math.round(c.score * 100) / 100,
      selected: true,
    }))

  return assignStudioColorRoles(raw)
}

/**
 * Downloads an external image URL, converts to WebP and uploads to Convex Storage.
 * Returns a permanent public URL, or null on failure.
 */
async function uploadImageToConvex(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!response.ok) return null

    const buffer = Buffer.from(await response.arrayBuffer())
    const webpBuffer = await sharp(buffer)
      .resize({ width: 400, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer()

    const uploadUrl = await fetchMutation(api.assets.generateUploadUrl, {})
    const result = await fetch(uploadUrl, {
      method: 'POST',
      body: new Blob([new Uint8Array(webpBuffer)], { type: 'image/webp' }),
      headers: { 'Content-Type': 'image/webp' },
    })
    if (!result.ok) return null

    const { storageId } = await result.json()
    return await fetchQuery(api.assets.getImageUrl, { storageId })
  } catch {
    return null
  }
}

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

class InstagramAccountNotFoundError extends Error {
  readonly code = 'INSTAGRAM_ACCOUNT_NOT_FOUND'
  constructor(handle: string) {
    super(`Instagram account @${handle} not found`)
    this.name = 'InstagramAccountNotFoundError'
  }
}

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
    throw new InstagramAccountNotFoundError(cleanHandle)
  }

  const profile = items[0] as any

  // Apify sometimes returns an item with an error field for non-existent profiles
  if (profile.error || profile.pageNotFound || (profile.username === undefined && !profile.fullName)) {
    throw new InstagramAccountNotFoundError(cleanHandle)
  }
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

    // Start web analysis + color extraction + profile pic upload in parallel
    const webPromise = igData.externalUrl
      ? analyzeBrandDNA(igData.externalUrl, false, clerkUserId).catch(() => null)
      : Promise.resolve(null)

    const colorPromise = extractInstagramPalette(igData.profilePicUrl, igData.imageUrls)

    // Upload profile pic to Convex so it's always accessible (Instagram CDN blocks browser loads)
    const profilePicUploadPromise = igData.profilePicUrl
      ? uploadImageToConvex(igData.profilePicUrl).catch(() => null)
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

    // Wait for all parallel tasks
    const [webResult, instagramColors, hostedProfilePicUrl] = await Promise.all([
      webPromise,
      colorPromise,
      profilePicUploadPromise,
    ])

    // Use hosted URL if available, fallback to original (may not load in browser)
    const profilePicUrl = hostedProfilePicUrl || igData.profilePicUrl || undefined

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
      colors: instagramColors,
      fonts: [
        { family: 'Inter', role: 'heading' as const },
        { family: 'Inter', role: 'body' as const },
      ],
      favicon_url: profilePicUrl,
      logo_url: profilePicUrl,
      images: igData.imageUrls.slice(0, 6).map((url) => ({ url, selected: false })),
      preferred_language: preferredLanguage,
      text_assets: aiResult.text_assets,
      social_links: [{ platform: 'instagram', url: `https://instagram.com/${igData.username}`, username: igData.username }],
    }

    // Merge web data if available (web colors take priority if richer)
    if (webResult?.success && webResult.data) {
      const web = webResult.data
      if (web.colors?.length && web.colors.length >= instagramColors.length) {
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

    // Account not found — return hard error, no fallback
    if (error instanceof InstagramAccountNotFoundError || error.code === 'INSTAGRAM_ACCOUNT_NOT_FOUND') {
      return {
        success: false,
        error: 'INSTAGRAM_ACCOUNT_NOT_FOUND',
      }
    }

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
          result.data.debug = {
            ...(result.data.debug || {}),
            fallback: true,
            fallback_reason: 'instagram_scrape_failed',
          }
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
