import { describe, expect, it } from 'vitest'
import { looksLikeLegacyVisualBrief, shouldRefreshAiImageDescription } from '../legacy-visual-brief'

describe('legacy visual brief detection', () => {
  it('detecta descripciones visuales legacy largas y decorativas', () => {
    expect(
      looksLikeLegacyVisualBrief(
        "Mostrem el procés artesanal de les nostres coques de Sant Joan, amb un focus en els detalls, la llum càlida del taller i un ambient proper."
      )
    ).toBe(true)
  })

  it('no marca como legacy un ángulo editorial limpio', () => {
    expect(
      looksLikeLegacyVisualBrief('Posar en valor el treball familiar darrere de cada coca de Sant Joan.')
    ).toBe(false)
  })

  it('fuerza refresco si el textarea conserva una sugerencia antigua o un brief legacy', () => {
    expect(
      shouldRefreshAiImageDescription({
        currentDescription: 'Eduquem el paladar! Mostrem un primer pla de la massa amb llum càlida.',
        previousSuggestions: ['Educar sobre la qualitat real del producte.']
      })
    ).toBe(true)

    expect(
      shouldRefreshAiImageDescription({
        currentDescription: 'Posar en valor el treball familiar darrere de cada coca de Sant Joan.',
        previousSuggestions: ['Posar en valor el treball familiar darrere de cada coca de Sant Joan.']
      })
    ).toBe(true)

    expect(
      shouldRefreshAiImageDescription({
        currentDescription: 'Explicar per què una coca artesanal no és una peça més de temporada.',
        previousSuggestions: ['Posar en valor el treball familiar darrere de cada coca de Sant Joan.']
      })
    ).toBe(false)
  })
})
