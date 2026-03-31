import type { BrandDNA } from './brand-types'

export type PortableAssetKind = 'logo' | 'image' | 'favicon' | 'screenshot'

export interface PortableEmbeddedAsset {
    originalUrl: string
    dataUrl: string
    fileName: string
    kind: PortableAssetKind
}

export interface PortableBrandKitPayload {
    format: 'xstudio-brand-kit'
    version: 1
    exportedAt: string
    brand: BrandDNA
    embeddedAssets: PortableEmbeddedAsset[]
}

interface PortableAssetEntry {
    url: string
    kind: PortableAssetKind
}

const PORTABLE_ASSET_PRIORITY: Record<PortableAssetKind, number> = {
    logo: 4,
    favicon: 3,
    screenshot: 2,
    image: 1,
}

function normalizeUrl(value?: string): string {
    return (value || '').trim()
}

function addAssetEntry(
    bucket: Map<string, PortableAssetEntry>,
    value: string | undefined,
    kind: PortableAssetKind
) {
    const url = normalizeUrl(value)
    if (!url) return

    const existing = bucket.get(url)
    if (!existing || PORTABLE_ASSET_PRIORITY[kind] > PORTABLE_ASSET_PRIORITY[existing.kind]) {
        bucket.set(url, { url, kind })
    }
}

export function collectPortableAssetEntries(kit: BrandDNA): PortableAssetEntry[] {
    const entries = new Map<string, PortableAssetEntry>()

    addAssetEntry(entries, kit.logo_url, 'logo')
    addAssetEntry(entries, kit.favicon_url, 'favicon')
    addAssetEntry(entries, kit.screenshot_url, 'screenshot')
    ;(kit.logos || []).forEach((logo) => addAssetEntry(entries, logo?.url, 'logo'))
    ;(kit.images || []).forEach((image) => addAssetEntry(entries, image?.url, 'image'))

    return Array.from(entries.values())
}

export function sanitizeImportedBrand(raw: BrandDNA): BrandDNA {
    return {
        ...raw,
        id: undefined,
        url: raw.url || '',
        brand_name: raw.brand_name || 'Mi Marca',
        tagline: raw.tagline || '',
        business_overview: raw.business_overview || '',
        brand_values: Array.isArray(raw.brand_values) ? raw.brand_values : [],
        tone_of_voice: Array.isArray(raw.tone_of_voice) ? raw.tone_of_voice : [],
        visual_aesthetic: Array.isArray(raw.visual_aesthetic) ? raw.visual_aesthetic : [],
        colors: Array.isArray(raw.colors) ? raw.colors : [],
        fonts: Array.isArray(raw.fonts) ? raw.fonts : [],
        logos: Array.isArray(raw.logos) ? raw.logos : [],
        images: Array.isArray(raw.images) ? raw.images : [],
        social_links: Array.isArray(raw.social_links) ? raw.social_links : [],
        emails: Array.isArray(raw.emails) ? raw.emails : [],
        phones: Array.isArray(raw.phones) ? raw.phones : [],
        addresses: Array.isArray(raw.addresses) ? raw.addresses : [],
        target_audience: Array.isArray(raw.target_audience) ? raw.target_audience : [],
        created_at: undefined,
        updated_at: undefined,
        api_trace: undefined,
        debug: undefined,
    }
}

export function findMissingPortableAssetUrls(
    brand: BrandDNA,
    embeddedAssets: PortableEmbeddedAsset[]
): string[] {
    const embedded = new Set(
        embeddedAssets
            .map((asset) => normalizeUrl(asset.originalUrl))
            .filter(Boolean)
    )

    return collectPortableAssetEntries(brand)
        .map((entry) => entry.url)
        .filter((url) => !embedded.has(url))
}

export function applyPortableAssetReplacements(
    brand: BrandDNA,
    replacementMap: Map<string, string>
): BrandDNA {
    const remap = (value?: string) => {
        const url = normalizeUrl(value)
        if (!url) return undefined
        return replacementMap.get(url)
    }

    const logos = (brand.logos || [])
        .map((logo) => {
            const remapped = remap(logo.url)
            if (!remapped) return null
            return { ...logo, url: remapped }
        })
        .filter((logo): logo is NonNullable<typeof logo> => Boolean(logo))

    const images = (brand.images || [])
        .map((image) => {
            const remapped = remap(image.url)
            if (!remapped) return null
            return { ...image, url: remapped }
        })
        .filter((image): image is NonNullable<typeof image> => Boolean(image))

    const logoUrl = remap(brand.logo_url) || logos.find((logo) => logo.selected !== false)?.url

    return {
        ...brand,
        logo_url: logoUrl,
        favicon_url: remap(brand.favicon_url),
        screenshot_url: remap(brand.screenshot_url),
        logos,
        images,
    }
}
