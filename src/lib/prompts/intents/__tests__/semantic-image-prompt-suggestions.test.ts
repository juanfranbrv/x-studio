import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildSemanticImagePromptSuggestions } from '../semantic-image-prompt-suggestions'

const promptSource = fs.readFileSync(
  path.resolve(__dirname, '../lazy-intent-parser.md'),
  'utf8'
)

describe('buildSemanticImagePromptSuggestions', () => {
  it('pide contenido visual de apoyo y no intenciones editoriales', () => {
    expect(promptSource).toContain('support or illustrate the publication message')
    expect(promptSource).toContain('Never return editorial angles')
    expect(promptSource).toContain('Wrong: "Explicar')
  })

  it('convierte salidas editoriales en prompts visuales semanticos', () => {
    const suggestions = buildSemanticImagePromptSuggestions({
      targetLanguage: 'ca',
      detectedIntent: 'bts',
      userText: 'Volem una publicacio sobre el secret de la nostra massa mare i el proces artesanal del obrador.',
      headline: 'El secret de la nostra massa mare',
      imageTexts: ['Massa mare viva, fermentacio lenta i treball artesanal.'],
      modelSuggestions: [
        'Posar en valor el proces real darrere de El secret de la nostra massa mare.',
        'Explicar amb criteri que fa especial El secret de la nostra massa mare.',
      ],
    })

    expect(suggestions).toHaveLength(8)
    expect(new Set(suggestions).size).toBe(8)

    suggestions.forEach((item) => {
      const lower = item.toLowerCase()
      expect(lower).not.toContain('explicar')
      expect(lower).not.toContain('demostrar')
      expect(lower).not.toContain('posar en valor')
      expect(lower).not.toContain('reivindicar')
      expect(lower).not.toContain('llum')
      expect(lower).not.toContain('ambient')
      expect(lower).not.toContain('composicio')
      expect(lower).not.toContain('primer pla')
      expect(item.endsWith('.')).toBe(true)
    })

    expect(suggestions.some((item) => item.toLowerCase().includes('massa mare'))).toBe(true)
    expect(suggestions.some((item) => item.toLowerCase().includes('obrador'))).toBe(true)
    expect(suggestions.some((item) => item.toLowerCase().includes('mans'))).toBe(true)
    expect(suggestions.some((item) => item.toLowerCase().includes('ingredients'))).toBe(true)
  })
})
