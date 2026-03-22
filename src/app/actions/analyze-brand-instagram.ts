'use server'

import { z } from 'zod'
import { ApifyClient } from 'apify-client'
import { fetchQuery } from 'convex/nextjs'
import { api } from '../../../convex/_generated/api'
import { generateTextUnified } from '@/lib/gemini'
import type { AnalyzeBrandDNAResponse, BrandDNA } from '@/lib/brand-types'
import { analyzeBrandDNA } from './analyze-brand-dna'

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
      colors: [],
      fonts: [
        { family: 'Inter', role: 'heading' as const },
        { family: 'Inter', role: 'body' as const },
      ],
      favicon_url: igData.profilePicUrl || undefined,
      logo_url: igData.profilePicUrl || undefined,
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
