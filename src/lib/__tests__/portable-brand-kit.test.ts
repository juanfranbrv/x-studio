import { describe, expect, it } from 'vitest'

import type { BrandDNA } from '../brand-types'
import {
    applyPortableAssetReplacements,
    collectPortableAssetEntries,
    findMissingPortableAssetUrls,
} from '../portable-brand-kit'

function buildBrand(overrides: Partial<BrandDNA> = {}): BrandDNA {
    return {
        url: 'https://example.com',
        brand_name: 'Marca',
        tagline: '',
        business_overview: '',
        brand_values: [],
        tone_of_voice: [],
        visual_aesthetic: [],
        colors: [],
        fonts: [],
        logos: [],
        images: [],
        ...overrides,
    }
}

describe('portable brand kit', () => {
    it('deduplica assets y conserva el tipo mas estricto por url', () => {
        const brand = buildBrand({
            logo_url: 'https://cdn.test/logo.png',
            logos: [
                { url: 'https://cdn.test/logo.png', selected: true },
                { url: 'https://cdn.test/logo-alt.png', selected: false },
            ],
            favicon_url: 'https://cdn.test/favicon.png',
            screenshot_url: 'https://cdn.test/shot.webp',
            images: [
                { url: 'https://cdn.test/logo-alt.png', selected: true },
                { url: 'https://cdn.test/gallery-1.webp', selected: true },
            ],
        })

        expect(collectPortableAssetEntries(brand)).toEqual([
            { url: 'https://cdn.test/logo.png', kind: 'logo' },
            { url: 'https://cdn.test/favicon.png', kind: 'favicon' },
            { url: 'https://cdn.test/shot.webp', kind: 'screenshot' },
            { url: 'https://cdn.test/logo-alt.png', kind: 'logo' },
            { url: 'https://cdn.test/gallery-1.webp', kind: 'image' },
        ])
    })

    it('detecta urls faltantes en el payload portable antes de importar', () => {
        const brand = buildBrand({
            logo_url: 'https://cdn.test/logo.png',
            favicon_url: 'https://cdn.test/favicon.png',
            images: [{ url: 'https://cdn.test/gallery-1.webp', selected: true }],
        })

        const missing = findMissingPortableAssetUrls(brand, [
            { originalUrl: 'https://cdn.test/logo.png', dataUrl: 'data:image/png;base64,aaa', fileName: 'logo.png', kind: 'logo' },
        ])

        expect(missing).toEqual([
            'https://cdn.test/favicon.png',
            'https://cdn.test/gallery-1.webp',
        ])
    })

    it('solo conserva referencias que se hayan copiado realmente al usuario destino', () => {
        const brand = buildBrand({
            logo_url: 'https://source.test/logo.png',
            favicon_url: 'https://source.test/favicon.png',
            screenshot_url: 'https://source.test/shot.png',
            logos: [
                { url: 'https://source.test/logo.png', selected: true },
                { url: 'https://source.test/secondary-logo.png', selected: false },
            ],
            images: [
                { url: 'https://source.test/gallery-1.png', selected: true },
                { url: 'https://source.test/gallery-2.png', selected: false },
            ],
        })

        const replacementMap = new Map<string, string>([
            ['https://source.test/logo.png', 'https://target.test/logo.png'],
            ['https://source.test/gallery-1.png', 'https://target.test/gallery-1.webp'],
        ])

        expect(applyPortableAssetReplacements(brand, replacementMap)).toEqual(
            buildBrand({
                logo_url: 'https://target.test/logo.png',
                favicon_url: undefined,
                screenshot_url: undefined,
                logos: [{ url: 'https://target.test/logo.png', selected: true }],
                images: [{ url: 'https://target.test/gallery-1.webp', selected: true }],
            })
        )
    })
})
