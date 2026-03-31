type BrandFont = { family?: string; role?: 'heading' | 'body' | string } | string | null | undefined

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeFamilies(fonts?: BrandFont[]): string[] {
    const explicitFamilies = (fonts || [])
        .map((font) => (typeof font === 'string' ? font : font?.family || '').trim())
        .filter(Boolean)

    const commonFamilies = [
        'Google Sans Flex',
        'Roboto',
        'Inter',
        'Helvetica',
        'Arial',
        'Baskerville',
        'Libre Baskerville',
        'Futura',
        'Montserrat',
        'Poppins',
        'Open Sans',
        'Lato',
    ]

    return Array.from(new Set([...explicitFamilies, ...commonFamilies]))
}

export function sanitizeFontLeakText(text: string, fonts?: BrandFont[]): string {
    let next = text || ''

    normalizeFamilies(fonts).forEach((family) => {
        const familyRegex = new RegExp(escapeRegex(family), 'gi')
        next = next.replace(familyRegex, '')
    })

    return next
        .replace(/\b(?:headline_font|body_font|brand_text_font|font_name|font_family|typeface_name)\b/gi, '')
        .replace(/\b(?:font|typeface|tipografia|tipografia de marca|fuente|familia tipografica)\b[:\s-]*/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
}

export function buildFontLeakPreventionDirective(fonts?: BrandFont[]): string {
    const families = normalizeFamilies(fonts)
    const hasExplicitFamilies = families.length > 0
    const bannedNamesList = hasExplicitFamilies
        ? `\n- BANNED FONT NAMES (must NEVER appear as visible text): ${families.map((f) => `"${f}"`).join(', ')}.`
        : ''

    return `FONT NAME RENDER BAN (ABSOLUTE):
- Font family names are internal production instructions only.
- Use typography references as invisible style metadata for form, rhythm, hierarchy, weight, and contrast.
- NEVER render any font family name as visible text.
- NEVER place any font family name as headline, pretitle, kicker, label, watermark, signature, decorative stamp, or footer.
- If any font family name appears anywhere else in this prompt, treat it as invisible metadata and remove it from the final artwork.
- Font names, style labels, and typography instructions are not content. They must influence styling only and must never become printed words inside the image.
- The only allowed visible words are the user-facing copy supplied in the TEXT block and, on the final slide, the approved CTA/URL block.
- This applies to all Brand Kit font families${hasExplicitFamilies ? ' referenced in the typography contract above' : ''}.${bannedNamesList}`
}

export function buildInvisibleFontContextLine(tagRef: string, family: string): string {
    return `- ${tagRef} (Fuente): Usa la familia "${family}" solo como metadato invisible de estilo. Debe orientar forma, jerarquia, ritmo y acabado del texto, pero su nombre nunca puede imprimirse ni aparecer como copy visible.`
}
