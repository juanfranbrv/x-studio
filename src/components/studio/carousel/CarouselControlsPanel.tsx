'use client'

import { Loader2 } from '@/components/ui/spinner'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { IconPlus, IconIdea, IconLayers, IconImageAdd, IconFingerprint, IconRotate, IconAlertCircle, IconClose, IconPaintbrush02, IconWand, IconImage } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import type { BrandDNA } from '@/lib/brand-types'
import type { CarouselSuggestion, CarouselSlide, SlideContent } from '@/app/actions/generate-carousel'
import { ContentImageCard } from '@/components/studio/creation-flow/ContentImageCard'
import { StyleImageCard } from '@/components/studio/creation-flow/StyleImageCard'
import { AuxiliaryLogosCard } from '@/components/studio/creation-flow/AuxiliaryLogosCard'
import { resizeImage } from '@/lib/image-utils'
import { BrandingConfigurator } from '@/components/studio/creation-flow/BrandingConfigurator'
import {
    localizeCarouselCompositionDescription,
    localizeCarouselCompositionName,
    localizeCarouselStructureName,
    localizeCarouselStructureSummary,
} from '@/lib/carousel-localization'
import type { ReferenceImageRole, SelectedColor, VisionAnalysis } from '@/lib/creation-flow-types'
import { buildPriority5StyleBlockFromAnalysis, mergeCustomStyleIntoStyleDirectives } from '@/lib/prompts/vision/style-priority-block'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import { log } from '@/lib/logger'
import { SectionHeader } from '@/components/studio/shared/SectionHeader'
import {
    STUDIO_CONTROLS_SHELL_CLASS,
} from '@/components/studio/shared/panelStyles'
import { SuggestionsList } from '@/components/studio/shared/SuggestionsList'
import { useStylePresetImages } from '@/hooks/useStylePresetImages'
import { SessionTitleDialog } from '@/components/studio/shared/SessionTitleDialog'
import { UnsavedNavigationDialog, SessionDecisionDialog } from './CarouselSessionDialogs'
import { AdvancedCompositionDialog } from './AdvancedCompositionDialog'
import { FormatSection, SlideCountSection, CompositionSection, SessionsSection } from './CarouselControlSections'
import { useTranslation } from 'react-i18next'
import { buildAutomaticSessionTitle, getSessionDisplayTitle, normalizeCustomSessionTitle } from '@/lib/session-titles'

import { RoleColorSwatch, AddAccentSwatch } from './CarouselColorSwatches'
import {
    normalizeHexColor,
    pickCompositionId,
    STYLE_OPTIONS,
    PANEL_SECTION_HEADER_ICON_CLASS,
    PANEL_SECTION_HEADER_TITLE_CLASS,
    PANEL_TEXT_BUTTON_REVEAL_CLASS,
    PANEL_SECONDARY_BUTTON_CLASS,
    PANEL_SECTION_STACK_CLASS,
    PANEL_SECTION_DIVIDER_BASE_CLASS,
    PANEL_SECTION_ACCENTS,
} from './CarouselControlsPanel.helpers'
import type {
    SlideConfig,
    CarouselSettings,
    BrandColorRole,
    DraggedBrandColor,
    CompositionMode,
    DbStructure,
    DbComposition,
    UiStructure,
    UiComposition,
    SessionDecisionModalState,
    CarouselWorkspaceSnapshot,
} from './CarouselControlsPanel.types'

export type { SlideConfig, CarouselSettings } from './CarouselControlsPanel.types'

type LegacyBrandKitFields = {
    _id?: Id<'brand_dna'>
    emails?: unknown
    phones?: unknown
    addresses?: unknown
}

interface CarouselControlsPanelProps {
    className?: string
    onAnalyze: (settings: CarouselSettings) => Promise<void>
    onGenerate: (settings: CarouselSettings) => void
    onPreviewCompositionChange?: (state: { structureId: string; compositionId: string }) => void
    onCancelAnalyze?: () => void
    onCancelGenerate?: () => void
    isCancelingAnalyze?: boolean
    isCancelingGenerate?: boolean
    onAspectRatioChange?: (ratio: '1:1' | '4:5' | '3:4') => void
    onReferenceImagesChange?: (images: Array<{ url: string; source: 'upload' | 'brandkit' }>) => void
    onSelectedLogoChange?: (logoId: string | null, logoUrl?: string) => void
    onReset?: () => void
    userId?: string
    isAnalyzing: boolean
    isGenerating: boolean
    currentSlideIndex: number
    generatedCount: number
    totalSlides: number
    // Brand Kit Data
    brandKit: BrandDNA | null
    analysisHook?: string
    analysisStructure?: { id?: string; name?: string }
    analysisIntent?: string
    analysisIntentLabel?: string
    isAdmin?: boolean
    slideCountOverride?: number | null
    onSlideCountOverrideApplied?: () => void
    suggestions?: CarouselSuggestion[]
    onApplySuggestion?: (index: number) => void
    onApplySlideVariant?: (slideIndex: number, sourceId: string) => void
    onUndoSuggestion?: () => void
    hasOriginalSuggestion?: boolean
    slideVariantSelection?: string[]
    suggestedImagePrompts?: string[]
    analysisReady?: boolean
    onReanalysisStateChange?: (requiresReanalysis: boolean) => void
    onInvalidatePreview?: () => void
    onReferencePreviewStateChange?: (state: {
        uploadedImages: string[]
        selectedBrandKitImageIds: string[]
        referenceImageRoles: Record<string, ReferenceImageRole>
        imageSourceMode: 'upload' | 'brandkit' | 'generate'
        selectedStylePresetId: string | null
        selectedStylePresetImageUrl: string | null
    }) => void
    previewSlides?: CarouselSlide[]
    previewScriptSlides?: SlideContent[] | null
    originalScriptSlides?: SlideContent[] | null
    originalAnalysis?: {
        slides: CarouselSlide[]
        scriptSlides: SlideContent[]
        hook?: string
        structure?: { id?: string; name?: string }
        detectedIntent?: string
        caption?: string
    } | null
    previewCaption?: string
    previewCurrentIndex?: number
    previewSessionHistory?: Array<{
        id: string
        createdAt: string
        slides: CarouselSlide[]
        caption?: string
    }>
    onRestorePreviewState?: (state: {
        slides: CarouselSlide[]
        scriptSlides?: SlideContent[]
        caption?: string
        currentIndex?: number
        suggestions?: CarouselSuggestion[]
        imagePromptSuggestions?: string[]
        slideVariantSelection?: string[]
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
        } | null
        sessionHistory?: Array<{
            id: string
            createdAt: string
            slides: CarouselSlide[]
            caption?: string
        }>
    }) => void
    getAuditFlowId?: () => string | undefined
    initialPrompt?: string
    registerUnsavedBrandChangeGuard?: (guard: ((brandId: string) => Promise<boolean>) | null) => void
    registerSettingsResolver?: (resolver: ((overrides?: Partial<CarouselSettings>) => CarouselSettings) | null) => void
}

export function CarouselControlsPanel({
    className,
    onAnalyze,
    onGenerate,
    onPreviewCompositionChange,
    onCancelAnalyze,
    onCancelGenerate,
    isCancelingAnalyze = false,
    isCancelingGenerate = false,
    isAnalyzing,
    isGenerating,
    onAspectRatioChange,
    onReferenceImagesChange,
    onSelectedLogoChange,
    onReset,
    userId,
    currentSlideIndex,
    generatedCount,
    totalSlides,
    brandKit,
    analysisHook,
    analysisStructure,
    analysisIntent,
    analysisIntentLabel,
    isAdmin = false,
    slideCountOverride,
    onSlideCountOverrideApplied,
    suggestions,
    onApplySuggestion,
    onApplySlideVariant,
    onUndoSuggestion,
    hasOriginalSuggestion = false,
    slideVariantSelection = [],
    suggestedImagePrompts = [],
    analysisReady = false,
    onReanalysisStateChange,
    onInvalidatePreview,
    onReferencePreviewStateChange,
    previewSlides = [],
    previewScriptSlides = null,
    originalScriptSlides = null,
    originalAnalysis = null,
    previewCaption,
    previewCurrentIndex = 0,
    previewSessionHistory = [],
    onRestorePreviewState,
    getAuditFlowId,
    initialPrompt,
    registerUnsavedBrandChangeGuard,
    registerSettingsResolver,
}: CarouselControlsPanelProps) {
    const { t, i18n } = useTranslation('carousel')
    const router = useRouter()
    const createWorkSession = useMutation(api.work_sessions.createSession)
    const upsertWorkSession = useMutation(api.work_sessions.upsertActiveSession)
    const activateWorkSession = useMutation(api.work_sessions.activateSession)
    const deleteWorkSession = useMutation(api.work_sessions.deleteSession)
    const clearWorkSessions = useMutation(api.work_sessions.clearSessions)
    const legacyBrandKit = brandKit as LegacyBrandKitFields | null | undefined
    const scopedBrandId = (brandKit?.id || legacyBrandKit?._id) as Id<'brand_dna'> | undefined
    const activeWorkSession = useQuery(
        api.work_sessions.getActiveSession,
        userId && scopedBrandId
            ? { user_id: userId, module: 'carousel', brand_id: scopedBrandId }
            : 'skip'
    )
    const workSessions = useQuery(
        api.work_sessions.listSessions,
        userId && scopedBrandId
            ? { user_id: userId, module: 'carousel', brand_id: scopedBrandId, limit: 50 }
            : 'skip'
    )
    const structuresData = useQuery(api.carousel.listStructures, { includeInactive: false }) as DbStructure[] | undefined
    const { stylePresets } = useStylePresetImages()
    const stylePresetsStatus = 'Exhausted' as const
    const structures: UiStructure[] = (structuresData || [])
        .map((s) => ({
            id: s.structure_id,
            name: localizeCarouselStructureName(s.structure_id, s.name, i18n.language),
            summary: localizeCarouselStructureSummary(s.structure_id, s.summary, i18n.language),
            order: s.order,
        }))
        .sort((a, b) => a.order - b.order)
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
    const [selectedSessionToLoad, setSelectedSessionToLoad] = useState<string>('')
    const [hasHydratedSession, setHasHydratedSession] = useState(false)
    const [isHydratingSession, setIsHydratingSession] = useState(false)
    const [isSavingSession, setIsSavingSession] = useState(false)
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [unsavedNavModalOpen, setUnsavedNavModalOpen] = useState(false)
    const [pendingNavigationTarget, setPendingNavigationTarget] = useState<{ href: string; external: boolean } | null>(null)
    const [isResolvingUnsavedNavigation, setIsResolvingUnsavedNavigation] = useState(false)
    const lastSavedSnapshotSignatureRef = useRef<string | null>(null)
    const pendingBaselineResetRef = useRef(false)
    const baselineResetTimeoutRef = useRef<number | null>(null)
    const savedPreviewVariantKeysRef = useRef<string[]>([])
    const saveSessionBeforeContinueRef = useRef<() => Promise<boolean>>(async () => false)
    const bypassUnsavedGuardRef = useRef(false)
    const hydrationScopeRef = useRef<string>('')
    const hasHydratedScopeRef = useRef(false)
    const persistedSlideImageCacheRef = useRef<Map<string, {
        storageId: string
        imageUrl: string
        originalStorageId: string
        originalImageUrl: string
        previewStorageId: string
        previewImageUrl: string
    }>>(new Map())
    const persistSlideImageInFlightRef = useRef<Map<string, Promise<{
        storageId: string
        imageUrl: string
        originalStorageId: string
        originalImageUrl: string
        previewStorageId: string
        previewImageUrl: string
    } | null>>>(new Map())
    const sessionDecisionResolverRef = useRef<((decision: string | null) => void) | null>(null)
    const sessionTitleResolverRef = useRef<((title: string | null) => void) | null>(null)
    const [sessionDecisionModal, setSessionDecisionModal] = useState<SessionDecisionModalState>({
        open: false,
        title: '',
        description: '',
        buttons: [],
    })
    const [sessionTitleDialogOpen, setSessionTitleDialogOpen] = useState(false)
    const [sessionTitleDraft, setSessionTitleDraft] = useState('')
    const openSessionDecisionModal = useCallback((config: Omit<SessionDecisionModalState, 'open'>) => {
        return new Promise<string | null>((resolve) => {
            sessionDecisionResolverRef.current = resolve
            setSessionDecisionModal({
                open: true,
                ...config,
            })
        })
    }, [])
    const closeSessionDecisionModal = useCallback((decision: string | null) => {
        sessionDecisionResolverRef.current?.(decision)
        sessionDecisionResolverRef.current = null
        setSessionDecisionModal((prev) => ({ ...prev, open: false }))
    }, [])
    const openSessionTitleDialog = useCallback((initialValue: string) => {
        return new Promise<string | null>((resolve) => {
            sessionTitleResolverRef.current = resolve
            setSessionTitleDraft(initialValue)
            setSessionTitleDialogOpen(true)
        })
    }, [])
    const closeSessionTitleDialog = useCallback((title: string | null) => {
        sessionTitleResolverRef.current?.(title)
        sessionTitleResolverRef.current = null
        setSessionTitleDialogOpen(false)
    }, [])
    const confirmDiscardUnsavedChanges = useCallback(async (action: string) => {
        if (!hasUnsavedChanges) return true
        const decision = await openSessionDecisionModal({
            title: t('ui.unsavedChangesTitle', { defaultValue: 'There are unsaved changes' }),
            description: t('ui.unsavedChangesDescription', {
                defaultValue: 'If you continue to {{action}}, you will lose the changes in this session. What would you like to do?',
                action,
            }),
            buttons: [
                { id: 'cancel', label: t('ui.stayHere', { defaultValue: 'Stay here' }), variant: 'outline' },
                { id: 'save', label: t('ui.saveAndContinue', { defaultValue: 'Save and continue' }), variant: 'default' },
                { id: 'discard', label: t('ui.discardChanges', { defaultValue: 'Discard changes' }), variant: 'destructive' },
            ],
        })
        if (decision === 'save') {
            return await saveSessionBeforeContinueRef.current()
        }
        return decision === 'discard'
    }, [hasUnsavedChanges, openSessionDecisionModal])

    useEffect(() => {
        if (!registerUnsavedBrandChangeGuard) return

        registerUnsavedBrandChangeGuard(async (brandId: string) => {
            if (!brandId || brandId === String(scopedBrandId || '')) return true
            return await confirmDiscardUnsavedChanges(t('ui.switchBrandAction', { defaultValue: 'switch Brand Kits' }))
        })

        return () => {
            registerUnsavedBrandChangeGuard(null)
        }
    }, [registerUnsavedBrandChangeGuard, scopedBrandId, confirmDiscardUnsavedChanges, t])
    const [prompt, setPrompt] = useState(initialPrompt ?? '')
    const [isInspiring, setIsInspiring] = useState(false)
    const [slideCount, setSlideCount] = useState(initialPrompt ? 3 : 0)
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '3:4'>('4:5')
    const [style, setStyle] = useState('minimal')
    const [slides, setSlides] = useState<SlideConfig[]>([])
    const [structureId, setStructureId] = useState<string>(analysisStructure?.id || structures[0]?.id || 'problema-solucion')
    const [compositionMode, setCompositionMode] = useState<CompositionMode>('basic')
    const [basicSelectedCompositionId, setBasicSelectedCompositionId] = useState<string | null>(null)
    const [hasUserSelectedStructure, setHasUserSelectedStructure] = useState(false)
    const [lastAnalysisStructureId, setLastAnalysisStructureId] = useState<string | null>(analysisStructure?.id || null)
    const compositionsData = useQuery(api.carousel.listCompositions, {
        structureId,
        includeInactive: false,
        includeGlobals: true
    }) as DbComposition[] | undefined
    const compositions: UiComposition[] = (compositionsData || [])
        .map((c) => ({
            id: c.composition_id,
            name: localizeCarouselCompositionName(c.composition_id, c.name, i18n.language),
            description: localizeCarouselCompositionDescription(
                c.composition_id,
                c.description,
                c.layoutPrompt,
                i18n.language
            ),
            layoutPrompt: c.layoutPrompt,
            icon: c.icon,
            iconPrompt: c.iconPrompt,
            scope: (c.scope as 'global' | 'narrative') || 'narrative',
            mode: (c.mode as 'basic' | 'advanced') || 'basic',
            order: c.order
        }))
        .sort((a, b) => a.order - b.order)

    const [compositionId, setCompositionId] = useState(
        pickCompositionId(
            compositions,
            'basic',
            compositions[0]?.id,
            `${structureId}|0`
        )
    )
    const [editingSlide, setEditingSlide] = useState<number | null>(null)
    const [editText, setEditText] = useState('')

    // Brand Kit Selections
    const [selectedLogoId, setSelectedLogoId] = useState<string | null>(null)
    const [selectedColors, setSelectedColors] = useState<SelectedColor[]>([])
    const [selectedBrandKitImageIds, setSelectedBrandKitImageIds] = useState<string[]>([])
    const [referenceImageRoles, setReferenceImageRoles] = useState<Record<string, ReferenceImageRole>>({})
    const [uploadedImages, setUploadedImages] = useState<string[]>([])
    const [imageSourceMode, setImageSourceMode] = useState<'upload' | 'brandkit' | 'generate'>('upload')
    const [ctaUrlEnabled, setCtaUrlEnabled] = useState(false)
    const [ctaUrl, setCtaUrl] = useState('')
    const [selectedContactFields, setSelectedContactFields] = useState<Record<string, string>>({})
    const [aiImageDescription, setAiImageDescription] = useState('')
    const [styleAnalysisDescription, setStyleAnalysisDescription] = useState('')
    const [customStyle, setCustomStyle] = useState('')
    const [applyStyleToTypography, setApplyStyleToTypography] = useState(false)
    const [selectedStylePresetId, setSelectedStylePresetId] = useState<string | null>(null)
    const [selectedStylePresetName, setSelectedStylePresetName] = useState<string | null>(null)
    const [isImageAnalyzing, setIsImageAnalyzing] = useState(false)
    const [imageError, setImageError] = useState<string | null>(null)
    const selectedStylePresetDetails = useQuery(
        api.stylePresets.getActiveById,
        selectedStylePresetId
            ? { id: selectedStylePresetId as Id<'style_presets'> }
            : 'skip'
    )
    const styleAnalysisCacheRef = useRef<Record<string, string>>({})
    const lastAutoStyleRef = useRef<string | null>(null)
    const pendingStylePresetSelectionRef = useRef<string | null>(null)
    const [includeLogoOnSlides, setIncludeLogoOnSlides] = useState(false)
    const [draggedBrandColor, setDraggedBrandColor] = useState<DraggedBrandColor>(null)
    const [isAdvancedCompositionOpen, setIsAdvancedCompositionOpen] = useState(false)
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(initialPrompt ? 2 : 1)
    const [needsReanalysis, setNeedsReanalysis] = useState(false)
    const [lastAnalyzedSignature, setLastAnalyzedSignature] = useState('')
    const hasStructuralAnalysis = Boolean(lastAnalyzedSignature)
    const showAllSteps = analysisReady || generatedCount > 0 || hasStructuralAnalysis
    const stepRefs = useRef<Array<HTMLDivElement | null>>([])
    const shouldReduceMotion = useReducedMotion()
    const selectedImageCount = uploadedImages.length + selectedBrandKitImageIds.length
    const hasReferenceSelection = selectedImageCount > 0 || (imageSourceMode === 'generate' && aiImageDescription.trim().length > 0)
    const canGenerate = prompt.trim().length > 0
        && slideCount > 0
        && !isGenerating
        && !isAnalyzing
        && !isImageAnalyzing
        && brandKit !== null
        && analysisReady
        && !needsReanalysis
    const canAnalyze = prompt.trim().length > 0 && slideCount > 0 && !isAnalyzing && !isImageAnalyzing && !isGenerating && brandKit !== null
    const isPriority5StyleBlock = (value?: string) =>
        typeof value === 'string' && /STYLE DIRECTIVES:/i.test(value)
    const isStepVisible = (step: number) => showAllSteps || currentStep >= step
    const basicCompositions = compositions.filter((composition) => composition.mode === 'basic')
    const advancedCompositions = compositions
    const buildAutoSessionTitle = useCallback((value?: string | null) => (
        buildAutomaticSessionTitle(value, t('ui.newSessionTitle', { defaultValue: 'New session' }))
    ), [t])

    const buildDisplaySessionTitle = useCallback((value?: string | null, customized = false) => (
        getSessionDisplayTitle(value, {
            fallback: t('ui.newSessionTitle', { defaultValue: 'New session' }),
            customized,
        })
    ), [t])

    const buildCustomSessionTitle = useCallback((value?: string | null) => (
        normalizeCustomSessionTitle(value, t('ui.newSessionTitle', { defaultValue: 'New session' }))
    ), [t])
    const activeSessionMeta = useMemo(() => {
        const currentId = currentSessionId ? String(currentSessionId) : ''
        if (!currentId) return null
        return (workSessions || []).find((session) => String(session._id) === currentId) || null
    }, [currentSessionId, workSessions])
    const getDefaultSelectedColorsFromBrandKit = useCallback((): SelectedColor[] => {
        if (!Array.isArray(brandKit?.colors) || brandKit.colors.length === 0) return []

        return brandKit.colors
            .map((colorEntry) => {
                const rawRole = ((colorEntry.role as string) || 'Acento').trim().toUpperCase()
                let role: 'Texto' | 'Fondo' | 'Acento' = 'Acento'
                if (rawRole.includes('TEXT')) role = 'Texto'
                else if (rawRole.includes('FOND')) role = 'Fondo'
                else if (rawRole.includes('ACENT')) role = 'Acento'

                return {
                    color: (colorEntry.color || (typeof colorEntry === 'string' ? colorEntry : '')).toLowerCase(),
                    role
                }
            })
            .filter((entry) => entry.color)
    }, [brandKit])
    const buildEmptyWorkspaceSnapshot = useCallback((defaultStructureId: string): CarouselWorkspaceSnapshot => {
        const defaultCompositionId = pickCompositionId(
            compositions,
            'basic',
            compositions[0]?.id,
            `${defaultStructureId}|0`
        )

        return {
            version: 1,
            module: 'carousel',
            prompt: '',
            slideCount: 0,
            aspectRatio: '4:5',
            style: 'minimal',
            structureId: defaultStructureId,
            compositionId: defaultCompositionId,
            compositionMode: 'basic',
            basicSelectedCompositionId: null,
            imageSourceMode: 'upload',
            aiImageDescription: '',
            aiStyleDirectives: '',
            customStyle: '',
            applyStyleToTypography: false,
            selectedStylePresetId: null,
            selectedStylePresetName: null,
            selectedLogoId: null,
            selectedColors: getDefaultSelectedColorsFromBrandKit(),
            selectedBrandKitImageIds: [],
            referenceImageRoles: {},
            uploadedImages: [],
            includeLogoOnSlides: false,
            ctaUrlEnabled: false,
            ctaUrl: '',
            selectedContactFields: {},
            suggestions: [],
            imagePromptSuggestions: [],
            slideVariantSelection: [],
            analysisHook: undefined,
            analysisStructure: undefined,
            analysisIntent: undefined,
            originalAnalysis: undefined,
            previewState: {
                slides: [],
                scriptSlides: undefined,
                caption: undefined,
                currentIndex: 0,
                sessionHistory: [],
            }
        }
    }, [compositions, getDefaultSelectedColorsFromBrandKit])
    const resetWorkspace = useCallback(() => {
        setPrompt('')
        setSlideCount(0)
        setAspectRatio('4:5')
        setStyle('minimal')
        setSlides([])
        const defaultStructureId = analysisStructure?.id || structures[0]?.id || 'problema-solucion'
        const defaultCompositionId = pickCompositionId(
            compositions,
            'basic',
            compositions[0]?.id,
            `${defaultStructureId}|0`
        )
        setStructureId(defaultStructureId)
        setCompositionMode('basic')
        setCompositionId(defaultCompositionId)
        setBasicSelectedCompositionId(null)
        setSelectedLogoId(null)
        setSelectedColors(getDefaultSelectedColorsFromBrandKit())
        setSelectedBrandKitImageIds([])
        setReferenceImageRoles({})
        setUploadedImages([])
        setImageSourceMode('upload')
        setCtaUrlEnabled(Boolean(brandKit?.cta_url_enabled && brandKit?.url))
        setCtaUrl(brandKit?.url?.trim() || '')
        setSelectedContactFields({})
        setAiImageDescription('')
        setStyleAnalysisDescription('')
        setCustomStyle('')
        setApplyStyleToTypography(false)
        setSelectedStylePresetId(null)
        setSelectedStylePresetName(null)
        setIncludeLogoOnSlides(false)
        setNeedsReanalysis(false)
        setLastAnalyzedSignature('')
        setCurrentStep(1)
        onReset?.()
    }, [analysisStructure?.id, structures, compositions, getDefaultSelectedColorsFromBrandKit, onReset])

    const resetCarouselDraft = useCallback(() => {
        resetWorkspace()
        setCurrentSessionId(null)
        setSelectedSessionToLoad('')
        setLastSavedAt(null)
        setSaveError(null)
        savedPreviewVariantKeysRef.current = []
        pendingBaselineResetRef.current = true
        setHasUnsavedChanges(false)
    }, [resetWorkspace])

    const buildWorkspaceSnapshot = useCallback((
        previewSlidesOverride?: CarouselSlide[],
        sessionHistoryOverride?: Array<{
            id: string
            createdAt: string
            slides: CarouselSlide[]
            caption?: string
        }>
    ): CarouselWorkspaceSnapshot => {
        const sourceSlides = Array.isArray(previewSlidesOverride) ? previewSlidesOverride : (previewSlides || [])
        const sourceHistory = Array.isArray(sessionHistoryOverride) ? sessionHistoryOverride : (previewSessionHistory || [])
        return {
            version: 1,
            module: 'carousel',
            prompt: prompt.slice(0, 1800),
            slideCount,
            aspectRatio,
            style,
            structureId,
            compositionId,
            compositionMode,
            basicSelectedCompositionId,
            imageSourceMode,
            aiImageDescription: aiImageDescription.slice(0, 1200),
            aiStyleDirectives: styleAnalysisDescription.slice(0, 1200),
            customStyle: customStyle.slice(0, 1200),
            applyStyleToTypography,
            selectedStylePresetId,
            selectedStylePresetName,
            selectedLogoId,
            selectedColors: selectedColors.slice(0, 10),
            selectedBrandKitImageIds: selectedBrandKitImageIds.slice(0, 10),
            referenceImageRoles: Object.fromEntries(Object.entries(referenceImageRoles).slice(0, 16)),
            uploadedImages: uploadedImages.slice(0, 8),
            includeLogoOnSlides,
            ctaUrlEnabled,
            ctaUrl: ctaUrl.slice(0, 280),
            selectedContactFields: Object.fromEntries(
                Object.entries(selectedContactFields)
                    .slice(0, 8)
                    .map(([key, value]) => [key, String(value || '').slice(0, 280)])
            ),
            suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 4).map((suggestion) => ({
                title: suggestion.title,
                subtitle: suggestion.subtitle,
                slides: Array.isArray(suggestion.slides) ? suggestion.slides.slice(-12) : [],
                hook: suggestion.hook,
                structure: suggestion.structure,
                optimalSlideCount: suggestion.optimalSlideCount,
                detectedIntent: suggestion.detectedIntent,
                caption: suggestion.caption?.slice(0, 1200),
            })) : [],
            imagePromptSuggestions: Array.isArray(suggestedImagePrompts) ? suggestedImagePrompts.slice(0, 4) : [],
            slideVariantSelection: Array.isArray(slideVariantSelection) ? slideVariantSelection.slice(0, 12) : [],
            analysisHook,
            analysisStructure,
            analysisIntent,
            originalAnalysis: originalAnalysis
                ? {
                    slides: Array.isArray(originalAnalysis.slides) ? originalAnalysis.slides.slice(-12).map((slide) => ({
                        index: slide.index,
                        title: slide.title,
                        description: slide.description,
                        status: slide.status,
                        imageUrl: slide.imageUrl,
                        image_storage_id: slide.image_storage_id,
                        imagePreviewUrl: slide.imagePreviewUrl,
                        image_preview_storage_id: slide.image_preview_storage_id,
                        imageOriginalUrl: slide.imageOriginalUrl,
                        image_original_storage_id: slide.image_original_storage_id,
                        error: slide.error
                    })) : [],
                    scriptSlides: Array.isArray(originalAnalysis.scriptSlides) ? originalAnalysis.scriptSlides.slice(-12) : [],
                    hook: originalAnalysis.hook,
                    structure: originalAnalysis.structure,
                    detectedIntent: originalAnalysis.detectedIntent,
                    caption: originalAnalysis.caption?.slice(0, 1200),
                }
                : undefined,
            previewState: {
                slides: sourceSlides.slice(-12).map((slide) => ({
                    index: slide.index,
                    title: slide.title,
                    description: slide.description,
                    status: slide.status,
                    imageUrl: slide.imageUrl,
                    image_storage_id: slide.image_storage_id,
                    imagePreviewUrl: slide.imagePreviewUrl,
                    image_preview_storage_id: slide.image_preview_storage_id,
                    imageOriginalUrl: slide.imageOriginalUrl,
                    image_original_storage_id: slide.image_original_storage_id,
                    error: slide.error
                })),
                scriptSlides: Array.isArray(previewScriptSlides) ? previewScriptSlides.slice(-12) : undefined,
                caption: previewCaption?.slice(0, 1200) || undefined,
                currentIndex: previewCurrentIndex,
                sessionHistory: sourceHistory.slice(-2).map((item) => ({
                        id: item.id,
                        createdAt: item.createdAt,
                        caption: item.caption?.slice(0, 1200),
                        slides: Array.isArray(item.slides)
                            ? item.slides.slice(-12).map((slide) => ({
                                index: slide.index,
                                title: slide.title,
                                description: slide.description,
                                status: slide.status,
                                imageUrl: slide.imageUrl,
                                image_storage_id: slide.image_storage_id,
                                imagePreviewUrl: slide.imagePreviewUrl,
                                image_preview_storage_id: slide.image_preview_storage_id,
                                imageOriginalUrl: slide.imageOriginalUrl,
                                image_original_storage_id: slide.image_original_storage_id,
                                error: slide.error
                            }))
                            : []
                    }))
            }
        }
    }, [
        prompt,
        slideCount,
        aspectRatio,
        style,
        structureId,
        compositionId,
        compositionMode,
        basicSelectedCompositionId,
        imageSourceMode,
        aiImageDescription,
        styleAnalysisDescription,
        customStyle,
        applyStyleToTypography,
        selectedStylePresetId,
        selectedStylePresetName,
        selectedLogoId,
        selectedColors,
        selectedBrandKitImageIds,
        referenceImageRoles,
        uploadedImages,
        includeLogoOnSlides,
        ctaUrlEnabled,
        ctaUrl,
        selectedContactFields,
        previewSlides,
        previewScriptSlides,
        previewCaption,
        previewCurrentIndex,
        previewSessionHistory
        ,
        suggestions,
        suggestedImagePrompts,
        slideVariantSelection,
        analysisHook,
        analysisStructure,
        analysisIntent,
        originalAnalysis
    ])

    const buildPreviewVariantKey = useCallback((
        slides?: Array<{
            index?: number
            title?: string
            description?: string
            status?: string
            imageUrl?: string
            image_storage_id?: string
            imagePreviewUrl?: string
            image_preview_storage_id?: string
            imageOriginalUrl?: string
            image_original_storage_id?: string
            error?: string
        }>,
        caption?: string
    ) => {
        const normalizedSlides = Array.isArray(slides)
            ? slides.map((slide) => ({
                index: slide.index ?? null,
                title: slide.title || '',
                description: slide.description || '',
                status: slide.status || '',
                image: slide.image_original_storage_id || slide.imageOriginalUrl || slide.image_preview_storage_id || slide.imagePreviewUrl || slide.image_storage_id || slide.imageUrl || '',
                error: slide.error || '',
            }))
            : []

        return JSON.stringify({
            slides: normalizedSlides,
            caption: caption || '',
        })
    }, [])

    const extractSavedPreviewVariantKeys = useCallback((snapshot: CarouselWorkspaceSnapshot) => {
        const previewState = snapshot.previewState || { slides: [] }
        const keys = new Set<string>()
        keys.add(buildPreviewVariantKey(previewState.slides, previewState.caption))

        if (Array.isArray(previewState.sessionHistory)) {
            previewState.sessionHistory.forEach((item) => {
                keys.add(buildPreviewVariantKey(item?.slides, item?.caption))
            })
        }

        return Array.from(keys)
    }, [buildPreviewVariantKey])

    const buildWorkspaceChangeSignature = useCallback((snapshot: CarouselWorkspaceSnapshot) => {
        const previewState = snapshot.previewState || { slides: [] }
        const currentPreviewVariantKey = buildPreviewVariantKey(previewState.slides, previewState.caption)
        const isSavedPreviewVariant = savedPreviewVariantKeysRef.current.includes(currentPreviewVariantKey)

        return JSON.stringify({
            ...snapshot,
            previewState: {
                ...previewState,
                slides: isSavedPreviewVariant ? [] : previewState.slides,
                caption: isSavedPreviewVariant ? undefined : previewState.caption,
                currentIndex: isSavedPreviewVariant ? 0 : previewState.currentIndex,
                activeSavedVariant: isSavedPreviewVariant,
            },
        })
    }, [buildPreviewVariantKey])

    const buildSlidePersistKey = useCallback((slide: CarouselSlide, imageUrl: string) => {
        const compactUrl = imageUrl.length > 160 ? `${imageUrl.slice(0, 160)}::${imageUrl.length}` : imageUrl
        return `${slide.index}::${compactUrl}`
    }, [])

    const persistPreviewSlideImage = useCallback(async (slide: CarouselSlide) => {
        const originalUrl = typeof slide.imageOriginalUrl === 'string' ? slide.imageOriginalUrl.trim() : ''
        const previewUrl = typeof slide.imagePreviewUrl === 'string' ? slide.imagePreviewUrl.trim() : ''
        const currentUrl = typeof slide.imageUrl === 'string' ? slide.imageUrl.trim() : ''
        const originalStorageId = typeof slide.image_original_storage_id === 'string' ? slide.image_original_storage_id.trim() : ''
        const legacyStorageId = typeof slide.image_storage_id === 'string' ? slide.image_storage_id.trim() : ''
        const previewStorageId = typeof slide.image_preview_storage_id === 'string' ? slide.image_preview_storage_id.trim() : ''

        if ((originalStorageId || legacyStorageId) && previewStorageId) return null

        const imageUrl = originalUrl || currentUrl || previewUrl || originalStorageId || legacyStorageId
        if (!imageUrl) return null

        const needsPersistence =
            imageUrl.startsWith('data:') ||
            imageUrl.startsWith('http://') ||
            imageUrl.startsWith('https://') ||
            /^[a-z0-9]{20,}$/i.test(imageUrl)
        if (!needsPersistence) return null

        const key = buildSlidePersistKey(slide, imageUrl)
        const cached = persistedSlideImageCacheRef.current.get(key)
        if (cached) return cached

        const inFlight = persistSlideImageInFlightRef.current.get(key)
        if (inFlight) return await inFlight

        const task = (async () => {
            const response = await fetch('/api/work-sessions/persist-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'No se pudo persistir imagen de slide' }))
                throw new Error(errorData.error || 'No se pudo persistir imagen de slide')
            }

            const data = await response.json() as {
                storageId?: string
                imageUrl?: string
                originalStorageId?: string
                originalImageUrl?: string
                previewStorageId?: string
                previewImageUrl?: string
            }
            if (!data.storageId || !data.imageUrl || !data.originalStorageId || !data.originalImageUrl || !data.previewStorageId || !data.previewImageUrl) {
                throw new Error('Persistencia de slide incompleta')
            }
            const persisted = {
                storageId: data.storageId,
                imageUrl: data.imageUrl,
                originalStorageId: data.originalStorageId,
                originalImageUrl: data.originalImageUrl,
                previewStorageId: data.previewStorageId,
                previewImageUrl: data.previewImageUrl,
            }
            persistedSlideImageCacheRef.current.set(key, persisted)
            return persisted
        })()

        persistSlideImageInFlightRef.current.set(key, task)
        try {
            return await task
        } finally {
            persistSlideImageInFlightRef.current.delete(key)
        }
    }, [buildSlidePersistKey])

    const materializePreviewSlidesForSnapshot = useCallback(async (inputSlides: CarouselSlide[]) => {
        if (!Array.isArray(inputSlides) || inputSlides.length === 0) return inputSlides

        const materialized = await Promise.all(inputSlides.map(async (slide) => {
            try {
                const persisted = await persistPreviewSlideImage(slide)
                if (!persisted) return slide
                return {
                    ...slide,
                    image_storage_id: persisted.originalStorageId,
                    imageUrl: persisted.previewImageUrl,
                    image_preview_storage_id: persisted.previewStorageId,
                    imagePreviewUrl: persisted.previewImageUrl,
                    image_original_storage_id: persisted.originalStorageId,
                    imageOriginalUrl: persisted.originalImageUrl,
                }
            } catch {
                return slide
            }
        }))

        return materialized
    }, [persistPreviewSlideImage])

    const materializeSessionHistoryForSnapshot = useCallback(async (
        history: Array<{
            id: string
            createdAt: string
            slides: CarouselSlide[]
            caption?: string
        }>
    ) => {
        if (!Array.isArray(history) || history.length === 0) return history

        const materialized = await Promise.all(history.map(async (entry) => {
            const slides = Array.isArray(entry.slides) ? entry.slides : []
            if (slides.length === 0) return entry

            const persistedSlides = await Promise.all(slides.map(async (slide) => {
                try {
                    const persisted = await persistPreviewSlideImage(slide)
                    if (!persisted) return slide
                    return {
                        ...slide,
                        image_storage_id: persisted.originalStorageId,
                        imageUrl: persisted.previewImageUrl,
                        image_preview_storage_id: persisted.previewStorageId,
                        imagePreviewUrl: persisted.previewImageUrl,
                        image_original_storage_id: persisted.originalStorageId,
                        imageOriginalUrl: persisted.originalImageUrl,
                    }
                } catch {
                    return slide
                }
            }))

            return {
                ...entry,
                slides: persistedSlides,
            }
        }))

        return materialized
    }, [persistPreviewSlideImage])

    const restoreWorkspaceFromSnapshot = useCallback((snapshot: CarouselWorkspaceSnapshot) => {
        setIsHydratingSession(true)
        try {
            setPrompt(snapshot.prompt || '')
            setSlideCount(Math.max(0, Math.min(15, snapshot.slideCount || 0)))
            setAspectRatio(snapshot.aspectRatio || '4:5')
            setStyle(snapshot.style || 'minimal')
            setStructureId(snapshot.structureId || 'problema-solucion')
            setCompositionId(snapshot.compositionId || 'free')
            setCompositionMode(snapshot.compositionMode === 'advanced' ? 'advanced' : 'basic')
            setBasicSelectedCompositionId(snapshot.basicSelectedCompositionId || null)
            setImageSourceMode(snapshot.imageSourceMode || 'upload')
            setAiImageDescription(snapshot.aiImageDescription || '')
            setStyleAnalysisDescription(snapshot.aiStyleDirectives || '')
            setCustomStyle(snapshot.customStyle || '')
            setApplyStyleToTypography(Boolean(snapshot.applyStyleToTypography))
            setSelectedStylePresetId(snapshot.selectedStylePresetId || null)
            setSelectedStylePresetName(snapshot.selectedStylePresetName || null)
            setSelectedLogoId(snapshot.selectedLogoId || null)
            setSelectedColors(Array.isArray(snapshot.selectedColors) ? snapshot.selectedColors : [])
            setSelectedBrandKitImageIds(Array.isArray(snapshot.selectedBrandKitImageIds) ? snapshot.selectedBrandKitImageIds : [])
            setReferenceImageRoles(snapshot.referenceImageRoles || {})
            setUploadedImages(Array.isArray(snapshot.uploadedImages) ? snapshot.uploadedImages : [])
            setIncludeLogoOnSlides(Boolean(snapshot.includeLogoOnSlides))
            setCtaUrlEnabled(Boolean(snapshot.ctaUrlEnabled))
            setCtaUrl(snapshot.ctaUrl || '')
            setSelectedContactFields(snapshot.selectedContactFields || {})
            const savedPreview = snapshot.previewState
            const restoredStructuralSignature = JSON.stringify({
                prompt: snapshot.prompt || '',
                slideCount: Math.max(0, Math.min(15, snapshot.slideCount || 0)),
                structureId: snapshot.structureId || 'problema-solucion',
            })
            const hasRestoredAnalysis =
                (Array.isArray(savedPreview?.scriptSlides) && savedPreview.scriptSlides.length > 0)
                || (Array.isArray(savedPreview?.slides) && savedPreview.slides.length > 0)
                || Boolean(snapshot.analysisHook || snapshot.analysisStructure?.id || snapshot.analysisIntent)

            if (savedPreview && onRestorePreviewState) {
                onRestorePreviewState({
                    slides: Array.isArray(savedPreview.slides) ? savedPreview.slides : [],
                    scriptSlides: Array.isArray(savedPreview.scriptSlides) ? savedPreview.scriptSlides : undefined,
                    caption: typeof savedPreview.caption === 'string' ? savedPreview.caption : undefined,
                    currentIndex: Number.isFinite(savedPreview.currentIndex) ? savedPreview.currentIndex : 0,
                    sessionHistory: Array.isArray(savedPreview.sessionHistory) ? savedPreview.sessionHistory : undefined,
                    suggestions: Array.isArray(snapshot.suggestions) ? snapshot.suggestions : [],
                    imagePromptSuggestions: Array.isArray(snapshot.imagePromptSuggestions) ? snapshot.imagePromptSuggestions : [],
                    slideVariantSelection: Array.isArray(snapshot.slideVariantSelection) ? snapshot.slideVariantSelection : [],
                    analysisHook: snapshot.analysisHook,
                    analysisStructure: snapshot.analysisStructure,
                    analysisIntent: snapshot.analysisIntent,
                    originalAnalysis: snapshot.originalAnalysis || null,
                })
            }
            setCurrentStep(Array.isArray(snapshot.suggestions) && snapshot.suggestions.length > 0 ? 7 : 6)
            setNeedsReanalysis(false)
            setLastAnalyzedSignature(hasRestoredAnalysis ? restoredStructuralSignature : '')
        } finally {
            window.setTimeout(() => setIsHydratingSession(false), 0)
        }
    }, [onRestorePreviewState])

    const scheduleBaselineReset = useCallback((signature: string) => {
        if (baselineResetTimeoutRef.current !== null) {
            window.clearTimeout(baselineResetTimeoutRef.current)
        }
        baselineResetTimeoutRef.current = window.setTimeout(() => {
            pendingBaselineResetRef.current = false
            lastSavedSnapshotSignatureRef.current = signature
            setHasUnsavedChanges(false)
            baselineResetTimeoutRef.current = null
        }, 180)
    }, [])

    const createNewCarouselSession = useCallback(async (
        silent = false,
        options?: { skipUnsavedConfirm?: boolean; persist?: boolean }
    ) => {
        if (!userId || !scopedBrandId) return null
        if (!options?.skipUnsavedConfirm && !await confirmDiscardUnsavedChanges(t('ui.createNewSessionAction', { defaultValue: 'create a new session' }))) return null

        const defaultStructureId = analysisStructure?.id || structures[0]?.id || 'problema-solucion'
        const emptySnapshot = buildEmptyWorkspaceSnapshot(defaultStructureId)
        resetCarouselDraft()

        if (!options?.persist) {
            return null
        }

        const created = await createWorkSession({
            user_id: userId,
            module: 'carousel',
            brand_id: scopedBrandId,
            title: buildAutoSessionTitle(''),
            title_customized: false,
            snapshot: emptySnapshot,
        })

        const id = String(created.session_id)
        setCurrentSessionId(id)
        setSelectedSessionToLoad(id)
        savedPreviewVariantKeysRef.current = extractSavedPreviewVariantKeys(emptySnapshot)
        lastSavedSnapshotSignatureRef.current = buildWorkspaceChangeSignature(emptySnapshot)
        setHasUnsavedChanges(false)

        if (!silent) {
            window.setTimeout(() => {
                // keep lightweight, no toast dependency on this path
            }, 0)
        }
        return id
    }, [userId, scopedBrandId, confirmDiscardUnsavedChanges, analysisStructure?.id, structures, buildEmptyWorkspaceSnapshot, createWorkSession, buildAutoSessionTitle, resetCarouselDraft, extractSavedPreviewVariantKeys, buildWorkspaceChangeSignature])

    const handleLoadSession = useCallback(async (
        sessionId: string,
        options?: { skipUnsavedConfirm?: boolean }
    ) => {
        if (!sessionId || !userId) return false
        if (!options?.skipUnsavedConfirm && !await confirmDiscardUnsavedChanges(t('ui.switchSessionAction', { defaultValue: 'switch sessions' }))) return false
        const activated = await activateWorkSession({
            user_id: userId,
            session_id: sessionId as Id<'work_sessions'>,
        })
        if (activated?.snapshot) {
            pendingBaselineResetRef.current = true
            savedPreviewVariantKeysRef.current = extractSavedPreviewVariantKeys(activated.snapshot as CarouselWorkspaceSnapshot)
            restoreWorkspaceFromSnapshot(activated.snapshot as CarouselWorkspaceSnapshot)
            log.success('SESSION', 'Carousel session restored', {
                session_id: String(activated._id || sessionId),
                module: 'carousel',
            })
        }
        setCurrentSessionId(String(activated?._id || sessionId))
        setSelectedSessionToLoad(String(activated?._id || sessionId))
        setHasUnsavedChanges(false)
        return true
    }, [userId, activateWorkSession, restoreWorkspaceFromSnapshot, confirmDiscardUnsavedChanges, extractSavedPreviewVariantKeys])

    const handleDeleteCurrentSession = useCallback(async () => {
        if (!userId || !currentSessionId) return
        const decision = await openSessionDecisionModal({
            title: t('ui.deleteThisSessionTitle', { defaultValue: 'Delete this session' }),
            description: t('ui.deleteThisSessionDescription', { defaultValue: 'This carousel session will be deleted. The saved content from this session will no longer be available.' }),
            buttons: [
                { id: 'cancel', label: t('common:actions.cancel', { defaultValue: 'Cancel' }), variant: 'outline' },
                { id: 'delete', label: t('ui.deleteSessionConfirm', { defaultValue: 'Delete session' }), variant: 'destructive' },
            ],
        })
        if (decision !== 'delete') return

        const result = await deleteWorkSession({
            user_id: userId,
            session_id: currentSessionId as Id<'work_sessions'>,
        })

        if (result?.next_session_id) {
            await handleLoadSession(String(result.next_session_id), { skipUnsavedConfirm: true })
        } else {
            await createNewCarouselSession(true, { skipUnsavedConfirm: true })
        }
    }, [userId, currentSessionId, openSessionDecisionModal, deleteWorkSession, handleLoadSession, createNewCarouselSession])

    const handleClearAllSessions = useCallback(async () => {
        if (!userId || !scopedBrandId) return
        const decision = await openSessionDecisionModal({
            title: t('ui.deleteAllSessionsTitle', { defaultValue: 'Delete all sessions' }),
            description: t('ui.deleteAllSessionsDescription', { defaultValue: 'The entire carousel session history for this Brand Kit will be deleted. This action cannot be undone.' }),
            buttons: [
                { id: 'cancel', label: t('common:actions.cancel', { defaultValue: 'Cancel' }), variant: 'outline' },
                { id: 'clear', label: t('ui.deleteAllSessionsConfirm', { defaultValue: 'Delete all' }), variant: 'destructive' },
            ],
        })
        if (decision !== 'clear') return
        await clearWorkSessions({
            user_id: userId,
            module: 'carousel',
            brand_id: scopedBrandId,
        })
        await createNewCarouselSession(true, { skipUnsavedConfirm: true })
    }, [userId, scopedBrandId, openSessionDecisionModal, clearWorkSessions, createNewCarouselSession])

    useEffect(() => {
        const scopeKey = `${userId || 'anon'}::carousel::${scopedBrandId || 'no-brand'}`
        if (hydrationScopeRef.current !== scopeKey) {
            if (baselineResetTimeoutRef.current !== null) {
                window.clearTimeout(baselineResetTimeoutRef.current)
                baselineResetTimeoutRef.current = null
            }
            pendingBaselineResetRef.current = false
            savedPreviewVariantKeysRef.current = []
            hydrationScopeRef.current = scopeKey
            hasHydratedScopeRef.current = false
            lastSavedSnapshotSignatureRef.current = null
            setHasHydratedSession(false)
            setCurrentSessionId(null)
            setSelectedSessionToLoad('')
            setLastSavedAt(null)
            setSaveError(null)
            setHasUnsavedChanges(false)
            // Cambio de marca = escenario nuevo: limpiamos el lienzo del carrusel
            // de la marca anterior. Si la nueva marca tiene sesion, se restaura
            // justo despues; si no, queda limpio (sin restos de otra marca).
            resetWorkspace()
        }

        if (!userId || !scopedBrandId) return
        if (activeWorkSession === undefined) return
        if (workSessions === undefined) return
        if (hasHydratedScopeRef.current) return

        if (activeWorkSession?.snapshot) {
            pendingBaselineResetRef.current = true
            savedPreviewVariantKeysRef.current = extractSavedPreviewVariantKeys(activeWorkSession.snapshot as CarouselWorkspaceSnapshot)
            restoreWorkspaceFromSnapshot(activeWorkSession.snapshot as CarouselWorkspaceSnapshot)
            setCurrentSessionId(String(activeWorkSession._id))
            setSelectedSessionToLoad(String(activeWorkSession._id))
            setHasUnsavedChanges(false)
            setHasHydratedSession(true)
            hasHydratedScopeRef.current = true
            return
        }

        const latestExisting = Array.isArray(workSessions) && workSessions.length > 0
            ? workSessions[0]
            : null

        if (latestExisting?._id) {
            hasHydratedScopeRef.current = true
            void handleLoadSession(String(latestExisting._id)).catch(() => {
                hasHydratedScopeRef.current = false
                setHasHydratedSession(false)
                log.warn('SESSION', 'Fallo cargando la sesion mas reciente de carrusel')
            }).finally(() => {
                setHasHydratedSession(true)
            })
            return
        }

        hasHydratedScopeRef.current = true
        setHasHydratedSession(true)
        pendingBaselineResetRef.current = true
        setHasUnsavedChanges(false)
    }, [
        userId,
        scopedBrandId,
        activeWorkSession,
        workSessions,
        restoreWorkspaceFromSnapshot,
        handleLoadSession,
        resetWorkspace
    ])

    const persistWorkspaceSnapshot = useCallback(async (options?: {
        silent?: boolean
        markSavedAt?: boolean
        force?: boolean
        titleOverride?: string
        titleCustomized?: boolean
    }) => {
        if (!userId || !scopedBrandId) return
        const isSilent = options?.silent === true
        const shouldMarkSavedAt = options?.markSavedAt !== false
        const forcePersist = options?.force === true
        if (!isSilent) {
            setIsSavingSession(true)
            setSaveError(null)
        }
        try {
            const persistedSlides = await materializePreviewSlidesForSnapshot(previewSlides || [])
            const persistedHistory = await materializeSessionHistoryForSnapshot(previewSessionHistory || [])
            const snapshot = buildWorkspaceSnapshot(persistedSlides, persistedHistory)
            const snapshotSignature = buildWorkspaceChangeSignature(snapshot)
            if (!forcePersist && lastSavedSnapshotSignatureRef.current === snapshotSignature) {
                if (shouldMarkSavedAt) {
                    setLastSavedAt(new Date().toISOString())
                }
                return
            }

            const result = await upsertWorkSession({
                user_id: userId,
                module: 'carousel',
                brand_id: scopedBrandId,
                session_id: currentSessionId ? (currentSessionId as Id<'work_sessions'>) : undefined,
                title: options?.titleOverride ?? buildAutoSessionTitle(snapshot.prompt || 'Sesion de carrusel'),
                title_customized: options?.titleCustomized,
                snapshot,
            })
            const id = String(result.session_id)
            if (!currentSessionId) {
                setCurrentSessionId(id)
                setSelectedSessionToLoad(id)
            }
            savedPreviewVariantKeysRef.current = extractSavedPreviewVariantKeys(snapshot)
            lastSavedSnapshotSignatureRef.current = snapshotSignature
            setHasUnsavedChanges(false)
            if (shouldMarkSavedAt) {
                setLastSavedAt(new Date().toISOString())
            }
        } catch (error) {
            if (!isSilent) {
                setSaveError(error instanceof Error ? error.message : 'No se pudo guardar')
            }
            throw error
        } finally {
            if (!isSilent) {
                setIsSavingSession(false)
            }
        }
    }, [
        userId,
        scopedBrandId,
        previewSlides,
        previewSessionHistory,
        materializePreviewSlidesForSnapshot,
        materializeSessionHistoryForSnapshot,
        buildWorkspaceSnapshot,
        buildWorkspaceChangeSignature,
        extractSavedPreviewVariantKeys,
        upsertWorkSession,
        currentSessionId,
        buildAutoSessionTitle
    ])

    const ensureCarouselSessionForAnalyze = useCallback(async () => {
        if (!userId || !scopedBrandId || currentSessionId) return currentSessionId

        const snapshot = buildWorkspaceSnapshot(previewSlides || [], previewSessionHistory || [])
        const created = await createWorkSession({
            user_id: userId,
            module: 'carousel',
            brand_id: scopedBrandId,
            title: buildAutoSessionTitle(prompt || 'Sesion de carrusel'),
            title_customized: false,
            root_prompt: prompt.trim() || undefined,
            snapshot,
        })

        const sessionId = String(created.session_id)
        setCurrentSessionId(sessionId)
        setSelectedSessionToLoad(sessionId)
        savedPreviewVariantKeysRef.current = extractSavedPreviewVariantKeys(snapshot)
        lastSavedSnapshotSignatureRef.current = buildWorkspaceChangeSignature(snapshot)
        setHasUnsavedChanges(false)
        return sessionId
    }, [
        userId,
        scopedBrandId,
        currentSessionId,
        buildWorkspaceSnapshot,
        previewSlides,
        previewSessionHistory,
        createWorkSession,
        buildAutoSessionTitle,
        prompt,
        extractSavedPreviewVariantKeys,
        buildWorkspaceChangeSignature,
    ])

    const saveSessionBeforeContinue = useCallback(async () => {
        if (!userId || !scopedBrandId || isHydratingSession) return false
        try {
            if (activeSessionMeta?.title_customized !== true) {
                const suggestedTitle = buildDisplaySessionTitle(
                    activeSessionMeta?.title || prompt || 'Sesion de carrusel',
                    Boolean(activeSessionMeta?.title_customized)
                )
                const selectedTitle = await openSessionTitleDialog(suggestedTitle)
                if (!selectedTitle) return false
                await persistWorkspaceSnapshot({
                    silent: false,
                    markSavedAt: true,
                    force: true,
                    titleOverride: buildCustomSessionTitle(selectedTitle),
                    titleCustomized: true,
                })
                return true
            }
            await persistWorkspaceSnapshot({
                silent: false,
                markSavedAt: true,
                force: true,
            })
            return true
        } catch {
            log.warn('SESSION', 'Guardado previo a continuar en carrusel fallido')
            return false
        }
    }, [
        userId,
        scopedBrandId,
        isHydratingSession,
        activeSessionMeta,
        buildDisplaySessionTitle,
        openSessionTitleDialog,
        persistWorkspaceSnapshot,
        prompt,
        buildCustomSessionTitle,
    ])
    saveSessionBeforeContinueRef.current = saveSessionBeforeContinue

    const handleSaveNow = useCallback(async () => {
        const saved = await saveSessionBeforeContinue()
        if (saved) {
            log.success('SESSION', 'Guardado manual de sesion de carrusel completado')
        }
    }, [saveSessionBeforeContinue])
    const handleRenameCurrentSession = useCallback(async () => {
        if (!userId || !scopedBrandId || isHydratingSession || !currentSessionId) return
        const suggestedTitle = buildDisplaySessionTitle(
            activeSessionMeta?.title || prompt || 'Sesion de carrusel',
            Boolean(activeSessionMeta?.title_customized)
        )
        const selectedTitle = await openSessionTitleDialog(suggestedTitle)
        if (!selectedTitle) return
        try {
            await persistWorkspaceSnapshot({
                silent: false,
                markSavedAt: true,
                force: true,
                titleOverride: buildCustomSessionTitle(selectedTitle),
                titleCustomized: true,
            })
            log.success('SESSION', 'Sesion activa de carrusel renombrada')
        } catch {
            log.warn('SESSION', 'No se pudo renombrar la sesion activa de carrusel')
        }
    }, [userId, scopedBrandId, isHydratingSession, currentSessionId, activeSessionMeta, buildDisplaySessionTitle, openSessionTitleDialog, persistWorkspaceSnapshot, prompt, buildCustomSessionTitle])

    const workspaceSignature = useMemo(() => {
        return buildWorkspaceChangeSignature(buildWorkspaceSnapshot(previewSlides || [], previewSessionHistory || []))
    }, [buildWorkspaceSnapshot, buildWorkspaceChangeSignature, previewSlides, previewSessionHistory])

    useEffect(() => {
        if (!hasHydratedSession || isHydratingSession) return
        if (pendingBaselineResetRef.current) {
            scheduleBaselineReset(workspaceSignature)
            return
        }
        const lastSaved = lastSavedSnapshotSignatureRef.current
        if (!lastSaved) {
            setHasUnsavedChanges(true)
            return
        }
        setHasUnsavedChanges(lastSaved !== workspaceSignature)
    }, [workspaceSignature, hasHydratedSession, isHydratingSession, scheduleBaselineReset])

    useEffect(() => {
        return () => {
            if (baselineResetTimeoutRef.current !== null) {
                window.clearTimeout(baselineResetTimeoutRef.current)
            }
        }
    }, [])

    useEffect(() => {
        if (!hasUnsavedChanges) return
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (bypassUnsavedGuardRef.current) return
            event.preventDefault()
            event.returnValue = ''
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [hasUnsavedChanges])

    useEffect(() => {
        if (!hasUnsavedChanges) return

        const onDocumentClickCapture = (event: MouseEvent) => {
            if (bypassUnsavedGuardRef.current) return
            if (event.defaultPrevented) return
            if (event.button !== 0) return
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

            const target = event.target as HTMLElement | null
            const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
            if (!anchor) return

            const hrefAttr = anchor.getAttribute('href') || ''
            if (!hrefAttr || hrefAttr.startsWith('#') || hrefAttr.startsWith('javascript:')) return
            if (hrefAttr.startsWith('mailto:') || hrefAttr.startsWith('tel:')) return
            if (anchor.hasAttribute('download')) return
            if (anchor.target && anchor.target !== '_self') return

            let targetUrl: URL
            try {
                targetUrl = new URL(anchor.href, window.location.href)
            } catch {
                return
            }

            const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
            const next = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`
            if (current === next) return

            event.preventDefault()
            event.stopPropagation()
            setPendingNavigationTarget({
                href: targetUrl.href,
                external: targetUrl.origin !== window.location.origin,
            })
            setUnsavedNavModalOpen(true)
        }

        document.addEventListener('click', onDocumentClickCapture, true)
        return () => document.removeEventListener('click', onDocumentClickCapture, true)
    }, [hasUnsavedChanges])

    const continuePendingNavigation = useCallback(() => {
        if (!pendingNavigationTarget) return
        bypassUnsavedGuardRef.current = true
        setUnsavedNavModalOpen(false)

        if (pendingNavigationTarget.external) {
            window.location.assign(pendingNavigationTarget.href)
            return
        }

        const url = new URL(pendingNavigationTarget.href, window.location.origin)
        router.push(`${url.pathname}${url.search}${url.hash}`)
    }, [pendingNavigationTarget, router])

    const handleUnsavedNavigateDiscard = useCallback(() => {
        setIsResolvingUnsavedNavigation(true)
        try {
            continuePendingNavigation()
        } finally {
            setIsResolvingUnsavedNavigation(false)
            setPendingNavigationTarget(null)
        }
    }, [continuePendingNavigation])

    const handleUnsavedNavigateSave = useCallback(async () => {
        if (!pendingNavigationTarget) return
        setIsResolvingUnsavedNavigation(true)
        try {
            const saved = await saveSessionBeforeContinue()
            if (!saved) return
            continuePendingNavigation()
        } finally {
            setIsResolvingUnsavedNavigation(false)
            setPendingNavigationTarget(null)
        }
    }, [pendingNavigationTarget, saveSessionBeforeContinue, continuePendingNavigation])

    const handleUnsavedNavigateCancel = useCallback(() => {
        setUnsavedNavModalOpen(false)
        setPendingNavigationTarget(null)
    }, [])

    const buildStructuralSignature = useCallback((
        partial?: Partial<{
            prompt: string
            slideCount: number
            structureId: string
        }>
    ) => {
        const value = {
            prompt: partial?.prompt ?? prompt,
            slideCount: partial?.slideCount ?? slideCount,
            structureId: partial?.structureId ?? structureId,
        }
        return JSON.stringify(value)
    }, [prompt, slideCount, structureId])

    const markStructuralReanalysisNeeded = useCallback(() => {
        setNeedsReanalysis(true)
    }, [])

    // Get brand logos
    const brandLogos = brandKit?.logos || []
    const resolveBrandLogoUrl = useCallback((logo: (typeof brandLogos)[number] | undefined) => {
        if (!logo) return undefined
        return typeof logo === 'string' ? logo : logo?.url
    }, [])

    const primaryLogoIndex = useMemo(() => {
        if (!Array.isArray(brandLogos) || brandLogos.length === 0) return null

        const explicitPrimaryUrl = (brandKit?.logo_url || '').trim()
        if (explicitPrimaryUrl) {
            const explicitMatchIndex = brandLogos.findIndex((logo) => resolveBrandLogoUrl(logo) === explicitPrimaryUrl)
            if (explicitMatchIndex >= 0) return explicitMatchIndex
        }

        const selectedMatchIndex = brandLogos.findIndex((logo) => {
            if (typeof logo === 'string') return false
            return logo?.selected !== false
        })
        if (selectedMatchIndex >= 0) return selectedMatchIndex

        return 0
    }, [brandKit?.logo_url, brandLogos, resolveBrandLogoUrl])

    const primaryLogo = useMemo(() => {
        if (primaryLogoIndex !== null) {
            return resolveBrandLogoUrl(brandLogos[primaryLogoIndex]) || brandKit?.logo_url
        }
        return brandKit?.logo_url
    }, [brandKit?.logo_url, brandLogos, primaryLogoIndex, resolveBrandLogoUrl])

    const slideVariantSources = useMemo(() => {
        const originalSlides = Array.isArray(originalScriptSlides) && originalScriptSlides.length > 0
            ? originalScriptSlides
            : (Array.isArray(previewScriptSlides) ? previewScriptSlides : [])
        if (originalSlides.length === 0) return []

        return [
            {
                id: 'original',
                label: 'Original',
                tone: 'Base actual',
                slides: originalSlides,
            },
            ...(Array.isArray(suggestions) ? suggestions : []).map((suggestion, index) => ({
                id: `suggestion-${index}`,
                label: suggestion.title,
                tone: suggestion.subtitle,
                slides: Array.isArray(suggestion.slides) ? suggestion.slides : [],
            }))
        ].filter((source) => source.slides.length > 0)
    }, [originalScriptSlides, previewScriptSlides, suggestions])

    // Get brand colors
    const brandColors = (brandKit?.colors || []).filter(c => c.color)

    // Get brand images
    const brandImages = (brandKit?.images || []).filter(img => img.url)
    const normalizedBrandImages = brandImages.map((img, idx) => ({
        id: img.url,
        url: img.url,
        name: `Imagen ${idx + 1}`
    }))
    const normalizedBrandLogos = brandLogos
        .map((logo, idx) => {
            const url = typeof logo === 'string' ? logo : logo?.url
            if (!url) return null
            const logoName =
                typeof logo === 'string'
                    ? `Logo ${idx + 1}`
                    : 'name' in logo && typeof logo.name === 'string' && logo.name.trim()
                        ? logo.name
                        : `Logo ${idx + 1}`
            return {
                id: `logo-${idx}`,
                url,
                name: logoName
            }
        })
        .filter((logo): logo is { id: string; url: string; name: string } => Boolean(logo))

    const handleSlideCountChange = (delta: number) => {
        const newCount = Math.max(0, Math.min(15, slideCount + delta))
        setSlideCount(newCount)
        setCurrentStep((prev) => (prev < 2 ? 2 : prev))
        if (prompt.trim()) {
            markStructuralReanalysisNeeded()
        }
    }

    const refreshBrandColorsFromKit = () => {
        setSelectedColors(getDefaultSelectedColorsFromBrandKit())
    }

    const handleSelectLogo = (logoId: string | null) => {
        setSelectedLogoId(logoId)
    }

    const handleAiDescriptionChange = (description: string) => {
        setAiImageDescription(description)
    }

    const handleStylePresetChange = useCallback((preset: { id: string; name?: string } | null) => {
        if (!preset) {
            pendingStylePresetSelectionRef.current = null
            setSelectedStylePresetId(null)
            setSelectedStylePresetName(null)
            return
        }

        const previousStyleIds = [...uploadedImages, ...selectedBrandKitImageIds].filter(
            (id) => hasStyleRole(referenceImageRoles[id])
        )
        if (previousStyleIds.length > 0) {
            setUploadedImages((prev) => prev.filter((id) => !previousStyleIds.includes(id)))
            setSelectedBrandKitImageIds((prev) => prev.filter((id) => !previousStyleIds.includes(id)))
        }

        pendingStylePresetSelectionRef.current = preset.id
        setReferenceImageRoles((prev) => {
            const next = { ...prev }
            previousStyleIds.forEach((id) => delete next[id])
            return next
        })
        lastAutoStyleRef.current = null
        setSelectedStylePresetId(preset.id)
        setSelectedStylePresetName(preset.name || 'Estilo')
        setImageError(null)
    }, [referenceImageRoles, selectedBrandKitImageIds, uploadedImages])

    const hasStyleRole = (role?: ReferenceImageRole) => role === 'style' || role === 'style_content'
    const findActiveStyleReference = (
        uploadedIds: string[],
        brandKitIds: string[],
        roles: Record<string, ReferenceImageRole>
    ) => [...uploadedIds, ...brandKitIds].find((id) => hasStyleRole(roles[id]))

    const analyzeStyleReference = async (imageRef: string) => {
        if (!imageRef || pendingStylePresetSelectionRef.current) return
        const cached = styleAnalysisCacheRef.current[imageRef]
        if (cached) {
            setStyleAnalysisDescription(cached)
            return
        }

        setIsImageAnalyzing(true)
        setImageError(null)
        try {
            const auditFlowId = getAuditFlowId?.()
            const payload = imageRef.startsWith('data:image/')
                ? { imageBase64: imageRef, auditFlowId }
                : { imageUrl: imageRef, auditFlowId }
            const response = await fetch('/api/analyze-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const result = await response.json()
            if (!result?.success || !result?.data) {
                throw new Error(result?.error || 'No se pudo analizar la referencia de estilo.')
            }
            const analysis = result.data as VisionAnalysis
            const priority5Block = buildPriority5StyleBlockFromAnalysis(analysis)
            if (!priority5Block) return
            styleAnalysisCacheRef.current[imageRef] = priority5Block
            setStyleAnalysisDescription(priority5Block)
        } catch (error) {
            setImageError(error instanceof Error ? error.message : 'Error analizando referencia de estilo')
        } finally {
            setIsImageAnalyzing(false)
        }
    }

    const getDefaultRoleForNewImage = (): ReferenceImageRole => 'content'

    const handleImageSourceModeChange = (mode: 'upload' | 'brandkit' | 'generate') => {
        setImageSourceMode(mode)
    }

    // TRACK last initialized brand kit for colors
    const [lastInitBrandId, setLastInitBrandId] = useState<string | null>(null)

    // INITIALIZE default colors from brand kit
    useEffect(() => {
        const legacyBrandKit = brandKit as LegacyBrandKitFields | null | undefined
        const currentBrandId = brandKit?.id || legacyBrandKit?._id
        if (!brandKit || !currentBrandId) return

        const shouldInitializeColors = currentBrandId !== lastInitBrandId || selectedColors.length === 0
        if (!shouldInitializeColors) return

        // Only run if the Brand Kit ID has changed
        // Avoid overwriting state while a persisted session for this scope is being restored.
        if (activeWorkSession?.snapshot && !hasHydratedSession) return

        console.log(`[CarouselControlsPanel] Initializing colors for Brand Kit: ${currentBrandId}`)

        // Reset reference/style analysis state to avoid leaking prompt/style data between Brand Kits
        setSelectedBrandKitImageIds([])
        setUploadedImages([])
        setReferenceImageRoles({})
        setImageSourceMode('upload')
        setAiImageDescription('')
        setStyleAnalysisDescription('')
        setCustomStyle('')
        setApplyStyleToTypography(false)
        setSelectedStylePresetId(null)
        setSelectedStylePresetName(null)
        setImageError(null)
        styleAnalysisCacheRef.current = {}
        lastAutoStyleRef.current = null

        const defaultColors = getDefaultSelectedColorsFromBrandKit()
        if (defaultColors.length > 0) {
            console.log(`[CarouselControlsPanel] Setting ${defaultColors.length} default colors`)
            setSelectedColors(defaultColors)
        } else {
            console.log('[CarouselControlsPanel] No colors found in Brand Kit, starting empty')
            setSelectedColors([])
        }

        // 2. Initialize Logo - Follow the primary logo defined in Brand Kit
        if (brandKit.logos && brandKit.logos.length > 0) {
            setSelectedLogoId(primaryLogoIndex !== null ? `logo-${primaryLogoIndex}` : null)
        }

        setCtaUrlEnabled(Boolean(brandKit.cta_url_enabled && brandKit.url))
        setCtaUrl(brandKit.url?.trim() || '')
        setSelectedContactFields({})

        setLastInitBrandId(currentBrandId)
    }, [brandKit, lastInitBrandId, activeWorkSession, hasHydratedSession, primaryLogoIndex, selectedColors.length, getDefaultSelectedColorsFromBrandKit])

    useEffect(() => {
        if (!onReferenceImagesChange) return
        const uploaded = uploadedImages.map(url => ({ url, source: 'upload' as const }))
        const brandkit = selectedBrandKitImageIds.map(url => ({ url, source: 'brandkit' as const }))
        onReferenceImagesChange([...uploaded, ...brandkit])
    }, [uploadedImages, selectedBrandKitImageIds, onReferenceImagesChange])

    useEffect(() => {
        if (!selectedStylePresetDetails?.analysis) return
        if (!selectedStylePresetId) return

        const priority5Block = buildPriority5StyleBlockFromAnalysis(selectedStylePresetDetails.analysis as VisionAnalysis)
        if (!priority5Block) return

        pendingStylePresetSelectionRef.current = null
        lastAutoStyleRef.current = null
        setStyleAnalysisDescription(priority5Block)
        setImageError(null)
    }, [selectedStylePresetDetails, selectedStylePresetId])

    useEffect(() => {
        if (selectedStylePresetId || pendingStylePresetSelectionRef.current) return
        const activeStyleRef = findActiveStyleReference(
            uploadedImages,
            selectedBrandKitImageIds,
            referenceImageRoles
        )

        if (!activeStyleRef) {
            lastAutoStyleRef.current = null
            setStyleAnalysisDescription('')
            return
        }

        if (lastAutoStyleRef.current === activeStyleRef && styleAnalysisCacheRef.current[activeStyleRef]) {
            return
        }

        lastAutoStyleRef.current = activeStyleRef
        void analyzeStyleReference(activeStyleRef)
    }, [uploadedImages, selectedBrandKitImageIds, referenceImageRoles, selectedStylePresetId])

    useEffect(() => {
        const selectedPresetPreview =
            (selectedStylePresetId
                ? stylePresets.find((preset) => preset._id === selectedStylePresetId)?.image_url
                : null)
            || selectedStylePresetDetails?.image_url
            || null

        onReferencePreviewStateChange?.({
            uploadedImages,
            selectedBrandKitImageIds,
            referenceImageRoles,
            imageSourceMode,
            selectedStylePresetId,
            selectedStylePresetImageUrl: selectedPresetPreview
        })
    }, [
        uploadedImages,
        selectedBrandKitImageIds,
        referenceImageRoles,
        imageSourceMode,
        selectedStylePresetId,
        selectedStylePresetDetails,
        stylePresets,
        onReferencePreviewStateChange
    ])

    useEffect(() => {
        const nextId = analysisStructure?.id || null
        if (nextId && nextId !== lastAnalysisStructureId) {
            setLastAnalysisStructureId(nextId)
            setHasUserSelectedStructure(false)
        }
    }, [analysisStructure, lastAnalysisStructureId])

    useEffect(() => {
        if (!structures.length) return
        if (hasUserSelectedStructure) return
        if (!structureId || !structures.some((s) => s.id === structureId)) {
            const next = analysisStructure?.id && structures.some((s) => s.id === analysisStructure.id)
                ? analysisStructure.id
                : structures[0]?.id
            if (next) setStructureId(next)
        }
    }, [structures, analysisStructure, hasUserSelectedStructure, structureId])

    useEffect(() => {
        if (compositions.length === 0) return
        setCompositionId(
            pickCompositionId(
                compositions,
                compositionMode,
                compositionId,
                `${structureId}|0`
            )
        )
    }, [structureId, compositionMode, compositionId, compositions])

    useEffect(() => {
        if (!basicSelectedCompositionId) return
        if (basicCompositions.some((composition) => composition.id === basicSelectedCompositionId)) return
        setBasicSelectedCompositionId(null)
    }, [basicSelectedCompositionId, basicCompositions])

    useEffect(() => {
        if (compositionMode !== 'basic') return
        const autoId = pickCompositionId(
            compositions,
            'basic',
            compositionId,
            `${structureId}|0`
        )
        if (autoId !== compositionId) {
            setCompositionId(autoId)
        }
    }, [compositionMode, structureId, compositionId, compositions])

    useEffect(() => {
        if (!structureId || !compositionId) return
        onPreviewCompositionChange?.({ structureId, compositionId })
    }, [structureId, compositionId, onPreviewCompositionChange])

    useEffect(() => {
        if (showAllSteps) {
            setCurrentStep(7)
        }
    }, [showAllSteps])

    useEffect(() => {
        if (!analysisReady) return
        setNeedsReanalysis(false)
        setCurrentStep(7)
        setLastAnalyzedSignature(buildStructuralSignature())
    }, [analysisReady, analysisHook, buildStructuralSignature])

    useEffect(() => {
        if (!lastAnalyzedSignature) return
        const currentSignature = buildStructuralSignature()
        if (currentSignature !== lastAnalyzedSignature) {
            markStructuralReanalysisNeeded()
        }
    }, [lastAnalyzedSignature, buildStructuralSignature, markStructuralReanalysisNeeded])

    useEffect(() => {
        if (showAllSteps) return
        if (compositionMode !== 'basic') return
        if (currentStep < 3) return
        setCurrentStep(prev => (prev < 4 ? 4 : prev))
    }, [compositionMode, currentStep, showAllSteps])

    useEffect(() => {
        if (!showAllSteps && hasReferenceSelection) {
            setCurrentStep(prev => (prev < 6 ? 6 : prev))
        }
    }, [hasReferenceSelection, showAllSteps])

    useEffect(() => {
        if (!slideCountOverride) return
        if (slideCountOverride === slideCount) {
            onSlideCountOverrideApplied?.()
            return
        }
        const newCount = Math.max(1, Math.min(15, slideCountOverride))
        setSlideCount(newCount)
        if (prompt.trim()) {
            setNeedsReanalysis(true)
            setCurrentStep((prev) => (prev < 2 ? 2 : prev))
        } else {
            setCurrentStep((prev) => (prev < 2 ? 2 : prev))
        }
        onSlideCountOverrideApplied?.()
    }, [
        slideCountOverride,
        slideCount,
        prompt,
        onSlideCountOverrideApplied
    ])

    useEffect(() => {
        if (showAllSteps) return
        const target = stepRefs.current[currentStep]
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }, [currentStep, showAllSteps])

    const handleAspectRatioSelect = (ratio: '1:1' | '4:5' | '3:4') => {
        setAspectRatio(ratio)
        onAspectRatioChange?.(ratio)
        setCurrentStep(prev => (prev < 5 ? 5 : prev))
    }

    const toggleColor = (color: string) => {
        setSelectedColors(prev => {
            // Sequence: Acento -> Texto -> Fondo -> Deseleccionar
            const roles: Array<'Acento' | 'Texto' | 'Fondo'> = ['Acento', 'Texto', 'Fondo']
            const index = prev.findIndex(c => c.color.toLowerCase() === color.toLowerCase())

            if (index === -1) {
                // First click: Add with brand kit role or default to Acento
                const brandColor = brandKit?.colors?.find(c => c.color.toLowerCase() === color.toLowerCase())
                const role = (brandColor?.role || 'Acento') as 'Texto' | 'Fondo' | 'Acento'
                return [...prev, { color, role }]
            } else {
                const roles: Array<'Acento' | 'Texto' | 'Fondo'> = ['Acento', 'Texto', 'Fondo']
                const currentRole = prev[index].role
                const roleIndex = roles.indexOf(currentRole)

                // Sequence: Non-standard -> Acento (0) -> Texto (1) -> Fondo (2) -> Back to Acento (0)
                // The only way to remove is via handleRemoveBrandColor (X button)
                if (roleIndex === -1 || roleIndex === roles.length - 1) {
                    const nextRole = roles[0]
                    const newColors = [...prev]
                    newColors[index] = { ...newColors[index], role: nextRole }
                    console.log(`[Carousel] Role cycle: ${currentRole} -> ${nextRole}`)
                    return newColors
                } else {
                    // Cycle to next role
                    const newRole = roles[roleIndex + 1]
                    const newColors = [...prev]
                    newColors[index] = { ...newColors[index], role: newRole }
                    console.log(`[Carousel] Role cycle: ${currentRole} -> ${newRole}`)
                    return newColors
                }
            }
        })
    }

    const handleAddCustomColor = (color: string) => {
        console.log('[Carousel] handleAddCustomColor request:', color)
        const role: 'Texto' | 'Fondo' | 'Acento' = 'Acento'
        setSelectedColors(prev => {
            const exists = prev.some(c => c.color.toLowerCase() === color.toLowerCase())
            if (exists) {
                console.log('[Carousel] Color already exists, skipping add')
                return prev
            }
            const newColors = [...prev, { color, role }]
            console.log('[Carousel] New selectedColors after ADD:', newColors.map(c => c.color))
            return newColors
        })
    }

    const handleRemoveBrandColor = (color: string) => {
        console.log('[Carousel] handleRemoveBrandColor attempt:', color)
        setSelectedColors(prev => {
            const before = prev.length
            const newColors = prev.filter(c => c.color.toLowerCase() !== color.toLowerCase())
            const after = newColors.length
            console.log(`[Carousel] Color removed: ${color}. List size ${before} -> ${after}`)
            if (before === after) {
                console.warn('[Carousel] NO COLOR WAS REMOVED! Mismatch?', color, 'vs', prev.map(c => c.color))
            }
            return newColors
        })
    }

    const primaryEmail = useMemo(() => {
        const emails = (brandKit as LegacyBrandKitFields | null | undefined)?.emails
        if (!Array.isArray(emails)) return ''
        return String(emails.find((value: unknown) => typeof value === 'string' && value.trim()) || '').trim()
    }, [brandKit])

    const phoneValues = useMemo(() => {
        const phones = (brandKit as LegacyBrandKitFields | null | undefined)?.phones
        if (!Array.isArray(phones)) return [] as string[]
        return phones.map((value: unknown) => String(value || '').trim()).filter(Boolean)
    }, [brandKit])

    const addressValues = useMemo(() => {
        const addresses = (brandKit as LegacyBrandKitFields | null | undefined)?.addresses
        if (!Array.isArray(addresses)) return [] as string[]
        return addresses.map((value: unknown) => String(value || '').trim()).filter(Boolean)
    }, [brandKit])

    const getContactFieldValue = useCallback((fieldId: string) => selectedContactFields[fieldId] || '', [selectedContactFields])

    const setContactFieldChecked = useCallback((fieldId: string, value: string, checked: boolean) => {
        setSelectedContactFields((prev) => {
            if (checked) {
                return {
                    ...prev,
                    [fieldId]: prev[fieldId] || value,
                }
            }
            const next = { ...prev }
            delete next[fieldId]
            return next
        })
    }, [])

    const updateContactFieldValue = useCallback((fieldId: string, value: string) => {
        setSelectedContactFields((prev) => ({
            ...prev,
            [fieldId]: value,
        }))
    }, [])

    const brandColorsByRole = useMemo(() => {
        const grouped: Record<BrandColorRole, string[]> = {
            Texto: [],
            Fondo: [],
            Acento: [],
        }

        selectedColors.forEach((item) => {
            const normalized = normalizeHexColor(item.color)
            const role = item.role === 'Texto' || item.role === 'Fondo' ? item.role : 'Acento'
            if (!grouped[role].includes(normalized)) {
                grouped[role].push(normalized)
            }
        })

        return grouped
    }, [selectedColors])

    const removeBrandColor = useCallback((colorRaw: string) => {
        handleRemoveBrandColor(normalizeHexColor(colorRaw))
    }, [handleRemoveBrandColor])

    const replaceRoleColor = useCallback((role: BrandColorRole, nextColorRaw: string, previousColor?: string) => {
        const nextColor = normalizeHexColor(nextColorRaw)
        const prevColor = previousColor ? normalizeHexColor(previousColor) : null

        setSelectedColors((prev) => {
            const withoutPrevious = prev.filter((item) => {
                const itemColor = normalizeHexColor(item.color)
                if (prevColor && itemColor === prevColor && itemColor !== nextColor) return false
                if (role !== 'Acento' && item.role === role && itemColor !== prevColor && itemColor !== nextColor) return false
                return true
            })

            const existingIndex = withoutPrevious.findIndex((item) => normalizeHexColor(item.color) === nextColor)
            if (existingIndex !== -1) {
                const next = [...withoutPrevious]
                next[existingIndex] = { ...next[existingIndex], color: nextColor, role }
                return next
            }
            return [...withoutPrevious, { color: nextColor, role }]
        })
    }, [])

    const addAccentColor = useCallback((nextColorRaw: string) => {
        const nextColor = normalizeHexColor(nextColorRaw)
        if (brandColorsByRole.Acento.length >= 5) return
        setSelectedColors((prev) => {
            const existingIndex = prev.findIndex((item) => normalizeHexColor(item.color) === nextColor)
            if (existingIndex !== -1) {
                const next = [...prev]
                next[existingIndex] = { ...next[existingIndex], role: 'Acento' }
                return next
            }
            return [...prev, { color: nextColor, role: 'Acento' }]
        })
    }, [brandColorsByRole.Acento.length])

    const swapBrandColorRoles = useCallback((
        source: { role: BrandColorRole; color: string },
        targetRole: BrandColorRole,
        explicitTargetColor?: string
    ) => {
        const sourceColor = normalizeHexColor(source.color)
        const sourceRole = source.role
        const targetColor = explicitTargetColor ? normalizeHexColor(explicitTargetColor) : null

        // Same role (e.g. both Accents) → swap positions in array
        if (sourceRole === targetRole && targetColor && targetColor !== sourceColor) {
            setSelectedColors((prev) => {
                const idxA = prev.findIndex(c => normalizeHexColor(c.color) === sourceColor)
                const idxB = prev.findIndex(c => normalizeHexColor(c.color) === targetColor)
                if (idxA === -1 || idxB === -1) return prev
                const next = [...prev]
                const temp = next[idxA]
                next[idxA] = next[idxB]
                next[idxB] = temp
                return next
            })
            return
        }

        setSelectedColors((prev) => prev.map((item) => {
            const itemColor = normalizeHexColor(item.color)
            if (itemColor === sourceColor) {
                return { ...item, role: targetRole }
            }
            if (targetColor && itemColor === targetColor) {
                return { ...item, role: sourceRole }
            }
            return item
        }))
    }, [])

    const toggleBrandKitImage = (id: string, roleHint: ReferenceImageRole = 'content') => {
        setSelectedBrandKitImageIds((prev) => {
            if (prev.includes(id)) {
                setReferenceImageRoles((prevRoles) => {
                    const next = { ...prevRoles }
                    delete next[id]
                    return next
                })
                return prev.filter((u) => u !== id)
            }

            const nextBrandKit = [...prev, id]
            setReferenceImageRoles((prevRoles) => {
                const next = { ...prevRoles }
                next[id] = roleHint
                return next
            })
            return nextBrandKit
        })
    }

    const handleUploadImage = async (file: File, roleHint?: ReferenceImageRole) => {
        const maxTotal = 10
        const totalSelected = uploadedImages.length + selectedBrandKitImageIds.length
        if (totalSelected >= maxTotal) return

        setIsImageAnalyzing(true)
        setImageError(null)
        try {
            const base64 = await resizeImage(file, {
                maxWidth: 1536,
                maxHeight: 1536,
                quality: 0.8,
                format: 'image/jpeg'
            })
            setUploadedImages((prev) => {
                const nextUploaded = [...prev, base64]
                setReferenceImageRoles((prevRoles) => {
                    const next = { ...prevRoles }
                    next[base64] = roleHint || getDefaultRoleForNewImage()
                    return next
                })
                return nextUploaded
            })
        } catch (error) {
            setImageError(error instanceof Error ? error.message : t('ui.uploadImageError', { defaultValue: 'Error uploading image' }))
        } finally {
            setIsImageAnalyzing(false)
        }
    }

    const removeUploadedImage = (url: string) => {
        setUploadedImages(prev => prev.filter(u => u !== url))
        setReferenceImageRoles(prev => {
            const next = { ...prev }
            delete next[url]
            return next
        })
    }

    const clearUploadedImages = () => {
        setReferenceImageRoles((prev) => {
            const next = { ...prev }
            uploadedImages.forEach((id) => delete next[id])
            return next
        })
        setUploadedImages([])
    }
    const clearBrandKitImages = () => {
        setReferenceImageRoles((prev) => {
            const next = { ...prev }
            selectedBrandKitImageIds.forEach((id) => delete next[id])
            return next
        })
        setSelectedBrandKitImageIds([])
    }

    const setReferenceImageRole = (imageId: string, role: ReferenceImageRole) => {
        const isStyleSelection = role === 'style' || role === 'style_content'
        const normalizedRole: ReferenceImageRole = isStyleSelection ? 'style' : role

        if (isStyleSelection) {
            const previousStyleIds = [...uploadedImages, ...selectedBrandKitImageIds].filter(
                (id) => id !== imageId && hasStyleRole(referenceImageRoles[id])
            )

            if (previousStyleIds.length > 0) {
                setUploadedImages((prev) => prev.filter((id) => !previousStyleIds.includes(id)))
                setSelectedBrandKitImageIds((prev) => prev.filter((id) => !previousStyleIds.includes(id)))
            }
        }

        setReferenceImageRoles((prev) => {
            const next = { ...prev }

            if (isStyleSelection) {
                Object.keys(next).forEach((id) => {
                    if (id === imageId) return
                    if (hasStyleRole(next[id])) {
                        delete next[id]
                    }
                })
            }

            next[imageId] = normalizedRole
            return next
        })

        if (isStyleSelection) {
            pendingStylePresetSelectionRef.current = null
            setSelectedStylePresetId(null)
            setSelectedStylePresetName(null)
        }
    }

    const handleContentUpload = (file: File) => {
        return handleUploadImage(file, 'content')
    }

    const handleStyleUpload = (file: File) => {
        return handleUploadImage(file, 'style')
    }

    const handleAuxLogoUpload = (file: File) => {
        return handleUploadImage(file, 'logo')
    }

    const toggleBrandKitContentImage = (id: string) => {
        toggleBrandKitImage(id, 'content')
    }

    const toggleBrandKitStyleImage = (id: string) => {
        const isSelected = selectedBrandKitImageIds.includes(id)
        if (!isSelected) {
            const previousStyleIds = [...uploadedImages, ...selectedBrandKitImageIds].filter(
                (currentId) => hasStyleRole(referenceImageRoles[currentId])
            )
            if (previousStyleIds.length > 0) {
                setUploadedImages((prev) => prev.filter((currentId) => !previousStyleIds.includes(currentId)))
                setSelectedBrandKitImageIds((prev) => prev.filter((currentId) => !previousStyleIds.includes(currentId)))
                setReferenceImageRoles((prev) => {
                    const next = { ...prev }
                    previousStyleIds.forEach((currentId) => delete next[currentId])
                    return next
                })
            }
        }
        toggleBrandKitImage(id, 'style')
    }

    const toggleBrandKitAuxLogo = (id: string) => {
        toggleBrandKitImage(id, 'logo')
    }

    const handleEditSlide = (index: number) => {
        setEditingSlide(index)
        setEditText(slides[index]?.customText || '')
    }

    const handleSaveSlideEdit = () => {
        if (editingSlide !== null) {
            const newSlides = [...slides]
            if (!newSlides[editingSlide]) {
                newSlides[editingSlide] = { index: editingSlide }
            }
            newSlides[editingSlide].customText = editText || undefined
            setSlides(newSlides)
            setEditingSlide(null)
            setEditText('')
        }
    }

    const resolveSelectedLogoUrl = () => {
        if (!selectedLogoId) return primaryLogo
        const match = selectedLogoId.match(/^logo-(\d+)$/)
        if (match) {
            const idx = Number(match[1])
            const entry = brandLogos[idx]
            if (!entry) return primaryLogo
            return typeof entry === 'string' ? entry : entry?.url || primaryLogo
        }
        return primaryLogo
    }

    useEffect(() => {
        if (!onSelectedLogoChange) return
        onSelectedLogoChange(selectedLogoId, resolveSelectedLogoUrl())
    }, [selectedLogoId, brandLogos, primaryLogo, onSelectedLogoChange])

    const buildSettings = (overrides: Partial<CarouselSettings> = {}) => {
        const promptValue = overrides.prompt ?? prompt
        const slideCountValue = overrides.slideCount ?? slideCount
        const structureIdValue = overrides.structureId ?? structureId
        const resolvedCompositionId = pickCompositionId(
            compositions,
            compositionMode,
            overrides.compositionId ?? compositionId,
            `${structureIdValue}|${promptValue.trim()}|${slideCountValue}`
        )

        const finalSlides = slides.length === slideCountValue
            ? slides
            : Array.from({ length: slideCountValue }, (_, i) => slides[i] || { index: i })

        const allReferenceImageIds = [...uploadedImages, ...selectedBrandKitImageIds]
        const selectedReferenceImages = allReferenceImageIds
            .map((url) => ({
                url,
                role: referenceImageRoles[url] || 'content' as ReferenceImageRole
            }))
            .filter((item) => {
                if (imageSourceMode === 'generate' && item.role === 'content') return false
                return true
            })
            .sort((a, b) => {
                const priority: Record<ReferenceImageRole, number> = {
                    style: 0,
                    style_content: 1,
                    logo: 2,
                    content: 3
                }
                return priority[a.role] - priority[b.role]
            })

        const mergedStyleDirectives = mergeCustomStyleIntoStyleDirectives(
            styleAnalysisDescription,
            customStyle
        )
        const orderedContactIds = [
            'contact-email-main',
            ...phoneValues.map((_, idx) => `contact-phone-${idx}`),
            ...addressValues.map((_, idx) => `contact-address-${idx}`)
        ]
        const finalContactLines = orderedContactIds
            .map((fieldId) => (selectedContactFields[fieldId] || '').trim())
            .filter(Boolean)
            .slice(0, 4)

        const baseSettings = {
            prompt: promptValue,
            slideCount: slideCountValue,
            aspectRatio: overrides.aspectRatio ?? aspectRatio,
            style: STYLE_OPTIONS.find(s => s.id === style)?.label || 'Minimalista',
            slides: finalSlides,
            compositionId: resolvedCompositionId,
            structureId: structureIdValue,
            imageSourceMode: overrides.imageSourceMode ?? imageSourceMode,
            aiImageDescription: (overrides.aiImageDescription ?? aiImageDescription).trim() || undefined,
            aiStyleDirectives: mergedStyleDirectives || undefined,
            customStyleText: (customStyle || '').trim() || undefined,
            applyStyleToTypography,
            selectedLogoUrl: resolveSelectedLogoUrl(),
            selectedColors: selectedColors.length > 0 ? selectedColors : brandColors.slice(0, 3).map(c => ({
                color: c.color,
                role: (c.role || 'Acento') as BrandColorRole
            })),
            selectedReferenceImages,
            selectedImageUrls: selectedReferenceImages.map((item) => item.url),
            includeLogoOnSlides,
            ctaUrlEnabled,
            ctaUrl: ctaUrl.trim() || undefined,
            selectedContactFields,
            finalContactLines
        }
        return { ...baseSettings, ...overrides }
    }

    useEffect(() => {
        registerSettingsResolver?.(buildSettings)

        return () => {
            registerSettingsResolver?.(null)
        }
    }, [buildSettings, registerSettingsResolver])

    const handleGenerate = () => {
        if (!prompt.trim() || slideCount < 1) return
        const settings = buildSettings()
        if (compositionMode === 'basic' && settings.compositionId !== compositionId) {
            setCompositionId(settings.compositionId)
        }
        onPreviewCompositionChange?.({
            structureId: settings.structureId,
            compositionId: settings.compositionId
        })
        onGenerate(settings)
    }

    const handleInspire = async () => {
        const legacyBrandKit = brandKit as LegacyBrandKitFields | null | undefined
        const brandKitId = brandKit?.id || legacyBrandKit?._id
        if (!brandKitId || isInspiring) return
        setIsInspiring(true)
        try {
            const res = await fetch('/api/generate-user-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ module: 'carousel', brandKitId }),
            })
            const data = await res.json()
            if (data.success && data.text) {
                setPrompt(data.text)
            }
        } catch (err) {
            console.error('Failed to generate carousel prompt inspiration:', err)
        } finally {
            setIsInspiring(false)
        }
    }

    const handleAnalyze = async () => {
        if (!prompt.trim() || slideCount < 1) return
        if (generatedCount > 0) {
            onInvalidatePreview?.()
        }
        const settings = buildSettings()
        if (compositionMode === 'basic' && settings.compositionId !== compositionId) {
            setCompositionId(settings.compositionId)
        }
        onPreviewCompositionChange?.({
            structureId: settings.structureId,
            compositionId: settings.compositionId
        })
        await ensureCarouselSessionForAnalyze()
        await onAnalyze(settings)
        setNeedsReanalysis(false)
        setLastAnalyzedSignature(buildStructuralSignature())
    }

    const canRequireReanalysis = hasStructuralAnalysis || analysisReady || generatedCount > 0 || currentStep >= 6
    const primaryActionRequiresReanalysis = needsReanalysis && canRequireReanalysis

    useEffect(() => {
        onReanalysisStateChange?.(primaryActionRequiresReanalysis)
    }, [primaryActionRequiresReanalysis, onReanalysisStateChange])

    return (
        <div className={cn(STUDIO_CONTROLS_SHELL_CLASS, className)}>
            <div className="thin-scrollbar flex-1 overflow-y-auto pl-4 pr-0 -mr-[2px] pt-4 md:pl-5 md:pr-0 md:pt-5">
                <div className="flex flex-col gap-3 pr-4 pb-10 md:pr-5 md:pb-12">
                {/* SECTION: Sessions */}
                <div className={cn(PANEL_SECTION_DIVIDER_BASE_CLASS, PANEL_SECTION_ACCENTS.history, 'order-last pb-0')}>
                    <SessionsSection
                        isSavingSession={isSavingSession}
                        saveError={saveError}
                        hasUnsavedChanges={hasUnsavedChanges}
                        lastSavedAt={lastSavedAt}
                        userId={userId}
                        scopedBrandId={scopedBrandId}
                        isHydratingSession={isHydratingSession}
                        handleSaveNow={handleSaveNow}
                        selectedSessionToLoad={selectedSessionToLoad}
                        setSelectedSessionToLoad={setSelectedSessionToLoad}
                        currentSessionId={currentSessionId}
                        handleLoadSession={handleLoadSession}
                        buildDisplaySessionTitle={buildDisplaySessionTitle}
                        activeSessionMeta={activeSessionMeta}
                        workSessions={workSessions}
                        createNewCarouselSession={createNewCarouselSession}
                        handleRenameCurrentSession={handleRenameCurrentSession}
                        handleDeleteCurrentSession={handleDeleteCurrentSession}
                        handleClearAllSessions={handleClearAllSessions}
                    />
                </div>

                {/* Slide Count */}
                {isStepVisible(1) && (
                <div ref={(el) => { stepRefs.current[1] = el }} className={cn(PANEL_SECTION_STACK_CLASS, 'before:hidden after:hidden pt-0')}>
                    <SlideCountSection slideCount={slideCount} onChange={handleSlideCountChange} />
                </div>
                )}

                {/* Prompt */}
                {isStepVisible(2) && (
                <div ref={(el) => { stepRefs.current[2] = el }} className={cn(PANEL_SECTION_STACK_CLASS, PANEL_SECTION_ACCENTS.idea)}>
                    <SectionHeader
                        icon={IconIdea}
                        title={t('ui.whatToCreate')}
                        iconContainerClassName={PANEL_SECTION_HEADER_ICON_CLASS}
                        titleClassName={PANEL_SECTION_HEADER_TITLE_CLASS}
                    />
                    <div className="relative">
                        <Textarea
                            placeholder={t('ui.promptPlaceholder')}
                            value={prompt}
                            onChange={(e) => {
                                const nextPrompt = e.target.value
                                setPrompt(nextPrompt)
                                markStructuralReanalysisNeeded()
                                setCurrentStep((prev) => (prev < 2 ? 2 : prev))
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    if (canAnalyze) {
                                        handleAnalyze()
                                    }
                                }
                            }}
                            className="min-h-[132px] rounded-2xl border border-border/70 bg-background/90 px-4 py-3 !text-[14px] leading-[1.45] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/18 pb-14 pr-3"
                        />
                        <div className="absolute left-2 right-2 bottom-2 flex items-center gap-3">
                            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                                {brandKit ? (
                                    <button
                                        type="button"
                                        onClick={handleInspire}
                                        disabled={isInspiring}
                                        className={cn('inline-flex min-w-0 items-center gap-1.5', PANEL_TEXT_BUTTON_REVEAL_CLASS)}
                                    >
                                        {isInspiring ? (
                                            <Loader2 className="h-3.5 w-3.5 shrink-0" />
                                        ) : (
                                            <IconWand className="h-3.5 w-3.5 shrink-0" />
                                        )}
                                        <span className="truncate">{t('inspireMe')}</span>
                                    </button>
                                ) : null}
                                <div className="flex min-w-[146px] items-center justify-start gap-2">
                                    {isAnalyzing && onCancelAnalyze ? (
                                        <>
                                            <Button
                                                type="button"
                                                variant="link"
                                                onClick={onCancelAnalyze}
                                                className="min-h-[42px] rounded-[1rem] px-4 text-[clamp(0.9rem,0.86rem+0.1vw,0.96rem)] font-semibold text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                            >
                                                {t('ui.stop')}
                                            </Button>
                                            <motion.span
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: isCancelingAnalyze ? 1 : 0 }}
                                                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
                                                className="text-[clamp(0.9rem,0.86rem+0.1vw,0.96rem)] font-medium text-muted-foreground"
                                            >
                                                {t('ui.canceling')}
                                            </motion.span>
                                        </>
                                    ) : null}
                                </div>
                            </div>
                            {prompt.trim() ? (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        sessionStorage.setItem('x-studio:incoming-prompt', prompt.trim())
                                        sessionStorage.setItem('x-studio:incoming-prompt-flag', '1')
                                        router.push('/image')
                                    }}
                                    title={t('ui.sendToImage', { defaultValue: 'Usar en Imagen' })}
                                    className="h-[42px] w-[42px] shrink-0 rounded-[1rem] p-0 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                >
                                    <IconImage className="h-4 w-4" />
                                </Button>
                            ) : null}
                            <Button
                                size="sm"
                                onClick={handleAnalyze}
                                disabled={!canAnalyze}
                                className="group feedback-action h-[42px] shrink-0 rounded-[1rem] border border-transparent bg-primary/90 px-4 text-[clamp(0.94rem,0.9rem+0.12vw,1rem)] font-semibold text-primary-foreground shadow-[0_16px_34px_-22px_rgba(59,130,246,0.58)] transition-all hover:bg-primary hover:shadow-primary/25 sm:px-5 whitespace-nowrap"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="mr-2 h-3.5 w-3.5" />
                                        {primaryActionRequiresReanalysis
                                            ? t('ui.reanalyzing')
                                            : t('ui.analyzing')}
                                    </>
                                ) : (
                                    primaryActionRequiresReanalysis ? t('ui.reanalyze') : t('ui.analyze')
                                )}
                            </Button>
                        </div>
                    </div>
                    <SuggestionsList
                        suggestions={suggestions}
                        hasOriginalState={hasOriginalSuggestion}
                        onApply={(index) => onApplySuggestion?.(index)}
                        onUndo={() => onUndoSuggestion?.()}
                    />
                    {previewScriptSlides && previewScriptSlides.length > 0 && slideVariantSources.length > 1 && (
                        <>
                            <motion.div
                                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                                animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                                transition={shouldReduceMotion ? undefined : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                                className="rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-primary/5 p-3 shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                                            <IconLayers className="h-3 w-3" />
                                            {t('ui.advancedCompositionBadge', { defaultValue: 'Advanced composition' })}
                                        </div>
                                        <p className="text-sm font-semibold text-foreground">
                                            {t('ui.advancedCompositionTitle', { defaultValue: 'Mix the best of each proposal' })}
                                        </p>
                                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                                            {t('ui.advancedCompositionDescription', { defaultValue: 'Open a wide editor to choose the best version of each slide without fighting the side panel.' })}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => setIsAdvancedCompositionOpen(true)}
                                        className={PANEL_SECONDARY_BUTTON_CLASS}
                                    >
                                        {t('ui.openEditor', { defaultValue: 'Open editor' })}
                                    </Button>
                                </div>
                            </motion.div>

                            <AdvancedCompositionDialog
                                open={isAdvancedCompositionOpen}
                                onOpenChange={setIsAdvancedCompositionOpen}
                                previewScriptSlides={previewScriptSlides ?? []}
                                slideVariantSelection={slideVariantSelection ?? []}
                                slideVariantSources={slideVariantSources}
                                hasOriginalSuggestion={hasOriginalSuggestion}
                                onUndoSuggestion={onUndoSuggestion}
                                onApplySlideVariant={onApplySlideVariant}
                            />
                        </>
                    )}
                </div>
                )}

                {/* Composition */}
                {isStepVisible(3) && (
                <div ref={(el) => { stepRefs.current[3] = el }} className={cn(PANEL_SECTION_STACK_CLASS, PANEL_SECTION_ACCENTS.design)}>
                    <CompositionSection
                        compositionMode={compositionMode}
                        setCompositionMode={setCompositionMode}
                        compositions={compositions}
                        advancedCompositions={advancedCompositions}
                        compositionId={compositionId}
                        setCompositionId={setCompositionId}
                        structureId={structureId}
                        setStructureId={setStructureId}
                        structures={structures}
                        setHasUserSelectedStructure={setHasUserSelectedStructure}
                        markStructuralReanalysisNeeded={markStructuralReanalysisNeeded}
                        setCurrentStep={setCurrentStep}
                    />
                </div>
                )}

                {/* Format */}
                {isStepVisible(4) && (
                <div ref={(el) => { stepRefs.current[4] = el }} className={cn(PANEL_SECTION_STACK_CLASS, PANEL_SECTION_ACCENTS.format)}>
                    <FormatSection aspectRatio={aspectRatio} onSelect={handleAspectRatioSelect} />
                </div>
                )}

                {/* Image */}
                {isStepVisible(5) && (
                    <>
                        <div ref={(el) => { stepRefs.current[5] = el }} className={cn(PANEL_SECTION_STACK_CLASS, PANEL_SECTION_ACCENTS.content)}>
                            <SectionHeader
                                icon={IconImageAdd}
                                title={imageSourceMode === 'generate' ? t('ui.generatedContentTitle') : t('ui.userContentTitle')}
                                iconContainerClassName={PANEL_SECTION_HEADER_ICON_CLASS}
                                titleClassName={PANEL_SECTION_HEADER_TITLE_CLASS}
                                extra={(
                                    <Switch
                                        checked={imageSourceMode === 'generate'}
                                        onCheckedChange={(checked) => handleImageSourceModeChange(checked ? 'generate' : 'upload')}
                                        aria-label={imageSourceMode === 'generate'
                                            ? t('ui.generatedContentTitle')
                                            : t('ui.userContentTitle')}
                                    />
                                )}
                            />
                            <ContentImageCard
                                mode={imageSourceMode}
                                onModeChange={handleImageSourceModeChange}
                                uploadedImages={uploadedImages}
                                onUpload={handleContentUpload}
                                onRemoveUploadedImage={removeUploadedImage}
                                onClearUploadedImages={clearUploadedImages}
                                brandKitImages={normalizedBrandImages}
                                selectedBrandKitImageIds={selectedBrandKitImageIds}
                                onToggleBrandKitImage={toggleBrandKitContentImage}
                                onClearBrandKitImages={clearBrandKitImages}
                                referenceImageRoles={referenceImageRoles}
                                onReferenceRoleChange={setReferenceImageRole}
                                aiImageDescription={aiImageDescription}
                                onAiDescriptionChange={handleAiDescriptionChange}
                                suggestedImagePrompts={suggestedImagePrompts}
                                isAnalyzing={isImageAnalyzing}
                                error={imageError}
                                visionAnalysis={null}
                            />
                        </div>

                        <div className={cn(PANEL_SECTION_STACK_CLASS, PANEL_SECTION_ACCENTS.style)}>
                            <SectionHeader
                                icon={IconPaintbrush02}
                                title={t('ui.styleTitle')}
                                iconContainerClassName={PANEL_SECTION_HEADER_ICON_CLASS}
                                titleClassName={PANEL_SECTION_HEADER_TITLE_CLASS}
                            />
                            <StyleImageCard
                                uploadedImages={uploadedImages}
                                onUpload={handleStyleUpload}
                                onRemoveUploadedImage={removeUploadedImage}
                                brandKitImages={normalizedBrandImages}
                                selectedBrandKitImageIds={selectedBrandKitImageIds}
                                onToggleBrandKitImage={toggleBrandKitStyleImage}
                                referenceImageRoles={referenceImageRoles}
                                onReferenceRoleChange={setReferenceImageRole}
                                stylePresets={stylePresets}
                                stylePresetsStatus={stylePresetsStatus}
                                selectedStylePresetId={selectedStylePresetId}
                                selectedStylePresetName={selectedStylePresetName}
                                onSelectStylePreset={handleStylePresetChange}
                                isAnalyzing={isImageAnalyzing}
                                error={imageError}
                            />
                            <div className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-3">
                                <div className="space-y-1">
                                    <p className="text-[12px] font-medium leading-none">{t('ui.styleTypographyTitle')}</p>
                                    <p className="text-[11px] leading-snug text-muted-foreground">{t('ui.styleTypographyDescription')}</p>
                                </div>
                                <Switch
                                    checked={applyStyleToTypography}
                                    onCheckedChange={setApplyStyleToTypography}
                                    aria-label={t('ui.styleTypographyTitle')}
                                />
                            </div>
                        </div>

                        <div className={cn(PANEL_SECTION_STACK_CLASS, PANEL_SECTION_ACCENTS.logos)}>
                            <AuxiliaryLogosCard
                                uploadedImages={uploadedImages}
                                onUpload={handleAuxLogoUpload}
                                onRemoveUploadedImage={removeUploadedImage}
                                brandKitImages={normalizedBrandImages}
                                brandKitLogos={normalizedBrandLogos}
                                selectedBrandKitImageIds={selectedBrandKitImageIds}
                                onToggleBrandKitImage={toggleBrandKitAuxLogo}
                                referenceImageRoles={referenceImageRoles}
                                onReferenceRoleChange={setReferenceImageRole}
                            />
                        </div>

                        <div className={cn(PANEL_SECTION_STACK_CLASS, PANEL_SECTION_ACCENTS.brand)}>
                            <SectionHeader
                                icon={IconFingerprint}
                                title={t('ui.brandKitTitle')}
                                iconContainerClassName={PANEL_SECTION_HEADER_ICON_CLASS}
                                titleClassName={PANEL_SECTION_HEADER_TITLE_CLASS}
                            />

                            <div className="space-y-3">
                                <p className="text-[11px] font-semibold text-foreground/90 uppercase tracking-[0.08em]">{t('ui.logo')}</p>
                                <BrandingConfigurator
                                    selectedLayout={null}
                                    selectedLogoId={selectedLogoId}
                                    selectedBrandColors={[]}
                                    onSelectLogo={handleSelectLogo}
                                    onToggleBrandColor={() => { }}
                                    onAddCustomColor={() => { }}
                                    showLogo={true}
                                    showColors={false}
                                    showTypography={false}
                                    showBrandTexts={false}
                                    rawMessage={prompt}
                                    debugLabel="Carousel-Logo"
                                />
                                {(brandLogos.length > 0 || primaryLogo) && (
                                    <div className="flex items-center justify-between gap-2 pt-1">
                                        <p className="text-sm font-medium">{t('ui.applyLogoAll')}</p>
                                        <Switch
                                            checked={includeLogoOnSlides}
                                            onCheckedChange={setIncludeLogoOnSlides}
                                            aria-label={t('ui.applyLogoAll')}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 border-t border-border/60 pt-4">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-semibold text-foreground/90 uppercase tracking-[0.08em]">{t('ui.colors')}</p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={refreshBrandColorsFromKit}
                                        className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary gap-1"
                                    >
                                        <IconRotate className="w-3 h-3" />
                            {t('ui.reload', { defaultValue: 'Reload' })}
                                    </Button>
                                </div>
                                <div className="flex flex-wrap items-end gap-3 pb-1">
                                    <div
                                        className={cn(
                                            "flex flex-col items-center gap-1 rounded-xl p-1 transition-colors",
                                            draggedBrandColor && draggedBrandColor.role !== 'Texto' && "border border-primary/20 bg-primary/5"
                                        )}
                                        onDragOver={(event) => event.preventDefault()}
                                        onDrop={(event) => {
                                            event.preventDefault()
                                            if (!draggedBrandColor) return
                                            swapBrandColorRoles(draggedBrandColor, 'Texto', brandColorsByRole.Texto[0])
                                            setDraggedBrandColor(null)
                                        }}
                                    >
                                        {brandColorsByRole.Texto[0] ? (
                                            <RoleColorSwatch
                                                color={brandColorsByRole.Texto[0]}
                                                onCommit={(nextColor) => replaceRoleColor('Texto', nextColor, brandColorsByRole.Texto[0])}
                                                applyLabel={t('ui.applyColor')}
                                                draggable
                                                onDragStart={() => setDraggedBrandColor({ role: 'Texto', color: brandColorsByRole.Texto[0] })}
                                                onDragEnd={() => setDraggedBrandColor(null)}
                                            />
                                        ) : (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-8 px-2 text-[10px]"
                                                onClick={() => replaceRoleColor('Texto', '#111111')}
                                            >
                                                {t('ui.add')}
                                            </Button>
                                        )}
                                        <span className="text-[10px] text-muted-foreground">{t('ui.text')}</span>
                                    </div>

                                    <div
                                        className={cn(
                                            "flex flex-col items-center gap-1 rounded-xl p-1 transition-colors",
                                            draggedBrandColor && draggedBrandColor.role !== 'Fondo' && "border border-primary/20 bg-primary/5"
                                        )}
                                        onDragOver={(event) => event.preventDefault()}
                                        onDrop={(event) => {
                                            event.preventDefault()
                                            if (!draggedBrandColor) return
                                            swapBrandColorRoles(draggedBrandColor, 'Fondo', brandColorsByRole.Fondo[0])
                                            setDraggedBrandColor(null)
                                        }}
                                    >
                                        {brandColorsByRole.Fondo[0] ? (
                                            <RoleColorSwatch
                                                color={brandColorsByRole.Fondo[0]}
                                                onCommit={(nextColor) => replaceRoleColor('Fondo', nextColor, brandColorsByRole.Fondo[0])}
                                                applyLabel={t('ui.applyColor')}
                                                draggable
                                                onDragStart={() => setDraggedBrandColor({ role: 'Fondo', color: brandColorsByRole.Fondo[0] })}
                                                onDragEnd={() => setDraggedBrandColor(null)}
                                            />
                                        ) : (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-8 px-2 text-[10px]"
                                                onClick={() => replaceRoleColor('Fondo', '#ffffff')}
                                            >
                                                {t('ui.add')}
                                            </Button>
                                        )}
                                        <span className="text-[10px] text-muted-foreground">{t('ui.background')}</span>
                                    </div>

                                    <div
                                        className="ml-2 flex min-w-0 flex-col gap-1 rounded-xl p-1 pl-3"
                                        onDragOver={(event) => event.preventDefault()}
                                        onDrop={(event) => {
                                            event.preventDefault()
                                            if (!draggedBrandColor) return
                                            swapBrandColorRoles(draggedBrandColor, 'Acento')
                                            setDraggedBrandColor(null)
                                        }}
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            {brandColorsByRole.Acento.map((accentColor) => (
                                                <div
                                                    key={accentColor}
                                                    className={cn(
                                                        "group/accent relative inline-flex items-center rounded-2xl",
                                                        draggedBrandColor && draggedBrandColor.color !== accentColor && "ring-2 ring-primary/30 ring-offset-1 ring-offset-background"
                                                    )}
                                                    onDragOver={(event) => event.preventDefault()}
                                                    onDrop={(event) => {
                                                        event.preventDefault()
                                                        if (!draggedBrandColor) return
                                                        swapBrandColorRoles(draggedBrandColor, 'Acento', accentColor)
                                                        setDraggedBrandColor(null)
                                                    }}
                                                >
                                                    <RoleColorSwatch
                                                        color={accentColor}
                                                        onCommit={(nextColor) => replaceRoleColor('Acento', nextColor, accentColor)}
                                                        applyLabel={t('ui.applyColor')}
                                                        sizeClass="w-14 h-14 rounded-2xl"
                                                        draggable
                                                        onDragStart={() => setDraggedBrandColor({ role: 'Acento', color: accentColor })}
                                                        onDragEnd={() => setDraggedBrandColor(null)}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground shadow-sm transition-opacity opacity-0 group-hover/accent:opacity-100 group-focus-within/accent:opacity-100 hover:border-destructive/50 hover:text-destructive"
                                                        onClick={() => removeBrandColor(accentColor)}
                                                        title={t('ui.removeAccent')}
                                                    >
                                                        <IconClose className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            {brandColorsByRole.Acento.length < 5 && (
                                                <AddAccentSwatch
                                                    onAdd={addAccentColor}
                                                    label={t('ui.addAccent')}
                                                />
                                            )}
                                        </div>
                                        <span className="w-12 text-center text-[10px] text-muted-foreground">{t('ui.accents')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 border-t border-border/60 pt-4">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-semibold text-foreground/90 uppercase tracking-[0.08em]">{t('ui.link')}</p>
                                    <Switch
                                        checked={ctaUrlEnabled}
                                        onCheckedChange={(checked) => {
                                            setCtaUrlEnabled(checked)
                                            if (checked && !ctaUrl.trim()) {
                                                setCtaUrl(brandKit?.url?.trim() || '')
                                            }
                                        }}
                                        aria-label={t('ui.link')}
                                    />
                                </div>
                                {ctaUrlEnabled ? (
                                    <Input
                                        value={ctaUrl}
                                        onChange={(e) => setCtaUrl(e.target.value)}
                                        placeholder={brandKit?.url?.trim() || 'tuweb.com'}
                                        className="h-9 text-xs"
                                    />
                                ) : (
                                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                                        {t('ui.linkDescription')}
                                    </p>
                                )}
                            </div>

                            {(primaryEmail || phoneValues.length > 0 || addressValues.length > 0) ? (
                                <div className="space-y-3 pt-1">
                                    <div className="space-y-3">
                                        {primaryEmail ? (
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-[11px] font-semibold text-foreground/90 uppercase tracking-[0.08em]">{t('ui.email')}</p>
                                                    <Switch
                                                        checked={Boolean(getContactFieldValue('contact-email-main'))}
                                                        onCheckedChange={(checked) => setContactFieldChecked('contact-email-main', primaryEmail, checked)}
                                                        aria-label={t('ui.email')}
                                                    />
                                                </div>
                                                {getContactFieldValue('contact-email-main') ? (
                                                    <Input
                                                        value={getContactFieldValue('contact-email-main')}
                                                        onChange={(e) => updateContactFieldValue('contact-email-main', e.target.value)}
                                                        placeholder={primaryEmail}
                                                        className="h-9 text-xs"
                                                    />
                                                ) : (
                                                    <p className="truncate text-[11px] text-muted-foreground">{primaryEmail}</p>
                                                )}
                                            </div>
                                        ) : null}

                                        {phoneValues.map((phone, idx) => {
                                            const fieldId = `contact-phone-${idx}`
                                            const selectedValue = getContactFieldValue(fieldId)
                                            return (
                                                <div key={fieldId} className="space-y-1.5">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-[11px] font-semibold text-foreground/90 uppercase tracking-[0.08em]">{t('ui.phone', { index: idx + 1 })}</p>
                                                        <Switch
                                                            checked={Boolean(selectedValue)}
                                                            onCheckedChange={(checked) => setContactFieldChecked(fieldId, phone, checked)}
                                                            aria-label={t('ui.phone', { index: idx + 1 })}
                                                        />
                                                    </div>
                                                    {selectedValue ? (
                                                        <Input
                                                            value={selectedValue}
                                                            onChange={(e) => updateContactFieldValue(fieldId, e.target.value)}
                                                            placeholder={phone}
                                                            className="h-9 text-xs"
                                                        />
                                                    ) : (
                                                        <p className="truncate text-[11px] text-muted-foreground">{phone}</p>
                                                    )}
                                                </div>
                                            )
                                        })}

                                        {addressValues.map((address, idx) => {
                                            const fieldId = `contact-address-${idx}`
                                            const selectedValue = getContactFieldValue(fieldId)
                                            return (
                                                <div key={fieldId} className="space-y-1.5">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-[11px] font-semibold text-foreground/90 uppercase tracking-[0.08em]">{t('ui.address', { index: idx + 1 })}</p>
                                                        <Switch
                                                            checked={Boolean(selectedValue)}
                                                            onCheckedChange={(checked) => setContactFieldChecked(fieldId, address, checked)}
                                                            aria-label={t('ui.address', { index: idx + 1 })}
                                                        />
                                                    </div>
                                                    {selectedValue ? (
                                                        <Input
                                                            value={selectedValue}
                                                            onChange={(e) => updateContactFieldValue(fieldId, e.target.value)}
                                                            placeholder={address}
                                                            className="h-9 text-xs"
                                                        />
                                                    ) : (
                                                        <p className="break-words text-[11px] text-muted-foreground">{address}</p>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </>
                )}
                {primaryActionRequiresReanalysis ? (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                        <div className="flex items-start gap-2">
                            <IconAlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                                {t('ui.pendingStructuralChanges')}
                            </p>
                        </div>
                    </div>
                ) : null}
                </div>
            </div>
            <UnsavedNavigationDialog
                open={unsavedNavModalOpen}
                isResolving={isResolvingUnsavedNavigation}
                onCancel={handleUnsavedNavigateCancel}
                onDiscard={handleUnsavedNavigateDiscard}
                onSave={handleUnsavedNavigateSave}
            />
            <SessionDecisionDialog
                state={sessionDecisionModal}
                onClose={closeSessionDecisionModal}
            />
            <SessionTitleDialog
                open={sessionTitleDialogOpen}
                title={t('ui.sessionDialogTitle')}
                description={t('ui.sessionDialogDescription')}
                value={sessionTitleDraft}
                confirmLabel={t('ui.sessionDialogConfirm')}
                onValueChange={setSessionTitleDraft}
                onCancel={() => closeSessionTitleDialog(null)}
                onConfirm={() => closeSessionTitleDialog(buildCustomSessionTitle(sessionTitleDraft))}
            />
        </div>
    )
}





