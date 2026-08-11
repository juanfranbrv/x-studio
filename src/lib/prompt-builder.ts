import type { BrandDNA } from './brand-types'
import { IMAGE_GENERATION_BASE_PROMPT } from './prompts/image-generator-base'
import * as P11 from './prompts/priorities/p11-system-persona'
import { LAYOUTS_BY_INTENT, DEFAULT_LAYOUTS, LayoutOption, type SocialPlatform } from './creation-flow-types'
import { buildContextInstructions } from './prompts/image-generation/context-builder'
import { buildLayoutInstruction } from './prompts/image-generation/layout-rules'
import { buildTypographyInstructions } from './prompts/image-generation/typography-builder'

export interface ImageGenerationOptions {
    headline?: string
    cta?: string
    // Alineado con SocialPlatform: el catalogo de formatos ya incluye Facebook
    // y X, pero este tipo se habia quedado corto y los rechazaba.
    platform?: SocialPlatform
    context?: Array<{
        type: string
        value: string
        label?: string
        weight?: number // Added for sequential generation control
    }>
    model?: string
    layoutReference?: string // Path to Phantom Template
    aspectRatio?: string
    seed?: number // Consistent seed for carousel generation
    selectedColors?: Array<{ color: string; role: string } | string>
    promptAlreadyBuilt?: boolean
    nagaApiKey?: string
    replicateApiKey?: string
    atlasApiKey?: string
    selectedStyles?: string[]
    customStyle?: string
    applyStyleToTypography?: boolean
    styleAnalysisKeywords?: string[]
    styleAnalysisSubject?: string
}

export function buildImagePrompt(
    brand: { name: string; brand_dna: BrandDNA },
    userPrompt: string,
    options: ImageGenerationOptions = {}
): string {
    const { tone_of_voice, fonts } = brand.brand_dna
    const tone = tone_of_voice?.join(', ') || 'Sin definir'

    // Prioritize selected colors from the session card
    let colorList = 'Sin definir'
    if (options.selectedColors && options.selectedColors.length > 0) {
        colorList = options.selectedColors.map(c =>
            typeof c === 'string' ? c : `${c.color}${c.role ? ` (${c.role})` : ''}`
        ).join(', ')
    }

    const typographyInstructions = buildTypographyInstructions(fonts || [], {
        selectedStyles: options.selectedStyles,
        customStyle: options.customStyle,
        applyStyleToTypography: options.applyStyleToTypography,
        styleAnalysisKeywords: options.styleAnalysisKeywords,
        styleAnalysisSubject: options.styleAnalysisSubject,
    })

    // Process explicit context items (Drag & Drop)
    let contextInstructions = ''
    if (options.context && options.context.length > 0) {
        contextInstructions = buildContextInstructions(options.context)
    }

    // Special instruction for Phantom Templates
    let layoutReferencePart = ''
    if (options.layoutReference) {
        // Find the layout option to get its description
        const allLayouts = Object.values(LAYOUTS_BY_INTENT).flat()
        const selectedLayout = allLayouts.find(l => l?.referenceImage === options.layoutReference) ||
            DEFAULT_LAYOUTS.find(l => l.referenceImage === options.layoutReference)

        const description = selectedLayout?.referenceImageDescription || ''

        layoutReferencePart = buildLayoutInstruction(description)
    }

    // Determine aspect ratio/format context based on platform
    const platformContext = options.platform
        ? `FORMATO: Optimizado para ${options.platform}`
        : ''

    // The Final Prompt Construction
    // The Final Prompt Construction using the external template
    return IMAGE_GENERATION_BASE_PROMPT
        .replace('{{systemRole}}', P11.SYSTEM_PERSONA_INSTRUCTION)
        .replace('{{colorList}}', colorList)
        .replace('{{tone}}', tone)
        .replace('{{contextInstructions}}', contextInstructions)
        .replace('{{layoutReferencePart}}', layoutReferencePart)
        .replace('{{typographyInstructions}}', typographyInstructions)
        .replace('{{userPrompt}}', userPrompt)
}
