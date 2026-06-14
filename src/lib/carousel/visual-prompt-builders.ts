import type { BrandDNA } from '@/lib/brand-types'
import type { ReferenceImageRole } from '@/lib/creation-flow-types'
import type { SlideContent } from '@/app/actions/generate-carousel'
import { detectLanguageFromParts } from '@/lib/language-detection'
import {
    normalizeSemanticText,
    dedupeMeaningfulLines,
    stripBulletMarker,
    normalizeEditorialLine,
    descriptionHasBulletStructure,
    extractEditorialBulletCandidates,
    appendNarrativeDetail,
} from '@/lib/carousel/text-utils'

export function shouldApplyPrimaryLogoToSlide(
    selectedLogoUrl: string | undefined,
    includeLogoOnSlides: boolean | undefined,
    slideIndex: number,
    totalSlides: number
) {
    if (!selectedLogoUrl) return false
    if (includeLogoOnSlides !== false) return true
    return slideIndex === Math.max(0, totalSlides - 1)
}

export function getCarouselReferenceWeight(
    role: ReferenceImageRole,
    hasLayoutConsistencyRef: boolean
) {
    if (role === 'logo') return 0.72
    if (role === 'style' || role === 'style_content') {
        return hasLayoutConsistencyRef ? 0.2 : 0.55
    }

    // Raise user-provided content a bit without overtaking narrative/layout.
    return hasLayoutConsistencyRef ? 0.34 : 0.92
}

function buildLocalizedVisualPrompt(
    language: string,
    slideTitle: string,
    slideDescription: string,
    originalPrompt: string
): string {
    const subject = [slideTitle, slideDescription].filter(Boolean).join('. ').trim() || originalPrompt

    switch ((language || 'es').toLowerCase()) {
        case 'ca':
            return `Representa visualment aquesta idea del carrusel: ${subject}`
        case 'en':
            return `Visually represent this carousel idea: ${subject}`
        case 'fr':
            return `Représente visuellement cette idée du carrousel : ${subject}`
        case 'de':
            return `Stelle diese Karussell-Idee visuell dar: ${subject}`
        case 'pt':
            return `Representa visualmente esta ideia do carrossel: ${subject}`
        case 'it':
            return `Rappresenta visivamente questa idea del carosello: ${subject}`
        default:
            return `Representa visualmente esta idea del carrusel: ${subject}`
    }
}

export function enforceVisualPromptLanguage(
    visualPrompt: string,
    targetLanguage: string,
    slideTitle: string,
    slideDescription: string,
    originalPrompt: string
): string {
    const trimmed = (visualPrompt || '').trim()
    if (!trimmed) {
        return buildLocalizedVisualPrompt(targetLanguage, slideTitle, slideDescription, originalPrompt)
    }

    const detected = detectLanguageFromParts([trimmed], targetLanguage || 'es')
    if ((detected || '').toLowerCase() === (targetLanguage || 'es').toLowerCase()) {
        return trimmed
    }

    return buildLocalizedVisualPrompt(targetLanguage, slideTitle, slideDescription, originalPrompt)
}

function getVisualPromptLocale(language: string) {
    switch ((language || 'es').toLowerCase()) {
        case 'ca':
            return {
                slideGoalLabel: 'Objectiu visual d’aquesta slide',
                semanticAnchorsLabel: 'Elements o senyals que s’han de notar a la imatge',
                continuityLabel: 'Continuitat narrativa del carrusel',
                genericAvoidance: 'Evita metàfores corporatives genèriques; l’escena ha de respondre a aquesta slide concreta.',
                conceptualityRule: 'Mantén la imatge en un nivell conceptual-editorial: suggereix context de categoria, però evita recepcions, façanes, aules o instal·lacions específiques que semblin el negoci real del client.',
                propHierarchyRule: 'Els objectes i l’entorn han d’acompanyar l’acció principal; no converteixis un forn, un taulell o una màquina en protagonista si el text no ho exigeix.',
                styleSeparationRule: 'Defineix què s’ha de veure, no com s’ha d’estilitzar: no afegeixis colors, tècnica, fotografia, il·lustració, càmera, llum ni acabat visual en aquest bloc.',
            }
        case 'en':
            return {
                slideGoalLabel: 'Visual goal for this slide',
                semanticAnchorsLabel: 'Elements or cues that must be felt in the image',
                continuityLabel: 'Narrative continuity across the carousel',
                genericAvoidance: 'Avoid generic corporate metaphors; the scene must answer this specific slide.',
                conceptualityRule: 'Keep the image at a conceptual-editorial level: suggest category context, but avoid specific receptions, facades, classrooms or facilities that look like the client’s real business.',
                propHierarchyRule: 'Objects and environment should support the main action; do not turn an oven, counter or machine into the protagonist unless the slide text explicitly requires it.',
                styleSeparationRule: 'Define what should be shown, not how it should be stylized: do not add colors, medium, photography, illustration, camera, lighting or finish in this block.',
            }
        case 'fr':
            return {
                slideGoalLabel: 'Objectif visuel de cette slide',
                semanticAnchorsLabel: 'Éléments ou signaux qui doivent se ressentir dans l’image',
                continuityLabel: 'Continuité narrative du carrousel',
                genericAvoidance: 'Évite les métaphores corporate génériques ; la scène doit répondre à cette slide précise.',
            }
        case 'de':
            return {
                slideGoalLabel: 'Visuelles Ziel dieser Folie',
                semanticAnchorsLabel: 'Elemente oder Signale, die im Bild spürbar sein müssen',
                continuityLabel: 'Narrative Kontinuität des Karussells',
                genericAvoidance: 'Vermeide generische Business-Metaphern; die Szene muss auf diese konkrete Folie reagieren.',
            }
        case 'pt':
            return {
                slideGoalLabel: 'Objetivo visual deste slide',
                semanticAnchorsLabel: 'Elementos ou sinais que devem ser percebidos na imagem',
                continuityLabel: 'Continuidade narrativa do carrossel',
                genericAvoidance: 'Evita metáforas corporativas genéricas; a cena deve responder a este slide específico.',
            }
        case 'it':
            return {
                slideGoalLabel: 'Obiettivo visivo di questa slide',
                semanticAnchorsLabel: 'Elementi o segnali che devono emergere nell’immagine',
                continuityLabel: 'Continuità narrativa del carosello',
                genericAvoidance: 'Evita metafore corporate generiche; la scena deve rispondere a questa slide specifica.',
            }
        default:
            return {
                slideGoalLabel: 'Objetivo visual de esta slide',
                semanticAnchorsLabel: 'Elementos o señales que deben sentirse en la imagen',
                continuityLabel: 'Continuidad narrativa del carrusel',
                genericAvoidance: 'Evita metáforas corporativas genéricas; la escena debe responder a esta slide concreta.',
                conceptualityRule: 'Mantén la imagen en un nivel conceptual-editorial: sugiere contexto de categoría, pero evita recepciones, fachadas, aulas o instalaciones específicas que parezcan el negocio real del cliente.',
                propHierarchyRule: 'Los objetos y el entorno deben acompañar la acción principal; no conviertas un horno, un mostrador o una máquina en protagonista si el texto no lo exige.',
                styleSeparationRule: 'Define qué debe verse, no cómo debe estilizarse: no añadas colores, técnica, fotografía, ilustración, cámara, luz ni acabado visual en este bloque.',
            }
    }
}

function stripVisualStyleDirectives(text: string): string {
    return String(text || '')
        .replace(/#[0-9a-f]{3,8}/gi, ' ')
        .replace(/\b(?:white|black|yellow|blue|red|green|purple|pink|orange|brown|gray|grey|gold|silver|beige|cream|ivory|cyan|teal|turquoise|navy|maroon)\b/gi, ' ')
        .replace(/\b(?:blanco|negro|amarillo|azul|rojo|verde|morado|rosa|naranja|marr[oó]n|gris|dorado|plata|beige|crema|marfil|cian|turquesa|granate)\b/gi, ' ')
        .replace(/\b(?:fotograf[ií]a|fotogr[aá]fico|fotografico|photo(?:graphy|graphic)?|illustration|illustrative|ilustraci[oó]n|ilustrativo|render(?:izado)?|3d|vector(?:ial)?|anime|cinematic|cinematogr[aá]fico|watercolor|acuarela|oil painting|pintura al [oó]leo|realistic|realista|minimalist|minimalista|editorial|studio lighting|luz de estudio|lighting|camera|c[aá]mara|lens|lente|grain|grano|texture|textura|palette|paleta|color palette|paleta de color(?:es)?|fotorealista|photo-realistic)\b/gi, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
}

function buildVisualGoalForRole(
    language: string,
    role: SlideContent['role'],
    index: number,
    totalSlides: number
): string {
    const isSingle = totalSlides <= 1

    switch ((language || 'es').toLowerCase()) {
        case 'ca':
            if (isSingle) return 'Condensa la idea central en una escena clara, específica i creïble, amb prioritat per al missatge concret d’aquesta peça.'
            if (role === 'hook') return 'Atura el desplaçament visualitzant la tensió, el desig o la promesa principal d’aquesta slide, no una escena genèrica.'
            if (role === 'cta') return 'Tanca la narrativa amb sensació de decisió, claredat i següent pas, mantenint la coherència amb les slides anteriors.'
            return `Desenvolupa visualment la idea concreta d’aquesta slide ${index + 1}, aportant context, prova o mecanisme recognoscible.`
        case 'en':
            if (isSingle) return 'Condense the core idea into a clear, specific and believable scene, prioritizing the exact message of this piece.'
            if (role === 'hook') return 'Stop the scroll by visualizing the main tension, desire or promise of this slide, not a generic scene.'
            if (role === 'cta') return 'Close the narrative with a sense of decision, clarity and next step while keeping continuity with previous slides.'
            return `Visually develop the concrete idea of slide ${index + 1}, adding context, proof or a recognizable mechanism.`
        default:
            if (isSingle) return 'Condensa la idea central en una escena clara, específica y creíble, priorizando el mensaje concreto de esta pieza.'
            if (role === 'hook') return 'Detén el scroll visualizando la tensión, el deseo o la promesa principal de esta slide, no una escena genérica.'
            if (role === 'cta') return 'Cierra la narrativa con sensación de decisión, claridad y siguiente paso, manteniendo continuidad con las slides anteriores.'
            return `Desarrolla visualmente la idea concreta de la slide ${index + 1}, aportando contexto, prueba o un mecanismo reconocible.`
    }
}

function buildContinuityInstruction(
    language: string,
    slides: SlideContent[],
    index: number
): string {
    const previous = slides[index - 1]
    const next = slides[index + 1]

    switch ((language || 'es').toLowerCase()) {
        case 'ca':
            if (previous && next) return `Ha d’encaixar amb "${previous.title}" i preparar visualment "${next.title}" dins del mateix univers visual.`
            if (previous) return `S’ha de sentir com la conseqüència natural de "${previous.title}" i resoldre el tram final de la història.`
            if (next) return `Ha d’obrir la història del carrusel i preparar el pas cap a "${next.title}" sense trencar el sistema visual.`
            return 'Ha de pertànyer al mateix univers visual i al mateix fil narratiu del carrusel.'
        case 'en':
            if (previous && next) return `It must connect with "${previous.title}" and visually prepare "${next.title}" within the same visual universe.`
            if (previous) return `It should feel like the natural consequence of "${previous.title}" and resolve the final stretch of the story.`
            if (next) return `It should open the carousel story and prepare the transition toward "${next.title}" without breaking the visual system.`
            return 'It must belong to the same visual universe and narrative thread of the carousel.'
        default:
            if (previous && next) return `Debe encajar con "${previous.title}" y preparar visualmente "${next.title}" dentro del mismo universo visual.`
            if (previous) return `Debe sentirse como la consecuencia natural de "${previous.title}" y resolver el tramo final de la historia.`
            if (next) return `Debe abrir la historia del carrusel y preparar el paso hacia "${next.title}" sin romper el sistema visual.`
            return 'Debe pertenecer al mismo universo visual y al mismo hilo narrativo del carrusel.'
    }
}

function buildSlideSemanticAnchors(slide: SlideContent): string[] {
    const descriptionLead = String(slide.description || '')
        .replace(/\r/g, '')
        .split('\n')
        .map((line) => stripBulletMarker(line.trim()))
        .filter(Boolean)
        .slice(0, 2)

    const derivedBullets = extractEditorialBulletCandidates(slide.description)
    const mustKeep = Array.isArray(slide.mustKeepFacts) ? slide.mustKeepFacts : []
    const focus = slide.focus?.trim() ? [slide.focus.trim()] : []

    return dedupeMeaningfulLines(
        [slide.title, ...descriptionLead, ...derivedBullets, ...mustKeep, ...focus]
            .map(normalizeEditorialLine)
            .filter((item) => item.length >= 4)
    ).slice(0, 4)
}

export function enrichSlidesWithNarrativeVisualPrompts(params: {
    slides: SlideContent[]
    language: string
    originalPrompt: string
    writingMode: 'structure' | 'expand'
    copyGoal?: string
    audienceAngle?: string
    briefingSummary?: string
}): SlideContent[] {
    const {
        slides,
        language,
        originalPrompt,
        writingMode,
        copyGoal,
        audienceAngle,
        briefingSummary,
    } = params

    const locale = getVisualPromptLocale(language)

    return slides.map((slide, index) => {
        const basePrompt = stripVisualStyleDirectives(enforceVisualPromptLanguage(
            slide.visualPrompt,
            language,
            slide.title,
            slide.description,
            originalPrompt
        ))

        const semanticAnchors = buildSlideSemanticAnchors(slide)
        const visualGoal = buildVisualGoalForRole(language, slide.role, index, slides.length)
        const continuity = buildContinuityInstruction(language, slides, index)

        const semanticBlock = semanticAnchors.length > 0
            ? `${locale.semanticAnchorsLabel}: ${semanticAnchors.join(' | ')}.`
            : ''

        const strategyBlock = [
            copyGoal ? appendNarrativeDetail('', copyGoal) : '',
            audienceAngle ? appendNarrativeDetail('', audienceAngle) : '',
            writingMode === 'structure'
                ? ((language || 'es').toLowerCase() === 'en'
                    ? 'Translate the informational content of this slide into a concrete, believable scene instead of a generic corporate image.'
                    : (language || 'es').toLowerCase() === 'ca'
                        ? 'Tradueix el contingut informatiu d’aquesta slide en una escena concreta i creïble, no en una imatge corporativa genèrica.'
                        : 'Traduce el contenido informativo de esta slide en una escena concreta y creíble, no en una imagen corporativa genérica.')
                : ''
        ]
            .filter(Boolean)
            .join(' ')

        const enrichedPrompt = [
            basePrompt,
            `${locale.slideGoalLabel}: ${visualGoal}`,
            semanticBlock,
            strategyBlock,
            `${locale.continuityLabel}: ${[briefingSummary, continuity].filter(Boolean).join(' ')}`.trim(),
            locale.conceptualityRule,
            locale.propHierarchyRule,
            locale.styleSeparationRule,
            locale.genericAvoidance,
        ]
            .filter(Boolean)
            .join(' ')
            .replace(/\s{2,}/g, ' ')
            .trim()

        return {
            ...slide,
            visualPrompt: enrichedPrompt,
        }
    })
}

function lineLooksCoveredInSlides(detail: string, slides: SlideContent[]): boolean {
    const normalizedDetail = normalizeSemanticText(detail)
    if (!normalizedDetail) return true
    const detailTokens = normalizedDetail.split(/\s+/).filter((token) => token.length > 2)

    return slides.some((slide) => {
        const slideText = normalizeSemanticText(`${slide.title} ${slide.description} ${slide.visualPrompt}`)
        if (!slideText) return false
        if (slideText.includes(normalizedDetail)) return true
        const matches = detailTokens.filter((token) => slideText.includes(token)).length
        return detailTokens.length > 0 && matches / detailTokens.length >= 0.6
    })
}

function buildStructuredSlideDescription(
    description: string,
    details: string[],
    role: SlideContent['role'],
    totalSlides: number
): string {
    const rawLines = String(description || '')
        .replace(/\r/g, '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

    const introLines = rawLines.filter((line) => !/^[-*•·]\s+/.test(line))
    const existingBullets = rawLines
        .filter((line) => /^[-*•·]\s+/.test(line))
        .map(stripBulletMarker)

    const derivedBullets = extractEditorialBulletCandidates(description)
    const bulletItems = dedupeMeaningfulLines(
        [...existingBullets, ...derivedBullets, ...details]
            .map(normalizeEditorialLine)
            .filter(Boolean)
    )
    if (bulletItems.length === 0) {
        return description.trim()
    }

    const lead = introLines[0]
        || (role === 'cta'
            ? 'Da el siguiente paso con esta informacion:'
            : totalSlides === 1
                ? 'Informacion clave:'
                : 'Puntos clave:')

    const supportingLine = introLines.slice(1).join('\n').trim()
    const maxBullets = totalSlides === 1 ? 6 : 4

    return [
        lead,
        supportingLine,
        ...bulletItems.slice(0, maxBullets).map((item) => `• ${item}`)
    ]
        .filter(Boolean)
        .join('\n')
        .trim()
}

export function distributePromptDetailsAcrossSlides(
    slides: SlideContent[],
    promptDetails: string[],
    writingMode: 'structure' | 'expand'
): SlideContent[] {
    if (promptDetails.length === 0 || slides.length === 0) return slides

    const missingDetails = promptDetails.filter((detail) => !lineLooksCoveredInSlides(detail, slides))
    const nextSlides = slides.map((slide) => ({
        ...slide,
        mustKeepFacts: slide.mustKeepFacts ? [...slide.mustKeepFacts] : []
    }))

    const totalSlides = nextSlides.length

    if (missingDetails.length === 0) {
        if (writingMode === 'structure' && totalSlides === 1 && promptDetails.length >= 2 && !descriptionHasBulletStructure(nextSlides[0].description)) {
            const structuredFromDescription = buildStructuredSlideDescription(
                nextSlides[0].description,
                [],
                nextSlides[0].role,
                totalSlides
            )

            nextSlides[0].description = structuredFromDescription !== nextSlides[0].description.trim()
                ? structuredFromDescription
                : buildStructuredSlideDescription(
                nextSlides[0].description,
                promptDetails.map(normalizeEditorialLine),
                nextSlides[0].role,
                totalSlides
            )
        }
        return nextSlides
    }

    const contentIndexes = slides
        .map((slide, index) => ({ slide, index }))
        .filter(({ slide }) => slide.role === 'content')
        .map(({ index }) => index)

    const targetIndexes = contentIndexes.length > 0
        ? contentIndexes
        : slides.map((_, index) => index)

    missingDetails.forEach((detail, order) => {
        const targetIndex = targetIndexes[order % targetIndexes.length]
        const targetSlide = nextSlides[targetIndex]
        if (writingMode === 'structure') {
            targetSlide.mustKeepFacts = dedupeMeaningfulLines([...(targetSlide.mustKeepFacts || []), normalizeEditorialLine(detail)])
        } else {
            targetSlide.description = appendNarrativeDetail(targetSlide.description, detail)
        }
        targetSlide.visualPrompt = appendNarrativeDetail(targetSlide.visualPrompt, detail)
    })

    if (writingMode === 'structure') {
        nextSlides.forEach((slide) => {
            const details = dedupeMeaningfulLines(slide.mustKeepFacts || [])
            if (details.length === 0) return
            if (slide.role === 'hook' && totalSlides > 1) return
            slide.description = buildStructuredSlideDescription(slide.description, details, slide.role, totalSlides)
        })
    }

    return nextSlides
}

export function detectPromptRichness(prompt: string, promptDetails: string[]): 'structure' | 'expand' {
    const normalized = normalizeSemanticText(prompt)
    const wordCount = normalized ? normalized.split(/\s+/).filter(Boolean).length : 0
    const hasListStructure = /[\n\r]/.test(prompt) && /^[-*•·]/m.test(prompt)
    const hasDenseDetails = promptDetails.length >= 2
    const hasEnumeratedSignals = /\b(a1|a2|b1|b2|c1|c2)\b|https?:\/\/|www\.|@|:/i.test(prompt)

    if (hasDenseDetails || hasListStructure || hasEnumeratedSignals || wordCount >= 24) {
        return 'structure'
    }

    return 'expand'
}

export function buildBrandVoiceGuidance(brand: BrandDNA): string {
    const parts: string[] = []

    const audience = Array.isArray(brand.target_audience) ? brand.target_audience.filter(Boolean) : []
    if (audience.length > 0) {
        parts.push(`Publico objetivo prioritario: ${audience.join(', ')}.`)
    }

    const tone = Array.isArray(brand.tone_of_voice) ? brand.tone_of_voice.filter(Boolean) : []
    if (tone.length > 0) {
        parts.push(`Tono de voz: ${tone.join(', ')}.`)
    }

    const values = Array.isArray(brand.brand_values) ? brand.brand_values.filter(Boolean) : []
    if (values.length > 0) {
        parts.push(`Valores de marca a reflejar: ${values.join(', ')}.`)
    }

    if (brand.tagline?.trim()) {
        parts.push(`Tagline o promesa de marca: ${brand.tagline.trim()}.`)
    }

    if (brand.business_overview?.trim()) {
        parts.push(`Contexto de negocio: ${brand.business_overview.trim()}.`)
    }

    const hooks = Array.isArray(brand.text_assets?.marketing_hooks) ? brand.text_assets?.marketing_hooks.filter(Boolean) : []
    if (hooks.length > 0) {
        parts.push(`Ganchos o lineas de marca a reutilizar si encajan: ${hooks.slice(0, 3).join(' | ')}.`)
    }

    parts.push('Escribe como copywriter de Instagram: claro, memorable, escaneable y persuasivo.')

    return parts.join('\n')
}
