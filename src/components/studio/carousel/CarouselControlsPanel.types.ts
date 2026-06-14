import type { ReferenceImageRole, SelectedColor } from '@/lib/creation-flow-types'
import type { CarouselSuggestion, CarouselSlide, SlideContent } from '@/app/actions/generate-carousel'

export interface SlideConfig {
    index: number
    customText?: string
}

export interface CarouselSettings {
    prompt: string
    slideCount: number
    aspectRatio: '1:1' | '4:5' | '3:4'
    style: string
    slides: SlideConfig[]
    compositionId: string
    structureId: string
    imageSourceMode: 'upload' | 'brandkit' | 'generate'
    aiImageDescription?: string
    aiStyleDirectives?: string
    customStyleText?: string
    applyStyleToTypography?: boolean
    // Brand Kit Context
    selectedLogoUrl?: string
    selectedColors: { color: string; role: string }[]
    selectedReferenceImages: Array<{ url: string; role: ReferenceImageRole }>
    selectedImageUrls: string[]
    includeLogoOnSlides: boolean
    ctaUrlEnabled: boolean
    ctaUrl?: string
    selectedContactFields: Record<string, string>
    finalContactLines: string[]
}

export type BrandColorRole = 'Texto' | 'Fondo' | 'Acento'
export type DraggedBrandColor = { role: BrandColorRole; color: string } | null

export type CompositionMode = 'basic' | 'advanced'

export type DbStructure = {
    structure_id: string
    name: string
    summary: string
    order: number
}

export type DbComposition = {
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

export type UiStructure = {
    id: string
    name: string
    summary: string
    order: number
}

export type UiComposition = {
    id: string
    name: string
    description: string
    layoutPrompt: string
    icon?: string
    iconPrompt?: string
    scope: 'global' | 'narrative'
    mode: 'basic' | 'advanced'
    order: number
}

export type SessionDecisionButton = {
    id: string
    label: string
    variant?: 'default' | 'outline' | 'destructive'
}

export type SessionDecisionModalState = {
    open: boolean
    title: string
    description: string
    buttons: SessionDecisionButton[]
}

export type CarouselWorkspaceSnapshot = {
    version: number
    module: 'carousel'
    prompt: string
    slideCount: number
    aspectRatio: '1:1' | '4:5' | '3:4'
    style: string
    structureId: string
    compositionId: string
    compositionMode: CompositionMode
    basicSelectedCompositionId: string | null
    imageSourceMode: 'upload' | 'brandkit' | 'generate'
    aiImageDescription: string
    aiStyleDirectives: string
    customStyle: string
    applyStyleToTypography: boolean
    selectedStylePresetId: string | null
    selectedStylePresetName: string | null
    selectedLogoId: string | null
    selectedColors: SelectedColor[]
    selectedBrandKitImageIds: string[]
    referenceImageRoles: Record<string, ReferenceImageRole>
    uploadedImages: string[]
    includeLogoOnSlides: boolean
    ctaUrlEnabled: boolean
    ctaUrl: string
    selectedContactFields: Record<string, string>
    suggestions: CarouselSuggestion[]
    imagePromptSuggestions: string[]
    slideVariantSelection: string[]
    analysisHook?: string
    analysisStructure?: { id?: string; name?: string }
    analysisIntent?: string
    originalAnalysis?: {
        slides: CarouselSlide[]
        scriptSlides: SlideContent[]
        hook?: string
        structure?: { id?: string; name?: string }
        detectedIntent?: string
        caption?: string
    }
    previewState: {
        slides: CarouselSlide[]
        scriptSlides?: SlideContent[]
        caption?: string
        currentIndex?: number
        sessionHistory?: Array<{
            id: string
            createdAt: string
            slides: CarouselSlide[]
            caption?: string
        }>
    }
}
