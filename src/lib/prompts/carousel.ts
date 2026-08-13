import path from 'path'
import { readFileSync } from 'fs'
import { buildCarouselImagePrompt } from './carousel-image'
import {
    buildContextDocumentPromptBlock,
    type AnalyticalContextDocument,
} from './context-document'

interface CarouselDecompositionParams {
    brandContext: string
    topic: string
    brandWebsite?: string
    requestedSlideCount?: number
    visualAnalysis?: string
    language?: string
    factsToPreserve?: string[]
    writingMode?: 'structure' | 'expand'
    brandVoice?: string
    contextDocument?: AnalyticalContextDocument | null
}

const DECOMPOSITION_PROMPT_PATH = path.join(
    process.cwd(),
    'src',
    'lib',
    'prompts',
    'carousel',
    'lazy-carousel-parser.md'
)

let cachedDecompositionTemplate: string | null = null

function getDecompositionTemplate(): string {
    if (!cachedDecompositionTemplate) {
        cachedDecompositionTemplate = readFileSync(DECOMPOSITION_PROMPT_PATH, 'utf8')
    }
    return cachedDecompositionTemplate
}

export function buildCarouselDecompositionPrompt({
    brandContext,
    topic,
    brandWebsite,
    requestedSlideCount,
    visualAnalysis,
    language,
    factsToPreserve = [],
    writingMode = 'expand',
    brandVoice = '',
    contextDocument,
}: CarouselDecompositionParams): string {
    const websiteContext = brandWebsite ? `BRAND WEBSITE:\n${brandWebsite}` : 'BRAND WEBSITE: (none)'
    const requestedCount = typeof requestedSlideCount === 'number' ? String(requestedSlideCount) : 'N/A'
    const langInstructions = language
        ? `\nIDIOMA: Responde estrictamente en ${language}. TODOS los campos de salida, incluido "visualPrompt", deben estar en ${language}.`
        : ''

    const visualSection = visualAnalysis
        ? `\nVISUAL REFERENCE (PRIMARY SOURCE OF TRUTH):\n${visualAnalysis}\n\nCREATIVE DIRECTION: Use this entire visual description as your creative inspiration. The subject, lighting, keywords, colors, and medium described above define the aesthetic universe for this carousel. Each slide's "visualPrompt" must feel like it belongs to this same visual world: same style, same mood, same medium, same color palette. Do not invent a different aesthetic. IMPORTANT: write every "visualPrompt" in the same detected language as the user request, never in English unless the user wrote in English.`
        : ''
    const factsSection = factsToPreserve.length > 0
        ? `\nDETALLES DEL USUARIO QUE DEBES CONSERVAR DENTRO DEL GUION:\n${factsToPreserve.map((fact) => `- ${fact}`).join('\n')}\n\nEstos detalles son parte del briefing real del usuario. Deben sobrevivir en el guion narrativo y repartirse entre las ${requestedCount} slides cuando tenga sentido. No los conviertas en etiquetas tecnicas, no los reemplaces por ejemplos genericos y no los elimines por resumir demasiado. Si el usuario aporta varios detalles concretos, ajustalos al numero de diapositivas para que sigan presentes en el carrusel final.`
        : ''
    const writingModeSection = writingMode === 'structure'
        ? `\nMODO DE ESCRITURA: STRUCTURE\nEl usuario ya ha aportado contenido suficiente. Tu trabajo principal es estructurarlo, ordenarlo y mejorarlo para Instagram sin perder informacion importante.`
        : `\nMODO DE ESCRITURA: EXPAND\nEl usuario ha aportado una base breve o abierta. Puedes enriquecer el mensaje, ampliar beneficios, aportar contexto y construir una narrativa social-first mas desarrollada.`
    const brandVoiceSection = brandVoice ? `\nVOZ Y ENFOQUE DE MARCA:\n${brandVoice}` : ''

    const contextDocumentBlock = buildContextDocumentPromptBlock(contextDocument)
    const analyticalBrandContext = contextDocumentBlock
        ? `${brandContext}\n\n${contextDocumentBlock}`
        : brandContext

    return getDecompositionTemplate()
        .replaceAll('{{BRAND_CONTEXT}}', analyticalBrandContext)
        .replaceAll('{{WEBSITE_CONTEXT}}', websiteContext)
        .replaceAll('{{USER_REQUEST}}', topic)
        .replaceAll('{{REQUESTED_SLIDE_COUNT}}', requestedCount)
        .replaceAll('{{VISUAL_ANALYSIS}}', `${visualSection}${factsSection}`)
        .replaceAll('{{LANGUAGE}}', langInstructions)
        .replaceAll('{{WRITING_MODE}}', writingModeSection)
        .replaceAll('{{BRAND_VOICE}}', brandVoiceSection)
}

export { buildCarouselImagePrompt }
