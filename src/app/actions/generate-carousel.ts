'use server'

import { generateContentImageUnified } from '@/lib/gemini'
import { generateTextUnified } from '@/lib/gemini'
import type { BrandDNA } from '@/lib/brand-types'
import { buildCarouselDecompositionPrompt } from '@/lib/prompts/carousel'
import { buildCarouselBrandContext } from '@/lib/carousel-brand-context'
import { buildCarouselPrompt } from '@/lib/prompts/carousel/builder'
import { buildCarouselBriefInterpreterPrompt } from '@/lib/prompts/carousel-brief-interpreter'
import { getMoodForSlide } from '@/lib/prompts/carousel/mood'
import { buildFinalPrompt, generateCarouselSeed, extractLogoPosition } from '@/lib/prompts/carousel/builder/final-prompt'
import { detectLanguageFromParts, resolveGenerationLanguage } from '@/lib/language-detection'
import type { NarrativeStructure, CarouselComposition as NarrativeComposition } from '@/lib/carousel-structures'
import { fetchMutation, fetchQuery } from 'convex/nextjs'
import { authedFetchQuery, authedFetchMutation } from '@/lib/convex-server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { log } from '@/lib/logger'
import { api } from '../../../convex/_generated/api'
import type { ReferenceImageRole } from '@/lib/creation-flow-types'
import { normalizeSemanticText, dedupeMeaningfulLines, stripBulletMarker, normalizeEditorialLine, descriptionHasBulletStructure, extractPromptDetailBlocks, extractEditorialBulletCandidates, appendNarrativeDetail, extractBalancedJsonObject, createEconomicFlowId, shortFlowId } from '@/lib/carousel/text-utils'

type DbStructure = {
    structure_id: string
    name: string
    summary: string
    tension?: string
    flow?: string
    proof?: string
    cta?: string
    order: number
}

type DbComposition = {
    composition_id: string
    structure_id?: string
    scope: string
    mode: string
    name: string
    description: string
    layoutPrompt: string
    icon?: string
    iconPrompt?: string
    order: number
}

type CarouselStructure = {
    id: string
    name: string
    summary: string
    tension?: string
    flow?: string
    proof?: string
    cta?: string
    order: number
}

type CarouselComposition = {
    id: string
    structureId?: string
    scope: 'global' | 'narrative'
    mode: 'basic' | 'advanced'
    name: string
    description: string
    layoutPrompt: string
    icon?: string
    iconPrompt?: string
    order: number
}

type CarouselCatalog = {
    structures: CarouselStructure[]
    compositions: CarouselComposition[]
}

type EconomicAuditContext = {
    flowId: string
    userClerkId?: string
    userEmail?: string
}

async function resolveEconomicAuditActor(): Promise<Pick<EconomicAuditContext, 'userClerkId' | 'userEmail'>> {
    try {
        const { userId } = await auth()
        if (!userId) return {}
        const userRow = await authedFetchQuery(api.users.getUser, { clerk_id: userId }) as { email?: string } | null
        return {
            userClerkId: userId,
            userEmail: userRow?.email,
        }
    } catch {
        return {}
    }
}

async function ensureUserHasCreditsForCarouselImage() {
    const { userId } = await auth()
    if (!userId) {
        throw new Error('Unauthorized')
    }

    let creditsData = await authedFetchQuery(api.users.getCredits, { clerk_id: userId })

    if (!creditsData) {
        const user = await currentUser()
        const email = user?.emailAddresses?.[0]?.emailAddress || ''
        if (email) {
            await authedFetchMutation(api.users.upsertUser, {
                clerk_id: userId,
                email,
            })
            creditsData = await authedFetchQuery(api.users.getCredits, { clerk_id: userId })
        }
    }

    if (!creditsData) {
        throw new Error('Error creando usuario')
    }

    if (creditsData.status !== 'active') {
        const statusMessages: Record<string, string> = {
            waitlist: 'Tu cuenta está en lista de espera. Contacta al admin para activarla.',
            suspended: 'Tu cuenta ha sido suspendida. Contacta al admin.',
        }
        throw new Error(statusMessages[creditsData.status] || 'Cuenta no activa')
    }

    if (creditsData.credits < 1) {
        throw new Error('Sin créditos disponibles. Contacta al admin para obtener más.')
    }

    return userId
}

async function consumeCarouselImageCredit(userId: string, metadata: Record<string, unknown>) {
    try {
        await authedFetchMutation(api.users.consumeCredits, {
            clerk_id: userId,
            metadata,
        })
    } catch (creditError) {
        log.warn('CAROUSEL', 'Failed to consume credit after slide generation', creditError)
    }
}

async function logEconomicModelCall(params: {
    audit?: EconomicAuditContext
    phase: string
    model: string
    kind: 'intelligence' | 'image'
    metadata?: Record<string, unknown>
}) {
    const { audit, phase, model, kind, metadata } = params
    if (!audit?.flowId) return
    try {
        await fetchMutation(api.economic.logEconomicEvent, {
            flow_id: audit.flowId,
            phase,
            model,
            kind,
            user_clerk_id: audit.userClerkId,
            user_email: audit.userEmail,
            metadata,
        })
    } catch (error) {
        log.warn('ECONOMIC', `Audit event failed | phase=${phase} model=${model}`, error)
    }
}

const normalizeCompositionId = (id?: string) => (id && id !== 'free' ? id : undefined)

async function loadCarouselCatalog(): Promise<CarouselCatalog> {
    let structures = await fetchQuery(api.carousel.listStructures, { includeInactive: false }) as unknown as DbStructure[]
    let compositions = await fetchQuery(api.carousel.listCompositions, { includeInactive: false, includeGlobals: true }) as unknown as DbComposition[]

    if ((structures || []).length === 0) {
        const seedResult = await fetchMutation(api.carouselSeed.ensureDefaultsIfEmpty, {})
        log.info('CAROUSEL', `Catalog auto-seed executed | seeded=${Boolean((seedResult as { seeded?: boolean } | null)?.seeded)}`)
        structures = await fetchQuery(api.carousel.listStructures, { includeInactive: false }) as unknown as DbStructure[]
        compositions = await fetchQuery(api.carousel.listCompositions, { includeInactive: false, includeGlobals: true }) as unknown as DbComposition[]
    }

    const mappedStructures = (structures || []).map((s) => ({
        id: s.structure_id,
        name: s.name,
        summary: s.summary,
        tension: s.tension,
        flow: s.flow,
        proof: s.proof,
        cta: s.cta,
        order: s.order
    })).sort((a, b) => a.order - b.order)

    const mappedCompositions = (compositions || []).map((c) => ({
        id: c.composition_id,
        structureId: c.structure_id,
        scope: (c.scope as 'global' | 'narrative') || 'narrative',
        mode: (c.mode as 'basic' | 'advanced') || 'basic',
        name: c.name,
        description: c.description,
        layoutPrompt: c.layoutPrompt,
        icon: c.icon,
        iconPrompt: c.iconPrompt,
        order: c.order
    })).sort((a, b) => a.order - b.order)

    if (mappedStructures.length === 0) {
        throw new Error('No hay narrativas de carrusel configuradas en Convex.')
    }

    return {
        structures: mappedStructures,
        compositions: mappedCompositions
    }
}

function getStructureById(structures: CarouselStructure[], id?: string): CarouselStructure | undefined {
    if (!id) return undefined
    return structures.find((s) => s.id === id)
}

function getDefaultStructure(structures: CarouselStructure[]): CarouselStructure | undefined {
    return structures[0]
}

function getCompositionsForStructure(
    compositions: CarouselComposition[],
    structureId?: string
): CarouselComposition[] {
    if (!structureId) return compositions.filter((c) => c.scope === 'global')
    return compositions.filter((c) => c.scope === 'global' || c.structureId === structureId)
}

function getCompositionById(
    compositions: CarouselComposition[],
    id?: string
): CarouselComposition | undefined {
    if (!id) return undefined
    return compositions.find((c) => c.id === id)
}

type CarouselReferenceInput = {
    url: string
    role: ReferenceImageRole
}

function normalizeCarouselReferenceRole(role?: ReferenceImageRole): ReferenceImageRole {
    if (role === 'style' || role === 'style_content' || role === 'logo' || role === 'content') {
        return role
    }
    return 'content'
}

function normalizeCarouselReferenceInputs(
    selectedReferenceImages?: Array<{ url: string; role: ReferenceImageRole }>,
    selectedImageUrls?: string[]
): CarouselReferenceInput[] {
    if (Array.isArray(selectedReferenceImages) && selectedReferenceImages.length > 0) {
        return selectedReferenceImages
            .filter((item) => Boolean(item?.url))
            .map((item) => ({
                url: item.url,
                role: normalizeCarouselReferenceRole(item.role)
            }))
    }

    return (selectedImageUrls || [])
        .filter(Boolean)
        .map((url) => ({ url, role: 'content' as const }))
}

export interface SlideContent {
    index: number
    /** Short, punchy text rendered inside the image (max ~10 words). Falls back to title when absent. */
    headline?: string
    /** Synthetic subtitle rendered below the headline in the image (max ~20 words). Concise value prop, not the full description. */
    subtitle?: string
    title: string
    description: string
    visualPrompt: string
    mustKeepFacts?: string[]
    composition?: string
    focus?: string
    role?: 'hook' | 'content' | 'cta'
}

export interface CarouselSlide {
    index: number
    imageUrl?: string
    image_storage_id?: string
    imagePreviewUrl?: string
    image_preview_storage_id?: string
    imageOriginalUrl?: string
    image_original_storage_id?: string
    headline?: string
    subtitle?: string
    title: string
    description: string
    mustKeepFacts?: string[]
    status: 'pending' | 'generating' | 'done' | 'error'
    error?: string
    debugPrompt?: string
    debugReferences?: DebugImageReference[]
}

export interface DebugImageReference {
    type: string
    label?: string
    url: string
}

export interface GenerateCarouselInput {
    prompt: string
    slideCount: number
    aspectRatio?: '1:1' | '4:5' | '3:4'
    style?: string
    compositionId?: string
    structureId?: string
    brandDNA: BrandDNA
    intelligenceModel?: string
    imageModel?: string
    aiImageDescription?: string
    language?: string
    // Optional per-slide overrides
    slideOverrides?: { index: number; text: string }[]
    slideScript?: SlideContent[]
    // Brand Kit Selections
    selectedLogoUrl?: string
    selectedColors?: { color: string; role: string }[]
    selectedReferenceImages?: Array<{ url: string; role: ReferenceImageRole }>
    selectedImageUrls?: string[]
    includeLogoOnSlides?: boolean
    ctaUrlEnabled?: boolean
    ctaUrl?: string
    finalContactLines?: string[]
    applyStyleToTypography?: boolean
    auditFlowId?: string
}

export interface AnalyzeCarouselInput {
    prompt: string
    slideCount: number
    brandDNA: BrandDNA
    intelligenceModel: string
    structureId?: string
    selectedColors?: { color: string; role: string }[]
    includeLogoOnSlides?: boolean
    selectedLogoUrl?: string
    aiImageDescription?: string
    language?: string
    auditFlowId?: string
}

export interface AnalyzeCarouselResult {
    success: boolean
    slides: SlideContent[]
    hook?: string
    structure?: { id?: string; name?: string }
    optimalSlideCount?: number
    detectedIntent?: string
    caption?: string
    suggestions?: CarouselSuggestion[]
    error?: string
}

export interface GenerateCarouselResult {
    success: boolean
    slides: CarouselSlide[]
    error?: string
}

function shouldApplyPrimaryLogoToSlide(
    selectedLogoUrl: string | undefined,
    includeLogoOnSlides: boolean | undefined,
    slideIndex: number,
    totalSlides: number
) {
    if (!selectedLogoUrl) return false
    if (includeLogoOnSlides !== false) return true
    return slideIndex === Math.max(0, totalSlides - 1)
}

function getCarouselReferenceWeight(
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

function enforceVisualPromptLanguage(
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

function enrichSlidesWithNarrativeVisualPrompts(params: {
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

function distributePromptDetailsAcrossSlides(
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

function detectPromptRichness(prompt: string, promptDetails: string[]): 'structure' | 'expand' {
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

function buildBrandVoiceGuidance(brand: BrandDNA): string {
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

export interface CarouselSuggestion {
    title: string
    subtitle: string
    slides: SlideContent[]
    hook?: string
    structure?: { id?: string; name?: string }
    optimalSlideCount?: number
    detectedIntent?: string
    caption?: string
}

interface InterpretedCarouselBrief {
    normalizedRequest?: string
    briefingSummary?: string
    writingMode?: 'structure' | 'expand'
    copyGoal?: string
    audienceAngle?: string
    mustKeepFacts?: string[]
    riskyLiterals?: string[]
}

function parseInterpreterResponse(response: string): InterpretedCarouselBrief | null {
    const normalized = String(response || '')
        .trim()
        .replace(/^\uFEFF/, '')
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")

    const fenced = normalized.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    const candidate = fenced?.[1]?.trim() || extractBalancedJsonObject(normalized)
    if (!candidate) return null

    try {
        const parsed = JSON.parse(candidate) as InterpretedCarouselBrief
        return {
            normalizedRequest: typeof parsed.normalizedRequest === 'string' ? parsed.normalizedRequest.trim() : undefined,
            briefingSummary: typeof parsed.briefingSummary === 'string' ? parsed.briefingSummary.trim() : undefined,
            writingMode: parsed.writingMode === 'structure' || parsed.writingMode === 'expand' ? parsed.writingMode : undefined,
            copyGoal: typeof parsed.copyGoal === 'string' ? parsed.copyGoal.trim() : undefined,
            audienceAngle: typeof parsed.audienceAngle === 'string' ? parsed.audienceAngle.trim() : undefined,
            mustKeepFacts: Array.isArray(parsed.mustKeepFacts)
                ? parsed.mustKeepFacts.map((item) => normalizeEditorialLine(String(item || ''))).filter(Boolean)
                : [],
            riskyLiterals: Array.isArray(parsed.riskyLiterals)
                ? parsed.riskyLiterals.map((item) => String(item || '').trim()).filter(Boolean)
                : []
        }
    } catch {
        return null
    }
}

async function interpretCarouselBrief(params: {
    prompt: string
    slideCount: number
    brand: BrandDNA
    model: string
    language: string
    brandVoice: string
    audit?: EconomicAuditContext
}): Promise<InterpretedCarouselBrief | null> {
    const { prompt, slideCount, brand, model, language, brandVoice, audit } = params
    const promptToUse = buildCarouselBriefInterpreterPrompt({
        prompt,
        language,
        requestedSlideCount: slideCount,
        brandName: brand.brand_name,
        brandWebsite: brand.url,
        targetAudience: Array.isArray(brand.target_audience) ? brand.target_audience.filter(Boolean) : [],
        brandVoice
    })

    const brandWrapper = { name: brand.brand_name, brand_dna: brand }

    try {
        const response = await generateTextUnified(
            brandWrapper,
            promptToUse,
            model,
            undefined,
            ''
        )

        await logEconomicModelCall({
            audit,
            phase: 'carousel_brief_interpretation',
            model,
            kind: 'intelligence',
            metadata: {
                requested_slides: slideCount,
            }
        })

        return parseInterpreterResponse(response)
    } catch (error) {
        log.warn('CAROUSEL', 'Brief interpreter failed; fallback to raw prompt', error)
        return null
    }
}


/**
 * Decompose a prompt into N slide concepts using AI
 */
async function decomposeIntoSlides(
    prompt: string,
    slideCount: number,
    brand: BrandDNA,
    model: string,
    selectedColors?: { color: string; role: string }[],
    includeLogoUrl?: string,
    catalog?: CarouselCatalog,
    options?: {
        captionOnly?: boolean
        structureId?: string
        compositionId?: string
        visualDescription?: string
        language?: string
        audit?: EconomicAuditContext
    }
): Promise<{
    slides: SlideContent[]
    hook?: string
    structure?: { id?: string; name?: string }
    optimalSlideCount?: number
    detectedIntent?: string
    caption?: string
    suggestions?: CarouselSuggestion[]
}> {
    const auditFlowTag = options?.audit?.flowId || 'no-flow'

    // Auto-detect language from user prompt (like image module does)
    const detectedLanguage = await resolveGenerationLanguage({
        promptParts: [prompt],
    })
    const brandVoiceGuidance = buildBrandVoiceGuidance(brand)
    const interpretedBrief = await interpretCarouselBrief({
        prompt,
        slideCount,
        brand,
        model,
        language: detectedLanguage,
        brandVoice: brandVoiceGuidance,
        audit: options?.audit
    })
    const normalizedRequest = interpretedBrief?.normalizedRequest?.trim() || prompt.trim()
    const promptDetails = dedupeMeaningfulLines(
        (interpretedBrief?.mustKeepFacts && interpretedBrief.mustKeepFacts.length > 0)
            ? interpretedBrief.mustKeepFacts
            : extractPromptDetailBlocks(prompt).map(normalizeEditorialLine).filter(Boolean)
    )
    const writingMode = interpretedBrief?.writingMode || detectPromptRichness(normalizedRequest, promptDetails)
    const effectiveTopic = [
        interpretedBrief?.briefingSummary ? `RESUMEN EDITORIAL:\n${interpretedBrief.briefingSummary}` : '',
        normalizedRequest,
        interpretedBrief?.copyGoal ? `OBJETIVO DE COPY:\n${interpretedBrief.copyGoal}` : '',
        interpretedBrief?.audienceAngle ? `ANGULO DE AUDIENCIA:\n${interpretedBrief.audienceAngle}` : ''
    ]
        .filter(Boolean)
        .join('\n\n')

    log.info('CAROUSEL', 'Iniciando análisis del carrusel', {
        flow: shortFlowId(auditFlowTag),
        slides_solicitadas: slideCount,
        modelo: model,
        idioma: detectedLanguage,
        detalles_prompt: promptDetails.length,
        writing_mode: writingMode,
        brief_interpretado: Boolean(interpretedBrief?.normalizedRequest),
    })

    const selectedColorsList = selectedColors?.map(c => c.color) || []

    // NEW: Use Modular Prompt Builder if structure is defined
    let decompositionPrompt = ''

    const normalizedCompositionId = normalizeCompositionId(options?.compositionId)
    if (options?.structureId && normalizedCompositionId && catalog) {
        const structure = getStructureById(catalog.structures, options.structureId)
        const available = getCompositionsForStructure(catalog.compositions, options.structureId)
        const composition = getCompositionById(available, normalizedCompositionId)

        if (structure && composition) {
            log.info('CAROUSEL', `Using modular prompt | structure=${structure.id} composition=${composition.id}`)
            const narrative: NarrativeStructure = {
                id: structure.id,
                name: structure.name,
                summary: structure.summary,
                compositions: available.map((item) => ({
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    layoutPrompt: item.layoutPrompt,
                    iconPrompt: item.iconPrompt || item.icon || '',
                    mode: item.mode
                })) as NarrativeComposition[]
            }
            const compositionForPrompt: NarrativeComposition = {
                id: composition.id,
                name: composition.name,
                description: composition.description,
                layoutPrompt: composition.layoutPrompt,
                iconPrompt: composition.iconPrompt || composition.icon || '',
                mode: composition.mode
            }
            decompositionPrompt = buildCarouselPrompt(
                {
                    brandName: brand.brand_name,
                    brandTone: brand.tone_of_voice?.join(', ') || 'Professional',
                    targetAudience: brand.target_audience?.join(', ') || 'Professionals',
                    intent: effectiveTopic,
                    slidesCount: slideCount,
                    visualAnalysis: options.visualDescription,
                    includeLogo: !!includeLogoUrl,
                    language: detectedLanguage, // Use auto-detected language
                    brandColors: selectedColorsList,
                    factsToPreserve: promptDetails,
                    writingMode,
                    brandVoice: brandVoiceGuidance
                },
                narrative,
                compositionForPrompt
            )
        }
    }

    if (!decompositionPrompt) {
        const selectedColorsList = selectedColors?.map(c => c.color) || []
        decompositionPrompt = buildCarouselDecompositionPrompt({
            brandContext: buildCarouselBrandContext(brand, selectedColorsList, includeLogoUrl),
            topic: effectiveTopic,
            brandWebsite: brand.url,
            requestedSlideCount: slideCount,
            visualAnalysis: options?.visualDescription,
            language: detectedLanguage,
            factsToPreserve: promptDetails,
            writingMode,
            brandVoice: brandVoiceGuidance
        })
    }

    const brandWrapper = { name: brand.brand_name, brand_dna: brand }
    const requested = Math.max(1, Math.min(15, slideCount || 5))

    const normalizeRole = (value: any): 'hook' | 'content' | 'cta' | undefined => {
        if (typeof value !== 'string') return undefined
        const normalized = value.toLowerCase().trim()
        if (['hook', 'gancho', 'portada', 'inicio'].includes(normalized)) return 'hook'
        if (['cta', 'cierre', 'accion', 'acción', 'conclusion', 'conclusión'].includes(normalized)) return 'cta'
        if (['content', 'contenido', 'desarrollo', 'medio'].includes(normalized)) return 'content'
        return undefined
    }

    const normalizeTextForMatching = (text: string) =>
        text
            .toLowerCase()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .trim()

    const normalizeStructureKey = (value: string) =>
        value
            .toLowerCase()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')

    const STRUCTURE_ALIASES: Record<string, string> = {
        'framework-aida': 'framework-pas',
        'caso-estudio': 'estudio-caso',
        'case-study': 'estudio-caso',
        'comparativa-dual': 'comparativa-productos',
        'checklist': 'checklist-diagnostico',
        'faq': 'preguntas-respuestas',
        'storytelling-3-actos': 'cronologia-historia',
        'datos-estadisticas': 'cifras-dato',
        'oferta-cta': 'promocion-oferta',
        'q-and-a': 'preguntas-respuestas',
        'q-a': 'preguntas-respuestas',
        'comunicado': 'comunicado-operativo',
        'operational-notice': 'comunicado-operativo'
    }

    const STRUCTURE_NAME_ALIASES: Record<string, string> = {
        'data-stats': 'cifras-dato',
        'data-stats-': 'cifras-dato',
        'case-study': 'estudio-caso',
        'problem-solution': 'problema-solucion',
        'before-after': 'antes-despues',
        'step-by-step': 'paso-a-paso',
        'tips-list': 'lista-tips',
        'top-ranking': 'top-ranking',
        'myths-vs-reality': 'mitos-vs-realidad',
        'common-mistakes': 'errores-comunes',
        'pas-framework': 'framework-pas',
        'promotion-offer': 'promocion-oferta',
        'timeline-history': 'cronologia-historia',
        'tutorial-how-to': 'tutorial-how-to',
        'quote': 'frase-celebre',
        'meme-humor': 'meme-humor',
        'questions-answers': 'preguntas-respuestas',
        'q-and-a': 'preguntas-respuestas',
        'diagnostic-checklist': 'checklist-diagnostico',
        'operational-notice': 'comunicado-operativo'
    }

    const intentStructureMap: Record<string, string> = {
        oferta: 'promocion-oferta',
        escaparate: 'paso-a-paso',
        catalogo: 'comparativa-productos',
        lanzamiento: 'framework-pas',
        servicio: 'preguntas-respuestas',
        comunicado: 'comunicado-operativo',
        lista: 'lista-tips',
        comparativa: 'comparativa-productos',
        evento: 'cronologia-historia',
        efemeride: 'cronologia-historia',
        equipo: 'top-ranking',
        logro: 'antes-despues',
        cita: 'frase-celebre',
        talento: 'lista-tips',
        bts: 'paso-a-paso',
        dato: 'cifras-dato',
        pasos: 'tutorial-how-to',
        definicion: 'cifras-dato',
        pregunta: 'preguntas-respuestas',
        reto: 'paso-a-paso'
    }

    const hasQuoteLikeSignal = (text: string) => {
        const hasQuotePunctuation = /["\u201C\u201D\u00AB\u00BB]/.test(text)
        const hasAttributionLine = /(?:^|\n)\s*(?:\u2014|-)\s*[\p{L}][\p{L} .,'\u2019-]{1,}$/u.test(text)
        return hasQuotePunctuation || hasAttributionLine
    }

    const inferStructureFromPrompt = (text: string, detectedIntent?: string) => {
        const fallback = catalog ? getDefaultStructure(catalog.structures) : undefined
        const mappedIntent = detectedIntent ? intentStructureMap[detectedIntent] : undefined
        if (mappedIntent && !(mappedIntent === 'frase-celebre' && !hasQuoteLikeSignal(text))) {
            const mapped = catalog ? getStructureById(catalog.structures, mappedIntent) : undefined
            if (mapped) return mapped
        }

        if (hasQuoteLikeSignal(text)) {
            return catalog ? getStructureById(catalog.structures, 'frase-celebre') : undefined
        }

        return fallback
    }

    const resolveStructureFromParsed = (parsedStructure: any, detectedIntent?: string) => {
        const fallback = catalog ? getDefaultStructure(catalog.structures) : undefined
        const rawId = typeof parsedStructure?.id === 'string' ? parsedStructure.id : ''
        const rawName = typeof parsedStructure?.name === 'string' ? parsedStructure.name : ''
        const normalizedId = rawId ? normalizeStructureKey(rawId) : ''
        const normalizedName = rawName ? normalizeStructureKey(rawName) : ''
        const mappedIntent = detectedIntent ? intentStructureMap[detectedIntent] : undefined
        const hasQuoteSignal = hasQuoteLikeSignal(prompt)
        const mappedFromIntent =
            mappedIntent && !(mappedIntent === 'frase-celebre' && !hasQuoteSignal)
                ? (catalog ? getStructureById(catalog.structures, mappedIntent) : undefined)
                : undefined

        if (normalizedId) {
            const direct = catalog ? getStructureById(catalog.structures, normalizedId) : undefined
            if (direct) {
                if (direct.id === 'frase-celebre' && !hasQuoteSignal) {
                    return mappedFromIntent ?? inferStructureFromPrompt(prompt, detectedIntent)
                }
                return direct
            }
            const alias = STRUCTURE_ALIASES[normalizedId]
            if (alias) {
                const mapped = catalog ? getStructureById(catalog.structures, alias) : undefined
                if (mapped) {
                    if (mapped.id === 'frase-celebre' && !hasQuoteSignal) {
                        return mappedFromIntent ?? inferStructureFromPrompt(prompt, detectedIntent)
                    }
                    return mapped
                }
            }
        }

        if (normalizedName) {
            const nameAlias = STRUCTURE_NAME_ALIASES[normalizedName]
            if (nameAlias) {
                const mapped = catalog ? getStructureById(catalog.structures, nameAlias) : undefined
                if (mapped) {
                    if (mapped.id === 'frase-celebre' && !hasQuoteSignal) {
                        return mappedFromIntent ?? inferStructureFromPrompt(prompt, detectedIntent)
                    }
                    return mapped
                }
            }
        }

        if (mappedFromIntent) return mappedFromIntent
        if (hasQuoteSignal) return catalog ? getStructureById(catalog.structures, 'frase-celebre') : undefined
        return fallback
    }

    const hookForbiddenRegex = /(\\b(truco|tip|atajo|paso|punto)\\b\\s*#?\\s*\\d+)|(#\\s*\\d+)/i
    const ctaRequiredRegex =
        /(cta|llamada a la accion|call to action|inscrib|matricul|apunt|visita|visit|mas info|escriben|contact|registr|sigu|comparte|compra|reserva|solicita|pide|descarga|entra|unete|mandan|envian|aplica|agenda|agend|descubre|prueba|pruebalo|explora|cotiza|demo|demos|llama|llamanos|haz clic|haz click|clic|click|swipe|desliza|link en bio|comprar|shop|get started|learn more|join|suscrib)/i
    const contactRegex = /(wa\.me|whatsapp|dm|mensaje|correo|email|@|tel\.?|llama)/i
    const urlRegex = /(https?:\/\/|www\.)/i

    /**
 * Removes Markdown links from a text, keeping only the URL part.
 * E.g. "Visit [Bauset](https://bauset.es) now" -> "Visit https://bauset.es now"
 */
    function sanitizeTextFromMarkdownLinks(text?: string): string {
        if (!text) return ''
        return text.replace(/\[.*?\]\((https?:\/\/.*?)\)/g, '$1')
    }

    /** Extract a short subtitle (first sentence, max ~20 words) from a long description. */
    function deriveSubtitleFromDescription(description: string): string | undefined {
        if (!description) return undefined
        const firstSentence = description.split(/[.!?]\s/)[0]?.trim()
        if (!firstSentence) return undefined
        const words = firstSentence.split(/\s+/)
        return words.length > 20 ? words.slice(0, 20).join(' ') + '...' : firstSentence
    }

    function replaceUrlsWithBrand(text: string, brandUrl?: string): string {
        if (!brandUrl) return text
        const trimmed = brandUrl.trim()
        if (!trimmed) return text
        return text.replace(/https?:\/\/[^\s)]+|www\.[^\s)]+/gi, trimmed)
    }

    function normalizeSmartQuotes(raw: string): string {
        return raw
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/\u00A0/g, ' ')
    }

    function stripTrailingCommas(raw: string): string {
        return raw.replace(/,\s*([}\]])/g, '$1')
    }

    function normalizeSingleQuotedStrings(raw: string): string {
        let result = ''
        let inDouble = false
        let inSingle = false
        let escape = false

        for (let i = 0; i < raw.length; i++) {
            const ch = raw[i]

            if (inSingle) {
                if (escape) {
                    escape = false
                    result += ch
                    continue
                }
                if (ch === '\\') {
                    escape = true
                    result += ch
                    continue
                }
                if (ch === "'") {
                    inSingle = false
                    result += '"'
                    continue
                }
                result += ch
                continue
            }

            if (inDouble) {
                result += ch
                if (escape) {
                    escape = false
                } else if (ch === '\\') {
                    escape = true
                } else if (ch === '"') {
                    inDouble = false
                }
                continue
            }

            if (ch === "'") {
                inSingle = true
                result += '"'
                continue
            }

            if (ch === '"') {
                inDouble = true
                result += ch
                continue
            }

            result += ch
        }

        return result
    }

    function escapeNewlinesInStrings(raw: string): string {
        let result = ''
        let inString = false
        let escape = false

        for (let i = 0; i < raw.length; i++) {
            const ch = raw[i]

            if (inString) {
                if (ch === '\n') {
                    result += '\\n'
                    continue
                }
                if (ch === '\r') {
                    continue
                }
                result += ch
                if (escape) {
                    escape = false
                } else if (ch === '\\') {
                    escape = true
                } else if (ch === '"') {
                    inString = false
                }
                continue
            }

            if (ch === '"') {
                inString = true
                result += ch
                continue
            }

            result += ch
        }

        return result
    }

    /**
     * Best-effort JSON repair for common LLM formatting failures.
     * Only quotes plain unquoted values after ":" while preserving valid JSON tokens.
     */
    function repairJsonString(raw: string): string {
        let normalized = normalizeSmartQuotes(raw)
        normalized = normalizeSingleQuotedStrings(normalized)
        normalized = escapeNewlinesInStrings(normalized)
        normalized = stripTrailingCommas(normalized)

        let result = ''
        let inString = false
        let escape = false
        let expectingValue = false

        for (let i = 0; i < normalized.length; i++) {
            const ch = normalized[i]

            if (inString) {
                result += ch
                if (escape) {
                    escape = false
                } else if (ch === '\\') {
                    escape = true
                } else if (ch === '"') {
                    inString = false
                }
                continue
            }

            if (ch === '"') {
                inString = true
                result += ch
                continue
            }

            if (expectingValue) {
                if (/\s/.test(ch)) {
                    result += ch
                    continue
                }

                if (ch === '{' || ch === '[' || ch === '-' || /[0-9]/.test(ch)) {
                    expectingValue = false
                    result += ch
                    continue
                }

                if (ch === 't' || ch === 'f' || ch === 'n') {
                    expectingValue = false
                    result += ch
                    continue
                }

                const start = i
                let end = i
                for (; end < normalized.length; end++) {
                    const current = normalized[end]
                    if (current === ',' || current === '}' || current === ']') {
                        break
                    }
                }

                const rawValue = normalized.slice(start, end).trim()
                const escaped = rawValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
                result += `"${escaped}"`
                expectingValue = false
                i = end - 1
                continue
            }

            if (ch === ':') {
                expectingValue = true
                result += ch
                continue
            }

            result += ch
        }

        return result
    }

    function extractBalancedBlock(input: string, startIdx: number, openChar: '{' | '[', closeChar: '}' | ']'): string | null {
        if (startIdx < 0 || startIdx >= input.length || input[startIdx] !== openChar) return null
        let depth = 0
        let inStr = false
        let esc = false
        for (let i = startIdx; i < input.length; i++) {
            const ch = input[i]
            if (inStr) {
                if (esc) {
                    esc = false
                } else if (ch === '\\') {
                    esc = true
                } else if (ch === '"') {
                    inStr = false
                }
                continue
            }
            if (ch === '"') {
                inStr = true
                continue
            }
            if (ch === openChar) depth++
            if (ch === closeChar) depth--
            if (depth === 0) {
                return input.slice(startIdx, i + 1)
            }
        }
        return null
    }

    function normalizeJsonLikeText(raw: string): string {
        return raw
            .replace(/^\uFEFF/, '')
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/,\s*([}\]])/g, '$1')
            .trim()
    }

    /**
     * Extracts JSON content from a response string (handles code fences and loose outputs).
     */
    function extractJsonFromResponse(text: string): string | null {
        if (!text || !text.trim()) return null
        const normalized = normalizeJsonLikeText(text)

        const fenced = normalized.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
        if (fenced?.[1]) {
            return normalizeJsonLikeText(fenced[1])
        }

        const openFence = normalized.match(/```(?:json)?\s*([\s\S]*)$/i)
        if (openFence?.[1]) {
            const fencedTail = normalizeJsonLikeText(openFence[1])
            if (fencedTail.startsWith('{') || fencedTail.startsWith('[')) {
                return fencedTail
            }
        }

        const firstObjectIdx = normalized.indexOf('{')
        if (firstObjectIdx !== -1) {
            const objectBlock = extractBalancedBlock(normalized, firstObjectIdx, '{', '}')
            if (objectBlock) {
                return normalizeJsonLikeText(objectBlock)
            }
        }

        const slidesKeyMatch = normalized.match(/"?slides"?\s*:\s*\[/i)
        if (slidesKeyMatch?.index !== undefined) {
            const arrayStart = normalized.indexOf('[', slidesKeyMatch.index)
            if (arrayStart !== -1) {
                const slidesArray = extractBalancedBlock(normalized, arrayStart, '[', ']')
                if (slidesArray) {
                    return normalizeJsonLikeText(`{"slides": ${slidesArray}}`)
                }
            }
        }

        const firstArrayIdx = normalized.indexOf('[')
        if (firstArrayIdx !== -1) {
            const arrayBlock = extractBalancedBlock(normalized, firstArrayIdx, '[', ']')
            if (arrayBlock) {
                const candidate = normalizeJsonLikeText(arrayBlock)
                if (/\{[\s\S]*\}/.test(candidate)) {
                    return `{"slides": ${candidate}}`
                }
            }
        }

        if (normalized.startsWith('{') || normalized.startsWith('[')) {
            return normalized
        }

        return null
    }

    /**
     * Extracts a clean URL from potential Markdown or dirty strings.
     */
const normalizeParsed = (parsed: any) => {
        let caption = typeof parsed.caption === 'string' ? parsed.caption.trim() : ''
        if (!caption) {
            throw new Error('Missing caption')
        }
        const resolvedStructure = resolveStructureFromParsed(parsed.structure, parsed.detectedIntent)
        caption = replaceUrlsWithBrand(sanitizeTextFromMarkdownLinks(caption), brand.url)

        if (options?.captionOnly) {
            return {
                slides: [],
                hook: typeof parsed.hook === 'string' ? parsed.hook : undefined,
                structure: resolvedStructure ? { id: resolvedStructure.id, name: resolvedStructure.name } : undefined,
                optimalSlideCount: requested,
                detectedIntent: typeof parsed.detectedIntent === 'string' ? parsed.detectedIntent : undefined,
                caption
            }
        }

        const parsedSlides = Array.isArray(parsed.slides) ? parsed.slides : null
        if (!parsedSlides) {
            throw new Error(`Slide count mismatch: expected ${requested}, got 0`)
        }
        const roleByIndex = (idx: number): 'hook' | 'content' | 'cta' => {
            if (requested === 1) return 'hook'
            if (idx === 0) return 'hook'
            if (idx === requested - 1) return 'cta'
            return 'content'
        }

        const coerceSlidesToRequested = (source: unknown[]): unknown[] => {
            if (source.length === requested) return source
            if (source.length > requested) {
                const buildNarrativeSlice = (items: unknown[]) => {
                    if (requested <= 1) return [items[0]]
                    if (requested === 2) return [items[0], items[items.length - 1]]
                    const first = items[0]
                    const last = items[items.length - 1]
                    const middle = items.slice(1, -1)
                    const neededMiddle = requested - 2
                    if (middle.length <= neededMiddle) {
                        return [first, ...middle, last]
                    }
                    const picked: unknown[] = []
                    for (let i = 0; i < neededMiddle; i++) {
                        const pos = Math.floor((i * middle.length) / neededMiddle)
                        picked.push(middle[Math.min(pos, middle.length - 1)])
                    }
                    return [first, ...picked, last]
                }
                log.warn('FLOW', 'El modelo devolvió más slides; se conserva hook+cta y se muestrea el contenido intermedio', {
                    flow: shortFlowId(auditFlowTag),
                    esperadas: requested,
                    recibidas: source.length,
                })
                return buildNarrativeSlice(source)
            }
            const next = [...source]
            log.warn('FLOW', `Carousel parser incompleto: expected=${requested}, got=${source.length}. Rellenando faltantes.`)
            while (next.length < requested) {
                const idx = next.length
                const fallbackRole = roleByIndex(idx)
                next.push({
                    index: idx,
                    role: fallbackRole,
                    title: fallbackRole === 'hook'
                        ? 'Descubre esta idea'
                        : fallbackRole === 'cta'
                            ? 'Da el siguiente paso'
                            : `Punto clave ${idx + 1}`,
                    description: fallbackRole === 'cta'
                        ? (brand.url?.trim()
                            ? `Visita ${brand.url?.trim()} y empieza hoy.`
                            : 'Escríbenos y empecemos hoy mismo.')
                        : 'Contenido principal del carrusel.',
                    visualPrompt: `Representa visualmente esta idea del carrusel: ${prompt}`,
                })
            }
            return next
        }

        const rawSlides =
            requested === 1 && parsedSlides.length > 1
                ? [parsedSlides[0]]
                : coerceSlidesToRequested(parsedSlides)

        let slides: SlideContent[] = rawSlides.map((raw: any, i: number) => {
            const fallbackRole = roleByIndex(i)
            const safeRole = normalizeRole(raw?.role) || fallbackRole
            const rawHeadline = sanitizeTextFromMarkdownLinks(typeof raw?.headline === 'string' ? raw.headline.trim() : '')
            // Discard headlines that are just role labels instead of real copy
            const roleLabels = /^(gancho\s*emocional|hook|contenido|content|cta|cierre|portada|inicio|desarrollo|conclusi[oó]n|accion|acci[oó]n|llamada\s*a\s*la\s*acci[oó]n)$/i
            const safeHeadline = roleLabels.test(rawHeadline.trim()) ? '' : rawHeadline
            const rawSubtitle = sanitizeTextFromMarkdownLinks(typeof raw?.subtitle === 'string' ? raw.subtitle.trim() : '')
            const safeTitle = sanitizeTextFromMarkdownLinks(typeof raw?.title === 'string' ? raw.title.trim() : '')
            const safeDescription = sanitizeTextFromMarkdownLinks(typeof raw?.description === 'string' ? raw.description.trim() : '')
            const safeVisualPrompt = typeof raw?.visualPrompt === 'string' ? raw.visualPrompt.trim() : ''
            const resolvedTitle = safeTitle || (safeRole === 'hook'
                ? 'Descubre esta idea'
                : safeRole === 'cta'
                    ? 'Da el siguiente paso'
                    : `Punto clave ${i + 1}`)
            const resolvedDescription = safeDescription || (safeRole === 'cta'
                ? (brand.url?.trim()
                    ? `Visita ${brand.url?.trim()} y empieza hoy.`
                    : 'Escríbenos y empecemos hoy mismo.')
                : 'Contenido principal del carrusel.')
            return {
                index: i,
                headline: safeHeadline || undefined,
                subtitle: rawSubtitle || deriveSubtitleFromDescription(resolvedDescription),
                title: resolvedTitle,
                description: resolvedDescription,
                visualPrompt: enforceVisualPromptLanguage(
                    safeVisualPrompt,
                    detectedLanguage,
                    resolvedTitle,
                    resolvedDescription,
                    prompt
                ),
                composition: typeof raw?.composition === 'string' ? raw.composition.trim() : undefined,
                focus: typeof raw?.focus === 'string' ? raw.focus.trim() : undefined,
                role: safeRole
            }
        })

        slides = distributePromptDetailsAcrossSlides(slides, promptDetails, writingMode)

        // Validate required fields
        const hasMissing = slides.some((s: SlideContent) => !s.title || !s.description || !s.visualPrompt || !s.role)
        if (hasMissing) {
            throw new Error('Missing required fields in one or more slides')
        }

        // Reindex and normalize order deterministically to avoid brittle model indexing.
        slides = slides.map((slide, index) => ({ ...slide, index }))

        const lastIndex = requested - 1

        // Force stable role schema instead of failing hard on model inconsistencies.
        if (requested > 1) {
            slides = slides.map((slide, index) => ({
                ...slide,
                role: index === 0 ? 'hook' : index === lastIndex ? 'cta' : 'content',
            }))
        }

        slides = enrichSlidesWithNarrativeVisualPrompts({
            slides,
            language: detectedLanguage,
            originalPrompt: normalizedRequest,
            writingMode,
            copyGoal: interpretedBrief?.copyGoal,
            audienceAngle: interpretedBrief?.audienceAngle,
            briefingSummary: interpretedBrief?.briefingSummary,
        })

        // Hook and CTA validations only for multi-slide carousels
        if (requested > 1) {
            const hookText = `${slides[0].title} ${slides[0].description}`
            if (hookForbiddenRegex.test(hookText)) {
                throw new Error('Hook slide contains content numbering; it must be a pure hook')
            }
            const ctaText = `${slides[lastIndex].title} ${slides[lastIndex].description}`
            const ctaTextNormalized = normalizeTextForMatching(ctaText)
            const hasCTAKeyword = ctaRequiredRegex.test(ctaTextNormalized)
            const hasUrl = urlRegex.test(ctaText)
            const hasContactHint = contactRegex.test(ctaTextNormalized)

            if (!hasCTAKeyword && !hasUrl && !hasContactHint) {
                const fallbackUrl = brand.url?.trim()
                const fallbackCTA = fallbackUrl
                    ? `Visita ${fallbackUrl} y empieza hoy.`
                    : 'Escríbenos y empecemos hoy mismo.'

                slides[lastIndex] = {
                    ...slides[lastIndex],
                    description: `${slides[lastIndex].description} ${fallbackCTA}`.trim()
                }
                log.warn('CAROUSEL', 'CTA missing explicit action; fallback CTA appended')
            }
        }

        return {
            slides,
            hook: typeof parsed.hook === 'string' ? parsed.hook : undefined,
            structure: resolvedStructure ? { id: resolvedStructure.id, name: resolvedStructure.name } : undefined,
            optimalSlideCount: requested,
            detectedIntent: typeof parsed.detectedIntent === 'string' ? parsed.detectedIntent : undefined,
            caption
        }
    }

    const normalizeSuggestion = (raw: any): CarouselSuggestion | null => {
        if (!raw || typeof raw !== 'object') return null
        const title = typeof raw.title === 'string' ? raw.title.trim() : ''
        const subtitle = typeof raw.subtitle === 'string' ? raw.subtitle.trim() : ''
        if (!title || !subtitle) return null
        const normalized = normalizeParsed(raw)
        return {
            title,
            subtitle,
            slides: normalized.slides,
            hook: normalized.hook,
            structure: normalized.structure,
            optimalSlideCount: normalized.optimalSlideCount,
            detectedIntent: normalized.detectedIntent,
            caption: normalized.caption
        }
    }

    try {
        for (let attempt = 0; attempt < 3; attempt++) {
            const promptToUse = attempt === 0
                ? decompositionPrompt
                : attempt === 1
                    ? `${decompositionPrompt}\n\nREINTENTO: Devuelve EXACTAMENTE ${requested} slides validos. La slide final debe contener un CTA con verbo de accion claro (ej: inscribete, visita, escribenos) y URL si existe. Si fallas, responde con ERROR.`
                    : `${decompositionPrompt}\n\nULTIMO REINTENTO CRITICO: Responde SOLO JSON VALIDO. Sin markdown, sin texto extra, sin explicaciones. Debe empezar por '{' y terminar por '}'. Incluye SIEMPRE { "slides": [...], "caption": "...", "structure": {...}, "detectedIntent": "..." }. Si no puedes, responde exactamente: ERROR`

            const response = await generateTextUnified(
                brandWrapper,
                promptToUse,
                model,
                undefined,
                ''
            )
            const basePhase = options?.captionOnly ? 'carousel_caption_regeneration' : 'carousel_script_decomposition'
            const phase = attempt === 0 ? basePhase : `${basePhase}_retry`
            await logEconomicModelCall({
                audit: options?.audit,
                phase,
                model,
                kind: 'intelligence',
                metadata: {
                    attempt: attempt + 1,
                    requested_slides: requested,
                }
            })
            log.info('CAROUSEL', 'Respuesta del modelo recibida', {
                flow: shortFlowId(auditFlowTag),
                intento: `${attempt + 1}/3`,
            })

            if (/^\s*ERROR\b/i.test(response)) {
                throw new Error(response.trim())
            }

            // Extract JSON with robust parsing
            const jsonString = extractJsonFromResponse(response)
            if (!jsonString) {
                const preview = response.slice(0, 220).replace(/\s+/g, ' ')
                log.warn('CAROUSEL', 'No se pudo extraer JSON válido de la respuesta', {
                    flow: shortFlowId(auditFlowTag),
                    intento: `${attempt + 1}/3`,
                    preview,
                })
                if (attempt === 2) throw new Error('No valid JSON found in response')
                continue
            }
            let parsed: any

            try {
                // First try: direct parse
                parsed = JSON.parse(jsonString)
            } catch (firstError) {
                // Attempt repair for common AI mistakes (unquoted strings)
                try {
                    parsed = JSON.parse(repairJsonString(jsonString))
                } catch (repairError) {
                    log.warn('CAROUSEL', 'Falló el parseo JSON incluso tras intentar repararlo', {
                        flow: shortFlowId(auditFlowTag),
                        intento: `${attempt + 1}/3`,
                        fragmento: jsonString.substring(0, 200),
                    })
                    if (attempt === 2) throw new Error(`Invalid JSON from AI: ${(firstError as Error).message}`)
                    continue
                }
            }
            try {
                const normalized = normalizeParsed(parsed)
                const suggestions = Array.isArray(parsed?.suggestions)
                    ? parsed.suggestions.map(normalizeSuggestion).filter(Boolean) as CarouselSuggestion[]
                    : []
                log.success('CAROUSEL', 'Análisis del carrusel completado', {
                    flow: shortFlowId(auditFlowTag),
                    intento: `${attempt + 1}/3`,
                    slides: normalized.slides.length,
                    sugerencias: suggestions.length,
                })
                return {
                    ...normalized,
                    suggestions
                }
            } catch (err) {
                log.warn('CAROUSEL', 'La respuesta no cumple el formato esperado del carrusel', {
                    flow: shortFlowId(auditFlowTag),
                    intento: `${attempt + 1}/3`,
                })
                log.debug('CAROUSEL', 'Detalle técnico de normalización', err)
                if (attempt === 2) throw err
                continue
            }
        }

        throw new Error('Failed to generate a valid slide script')

    } catch (error) {
        log.error('CAROUSEL', 'Análisis del carrusel fallido', {
            flow: shortFlowId(auditFlowTag),
            motivo: error instanceof Error ? error.message : String(error),
        })
        throw error
    }
}

/**
 * Generate a single slide image with brand context
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function isTransientImageGenerationError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error || '')
    const normalized = message.toLowerCase()
    return [
        'system busy',
        'try again later',
        'request id',
        'temporarily unavailable',
        'rate limit',
        'too many requests',
        '429'
    ].some(token => normalized.includes(token))
}

async function generateContentImageWithRetry(
    brandWrapper: { name: string; brand_dna: BrandDNA },
    fullPrompt: string,
    options: {
        aspectRatio: string
        model: string
        context: Array<{ type: string; value: string; label?: string; weight?: number }>
        seed?: number
        selectedColors?: { color: string; role: string }[]
    },
    audit?: {
        context?: EconomicAuditContext
        phase?: string
        slideIndex?: number
    }
): Promise<string> {
    const maxAttempts = 3
    let lastError: unknown = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const imageUrl = await generateContentImageUnified(brandWrapper, fullPrompt, options)
            const basePhase = audit?.phase || 'carousel_slide_image_generation'
            const phase = attempt === 1 ? basePhase : `${basePhase}_retry`
            await logEconomicModelCall({
                audit: audit?.context,
                phase,
                model: options.model,
                kind: 'image',
                metadata: {
                    slide_index: audit?.slideIndex,
                    attempt,
                    status: 'success',
                }
            })
            return imageUrl
        } catch (error) {
            lastError = error
            const basePhase = audit?.phase || 'carousel_slide_image_generation'
            const phase = attempt === 1 ? basePhase : `${basePhase}_retry`
            await logEconomicModelCall({
                audit: audit?.context,
                phase,
                model: options.model,
                kind: 'image',
                metadata: {
                    slide_index: audit?.slideIndex,
                    attempt,
                    status: 'error',
                    error: error instanceof Error ? error.message : String(error),
                }
            })
            const shouldRetry = isTransientImageGenerationError(error) && attempt < maxAttempts
            if (!shouldRetry) {
                throw error
            }
            const waitMs = Math.min(5000, 900 * Math.pow(2, attempt - 1))
            await sleep(waitMs)
        }
    }

    throw lastError instanceof Error ? lastError : new Error('Image generation failed after retries')
}

async function generateSlideImage(
    slideContent: SlideContent,
    totalSlides: number,
    aspectRatio: string,
    brand: BrandDNA,
    model: string,
    sourcePrompt: string,
    selectedColors?: string[] | { color: string; role: string }[],
    selectedLogoUrl?: string,
    selectedReferenceImages?: Array<{ url: string; role: ReferenceImageRole }>,
    selectedImageUrls?: string[],
    aiImageDescription?: string,
    applyStyleToTypography?: boolean,
    ctaUrlEnabled?: boolean,
    ctaUrl?: string,
    contactLines?: string[],
    compositionId?: string,
    structureId?: string,
    consistencyRefUrls?: string[],
    catalog?: CarouselCatalog,
    audit?: {
        context?: EconomicAuditContext
        phase?: string
    }
): Promise<{ imageUrl: string; prompt: string; references: DebugImageReference[] }> {
    const specificCompId = normalizeCompositionId(compositionId) || normalizeCompositionId(slideContent.composition)
    const availableComps = catalog ? getCompositionsForStructure(catalog.compositions, structureId) : []
    const composition = (structureId && specificCompId && catalog)
        ? getCompositionById(availableComps, specificCompId)
        : undefined
    const resolvedComposition = composition || {
        layoutPrompt: "Standard clean social media composition with clear text area.",
        name: "Free Layout"
    }

    const findColorsByRole = (role: string, fallback: string) => {
        if (!selectedColors || selectedColors.length === 0) return [fallback]
        const palette = selectedColors as Array<{ color?: string; role?: string } | string>
        const fromRole = palette
            .filter((entry): entry is { color?: string; role?: string } => typeof entry !== 'string')
            .filter((entry) => entry?.role === role)
            .map((entry) => (entry?.color || '').trim())
            .filter(Boolean)
        if (fromRole.length === 0) return [fallback]
        return Array.from(new Set(fromRole))
    }

    const brandColors = {
        background: findColorsByRole('Fondo', '#141210'),
        accent: findColorsByRole('Acento', '#F0E500'),
        text: findColorsByRole('Texto', '#FFFFFF')
    }

    const isLastSlide = slideContent.index === totalSlides - 1
    const urlPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.(?:com|es|org|net|io|co)[^\s]*)/i
    const extractedUrl = slideContent.description?.match(urlPattern)?.[0]
    const brandUrl = brand.url?.trim()
    const finalUrl = ctaUrlEnabled
        ? (ctaUrl?.trim() || brandUrl || extractedUrl)
        : undefined

    const moodCurve = 'problem-solution'
    const currentMood = getMoodForSlide(slideContent.index, totalSlides, slideContent.role, moodCurve)
    const manualReferences = normalizeCarouselReferenceInputs(selectedReferenceImages, selectedImageUrls)
    const auxiliaryLogoReferences = manualReferences.filter((reference) => reference.role === 'logo')

    const fullPrompt = buildFinalPrompt({
        composition: resolvedComposition as any,
        brandColors,
        slideData: slideContent,
        currentMood,
        currentSlide: slideContent.index + 1,
        totalSlides,
        logoPosition: extractLogoPosition(resolvedComposition?.layoutPrompt || ''),
        includeLogo: Boolean(selectedLogoUrl),
        includeAuxiliaryLogos: Boolean(selectedLogoUrl) && auxiliaryLogoReferences.length > 0,
        auxiliaryLogoCount: auxiliaryLogoReferences.length,
        isSequentialSlide: slideContent.index > 0,
        ctaText: isLastSlide ? (slideContent.title || 'Mas info') : undefined,
        ctaUrl: isLastSlide ? finalUrl : undefined,
        contactLines: isLastSlide ? contactLines : undefined,
        visualAnalysis: aiImageDescription,
        language: await resolveGenerationLanguage({
            promptParts: [
                sourcePrompt,
                slideContent.title,
                slideContent.description,
                slideContent.visualPrompt
            ],
            fallback: 'es',
        }),
        fonts: brand.fonts,
        applyStyleToTypography
    })

    const brandWrapper = { name: brand.brand_name, brand_dna: brand }

    // Build context array for reference images
    // NOTE: We intentionally avoid passing reference images to prevent literal copying.
    const context: Array<{ type: string; value: string; label?: string; weight?: number }> = []
    const hasConsistencyRef = Boolean(consistencyRefUrls?.length)
    if (manualReferences.length > 0) {
        let auxLogoCount = 0
        let styleRefCount = 0
        let contentRefCount = 0
        manualReferences.forEach((reference) => {
            if (reference.role === 'logo') {
                if (!selectedLogoUrl) return
                auxLogoCount += 1
                context.push({
                    type: 'aux_logo',
                    value: reference.url,
                    label: `Aux Logo ${auxLogoCount} (only with primary logo, secondary prominence)`,
                    weight: getCarouselReferenceWeight(reference.role, hasConsistencyRef)
                })
                return
            }

            const isStyleRef = reference.role === 'style' || reference.role === 'style_content'
            if (isStyleRef) styleRefCount += 1
            else contentRefCount += 1

            context.push({
                type: 'image',
                value: reference.url,
                label: isStyleRef
                    ? `Style Reference ${styleRefCount}${hasConsistencyRef ? ' (style support only)' : ''}`
                    : `Reference Image ${contentRefCount}${hasConsistencyRef ? ' (style support only)' : ''}`,
                weight: getCarouselReferenceWeight(reference.role, hasConsistencyRef)
            })
        })
    }
    if (consistencyRefUrls && consistencyRefUrls.length > 0) {
        consistencyRefUrls.forEach((url, idx) => {
            context.push({
                type: 'image',
                value: url,
                label: idx === 0 ? 'Master Layout (Slide 1)' : `Continuity (Previous Slide ${idx})`,
                weight: idx === 0 ? 1.0 : 0.55
            })
        })
    }
    if (selectedLogoUrl) {
        context.push({ type: 'logo', value: selectedLogoUrl, label: 'Logo', weight: 1.0 })
    }

    const imageUrl = await generateContentImageWithRetry(brandWrapper, fullPrompt, {
        aspectRatio,
        model,
        context
    }, {
        context: audit?.context,
        phase: audit?.phase || 'carousel_slide_regeneration',
        slideIndex: slideContent.index,
    })

    const references: DebugImageReference[] = context.map(ref => ({
        type: ref.type,
        label: ref.label,
        url: ref.value
    }))

    return { imageUrl, prompt: fullPrompt, references }
}

/**
 * Main carousel generation action
 */
export async function generateCarouselAction(
    input: GenerateCarouselInput
): Promise<GenerateCarouselResult> {
    const {
        prompt,
        slideCount,
        aspectRatio = '3:4',
        style = 'Moderno y minimalista',
        compositionId,
        structureId,
        brandDNA,
        intelligenceModel,
        imageModel,
        aiImageDescription,
        slideOverrides = [],
        slideScript,
        selectedLogoUrl,
        selectedColors,
        selectedReferenceImages,
        selectedImageUrls,
        includeLogoOnSlides
    } = input

    try {
        const catalog = await loadCarouselCatalog()
        const auditActor = await resolveEconomicAuditActor()
        const auditContext: EconomicAuditContext = {
            flowId: input.auditFlowId || createEconomicFlowId('carousel_generate'),
            ...auditActor,
        }
        log.info('CAROUSEL', `Generate start | brand=${brandDNA.brand_name} slides=${slideCount} flow=${auditContext.flowId}`)

        // Step 1: Decompose prompt (or reuse script)
        const canUseScript = Array.isArray(slideScript) && slideScript.length === slideCount
        log.info('CAROUSEL', `Generate script source | mode=${canUseScript ? 'provided_script' : 'ai_decomposition'}`)
        if (!canUseScript && !intelligenceModel) {
            throw new Error('Missing intelligence model configuration')
        }
        if (!imageModel) {
            throw new Error('Missing image model configuration')
        }

        const decomposition = canUseScript
            ? { slides: slideScript }
            : await decomposeIntoSlides(
                prompt,
                slideCount,
                brandDNA,
                intelligenceModel as string,
                selectedColors,
                selectedLogoUrl,
                catalog,
                {
                    structureId,
                    compositionId,
                    visualDescription: aiImageDescription,
                    language: input.language,
                    audit: auditContext,
                }
            )
        const slideContents = decomposition.slides
        const effectiveSlideCount = Math.max(1, Math.min(15, slideCount || 5))

        // Apply overrides
        slideOverrides.forEach(override => {
            if (slideContents[override.index]) {
                slideContents[override.index].visualPrompt = override.text
                slideContents[override.index].description = override.text
            }
        })

        // Step 2: Generate images
        const slides: CarouselSlide[] = slideContents.slice(0, effectiveSlideCount).map(sc => ({
            index: sc.index,
            headline: sc.headline,
            subtitle: sc.subtitle,
            title: sc.title,
            description: sc.description,
            status: 'pending' as const
        }))

        // CHAIN OF THOUGHT & IMAGE GENERATION LOOP (5-RULE SYSTEM)
        const generatedImageUrls: string[] = []

        // Rule 4: Generate a consistent seed for this carousel
        const carouselSeed = generateCarouselSeed()
        log.info('CAROUSEL', `Generate seed | ${carouselSeed}`)

        for (let i = 0; i < slides.length; i++) {
            const currentSlide = slides[i]
            log.info('CAROUSEL', `Generate slide start | flow=${auditContext.flowId} slide=${i + 1}/${effectiveSlideCount}`)
            currentSlide.status = 'generating'

            try {
                // Rule 2: Determine Dynamic Mood from MOOD_MAP
                const moodCurve = 'problem-solution' // Could be mapped from structureId in future
                const currentMood = getMoodForSlide(i, effectiveSlideCount, slideContents[i].role, moodCurve)

                // Resolve Composition (Specific or Default/Free)
                const specificCompId = normalizeCompositionId(compositionId) || normalizeCompositionId(slideContents[i].composition)
                const availableComps = getCompositionsForStructure(catalog.compositions, input.structureId)
                const composition = (input.structureId && specificCompId)
                    ? getCompositionById(availableComps, specificCompId)
                    : undefined
                const resolvedComposition = composition || {
                    layoutPrompt: "Standard clean social media composition with clear text area.",
                    name: "Free Layout"
                }

                // Rule 3: Build Brand Colors object from user selection accurately by Role
                const findColorsByRole = (role: string, fallback: string) => {
                    const palette = (selectedColors || []) as Array<{ color?: string; role?: string }>
                    const fromRole = palette
                        .filter((entry) => entry?.role === role)
                        .map((entry) => (entry?.color || '').trim())
                        .filter(Boolean)
                    if (fromRole.length === 0) return [fallback]
                    return Array.from(new Set(fromRole))
                }

                const brandColors = {
                    background: findColorsByRole('Fondo', '#141210'),
                    accent: findColorsByRole('Acento', '#F0E500'),
                    text: findColorsByRole('Texto', '#FFFFFF')
                }

                // Rule 1 + 2 + 3: Build Final Prompt (Token Cleanup, Mood, Color Injection)
                // Extract CTA text/URL for final slide
                const isLastSlide = i === effectiveSlideCount - 1
                const slideContent = slideContents[i]

                // Try to extract a URL pattern from the slide description (e.g., "bauset.es" or "https://...")
                const urlPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.(?:com|es|org|net|io|co)[^\s]*)/i
                const urlMatch = slideContent.description?.match(urlPattern)
                const extractedUrl = urlMatch ? urlMatch[0] : undefined
                const brandUrl = brandDNA.url?.trim()
                const finalUrl = input.ctaUrlEnabled
                    ? (input.ctaUrl?.trim() || brandUrl || extractedUrl)
                    : undefined
                const includePrimaryLogo = shouldApplyPrimaryLogoToSlide(
                    selectedLogoUrl,
                    includeLogoOnSlides,
                    i,
                    effectiveSlideCount
                )
                const manualReferences = normalizeCarouselReferenceInputs(selectedReferenceImages, selectedImageUrls)
                const auxiliaryLogoCount = manualReferences.filter((reference) => reference.role === 'logo').length

                const promptToUse = buildFinalPrompt({
                    composition: resolvedComposition as any,
                    brandColors,
                    slideData: slideContents[i],
                    currentMood,
                    currentSlide: i + 1,
                    totalSlides: effectiveSlideCount,
                    logoPosition: extractLogoPosition(resolvedComposition?.layoutPrompt || ''),
                    includeLogo: includePrimaryLogo,
                    includeAuxiliaryLogos: includePrimaryLogo && auxiliaryLogoCount > 0,
                    auxiliaryLogoCount,
                    isSequentialSlide: i > 0, // true for slides 2-5
                    // CTA for final slide only
                    ctaText: isLastSlide ? (slideContent.title || 'Más info') : undefined,
                    ctaUrl: isLastSlide ? finalUrl : undefined,
                    contactLines: isLastSlide ? input.finalContactLines : undefined,
                    visualAnalysis: aiImageDescription,
                    language: await resolveGenerationLanguage({
                        promptParts: [
                            prompt,
                            slideContent.title,
                            slideContent.description,
                            slideContent.visualPrompt
                        ],
                        fallback: input.language || 'es',
                    }),
                    fonts: brandDNA.fonts
                })

                // Rule 4: Reference Chain Logic
                const contextReferences: Array<{ type: string; value: string; label?: string; weight?: number }> = []

                // A. Reference images (style/layout guidance)
                const hasMasterLayoutRef = generatedImageUrls.length > 0 && Boolean(generatedImageUrls[0])
                if (manualReferences.length > 0) {
                    let auxLogoCount = 0
                    let styleRefCount = 0
                    let contentRefCount = 0
                    manualReferences.forEach((reference) => {
                        if (reference.role === 'logo') {
                            if (!includePrimaryLogo || !selectedLogoUrl) return
                            auxLogoCount += 1
                            contextReferences.push({
                                type: 'aux_logo',
                                value: reference.url,
                                label: `Aux Logo ${auxLogoCount} (only with primary logo, secondary prominence)`,
                                weight: getCarouselReferenceWeight(reference.role, hasMasterLayoutRef)
                            })
                            return
                        }

                        const isStyleRef = reference.role === 'style' || reference.role === 'style_content'
                        if (isStyleRef) styleRefCount += 1
                        else contentRefCount += 1

                        contextReferences.push({
                            type: 'image',
                            value: reference.url,
                            label: isStyleRef
                                ? `Style Reference ${styleRefCount}${hasMasterLayoutRef ? ' (style support only)' : ''}`
                                : `Reference Image ${contentRefCount}${hasMasterLayoutRef ? ' (style support only)' : ''}`,
                            weight: getCarouselReferenceWeight(reference.role, hasMasterLayoutRef)
                        })
                    })
                }

                // B. Consistency reference (generated slide 1)
                const consistencyRefUrls: string[] = []
                if (generatedImageUrls.length > 0 && generatedImageUrls[0]) {
                    consistencyRefUrls.push(generatedImageUrls[0])
                }
                const previousSlideUrl = i > 0 ? generatedImageUrls[i - 1] : undefined
                if (previousSlideUrl) {
                    consistencyRefUrls.push(previousSlideUrl)
                }
                if (consistencyRefUrls && consistencyRefUrls.length > 0) {
                    consistencyRefUrls.forEach((url, idx) => {
                        if (!url) return
                        contextReferences.push({
                            type: 'image',
                            value: url,
                            label: idx === 0 ? 'Master Layout (Slide 1)' : `Continuity (Previous Slide ${idx})`,
                            weight: idx === 0 ? 1.0 : 0.55
                        })
                    })
                }

                // C. Logo (MAXIMUM priority - weight 1.0)
                if (includePrimaryLogo && selectedLogoUrl) {
                    contextReferences.push({ type: 'logo', value: selectedLogoUrl, weight: 1.0 })
                }

                log.debug('CAROUSEL', `Slide payload | flow=${auditContext.flowId} slide=${i + 1}/${effectiveSlideCount} model=${imageModel} refs=${contextReferences.length}`)

                // 5. Generate with seed
                const creditUserId = await ensureUserHasCreditsForCarouselImage()
                const imageUrl = await generateContentImageWithRetry(
                    { name: brandDNA.brand_name, brand_dna: brandDNA },
                    promptToUse,
                    {
                        aspectRatio,
                        model: imageModel,
                        context: contextReferences,
                        seed: carouselSeed, // Same seed for all slides
                        selectedColors
                    },
                    {
                        context: auditContext,
                        phase: 'carousel_slide_image_generation',
                        slideIndex: i,
                    }
                )

                await consumeCarouselImageCredit(creditUserId, {
                    action: 'carousel_slide_generation',
                    slideIndex: i,
                    totalSlides: effectiveSlideCount,
                    prompt: prompt.slice(0, 100),
                })

                currentSlide.imageUrl = imageUrl
                currentSlide.status = 'done'
                generatedImageUrls.push(imageUrl)
                log.success('CAROUSEL', `Generate slide done | flow=${auditContext.flowId} slide=${i + 1}/${effectiveSlideCount}`)

            } catch (error) {
                log.error('CAROUSEL', `Generate slide failed | flow=${auditContext.flowId} slide=${i + 1}/${effectiveSlideCount}`, error)
                currentSlide.status = 'error'
                currentSlide.error = error instanceof Error ? error.message : 'Error'
                generatedImageUrls.push('') // Push empty to keep index alignment
            }
        }

        log.success('CAROUSEL', `Generate done | flow=${auditContext.flowId} slides=${slides.length}`)
        return { success: true, slides }

    } catch (error) {
        log.error('CAROUSEL', 'Generate failed', error)
        return {
            success: false,
            slides: [],
            error: error instanceof Error ? error.message : 'Error'
        }
    }
}

/**
 * Analyze prompt and return the slide script (no images)
 */
export async function analyzeCarouselAction(
    input: AnalyzeCarouselInput
): Promise<AnalyzeCarouselResult> {
    const {
        prompt,
        slideCount,
        brandDNA,
        intelligenceModel,
        selectedColors,
        selectedLogoUrl
    } = input

    try {
        const catalog = await loadCarouselCatalog()
        const auditActor = await resolveEconomicAuditActor()
        const auditContext: EconomicAuditContext = {
            flowId: input.auditFlowId || createEconomicFlowId('carousel_analyze'),
            ...auditActor,
        }
        log.info('CAROUSEL', 'Solicitud de análisis recibida', {
            marca: brandDNA.brand_name,
            slides: slideCount,
            flow: shortFlowId(auditContext.flowId),
        })
        log.debug('CAROUSEL', 'Estado de referencia de estilo', {
            flow: shortFlowId(auditContext.flowId),
            referencia: input.aiImageDescription ? 'disponible' : 'vacía',
        })
        const decomposition = await decomposeIntoSlides(
            prompt,
            slideCount,
            brandDNA,
            intelligenceModel,
            selectedColors,
            selectedLogoUrl,
            catalog,
            {
                structureId: input.structureId,
                visualDescription: input.aiImageDescription,
                language: input.language,
                audit: auditContext,
            }
        )
        return {
            success: true,
            slides: decomposition.slides,
            hook: decomposition.hook,
            structure: decomposition.structure,
            optimalSlideCount: decomposition.optimalSlideCount,
            detectedIntent: decomposition.detectedIntent,
            caption: decomposition.caption,
            suggestions: decomposition.suggestions || []
        }
    } catch (error) {
        log.error('CAROUSEL', 'No se pudo completar el análisis del carrusel', {
            motivo: error instanceof Error ? error.message : String(error),
        })
        return {
            success: false,
            slides: [],
            error: error instanceof Error ? error.message : 'Error'
        }
    }
}

/**
 * Regenerate caption only (uses same lazy prompt but skips slide validation)
 */
export async function regenerateCarouselCaptionAction(
    input: AnalyzeCarouselInput
): Promise<{ success: boolean; caption?: string; error?: string }> {
    const {
        prompt,
        slideCount,
        brandDNA,
        intelligenceModel,
        selectedColors,
        selectedLogoUrl
    } = input

    try {
        const catalog = await loadCarouselCatalog()
        const auditActor = await resolveEconomicAuditActor()
        const auditContext: EconomicAuditContext = {
            flowId: input.auditFlowId || createEconomicFlowId('carousel_caption'),
            ...auditActor,
        }
        const decomposition = await decomposeIntoSlides(
            prompt,
            slideCount,
            brandDNA,
            intelligenceModel,
            selectedColors,
            selectedLogoUrl,
            catalog,
            {
                captionOnly: true,
                structureId: input.structureId,
                visualDescription: input.aiImageDescription,
                language: input.language,
                audit: auditContext,
            }
        )
        return { success: true, caption: decomposition.caption }
    } catch (error) {
        log.error('CAROUSEL', 'Caption action failed', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error'
        }
    }
}

/**
 * Regenerate a single slide with brand context
 */
export async function regenerateSlideAction(
    slideIndex: number,
    slideContent: SlideContent,
    totalSlides: number,
    sourcePrompt: string,
    style: string,
    aspectRatio: string,
    brandDNA: BrandDNA,
    imageModel: string,
    selectedLogoUrl?: string,
    selectedColors?: { color: string; role: string }[],
    compositionId?: string,
    structureId?: string,
    aiImageDescription?: string,
    applyStyleToTypography?: boolean,
    ctaUrlEnabled?: boolean,
    ctaUrl?: string,
    contactLines?: string[],
    selectedReferenceImages?: Array<{ url: string; role: ReferenceImageRole }>,
    selectedImageUrls?: string[],
    consistencyRefUrls?: string[],
    auditFlowId?: string
): Promise<{ success: boolean; imageUrl?: string; error?: string; debugPrompt?: string; debugReferences?: DebugImageReference[] }> {
    try {
        const creditUserId = await ensureUserHasCreditsForCarouselImage()
        const catalog = await loadCarouselCatalog()
        const auditActor = await resolveEconomicAuditActor()
        const auditContext: EconomicAuditContext = {
            flowId: auditFlowId || createEconomicFlowId('carousel_regenerate'),
            ...auditActor,
        }
        log.info('CAROUSEL', `Regenerate slide request | brand=${brandDNA.brand_name} slide=${slideIndex + 1} flow=${auditContext.flowId}`)

        const { imageUrl, prompt, references } = await generateSlideImage(
            slideContent,
            totalSlides,
            aspectRatio,
            brandDNA,
            imageModel,
            sourcePrompt,
            selectedColors,
            selectedLogoUrl,
            selectedReferenceImages,
            selectedImageUrls,
            aiImageDescription,
            applyStyleToTypography,
            ctaUrlEnabled,
            ctaUrl,
            contactLines,
            compositionId,
            structureId,
            consistencyRefUrls,
            catalog,
            {
                context: auditContext,
                phase: 'carousel_slide_regeneration',
            }
        )

        await consumeCarouselImageCredit(creditUserId, {
            action: 'carousel_slide_regeneration',
            slideIndex,
            totalSlides,
            prompt: `${slideContent.title || ''} ${slideContent.description || ''}`.trim().slice(0, 100),
        })

        return { success: true, imageUrl, debugPrompt: prompt, debugReferences: references }

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error'
        }
    }
}


