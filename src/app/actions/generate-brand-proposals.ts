'use server'

import { generateObject } from 'ai'
import { z } from 'zod'
import { model, groqModel } from '@/lib/ai'

const ProposalsSchema = z.object({
  palettes: z.array(z.object({
    name: z.string().describe('Evocative palette name in the user language'),
    description: z.string().describe('Short description of the palette mood'),
    colors: z.array(z.object({
      hex: z.string().describe('Hex color code'),
      role: z.string().describe('Role: primary, secondary, accent, neutral, background, or surface'),
    })).min(5).max(6),
  })).length(3),
  fontCombos: z.array(z.object({
    name: z.string().describe('Descriptive name for this font pairing'),
    heading: z.string().describe('Google Fonts family for headings'),
    body: z.string().describe('Google Fonts family for body text'),
    description: z.string().describe('Brief description of the pairing feel'),
  })).length(4),
  personality: z.object({
    toneOfVoice: z.array(z.string()).length(15).describe('15 varied tone-of-voice chips like Friendly, Professional, Direct, Inspiring, Playful, Empathetic, Bold, Witty, Warm, Confident…'),
    values: z.array(z.string()).length(15).describe('15 varied brand-value chips like Innovation, Trust, Sustainability, Creativity, Quality, Integrity, Community, Passion, Excellence, Transparency…'),
  }),
  voice: z.object({
    taglines: z.array(z.string()).length(5).describe('5 brand tagline/slogan options'),
    ctas: z.array(z.string()).length(15).describe('15 varied CTA text options like Discover more, Book now, Start free — generate a wide variety so the user can rotate without repeating'),
    marketingHooks: z.array(z.string()).length(15).describe('15 varied marketing headline options for banners and ads — generate a wide variety so the user can rotate without repeating'),
  }),
  brandContext: z.string().describe('A 2-3 sentence strategic brand summary describing its vision, positioning, and value proposition'),
})

export type PaletteProposal = z.infer<typeof ProposalsSchema>['palettes'][number]
export type FontComboProposal = z.infer<typeof ProposalsSchema>['fontCombos'][number]
export type PersonalityProposal = z.infer<typeof ProposalsSchema>['personality']
export type VoiceProposal = z.infer<typeof ProposalsSchema>['voice']

export interface BrandProposals {
  palettes: PaletteProposal[]
  fontCombos: FontComboProposal[]
  personality: PersonalityProposal
  voice: VoiceProposal
  brandContext: string
}

export async function generateBrandProposals({
  brandName,
  businessOverview,
  existingColors,
  preferredLanguage = 'es',
}: {
  brandName: string
  businessOverview: string
  existingColors?: string[]
  preferredLanguage?: string
}): Promise<BrandProposals> {
  const langLabel = preferredLanguage === 'es' ? 'Spanish' : preferredLanguage === 'en' ? 'English' : preferredLanguage

  const colorContext = existingColors?.length
    ? `\nDetected brand colors (MUST anchor each palette proposal to these exact colors — you may adjust lightness/saturation by at most 15% or add 1 complementary color per palette, but the core hues must remain): ${existingColors.join(', ')}`
    : ''

  const prompt = `You are a world-class brand designer. Generate palette and typography proposals for a brand.

Brand: "${brandName}"
Business: "${businessOverview}"${colorContext}

IMPORTANT: Generate ALL names and descriptions in ${langLabel}.

Generate:
1. THREE color palettes, each with 5-6 colors and an evocative name:
   - Each palette should have a distinct personality (e.g., one bold, one elegant, one playful)
   - Each color needs a role: primary, secondary, accent, neutral, background (and optionally surface)
   - Colors must be harmonious and accessible (sufficient contrast)

2. FOUR font combinations (Google Fonts only):
   - Each pairing should have a display/serif heading font and a clean body font
   - Pairings should range from classic to modern
   - Use only widely available Google Fonts

3. PERSONALITY chips in 2 categories (exactly 15 chips each — generate a wide variety so the user can rotate through options without repeating):
   - Tone of voice: communication style adjectives (e.g., Friendly, Professional, Direct, Inspiring, Bold, Empathetic, Confident, Witty, Warm, Authoritative…)
   - Values: brand value nouns (e.g., Innovation, Trust, Sustainability, Creativity, Excellence, Integrity, Community, Passion, Transparency, Quality…)

4. VOICE proposals:
   - 5 tagline/slogan options that capture the brand essence
   - 15 CTA texts appropriate for the business (varied: short, long, formal, casual…)
   - 15 marketing headlines for banners and ads (varied tone and length)

5. BRAND CONTEXT:
   - A 2-3 sentence strategic summary of the brand's vision, positioning, and value proposition`

  try {
    const { object } = await generateObject({
      model,
      schema: ProposalsSchema,
      prompt,
    })
    return object
  } catch {
    const { object } = await generateObject({
      model: groqModel,
      schema: ProposalsSchema,
      prompt,
    })
    return object
  }
}
