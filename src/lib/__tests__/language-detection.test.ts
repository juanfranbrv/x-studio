import { describe, expect, it } from 'vitest'

import { resolveGenerationLanguage } from '../language-detection'

describe('resolveGenerationLanguage', () => {
  it('prioriza el idioma detectado en el prompt sobre el idioma del Brand Kit', async () => {
    await expect(
      resolveGenerationLanguage({
        promptParts: ['Write a short carousel about healthy breakfast ideas for busy teams'],
      })
    ).resolves.toBe('en')
  })

  it('vuelve al fallback base cuando no hay prompt', async () => {
    await expect(
      resolveGenerationLanguage({
        promptParts: ['   '],
      })
    ).resolves.toBe('es')
  })
})
