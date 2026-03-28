import { SlideContent } from '@/app/actions/generate-carousel'
import { P09B } from '@/lib/prompts/priorities/p09b-cta-url-hierarchy'
import * as P09 from '@/lib/prompts/priorities/p09-brand-dna'
import { P10B } from '@/lib/prompts/priorities/p10b-secondary-logos'
import { FINAL_IMAGE_PROMPT_TEMPLATE } from './final-image.template'
import { LANGUAGE_ENFORCEMENT_INSTRUCTION } from '@/lib/prompts/priorities/p12-preferred-language'
import {
    buildFontLeakPreventionDirective as sharedBuildFontLeakPreventionDirective,
    sanitizeFontLeakText,
} from '@/lib/prompts/font-leak-guard'
import { inferStyleMediumProfile } from '@/lib/prompts/image-generation/style-medium-profile'

// --- EXTRACT LOGO POSITION FROM COMPOSITION ---
/**
 * Extracts the logo position from a composition's layoutPrompt.
 * Parses patterns like "logo bottom-right", "logo top-center", "upper-right corner", etc.
 */
export function extractLogoPosition(layoutPrompt: string): string {
    const normalizedPrompt = layoutPrompt
        .replace(/upper/gi, 'top')
        .replace(/lower/gi, 'bottom')
    // Match patterns like "logo bottom-right", "logo top-center", "logo top right", etc.
    const logoMatch = normalizedPrompt.match(/logo\s+anchor:\s*(?:the\s+)?(top|bottom)[-\s]?(left|right|center)|logo\s+(top|bottom)[-\s]?(left|right|center)/i)

    if (logoMatch) {
        const verticalRaw = logoMatch[1] || logoMatch[3]
        const horizontalRaw = logoMatch[2] || logoMatch[4]
        if (!verticalRaw || !horizontalRaw) return 'Bottom-Right'
        const vertical = verticalRaw.charAt(0).toUpperCase() + verticalRaw.slice(1).toLowerCase()
        const horizontal = horizontalRaw.charAt(0).toUpperCase() + horizontalRaw.slice(1).toLowerCase()
        const result = `${vertical}-${horizontal}`
        return result
    }

    // Default fallback
    return 'Bottom-Right'
}

// --- LOGO PROTECTION DIRECTIVE (Enhanced for Carousel Consistency) ---
function buildLogoDirective(position: string, slideNumber: number, totalSlides: number): string {
    // Define exact position coordinates based on position string
    const positionMap: Record<string, { x: string; y: string; anchor: string }> = {
        'Bottom-Right': { x: '85% from left', y: '90% from top', anchor: 'bottom-right corner' },
        'Bottom-Left': { x: '15% from left', y: '90% from top', anchor: 'bottom-left corner' },
        'Bottom-Center': { x: '50% centered', y: '90% from top', anchor: 'bottom-center' },
        'Top-Right': { x: '85% from left', y: '10% from top', anchor: 'top-right corner' },
        'Top-Left': { x: '15% from left', y: '10% from top', anchor: 'top-left corner' },
        'Top-Center': { x: '50% centered', y: '8% from top', anchor: 'top-center' }
    }

    const pos = positionMap[position] || positionMap['Bottom-Right']
    const isFirstSlide = slideNumber === 1

    return `
LOGO PLACEMENT (CRITICAL - CAROUSEL CONSISTENCY):
-----------------------------------------------

EXACT POSITION: ${position} - ${pos.anchor}
   - Horizontal: ${pos.x}
   - Vertical: ${pos.y}
   - THIS POSITION IS MANDATORY FOR ALL ${totalSlides} SLIDES

SIZE SPECIFICATIONS:
   - Logo height: approximately 5% of canvas height
   - Maximum width: 15% of canvas width
   - Maintain original aspect ratio - NO stretching or squeezing

IMMUTABILITY RULES:
   - The logo is a SACRED ELEMENT - DO NOT alter, recreate, or reimagine it
   - Copy the EXACT pixels from the provided logo reference image
   - Same colors, same shapes, same proportions, same details
   - The logo is a TOP LAYER superimposed AFTER the composition is complete
   - NO visual effects on logo: no blur, no glow, no shadows, no gradient overlays
   - If auxiliary logos are provided, render them ONLY when the primary logo is present
   - Auxiliary logos must remain secondary and must never steal prominence from the primary logo

${isFirstSlide ? `
FIRST SLIDE PRECEDENT:
   - This is Slide 1/${totalSlides}. The logo placement you create HERE sets the standard.
   - All subsequent slides MUST match this exact position and size.
` : `
CONSISTENCY REQUIREMENT (SLIDE ${slideNumber}/${totalSlides}):
   - Match the EXACT logo position, size, and appearance from Slide 1 (Reference Image 2)
   - If Slide 1 logo is at ${pos.anchor}, THIS slide's logo MUST stay at ${pos.anchor}
   - Same size, same position, pixel-perfect match
`}

FAILURE CONDITION: If you cannot preserve the logo EXACTLY as provided, DO NOT include it at all.
`.trim()
}

// --- TOKEN BLOCKS TO REMOVE (The "Noise Filter") ---
const NOISE_BLOCKS_REGEX = /---\s*(CONTEXTO|VALORES|VISION_CONTEXTO|CONTEXT|VALUES)\s*---[\s\S]*?(?=---|\n\n###|$)/gi

interface FinalPromptParams {
    composition: {
        layoutPrompt: string
        name?: string
        id?: string
    }
    brandColors: {
        background: string | string[] // Hex list or single
        accent: string | string[]     // Hex list or single
        text?: string | string[]      // Hex list or single
    }
    slideData: SlideContent
    currentMood: string
    currentSlide: number
    totalSlides: number
    logoPosition?: string // e.g., "Bottom-Right"
    includeLogo: boolean
    includeAuxiliaryLogos?: boolean
    auxiliaryLogoCount?: number
    isSequentialSlide: boolean // true for slides 2-5
    ctaText?: string
    ctaUrl?: string
    contactLines?: string[]
    visualAnalysis?: string
    language?: string
    fonts?: { family: string; role?: 'heading' | 'body' }[]
    applyStyleToTypography?: boolean
}

/**
 * Cleans the layout prompt by removing noise blocks (CONTEXTO, VALORES, etc.)
 */
function cleanLayoutPrompt(layoutPrompt: string): string {
    return layoutPrompt.replace(NOISE_BLOCKS_REGEX, '').trim()
}

function removeLogoGuidanceFromBlueprint(layoutPrompt: string): string {
    return layoutPrompt
        .replace(/^\s*\d+\.\s*LOGO ANCHOR:[^\n]*\n?/gim, '')
        .replace(/^\s*[-*]\s*[^.\n]*\blogos?\b[^.\n]*\n?/gim, '')
        .replace(/(^|[\n.])\s*[^.\n]*\blogos?\b[^.\n]*(?=\.|\n|$)/gim, '$1')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\.{2,}/g, '.')
        .replace(/[ \t]{2,}/g, ' ')
        .trim()
}

function stripBlueprintMeasurements(layoutPrompt: string): string {
    return layoutPrompt
        .replace(/\(\s*\d+(?:\.\d+)?%\s*,\s*\d+(?:\.\d+)?%\s*\)/g, '')
        .replace(/\b\d+(?:\.\d+)?%\s*(?:from\s+(?:top|bottom|left|right)|canvas\s+(?:width|height)|height|width|inset|padding|area occupancy|thickness|x-position|x position|y-position|y position|radius)\b/gi, '')
        .replace(/\b\d+(?:\.\d+)?%\s*\/\s*\d+(?:\.\d+)?%\b/g, '')
        .replace(/\b\d+(?:\.\d+)?%\b/g, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+\./g, '.')
        .replace(/\s+,/g, ',')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

function injectColorsIntoBlueprint(layoutPrompt: string): string {
    return layoutPrompt
        .replace(/Solid negative space/gi, 'Solid negative space (use brand background)')
        .replace(/negative space/gi, 'negative space (use brand background)')
}

function stripColorGuidance(text: string): string {
    return text
        .replace(/#[0-9a-f]{3,8}/gi, '')
        .replace(/(monochromatic|monochrome|monocromatico|monocrom?tica|monocrom?tico)/gi, '')
        .replace(/(white|black|yellow|blue|red|green|purple|magenta|pink|orange|brown|gray|grey|gold|silver|beige|cream|ivory|cyan|teal|turquoise|navy|maroon)/gi, '')
        .replace(/(blanco|negro|amarillo|azul|rojo|verde|morado|magenta|rosa|naranja|marron|marr?n|gris|dorado|plata|beige|crema|marfil|cian|turquesa|azul marino|granate)/gi, '')
        .replace(/(fondo|background)\s+(color\s+)?(de\s+)?/gi, '$1 ')
        .replace(/\s{2,}/g, ' ')
        .trim()
}

function stripPaperCanvasHints(text: string): string {
    return text
        .replace(/(ink-on|ink on|pen-on|pen on)/gi, '')
        .replace(/(paper|paper-like|paperlike|sheet|canvas|white space|blank space)/gi, '')
        .replace(/(papel|papelera|hoja|lienzo|espacio en blanco|espacio blanco)/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
}

function extractStyleTraits(visualAnalysis: string): { lighting?: string; traits?: string } {
    const lightingMatch = visualAnalysis.match(/Lighting:\s*([^\.\n]+)/i)
    const keywordsMatch = visualAnalysis.match(/Keywords:\s*([\s\S]+)/i)
    const lighting = lightingMatch ? stripPaperCanvasHints(stripColorGuidance(lightingMatch[1])).trim() : undefined
    const rawKeywords = keywordsMatch ? keywordsMatch[1] : ''
    const traits = rawKeywords
        ? stripPaperCanvasHints(stripColorGuidance(rawKeywords))
        : undefined
    return {
        lighting: lighting || undefined,
        traits: traits || undefined
    }
}

function normalizePromptText(value: string | undefined): string {
    return (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}+/gu, '')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
}

function buildCtaDirective(ctaText: string | undefined, ctaUrl: string | undefined, accentColor: string): string {
    const safeCtaText = (ctaText || '').trim()

    if (ctaUrl) {
        const hierarchyInstruction = safeCtaText
            ? P09B.CRITICAL_HIERARCHY_INSTRUCTION(ctaUrl)
            : P09B.CRITICAL_URL_ONLY_INSTRUCTION(ctaUrl)
        const finalVisibilityInstruction = safeCtaText
            ? P09B.FINAL_URL_VISIBILITY_INSTRUCTION(ctaUrl)
            : P09B.FINAL_URL_ONLY_VISIBILITY_INSTRUCTION(ctaUrl)
        return `
CALL-TO-ACTION (FINAL SLIDE TREATMENT):
${hierarchyInstruction}
${P09B.URL_HERO_INSTRUCTION(ctaUrl)}
${safeCtaText ? P09B.CTA_SECONDARY_INSTRUCTION(safeCtaText) : ''}
${finalVisibilityInstruction}
CTA ACCENT COLOR: ${accentColor}
TEXT RENDER SAFETY: Never render labels/tokens like "CTA", "URL", "CTA CONTAINER", "CTA:", "URL:", "URLOCTAO", "CTAO". Render only the provided user-facing text.
`.trim()
    }

    if (!safeCtaText) return ''

    return `
CALL-TO-ACTION (FINAL SLIDE TREATMENT):
${P09B.CTA_ONLY_INSTRUCTION(safeCtaText)}
CTA ACCENT COLOR: ${accentColor}
TEXT RENDER SAFETY: Never render labels/tokens like "CTA", "URL", "CTA CONTAINER", "CTA:", "URL:", "URLOCTAO", "CTAO". Render only the provided user-facing text.
`.trim()
}

function buildTypographyDirective(
    fonts: { family: string; role?: 'heading' | 'body' }[] | undefined,
    applyStyleToTypography?: boolean
): string {
    if (applyStyleToTypography) {
        return [
            'TYPOGRAPHY SELECTION MODE: STYLE-DRIVEN.',
            '- Do NOT use the Brand Kit font family as a hard constraint.',
            '- Choose the title and paragraph typography according to the active visual style of the image.',
            '- The model may decide family, weight, contrast, edge behavior, and visual treatment to fit the chosen style.',
            '- Maintain hierarchy and readability, especially for the support paragraph.',
            '- Never render font family names or internal tokens as visible text.'
        ].join('\n')
    }

    return P09.buildTypographyContract(fonts)
}

function buildTypographyFingerprintBlock(params: {
    visualAnalysis?: string
    layoutPrompt: string
    compositionName?: string
    applyStyleToTypography?: boolean
}): string {
    if (!params.applyStyleToTypography) {
        return [
            'TYPOGRAPHY FINGERPRINT: BRAND-KIT LOCKED.',
            '- Use the Brand Kit family mapping already defined above.',
            '- Keep the same headline/body family roles across the whole carousel.',
            '- Only subtle finishing may vary; the family fingerprint itself stays fixed.'
        ].join('\n')
    }

    const analysisSourceText = (params.visualAnalysis || '').toLowerCase()
    const supportSourceText = [
        params.compositionName || '',
        params.layoutPrompt || '',
    ].join(' ').toLowerCase()

    const profile = inferStyleMediumProfile({
        analysisText: params.visualAnalysis || '',
        fallbackText: supportSourceText,
    })

    const scriptSignals = /\b(calligraph|script|lettering|signpaint|handletter|hand letter|chalk|brush pen|cursive|cuaderno|notebook|school|escolar|apuntes|notes|scribble|journal)\b/
    const engravedSignals = /\b(engraving|etching|grabado|crosshatch|hatching|incision|etched|etch)\b/
    const comicSignals = /\b(comic|comix|doodle|naive|playful|playground|kid|infantil|cartooned)\b/

    const hasScriptLike = scriptSignals.test(analysisSourceText) || scriptSignals.test(supportSourceText)
    const hasEngraved = engravedSignals.test(analysisSourceText) || engravedSignals.test(supportSourceText)
    const hasComicPlay = comicSignals.test(analysisSourceText) || comicSignals.test(supportSourceText)

    const fingerprintByMedium: Record<string, string[]> = {
        'line-illustration': [
            '- FAMILY CLASS: illustrated serif or illustrated humanist display.',
            '- FORMAL CHARACTER: hand-drawn, authored, literary, crafted.',
            '- STROKE LOGIC: visible pen/ink modulation with slight irregularity.',
            '- EDGE LANGUAGE: crisp but alive, lightly imperfect, not geometric-flat.',
            '- CONTRAST MODEL: medium contrast with calligraphic or engraved flavor.',
            '- TEXTURE LOGIC: fine hatch, ink grain, or drawn contour integrated into the letterforms.',
            '- PARAGRAPH COMPANION: calmer companion from the same illustrated family language with reduced ornament and higher legibility.'
        ],
        'painterly': [
            '- FAMILY CLASS: expressive serif or soft display with painterly modulation.',
            '- FORMAL CHARACTER: authored, material, artistic, tactile.',
            '- STROKE LOGIC: soft modulation and textured edges.',
            '- EDGE LANGUAGE: visibly crafted, never mechanically sterile.',
            '- CONTRAST MODEL: medium-to-high contrast with painted rhythm.',
            '- TEXTURE LOGIC: subtle pigment or brush-memory in the title, cleaner treatment in the paragraph.',
            '- PARAGRAPH COMPANION: a quieter companion style from the same family mood, optimized for reading.'
        ],
        'pixel-retro': [
            '- FAMILY CLASS: retro digital display family.',
            '- FORMAL CHARACTER: modular, synthetic, game-era, hard-edged.',
            '- STROKE LOGIC: discrete modular construction and compact rhythm.',
            '- EDGE LANGUAGE: stepped or grid-born only when the visual reference clearly supports it.',
            '- CONTRAST MODEL: low contrast, high silhouette clarity.',
            '- TEXTURE LOGIC: digital-retro finish kept controlled and legible.',
            '- PARAGRAPH COMPANION: simpler, narrower companion from the same retro-digital family logic.'
        ],
        'editorial-graphic': [
            '- FAMILY CLASS: editorial serif, poster serif, or authoritative display sans with strong typographic identity.',
            '- FORMAL CHARACTER: designed, commanding, high-contrast, publishable.',
            '- STROKE LOGIC: deliberate weight transitions and strong silhouette.',
            '- EDGE LANGUAGE: sharp, clean, and intentional.',
            '- CONTRAST MODEL: medium-to-high contrast with poster authority.',
            '- TEXTURE LOGIC: graphic finishing may appear, but the family structure stays premium and controlled.',
            '- PARAGRAPH COMPANION: sober editorial companion with the same typographic voice and less drama.'
        ],
        'soft-organic': [
            '- FAMILY CLASS: soft humanist sans or warm organic serif.',
            '- FORMAL CHARACTER: friendly, breathable, human, gently expressive.',
            '- STROKE LOGIC: smooth rhythm with mild modulation.',
            '- EDGE LANGUAGE: soft contours and welcoming shapes.',
            '- CONTRAST MODEL: low-to-medium contrast.',
            '- TEXTURE LOGIC: minimal, delicate, and calm.',
            '- PARAGRAPH COMPANION: cleaner companion from the same warm family feeling.'
        ],
        'photographic': [
            '- FAMILY CLASS: contemporary editorial sans or refined serif with real-world credibility.',
            '- FORMAL CHARACTER: modern, confident, clean, believable.',
            '- STROKE LOGIC: controlled and precise.',
            '- EDGE LANGUAGE: crisp and stable.',
            '- CONTRAST MODEL: medium contrast with excellent readability.',
            '- TEXTURE LOGIC: very restrained; typography should sit naturally over photography.',
            '- PARAGRAPH COMPANION: highly legible companion from the same family system.'
        ],
        'vector-clean': [
            '- FAMILY CLASS: geometric-humanist sans or clean modular display.',
            '- FORMAL CHARACTER: precise, graphic, ordered, contemporary.',
            '- STROKE LOGIC: consistent, rational, shape-led.',
            '- EDGE LANGUAGE: clean, smooth, exact.',
            '- CONTRAST MODEL: low-to-medium contrast with high clarity.',
            '- TEXTURE LOGIC: minimal texture; rely on shape quality and hierarchy.',
            '- PARAGRAPH COMPANION: simple companion from the same clean family logic.'
        ],
        'three-dimensional': [
            '- FAMILY CLASS: dimensional display family or sculptural sans/serif adapted to depth.',
            '- FORMAL CHARACTER: volumetric, cinematic, premium.',
            '- STROKE LOGIC: stable construction that can support depth without losing clarity.',
            '- EDGE LANGUAGE: clean volume edges, not cartoonish.',
            '- CONTRAST MODEL: medium contrast with depth cues.',
            '- TEXTURE LOGIC: dimensional finishing only if clearly supported by the reference.',
            '- PARAGRAPH COMPANION: flatter, cleaner companion from the same family tone.'
        ],
        'neutral': [
            '- FAMILY CLASS: refined contemporary display family with clear personality.',
            '- FORMAL CHARACTER: modern, designed, stable, expressive but controlled.',
            '- STROKE LOGIC: precise and readable.',
            '- EDGE LANGUAGE: clean and coherent.',
            '- CONTRAST MODEL: medium contrast.',
            '- TEXTURE LOGIC: restrained and style-compatible.',
            '- PARAGRAPH COMPANION: calmer companion from the same typographic voice.'
        ],
    }

    let details = fingerprintByMedium[profile.id] || fingerprintByMedium.neutral

    if (hasScriptLike) {
        details = [
            '- FAMILY CLASS: expressive script-display, hand-lettered humanist, or cursive editorial family.',
            '- FORMAL CHARACTER: authored, gestural, handwritten, personal, visibly drawn.',
            '- STROKE LOGIC: flowing stroke rhythm with natural pen pressure changes.',
            '- EDGE LANGUAGE: alive, slightly irregular, hand-led rather than machine-flat.',
            '- CONTRAST MODEL: medium contrast with visible stroke modulation and lively entry/exit gestures.',
            '- TEXTURE LOGIC: subtle pen, ink, pencil, or notebook-like finish may appear inside the title treatment.',
            '- PARAGRAPH COMPANION: a cleaner handwritten-humanist companion or lightly stylized reading face from the same authored family mood.'
        ]
    } else if (hasEngraved) {
        details = [
            '- FAMILY CLASS: engraved serif, etched display serif, or literary old-style family.',
            '- FORMAL CHARACTER: classic, authored, carved, scholarly, illustrative.',
            '- STROKE LOGIC: deliberate high-contrast stems with engraved interior texture or hatch memory.',
            '- EDGE LANGUAGE: precise, slightly etched, visibly crafted.',
            '- CONTRAST MODEL: medium-to-high contrast with elegant old-style proportions.',
            '- TEXTURE LOGIC: fine linework, etched shading, or engraved fill can appear in the title, more restrained in the paragraph.',
            '- PARAGRAPH COMPANION: calmer literary serif or lightly engraved reading companion from the same family world.'
        ]
    } else if (hasComicPlay) {
        details = [
            '- FAMILY CLASS: playful hand-drawn display or expressive humanist family with illustration energy.',
            '- FORMAL CHARACTER: warm, lively, drawn, story-led, approachable.',
            '- STROKE LOGIC: soft irregularity and animated rhythm.',
            '- EDGE LANGUAGE: drawn and characterful, never corporate-flat.',
            '- CONTRAST MODEL: low-to-medium contrast with strong silhouette clarity.',
            '- TEXTURE LOGIC: subtle doodle, marker, or sketch memory may inform the title treatment.',
            '- PARAGRAPH COMPANION: simpler illustrated reading companion from the same lively family mood.'
        ]
    }

    return [
        `TYPOGRAPHY FINGERPRINT LOCK: ${profile.label.toUpperCase()}.`,
        '- This fingerprint must be derived primarily from the STYLE ANALYSIS of the reference image, using layout/composition text only as secondary support.',
        '- This fingerprint defines the typography family logic for the WHOLE carousel.',
        '- Choose the family once from this fingerprint and keep it stable across every slide.',
        '- Treat Slide 1 as the master type specimen: every later slide must keep the same title type specimen established in Slide 1, preserving the same family identity, serif/sans morphology, terminal shapes, contrast feeling, width impression, and overall letter personality.',
        '- Do NOT mutate the family class, serif/sans decision, stroke logic, edge language, contrast model, or paragraph companion between slides.',
        '- Do not substitute a nearby family, a cleaner serif, a different sans, or a lookalike font.',
        '- Slide 1 must establish this fingerprint clearly; all later slides must clone it faithfully.',
        '- The title should visibly embody this fingerprint. The paragraph should clearly belong to the same typographic world, but in a calmer reading register.',
        ...details,
    ].join('\n')
}

function buildHeadlineTreatmentDirective(params: {
    visualAnalysis?: string
    layoutPrompt: string
    compositionName?: string
    currentMood: string
    applyStyleToTypography?: boolean
    currentSlide: number
    totalSlides: number
}) {
    if (!params.applyStyleToTypography) {
        return [
            'TYPOGRAPHIC STYLE OVERRIDE: DISABLED.',
            '- Keep the title and paragraph on the Brand Kit typography defined above.',
            '- The Brand Kit typography family is mandatory in this mode. Do NOT replace it, remix it, or let the active style choose another family.',
            '- You may add subtle stylistic finishing that fits the image, but do NOT replace the brand typography family.',
            '- Allowed changes in this mode are only finishing details such as weight, scale, spacing, color, contour, or restrained decorative emphasis.',
            '- Forbidden changes in this mode include selecting a different family, mixing in external families, or restyling the text as if style-driven typography were enabled.',
            '- The paragraph must remain highly legible, calm, and easy to read on mobile.',
        ].join('\n')
    }

    const analysisSource = normalizePromptText(params.visualAnalysis)
    const supportSource = normalizePromptText([
        params.layoutPrompt,
        params.compositionName,
        params.currentMood,
    ].filter(Boolean).join(' '))
    const hasHandmade = /\b(handmade|hand drawn|hand-drawn|ink|sketch|pencil|marker|brush|painted|engraving|etching|comix|comic|illustration)\b/.test(analysisSource) || /\b(handmade|hand drawn|hand-drawn|ink|sketch|pencil|marker|brush|painted|engraving|etching|comix|comic|illustration)\b/.test(supportSource)
    const hasScriptLike = /\b(calligraph|script|lettering|signpaint|handletter|hand letter|chalk|brush pen|cursive|cuaderno|notebook|school|escolar|apuntes|notes|scribble|journal)\b/.test(analysisSource) || /\b(calligraph|script|lettering|signpaint|handletter|hand letter|chalk|brush pen|cursive|cuaderno|notebook|school|escolar|apuntes|notes|scribble|journal)\b/.test(supportSource)
    const hasBrutal = /\b(brutal|stencil|industrial|poster|editorial|cutout|collage|xerox|grunge)\b/.test(analysisSource) || /\b(brutal|stencil|industrial|poster|editorial|cutout|collage|xerox|grunge)\b/.test(supportSource)
    const hasSoftOrganic = /\b(organic|humanist|craft|textile|paper cut|papercut|naive|playful)\b/.test(analysisSource) || /\b(organic|humanist|craft|textile|paper cut|papercut|naive|playful)\b/.test(supportSource)

    let flavor = 'STYLE-LED TYPOGRAPHIC TREATMENT: choose title and support paragraph typography from the visual style itself, so the text feels born from the same art direction as the image.'
    let rules = [
        '- This flexibility applies to the main title first, and secondarily to the support paragraph.',
        '- The model should select the most fitting typography family and treatment for the active style, not default to the Brand Kit family.',
        '- You MUST stylize the title through family choice, case logic, silhouette, contrast behavior, contour, texture memory, or handcrafted edge behavior when the style supports it.',
        '- The title should feel art-directed, not default app text. Avoid plain neutral office-style rendering when the visual style is expressive.',
        '- The paragraph must belong to the same typographic world as the title. It should be calmer, cleaner, and easier to read, but never collapse into an unrelated default UI font.',
        '- Keep the title fully legible on mobile. Creative treatment must never damage readability.',
        '- Keep the paragraph highly legible on mobile: simpler fill, lower distortion, cleaner spacing, and lower visual noise than the title.',
        '- Keep treatment consistent with the chosen style across the whole carousel. Do not invent a different typographic language on this slide.',
    ]

    if (params.currentSlide === 1) {
        rules.unshift(
            `- This is Slide 1/${params.totalSlides}: it must establish the BEST and CLEAREST version of the style-driven typography system for the whole carousel.`,
            '- Resolve the title here as the master specimen of the chosen typographic family and treatment. Do NOT leave Slide 1 typographically neutral if the style is expressive.',
            '- Later slides must inherit this exact typographic voice, so the title treatment on this slide must be deliberate, distinctive, fully resolved, and impossible to mistake for a default neutral heading.',
            '- The first slide title must carry the highest typographic authorship of the carousel. If a choice must be made, prefer a stronger and more style-native title here rather than saving the best treatment for later slides.',
            '- Do not treat Slide 1 as a safe setup frame. Treat it as the canonical hero example of the typography system that the rest of the carousel will clone.'
        )
    } else if (params.currentSlide === params.totalSlides) {
        rules.unshift(
            `- This is the final slide (${params.currentSlide}/${params.totalSlides}): keep the exact title typography system established in Slide 1.`,
            '- Increase emphasis through CTA, URL, closure, and composition if needed, but do NOT upgrade or replace the title with a more expressive treatment than the one chosen for Slide 1.'
        )
    } else {
        rules.unshift(
            `- This is Slide ${params.currentSlide}/${params.totalSlides}: inherit the exact style-driven typography system established in Slide 1.`
        )
    }

    if (hasHandmade || hasScriptLike) {
        flavor = hasScriptLike
            ? 'STYLE-LED TYPOGRAPHIC TREATMENT: the style reads as hand-lettered / script / notebook-authored.'
            : 'STYLE-LED TYPOGRAPHIC TREATMENT: the style reads as handmade / illustrated / hand-crafted.'
        rules = [
            ...(params.currentSlide === 1
                ? [
                    hasScriptLike
                        ? '- Because this is Slide 1, the hand-lettered or script-led title treatment must be fully established here as the master reference for the rest of the carousel.'
                        : '- Because this is Slide 1, the handmade title treatment must be fully established here as the master reference for the rest of the carousel.'
                ]
                : []),
            ...(hasScriptLike
                ? [
                    '- Let the title use a visibly authored letterform language: script-display, cursive humanist, signpaint, notebook lettering, or hand-lettered display depending on the reference.',
                    '- The title must feel written or lettered by hand, not typeset in a neutral sans.',
                    '- The paragraph should stay cleaner, but it must still inherit a lightly authored, human, notebook-like reading voice from the same family world.',
                ]
                : [
                    '- Let the title inherit a crafted feel: inked edges, hand-drawn pressure variation, subtle irregularity, painted fills, or lettering-like emphasis if the style supports it.',
                    '- Choose a typography treatment that avoids a sterile app-like title. The title must feel embedded in the handmade visual language.',
                    '- The paragraph must inherit soft handmade cues too, but should remain calmer, cleaner, and easier to read than the title.',
                ]),
            '- Expressive does not mean messy: keep spacing, readability, and mobile clarity under control.',
        ]
    } else if (hasBrutal) {
        flavor = 'STYLE-LED TYPOGRAPHIC TREATMENT: the style reads as poster / brutal / editorial.'
        rules = [
            ...(params.currentSlide === 1
                ? [
                    '- Because this is Slide 1, define the editorial title treatment here with enough clarity that every later slide can clone the same typographic voice.'
                ]
                : []),
            '- Push the title into a stronger editorial/poster treatment: aggressive scale, compressed line breaks, hard shadow planes, stencil/cutout logic, or sharp contrast blocks when appropriate.',
            '- Choose a typography style that makes the title feel designed, not merely typed.',
            '- The paragraph may echo the editorial system through lighter framing or contrast, but remains more restrained and informational.',
            '- Do not turn the whole slide into decorative typography; the strongest treatment belongs to the title block.',
        ]
    } else if (hasSoftOrganic) {
        flavor = 'STYLE-LED TYPOGRAPHIC TREATMENT: the style reads as soft / organic / human.'
        rules = [
            ...(params.currentSlide === 1
                ? [
                    '- Because this is Slide 1, define the soft-organic typographic voice here clearly enough that the rest of the carousel can inherit it without drift.'
                ]
                : []),
            '- Give the title a warmer, more characterful treatment through gentle curvature, organic rhythm, soft contour contrast, or crafted emphasis tied to the visual style.',
            '- Choose a fitting typography style for that organic mood instead of default office text.',
            '- Let the paragraph inherit only gentle traces of that softness so the hierarchy stays obvious.',
            '- Avoid flat default SaaS-looking title rendering if the style asks for more personality.',
        ]
    }

    return [
        flavor,
        ...rules,
    ].join('\n')
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripFontMentions(text: string, fonts?: { family: string; role?: 'heading' | 'body' }[]): string {
    return sanitizeFontLeakText(text, fonts)
    let next = text || ''
    const explicitFamilies = (fonts || [])
        .map((font) => (font.family || '').trim())
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
        'Lato'
    ]

    const allFamilies = Array.from(new Set([...explicitFamilies, ...commonFamilies]))
    allFamilies.forEach((family) => {
        const familyRegex = new RegExp(escapeRegex(family), 'gi')
        next = next.replace(familyRegex, '')
    })

    return next
        .replace(/\b(?:font|typeface|tipografia|tipografía|fuente|familia tipografica|familia tipográfica)\b[:\s-]*/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
}

function buildFontLeakPreventionDirective(fonts?: { family: string; role?: 'heading' | 'body' }[]): string {
    return sharedBuildFontLeakPreventionDirective(fonts)
}

function buildContactDirective(contactLines: string[] | undefined): string {
    const safeLines = Array.isArray(contactLines)
        ? contactLines.map((line) => String(line || '').trim()).filter(Boolean).slice(0, 4)
        : []

    if (safeLines.length === 0) return ''

    return `
CONTACT DETAILS (FINAL SLIDE ONLY):
- Render these details as a secondary contact block inside the final information zone.
- Keep them clearly smaller than the headline and below the main CTA/URL hierarchy.
- Use ONLY these exact visible contact strings:
${safeLines.map((line) => `  - ${line}`).join('\n')}
- Do not invent extra contact labels, icons, prefixes, or metadata.
- Do not turn contact details into the hero message.
`.trim()
}

function buildTypographyRenderGuard(applyStyleToTypography?: boolean): string {
    if (applyStyleToTypography) {
        return [
            'Typography is style-driven in this generation.',
            'Choose the typography family and treatment from the active visual style of the image.',
            'If a font family name appears anywhere else in the prompt, treat it as invisible production metadata and NEVER print it inside the image.',
            'Do not invent extra visible labels that describe the typography choice. No family names, no typographic tags, no style descriptors rendered as text.'
        ].join('\n')
    }

    return [
        'Brand Kit fonts are mandatory when provided. Use them by role (headline/body), but NEVER render the font family names as visible text.',
        'If a font name appears anywhere else in the prompt, treat it as invisible production metadata and NEVER print it inside the image.',
        'Do not invent extra visible labels that describe the typography choice. No family names, no typographic tags, no style descriptors rendered as text.'
    ].join('\n')
}

function buildTypographyConsistencyRule(applyStyleToTypography?: boolean): string {
    if (applyStyleToTypography) {
        return 'Use one single style-driven typography system for the whole carousel. Slide 1 must establish the visible family, formal character, edge behavior, texture logic, and headline/paragraph relationship; every later slide must keep that same typography system, not invent a new one or fall back to a generic corporate sans solution. The title font in later slides must be the same title type specimen established in Slide 1, not a nearby substitute, not a cleaner reinterpretation, and not a stylistic drift of the same mood.'
    }

    return 'Keep identical typography scale, font style, weight, and hierarchy across slides.'
}

function stripVisibleListMarkers(text: string): string {
    return (text || '')
        .replace(/\r/g, '')
        .split('\n')
        .map((line) => line.replace(/^\s*[-*•·▪◦‣▶►✔✓☑]+\s*/u, '').trimEnd())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

function toUniqueColorList(input: string | string[] | undefined, fallback: string): string[] {
    const raw = Array.isArray(input) ? input : (typeof input === 'string' ? [input] : [])
    const normalized = raw
        .flatMap((entry) => entry.split(','))
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)
    const withFallback = normalized.length > 0 ? normalized : [fallback.toLowerCase()]
    return Array.from(new Set(withFallback))
}

function toBulletList(colors: string[]): string {
    return colors.map((color) => `- ${color}`).join('\n')
}

export function buildFinalPrompt({
    composition,
    brandColors,
    slideData,
    currentMood,
    currentSlide,
    totalSlides,
    logoPosition = 'Bottom-Right',
    ctaText,
    ctaUrl,
    contactLines,
    includeLogo,
    includeAuxiliaryLogos = false,
    auxiliaryLogoCount = 0,
    isSequentialSlide,
    visualAnalysis,
    language,
    fonts,
    applyStyleToTypography
}: FinalPromptParams): string {
    let cleanedBlueprint = cleanLayoutPrompt(composition.layoutPrompt)
    if (!includeLogo) {
        cleanedBlueprint = removeLogoGuidanceFromBlueprint(cleanedBlueprint)
    }
    cleanedBlueprint = stripBlueprintMeasurements(cleanedBlueprint)
    cleanedBlueprint = cleanedBlueprint.replace('{DYNAMIC_MOOD}', currentMood)
    cleanedBlueprint = injectColorsIntoBlueprint(cleanedBlueprint)
    cleanedBlueprint = stripPaperCanvasHints(stripColorGuidance(cleanedBlueprint))

    const isFirstSlide = currentSlide === 1
    const isLastSlide = currentSlide === totalSlides
    const isMiddleSlide = isSequentialSlide && !isLastSlide

    const continuityInstruction = (() => {
        if (isFirstSlide) {
            return `MASTER TEMPLATE ESTABLISHMENT (SLIDE 1/${totalSlides}):
- Establish one immutable structural shell for the whole carousel:
  same grid, same text zones, same container geometry, same background polarity.
- Define a stable hierarchy now:
  HEADLINE block (dominant), BODY block (secondary), VISUAL block (support)${includeLogo ? ', LOGO anchor.' : '.'}
- ${applyStyleToTypography
    ? 'Because typography is style-driven here, Slide 1 must also establish the master typography system for the whole carousel: visible family, formal character, edge logic, texture behavior, and the exact relationship between headline and paragraph.'
    : 'Typography stays locked to the Brand Kit system established here for the rest of the carousel.'}
- ${applyStyleToTypography
    ? 'The title of Slide 1 must be the strongest canonical expression of that system. Do not keep the first slide conservative while reserving the best typographic treatment for later slides.'
    : 'Keep the hook title clear and authoritative within the Brand Kit typography system.'}
- NON-FINAL RULE: Do NOT render any action button, action strip, or URL highlight in this slide.
- ${includeLogo ? 'Render the primary logo only in its assigned anchor.' : 'Do NOT render any brand logo or invented logo mark in this slide.'}
- This shell becomes the non-negotiable template for all next slides.`
        }

        if (isMiddleSlide) {
            return `STRUCTURAL CLONE REQUIRED (SLIDE ${currentSlide}/${totalSlides}):
- Clone the exact structural shell from Slide 1 reference.
- Keep identical: canvas polarity, frame/card system, text block coordinates, margins, paddings, and visual block proportions.
- ${applyStyleToTypography
    ? 'Keep the exact same style-driven typography system chosen in Slide 1: same visible family, same formal voice, same edge behavior, same text personality, and same headline/body relationship. Do NOT improvise a new font mood on this slide.'
    : 'Keep the exact same Brand Kit typography system from Slide 1.'}
- Do not switch to a different layout family (no full-bleed swap, no poster mode, no new panel model).
- NON-FINAL RULE: Do NOT render any action button, action strip, or URL highlight in this slide.
- ${includeLogo ? 'Keep the same logo anchor discipline as the master slide.' : 'Do NOT render any brand logo, logo placeholder, or invented brand mark in this slide.'}
- Only update narrative content, local subject action, and micro-details inside the same shell.`
        }

        return `CTA WITH SAME SYSTEM (SLIDE ${currentSlide}/${totalSlides}):
- Keep the exact same structural shell from Slide 1.
- ${applyStyleToTypography
    ? 'Keep the exact same style-driven typography system chosen in Slide 1 even on this final slide. CTA emphasis may grow, but the family, formal voice, edge logic, and text personality must remain the same.'
    : 'Keep the same Brand Kit typography system from Slide 1 on this final slide.'}
- ${applyStyleToTypography
    ? 'The final slide may make the CTA/URL more prominent, but the title itself must not become more stylized, more playful, or more distinctive than the Slide 1 title.'
    : 'Any extra emphasis on the final slide should come from layout and CTA treatment, not from changing the title font system.'}
- CTA emphasis is allowed only inside the existing CTA/text zone.
- ${includeLogo ? 'Render the primary logo only if this slide is allowed to carry it.' : 'Do NOT render any brand logo or invented logo mark in this slide.'}
- Do not redesign the canvas, do not move structural anchors, do not invert layout logic.`
    })()

    const auxiliaryLogoBlock = includeAuxiliaryLogos
        ? `
${P10B.PRIORITY_HEADER}

AUXILIARY LOGO REFERENCES PROVIDED: ${auxiliaryLogoCount || 'Several'} exact auxiliary logo reference image(s).
- These references are collaborator / sponsor / institution logos and must be rendered when the primary logo appears.
- Include ALL provided auxiliary logos in this slide.
- Treat them as a grouped secondary signatures block, never as the hero brand.

${P10B.HIERARCHY_RULES}

${P10B.VISUAL_TREATMENT}

${P10B.AVOID_INSTRUCTION}
`.trim()
        : ''

    const logoBlock = includeLogo
        ? [buildLogoDirective(logoPosition, currentSlide, totalSlides), auxiliaryLogoBlock].filter(Boolean).join('\n\n')
        : ''

    const primaryAccentForCta = toUniqueColorList(brandColors.accent, '#f0e500')[0]
    const normalizedMainCopy = normalizePromptText([slideData.title, slideData.description].filter(Boolean).join(' '))
    const normalizedCtaText = normalizePromptText(ctaText)
    const effectiveCtaText = normalizedCtaText && (
        normalizedMainCopy === normalizedCtaText ||
        normalizedMainCopy.includes(normalizedCtaText)
    )
        ? undefined
        : ctaText
    const finalActionBlock = (isLastSlide && (effectiveCtaText || ctaUrl || (contactLines && contactLines.length > 0)))
        ? [buildCtaDirective(effectiveCtaText, ctaUrl, primaryAccentForCta), buildContactDirective(contactLines)]
            .filter(Boolean)
            .join('\n\n')
        : ''

    const hasStyleDirectiveBlock = Boolean(
        visualAnalysis && /STYLE DIRECTIVES:/i.test(visualAnalysis)
    )
    const cleanedVisualAnalysis = hasStyleDirectiveBlock
        ? (visualAnalysis || '').trim()
        : (visualAnalysis
            ? stripPaperCanvasHints(stripColorGuidance(visualAnalysis.replace(/Colors?:[^\n]+/gi, '').trim()))
            : '')
    const { lighting: referenceLighting, traits: referenceTraits } = !hasStyleDirectiveBlock && cleanedVisualAnalysis
        ? extractStyleTraits(cleanedVisualAnalysis)
        : { lighting: undefined, traits: undefined }

    const visualRefBlock = hasStyleDirectiveBlock
        ? cleanedVisualAnalysis
        : (referenceTraits || referenceLighting
            ? `VISUAL REFERENCE (PRIMARY SOURCE OF TRUTH):
${referenceLighting ? `Lighting: ${referenceLighting}.` : ''}
${referenceTraits ? `Style Traits: ${referenceTraits}.` : ''}
CREATIVE DIRECTION: Apply the STYLE TRAITS and LIGHTING only. Ignore any implied support (paper/canvas/white) and follow the Brand Color Palette.`
            : '')

    const visualMediumBlock = ''
    const typographyBlock = `${buildTypographyDirective(fonts, applyStyleToTypography)}\n${buildFontLeakPreventionDirective(fonts)}`
    const typographyFingerprintBlock = buildTypographyFingerprintBlock({
        visualAnalysis,
        layoutPrompt: composition.layoutPrompt,
        compositionName: composition.name,
        applyStyleToTypography,
    })
    const headlineTreatmentBlock = buildHeadlineTreatmentDirective({
        visualAnalysis,
        layoutPrompt: composition.layoutPrompt,
        compositionName: composition.name,
        currentMood,
        applyStyleToTypography,
        currentSlide,
        totalSlides,
    })
    const subject = (() => {
        const baseScene = stripFontMentions(slideData.visualPrompt || slideData.description, fonts)
        const cleanedBaseScene = stripPaperCanvasHints(stripColorGuidance(baseScene))
        return cleanedBaseScene
    })()

    const template = FINAL_IMAGE_PROMPT_TEMPLATE
    const languageBlock = LANGUAGE_ENFORCEMENT_INSTRUCTION((language || 'es').toLowerCase())
    const backgroundColors = toUniqueColorList(brandColors.background, '#141210')
    const textColors = toUniqueColorList(brandColors.text, '#141210')
    const accentColors = toUniqueColorList(brandColors.accent, '#f0e500')

    const safeVisualRefBlock = stripFontMentions(visualRefBlock, fonts)
    // headline (visual text for the image) — falls back to title for legacy slides
    const safeHeadline = stripFontMentions(slideData.headline || slideData.title, fonts)
    const safeSubtitle = stripFontMentions(slideData.subtitle || '', fonts)

    // Build the TEXT field: headline + optional subtitle
    const textField = safeSubtitle
        ? `"${safeHeadline}" / "${safeSubtitle}".`
        : `"${safeHeadline}".`

    return template
        .replace('{{LANGUAGE_BLOCK}}', languageBlock)
        .replace('{{VISUAL_MEDIUM_BLOCK}}', visualMediumBlock)
        .replace('{{TYPOGRAPHY_RENDER_GUARD}}', buildTypographyRenderGuard(applyStyleToTypography))
        .replace('{{TYPOGRAPHY_CONSISTENCY_RULE}}', buildTypographyConsistencyRule(applyStyleToTypography))
        .replace('{{TYPOGRAPHY_BLOCK}}', typographyBlock)
        .replace('{{TYPOGRAPHY_FINGERPRINT_BLOCK}}', typographyFingerprintBlock)
        .replace('{{HEADLINE_TREATMENT_BLOCK}}', headlineTreatmentBlock)
        .replace('{{VISUAL_REF_BLOCK}}', safeVisualRefBlock ? `${safeVisualRefBlock}
` : '')
        .replace('{{LAYOUT_BLUEPRINT}}', cleanedBlueprint)
        .replace('{{BACKGROUND_COLORS}}', toBulletList(backgroundColors))
        .replace('{{TEXT_COLORS}}', toBulletList(textColors))
        .replace('{{ACCENT_COLORS}}', toBulletList(accentColors))
        .replace('{{SUBJECT}}', subject)
        .replace('{{MOOD}}', currentMood)
        .replace('{{TEXT}}', textField)
        .replace('{{FINAL_ACTION_BLOCK}}', finalActionBlock)
        .replace('{{LOGO_BLOCK}}', logoBlock)
        .replace('{{CONTINUITY}}', continuityInstruction)
}

export function generateCarouselSeed(): number {
    return Math.floor(Math.random() * 999999) + 1
}
