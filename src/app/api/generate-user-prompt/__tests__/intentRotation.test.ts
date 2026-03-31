import { describe, expect, it } from 'vitest'
import { selectPromptIntent } from '../intentRotation'

describe('generate-user-prompt intent rotation', () => {
    it('evita repetir el intent mas reciente cuando hay opciones cercanas fuertes', () => {
        const selected = selectPromptIntent({
            module: 'image',
            brandKitId: 'brand-bakery',
            seed: '2026-03-29',
            brandName: 'Forn Serra',
            businessOverview: 'Obrador artesanal de pan, bolleria y coques de Sant Joan con tradicion familiar.',
            toneOfVoice: 'cercano, experto, artesanal',
            targetAudience: 'familias y amantes del buen pan',
            brandValues: 'tradicion, calidad, oficio',
            marketingHooks: 'calidad real, fermentacion lenta, producto artesanal',
            recentIntents: ['behind_the_scenes', 'educational_angle'],
        })

        expect(selected.id).not.toBe('behind_the_scenes')
        expect(['educational_angle', 'product_showcase', 'community_hook', 'proof_results']).toContain(selected.id)
    })

    it('rota entre candidatos top aunque la marca tenga fuerte sesgo artesanal', () => {
        const first = selectPromptIntent({
            module: 'image',
            brandKitId: 'brand-bakery',
            seed: '2026-03-29',
            brandName: 'Forn Serra',
            businessOverview: 'Obrador artesanal de pan, croissants y coques con proceso propio.',
            toneOfVoice: 'calido, experto',
            targetAudience: 'vecinos, familias, foodies',
            brandValues: 'tradicion, excelencia, cercania',
            marketingHooks: 'producto de temporada, calidad visible, elaboracion propia',
            recentIntents: [],
        })

        const second = selectPromptIntent({
            module: 'image',
            brandKitId: 'brand-bakery',
            seed: '2026-03-30',
            brandName: 'Forn Serra',
            businessOverview: 'Obrador artesanal de pan, croissants y coques con proceso propio.',
            toneOfVoice: 'calido, experto',
            targetAudience: 'vecinos, familias, foodies',
            brandValues: 'tradicion, excelencia, cercania',
            marketingHooks: 'producto de temporada, calidad visible, elaboracion propia',
            recentIntents: [],
        })

        expect(first.id).not.toBe(second.id)
    })
})
