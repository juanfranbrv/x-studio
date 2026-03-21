'use server'

import { generateObject } from 'ai'
import { z } from 'zod'
import { model, groqModel } from '@/lib/ai'
import { ApifyClient } from 'apify-client'
import type { AnalyzeBrandDNAResponse, BrandDNA } from '@/lib/brand-types'
import { analyzeBrandDNA } from './analyze-brand-dna'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN

const InstagramBrandSchema = z.object({
  brand_name: z.string(),
  tagline: z.string(),
  business_overview: z.string(),
  brand_values: z.array(z.string()).length(5),
  tone_of_voice: z.array(z.string()).length(3),
  visual_aesthetic: z.array(z.string()).length(3),
  target_audience: z.array(z.string()).length(3),
  text_assets: z.object({
    marketing_hooks: z.array(z.string()).length(5),
    visual_keywords: z.array(z.string()).length(5),
    ctas: z.array(z.string()).length(3),
    brand_context: z.string(),
  }),
})

async function extractColorsFromImages(imageUrls: string[]): Promise<string[]> {
  // Must use node-vibrant/node for server-side usage
  const { Vibrant } = await import('node-vibrant/node')
  const allColors: string[] = []

  const urls = imageUrls.slice(0, 6)
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const palette = await Vibrant.from(url).getPalette()
        const swatches = [
          palette.Vibrant,
          palette.DarkVibrant,
          palette.LightVibrant,
          palette.Muted,
          palette.DarkMuted,
          palette.LightMuted,
        ]
        return swatches
          .filter(Boolean)
          .map((s) => s!.hex)
      } catch {
        return []
      }
    })
  )

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allColors.push(...result.value)
    }
  }

  // Deduplicate and return top colors by frequency
  const freq = new Map<string, number>()
  for (const c of allColors) {
    const hex = c.toLowerCase()
    freq.set(hex, (freq.get(hex) || 0) + 1)
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([hex]) => hex)
}

async function scrapeInstagram(handle: string) {
  if (!APIFY_TOKEN) {
    throw new Error('APIFY_API_TOKEN not configured')
  }

  const cleanHandle = handle.replace(/^@/, '').trim()
  const client = new ApifyClient({ token: APIFY_TOKEN })

  const run = await client.actor('apify/instagram-profile-scraper').call({
    usernames: [cleanHandle],
    resultsLimit: 12,
  })

  const { items } = await client.dataset(run.defaultDatasetId).listItems()

  if (!items.length) {
    throw new Error(`No data found for @${cleanHandle}`)
  }

  const profile = items[0] as any

  const posts = (profile.latestPosts || []).slice(0, 12)
  const imageUrls = posts
    .map((p: any) => p.displayUrl || p.imageUrl)
    .filter(Boolean) as string[]
  const captions = posts
    .map((p: any) => p.caption)
    .filter(Boolean) as string[]

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

    // Step 2: Extract colors from post images
    const extractedColors = igData.imageUrls.length > 0
      ? await extractColorsFromImages(igData.imageUrls)
      : []

    // Step 3: AI analysis of bio + captions + optional web analysis in parallel
    const captionsSample = igData.captions.slice(0, 8).join('\n---\n')

    const aiPrompt = `You are a brand strategist. Analyze this Instagram profile and generate a brand identity.

Profile: @${igData.username}
Full Name: ${igData.fullName}
Bio: ${igData.biography}
Followers: ${igData.followersCount}

Recent captions:
${captionsSample}

IMPORTANT: Generate ALL text content in ${langLabel}.

Based on their visual style, tone of captions, and bio, generate:
- Brand values, tone, visual aesthetic
- Target audience
- Marketing hooks, visual keywords, CTAs
- A tagline and business overview`

    // Start web analysis in parallel if external URL exists
    const webPromise = igData.externalUrl
      ? analyzeBrandDNA(igData.externalUrl, false, clerkUserId).catch(() => null)
      : Promise.resolve(null)

    // AI analysis
    let aiResult: z.infer<typeof InstagramBrandSchema>

    try {
      const { object } = await generateObject({
        model,
        schema: InstagramBrandSchema,
        prompt: aiPrompt,
      })
      aiResult = object
    } catch {
      const { object } = await generateObject({
        model: groqModel,
        schema: InstagramBrandSchema,
        prompt: aiPrompt,
      })
      aiResult = object
    }

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
      colors: extractedColors.slice(0, 5).map((hex, i) => ({
        color: hex,
        sources: ['instagram'],
        score: 1 - i * 0.1,
        role: ['primary', 'secondary', 'accent', 'neutral', 'background'][i],
        selected: true,
      })),
      fonts: [
        { family: 'Inter', role: 'heading' as const },
        { family: 'Inter', role: 'body' as const },
      ],
      images: igData.imageUrls.slice(0, 6).map((url) => ({ url, selected: false })),
      preferred_language: preferredLanguage,
      text_assets: aiResult.text_assets,
      social_links: [{ platform: 'instagram', url: `https://instagram.com/${igData.username}`, username: igData.username }],
    }

    // Merge web data if available
    if (webResult?.success && webResult.data) {
      const web = webResult.data
      // Prefer web colors if extracted from real site
      if (web.colors?.length) {
        brandData.colors = web.colors.slice(0, 5).map((c) => ({ ...c, selected: true }))
      }
      // Prefer web fonts
      if (web.fonts?.length) {
        brandData.fonts = web.fonts
      }
      // Merge web URL
      if (web.url) brandData.url = web.url
      // Merge logos
      if (web.logo_url) brandData.logo_url = web.logo_url
      if (web.favicon_url) brandData.favicon_url = web.favicon_url
    }

    return { success: true, data: brandData }
  } catch (error: any) {
    console.error('[analyze-brand-instagram] Error:', error.message)

    // Fallback: try Microlink screenshot + AI vision if Apify fails
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

        // Use the scratch generation with whatever we got from metadata
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
