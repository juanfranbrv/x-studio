'use server'

import { z } from 'zod'
import { fetchQuery } from 'convex/nextjs'
import { api } from '../../../convex/_generated/api'
import { assignStudioColorRoles } from '@/lib/color-utils'
import { generateTextUnified } from '@/lib/gemini'
import type { AnalyzeBrandDNAResponse, BrandDNA } from '@/lib/brand-types'

const DEFAULT_INTELLIGENCE_MODEL = 'wisdom/gemini-2.5-flash'

const ScratchBrandSchema = z.object({
  brand_name: z.string(),
  tagline: z.string(),
  business_overview: z.string(),
  brand_values: z.array(z.string()).min(1),
  tone_of_voice: z.array(z.string()).min(1),
  visual_aesthetic: z.array(z.string()).min(1),
  target_audience: z.array(z.string()).min(1),
  colors: z.array(z.object({
    hex: z.string(),
    role: z.string(),
  })).min(1),
  fonts: z.array(z.object({
    family: z.string(),
    role: z.enum(['heading', 'body']),
  })).min(1),
  text_assets: z.object({
    marketing_hooks: z.array(z.string()).min(1),
    visual_keywords: z.array(z.string()).min(1),
    ctas: z.array(z.string()).min(1),
    brand_context: z.string(),
  }),
})

export async function generateBrandFromScratch(
  brandName: string,
  businessDescription: string,
  preferredLanguage: string = 'es'
): Promise<AnalyzeBrandDNAResponse> {
  const langLabel = preferredLanguage === 'es' ? 'Spanish' : preferredLanguage === 'en' ? 'English' : preferredLanguage

  const intelligenceModel = await fetchQuery(api.admin.getSetting, { key: 'model_intelligence' }) as string || DEFAULT_INTELLIGENCE_MODEL

  const jsonStructure = `{
  "brand_name": string,
  "tagline": string,
  "business_overview": string,
  "brand_values": string[],
  "tone_of_voice": string[],
  "visual_aesthetic": string[],
  "target_audience": string[],
  "colors": [{ "hex": string, "role": "primary"|"secondary"|"accent"|"neutral"|"background" }],
  "fonts": [{ "family": string, "role": "heading"|"body" }],
  "text_assets": {
    "marketing_hooks": string[],
    "visual_keywords": string[],
    "ctas": string[],
    "brand_context": string
  }
}`

  const prompt = `Generate a complete brand identity from scratch.

Brand name: "${brandName}"
Business description: "${businessDescription}"

IMPORTANT: Generate ALL text content in ${langLabel}.
Respond ONLY with a valid JSON object (no markdown, no explanation) matching this structure:
${jsonStructure}

Requirements:
- 5 harmonious colors with roles: primary, secondary, accent, neutral, background
- 2 Google Fonts that pair well: one for headings (role: "heading"), one for body (role: "body")
- 5 brand_values, 3 tone_of_voice adjectives, 3 visual_aesthetic adjectives, 3 target_audience profiles
- 5 marketing_hooks (punchy ad headlines), 5 visual_keywords (for AI image generation), 3 ctas`

  try {
    const rawText = await generateTextUnified(
      { name: brandName, brand_dna: {} as BrandDNA },
      prompt,
      intelligenceModel,
      undefined,
      'You are a world-class brand strategist. Respond exclusively with valid JSON objects. No markdown, no explanation, no code blocks.'
    )

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI returned no JSON')
    const object = ScratchBrandSchema.parse(JSON.parse(jsonMatch[0]))

    return {
      success: true,
      data: {
        url: '',
        brand_name: object.brand_name,
        tagline: object.tagline,
        business_overview: object.business_overview,
        brand_values: object.brand_values,
        tone_of_voice: object.tone_of_voice,
        visual_aesthetic: object.visual_aesthetic,
        target_audience: object.target_audience,
        colors: assignStudioColorRoles(
          object.colors.map((c, i) => ({
            color: c.hex,
            sources: ['ai-generated'],
            score: object.colors.length - i,
            selected: true,
          }))
        ),
        fonts: object.fonts.map((f) => ({
          family: f.family,
          role: f.role,
        })),
        images: [],
        preferred_language: preferredLanguage,
        text_assets: object.text_assets,
      },
    }
  } catch (error: any) {
    console.error('[generate-brand-from-scratch] Failed:', error.message)
    return {
      success: false,
      error: error.message || 'Failed to generate brand identity',
    }
  }
}
