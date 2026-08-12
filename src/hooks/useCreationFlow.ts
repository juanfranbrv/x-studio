import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { generateFieldCopy as getAICopy } from '@/app/actions/generate-copy'
import {
    type IntentGroup,
    type IntentCategory,
    type SeasonalTheme,
    type VisionAnalysis,
    type GenerationState,
    type LayoutOption,
    type LayoutTextField,
    type TypographyProfile,
    INITIAL_GENERATION_STATE,
    DEFAULT_SOCIAL_PLATFORM,
    INTENT_CATALOG,
    STYLE_CHIPS_BY_SUBJECT,
    ARTISTIC_STYLE_CATALOG,
    ARTISTIC_STYLE_GROUPS,
    LAYOUTS_BY_INTENT,
    MERGED_LAYOUTS_BY_INTENT,
    DEFAULT_LAYOUTS,
    ALL_IMAGE_LAYOUTS,
    THEME_CATALOG,
    SOCIAL_FORMATS,
    getDefaultSocialFormatId,
    SocialPlatform,
    ColorRole,
    ReferenceImageRole,
    SelectedColor,
    TextAsset,
} from '@/lib/creation-flow-types'
import { useBrandKit } from '@/contexts/BrandKitContext'
import { resizeImage } from '@/lib/image-utils'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

// Priority-based prompt construction imports
import * as P12 from '@/lib/prompts/priorities/p12-preferred-language'
import { detectLanguage } from '@/lib/language-detection'
import * as P10 from '@/lib/prompts/priorities/p10-logo-integrity'
import { P10B } from '@/lib/prompts/priorities/p10b-secondary-logos'
import * as P09 from '@/lib/prompts/priorities/p09-brand-dna'
import { P09B } from '@/lib/prompts/priorities/p09b-cta-url-hierarchy'
import * as P08 from '@/lib/prompts/priorities/p08-custom-instructions'
import * as P07 from '@/lib/prompts/priorities/p07-layout-structure'
import * as P06 from '@/lib/prompts/priorities/p06-subject-context'
import { P06B } from '@/lib/prompts/priorities/p06b-ai-image-description'
import * as P05 from '@/lib/prompts/priorities/p05-visual-style'
import * as P04 from '@/lib/prompts/priorities/p04-brand-colors'
import * as P02 from '@/lib/prompts/priorities/p02-technical-specs'
// Compartidos con el generador por lotes: una sola definicion para que el
// panel y las campanas construyan el prompt igual.
import {
    buildVisualStyleDirective,
    extractStyleSignals,
    sanitizeStructuralPromptForModel,
} from '@/lib/prompts/image-generation/style-directive'

export const NO_TEXT_TOKEN = '[NO_TEXT]'

const resolveBrandKitLogoUrl = (logo?: { url?: string; selected?: boolean } | string | null) => {
    if (!logo) return undefined
    return typeof logo === 'string' ? logo : logo.url
}

const getPrimaryBrandKitLogoId = (brandKit?: { logo_url?: string; logos?: Array<{ url?: string; selected?: boolean } | string> | null } | null) => {
    const logos = Array.isArray(brandKit?.logos) ? brandKit.logos : []
    if (logos.length === 0) return null

    const explicitPrimaryUrl = (brandKit?.logo_url || '').trim()
    if (explicitPrimaryUrl) {
        const explicitMatchIndex = logos.findIndex((logo) => resolveBrandKitLogoUrl(logo) === explicitPrimaryUrl)
        if (explicitMatchIndex >= 0) return `logo-${explicitMatchIndex}`
    }

    const selectedMatchIndex = logos.findIndex((logo) => typeof logo !== 'string' && logo?.selected !== false)
    if (selectedMatchIndex >= 0) return `logo-${selectedMatchIndex}`

    return 'logo-0'
}

const resolveSelectedBrandKitLogo = (
    brandKit: { logos?: Array<{ url?: string; selected?: boolean; _id?: string; id?: string } | string> | null } | null | undefined,
    selectedLogoId?: string | null
) => {
    if (!selectedLogoId || !Array.isArray(brandKit?.logos)) return undefined

    return brandKit.logos.find((logo, idx) => {
        if (typeof logo !== 'string') {
            if (logo?._id === selectedLogoId) return true
            if (logo?.id === selectedLogoId) return true
        }
        return `logo-${idx}` === selectedLogoId
    })
}

export interface UseCreationFlowOptions {
    onImageUploaded?: (file: File) => void
    onReset?: () => void
    getOrCreateAuditFlowId?: () => string
}

export function useCreationFlow(options?: UseCreationFlowOptions) {
    const { activeBrandKit } = useBrandKit()
    const saveGeneration = useMutation(api.generations.saveGeneration)
    const aiConfig = useQuery(api.settings.getAIConfig)
    const [state, setState] = useState<GenerationState>(INITIAL_GENERATION_STATE)
    const optionsRef = useRef(options)
    const selectedStylePresetDetails = useQuery(
        api.stylePresets.getActiveById,
        state.selectedStylePresetId
            ? { id: state.selectedStylePresetId as Id<'style_presets'> }
            : 'skip'
    )

    // Keep options reference up to date to avoid stale closures in callbacks
    useEffect(() => {
        optionsRef.current = options
    }, [options])

    // -------------------------------------------------------------------------
    // COMPUTED VALUES (Moved to top for callback access)
    // -------------------------------------------------------------------------

    const currentIntent = useMemo(() => {
        return INTENT_CATALOG.find(i => i.id === state.selectedIntent)
    }, [state.selectedIntent])

    const requiresImage = currentIntent?.requiresImage ?? false

    // Initialize defaults from Brand Kit & AI Config
    useEffect(() => {
        if (aiConfig) {
            console.log('🔄 [CreationFlow] AI Config Loaded:', aiConfig)
            setState(prev => ({
                ...prev,
                selectedImageModel: aiConfig.imageModel,
                selectedIntelligenceModel: aiConfig.intelligenceModel
            }))
        }
    }, [aiConfig])

    useEffect(() => {
        if (!selectedStylePresetDetails?.analysis) return
        const selectedId = String(selectedStylePresetDetails._id || '')
        if (!selectedId) return

        setState(prev => {
            if (!prev.selectedStylePresetId || prev.selectedStylePresetId !== selectedId) return prev
            const nextAnalysis = selectedStylePresetDetails.analysis as VisionAnalysis
            const prevPrompt = (prev.firstVisionAnalysis?.keywords?.[0] || '').trim()
            const nextPrompt = (nextAnalysis?.keywords?.[0] || '').trim()

            if (
                prevPrompt === nextPrompt &&
                prev.firstReferenceId === null &&
                prev.firstReferenceSource === null
            ) {
                return prev
            }

            return {
                ...prev,
                firstReferenceId: null,
                firstReferenceSource: null,
                firstVisionAnalysis: nextAnalysis,
                visionAnalysis: nextAnalysis,
            }
        })
    }, [selectedStylePresetDetails])

    // Track last initialized brand kit to allow re-syncing when it changes
    const [lastInitBrandId, setLastInitBrandId] = useState<string | null>(null)
    // Track if we've done the initial Brand Kit load in this component lifecycle
    const hasInitializedBrandKit = useRef(false)

    const buildBrandColorsFromKit = useCallback((): SelectedColor[] => {
        if (!activeBrandKit?.colors || activeBrandKit.colors.length === 0) return []
        return (activeBrandKit.colors as any[]).map(c => {
            const rawRole = ((c.role as string) || 'Acento').trim().toUpperCase()
            let role: ColorRole = 'Acento'

            if (rawRole.includes('TEXT')) role = 'Texto'
            else if (rawRole.includes('FOND')) role = 'Fondo'
            else if (rawRole.includes('ACENT')) role = 'Acento'

            const hex = (c.color || c.hex || (typeof c === 'string' ? c : '')).toLowerCase()

            return {
                color: hex.startsWith('#') ? hex : `#${hex}`,
                role
            }
        }).filter(c => c.color && c.color !== '#')
    }, [activeBrandKit?.colors])

    const normalizeUrlForCompare = useCallback((value?: string | null) => {
        return (value || '')
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/\/$/, '')
    }, [])

    // Initialize defaults from Brand Kit (Colors and Text Assets)
    useEffect(() => {
        const brandId = activeBrandKit?.id || (activeBrandKit as any)?._id
        if (!activeBrandKit || !brandId) return

        // CONDITIONS TO RUN INITIALIZATION:
        // 1. First time for this brand ID (brandId !== lastInitBrandId)
        // 2. We haven't initialized yet (hasInitializedBrandKit.current === false)
        // 3. RETRY STRATEGY: If current selected colors are empty, but the brand kit HAS colors, 
        //    it likely means previous init failed or data wasn't ready. We should retry.
        //    (We check if state.selectedBrandColors is empty to avoid overwriting user edits, 
        //    but we prioritize showing *something* over showing nothing)

        const shouldInit =
            brandId !== lastInitBrandId ||
            !hasInitializedBrandKit.current ||
            (state.selectedBrandColors.length === 0 && activeBrandKit.colors && activeBrandKit.colors.length > 0)

        if (!shouldInit) return

        console.log(`[useCreationFlow] Initializing defaults for Brand Kit: ${brandId}`)
        const nextState: Partial<GenerationState> = {}
        let hasChanges = false

        // 1. Initialize Colors - Refresh whenever the brand kit changes or if we have none selected
        if (activeBrandKit.colors && activeBrandKit.colors.length > 0) {
            const defaultColors = buildBrandColorsFromKit()

            if (defaultColors.length > 0) {
                // Determine if we should overwrite. 
                // If we are switching brands (brandId !== lastInitBrandId), ALWAYS overwrite.
                // If we are just retrying (state.selectedBrandColors.length === 0), overwrite.

                nextState.selectedBrandColors = defaultColors
                hasChanges = true
            }
        }

        // 2. Initialize Text Assets (Only if switching brands or specific retry)
        // We generally preserve text assets if just fixing colors, but to be safe/simple, we re-init if brand changes
        if (brandId !== lastInitBrandId || !hasInitializedBrandKit.current) {
            const defaultTextAssets: TextAsset[] = []
            if (activeBrandKit.tagline) {
                defaultTextAssets.push({ id: 'tagline', type: 'tagline', label: 'Tagline', value: activeBrandKit.tagline })
            }

            if (defaultTextAssets.length > 0) {
                nextState.selectedTextAssets = defaultTextAssets
                hasChanges = true
            }

            // 3. Initialize Logo - Follow the primary logo defined in Brand Kit
            if (activeBrandKit.logos && (activeBrandKit.logos as any[]).length > 0) {
                nextState.selectedLogoId = getPrimaryBrandKitLogoId(activeBrandKit)
                hasChanges = true
            }

            // Keep the Brand Kit URL disponible para activarla manualmente,
            // pero en image no mostramos el enlace por defecto al iniciar.
            const kitUrl = activeBrandKit.url?.trim() || ''
            nextState.ctaUrlEnabled = false
            nextState.ctaUrlManual = false
            nextState.ctaUrl = kitUrl
            hasChanges = true
        }

        if (hasChanges) {
            console.log('[useCreationFlow] Applying initial state changes:', Object.keys(nextState))
            setState(prev => ({ ...prev, ...nextState }))
        }

        setLastInitBrandId(brandId)
        hasInitializedBrandKit.current = true
    }, [activeBrandKit, buildBrandColorsFromKit, lastInitBrandId, state.selectedBrandColors.length])

    // Ensure CTA URL always reflects the current Brand Kit URL from DB unless user overrides.
    useEffect(() => {
        const brandUrl = activeBrandKit?.url?.trim() || ''
        if (!brandUrl) return
        setState(prev => {
            if (!prev.ctaUrlEnabled) return prev
            if (prev.ctaUrlManual) return prev
            if (prev.ctaUrl === brandUrl) return prev
            return { ...prev, ctaUrl: brandUrl }
        })
    }, [activeBrandKit?.url])

    // -------------------------------------------------------------------------
    // CRITICAL: SEQUENTIAL FLOW ENFORCER
    // -------------------------------------------------------------------------
    // This effect acts as a safety net to prevent "ghost" steps from appearing.
    // If the step count is high but required selections are missing, it
    // forcefully pulls the step count back.
    // NOTE: Layout can be auto-selected in basic mode right before generation,
    // so Step 3+ is allowed without explicit selectedLayout.
    useEffect(() => {
        let correctedStep = state.currentStep

        // If at Step 4 (Image) or higher, we MUST have a Format (Step 3)
        // (Note: Format requires Platform, so checking Format is enough)
        if (state.currentStep > 3 && (!state.selectedFormat || !state.selectedPlatform)) {
            correctedStep = 3
        }

        if (correctedStep !== state.currentStep) {
            console.warn(`[FlowEnforcer] Correcting invalid step: ${state.currentStep} -> ${correctedStep}`)
            setState(prev => ({ ...prev, currentStep: correctedStep }))
        }
    }, [state.currentStep, state.selectedFormat, state.selectedPlatform])


    // -------------------------------------------------------------------------
    // STEP MANAGEMENT
    // -------------------------------------------------------------------------

    const setStep = useCallback((step: number) => {
        setState(prev => ({ ...prev, currentStep: step }))
    }, [])

    const nextStep = useCallback(() => {
        setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }))
    }, [])

    const prevStep = useCallback(() => {
        setState(prev => ({ ...prev, currentStep: Math.max(1, prev.currentStep - 1) }))
    }, [])

    const invalidateFromStep = useCallback((prev: GenerationState, originStep: number) => ({
        generatedImage: null as string | null,
        hasGeneratedImage: false,
        currentStep: prev.hasGeneratedImage ? originStep : prev.currentStep,
    }), [])

    // -------------------------------------------------------------------------
    // STEP 0: Platform and Format Selection
    // -------------------------------------------------------------------------

    const selectPlatform = useCallback((platform: SocialPlatform) => {
        setState(prev => ({
            ...prev,
            selectedPlatform: platform,
            selectedFormat: null,
            ...invalidateFromStep(prev, 3),
            currentStep: prev.hasGeneratedImage ? 3 : Math.max(prev.currentStep, 3)
        }))
    }, [invalidateFromStep])

    const selectFormat = useCallback((formatId: string) => {
        setState(prev => ({
            ...prev,
            selectedPlatform: prev.selectedPlatform ?? DEFAULT_SOCIAL_PLATFORM,
            selectedFormat: formatId,
            ...invalidateFromStep(prev, 3),
            currentStep: prev.hasGeneratedImage ? 3 : Math.max(prev.currentStep, 4)
        })) // Auto-advance to Step 4 (Image Reference)
    }, [invalidateFromStep])

    // Ensure a default format is always present once a platform exists.
    // Uses functional state updates to avoid stale-closure races.
    const ensureDefaultFormat = useCallback((preferredPlatform?: SocialPlatform | null) => {
        setState(prev => {
            if (prev.selectedFormat) return prev

            const targetPlatform = preferredPlatform ?? prev.selectedPlatform ?? DEFAULT_SOCIAL_PLATFORM
            const fallbackFormat = getDefaultSocialFormatId(targetPlatform)

            if (!fallbackFormat) return prev

            return {
                ...prev,
                selectedPlatform: prev.selectedPlatform ?? targetPlatform,
                selectedFormat: fallbackFormat,
                currentStep: prev.hasGeneratedImage ? 4 : Math.max(prev.currentStep, 4),
            }
        })
    }, [])

    // -------------------------------------------------------------------------
    // STEP 1: Intent Selection
    // -------------------------------------------------------------------------

    const selectGroup = useCallback((group: IntentGroup) => {
        setState(prev => ({
            ...INITIAL_GENERATION_STATE,
            // Preserve Platform and Format selection
            selectedPlatform: prev.selectedPlatform,
            selectedFormat: prev.selectedFormat,
            selectedGroup: group,
        }))
    }, [])

    const selectIntent = useCallback((intent: IntentCategory) => {
        const intentMeta = INTENT_CATALOG.find(i => i.id === intent)

        setState(prev => {
            const preserveHeadline = Boolean(prev.headline && prev.headline !== NO_TEXT_TOKEN)
            const preserveText = prev.hasGeneratedImage
            const nextHeadline = preserveHeadline ? prev.headline : (intentMeta?.defaultHeadline || '')
            const nextCta = preserveText ? prev.cta : (intentMeta?.defaultCta || '')
            const nextCustomTexts = preserveText
                ? prev.customTexts
                : (intentMeta?.requiredFields?.reduce((acc, field) => {
                    if (field.mapsTo === 'headline') acc[field.id] = intentMeta.defaultHeadline || ''
                    if (field.mapsTo === 'cta') acc[field.id] = intentMeta.defaultCta || ''
                    return acc
                }, {} as Record<string, string>) || {})

            return {
                ...prev,
                selectedIntent: intent,
                selectedSubMode: null,
                // Pre-fill defaults from intent metadata (unless we already generated a preview)
                headline: nextHeadline,
                cta: nextCta,
                // Pre-fill mapped fields in customTexts (unless we already generated a preview)
                customTexts: nextCustomTexts,
            // Reset downstream selections
            uploadedImages: [],
            uploadedImageFiles: [],
            selectedBrandKitImageIds: [],
            referenceImageRoles: {},
            aiImageDescription: '',
            selectedTheme: null,
            visionAnalysis: null,
            firstVisionAnalysis: null,
            firstReferenceId: null,
            firstReferenceSource: null,
            selectedStyles: [],
            selectedLayout: null, // Legacy templates: explicit user choice per intent.
            generatedImage: null,
            hasGeneratedImage: false,

            // CRITICAL: Clear all downstream step data to enforce sequential flow
            selectedFormat: getDefaultSocialFormatId(DEFAULT_SOCIAL_PLATFORM),
            selectedPlatform: DEFAULT_SOCIAL_PLATFORM,

                currentStep: 2, // Show composition catalog first.
            }
        })
    }, [])

    const selectSubMode = useCallback((subMode: string) => {
        setState(prev => ({ ...prev, selectedSubMode: subMode, generatedImage: null }))
    }, [])

    // -------------------------------------------------------------------------
    // STEP 2: Image Upload or Theme Selection
    // -------------------------------------------------------------------------

    const MAX_REFERENCE_IMAGES = 10
    const MAX_REFERENCE_UPLOAD_BYTES = 12 * 1024 * 1024 // 12MB
    const MAX_REFERENCE_INPUT_DIMENSION = 6000
    const STYLE_REFERENCE_LIMIT = 1
    const AUX_LOGO_REFERENCE_LIMIT = 4
    const CONTENT_REFERENCE_LIMIT = 8

    const getReferenceRoleCounts = (
        uploadedImages: string[],
        brandKitIds: string[],
        roles: Record<string, ReferenceImageRole>
    ) => {
        const counts = { style: 0, logo: 0, content: 0 }
        const ids = [...uploadedImages, ...brandKitIds]

        ids.forEach((id) => {
            const role = roles[id] || 'content'
            if (role === 'style' || role === 'style_content') counts.style += 1
            if (role === 'logo') counts.logo += 1
            if (role === 'content' || role === 'style_content') counts.content += 1
        })

        return counts
    }

    const getReferenceRoleLimitError = (counts: { style: number; logo: number; content: number }) => {
        if (counts.style > STYLE_REFERENCE_LIMIT) return 'Solo puedes usar 1 referencia de estilo.'
        if (counts.logo > AUX_LOGO_REFERENCE_LIMIT) return 'Maximo 4 logos auxiliares.'
        if (counts.content > CONTENT_REFERENCE_LIMIT) return 'Maximo 8 imagenes de contenido.'
        return null
    }

    const pickStyleReference = (
        uploadedImages: string[],
        brandKitIds: string[],
        roles: Record<string, ReferenceImageRole>
    ) => {
        const isStyleRole = (role?: ReferenceImageRole) => role === 'style' || role === 'style_content'
        const uploadedStyle = uploadedImages.find((id) => isStyleRole(roles[id]))
        if (uploadedStyle) {
            return { id: uploadedStyle, source: 'upload' as const }
        }
        const brandKitStyle = brandKitIds.find((id) => isStyleRole(roles[id]))
        if (brandKitStyle) {
            return { id: brandKitStyle, source: 'brandkit' as const }
        }
        return { id: null, source: null }
    }

    const hasActiveStyleRole = (
        uploadedImages: string[],
        brandKitIds: string[],
        roles: Record<string, ReferenceImageRole>
    ) => {
        return [...uploadedImages, ...brandKitIds].some((id) => {
            const role = roles[id]
            return role === 'style' || role === 'style_content'
        })
    }

    const hasUploadedStyleRole = (
        uploadedImages: string[],
        roles: Record<string, ReferenceImageRole>,
        excludeId?: string
    ) => {
        return uploadedImages.some((id) => {
            if (excludeId && id === excludeId) return false
            const role = roles[id]
            return role === 'style' || role === 'style_content'
        })
    }

    const analyzeImageBase64 = useCallback(async (
        base64: string,
        mimeType: string,
        expectedRef?: { id: string; source: 'upload' | 'brandkit' }
    ) => {
        try {
            const flowId = optionsRef.current?.getOrCreateAuditFlowId?.()
            const response = await fetch('/api/analyze-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: base64,
                    mimeType,
                    auditFlowId: flowId,
                }),
            })

            const result = await response.json()

            if (result.success && result.data) {
                setState(prev => ({
                    ...prev,
                    ...(expectedRef && (
                        prev.firstReferenceId !== expectedRef.id ||
                        prev.firstReferenceSource !== expectedRef.source
                    )
                        ? {}
                        : {
                            visionAnalysis: result.data,
                            firstVisionAnalysis: result.data,
                        }),
                    isAnalyzing: false
                }))
            } else {
                throw new Error(result.error || 'Vision analysis failed')
            }
        } catch (error) {
            setState(prev => ({
                ...prev,
                isAnalyzing: false,
                error: error instanceof Error ? error.message : 'Vision analysis failed',
            }))
        }
    }, [])

    const analyzeImageFromUrl = useCallback(async (url: string) => {
        setState(prev => ({ ...prev, isAnalyzing: true, error: null, generatedImage: null }))
        try {
            const response = await fetch(url)
            const blob = await response.blob()
            const file = new File([blob], 'image_from_kit.png', { type: blob.type })

            const base64 = await resizeImage(file, {
                maxWidth: 1536,
                maxHeight: 1536,
                quality: 0.8,
                format: 'image/jpeg'
            })

            await analyzeImageBase64(base64, blob.type || 'image/jpeg', { id: url, source: 'brandkit' })
        } catch (error) {
            setState(prev => ({
                ...prev,
                isAnalyzing: false,
                error: error instanceof Error ? error.message : 'Error processing image from kit',
            }))
        }
    }, [analyzeImageBase64])

    useEffect(() => {
        if (!state.firstReferenceId || state.firstVisionAnalysis || state.isAnalyzing) return

        if (state.firstReferenceSource === 'upload') {
            if (!state.firstReferenceId.startsWith('data:')) return
            setState(prev => ({ ...prev, isAnalyzing: true, error: null }))
            const match = /^data:([^;]+);base64,/.exec(state.firstReferenceId)
            const mimeType = match?.[1] || 'image/jpeg'
            analyzeImageBase64(state.firstReferenceId, mimeType, {
                id: state.firstReferenceId,
                source: 'upload'
            })
            return
        }

        if (state.firstReferenceSource === 'brandkit') {
            setState(prev => ({ ...prev, isAnalyzing: true, error: null }))
            analyzeImageFromUrl(state.firstReferenceId)
        }
    }, [state.firstReferenceId, state.firstReferenceSource, state.firstVisionAnalysis, state.isAnalyzing, analyzeImageBase64, analyzeImageFromUrl])

    // Auto-populate typography from style reference analysis when in auto mode
    useEffect(() => {
        if (state.typography.mode !== 'auto') return
        const inferred = inferTypographyFromVision(state.firstVisionAnalysis)
        setState(prev => {
            if (prev.typography.mode !== 'auto') return prev
            const nextTypography: TypographyProfile = { ...prev.typography, ...inferred, mode: 'auto' }
            const unchanged =
                prev.typography.familyClass === nextTypography.familyClass &&
                prev.typography.weight === nextTypography.weight &&
                prev.typography.width === nextTypography.width &&
                prev.typography.casing === nextTypography.casing &&
                prev.typography.spacing === nextTypography.spacing &&
                prev.typography.contrast === nextTypography.contrast &&
                prev.typography.tone === nextTypography.tone
            if (unchanged) return prev
            return { ...prev, typography: nextTypography }
        })
    }, [state.firstVisionAnalysis, state.typography.mode])

    // Add an uploaded image (max 10 total across sources)
    const addUploadedImage = useCallback((url: string) => {
        setState(prev => {
            const totalImages = prev.uploadedImages.length + prev.selectedBrandKitImageIds.length
            if (totalImages >= MAX_REFERENCE_IMAGES) return prev
            if (prev.uploadedImages.includes(url)) return prev
            const defaultRole: ReferenceImageRole = hasActiveStyleRole(
                prev.uploadedImages,
                prev.selectedBrandKitImageIds,
                prev.referenceImageRoles
            )
                ? (prev.imageSourceMode === 'generate' ? 'logo' : 'content')
                : 'style'
            const nextRoles = { ...prev.referenceImageRoles, [url]: defaultRole }
            const pickedStyle = pickStyleReference(
                [...prev.uploadedImages, url],
                prev.selectedBrandKitImageIds,
                nextRoles
            )
            const shouldResetAnalysis =
                pickedStyle.id !== prev.firstReferenceId || pickedStyle.source !== prev.firstReferenceSource
            return {
                ...prev,
                uploadedImages: [...prev.uploadedImages, url],
                ...invalidateFromStep(prev, 4),
                currentStep: prev.hasGeneratedImage ? 4 : Math.max(prev.currentStep, 5),
                referenceImageRoles: nextRoles,
                firstReferenceId: pickedStyle.id,
                firstReferenceSource: pickedStyle.source,
                firstVisionAnalysis: shouldResetAnalysis ? null : prev.firstVisionAnalysis,
                visionAnalysis: shouldResetAnalysis ? null : prev.visionAnalysis
            }
        })
    }, [invalidateFromStep])

    // Remove an uploaded image by URL
    const removeUploadedImage = useCallback((url: string) => {
        setState(prev => {
            const nextUploadedImages = prev.uploadedImages.filter(u => u !== url)
            const nextUploadedFiles = prev.uploadedImageFiles.filter((_, i) => prev.uploadedImages[i] !== url)
            const nextRoles = { ...prev.referenceImageRoles }
            delete nextRoles[url]
            const pickedStyle = pickStyleReference(nextUploadedImages, prev.selectedBrandKitImageIds, nextRoles)
            const resetAnalysis =
                pickedStyle.id !== prev.firstReferenceId || pickedStyle.source !== prev.firstReferenceSource

            return {
                ...prev,
                uploadedImages: nextUploadedImages,
                uploadedImageFiles: nextUploadedFiles,
                ...invalidateFromStep(prev, 4),
                referenceImageRoles: nextRoles,
                firstReferenceId: pickedStyle.id,
                firstReferenceSource: pickedStyle.source,
                firstVisionAnalysis: resetAnalysis ? null : prev.firstVisionAnalysis,
                visionAnalysis: resetAnalysis ? null : prev.visionAnalysis
            }
        })
    }, [invalidateFromStep])

    // Clear all uploaded images
    const clearUploadedImages = useCallback(() => {
        setState(prev => {
            const nextUploadedImages: string[] = []
            const nextUploadedFiles: File[] = []
            const nextRoles = { ...prev.referenceImageRoles }
            prev.uploadedImages.forEach((id) => delete nextRoles[id])
            const pickedStyle = pickStyleReference(nextUploadedImages, prev.selectedBrandKitImageIds, nextRoles)
            const resetAnalysis =
                pickedStyle.id !== prev.firstReferenceId || pickedStyle.source !== prev.firstReferenceSource

            return {
                ...prev,
                uploadedImages: nextUploadedImages,
                uploadedImageFiles: nextUploadedFiles,
                ...invalidateFromStep(prev, 4),
                referenceImageRoles: nextRoles,
                visionAnalysis: resetAnalysis ? null : prev.visionAnalysis,
                firstVisionAnalysis: resetAnalysis ? null : prev.firstVisionAnalysis,
                firstReferenceId: pickedStyle.id,
                firstReferenceSource: pickedStyle.source
            }
        })
    }, [invalidateFromStep])

    const getImageDimensions = useCallback((file: File): Promise<{ width: number; height: number }> => {
        return new Promise((resolve, reject) => {
            const objectUrl = URL.createObjectURL(file)
            const img = new Image()
            img.onload = () => {
                const dims = { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height }
                URL.revokeObjectURL(objectUrl)
                resolve(dims)
            }
            img.onerror = () => {
                URL.revokeObjectURL(objectUrl)
                reject(new Error('No se pudieron leer las dimensiones de la imagen'))
            }
            img.src = objectUrl
        })
    }, [])

    const prepareModelReferenceImage = useCallback(async (file: File, isLogoCandidate: boolean) => {
        if (file.size > MAX_REFERENCE_UPLOAD_BYTES) {
            throw new Error('La imagen supera el limite de 12MB')
        }

        const { width, height } = await getImageDimensions(file)
        if (Math.max(width, height) > MAX_REFERENCE_INPUT_DIMENSION) {
            throw new Error(`La imagen es demasiado grande (${width}x${height}). Maximo permitido: 6000px`)
        }

        const inputMime = String(file.type || '').toLowerCase()
        const outputFormat: 'image/jpeg' | 'image/png' | 'image/webp' = isLogoCandidate
            ? (inputMime.includes('png') ? 'image/png' : 'image/jpeg')
            : 'image/webp'

        const base64 = await resizeImage(file, {
            maxWidth: 1536,
            maxHeight: 1536,
            quality: isLogoCandidate ? 0.9 : 0.78,
            format: outputFormat,
        })

        const match = /^data:([^;]+);base64,/.exec(base64)
        const mimeType = match?.[1] || outputFormat
        return { base64, mimeType }
    }, [getImageDimensions])

    const uploadImage = useCallback(async (file: File, roleHint?: ReferenceImageRole) => {
        const currentTotal = state.uploadedImages.length + state.selectedBrandKitImageIds.length
        if (currentTotal >= MAX_REFERENCE_IMAGES) {
            console.warn('Max reference images reached')
            return
        }
        const effectiveRole: ReferenceImageRole =
            roleHint || (state.imageSourceMode === 'generate' ? 'logo' : 'content')
        const syntheticId = '__new_upload__'
        const projectedRoles = { ...state.referenceImageRoles, [syntheticId]: effectiveRole }
        const projectedCounts = getReferenceRoleCounts(
            [...state.uploadedImages, syntheticId],
            state.selectedBrandKitImageIds,
            projectedRoles
        )
        const roleLimitError = getReferenceRoleLimitError(projectedCounts)
        if (roleLimitError) {
            setState(prev => ({ ...prev, isAnalyzing: false, error: roleLimitError }))
            return
        }

        setState(prev => ({
            ...prev,
            ...invalidateFromStep(prev, 4),
            isAnalyzing: true,
            error: null
        }))

        try {
            const isLogoCandidate = effectiveRole === 'logo'
            const prepared = await prepareModelReferenceImage(file, isLogoCandidate)
            const base64 = prepared.base64

            setState(prev => {
                const defaultRole: ReferenceImageRole = roleHint ||
                    (prev.imageSourceMode === 'generate' ? 'logo' : 'content')
                const nextRoles = { ...prev.referenceImageRoles, [base64]: defaultRole }
                const pickedStyle = pickStyleReference([...prev.uploadedImages, base64], prev.selectedBrandKitImageIds, nextRoles)
                const resetAnalysis =
                    pickedStyle.id !== prev.firstReferenceId || pickedStyle.source !== prev.firstReferenceSource

                return {
                    ...prev,
                    uploadedImages: [...prev.uploadedImages, base64],
                    uploadedImageFiles: [...prev.uploadedImageFiles, file],
                    ...invalidateFromStep(prev, 4),
                    currentStep: prev.hasGeneratedImage ? 4 : Math.max(prev.currentStep, 6), // Auto-advance to Step 6 (Brand) after upload
                    referenceImageRoles: nextRoles,
                    firstReferenceId: pickedStyle.id,
                    firstReferenceSource: pickedStyle.source,
                    firstVisionAnalysis: resetAnalysis ? null : prev.firstVisionAnalysis,
                    visionAnalysis: resetAnalysis ? null : prev.visionAnalysis
                }
            })

            if (optionsRef.current?.onImageUploaded) {
                optionsRef.current.onImageUploaded(file)
            }

            setState(prev => ({ ...prev, isAnalyzing: false }))
        } catch (error) {
            setState(prev => ({
                ...prev,
                isAnalyzing: false,
                error: error instanceof Error ? error.message : 'Error analyzing image',
            }))
        }
    }, [state.uploadedImages, state.selectedBrandKitImageIds, state.referenceImageRoles, state.imageSourceMode, invalidateFromStep, prepareModelReferenceImage]) // Added dependencies

    const selectTheme = useCallback((theme: SeasonalTheme) => {
        const themeMeta = THEME_CATALOG.find(t => t.id === theme)
        setState(prev => ({
            ...prev,
            selectedTheme: theme,
            ...invalidateFromStep(prev, 4),
            // Create a pseudo VisionAnalysis from theme
            visionAnalysis: themeMeta ? {
                subject: 'abstract',
                subjectLabel: themeMeta.name,
                lighting: 'studio',
                colorPalette: themeMeta.colors,
                keywords: themeMeta.keywords,
                confidence: 1,
            } : null,
        }))
    }, [invalidateFromStep])

    const setImageFromUrl = useCallback(async (url: string) => {
        setState(prev => ({
            ...prev,
            ...invalidateFromStep(prev, 4),
            isAnalyzing: true,
            error: null
        }))
        try {
            // Fetch image and convert to blob then to base64
            const response = await fetch(url)
            const blob = await response.blob()
            const file = new File([blob], 'image_from_kit.png', { type: blob.type })

            // Resize and compress fetched image
            const base64 = await resizeImage(file, {
                maxWidth: 1536,
                maxHeight: 1536,
                quality: 0.8,
                format: 'image/jpeg'
            })

            setState(prev => ({
                ...prev,
                uploadedImage: base64,
                uploadedImageFile: file,
            }))

            // Call Vision API
            const flowId = optionsRef.current?.getOrCreateAuditFlowId?.()
            const visionResponse = await fetch('/api/analyze-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: base64,
                    mimeType: blob.type,
                    auditFlowId: flowId,
                }),
            })

            const result = await visionResponse.json()

            if (result.success && result.data) {
                setState(prev => ({
                    ...prev,
                    visionAnalysis: result.data,
                    firstVisionAnalysis: result.data,
                    isAnalyzing: false,
                }))
            } else {
                throw new Error(result.error || 'Vision analysis failed')
            }
        } catch (error) {
            setState(prev => ({
                ...prev,
                isAnalyzing: false,
                error: error instanceof Error ? error.message : 'Error processing image from kit',
            }))
        }
    }, [invalidateFromStep])

    const clearImage = useCallback(() => {
        setState(prev => ({
            ...prev,
            ...invalidateFromStep(prev, 4),
            uploadedImages: [],
            uploadedImageFiles: [],
            selectedBrandKitImageIds: [],
            referenceImageRoles: {},
            visionAnalysis: null,
            firstVisionAnalysis: null,
            firstReferenceId: null,
            firstReferenceSource: null,
            selectedStyles: [],
            selectedLayout: null,
        }))
    }, [invalidateFromStep])



    // -------------------------------------------------------------------------
    // Image Source Mode Selection
    // -------------------------------------------------------------------------

    const setImageSourceMode = useCallback((mode: 'upload' | 'brandkit' | 'generate') => {
        setState(prev => ({
            ...prev,
            imageSourceMode: mode,
            ...invalidateFromStep(prev, 4)
        }))
    }, [invalidateFromStep])

    // Toggle selection of a brand kit image (multi-select, max 10 total)
    const toggleBrandKitImage = useCallback((imageId: string) => {
        setState(prev => {
            const isSelected = prev.selectedBrandKitImageIds.includes(imageId)
            if (isSelected) {
                // Remove from selection
                const nextBrandKitIds = prev.selectedBrandKitImageIds.filter(id => id !== imageId)
                const nextRoles = { ...prev.referenceImageRoles }
                delete nextRoles[imageId]
                const pickedStyle = pickStyleReference(prev.uploadedImages, nextBrandKitIds, nextRoles)
                const resetAnalysis =
                    pickedStyle.id !== prev.firstReferenceId || pickedStyle.source !== prev.firstReferenceSource

                return {
                    ...prev,
                    selectedBrandKitImageIds: nextBrandKitIds,
                    referenceImageRoles: nextRoles,
                    ...invalidateFromStep(prev, 4),
                    firstReferenceId: pickedStyle.id,
                    firstReferenceSource: pickedStyle.source,
                    firstVisionAnalysis: resetAnalysis ? null : prev.firstVisionAnalysis,
                    visionAnalysis: resetAnalysis ? null : prev.visionAnalysis
                }
            } else {
                // Add to selection (if under limit)
                const totalImages = prev.uploadedImages.length + prev.selectedBrandKitImageIds.length
                if (totalImages >= MAX_REFERENCE_IMAGES) return prev
                const defaultRole: ReferenceImageRole =
                    prev.imageSourceMode === 'generate' ? 'logo' : 'content'
                const nextRoles = { ...prev.referenceImageRoles, [imageId]: defaultRole }
                const roleCounts = getReferenceRoleCounts(
                    prev.uploadedImages,
                    [...prev.selectedBrandKitImageIds, imageId],
                    nextRoles
                )
                const roleLimitError = getReferenceRoleLimitError(roleCounts)
                if (roleLimitError) {
                    return {
                        ...prev,
                        error: roleLimitError,
                    }
                }
                const pickedStyle = pickStyleReference(prev.uploadedImages, [...prev.selectedBrandKitImageIds, imageId], nextRoles)
                const resetAnalysis =
                    pickedStyle.id !== prev.firstReferenceId || pickedStyle.source !== prev.firstReferenceSource
                return {
                    ...prev,
                    selectedBrandKitImageIds: [...prev.selectedBrandKitImageIds, imageId],
                    referenceImageRoles: nextRoles,
                    ...invalidateFromStep(prev, 4),
                    currentStep: prev.hasGeneratedImage ? 4 : Math.max(prev.currentStep, 5),
                    firstReferenceId: pickedStyle.id,
                    firstReferenceSource: pickedStyle.source,
                    firstVisionAnalysis: resetAnalysis ? null : prev.firstVisionAnalysis,
                    visionAnalysis: resetAnalysis ? null : prev.visionAnalysis
                }
            }
        })
    }, [invalidateFromStep])

    // Clear all brand kit image selections
    const clearBrandKitImages = useCallback(() => {
        setState(prev => {
            const nextBrandKitIds: string[] = []
            const nextRoles = { ...prev.referenceImageRoles }
            prev.selectedBrandKitImageIds.forEach((id) => delete nextRoles[id])
            const pickedStyle = pickStyleReference(prev.uploadedImages, nextBrandKitIds, nextRoles)
            const resetAnalysis =
                pickedStyle.id !== prev.firstReferenceId || pickedStyle.source !== prev.firstReferenceSource

            return {
                ...prev,
                selectedBrandKitImageIds: nextBrandKitIds,
                referenceImageRoles: nextRoles,
                ...invalidateFromStep(prev, 4),
                firstReferenceId: pickedStyle.id,
                firstReferenceSource: pickedStyle.source,
                firstVisionAnalysis: resetAnalysis ? null : prev.firstVisionAnalysis,
                visionAnalysis: resetAnalysis ? null : prev.visionAnalysis
            }
        })
    }, [invalidateFromStep])

    const setReferenceImageRole = useCallback((imageId: string, role: ReferenceImageRole) => {
        setState(prev => {
            const isSelected = prev.uploadedImages.includes(imageId) || prev.selectedBrandKitImageIds.includes(imageId)
            if (!isSelected) return prev

            const nextRoles = { ...prev.referenceImageRoles }
            const isTargetUpload = prev.uploadedImages.includes(imageId)
            const isTargetBrandKit = prev.selectedBrandKitImageIds.includes(imageId)
            let safeRole: ReferenceImageRole =
                prev.imageSourceMode === 'generate' && (role === 'content' || role === 'style_content')
                    ? 'style'
                    : role

            // Priority by block order:
            // Upload references (upper block) cannot be overridden by lower block (brand kit)
            // when assigning style ownership.
            if (
                isTargetBrandKit &&
                (safeRole === 'style' || safeRole === 'style_content') &&
                hasUploadedStyleRole(prev.uploadedImages, nextRoles, imageId)
            ) {
                safeRole = prev.imageSourceMode === 'generate'
                    ? 'logo'
                    : (nextRoles[imageId] === 'style' || nextRoles[imageId] === 'style_content'
                        ? 'content'
                        : (nextRoles[imageId] || 'content'))
            }

            if (safeRole === 'style' || safeRole === 'style_content') {
                ;[...prev.uploadedImages, ...prev.selectedBrandKitImageIds].forEach((id) => {
                    if (id === imageId) return
                    if (nextRoles[id] === 'style' || nextRoles[id] === 'style_content') {
                        const isOtherUpload = prev.uploadedImages.includes(id)
                        // Never demote upper-block style from a lower-block assignment.
                        if (isTargetBrandKit && isOtherUpload) return
                        if (isTargetUpload || !isOtherUpload) {
                            nextRoles[id] = prev.imageSourceMode === 'generate' ? 'logo' : 'content'
                        }
                    }
                })
            }
            nextRoles[imageId] = safeRole
            const roleCounts = getReferenceRoleCounts(
                prev.uploadedImages,
                prev.selectedBrandKitImageIds,
                nextRoles
            )
            const roleLimitError = getReferenceRoleLimitError(roleCounts)
            if (roleLimitError) {
                return {
                    ...prev,
                    error: roleLimitError,
                }
            }

            const pickedStyle = pickStyleReference(prev.uploadedImages, prev.selectedBrandKitImageIds, nextRoles)
            const resetAnalysis =
                pickedStyle.id !== prev.firstReferenceId || pickedStyle.source !== prev.firstReferenceSource

            return {
                ...prev,
                customStyle: prev.customStyle,
                referenceImageRoles: nextRoles,
                selectedStylePresetId: (safeRole === 'style' || safeRole === 'style_content')
                    ? null
                    : prev.selectedStylePresetId,
                selectedStylePresetName: (safeRole === 'style' || safeRole === 'style_content')
                    ? null
                    : prev.selectedStylePresetName,
                firstReferenceId: pickedStyle.id,
                firstReferenceSource: pickedStyle.source,
                firstVisionAnalysis: resetAnalysis ? null : prev.firstVisionAnalysis,
                visionAnalysis: resetAnalysis ? null : prev.visionAnalysis,
                ...invalidateFromStep(prev, 4)
            }
        })
    }, [invalidateFromStep])

    const setAiImageDescription = useCallback((description: string) => {
        setState(prev => ({
            ...prev,
            aiImageDescription: description,
            ...invalidateFromStep(prev, 4)
        }))
    }, [invalidateFromStep])

    const setStylePreset = useCallback((
        preset: { id: string; name: string; analysis?: VisionAnalysis | null } | null
    ) => {
        setState(prev => {
            if (!preset) {
                return {
                    ...prev,
                    selectedStylePresetId: null,
                    selectedStylePresetName: null,
                    firstVisionAnalysis: null,
                    visionAnalysis: null,
                    ...invalidateFromStep(prev, 4),
                }
            }

            const nextRoles = { ...prev.referenceImageRoles }
            ;[...prev.uploadedImages, ...prev.selectedBrandKitImageIds].forEach((id) => {
                if (nextRoles[id] === 'style' || nextRoles[id] === 'style_content') {
                    nextRoles[id] = prev.imageSourceMode === 'generate' ? 'logo' : 'content'
                }
            })

            return {
                ...prev,
                referenceImageRoles: nextRoles,
                selectedStylePresetId: preset.id,
                selectedStylePresetName: preset.name,
                firstReferenceId: null,
                firstReferenceSource: null,
                firstVisionAnalysis: preset.analysis ?? null,
                visionAnalysis: preset.analysis ?? null,
                ...invalidateFromStep(prev, 4),
            }
        })
    }, [invalidateFromStep])

    // -------------------------------------------------------------------------
    // STEP 3: Style Selection
    // -------------------------------------------------------------------------

    const toggleStyle = useCallback((styleId: string) => {
        setState(prev => {
            const isSelected = prev.selectedStyles.includes(styleId)
            // Mutually exclusive: If selecting a new one, clear previous ones.
            // If deselecting the current one, just clear.
            const newStyles = isSelected ? [] : [styleId]

            return {
                ...prev,
                selectedStyles: newStyles,
                ...invalidateFromStep(prev, 4), // Invalidate to force new generation
                currentStep: prev.hasGeneratedImage
                    ? 4
                    : (newStyles.length > 0 ? 6 : prev.currentStep) // Auto-advance to Step 6 (Texts) if style selected
            }
        })
    }, [invalidateFromStep])

    // -------------------------------------------------------------------------
    // STEP 4: Layout Selection
    // -------------------------------------------------------------------------

    const selectLayout = useCallback((layoutId: string) => {
        setState(prev => ({
            ...prev,
            selectedLayout: layoutId,
            // Step 3 defaults: platform preset, format must be explicitly chosen.
            ...invalidateFromStep(prev, 2),
            currentStep: Math.max(prev.currentStep, 2)
        })) // Auto-advance to Step 3 (Format)
    }, [invalidateFromStep])

    // Used by basic mode auto-selection. Keeps current format/step untouched.
    const setSelectedLayoutForGeneration = useCallback((layoutId: string) => {
        setState(prev => (prev.selectedLayout === layoutId ? prev : {
            ...prev,
            selectedLayout: layoutId,
        }))
    }, [])

    // -------------------------------------------------------------------------
    // STEP 5: Final Format Selection
    // -------------------------------------------------------------------------

    // (Moved to Step 0)

    // -------------------------------------------------------------------------
    // STEP 5: Branding Configuration
    // -------------------------------------------------------------------------

    const selectLogo = useCallback((logoId: string | null) => {
        setState(prev => ({
            ...prev,
            selectedLogoId: logoId,
            ...invalidateFromStep(prev, 5)
        }))
    }, [invalidateFromStep])

    const setHeadline = useCallback((headline: string) => {
        setState(prev => {
            const newState = { ...prev, headline: headline || '' }
            // Sync with mapped intent fields
            if (currentIntent?.requiredFields) {
                const mappedField = currentIntent.requiredFields.find(f => f.mapsTo === 'headline')
                if (mappedField) {
                    newState.customTexts = { ...newState.customTexts, [mappedField.id]: headline }
                }
            }
            return newState
        })
    }, [currentIntent])

    const setCta = useCallback((cta: string) => {
        setState(prev => {
            const newState = { ...prev, cta: cta || '' }
            // Sync with mapped intent fields
            if (currentIntent?.requiredFields) {
                const mappedField = currentIntent.requiredFields.find(f => f.mapsTo === 'cta')
                if (mappedField) {
                    newState.customTexts = { ...newState.customTexts, [mappedField.id]: cta }
                }
            }
            return newState
        })
    }, [currentIntent])

    const setCaption = useCallback((caption: string) => {
        setState(prev => ({ ...prev, caption: caption || '' }))
    }, [])

    const setCtaUrl = useCallback((url: string) => {
        setState(prev => ({
            ...prev,
            ctaUrl: url || '',
            ctaUrlManual: true,
            ctaUrlEnabled: true,
        }))
    }, [])

    const setCtaUrlEnabled = useCallback((enabled: boolean, options?: { useKitIfEmpty?: boolean }) => {
        setState(prev => {
            if (!enabled) {
                return {
                    ...prev,
                    ctaUrlEnabled: false,
                    ctaUrlManual: false,
                    ctaUrl: '',
                }
            }

            const kitUrl = activeBrandKit?.url?.trim() || ''
            const shouldSeed = options?.useKitIfEmpty && !prev.ctaUrl?.trim() && kitUrl
            return {
                ...prev,
                ctaUrlEnabled: true,
                ...(shouldSeed ? { ctaUrl: kitUrl, ctaUrlManual: false } : null),
            }
        })
    }, [activeBrandKit?.url])

    const setAdditionalInstructions = useCallback((instructions: string) => {
        setState(prev => ({ ...prev, additionalInstructions: instructions }))
    }, [])

    const setRawMessage = useCallback((message: string) => {
        setState(prev => {
            if (message === prev.rawMessage) {
                return prev
            }
            return {
                ...prev,
                rawMessage: message,
                ...invalidateFromStep(prev, 1),
                currentStep: 1
            }
        })
    }, [invalidateFromStep])

    const setCustomStyle = useCallback((style: string) => {
        setState(prev => {
            const nextStyle = style || ''
            return {
                ...prev,
                customStyle: nextStyle,
                ...invalidateFromStep(prev, 4),
                currentStep: prev.hasGeneratedImage
                    ? 4
                    : (nextStyle.trim() ? Math.max(prev.currentStep, 5) : prev.currentStep)
            }
        })
    }, [invalidateFromStep])

    const setApplyStyleToTypography = useCallback((apply: boolean) => {
        setState(prev => ({
            ...prev,
            applyStyleToTypography: Boolean(apply),
            ...invalidateFromStep(prev, 4),
            currentStep: prev.hasGeneratedImage ? 4 : Math.max(prev.currentStep, 5)
        }))
    }, [invalidateFromStep])

    const setTypographyMode = useCallback((mode: TypographyProfile['mode']) => {
        setState(prev => {
            if (mode === 'auto') {
                const inferred = inferTypographyFromVision(prev.firstVisionAnalysis)
                return {
                    ...prev,
                    typography: { ...prev.typography, ...inferred, mode: 'auto' },
                    generatedImage: null
                }
            }
            return {
                ...prev,
                typography: { ...prev.typography, mode },
                generatedImage: null
            }
        })
    }, [])

    const setTypographyField = useCallback((
        field: Exclude<keyof TypographyProfile, 'mode'>,
        value: TypographyProfile[Exclude<keyof TypographyProfile, 'mode'>]
    ) => {
        setState(prev => ({
            ...prev,
            typography: { ...prev.typography, [field]: value },
            generatedImage: null
        }))
    }, [])

    const setCustomText = useCallback((id: string, value: string) => {
        setState(prev => {
            const newState = {
                ...prev,
                customTexts: { ...prev.customTexts, [id]: value || '' }
            }

            // Sync back to global headline/cta if mapped
            if (currentIntent?.requiredFields) {
                const field = currentIntent.requiredFields.find(f => f.id === id)
                if (field?.mapsTo === 'headline') newState.headline = value
                if (field?.mapsTo === 'cta') newState.cta = value
            }

            return newState
        })
    }, [currentIntent])

    const toggleNoText = useCallback((id: string) => {
        setState(prev => {
            const current = id === 'headline' ? prev.headline : (id === 'cta' ? prev.cta : prev.customTexts[id])
            const isNoText = current === NO_TEXT_TOKEN

            if (id === 'headline') return { ...prev, headline: isNoText ? '' : NO_TEXT_TOKEN }
            if (id === 'cta') return { ...prev, cta: isNoText ? '' : NO_TEXT_TOKEN }
            if (id === 'caption') return { ...prev, caption: isNoText ? '' : NO_TEXT_TOKEN } // NEW: Handle caption

            return {
                ...prev,
                customTexts: {
                    ...prev.customTexts,
                    [id]: isNoText ? '' : NO_TEXT_TOKEN
                },
                generatedImage: null,
            }
        })
    }, [])

    const generateFieldCopy = useCallback(async (field: LayoutTextField) => {
        if (!activeBrandKit || !state.selectedIntent) return

        try {
            const result = await getAICopy({
                brandName: activeBrandKit.brand_name,
                brandDNA: activeBrandKit,
                intent: state.selectedIntent,
                visionAnalysis: state.visionAnalysis,
                fieldLabel: field.label,
                fieldDescription: field.aiContext,
                rawMessage: state.rawMessage || undefined  // User's raw input as context
            })

            if (result.success && result.text) {
                // Determine if it's a standard or custom field
                if (field.id === 'headline') setHeadline(result.text)
                else if (field.id === 'cta') setCta(result.text)
                else if (field.id === 'caption') setCaption(result.text) // NEW: Handle caption
                else setCustomText(field.id, result.text)
            }
        } catch (error) {
            console.error('Error in generateFieldCopy:', error)
        }
    }, [activeBrandKit, state.selectedIntent, state.visionAnalysis, state.rawMessage, setHeadline, setCta, setCaption, setCustomText])

    const generateCustomFieldCopy = useCallback(async (fieldId: string) => {
        if (!activeBrandKit || !state.selectedIntent || !currentIntent?.requiredFields) return

        const field = currentIntent.requiredFields.find(f => f.id === fieldId)
        if (!field) return

        try {
            const result = await getAICopy({
                brandName: activeBrandKit.brand_name,
                brandDNA: activeBrandKit,
                intent: state.selectedIntent,
                visionAnalysis: state.visionAnalysis,
                fieldLabel: field.label,
                fieldDescription: field.aiContext,
                rawMessage: state.rawMessage || undefined
            })

            if (result.success && result.text) {
                setCustomText(fieldId, result.text)
            }
        } catch (error) {
            console.error('Error in generateCustomFieldCopy:', error)
        }
    }, [activeBrandKit, state.selectedIntent, currentIntent, state.visionAnalysis, state.rawMessage, setCustomText])

    const toggleBrandColor = useCallback((color: string, forceRole?: ColorRole) => {
        console.log('[useCreationFlow] toggleBrandColor called with:', color)
        setState(prev => {
            const normalizedColor = color.startsWith('#') ? color.toLowerCase() : `#${color.toLowerCase()}`
            // Sequence: Acento -> Texto -> Fondo -> Deseleccionar
            const roles: ColorRole[] = ['Acento', 'Texto', 'Fondo']
            const index = prev.selectedBrandColors.findIndex(c => c.color.toLowerCase() === normalizedColor)

            if (index === -1) {
                // First click: Add as Acento (or forced role if provided)
                return {
                    ...prev,
                    selectedBrandColors: [...prev.selectedBrandColors, { color: normalizedColor, role: forceRole || 'Acento' }],
                    ...invalidateFromStep(prev, 5)
                }
            } else {
                // Already selected: cycle roles or remove
                const currentRole = prev.selectedBrandColors[index].role

                // If forceRole is provided and it's the same, it means we might want to deselect or just keep it.
                // But for now, let's keep the cycling logic if no forceRole is given.
                if (forceRole) {
                    const newColors = [...prev.selectedBrandColors]
                    newColors[index] = { ...newColors[index], role: forceRole }
                    return { ...prev, selectedBrandColors: newColors, ...invalidateFromStep(prev, 5) }
                }

                const roleIndex = roles.indexOf(currentRole)

                // Sequence: Non-standard -> Acento (0) -> Texto (1) -> Fondo (2) -> Back to Acento (0)
                // The only way to remove is via the "X" button (removeBrandColor)
                if (roleIndex === -1 || roleIndex === roles.length - 1) {
                    const nextRole = roles[0]
                    const newColors = [...prev.selectedBrandColors]
                    newColors[index] = { ...newColors[index], role: nextRole }
                    console.log(`[useCreationFlow] Role cycle: ${currentRole} -> ${nextRole}`)
                    return { ...prev, selectedBrandColors: newColors, generatedImage: null }
                } else {
                    // Cycle to next role
                    const newRole = roles[roleIndex + 1]
                    const newColors = [...prev.selectedBrandColors]
                    newColors[index] = { ...newColors[index], role: newRole }
                    console.log(`[useCreationFlow] Role cycle: ${currentRole} -> ${newRole}`)
                    return {
                        ...prev,
                        selectedBrandColors: newColors,
                        ...invalidateFromStep(prev, 5)
                    }
                }
            }
        })
    }, [invalidateFromStep])

    const removeBrandColor = useCallback((color: string) => {
        console.log('[useCreationFlow] removeBrandColor called with:', color)
        setState(prev => {
            const normalizedColor = color.startsWith('#') ? color.toLowerCase() : `#${color.toLowerCase()}`
            const before = prev.selectedBrandColors.length
            const newColors = prev.selectedBrandColors.filter(c => c.color.toLowerCase() !== normalizedColor)
            const after = newColors.length
            console.log(`[useCreationFlow] Color removal: ${normalizedColor}. Count before: ${before}, after: ${after}`)
            if (before === after) {
                console.warn('[useCreationFlow] NO COLOR WAS REMOVED! Check for string mismatch. Current colors:', prev.selectedBrandColors.map(c => c.color))
            }
            return {
                ...prev,
                selectedBrandColors: newColors,
                ...invalidateFromStep(prev, 5)
            }
        })
    }, [invalidateFromStep])

    const swapBrandColorPositions = useCallback((colorA: string, colorB: string) => {
        setState(prev => {
            const normA = colorA.startsWith('#') ? colorA.toLowerCase() : `#${colorA.toLowerCase()}`
            const normB = colorB.startsWith('#') ? colorB.toLowerCase() : `#${colorB.toLowerCase()}`
            const idxA = prev.selectedBrandColors.findIndex(c => c.color.toLowerCase() === normA)
            const idxB = prev.selectedBrandColors.findIndex(c => c.color.toLowerCase() === normB)
            if (idxA === -1 || idxB === -1 || idxA === idxB) return prev
            const newColors = [...prev.selectedBrandColors]
            const temp = newColors[idxA]
            newColors[idxA] = newColors[idxB]
            newColors[idxB] = temp
            return { ...prev, selectedBrandColors: newColors }
        })
    }, [])

    const refreshBrandColorsFromKit = useCallback(() => {
        const nextColors = buildBrandColorsFromKit()
        if (nextColors.length === 0) return
        setState(prev => ({
            ...prev,
            selectedBrandColors: nextColors,
            ...invalidateFromStep(prev, 5),
        }))
    }, [buildBrandColorsFromKit, invalidateFromStep])

    const syncBrandingFromActiveKit = useCallback(() => {
        const nextColors = buildBrandColorsFromKit()
        const nextLogoId = getPrimaryBrandKitLogoId(activeBrandKit) ?? null
        const hasBrandKitLogos = Array.isArray(activeBrandKit?.logos) && activeBrandKit.logos.length > 0

        setState(prev => {
            const resolvedColors = nextColors.length > 0 ? nextColors : prev.selectedBrandColors
            const resolvedLogoId = hasBrandKitLogos ? nextLogoId : prev.selectedLogoId

            const colorsUnchanged =
                resolvedColors.length === prev.selectedBrandColors.length &&
                resolvedColors.every((item, index) =>
                    item.color === prev.selectedBrandColors[index]?.color &&
                    item.role === prev.selectedBrandColors[index]?.role
                )

            if (colorsUnchanged && resolvedLogoId === prev.selectedLogoId) {
                return prev
            }

            return {
                ...prev,
                selectedBrandColors: resolvedColors,
                selectedLogoId: resolvedLogoId,
                ...invalidateFromStep(prev, 5),
            }
        })
    }, [activeBrandKit, buildBrandColorsFromKit, invalidateFromStep])

    const addCustomColor = useCallback((color: string) => {
        const normalizedColor = color.startsWith('#') ? color.toLowerCase() : `#${color.toLowerCase()}`
        // Basic hex validation
        if (!/^#[0-9a-f]{6}$/i.test(normalizedColor)) return

        setState(prev => {
            const exists = prev.selectedBrandColors.some(c => c.color.toLowerCase() === normalizedColor)
            if (exists) return prev
            return {
                ...prev,
                selectedBrandColors: [...prev.selectedBrandColors, { color: normalizedColor, role: 'Acento' }],
                ...invalidateFromStep(prev, 5)
            }
        })
    }, [invalidateFromStep])

    // -------------------------------------------------------------------------
    // TEXT ASSETS MANAGEMENT
    // -------------------------------------------------------------------------

    const setSelectedTextAssets = useCallback((assets: TextAsset[]) => {
        setState(prev => ({ ...prev, selectedTextAssets: assets }))
    }, [])

    const addTextAsset = useCallback((asset: TextAsset) => {
        setState(prev => {
            const exists = prev.selectedTextAssets.some(a => a.id === asset.id)
            if (exists) return prev
            return { ...prev, selectedTextAssets: [...prev.selectedTextAssets, asset] }
        })
    }, [])

    const removeTextAsset = useCallback((id: string) => {
        setState(prev => ({
            ...prev,
            selectedTextAssets: prev.selectedTextAssets.filter(a => a.id !== id)
        }))
    }, [])

    const updateTextAsset = useCallback((id: string, value: string) => {
        setState(prev => ({
            ...prev,
            selectedTextAssets: prev.selectedTextAssets.map(a =>
                a.id === id ? { ...a, value } : a
            )
        }))
    }, [])

    const generateTextForField = useCallback(async (fieldType: string): Promise<string> => {
        if (!state.rawMessage) return ''

        const brandContext = activeBrandKit ? `
Marca: ${activeBrandKit.brand_name || 'Sin nombre'}
Tagline: ${activeBrandKit.tagline || 'No definido'}
Tono de voz: ${activeBrandKit.tone_of_voice?.join(', ') || 'Profesional'}
URL: ${activeBrandKit.url || 'No disponible'}
` : ''

        const fieldPrompts: Record<string, string> = {
            'cta': 'Genera un Call-to-Action (CTA) corto, persuasivo y directo (máximo 4-5 palabras). Debe incitar a la acción inmediata.',
            'tagline': 'Genera un tagline memorable y conciso (máximo 6-8 palabras) que capture la esencia de la propuesta.',
            'url': 'Sugiere un texto descriptivo corto para acompañar la URL (ej: "Visita nuestra web", "Descubre más").',
            'headline': 'Genera un titular impactante y atractivo (máximo 8-10 palabras).',
            'caption': 'Genera un pie de foto o descripción corta para redes sociales (máximo 20 palabras).', // NEW: Caption prompt
            'custom': 'Genera un texto de marketing corto y relevante (máximo 10 palabras).',
        }

        const prompt = `
Eres un experto en copywriting y marketing digital.

CONTEXTO DE LA MARCA:
${brandContext}

INTENCIÓN DEL USUARIO:
"${state.rawMessage}"

TAREA:
${fieldPrompts[fieldType] || fieldPrompts['custom']}

RESPONDE ÚNICAMENTE con el texto generado, sin comillas ni explicaciones adicionales.
`

        try {
            const response = await fetch('/api/generate-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            })

            if (!response.ok) {
                console.error('Error generating text:', response.statusText)
                return ''
            }

            const data = await response.json()
            return data.text?.trim() || ''
        } catch (error) {
            console.error('Error generating text:', error)
            return ''
        }
    }, [activeBrandKit, state.rawMessage])

    // -------------------------------------------------------------------------
    // COMPUTED VALUES
    // -------------------------------------------------------------------------


    const availableStyles = useMemo(() => {
        const combinedStyles: Array<{ id: string; label: string; icon: string; keywords: string[]; category: string }> = []

        // 1. BRAND KIT STYLES (Priority)
        if (activeBrandKit) {
            // Add visual_aesthetic entries
            const aesthetics = activeBrandKit.visual_aesthetic || []
            aesthetics.forEach((style, i) => {
                combinedStyles.push({
                    id: `brand_aesthetic_${i}`,
                    label: style,
                    icon: '💼', // Briefcase for Brand
                    keywords: [style.toLowerCase()],
                    category: 'brand'
                })
            })

            // EXCLUDED: visual_keywords (to keep the list focused on aesthetics)
        }

        // 2. DYNAMIC SUGGESTIONS FROM VISION ANALYSIS (Top 4 Keywords)
        if (state.visionAnalysis && state.visionAnalysis.keywords) {
            // Take up to 4 keywords from the analysis
            const topKeywords = state.visionAnalysis.keywords.slice(0, 4)

            topKeywords.forEach((keyword, i) => {
                // Ensure we don't duplicate if it's already in brand styles
                if (!combinedStyles.some(s => s.label.toLowerCase() === keyword.toLowerCase())) {
                    combinedStyles.push({
                        id: `suggested_vision_${i}`,
                        label: keyword.charAt(0).toUpperCase() + keyword.slice(1), // Capitalize
                        icon: '✨', // Sparkles for AI
                        keywords: [keyword.toLowerCase()],
                        category: 'suggested'
                    })
                }
            })
        }

        // 3. FALLBACK: If no analysis, show general defaults is NOT desired by user.
        // User strictly wants Brand + Analysis.

        return combinedStyles
    }, [state.visionAnalysis, activeBrandKit])

    // Advanced mode catalog (intent-aware). Basic mode uses internal rotating safe layouts.
    const availableLayouts: LayoutOption[] = state.selectedIntent
        ? (MERGED_LAYOUTS_BY_INTENT[state.selectedIntent] || DEFAULT_LAYOUTS)
        : DEFAULT_LAYOUTS

    const selectedLayoutMeta = ALL_IMAGE_LAYOUTS.find(l => l.id === state.selectedLayout)

    // -------------------------------------------------------------------------
    // PROMPT CONSTRUCTION
    // -------------------------------------------------------------------------

    const buildGenerationPrompt = useCallback((overrides?: Partial<GenerationState>): string => {
        const activeState = overrides ? { ...state, ...overrides } : state
        const activeIntent = overrides?.selectedIntent
            ? INTENT_CATALOG.find(i => i.id === overrides.selectedIntent)
            : currentIntent

        const sections: string[] = []

        // ---------------------------------------------------------------------
// PRIORITY 12 - PREFERRED LANGUAGE ENFORCEMENT
        // ---------------------------------------------------------------------
        const userLanguage = detectLanguage(
            activeState.rawMessage || activeState.headline || activeState.cta || ''
        ) || 'es'
        sections.push(
            P12.PRIORITY_HEADER,
            ``,
            P12.LANGUAGE_ENFORCEMENT_INSTRUCTION(userLanguage),
            ``
        )

        // ---------------------------------------------------------------------
        

        // ---------------------------------------------------------------------
        // PRIORITY 10 - ABSOLUTE OVERRIDE (Logo Integrity)
        // ---------------------------------------------------------------------
        if (activeState.selectedLogoId && activeBrandKit?.logos) {
            const logo = resolveSelectedBrandKitLogo(activeBrandKit, activeState.selectedLogoId)
            if (logo) {
                sections.push(
                    P10.PRIORITY_HEADER,
                    ``,
                    P10.LOGO_INTEGRITY_INTRO,
                    ``,
                    P10.LOGO_INTEGRITY_RULES,
                    ``
                )
            }
        }

        // ---------------------------------------------------------------------
        // PRIORITY 10b - SECONDARY LOGOS HIERARCHY
        // ---------------------------------------------------------------------
        // When reference images are provided (brand kit OR uploaded), instruct the model to detect
        // and properly hierarchy any logos found (collaborators, sponsors, institutions, etc.)
        const referenceRoles = activeState.referenceImageRoles || {}
        const manualRefsEnabled = activeState.imageSourceMode !== 'generate'
        const visualReferenceIds = (manualRefsEnabled
            ? [...activeState.uploadedImages, ...activeState.selectedBrandKitImageIds]
            : [])
            .filter((id) => (referenceRoles[id] || 'content') !== 'style')
        const hasReferenceImages = visualReferenceIds.length > 0
        if (hasReferenceImages) {
            sections.push(
                P10B.PRIORITY_HEADER,
                ``,
                P10B.ANALYSIS_INSTRUCTION,
                ``,
                P10B.HIERARCHY_RULES,
                ``,
                P10B.VISUAL_TREATMENT,
                ``,
                P10B.AVOID_INSTRUCTION,
                ``
            )
        }

        // ---------------------------------------------------------------------
        // PRIORITY 9 - BRAND DNA & MANDATORY TEXT
        // ---------------------------------------------------------------------
        const brandDNA: string[] = []
        const hasTone = (activeBrandKit?.tone_of_voice?.length ?? 0) > 0

        if (hasTone) {
            brandDNA.push(P09.PRIORITY_HEADER, ``)

            brandDNA.push(`BRAND TONE: ${activeBrandKit!.tone_of_voice.join(', ')}`)

            brandDNA.push(
                ``,
                P09.BRAND_DNA_REQUIREMENT,
                ``
            )
        }

        // TEXT CONTENT (Part of P9 - Mandatory)
        const textParts: string[] = []
        const contactParts: string[] = []
        const contactLabelRegex = /\b(tel[e?]fono|telefono|m[o?]vil|movil|phone|whatsapp|email|e-mail|correo|mail|url|web|website|sitio|instagram|tiktok|linkedin|youtube|x|twitter|facebook|usuario|user|handle|direcci[oó]n|direccion|address|domicilio|ubicaci[oó]n|ubicacion)\b/i
        const hasEmail = (value: string) => /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value)
        const hasUrl = (value: string) => /(https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,}(\/|$))/i.test(value)
        const hasHandle = (value: string) => /(^|\s)@[a-z0-9._]{2,}/i.test(value)
        const hasPhone = (value: string) => {
            const digits = value.replace(/\D/g, '')
            if (digits.length < 7) return false
            return /(\+?\d[\d\s().-]{6,}\d)/.test(value) || /^(\+?\d{7,})$/.test(digits)
        }
        const hasPhysicalAddress = (value: string) => {
            const v = value.trim()
            if (!v) return false
            return /\b(calle|c\/|avda|avenida|plaza|pza|camino|carretera|rd|road|street|st\.?|avenue|ave\.?|blvd|boulevard|cp|c\.p\.|postal)\b/i.test(v)
                || /\b\d{1,4}\b/.test(v) && /\b([a-záéíóúñ]{4,})\b/i.test(v)
        }
        const isContactField = (label: string, value: string, type?: TextAsset['type']) => {
            const normalizedLabel = label.trim()
            if (type === 'url') return true
            if (type === 'cta') return false
            return (
                contactLabelRegex.test(normalizedLabel) ||
                hasEmail(value) ||
                hasUrl(value) ||
                hasHandle(value) ||
                hasPhone(value) ||
                hasPhysicalAddress(value)
            )
        }
        const headlineValue = activeState.headline?.trim()
        if (headlineValue && headlineValue !== NO_TEXT_TOKEN) {
            textParts.push(`- HEADLINE: "${headlineValue}"`)
        }

        const ctaValue = activeState.cta?.trim()
        const ctaUrl = activeState.ctaUrlEnabled ? activeState.ctaUrl?.trim() : ''
        if (ctaValue && ctaValue !== NO_TEXT_TOKEN) {
            if (ctaUrl) {
                // URL is the HERO element, CTA label is secondary above it (from p09b-cta-url-hierarchy.ts)
                textParts.push(P09B.URL_HERO_INSTRUCTION(ctaUrl))
                textParts.push(P09B.CTA_SECONDARY_INSTRUCTION(ctaValue))
            } else {
                textParts.push(P09B.CTA_ONLY_INSTRUCTION(ctaValue))
            }
        }

        Object.entries(activeState.customTexts).forEach(([id, val]) => {
            // Support strings or arrays (greedy parser sometimes returns arrays)
            const stringVal = Array.isArray(val) ? val.join(', ') : String(val ?? '')
            const cleanVal = stringVal.trim()

            if (cleanVal && cleanVal !== 'undefined' && cleanVal !== 'null') {
                // Filter out what is already mapped to headline/cta
                const fieldMeta = activeIntent?.requiredFields?.find(f => f.id === id)
                if (fieldMeta?.mapsTo) return

                const displayLabel = fieldMeta?.label || id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                const entry = `- ${displayLabel}: "${cleanVal}"`
                if (isContactField(displayLabel, cleanVal)) {
                    contactParts.push(entry)
                } else {
                    textParts.push(entry)
                }
            }
        })

        // Add selected text assets from Brand DNA Panel
        activeState.selectedTextAssets.forEach(asset => {
            if (asset.type === 'cta' || asset.type === 'url') return
            if (asset.value?.trim()) {
                const assetLabel = asset.label.toUpperCase()
                const assetValue = asset.value.trim()
                const entry = `- ${assetLabel}: "${assetValue}"`
                if (isContactField(assetLabel, assetValue, asset.type)) {
                    contactParts.push(entry)
                } else {
                    textParts.push(entry)
                }
            }
        })

        if (textParts.length > 0 || contactParts.length > 0) {
            brandDNA.push(P09.MANDATORY_TEXT_HEADER)
            brandDNA.push(P09.TEXT_FIT_SAFETY_RULES)
            brandDNA.push(P09.buildTypographyContract(activeBrandKit?.fonts))
            if (activeState.ctaUrlEnabled && activeState.ctaUrl?.trim()) {
                brandDNA.push(P09B.CRITICAL_HIERARCHY_INSTRUCTION(activeState.ctaUrl))
            }
            if (textParts.length > 0) {
                brandDNA.push(...textParts, ``)
            }
            if (contactParts.length > 0) {
                brandDNA.push(
                    P09.CONTACT_INFO_LAYOUT_RULES,
                    `CONTACT INFORMATION (SEPARATE BLOCK):`,
                    ...contactParts,
                    ``
                )
            }
        } else if (activeState.rawMessage) {
            brandDNA.push(P09.MANDATORY_TEXT_HEADER, `(No explícitos, extraer de la INTENCIÓN ORIGINAL)`, ``)
        } else {
            brandDNA.push(P09.NO_TEXT_WARNING, ``)
        }
        if (activeState.rawMessage) {
            brandDNA.push(`USER ORIGINAL INTENTION / RAW CONTEXT:`, `"${activeState.rawMessage}"`, ``)
        }

        if (brandDNA.length > 0) {
            sections.push(...brandDNA)
        }

        // ---------------------------------------------------------------------
        // PRIORITY 8 - CUSTOM DIRECTOR INSTRUCTIONS
        // ---------------------------------------------------------------------
        if (activeState.additionalInstructions) {
            sections.push(
                P08.PRIORITY_HEADER,
                ``,
                `"${activeState.additionalInstructions}"`,
                ``,
                P08.OVERRIDE_NOTE,
                ``
            )
        }

        // ---------------------------------------------------------------------
        // PRIORITY 7 - COMPOSITION & LAYOUT (Dynamic from selected layout)
        // ---------------------------------------------------------------------
        if (activeState.selectedLayout) {
            // Busca en todos los layouts para soportar composiciones basicas cross-intent.
            const layoutDef = ALL_IMAGE_LAYOUTS.find((l) => l.id === activeState.selectedLayout)

            const structuralPrompt = sanitizeStructuralPromptForModel(layoutDef?.structuralPrompt)
            if (structuralPrompt) {
                sections.push(
                    `╔═════════════════════════════════════════════════════════════════╗`,
                    `║  PRIORITY 7 - COMPOSITION & LAYOUT                             ║`,
                    `╚═════════════════════════════════════════════════════════════════╝`,
                    ``,
                    structuralPrompt,
                    ``
                )
            }
        }

        // ---------------------------------------------------------------------
        // PRIORITY 7 - LAYOUT & COMPOSITIONAL STRUCTURE (TEMPORARILY DISABLED)
        // ---------------------------------------------------------------------
        // COMMENTED OUT TO TEST INTENT PROMPTS EXCLUSIVELY
        /*
        const layoutParts: string[] = [
            P07.PRIORITY_HEADER,
            ``
        ]
     
        if (selectedLayoutMeta) {
            // If there's a reference template image for this layout, mention it
            if (selectedLayoutMeta.referenceImage) {
                layoutParts.push(P07.REFERENCE_TEMPLATE_NOTE)
            }
     
            if (selectedLayoutMeta.structuralPrompt) {
                layoutParts.push(
                    ``,
                    P07.STRUCTURAL_DNA_START,
                    selectedLayoutMeta.structuralPrompt.trim(),
                    P07.STRUCTURAL_DNA_END,
                    ``
                )
            } else {
                // Layouts without a prompt still exist to track the reference image
            }
        } else {
            layoutParts.push(
                P07.AI_CREATIVE_CONTROL,
                ``
            )
        }
     
        sections.push(...layoutParts)
        */

        // ---------------------------------------------------------------------
        // PRIORITY 6 - SUBJECT & VISUAL CONTEXT
        // ---------------------------------------------------------------------
        const subjectParts: string[] = []
        const ENABLE_PRIORITY_6 = false // Suspended by request; set true to restore

        if (
            ENABLE_PRIORITY_6 &&
            (activeState.visionAnalysis || (activeState.imageSourceMode === 'generate' && activeState.aiImageDescription.trim()))
        ) {
            subjectParts.push(
                P06.PRIORITY_HEADER,
                ``
            )

            // Prioritize AI Description if we are explicitly in 'generate' mode
            const useAiDescription = activeState.imageSourceMode === 'generate' && activeState.aiImageDescription.trim()

            if (useAiDescription) {
                subjectParts.push(
                    P06.AI_GENERATED_REFERENCE_HEADER,
                    P06.AI_GENERATED_REFERENCE_INSTRUCTION(activeState.aiImageDescription.trim()),
                    ``
                )
            }
            // Fallback to vision analysis (from upload or brand kit) if available
            else if (activeState.visionAnalysis) {
                subjectParts.push(`SUBJECT: ${activeState.visionAnalysis.subjectLabel}`)
                if (activeState.visionAnalysis.keywords.length > 0) {
                    subjectParts.push(`KEYWORDS: ${activeState.visionAnalysis.keywords.join(', ')}`)
                }
                subjectParts.push(`LIGHTING: ${activeState.visionAnalysis.lighting}`, ``)
            }
        }

        if (subjectParts.length > 0) {
            sections.push(...subjectParts)
        }

        // ---------------------------------------------------------------------
        // PRIORITY 6B - AI IMAGE DESCRIPTION (TEXT-ONLY)
        // ---------------------------------------------------------------------
        const aiDescription = activeState.imageSourceMode === 'generate'
            ? activeState.aiImageDescription.trim()
            : ''

        if (aiDescription) {
            sections.push(
                P06B.PRIORITY_HEADER,
                ``,
                P06B.AI_IMAGE_DESCRIPTION_INSTRUCTION(aiDescription),
                ``
            )
        }

        // ---------------------------------------------------------------------
        // PRIORITY 5 - VISUAL STYLE & AESTHETIC
        // ---------------------------------------------------------------------
        const customStyle = activeState.customStyle?.trim()
        const selectedReferenceIds = [
            ...(activeState.uploadedImages || []),
            ...(activeState.selectedBrandKitImageIds || [])
        ]
        const hasActiveStyleReference = selectedReferenceIds.some((id) => {
            const role = activeState.referenceImageRoles?.[id]
            return role === 'style' || role === 'style_content'
        })
        const hasStylePresetSelected = Boolean(activeState.selectedStylePresetId)
        const styleAnalysis = (hasActiveStyleReference || hasStylePresetSelected)
            ? (activeState.firstVisionAnalysis ?? activeState.visionAnalysis)
            : null
        const styleSignals = extractStyleSignals(customStyle, styleAnalysis)
        const hasBrandTypographyContract = Boolean(activeBrandKit?.fonts && activeBrandKit.fonts.length > 0)
        const typographyDirection = hasBrandTypographyContract
            ? ''
            : buildSimpleTypographyDirection(activeState.typography, styleSignals)
        const visualDirectiveLine = buildVisualStyleDirective(customStyle, styleAnalysis)
        const hasStyleDirectiveSource = Boolean(
            customStyle ||
            hasStylePresetSelected ||
            hasActiveStyleReference ||
            (styleAnalysis?.keywords?.length || 0) > 0
        )

        if (hasStyleDirectiveSource || typographyDirection) {
            sections.push(
                P05.PRIORITY_HEADER,
                ``,
                visualDirectiveLine,
                P09.TYPOGRAPHY_LOCK_REFERENCE,
                `COLOR DOMINANCE RULE: Style cues define form, line quality, texture and composition. PRIORITY 4 brand palette controls final hue decisions. Do not override brand colors with fixed external color schemes.`,
                ``,
                typographyDirection ? `${typographyDirection}` : ``,
                `STYLE SOURCE RULE: The style reference was analyzed as text-only guidance. DO NOT reproduce its exact subject/object unless explicitly requested in the mandatory text.`,
                ``,
                P05.STYLE_REQUIREMENT,
                ``
            )
        }

        // ---------------------------------------------------------------------
        // PRIORITY 4 - BRAND COLOR PALETTE (with explicit roles)
        // ---------------------------------------------------------------------
        const hasSelectedColors = activeState.selectedBrandColors.length > 0

        let colorsToUse: SelectedColor[] = []

        if (hasSelectedColors) {
            colorsToUse = activeState.selectedBrandColors
        }

        if (colorsToUse.length > 0) {
            sections.push(P04.PRIORITY_HEADER)
            sections.push(`Below is the STRICT color palette for this generation. Use these specific values and respect their assigned semantic roles:`)
            sections.push(``)

            // Group by role for better AI clarity
            const coreRoles = ['Fondo', 'Texto', 'Acento'] as const
            const usedColors = new Set<string>()

            // 1. Group Core Roles (with smart mapping for Principal -> Fondo)
            coreRoles.forEach(role => {
                const group = colorsToUse.filter(c => {
                    const normalizedRole = (c.role as string) === 'Principal' ? 'Fondo' : c.role
                    return normalizedRole === role
                })

                if (group.length > 0) {
                    const label = (P04.ROLE_LABELS as any)[role] || role.toUpperCase()
                    sections.push(`### ${label}`)
                    group.forEach(c => {
                        sections.push(`- ${c.color}`)
                        usedColors.add(c.color.toLowerCase())
                    })
                    sections.push(``)
                }
            })

            // 2. Group Extras (any colors not yet listed)
            const extras = colorsToUse.filter(c => !usedColors.has(c.color.toLowerCase()))
            if (extras.length > 0) {
                sections.push(`### EXTRA / SECONDARY COLORS`)
                extras.forEach(c => {
                    const displayRole = (P04.ROLE_LABELS as any)[c.role] || c.role || 'Acento'
                    sections.push(`- ${c.color} (${displayRole})`)
                })
                sections.push(``)
            }

            sections.push(P04.COLOR_USAGE_GUIDELINES)
            sections.push(``)
        }

        // ---------------------------------------------------------------------
        // PRIORITY 2 - TECHNICAL SPECIFICATIONS
        // ---------------------------------------------------------------------
        sections.push(
            P02.PRIORITY_HEADER,
            ``,
            P02.COMPOSITION_RULES,
            ``
        )

        if (state.selectedFormat) {
            const format = SOCIAL_FORMATS.find(f => f.id === state.selectedFormat)
            if (format) {
                sections.push(
                    `FORMAT: ${format.name}`,
                    `ASPECT RATIO: ${format.aspectRatio}`,
                    ``
                )
            }
        }

        // ---------------------------------------------------------------------
        // FINAL COMPOSITION CHECK - URL VISIBILITY
        // ---------------------------------------------------------------------
        if (activeState.ctaUrlEnabled && activeState.ctaUrl?.trim()) {
            sections.push(
                ``,
                P09B.FINAL_URL_VISIBILITY_INSTRUCTION(activeState.ctaUrl.trim()),
                ``
            )
        }

        return sections.join('\n')
    }, [state, currentIntent, selectedLayoutMeta, activeBrandKit])

    const canGenerate = useMemo(() => {
        // Basic requirement: must have an intent
        if (!state.selectedIntent) return false;
        // Format selection is mandatory before generation.
        if (!state.selectedFormat || !state.selectedPlatform) return false;
        // Must have some form of image source or a detailed description
        const hasImageSource =
            state.imageSourceMode !== 'generate'
            && (state.uploadedImages.length > 0 || state.selectedBrandKitImageIds.length > 0);
        const hasEnoughVisualInfo = hasImageSource || (state.aiImageDescription && state.aiImageDescription.length > 10);
        return !!hasEnoughVisualInfo;
    }, [state.selectedIntent, state.selectedFormat, state.selectedPlatform, state.uploadedImages, state.selectedBrandKitImageIds, state.aiImageDescription, state.imageSourceMode])

    // -------------------------------------------------------------------------
    // GENERATION (stub for now)
    // -------------------------------------------------------------------------

    const generate = useCallback(async () => {
        setState(prev => ({ ...prev, isGenerating: true, error: null }))

        try {
            const prompt = buildGenerationPrompt()
            console.log('[CREATION FLOW] Final Prompt:\n', prompt)

            // TODO: Call actual generation API
            // For now, just log the prompt
            await new Promise(resolve => setTimeout(resolve, 1000))

            setState(prev => ({
                ...prev,
                isGenerating: false,
            }))

            // Save Generation to History (Recents)
            if (activeBrandKit?.id) {
                // Create a complete snapshot of the state (excluding File objects and transient flags)
                const stateSnapshot = {
                    // Platform & Format
                    selectedPlatform: state.selectedPlatform,
                    selectedFormat: state.selectedFormat,
                    // Intent
                    selectedGroup: state.selectedGroup,
                    selectedIntent: state.selectedIntent,
                    selectedSubMode: state.selectedSubMode,
                    // Image/Input
                    uploadedImages: state.uploadedImages, // Base64/URL array
                    selectedTheme: state.selectedTheme,
                    imageSourceMode: state.imageSourceMode,
                    selectedBrandKitImageIds: state.selectedBrandKitImageIds,
                    referenceImageRoles: state.referenceImageRoles,
                    aiImageDescription: state.aiImageDescription,
                    typography: state.typography,
                    // Styles & Layout
                    selectedStyles: state.selectedStyles,
                    selectedStylePresetId: state.selectedStylePresetId,
                    selectedStylePresetName: state.selectedStylePresetName,
                    selectedLayout: state.selectedLayout,
                    // Branding
                    selectedLogoId: state.selectedLogoId,
                    headline: state.headline,
                    cta: state.cta,
                    caption: state.caption, // NEW
                    customTexts: state.customTexts,
                    selectedBrandColors: state.selectedBrandColors,
                    rawMessage: state.rawMessage,
                    additionalInstructions: state.additionalInstructions,
                    customStyle: state.customStyle,
                    applyStyleToTypography: state.applyStyleToTypography,
                    selectedTextAssets: state.selectedTextAssets,
                }

                // Persistence is handled at the page/component level (e.g. ImagePage.tsx)
                // after the actual generation is complete and we have the final URL.
                // This prevents double-saves and document size conflicts.
                Object.keys(stateSnapshot.referenceImageRoles || {}).forEach((key) => {
                    if (key.startsWith('data:')) {
                        delete (stateSnapshot.referenceImageRoles as Record<string, ReferenceImageRole>)[key]
                    }
                })
            }

            return prompt
        } catch (error) {
            setState(prev => ({
                ...prev,
                isGenerating: false,
                error: error instanceof Error ? error.message : 'Generation failed',
            }))
            return null
        }
    }, [buildGenerationPrompt])

    // -------------------------------------------------------------------------
    // RESET
    // -------------------------------------------------------------------------

    const setGeneratedImage = useCallback((url: string | null) => {
        setState(prev => ({
            ...prev,
            generatedImage: url,
            hasGeneratedImage: Boolean(url),
        }))
    }, [])

    const reset = useCallback(() => {
        setState({ ...INITIAL_GENERATION_STATE, caption: '' }) // NEW: Reset caption
        hasInitializedBrandKit.current = false // Reset Brand Kit initialization flag
        setLastInitBrandId(null) // Reset last initialized Brand Kit ID
        optionsRef.current?.onReset?.()
    }, [])

    // -------------------------------------------------------------------------
    // PRESETS
    // -------------------------------------------------------------------------

    const loadPreset = useCallback((presetState: Partial<GenerationState>) => {
        const inferIntentFromLayout = (layoutId?: string | null) => {
            if (!layoutId) return null
            const entries = Object.entries(LAYOUTS_BY_INTENT) as Array<[IntentCategory, LayoutOption[]]>
            for (const [intentId, layouts] of entries) {
                if (layouts?.some((layout) => layout.id === layoutId)) return intentId
            }
            return null
        }

        const computeStepFromPreset = (preset: Partial<GenerationState>) => {
            let step = 1
            if (preset.selectedIntent) step = 2
            if (preset.selectedLayout) step = 3
            if (preset.selectedFormat && preset.selectedPlatform) step = 4
            const hasImageRef = (preset.uploadedImages?.length || 0) > 0
                || (preset.selectedBrandKitImageIds?.length || 0) > 0
                || (preset.aiImageDescription?.trim()?.length || 0) > 0
            if (hasImageRef) step = Math.max(step, 5)
            const hasStyles =
                (preset.selectedStyles?.length || 0) > 0
                || Boolean(preset.customStyle?.trim())
                || Boolean(preset.selectedStylePresetId)
            if (hasStyles) step = Math.max(step, 6)
            const hasBranding = Boolean(preset.selectedLogoId) || (preset.selectedBrandColors?.length || 0) > 0
            if (hasBranding) step = Math.max(step, 6)
            return step
        }

        const inferredIntent = presetState.selectedIntent || inferIntentFromLayout(presetState.selectedLayout || null) || null
        const resolvedIntent: IntentCategory | null = (inferredIntent ?? presetState.selectedIntent ?? null) as IntentCategory | null
        const defaultPlatform = presetState.selectedPlatform || 'instagram'
        const defaultFormat = presetState.selectedFormat
            || SOCIAL_FORMATS.find((format) => format.platform === defaultPlatform)?.id
            || null
        const brandKitColors = buildBrandColorsFromKit()
        const primaryBrandKitLogoId = getPrimaryBrandKitLogoId(activeBrandKit)
        const computedStep = presetState.currentStep ?? computeStepFromPreset({
            ...presetState,
            selectedIntent: resolvedIntent,
        })
        const expandedStep = Math.max(computedStep, 6)

        setState(prev => ({
            ...INITIAL_GENERATION_STATE,
            caption: '', // NEW: Ensure caption is reset for presets
            ...presetState,
            ctaUrl: activeBrandKit?.url?.trim() || presetState.ctaUrl || '',
            ctaUrlManual: false,
            ctaUrlEnabled: presetState.ctaUrlEnabled ?? Boolean(presetState.ctaUrl?.trim()),
            selectedIntent: resolvedIntent,
            selectedPlatform: presetState.selectedPlatform || defaultPlatform,
            selectedFormat: presetState.selectedFormat || defaultFormat,
            selectedLogoId: primaryBrandKitLogoId ?? presetState.selectedLogoId ?? null,
            selectedBrandColors: brandKitColors.length > 0
                ? brandKitColors
                : (presetState.selectedBrandColors || []),
            referenceImageRoles: presetState.referenceImageRoles || {},
            hasGeneratedImage: Boolean(presetState.generatedImage),
            currentStep: expandedStep,
            // Ensure clean technical state
            isGenerating: false,
            isAnalyzing: false,
            error: null,
            uploadedImageFile: null,
            visionAnalysis: null, // Reset analysis
            firstVisionAnalysis: null,
            firstReferenceId: null,
            firstReferenceSource: null,
        }))
    }, [activeBrandKit, buildBrandColorsFromKit])

    // -------------------------------------------------------------------------
    // RETURN
    // -------------------------------------------------------------------------

    const getStateSnapshot = useCallback(() => {
        const snapshot = {
            selectedPlatform: state.selectedPlatform,
            selectedFormat: state.selectedFormat,
            selectedGroup: state.selectedGroup,
            selectedIntent: state.selectedIntent,
            selectedSubMode: state.selectedSubMode,
            uploadedImages: state.uploadedImages,
            selectedTheme: state.selectedTheme,
            imageSourceMode: state.imageSourceMode,
            selectedBrandKitImageIds: state.selectedBrandKitImageIds,
            referenceImageRoles: state.referenceImageRoles,
            aiImageDescription: state.aiImageDescription,
            suggestions: state.suggestions,
            imagePromptSuggestions: state.imagePromptSuggestions,
            originalState: state.originalState,
            typography: state.typography,
            selectedStyles: state.selectedStyles,
            selectedStylePresetId: state.selectedStylePresetId,
            selectedStylePresetName: state.selectedStylePresetName,
            selectedLayout: state.selectedLayout,
            selectedLogoId: state.selectedLogoId,
            headline: state.headline,
            cta: state.cta,
            caption: state.caption, // NEW
            ctaUrl: state.ctaUrl,
            ctaUrlEnabled: state.ctaUrlEnabled,
            customTexts: state.customTexts,
            selectedBrandColors: state.selectedBrandColors,
            rawMessage: state.rawMessage,
            additionalInstructions: state.additionalInstructions,
            customStyle: state.customStyle,
            applyStyleToTypography: state.applyStyleToTypography,
            selectedTextAssets: state.selectedTextAssets,
            generatedImage: state.generatedImage,
            hasGeneratedImage: state.hasGeneratedImage,
        }

        // Safety: Strip large base64 strings (over ~50KB) to avoid Convex 1MB limit.
        // These snapshots are for restoring state; we want URLs here, not blobs.
        const stripIfLargeBase64 = (val: any) => {
            if (typeof val === 'string' && val.startsWith('data:') && val.length > 50000) {
                return null
            }
            return val
        }

        snapshot.uploadedImages = snapshot.uploadedImages.map(stripIfLargeBase64).filter(Boolean) as string[]
        snapshot.generatedImage = stripIfLargeBase64(snapshot.generatedImage)
        snapshot.referenceImageRoles = Object.fromEntries(
            Object.entries(snapshot.referenceImageRoles || {}).filter(([key]) => !key.startsWith('data:'))
        ) as Record<string, ReferenceImageRole>

        return snapshot
    }, [state])

    const setSuggestions = useCallback((suggestions: GenerationState['suggestions']) => {
        setState(prev => ({ ...prev, suggestions, selectedSuggestionIndex: null }))
    }, [])

    const setImagePromptSuggestions = useCallback((imagePromptSuggestions: string[]) => {
        setState(prev => ({ ...prev, imagePromptSuggestions }))
    }, [])

    const applySuggestion = useCallback((suggestionIndex: number) => {
        setState(prev => {
            if (!prev.suggestions || !prev.suggestions[suggestionIndex]) return prev

            // Save relevant state if not already saved, so we can undo
            const originalState = prev.originalState || {
                headline: prev.headline,
                cta: prev.cta,
                ctaUrl: prev.ctaUrl,
                ctaUrlEnabled: prev.ctaUrlEnabled,
                caption: prev.caption,
                typography: { ...prev.typography },
                customTexts: { ...prev.customTexts },
                selectedTextAssets: [...prev.selectedTextAssets]
            }

            const modifications = { ...prev.suggestions[suggestionIndex].modifications } as any
            const mappedIntentFields = new Set(
                (currentIntent?.requiredFields || [])
                    .filter((field) => field.mapsTo === 'headline' || field.mapsTo === 'cta')
                    .map((field) => field.id)
            )
            const splitLines = (value: unknown): string[] => {
                if (typeof value !== 'string') return []
                return value
                    .split(/\r?\n+/g)
                    .map((line) => line.trim())
                    .filter(Boolean)
            }
            const normalizedSuggestionLines: Array<{ label: string; value: string; type: 'custom' }> = []
            const seenLineValues = new Set<string>()
            const pushLine = (label: string, value: string) => {
                const cleanValue = value.trim()
                if (!cleanValue) return
                const key = cleanValue.toLowerCase()
                if (seenLineValues.has(key)) return
                seenLineValues.add(key)
                normalizedSuggestionLines.push({ label, value: cleanValue, type: 'custom' })
            }

            // If AI provided 'imageTexts', map them to 'selectedTextAssets' for our state
            if (modifications.imageTexts && Array.isArray(modifications.imageTexts)) {
                modifications.imageTexts.forEach((item: any) => {
                    const baseLabel = typeof item?.label === 'string' && item.label.trim() ? item.label.trim() : 'Texto'
                    const lines = splitLines(item?.value)
                    if (lines.length <= 1) {
                        pushLine(baseLabel, String(item?.value || ''))
                        return
                    }
                    lines.forEach((line, lineIdx) => {
                        const label = lineIdx === 0 ? baseLabel : `Texto ${normalizedSuggestionLines.length + 1}`
                        pushLine(label, line)
                    })
                })
                delete modifications.imageTexts
            }

            if (modifications.customTexts && typeof modifications.customTexts === 'object') {
                Object.entries(modifications.customTexts).forEach(([key, value]) => {
                    splitLines(value).forEach((line, lineIdx) => {
                        const label = lineIdx === 0 ? key.replace(/_/g, ' ') : `Texto ${normalizedSuggestionLines.length + 1}`
                        pushLine(label, line)
                    })
                })
            }

            if (normalizedSuggestionLines.length > 0) {
                modifications.selectedTextAssets = normalizedSuggestionLines.map((item, idx) => ({
                    id: `ai-sugg-${Date.now()}-${idx}`,
                    type: item.type,
                    label: item.label,
                    value: item.value
                }))
                // Avoid duplicate visual layers: when suggestion lines are rendered
                // as text assets, keep only mapped intent fields in customTexts.
                if (modifications.customTexts && typeof modifications.customTexts === 'object') {
                    const mappedOnly = Object.fromEntries(
                        Object.entries(modifications.customTexts).filter(([key]) => mappedIntentFields.has(key))
                    ) as Record<string, string>
                    if (Object.keys(mappedOnly).length > 0) {
                        modifications.customTexts = mappedOnly
                    } else {
                        delete modifications.customTexts
                    }
                } else {
                    delete modifications.customTexts
                }
            }

            return {
                ...prev,
                originalState,
                selectedSuggestionIndex: suggestionIndex,
                ...modifications,
                ...(modifications.ctaUrl ? { ctaUrlEnabled: true } : null),
                ...invalidateFromStep(prev, 1), // Invalidate image as text changed
                currentStep: prev.hasGeneratedImage ? 1 : prev.currentStep
            }
        })
    }, [currentIntent, invalidateFromStep])

    const undoSuggestion = useCallback(() => {
        setState(prev => {
            if (!prev.originalState) return prev
            return {
                ...prev,
                ...prev.originalState,
                selectedSuggestionIndex: null,
                originalState: null,
                ...invalidateFromStep(prev, 1),
                currentStep: prev.hasGeneratedImage ? 1 : prev.currentStep
            }
        })
    }, [invalidateFromStep])

    return {
        // State
        state,
        getStateSnapshot,
        // Computed
        currentIntent,
        requiresImage,
        availableStyles,
        availableLayouts,
        selectedLayoutMeta,
        canGenerate,
        // Actions
        selectGroup,
        setGeneratedImage,
        selectIntent,

        selectSubMode,
        setStep,
        nextStep,
        prevStep,
        uploadImage,
        addUploadedImage,
        removeUploadedImage,
        clearUploadedImages,
        setImageFromUrl,
        clearImage,
        setImageSourceMode,
        toggleBrandKitImage,
        clearBrandKitImages,
        setReferenceImageRole,
        setAiImageDescription,
        selectTheme,
        toggleStyle,
        selectLayout,
        setSelectedLayoutForGeneration,
        selectPlatform,
        selectFormat,
        ensureDefaultFormat,
        selectLogo,
        setHeadline,
        setCta,
        setCtaUrl,
        setCtaUrlEnabled,
        setCaption, // NEW
        setAdditionalInstructions,
        setRawMessage,
        setCustomStyle,
        setApplyStyleToTypography,
        setTypographyMode,
        setTypographyField,
        setCustomText,
        toggleNoText,
        generateFieldCopy,
        onGenerateCustomFieldCopy: generateCustomFieldCopy,
        toggleBrandColor,
        removeBrandColor,
        swapBrandColorPositions,
        refreshBrandColorsFromKit,
        syncBrandingFromActiveKit,
        addCustomColor,
        setSelectedTextAssets,
        addTextAsset,
        removeTextAsset,
        updateTextAsset,
        generateTextForField,
        buildGenerationPrompt,
        generate,
        reset,
        loadPreset,
        // Suggestions
        setSuggestions,
        setImagePromptSuggestions,
        applySuggestion,
        undoSuggestion,
        setStylePreset,
        // Constants
        styleGroups: ARTISTIC_STYLE_GROUPS,
    }
}

// -------------------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------------------

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

function buildSimpleTypographyDirection(
    typography?: TypographyProfile | null,
    styleSignals: string[] = []
): string {
    if (!typography) return ''
    if (styleSignals.length > 0) {
        // Radical mode: when a style reference exists, avoid nudging typography at all.
        return ''
    }
    return `TYPOGRAPHY DIRECTION: Keep typography simple and readable.`
}

function inferTypographyFromVision(analysis?: GenerationState['firstVisionAnalysis'] | null): TypographyProfile {
    const joined = `${analysis?.subjectLabel || ''} ${(analysis?.keywords || []).join(' ')}`.toLowerCase()
    const has = (tokens: string[]) => tokens.some((t) => joined.includes(t))

    let familyClass: TypographyProfile['familyClass'] = 'sans'
    if (has(['serif', 'editorial', 'classic', 'heritage'])) familyClass = 'serif'
    else if (has(['slab', 'poster'])) familyClass = 'slab'
    else if (has(['mono', 'code', 'terminal'])) familyClass = 'mono'
    else if (has(['script', 'handwritten', 'calligraphy'])) familyClass = 'script'
    else if (has(['display', 'impact', 'headline'])) familyClass = 'display'

    let weight: TypographyProfile['weight'] = 'semibold'
    if (has(['light', 'thin'])) weight = 'light'
    else if (has(['regular', 'neutral'])) weight = 'regular'
    else if (has(['bold'])) weight = 'bold'
    else if (has(['black', 'heavy', 'impact'])) weight = 'black'

    let width: TypographyProfile['width'] = 'normal'
    if (has(['condensed', 'compressed'])) width = 'condensed'
    else if (has(['extended', 'wide'])) width = 'extended'

    let casing: TypographyProfile['casing'] = 'title'
    if (has(['uppercase', 'all caps'])) casing = 'uppercase'
    else if (has(['sentence'])) casing = 'sentence'

    let spacing: TypographyProfile['spacing'] = 'normal'
    if (has(['tight', 'compact'])) spacing = 'tight'
    else if (has(['wide spacing', 'tracking'])) spacing = 'wide'

    const contrast: TypographyProfile['contrast'] =
        has(['high contrast', 'editorial']) || familyClass === 'serif' ? 'high' : 'low'

    let tone: TypographyProfile['tone'] = 'corporate'
    if (has(['tech', 'digital', 'futur'])) tone = 'tech'
    else if (has(['editorial', 'magazine'])) tone = 'editorial'
    else if (has(['classic', 'traditional'])) tone = 'classic'
    else if (has(['human', 'friendly', 'organic'])) tone = 'humanist'

    return {
        mode: 'auto',
        familyClass,
        weight,
        width,
        casing,
        spacing,
        contrast,
        tone
    }
}



