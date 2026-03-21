'use server'

import { generateObject } from 'ai'
import { z } from 'zod'
import { model, groqModel } from '@/lib/ai'
import type { AnalyzeBrandDNAResponse } from '@/lib/brand-types'

const ScratchBrandSchema = z.object({
  brand_name: z.string().describe('The brand name provided by the user'),
  tagline: z.string().describe('A short, powerful tagline for the brand'),
  business_overview: z.string().describe('2-3 sentence description of what the business does'),
  brand_values: z.array(z.string()).length(5).describe('5 core brand values'),
  tone_of_voice: z.array(z.string()).length(3).describe('3 adjectives describing the brand voice'),
  visual_aesthetic: z.array(z.string()).length(3).describe('3 adjectives describing the visual style'),
  target_audience: z.array(z.string()).length(3).describe('3 ideal customer profiles'),
  colors: z.array(z.object({
    hex: z.string().describe('Hex color code'),
    role: z.string().describe('Role: primary, secondary, accent, neutral, or background'),
  })).length(5).describe('5 brand colors with roles'),
  fonts: z.array(z.object({
    family: z.string().describe('Google Fonts family name'),
    role: z.enum(['heading', 'body']).describe('Font role'),
  })).length(2).describe('2 Google Fonts: one for headings, one for body'),
  text_assets: z.object({
    marketing_hooks: z.array(z.string()).length(5).describe('Short headlines for advertising banners'),
    visual_keywords: z.array(z.string()).length(5).describe('Keywords for AI image generation'),
    ctas: z.array(z.string()).length(3).describe('Call-to-action button texts'),
    brand_context: z.string().describe('Deep business context for AI ad generation'),
  }),
})

export async function generateBrandFromScratch(
  brandName: string,
  businessDescription: string,
  preferredLanguage: string = 'es'
): Promise<AnalyzeBrandDNAResponse> {
  const langLabel = preferredLanguage === 'es' ? 'Spanish' : preferredLanguage === 'en' ? 'English' : preferredLanguage

  const prompt = `You are a world-class brand strategist. Generate a complete brand identity from scratch.

Brand name: "${brandName}"
Business description: "${businessDescription}"

IMPORTANT: Generate ALL text content (tagline, values, tone, aesthetics, hooks, CTAs, context) in ${langLabel}.

Requirements:
- 5 harmonious colors: 1 primary (vibrant, main brand color), 1 secondary (complementary), 1 accent (pop/CTA), 1 neutral (text/borders), 1 background (light/dark base)
- 2 Google Fonts that pair well: 1 display/serif for headings, 1 clean sans-serif for body text
- Values, tone, and aesthetic should be specific to this business, not generic
- Marketing hooks should be punchy and ready to use in ads
- Visual keywords should help AI generate on-brand imagery
- CTAs should be compelling and action-oriented`

  try {
    const { object } = await generateObject({
      model,
      schema: ScratchBrandSchema,
      prompt,
    })

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
        colors: object.colors.map((c) => ({
          color: c.hex,
          sources: ['ai-generated'],
          score: 1,
          role: c.role,
          selected: true,
        })),
        fonts: object.fonts.map((f) => ({
          family: f.family,
          role: f.role,
        })),
        images: [],
        preferred_language: preferredLanguage,
        text_assets: object.text_assets,
      },
    }
  } catch (primaryError: any) {
    console.error('[generate-brand-from-scratch] Primary model failed:', primaryError.message)

    try {
      const { object } = await generateObject({
        model: groqModel,
        schema: ScratchBrandSchema,
        prompt,
      })

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
          colors: object.colors.map((c) => ({
            color: c.hex,
            sources: ['ai-generated'],
            score: 1,
            role: c.role,
            selected: true,
          })),
          fonts: object.fonts.map((f) => ({
            family: f.family,
            role: f.role,
          })),
          images: [],
          preferred_language: preferredLanguage,
          text_assets: object.text_assets,
        },
      }
    } catch (fallbackError: any) {
      console.error('[generate-brand-from-scratch] Fallback model also failed:', fallbackError.message)
      return {
        success: false,
        error: fallbackError.message || 'Failed to generate brand identity',
      }
    }
  }
}
