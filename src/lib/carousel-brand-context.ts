import type { BrandDNA } from '@/lib/brand-types'

export function buildCarouselBrandContext(
    brand: BrandDNA,
    selectedColors?: string[] | { color: string; role: string }[],
    includeLogoUrl?: string
): string {
    const parts: string[] = []

    // Brand identity
    parts.push(`MARCA: ${brand.brand_name}`)
    if (brand.tagline) parts.push(`TAGLINE: ${brand.tagline}`)
    if (brand.business_overview) parts.push(`CONTEXTO: ${brand.business_overview}`)
    if (brand.target_audience?.length) parts.push(`PUBLICO_OBJETIVO: ${brand.target_audience.join(', ')}`)
    if (brand.brand_values?.length) parts.push(`VALORES: ${brand.brand_values.join(', ')}`)
    if (brand.text_assets?.brand_context) parts.push(`VISION_CONTEXTO: ${brand.text_assets.brand_context}`)

    // Colors
    const colors = (selectedColors && (selectedColors as any[]).length > 0)
        ? (selectedColors as any[]).map(c => {
            if (typeof c === 'string') return c
            return `${c.color}${c.role ? ` (${c.role})` : ''}`
        })
        : []

    if (colors.length > 0) {
        parts.push(`PALETA DE COLORES: ${colors.join(', ')}`)
    }

    // Tone
    if (brand.tone_of_voice?.length) {
        parts.push(`TONO_DE_VOZ: ${brand.tone_of_voice.join(', ')}`)
    }

    // Visual aesthetic
    if (brand.visual_aesthetic?.length) {
        parts.push(`ESTETICA VISUAL: ${brand.visual_aesthetic.join(', ')}`)
    }

    // Typography system (without exposing font-family names to avoid text leakage in generated copy)
    if (brand.fonts?.length) {
        parts.push('TIPOGRAFIAS: Mantener el sistema tipografico de la marca (jerarquia y consistencia), sin mencionar nombres de fuentes en el contenido visible.')
    }

    // Logo instruction
    if (includeLogoUrl) {
        parts.push('INCLUIR LOGO: Si, integrar sutilmente el logo de la marca')
    }

    return parts.join('\n')
}
