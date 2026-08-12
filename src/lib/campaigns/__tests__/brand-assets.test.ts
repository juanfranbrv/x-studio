import { describe, expect, it } from 'vitest'
import { buildAuxiliaryLogoContext, resolveAsset } from '../brand-assets'

const kit = {
    url: 'bauset.es',
    phones: ['961 49 00 00'],
    emails: ['info@bauset.es'],
    addresses: ['Avda. Santa Maria, 31 Meliana'],
    logos: [
        { id: 'principal', url: 'https://cdn/principal.png' },
        { id: 'cambridge', url: 'https://cdn/cambridge.png' },
        { id: 'pearson', url: 'https://cdn/pearson.png' },
    ],
}

describe('resolveAsset', () => {
    it('true toma el valor del kit', () => {
        expect(resolveAsset(true, kit.phones)).toBe('961 49 00 00')
    })

    it('una cadena pisa lo del kit', () => {
        expect(resolveAsset('900 123 456', kit.phones)).toBe('900 123 456')
    })

    it('false o ausente no devuelve nada', () => {
        expect(resolveAsset(false, kit.phones)).toBeNull()
        expect(resolveAsset(undefined, kit.phones)).toBeNull()
    })

    it('devuelve null si el kit no tiene el dato', () => {
        expect(resolveAsset(true, undefined)).toBeNull()
        expect(resolveAsset(true, [])).toBeNull()
    })
})

describe('buildAuxiliaryLogoContext', () => {
    it('con true incluye todos menos el principal', () => {
        const items = buildAuxiliaryLogoContext(kit, true, 'https://cdn/principal.png')
        expect(items.map((i) => i.value)).toEqual(['https://cdn/cambridge.png', 'https://cdn/pearson.png'])
    })

    it('con una lista incluye solo los indicados', () => {
        const items = buildAuxiliaryLogoContext(kit, ['cambridge'], 'https://cdn/principal.png')
        expect(items).toHaveLength(1)
        expect(items[0].value).toBe('https://cdn/cambridge.png')
    })

    it('acepta referencias por posicion', () => {
        const items = buildAuxiliaryLogoContext(kit, ['logo-2'], null)
        expect(items[0].value).toBe('https://cdn/pearson.png')
    })

    it('todos los elementos son de tipo logo', () => {
        const items = buildAuxiliaryLogoContext(kit, true, null)
        expect(items.every((i) => i.type === 'logo')).toBe(true)
    })

    it('devuelve vacio si no se piden', () => {
        expect(buildAuxiliaryLogoContext(kit, false, null)).toEqual([])
        expect(buildAuxiliaryLogoContext(kit, undefined, null)).toEqual([])
        expect(buildAuxiliaryLogoContext(null, true, null)).toEqual([])
    })
})
