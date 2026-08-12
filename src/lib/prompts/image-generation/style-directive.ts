/**
 * Directivas de estilo visual y saneado de composiciones.
 *
 * Vivian dentro de `useCreationFlow` (cliente). Se extraen aqui para que el
 * generador por lotes construya el prompt EXACTAMENTE igual que el panel: si
 * cada lado tiene su copia, las dos versiones se separan con el tiempo y las
 * imagenes de campana dejan de parecerse a las que se hacen a mano.
 */

export type StyleAnalysisLike = {
    keywords?: string[]
    subjectLabel?: string
} | null | undefined

/**
 * Linea STYLE DIRECTIVES: fija la direccion de arte a partir del estilo
 * elegido y del analisis de la referencia.
 */
export function buildVisualStyleDirective(
    customStyle?: string,
    analysis?: StyleAnalysisLike
): string {
    const referenceSignals = (analysis?.keywords || [])
        .map((k) => k.trim())
        .filter(Boolean)
    const tokens = [customStyle?.trim(), ...referenceSignals].join(' ').toLowerCase()

    const has = (keywords: string[]) => keywords.some((k) => tokens.includes(k))
    const artDirectionAnchors: string[] = []

    if (has(['pop art', 'comic', 'halftone', 'ben-day', 'print texture'])) {
        artDirectionAnchors.push('Pop Art/comic print language with controlled halftone behavior')
    }
    if (has(['vector', 'flat', 'cel', 'cartoon', 'illustration'])) {
        artDirectionAnchors.push('contemporary vector illustration language from children media and mobile game key art')
    }
    if (has(['geometric', 'grid', 'minimal'])) {
        artDirectionAnchors.push('modernist reduction principles similar to Swiss-influenced poster composition')
    }
    if (has(['editorial', 'magazine', 'serif', 'headline'])) {
        artDirectionAnchors.push('editorial hierarchy discipline inspired by modern publishing systems')
    }
    if (has(['dynamic', 'energy', 'motion', 'impact'])) {
        artDirectionAnchors.push('high-energy compositional rhythm common in commercial campaign illustration')
    }

    const uniqueAnchors = Array.from(new Set(artDirectionAnchors)).slice(0, 3)
    const allowAnchors = !!customStyle?.trim()
    const anchorClause =
        allowAnchors && uniqueAnchors.length > 0
            ? ` Use these art-direction anchors: ${uniqueAnchors.join('; ')}.`
            : ''

    const styleSource =
        referenceSignals.length > 0 && customStyle?.trim()
            ? `${customStyle.trim()} + ${referenceSignals.join(', ')}`
            : referenceSignals.length > 0
                ? referenceSignals.join(', ')
                : (customStyle?.trim() || 'the style reference and the selected brand language')

    return `STYLE DIRECTIVES: Render the image in this exact aesthetic direction based on ${styleSource}. Match the reference medium faithfully (photographic, illustrative, painterly, or hybrid) and preserve coherent visual construction, controlled contrast, clean finishing, and readable layering while respecting the detected stylistic language.${anchorClause}`
}

/** Senales de estilo depuradas (sin terminos de color, que pisarian la paleta). */
export function extractStyleSignals(
    customStyle?: string,
    analysis?: StyleAnalysisLike
): string[] {
    const raw = [customStyle || '', ...(analysis?.keywords || [])]
        .join(' ')
        .toLowerCase()

    const has = (tokens: string[]) => tokens.some((token) => raw.includes(token))
    const signals: string[] = []

    if (has(['pop art', 'roy lichtenstein', 'comic'])) signals.push('pop-art comic language')
    if (has(['halftone', 'ben-day', 'dot pattern', 'printed dots'])) signals.push('halftone print texture accents')
    if (has(['outline', 'thick line', 'bold black'])) signals.push('thick high-contrast contour outlines')
    if (has(['flat color', 'color blocking', 'flat shading'])) signals.push('flat color blocking with minimal gradients')
    if (has(['cell shaded', 'cel-shaded', 'hard shadow'])) signals.push('hard-edged cel-style shadows')
    if (has(['retro', 'vintage', 'nostalgic'])) signals.push('retro commercial mood')
    if (has(['energetic', 'dynamic', 'high contrast', 'high-impact'])) signals.push('energetic high-impact composition')
    if (has(['frontal', 'close-up'])) signals.push('frontal close-up composition')
    if (has(['vector', 'illustration', 'cartoon'])) signals.push('clean vector illustration finish')

    const blockedColorTerms = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'magenta', 'cyan', 'primary', 'secondary']
    return Array.from(
        new Set(
            signals.filter((entry) => !blockedColorTerms.some((term) => entry.includes(term)))
        )
    ).slice(0, 8)
}

/**
 * Limpia el prompt estructural de un layout: los layouts se escriben en
 * markdown con etiquetas de trabajo ("Arquetipo:", "Do-not-break:") que el
 * modelo de imagen acaba imprimiendo como texto visible si se le pasan tal cual.
 */
export function sanitizeStructuralPromptForModel(raw?: string | null): string {
    if (!raw) return ''

    return raw
        .replace(/\r/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => {
            // Remove markdown headings and metadata labels that confuse the image model.
            if (/^#{1,6}\s/.test(line)) return false
            if (/^\*\*(arquetipo|twist|estructura|jerarqu[ií]a visual|distribuci[oó]n|variation knobs|do-not-break)\*\*:/i.test(line)) return false
            if (/^(arquetipo|twist|estructura|jerarqu[ií]a visual|distribuci[oó]n|variation knobs|do-not-break)\s*:/i.test(line)) return false
            if (/^(nombre|composici[oó]n|composition prompt|blueprint|icono)\s*:/i.test(line)) return false
            return true
        })
        .map((line) => line.replace(/^(\d+\.\s+|[-*]\s+)/, ''))
        .map((line) => line.replace(/\*\*/g, ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
}
