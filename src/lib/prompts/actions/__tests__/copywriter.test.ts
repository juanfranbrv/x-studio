import { describe, expect, it } from 'vitest'

import type { BrandDNA } from '@/lib/brand-types'

import { buildCopywriterPrompt } from '../copywriter'

const brandDNA = {
  brand_name: 'Post Laboratory',
  preferred_language: 'es',
  brand_values: ['claridad'],
  tone_of_voice: ['directo'],
  target_audience: ['creadores'],
} as BrandDNA

describe('buildCopywriterPrompt', () => {
  it('respeta el idioma detectado en el prompt del usuario por encima del Brand Kit', () => {
    const prompt = buildCopywriterPrompt({
      brandName: 'Post Laboratory',
      brandDNA,
      fieldLabel: 'Headline',
      rawMessage: 'Write the headline in English for a launch campaign',
      languageOverride: 'en',
    })

    expect(prompt).toContain('IDIOMA OBLIGATORIO: ENGLISH')
    expect(prompt).not.toContain('IDIOMA OBLIGATORIO: SPANISH')
  })
})
