import { describe, expect, it } from 'vitest'
import { buildCampaignPrompt, buildCatalogSummary, type GuideCatalog } from '../guide'

const catalogo: GuideCatalog = {
    brands: [{ slug: 'academia-bauset', name: 'ACADEMIA BAUSET' }],
    styles: [
        { slug: 'retrato-natural-calido', name: 'Retrato Natural Cálido' },
        { slug: 'comic-tinta-bicolor', name: 'Cómic Tinta Bicolor', description: 'Trazo grueso' },
    ],
    formats: [
        { id: 'ig-square', platform: 'instagram', name: 'Cuadrado', aspect_ratio: '1:1', description: 'Feed' },
        { id: 'ig-portrait-feed', platform: 'instagram', name: 'Vertical', aspect_ratio: '4:5' },
    ],
    layouts: [{ id: 'clean', name: 'Limpio', description: 'Espacio para texto' }],
    platforms: ['instagram', 'linkedin'],
}

describe('buildCampaignPrompt', () => {
    const prompt = buildCampaignPrompt(catalogo)

    it('incluye todos los identificadores elegibles', () => {
        expect(prompt).toContain('academia-bauset')
        expect(prompt).toContain('retrato-natural-calido')
        expect(prompt).toContain('comic-tinta-bicolor')
        expect(prompt).toContain('ig-portrait-feed')
        expect(prompt).toContain('clean')
        expect(prompt).toContain('linkedin')
    })

    it('muestra la proporcion de cada formato, que es lo que decide el encuadre', () => {
        expect(prompt).toContain('4:5')
        expect(prompt).toContain('1:1')
    })

    it('advierte de que no se pueden inventar identificadores', () => {
        expect(prompt.toLowerCase()).toContain('inventado')
    })

    it('deja claro que el prompt en prosa es valido', () => {
        expect(prompt).toContain('prosa')
    })

    it('describe la estructura del manifiesto', () => {
        expect(prompt).toContain('"version": 1')
        expect(prompt).toContain('"posts"')
        expect(prompt).toContain('scheduled_at')
        expect(prompt).toContain('ref')
    })

    it('aguanta catalogos vacios sin romperse', () => {
        const vacio = buildCampaignPrompt({ brands: [], styles: [], formats: [], layouts: [], platforms: [] })
        expect(vacio).toContain('no hay marcas disponibles')
        expect(vacio).toContain('sin estilos')
    })
})

describe('buildCatalogSummary', () => {
    it('resume el tamano de cada catalogo', () => {
        expect(buildCatalogSummary(catalogo)).toBe('1 marcas · 2 estilos · 2 formatos · 1 layouts')
    })
})
