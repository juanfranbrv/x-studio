import { describe, expect, it } from 'vitest'
import { buildBrandColorsFromKit, normalizeColorRole, resolveCampaignColors } from '../brand-colors'

describe('normalizeColorRole', () => {
    it('reconoce los roles del kit en cualquier variante', () => {
        expect(normalizeColorRole('texto')).toBe('Texto')
        expect(normalizeColorRole('TEXT')).toBe('Texto')
        expect(normalizeColorRole('fondo')).toBe('Fondo')
        expect(normalizeColorRole('Background/Fondo')).toBe('Fondo')
        expect(normalizeColorRole('acento')).toBe('Acento')
    })

    it('cae en Acento ante lo desconocido o vacio', () => {
        expect(normalizeColorRole(undefined)).toBe('Acento')
        expect(normalizeColorRole('cualquier-cosa')).toBe('Acento')
    })
})

describe('buildBrandColorsFromKit', () => {
    it('mapea objetos con color y rol', () => {
        expect(buildBrandColorsFromKit([{ color: '#1A3D6D', role: 'texto' }, { color: '#F4B942', role: 'acento' }]))
            .toEqual([
                { color: '#1a3d6d', role: 'Texto' },
                { color: '#f4b942', role: 'Acento' },
            ])
    })

    it('acepta hex sin almohadilla y cadenas sueltas', () => {
        expect(buildBrandColorsFromKit(['1a3d6d', { hex: 'F4B942' }])).toEqual([
            { color: '#1a3d6d', role: 'Acento' },
            { color: '#f4b942', role: 'Acento' },
        ])
    })

    it('descarta entradas sin color utilizable', () => {
        expect(buildBrandColorsFromKit([{ color: '' }, { role: 'texto' }, { color: '#000' }])).toEqual([
            { color: '#000', role: 'Acento' },
        ])
    })

    it('devuelve vacio ante entradas no utilizables', () => {
        expect(buildBrandColorsFromKit(null)).toEqual([])
        expect(buildBrandColorsFromKit([])).toEqual([])
        expect(buildBrandColorsFromKit('#fff')).toEqual([])
    })
})

describe('resolveCampaignColors', () => {
    const kit = [{ color: '#1a3d6d', role: 'texto' }]

    it('usa los del manifiesto cuando existen', () => {
        expect(resolveCampaignColors(['#ff0000'], kit)).toEqual([{ color: '#ff0000', role: 'Acento' }])
    })

    it('cae en los del kit cuando el manifiesto no declara ninguno', () => {
        expect(resolveCampaignColors(undefined, kit)).toEqual([{ color: '#1a3d6d', role: 'Texto' }])
        expect(resolveCampaignColors([], kit)).toEqual([{ color: '#1a3d6d', role: 'Texto' }])
    })
})
