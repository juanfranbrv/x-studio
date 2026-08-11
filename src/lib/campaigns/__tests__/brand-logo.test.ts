import { describe, expect, it } from 'vitest'
import { buildCampaignContext, selectBrandLogoUrl } from '../brand-logo'

const kit = {
    logo_url: 'https://cdn/legacy.png',
    logos: [
        { id: 'l1', url: 'https://cdn/principal.png' },
        { id: 'l2', url: 'https://cdn/secundario.png' },
    ],
}

describe('selectBrandLogoUrl', () => {
    it('toma el primer logo cuando no se indica preferencia', () => {
        expect(selectBrandLogoUrl(kit)).toBe('https://cdn/principal.png')
    })

    it('respeta el logo pedido por id', () => {
        expect(selectBrandLogoUrl(kit, 'l2')).toBe('https://cdn/secundario.png')
    })

    it('acepta la preferencia por posicion', () => {
        expect(selectBrandLogoUrl(kit, 'logo-1')).toBe('https://cdn/secundario.png')
    })

    it('si la preferencia no existe, cae en el primero disponible', () => {
        expect(selectBrandLogoUrl(kit, 'no-existe')).toBe('https://cdn/principal.png')
    })

    it('admite logos como cadenas sueltas', () => {
        expect(selectBrandLogoUrl({ logos: ['https://cdn/suelto.png'] })).toBe('https://cdn/suelto.png')
    })

    it('cae en logo_url cuando no hay lista de logos', () => {
        expect(selectBrandLogoUrl({ logo_url: 'https://cdn/legacy.png', logos: [] })).toBe('https://cdn/legacy.png')
    })

    it('ignora entradas vacias', () => {
        expect(selectBrandLogoUrl({ logos: [{ url: '' }, { url: '  ' }, { url: 'https://cdn/ok.png' }] }))
            .toBe('https://cdn/ok.png')
    })

    it('devuelve null cuando no hay nada utilizable', () => {
        expect(selectBrandLogoUrl(null)).toBeNull()
        expect(selectBrandLogoUrl({})).toBeNull()
        expect(selectBrandLogoUrl({ logos: [] })).toBeNull()
    })
})

describe('buildCampaignContext', () => {
    it('adjunta el logo por defecto', () => {
        expect(buildCampaignContext(kit)).toEqual([
            { id: 'flow-logo', type: 'logo', value: 'https://cdn/principal.png', label: 'Logo' },
        ])
    })

    it('no adjunta nada si la campana desactiva el logo', () => {
        expect(buildCampaignContext(kit, { includeLogo: false })).toEqual([])
    })

    it('respeta el logo preferido de la campana', () => {
        expect(buildCampaignContext(kit, { preferredLogo: 'l2' })[0].value).toBe('https://cdn/secundario.png')
    })

    it('no adjunta nada si la marca no tiene logo', () => {
        expect(buildCampaignContext({})).toEqual([])
    })
})
