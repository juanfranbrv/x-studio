'use client'

import { Loader2 } from '@/components/ui/spinner'
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useBrandKit } from '@/contexts/BrandKitContext'
import { useToast } from '@/hooks/use-toast'
import { useDisablePullToRefresh } from '@/hooks/useDisablePullToRefresh'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useUser } from '@clerk/nextjs'
import { useUI } from '@/contexts/UIContext'
import {
    CarouselControlsPanel,
    CarouselSettings
} from '@/components/studio/carousel/CarouselControlsPanel'
import { CarouselCanvasPanel } from '@/components/studio/carousel/CarouselCanvasPanel'
import {
    analyzeCarouselAction,
    regenerateSlideAction,
    regenerateCarouselCaptionAction,
    CarouselSlide,
    SlideContent,
    CarouselSuggestion
} from '@/app/actions/generate-carousel'
import { parseLazyIntentAction } from '@/app/actions/parse-intent'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { INTENT_CATALOG } from '@/lib/creation-flow-types'
import { PromptDebugModal } from '@/components/studio/modals/PromptDebugModal'
import type { DebugPromptData, ReferenceImageRole, VisionAnalysis } from '@/lib/creation-flow-types'
import { buildCarouselImagePrompt } from '@/lib/prompts/carousel-image'
import { buildCarouselBrandContext } from '@/lib/carousel-brand-context'
import { extractLogoPosition } from '@/lib/prompts/carousel/builder/final-prompt'
import { resolveCarouselCompositionIcon } from '@/lib/carousel-composition-icon'
import { buildPriority5StyleBlockFromAnalysis, mergeCustomStyleIntoStyleDirectives } from '@/lib/prompts/vision/style-priority-block'
import { detectLanguageFromParts } from '@/lib/language-detection'
import { log } from '@/lib/logger'
import { FeedbackButton } from '@/components/studio/FeedbackButton'
import { cn } from '@/lib/utils'
import { Id } from '../../../convex/_generated/dataModel'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ThumbnailHistory } from '@/components/studio/ThumbnailHistory'
import { getCarouselCompositionRecommendation } from '@/lib/carousel-composition-governance'
import { IconArrowUp, IconLayers, IconPower, IconRotate, IconSparkles, IconWand } from '@/components/ui/icons'
import { useTranslation } from 'react-i18next'
import { MobileWorkPanelDrawer } from '@/components/studio/shared/MobileWorkPanelDrawer'
import { StudioEditPromptBar, StudioGenerateBar } from '@/components/studio/shared/StudioActionBar'
import { resolvePreviewLayoutMode } from '@/components/studio/previewLayoutMode'
import {
    STUDIO_DECISION_BUTTON_CLASS,
    STUDIO_DECISION_DIALOG_CLASS,
    STUDIO_DECISION_DIALOG_DESCRIPTION_CLASS,
    STUDIO_DECISION_DIALOG_FOOTER_CLASS,
    STUDIO_DECISION_DIALOG_HEADER_CLASS,
    STUDIO_DECISION_DIALOG_TITLE_CLASS,
} from '@/components/studio/shared/dialogStyles'
import {
    localizeCarouselCompositionDescription,
    localizeCarouselCompositionName,
} from '@/lib/carousel-localization'

const createAuditFlowId = (prefix: string) =>
    `flow_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const shouldApplyPrimaryLogoToSlide = (
    selectedLogoUrl: string | undefined,
    includeLogoOnSlides: boolean | undefined,
    slideIndex: number,
    totalSlides: number
) => {
    if (!selectedLogoUrl) return false
    if (includeLogoOnSlides !== false) return true
    return slideIndex === Math.max(0, totalSlides - 1)
}

const getDebugReferenceWeight = (
    role: ReferenceImageRole,
    hasLayoutConsistencyRef: boolean
) => {
    if (role === 'logo') return 0.75
    if (role === 'style' || role === 'style_content') {
        return hasLayoutConsistencyRef ? 0.2 : 0.55
    }
    return hasLayoutConsistencyRef ? 0.34 : 0.92
}

export default function CarouselPage() {
    const { t, i18n } = useTranslation('carousel')
    const router = useRouter()
    const { user } = useUser()
    const isAdmin = user?.emailAddresses?.some(
        email => email.emailAddress === 'juanfranbrv@gmail.com'
    ) ?? false
    const { activeBrandKit, brandKits, loading: brandKitsLoading, setActiveBrandKit, deleteBrandKitById } = useBrandKit()
    const { toast } = useToast()
    const { panelPosition } = useUI()
    const aiConfig = useQuery(api.settings.getAIConfig)
    const carouselStructures = useQuery(api.carousel.listStructures, { includeInactive: false })
    const ensureCarouselDefaults = useMutation(api.carouselSeed.ensureDefaultsIfEmpty)
    const updateCarouselComposition = useMutation(api.carouselAdmin.updateComposition)
    const hasTriggeredCarouselSeedRef = useRef(false)
    const unsavedBrandChangeGuardRef = useRef<((brandId: string) => Promise<boolean>) | null>(null)

    const [isGenerating, setIsGenerating] = useState(false)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [viewportHeight, setViewportHeight] = useState(1080)
    useDisablePullToRefresh(isMobile)
    const [mobileControlsOpen, setMobileControlsOpen] = useState(false)
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
    const [generatedCount, setGeneratedCount] = useState(0)
    const [slides, setSlides] = useState<CarouselSlide[]>([])
    const [slideCorrectionPrompt, setSlideCorrectionPrompt] = useState('')
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '3:4'>('4:5')
    const [carouselSettings, setCarouselSettings] = useState<CarouselSettings | null>(null)
    const latestCarouselSettingsResolverRef = useRef<(((overrides?: Partial<CarouselSettings>) => CarouselSettings) | null)>(null)
    const [previewCompositionState, setPreviewCompositionState] = useState<{
        structureId: string | null
        compositionId: string | null
    }>({
        structureId: null,
        compositionId: null
    })

    useEffect(() => {
        document.title = t('meta.title', { defaultValue: 'X Carousel | Intelligent Design Engine' })
    }, [t])

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
            setViewportHeight(window.innerHeight)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const previewLayoutMode = resolvePreviewLayoutMode({
        isMobile,
        viewportHeight,
    })

    useEffect(() => {
        if (!Array.isArray(carouselStructures)) return
        if (carouselStructures.length > 0) return
        if (hasTriggeredCarouselSeedRef.current) return

        hasTriggeredCarouselSeedRef.current = true
        void ensureCarouselDefaults({}).catch((error) => {
            hasTriggeredCarouselSeedRef.current = false
            log.warn('CAROUSEL', 'Auto-seed on page load failed', error)
        })
    }, [carouselStructures, ensureCarouselDefaults])

    useEffect(() => {
        if (!isMobile) {
            setMobileControlsOpen(false)
        }
    }, [isMobile])
    const compositionsForDebug = useQuery(
        api.carousel.listCompositions,
        (previewCompositionState.structureId || carouselSettings?.structureId)
            ? {
                structureId: previewCompositionState.structureId || carouselSettings?.structureId || '',
                includeInactive: Boolean(isAdmin),
                includeGlobals: true
            }
            : 'skip'
    ) as Array<{
        _id: Id<'carousel_compositions'>
        composition_id: string
        name: string
        description: string
        layoutPrompt: string
        icon?: string
        iconPrompt?: string
        scope: string
        mode: string
        structure_id?: string
        isActive: boolean
    }> | undefined
    const [scriptSlides, setScriptSlides] = useState<SlideContent[] | null>(null)
    const [scriptPrompt, setScriptPrompt] = useState('')
    const [scriptSlideCount, setScriptSlideCount] = useState<number | null>(null)
    const [carouselIncomingPrompt] = useState<string | undefined>(() => {
        if (typeof window === 'undefined') return undefined
        const p = sessionStorage.getItem('x-studio:incoming-prompt') ?? undefined
        if (p) sessionStorage.removeItem('x-studio:incoming-prompt')
        return p
    })
    const [analysisHook, setAnalysisHook] = useState<string | undefined>()
    const [analysisStructure, setAnalysisStructure] = useState<{ id?: string; name?: string } | undefined>()
    const [analysisIntent, setAnalysisIntent] = useState<string | undefined>()
    const [caption, setCaption] = useState('')
    const [isCaptionLocked, setIsCaptionLocked] = useState(false)
    const [isCaptionGenerating, setIsCaptionGenerating] = useState(false)
    const [isCancelingCaption, setIsCancelingCaption] = useState(false)
    const [referenceImages, setReferenceImages] = useState<Array<{ url: string; source: 'upload' | 'brandkit' }>>([])
    const [referencePreviewState, setReferencePreviewState] = useState<{
        uploadedImages: string[]
        selectedBrandKitImageIds: string[]
        referenceImageRoles: Record<string, ReferenceImageRole>
        imageSourceMode: 'upload' | 'brandkit' | 'generate'
        selectedStylePresetId: string | null
        selectedStylePresetImageUrl: string | null
    }>({
        uploadedImages: [],
        selectedBrandKitImageIds: [],
        referenceImageRoles: {},
        imageSourceMode: 'upload',
        selectedStylePresetId: null,
        selectedStylePresetImageUrl: null
    })
    const [selectedLogoUrl, setSelectedLogoUrl] = useState<string | undefined>(undefined)
    const [showDebugModal, setShowDebugModal] = useState(false)
    const [debugPromptData, setDebugPromptData] = useState<DebugPromptData | null>(null)
    const [pendingGenerateSettings, setPendingGenerateSettings] = useState<CarouselSettings | null>(null)
    const [suggestions, setSuggestions] = useState<CarouselSuggestion[]>([])
    const [slideVariantSelection, setSlideVariantSelection] = useState<string[]>([])

    const handleNewBrandKit = () => {
        router.push('/brand-kit/new')
    }

    const handleBrandChange = useCallback(async (brandId: string) => {
        if (!brandId || brandId === String(activeBrandKit?.id || '')) return

        const canContinue = await unsavedBrandChangeGuardRef.current?.(brandId)
        if (canContinue === false) return

        await setActiveBrandKit(brandId)
    }, [activeBrandKit?.id, setActiveBrandKit])

    const [imagePromptSuggestions, setImagePromptSuggestions] = useState<string[]>([])
    const [sessionHistory, setSessionHistory] = useState<Array<{
        id: string
        createdAt: string
        slides: CarouselSlide[]
        caption?: string
    }>>([])
    const [originalAnalysis, setOriginalAnalysis] = useState<{
        slides: CarouselSlide[]
        scriptSlides: SlideContent[]
        hook?: string
        structure?: { id?: string; name?: string }
        detectedIntent?: string
        caption?: string
    } | null>(null)
    const [isCancelingAnalyze, setIsCancelingAnalyze] = useState(false)
    const [isCancelingGenerate, setIsCancelingGenerate] = useState(false)
    const [requiresReanalysis, setRequiresReanalysis] = useState(false)
    const [errorModal, setErrorModal] = useState<{
        open: boolean
        title: string
        message: string
        suggestedSlideCount?: number
    }>({ open: false, title: '', message: '' })
    const [slideCountOverride, setSlideCountOverride] = useState<number | null>(null)
    const [isAdminCompositionOpen, setIsAdminCompositionOpen] = useState(false)
    const selectedStylePresetDetails = useQuery(
        api.stylePresets.getActiveById,
        referencePreviewState.selectedStylePresetId
            ? { id: referencePreviewState.selectedStylePresetId as Id<'style_presets'> }
            : 'skip'
    )
    const cancelGenerationRef = useRef(false)
    const cancelAnalyzeRef = useRef(false)
    const cancelCaptionRef = useRef(false)
    const styleAnalysisCacheRef = useRef<Record<string, string>>({})
    const currentCreationFlowIdRef = useRef<string | undefined>(undefined)
    const getOrCreateCreationFlowId = useCallback(() => {
        if (!currentCreationFlowIdRef.current) {
            currentCreationFlowIdRef.current = createAuditFlowId('carousel_create')
        }
        return currentCreationFlowIdRef.current
    }, [])

    const analysisIntentLabel = useMemo(() => {
        if (!analysisIntent) return undefined
        const raw = analysisIntent.trim()
        const normalized = raw.toLowerCase()
        const direct = INTENT_CATALOG.find(i => i.id === normalized)
        if (direct) return `${direct.name} (${direct.id})`

        const codeMatch = raw.match(/^([a-e])\s*([0-9]+)$/i)
        if (codeMatch) {
            const group = codeMatch[1].toUpperCase()
            const index = Number(codeMatch[2]) - 1
            const groupMap: Record<string, string[]> = {
                A: ['escaparate', 'catalogo', 'lanzamiento', 'servicio', 'oferta'],
                B: ['comunicado', 'evento', 'lista', 'comparativa', 'efemeride'],
                C: ['logro', 'equipo', 'cita', 'talento', 'bts'],
                D: ['dato', 'pasos', 'definicion'],
                E: ['pregunta', 'reto']
            }
            const resolvedId = groupMap[group]?.[index]
            const resolved = INTENT_CATALOG.find(i => i.id === resolvedId)
            if (resolved) return `${resolved.name} (${resolved.id})`
            if (resolvedId) return resolvedId
        }

        return raw
    }, [analysisIntent])

    const extractSuggestedSlideCount = (message: string) => {
        const matches = message.match(/\b(\d+)\b/g) || []
        const numbers = matches.map(Number).filter(n => Number.isFinite(n) && n > 0)
        if (numbers.length === 0) return undefined
        return Math.max(...numbers)
    }

    const simplifyErrorMessage = (message: string, suggested?: number) => {
        const lower = message.toLowerCase()
        if (lower.includes('reto de 7') || lower.includes('slide por día') || lower.includes('n+2') || lower.includes('requested_slide_count')) {
            if (suggested) {
                return t('errors.minimumSlidesDetailed', { count: suggested, defaultValue: 'This carousel type requires at least {{count}} slides (hook + content + CTA). Adjust the number to continue.' })
            }
            return t('errors.minimumSlides', { defaultValue: 'This carousel type requires more slides than the ones selected. Adjust the number to continue.' })
        }
        if (lower.includes('modelo de inteligencia') || lower.includes('modelo de imagen')) {
            return `${t('errors.missingAiConfigTitle')}.`
        }
        return t('errors.generationDescription')
    }

    const buildAiImageSuggestions = useCallback((
        items?: SlideContent[] | null,
        alternativeScripts?: Array<SlideContent[] | undefined>
    ) => {
        if (!Array.isArray(items) || items.length === 0) return []

        const normalizeKey = (value: string) =>
            value
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')

        const removeVisualStyleHints = (text: string) => {
            if (!text) return ''
            const blockedTokens = [
                'style', 'aesthetic', 'mood', 'vibe', 'look', 'visual',
                'estilo', 'estetica',
                'color', 'colors', 'palette', 'tone', 'contrast', 'saturation', 'hue',
                'colores', 'paleta', 'tono', 'contraste', 'saturacion', 'matiz',
                'lighting', 'light', 'shadow', 'cinematic',
                'iluminacion', 'luz', 'sombras', 'cinematografico',
                'realistic', 'photorealistic', 'illustration', 'illustrative',
                'realista', 'fotorrealista', 'fotografico', 'fotografia', 'ilustracion',
                'vector', 'comic', 'cartoon', 'watercolor', 'oil painting',
                'vectorial', 'caricatura', 'acuarela', 'oleo',
            ].map(normalizeKey)

            const clauses = text
                .split(/[.,;:]+/g)
                .map((c) => c.trim())
                .filter(Boolean)
                .filter((clause) => {
                    const normalizedClause = normalizeKey(clause)
                    return !blockedTokens.some((token) => normalizedClause.includes(token))
                })

            const cleaned = clauses.join(', ').trim()
            return (cleaned || text)
                .replace(/^(ilustracion|ilustraci?n|fotografia|fotograf?a|foto|render|imagen|vector|vectorial)\s+/i, '')
                .replace(/(con|en|usando|with|in|using)[^,.;]*(estilo|estetica|iluminacion|color|paleta|realista|fotografia|ilustracion|style|aesthetic|lighting|palette|realistic|illustration)[^,.;]*/gi, '')
                .replace(/\s+/g, ' ')
                .replace(/^[,.\s]+|[,.\s]+$/g, '')
                .trim()
        }

        const normalize = (value: string) =>
            removeVisualStyleHints(value)
                .replace(/\s+/g, ' ')
                .replace(/\.+/g, '.')
                .trim()

        const baseSlides = [...items]
        const alternativeSlides = (alternativeScripts || [])
            .flatMap((set) => (Array.isArray(set) ? set : []))
            .filter(Boolean)
        const slidePool = [...baseSlides, ...alternativeSlides]

        const fromSlides = slidePool
            .map((slide: SlideContent) => {
                const visual = typeof slide.visualPrompt === 'string' ? normalize(slide.visualPrompt) : ''
                if (visual) return visual
                return normalize(`${slide.title || ''}. ${slide.description || ''}`)
            })
            .filter((value) => Boolean(value) && value.length > 16)

        const hook = normalize(`${items[0]?.title || ''}. ${items[0]?.description || ''}`)
        const middle = normalize(`${items[Math.max(1, Math.floor(items.length / 2))]?.title || ''}. ${items[Math.max(1, Math.floor(items.length / 2))]?.description || ''}`)
        const close = normalize(`${items[items.length - 1]?.title || ''}. ${items[items.length - 1]?.description || ''}`)
        const deckSummary = normalize(
            items
                .map((slide) => `${slide.title || ''}. ${slide.description || ''}`)
                .join(' ')
                .slice(0, 500)
        )

        const synthetic = [
            normalize(`Persona principal resolviendo esta situaci?n concreta: ${hook}`),
            normalize(`Escena del problema o necesidad central en contexto real: ${middle}`),
            normalize(`Escena de soluci?n o resultado esperado vinculada al mensaje: ${close}`),
            normalize(`Situaci?n completa que represente el guion del carrusel: ${deckSummary}`),
            normalize(`Momento de acci?n con objeto clave del mensaje: ${hook}`),
            normalize(`Interacci?n humana relacionada con el tema principal: ${middle}`),
        ].filter(Boolean)

        const merged = Array.from(new Set([...fromSlides, ...synthetic])).filter((value) => value.length > 12)
        while (merged.length < 4) {
            merged.push(normalize(`Situaci?n concreta del guion del carrusel: ${deckSummary || hook || middle || close || 'narrativa principal'}`))
        }

        const randomized = [...merged]
        for (let i = randomized.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[randomized[i], randomized[j]] = [randomized[j], randomized[i]]
        }
        return randomized.slice(0, 4)
    }, [])

    const openErrorModal = (title: string, message: string) => {
        const suggestedSlideCount = extractSuggestedSlideCount(message)
        const simplified = simplifyErrorMessage(message, suggestedSlideCount)
        setErrorModal({
            open: true,
            title,
            message: simplified,
            suggestedSlideCount
        })
    }

    const brandKitTexts = useMemo(() => {
        if (!activeBrandKit) return []
        const options: Array<{ id: string; label: string; value: string }> = []

        if (activeBrandKit.tagline) {
            options.push({ id: 'bk-tagline', label: 'Tagline', value: activeBrandKit.tagline })
        }
        if (activeBrandKit.url) {
            options.push({ id: 'bk-url', label: 'URL', value: activeBrandKit.url })
        }
        const hooks = activeBrandKit.text_assets?.marketing_hooks || []
        hooks.forEach((hook, idx) => {
            if (hook) options.push({ id: `bk-hook-${idx}`, label: `Hook ${idx + 1}`, value: hook })
        })
        const ctas = activeBrandKit.text_assets?.ctas || []
        ctas.forEach((cta, idx) => {
            if (cta) options.push({ id: `bk-cta-${idx}`, label: `CTA ${idx + 1}`, value: cta })
        })
        if (activeBrandKit.text_assets?.brand_context) {
            options.push({ id: 'bk-context', label: t('ui.contextLabel', { defaultValue: 'Context' }), value: activeBrandKit.text_assets.brand_context })
        }

        return options
    }, [activeBrandKit])

    const [isRegenerating, setIsRegenerating] = useState(false)
    const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null)
    const buildPreviewTextContext = useCallback((slides: SlideContent[]) => {
        return slides
            .map((slide) => {
                const title = (slide.title || '').trim()
                const body = (slide.description || '').trim()
                if (!title && !body) return ''
                return `SLIDE_${slide.index + 1}: ${title}${body ? ` | ${body}` : ''}`
            })
            .filter(Boolean)
            .join('\n')
    }, [])

    const fingerprintSlides = useCallback((items: SlideContent[] | CarouselSlide[]) => {
        return items
            .map((s: any) => `${s.index}|${(s.title || '').trim()}|${(s.description || '').trim()}`)
            .join('||')
            .toLowerCase()
    }, [])

    const handleUpdateSlideScript = useCallback((index: number, updates: { headline?: string; subtitle?: string; title?: string; description?: string; visualPrompt?: string; mustKeepFacts?: string[] }) => {
        setSlides(prev => prev.map(s => s.index === index ? { ...s, ...updates } : s))
        setScriptSlides(prev => prev ? prev.map(s => s.index === index ? { ...s, ...updates } : s) : prev)
    }, [])

    const performAnalyze = useCallback(async (settings: CarouselSettings, silent = false, auditFlowId?: string) => {
        cancelAnalyzeRef.current = false
        if (!settings.prompt.trim() || !activeBrandKit || !aiConfig?.intelligenceModel) {
            if (!silent) {
                openErrorModal(
                    t('errors.missingAiConfigTitle'),
                    t('errors.missingAiConfigDescription')
                )
            }
            return null
        }

        setIsAnalyzing(true)
        setGeneratedCount(0)
        setCurrentSlideIndex(0)
        setAspectRatio(settings.aspectRatio)
        setCarouselSettings(settings)
        setSuggestions([])
        setSlideVariantSelection([])
        setOriginalAnalysis(null)

        try {
            const effectiveAuditFlowId = auditFlowId || currentCreationFlowIdRef.current || createAuditFlowId('carousel_create')
            currentCreationFlowIdRef.current = effectiveAuditFlowId
            const result = await analyzeCarouselAction({
                prompt: settings.prompt,
                slideCount: settings.slideCount,
                brandDNA: activeBrandKit,
                intelligenceModel: aiConfig.intelligenceModel,
                selectedColors: settings.selectedColors,
                includeLogoOnSlides: settings.includeLogoOnSlides,
                selectedLogoUrl: settings.selectedLogoUrl,
                aiImageDescription: settings.aiImageDescription,
                auditFlowId: effectiveAuditFlowId
            })
            if (cancelAnalyzeRef.current) {
                return null
            }

            if (!result.success) {
                throw new Error(result.error || t('errors.unknown'))
            }

            const requestedCount = Math.max(1, Math.min(15, settings.slideCount || 5))
            if (result.slides.length !== requestedCount) {
                throw new Error(`Guion incompleto: esperado ${requestedCount} slides, recibido ${result.slides.length}`)
            }

            if (cancelAnalyzeRef.current) {
                return null
            }

            setScriptSlides(result.slides)
            setScriptPrompt(settings.prompt)
            setScriptSlideCount(requestedCount)
            setCarouselSettings(settings)
            setAnalysisHook(result.hook)
            setAnalysisStructure(result.structure)
            setAnalysisIntent(result.detectedIntent)
            if (!isCaptionLocked) {
                setCaption(result.caption || '')
            }
            const mappedSlides = result.slides.map(s => ({
                index: s.index,
                headline: s.headline,
                subtitle: s.subtitle,
                title: s.title,
                description: s.description,
                status: 'pending' as const
            }))
            setSlides(mappedSlides)
            setSlideVariantSelection(Array.from({ length: result.slides.length }, () => 'original'))
            const nextSuggestions = Array.isArray(result.suggestions) ? result.suggestions : []
            const originalSignature = fingerprintSlides(result.slides)
            const filteredSuggestions = nextSuggestions.filter((suggestion) => {
                if (!suggestion?.slides) return false
                return fingerprintSlides(suggestion.slides) !== originalSignature
            })
            let finalImagePrompts = buildAiImageSuggestions(
                result.slides,
                filteredSuggestions.map((suggestion) => suggestion.slides)
            )
            try {
                const parsedIntent = await parseLazyIntentAction({
                    userText: settings.prompt,
                    brandDNA: activeBrandKit,
                    brandWebsite: activeBrandKit?.url,
                    intelligenceModel: aiConfig.intelligenceModel,
                    intentId: result.detectedIntent,
                    variationSeed: Date.now(),
                    previewTextContext: buildPreviewTextContext(result.slides),
                    auditFlowId: effectiveAuditFlowId
                })
                if (Array.isArray(parsedIntent.imagePromptSuggestions) && parsedIntent.imagePromptSuggestions.length > 0) {
                    finalImagePrompts = parsedIntent.imagePromptSuggestions.slice(0, 4)
                }
            } catch (error) {
            log.warn('CAROUSEL', 'Lazy intent fallback to local suggestions', error)
            }
            setImagePromptSuggestions(finalImagePrompts)
            setSuggestions(nextSuggestions)
            setSuggestions(filteredSuggestions)
            if (filteredSuggestions.length > 0) {
                setOriginalAnalysis({
                    slides: mappedSlides,
                    scriptSlides: result.slides,
                    hook: result.hook,
                    structure: result.structure,
                    detectedIntent: result.detectedIntent,
                    caption: result.caption
                })
            }

            if (!silent) {
                toast({
                    title: t('toasts.scriptReadyTitle', { defaultValue: 'Script ready' }),
                    description: t('toasts.scriptReadyDescription', { defaultValue: 'Review the preview before generating.' })
                })
            }

            return result.slides
        } catch (error) {
            if (cancelAnalyzeRef.current) {
                return null
            }
            log.error('CAROUSEL', 'Analyze action failed', error)
            if (!silent) {
                openErrorModal(
                    t('errors.analyzeTitle', { defaultValue: 'Analysis error' }),
                    error instanceof Error ? error.message : t('errors.analyzeDescription', { defaultValue: 'Could not analyze the carousel.' })
                )
            }
            return null
        } finally {
            setIsAnalyzing(false)
            if (cancelAnalyzeRef.current) {
                setIsCancelingAnalyze(false)
            }
        }
    }, [activeBrandKit, aiConfig?.intelligenceModel, buildAiImageSuggestions, buildPreviewTextContext, isCaptionLocked, toast])

    const handleCancelAnalyze = useCallback(() => {
        cancelAnalyzeRef.current = true
        setIsAnalyzing(false)
        setIsCancelingAnalyze(true)
        toast({
            title: t('toasts.analysisStoppedTitle', { defaultValue: 'Analysis stopped' }),
            description: t('toasts.analysisStoppedDescription', { defaultValue: 'Prompt analysis was canceled.' })
        })
        setTimeout(() => setIsCancelingAnalyze(false), 800)
    }, [toast])

    const resolveStyleReferenceImageUrl = useCallback((settings: CarouselSettings): string | undefined => {
        if (referencePreviewState.selectedStylePresetImageUrl) {
            return referencePreviewState.selectedStylePresetImageUrl
        }

        const allSelectedReferences = [
            ...(referencePreviewState.uploadedImages || []),
            ...(referencePreviewState.selectedBrandKitImageIds || []),
        ]

        if (allSelectedReferences.length > 0) {
            const selectedSet = new Set(allSelectedReferences)
            const styleCandidate = Object.entries(referencePreviewState.referenceImageRoles || {}).find(([url, role]) =>
                selectedSet.has(url) && (role === 'style' || role === 'style_content')
            )?.[0]
            if (styleCandidate) return styleCandidate
        }

        const fallbackFromSettings = settings.selectedReferenceImages?.find((item) =>
            item.role === 'style' || item.role === 'style_content'
        )?.url || (settings.selectedImageUrls || [])[0]
        return fallbackFromSettings
    }, [
        referencePreviewState.referenceImageRoles,
        referencePreviewState.selectedBrandKitImageIds,
        referencePreviewState.selectedStylePresetImageUrl,
        referencePreviewState.uploadedImages
    ])

    const ensureStyleAnalysisInSettings = useCallback(async (settings: CarouselSettings, auditFlowId?: string): Promise<CarouselSettings> => {
        if (referencePreviewState.selectedStylePresetId && selectedStylePresetDetails?.analysis) {
            const presetStyleBlock = buildPriority5StyleBlockFromAnalysis(selectedStylePresetDetails.analysis as VisionAnalysis)
            if (presetStyleBlock) {
                return {
                    ...settings,
                    aiStyleDirectives: mergeCustomStyleIntoStyleDirectives(
                        presetStyleBlock,
                        settings.customStyleText?.trim() || ''
                    ),
                }
            }
        }

        const styleReferenceUrl = resolveStyleReferenceImageUrl(settings)
        if (!styleReferenceUrl) {
            return settings
        }

        // If controls panel already provided a computed style block, avoid duplicate analysis calls.
        if ((settings.aiStyleDirectives || '').trim().length > 0) {
            return settings
        }

        const cached = styleAnalysisCacheRef.current[styleReferenceUrl]
        if (cached) {
            const mergedCached = mergeCustomStyleIntoStyleDirectives(
                cached,
                settings.customStyleText?.trim() || ''
            )
            return { ...settings, aiStyleDirectives: mergedCached }
        }

        try {
            const body = styleReferenceUrl.startsWith('data:image/')
                ? { imageBase64: styleReferenceUrl, auditFlowId }
                : { imageUrl: styleReferenceUrl, auditFlowId }
            const response = await fetch('/api/analyze-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const result = await response.json()
            const analysis: VisionAnalysis | null = result?.success ? (result.data as VisionAnalysis) : null
            const priority5Block = buildPriority5StyleBlockFromAnalysis(analysis)
            if (!priority5Block) {
                return settings
            }
            styleAnalysisCacheRef.current[styleReferenceUrl] = priority5Block
            const mergedStyle = mergeCustomStyleIntoStyleDirectives(
                priority5Block,
                settings.customStyleText?.trim() || ''
            )
            return { ...settings, aiStyleDirectives: mergedStyle }
        } catch (error) {
            log.warn('CAROUSEL', 'Style analysis fallback failed', error)
            return settings
        }
    }, [referencePreviewState.selectedStylePresetId, resolveStyleReferenceImageUrl, selectedStylePresetDetails])

    const previewReferenceImages = useMemo(() => {
        const baseImages = [...referenceImages]
        const presetUrl = referencePreviewState.selectedStylePresetImageUrl
        if (!presetUrl) return baseImages
        if (baseImages.some((item) => item.url === presetUrl)) return baseImages
        return [...baseImages, { url: presetUrl, source: 'preset' as const }]
    }, [referenceImages, referencePreviewState.selectedStylePresetImageUrl])

    const previewReferenceImageRoles = useMemo(() => {
        const nextRoles = { ...referencePreviewState.referenceImageRoles }
        const presetUrl = referencePreviewState.selectedStylePresetImageUrl
        if (referencePreviewState.selectedStylePresetId && presetUrl) {
            nextRoles[presetUrl] = 'style'
        }
        return nextRoles
    }, [
        referencePreviewState.referenceImageRoles,
        referencePreviewState.selectedStylePresetId,
        referencePreviewState.selectedStylePresetImageUrl
    ])

    const compositionGhostIcon = useMemo(() => {
        const activeCompositionId = previewCompositionState.compositionId || carouselSettings?.compositionId
        if (!activeCompositionId) return null

        const composition = compositionsForDebug?.find((item) => item.composition_id === activeCompositionId)
        if (composition) {
            return resolveCarouselCompositionIcon({
                id: composition.composition_id,
                name: localizeCarouselCompositionName(composition.composition_id, composition.name, i18n.language),
                description: localizeCarouselCompositionDescription(
                    composition.composition_id,
                    composition.description,
                    composition.layoutPrompt,
                    i18n.language
                ),
                layoutPrompt: composition.layoutPrompt,
                icon: composition.icon,
                iconPrompt: composition.iconPrompt,
            })
        }

        return resolveCarouselCompositionIcon({ id: activeCompositionId })
    }, [previewCompositionState.compositionId, carouselSettings?.compositionId, compositionsForDebug])

    const activeComposition = useMemo(() => {
        const activeCompositionId = previewCompositionState.compositionId || carouselSettings?.compositionId
        if (!activeCompositionId) return null
        const found = compositionsForDebug?.find((item) => item.composition_id === activeCompositionId) || null
        if (!found) return null
        return {
            ...found,
            name: localizeCarouselCompositionName(found.composition_id, found.name, i18n.language),
            description: localizeCarouselCompositionDescription(
                found.composition_id,
                found.description,
                found.layoutPrompt,
                i18n.language
            ),
        }
    }, [previewCompositionState.compositionId, carouselSettings?.compositionId, compositionsForDebug, i18n.language])

    const activeCompositionRecommendation = useMemo(() => {
        if (!activeComposition) return null
        return getCarouselCompositionRecommendation(activeComposition)
    }, [activeComposition])

    const handleAdminCompositionPatch = useCallback(async (patch: {
        mode?: 'basic' | 'advanced'
        scope?: 'global' | 'narrative'
        isActive?: boolean
    }) => {
        if (!isAdmin || !activeComposition) return
        try {
            await updateCarouselComposition({
                admin_email: 'juanfranbrv@gmail.com',
                id: activeComposition._id,
                mode: patch.mode,
                scope: patch.scope,
                structure_id: patch.scope === 'global'
                    ? undefined
                    : (activeComposition.structure_id || carouselSettings?.structureId || undefined),
                isActive: patch.isActive
            })

            toast({
                title: t('admin.compositionUpdatedTitle', { defaultValue: 'Composition updated' }),
                description: t('admin.compositionUpdatedDescription', { name: activeComposition.name, defaultValue: '{{name}} has been updated in the catalog.' })
            })
        } catch (error) {
            toast({
                title: t('admin.compositionUpdateErrorTitle', { defaultValue: 'Could not update the composition' }),
                description: error instanceof Error ? error.message : t('common:errors.tryAgain', { defaultValue: 'Try again.' }),
                variant: 'destructive'
            })
        }
    }, [activeComposition, carouselSettings?.structureId, isAdmin, toast, updateCarouselComposition])

    const handleApplyAutomaticRecommendation = useCallback(async () => {
        if (!activeComposition || !activeCompositionRecommendation) return
        await handleAdminCompositionPatch({
            mode: activeCompositionRecommendation.suggestedMode,
            scope: activeCompositionRecommendation.suggestedScope
        })
    }, [activeComposition, activeCompositionRecommendation, handleAdminCompositionPatch])

    const handleAnalyze = useCallback(async (settings: CarouselSettings) => {
        if (!settings.prompt.trim()) {
            openErrorModal(t('errors.genericTitle'), t('errors.missingTopic'))
            return
        }

        if (!activeBrandKit) {
            openErrorModal(t('errors.genericTitle'), t('errors.selectBrandKit'))
            return
        }

        if (!aiConfig?.intelligenceModel) {
            openErrorModal(
                t('errors.missingAiConfigTitle'),
                t('errors.missingAiConfigDescription')
            )
            return
        }
        const analyzeAuditFlowId = getOrCreateCreationFlowId()
        const settingsWithStyle = await ensureStyleAnalysisInSettings(settings, analyzeAuditFlowId)
        await performAnalyze(settingsWithStyle, false, analyzeAuditFlowId)
    }, [activeBrandKit, aiConfig?.intelligenceModel, ensureStyleAnalysisInSettings, performAnalyze])

    const applySuggestion = useCallback((index: number) => {
        const suggestion = suggestions[index]
        if (!suggestion) return
        const mappedSlides = suggestion.slides.map(s => ({
            index: s.index,
            headline: s.headline,
            subtitle: s.subtitle,
            title: s.title,
            description: s.description,
            status: 'pending' as const
        }))
        setSlides(mappedSlides)
        setScriptSlides(suggestion.slides)
        setScriptSlideCount(suggestion.slides.length)
        setImagePromptSuggestions(buildAiImageSuggestions(suggestion.slides))
        setAnalysisHook(suggestion.hook)
        setAnalysisStructure(suggestion.structure)
        setAnalysisIntent(suggestion.detectedIntent)
        setSlideVariantSelection(Array.from({ length: suggestion.slides.length }, () => `suggestion-${index}`))
        if (!isCaptionLocked) {
            setCaption(suggestion.caption || '')
        }
        toast({
            title: t('toasts.suggestionAppliedTitle', { defaultValue: 'Suggestion applied' }),
            description: t('toasts.suggestionAppliedDescription', { defaultValue: 'The carousel copy has been updated.' })
        })
    }, [buildAiImageSuggestions, suggestions, isCaptionLocked, toast])

    const undoSuggestion = useCallback(() => {
        if (!originalAnalysis) return
        setSlides(originalAnalysis.slides)
        setScriptSlides(originalAnalysis.scriptSlides)
        setScriptSlideCount(originalAnalysis.scriptSlides.length)
        setImagePromptSuggestions(buildAiImageSuggestions(originalAnalysis.scriptSlides))
        setAnalysisHook(originalAnalysis.hook)
        setAnalysisStructure(originalAnalysis.structure)
        setAnalysisIntent(originalAnalysis.detectedIntent)
        setSlideVariantSelection(Array.from({ length: originalAnalysis.scriptSlides.length }, () => 'original'))
        if (!isCaptionLocked) {
            setCaption(originalAnalysis.caption || '')
        }
        toast({
            title: t('toasts.changesRevertedTitle', { defaultValue: 'Changes reverted' }),
            description: t('toasts.changesRevertedDescription', { defaultValue: 'The original content has been restored.' })
        })
    }, [buildAiImageSuggestions, originalAnalysis, isCaptionLocked, toast])

    const applySlideVariant = useCallback((slideIndex: number, sourceId: string) => {
        const baseSlides = originalAnalysis?.scriptSlides || scriptSlides
        if (!baseSlides || baseSlides.length === 0) return

        const getSourceSlides = (id: string) => {
            if (id === 'original') return originalAnalysis?.scriptSlides || baseSlides
            const match = id.match(/^suggestion-(\d+)$/)
            if (!match) return null
            const suggestion = suggestions[Number(match[1])]
            return suggestion?.slides || null
        }

        const nextSelection = Array.from({ length: baseSlides.length }, (_, index) =>
            index === slideIndex ? sourceId : (slideVariantSelection[index] || 'original')
        )

        const remixedSlides = baseSlides.map((fallbackSlide, index) => {
            const sourceSlides = getSourceSlides(nextSelection[index])
            const sourceSlide = sourceSlides?.[index]
            return sourceSlide ? { ...sourceSlide, index } : { ...fallbackSlide, index }
        })

        setSlideVariantSelection(nextSelection)
        setScriptSlides(remixedSlides)
        setSlides(remixedSlides.map((slide) => ({
            index: slide.index,
            headline: slide.headline,
            subtitle: slide.subtitle,
            title: slide.title,
            description: slide.description,
            status: 'pending' as const
        })))
        setScriptSlideCount(remixedSlides.length)
        setImagePromptSuggestions(buildAiImageSuggestions(remixedSlides, suggestions.map((suggestion) => suggestion.slides)))

        toast({
            title: t('toasts.slideRemixedTitle', { defaultValue: 'Slide remixed' }),
            description: t('toasts.slideRemixedDescription', { defaultValue: 'The carousel has been rebuilt with your mix of variants.' })
        })
    }, [originalAnalysis, scriptSlides, suggestions, slideVariantSelection, buildAiImageSuggestions, toast])

    const handleRegenerateCaption = useCallback(async () => {
        if (!carouselSettings || !activeBrandKit) return
        if (isCaptionLocked) return
        if (!aiConfig?.intelligenceModel) {
            openErrorModal(
                t('errors.missingAiConfigTitle'),
                t('errors.missingAiConfigDescription')
            )
            return
        }

        cancelCaptionRef.current = false
        setIsCancelingCaption(false)
        setIsCaptionGenerating(true)
        try {
            const captionAuditFlowId = createAuditFlowId('carousel_caption')
            const result = await regenerateCarouselCaptionAction({
                prompt: carouselSettings.prompt,
                slideCount: carouselSettings.slideCount,
                brandDNA: activeBrandKit,
                intelligenceModel: aiConfig.intelligenceModel,
                selectedColors: carouselSettings.selectedColors,
                includeLogoOnSlides: carouselSettings.includeLogoOnSlides,
                selectedLogoUrl: carouselSettings.selectedLogoUrl,
                auditFlowId: captionAuditFlowId,
            })

            if (cancelCaptionRef.current) {
                return
            }

            if (result.success && result.caption) {
                setCaption(result.caption)
            } else {
                throw new Error(result.error || t('errors.regenerateCaption', { defaultValue: 'Could not regenerate the caption.' }))
            }
        } catch (error) {
            if (cancelCaptionRef.current) {
                return
            }
            log.error('CAROUSEL', 'Caption regeneration failed', error)
            openErrorModal(
                t('errors.genericTitle', { defaultValue: 'Error' }),
                error instanceof Error ? error.message : t('errors.regenerateCaption', { defaultValue: 'Could not regenerate the caption.' })
            )
        } finally {
            setIsCaptionGenerating(false)
            if (cancelCaptionRef.current) {
                window.setTimeout(() => setIsCancelingCaption(false), 900)
            }
        }
    }, [activeBrandKit, aiConfig?.intelligenceModel, carouselSettings, isCaptionLocked, toast])

    const handleCancelCaption = useCallback(() => {
        cancelCaptionRef.current = true
        setIsCancelingCaption(true)
        setIsCaptionGenerating(false)
    }, [])

    const buildSlidesFromCurrentState = useCallback((targetCount: number): SlideContent[] | null => {
        if (!Array.isArray(slides) || slides.length === 0) return null
        const normalized = slides
            .slice(0, targetCount)
            .map((slide, idx) => ({
                index: Number.isFinite(slide.index) ? slide.index : idx,
                title: (slide.title || '').trim(),
                description: (slide.description || '').trim(),
                visualPrompt: (slide.description || '').trim(),
            }))
            .filter((slide) => slide.title || slide.description || slide.visualPrompt)
        if (normalized.length === 0) return null
        return normalized
    }, [slides])

    const executeGenerate = useCallback(async (settings: CarouselSettings) => {
        cancelGenerationRef.current = false
        if (!settings.prompt.trim()) {
            openErrorModal(t('errors.genericTitle'), t('errors.missingTopic'))
            return
        }

        if (!activeBrandKit) {
            openErrorModal(t('errors.genericTitle'), t('errors.selectBrandKit'))
            return
        }

        if (!aiConfig?.imageModel) {
            openErrorModal(
                t('errors.missingAiConfigTitle'),
                t('errors.missingAiConfigDescription')
            )
            return
        }

        setIsGenerating(true)
        setGeneratedCount(0)
        setCurrentSlideIndex(0)
        setAspectRatio(settings.aspectRatio)
        setCarouselSettings(settings)

        try {
            const generationAuditFlowId = currentCreationFlowIdRef.current || createAuditFlowId('carousel_create')
            currentCreationFlowIdRef.current = generationAuditFlowId
            const slidesForGeneration =
                (scriptSlides && scriptSlides.length > 0 ? scriptSlides.slice(0, settings.slideCount) : null)
                || buildSlidesFromCurrentState(settings.slideCount)

            if (!slidesForGeneration) {
                throw new Error(t('errors.noSlidesForGenerate'))
            }

            const normalizedSlides = slidesForGeneration.map(s => ({ ...s }))
            const slideOverrides = settings.slides
                .filter(s => s.customText)
                .map(s => ({ index: s.index, text: s.customText! }))

            slideOverrides.forEach(override => {
                if (normalizedSlides[override.index]) {
                    normalizedSlides[override.index] = {
                        ...normalizedSlides[override.index],
                        description: override.text,
                        visualPrompt: override.text
                    }
                }
            })

            const totalSlides = normalizedSlides.length
            const initialSlides: CarouselSlide[] = normalizedSlides.map((s) => ({
                index: s.index,
                headline: s.headline,
                subtitle: s.subtitle,
                title: s.title,
                description: s.description,
                status: 'pending' as const
            }))
            setSlides(initialSlides)

            const generatedImageUrls: string[] = []
            let latestSlidesSnapshot: CarouselSlide[] = [...initialSlides]
            let doneCount = 0

            for (let i = 0; i < totalSlides; i++) {
                if (cancelGenerationRef.current) {
                    break
                }
                const slideContent = normalizedSlides[i]
                setSlides(prev => prev.map(s => s.index === slideContent.index ? { ...s, status: 'generating' as const } : s))

                const consistencyRefUrls: string[] = []
                if (i > 0 && generatedImageUrls[0]) {
                    consistencyRefUrls.push(generatedImageUrls[0])
                }
                if (i > 0 && generatedImageUrls[i - 1]) {
                    consistencyRefUrls.push(generatedImageUrls[i - 1])
                }
                const selectedLogoUrl = shouldApplyPrimaryLogoToSlide(
                    settings.selectedLogoUrl,
                    settings.includeLogoOnSlides,
                    i,
                    totalSlides
                )
                    ? settings.selectedLogoUrl
                    : undefined

                const result = await regenerateSlideAction(
                    i,
                    slideContent,
                    totalSlides,
                    settings.prompt,
                    settings.style,
                    settings.aspectRatio,
                    activeBrandKit,
                    aiConfig.imageModel,
                    selectedLogoUrl,
                    settings.selectedColors,
                    settings.compositionId,
                    settings.structureId,
                    settings.aiStyleDirectives,
                    settings.applyStyleToTypography,
                    settings.ctaUrlEnabled,
                    settings.ctaUrl,
                    settings.finalContactLines,
                    settings.selectedReferenceImages,
                    settings.selectedImageUrls,
                    consistencyRefUrls.length > 0 ? consistencyRefUrls : undefined,
                    generationAuditFlowId
                )

                if (cancelGenerationRef.current) {
                    break
                }

                if (result.success && result.imageUrl) {
                    generatedImageUrls.push(result.imageUrl)
                    doneCount += 1
                    setSlides(prev => prev.map(s => s.index === slideContent.index
                        ? {
                            ...s,
                            imageUrl: result.imageUrl,
                            status: 'done' as const,
                            debugPrompt: result.debugPrompt,
                            debugReferences: result.debugReferences
                        }
                        : s
                    ))
                    latestSlidesSnapshot = latestSlidesSnapshot.map(s => s.index === slideContent.index
                        ? {
                            ...s,
                            imageUrl: result.imageUrl,
                            status: 'done' as const,
                            debugPrompt: result.debugPrompt,
                            debugReferences: result.debugReferences
                        }
                        : s
                    )
                    setGeneratedCount(doneCount)
                    setCurrentSlideIndex(slideContent.index)
                } else {
                    const errorMessage = result.error || t('errors.unknown')
                    setSlides(prev => prev.map(s => s.index === slideContent.index ? { ...s, status: 'error' as const, error: errorMessage } : s))
                    latestSlidesSnapshot = latestSlidesSnapshot.map(s => s.index === slideContent.index ? { ...s, status: 'error' as const, error: errorMessage } : s)
                }
            }

            if (cancelGenerationRef.current) {
                toast({
                    title: t('ui.generationStoppedTitle'),
                    description: t('ui.generationStoppedDescription')
                })
            } else {
                if (doneCount > 0) {
                    setSessionHistory((prev) => [
                        {
                            id: `carousel-${Date.now()}`,
                            createdAt: new Date().toISOString(),
                            slides: latestSlidesSnapshot,
                            caption
                        },
                        ...prev
                    ])
                }
            }

        } catch (error) {
            if (cancelGenerationRef.current) {
                return
            }
            log.error('CAROUSEL', 'Generate action failed', error)
            openErrorModal(
                t('errors.generationTitle'),
                error instanceof Error ? error.message : t('errors.generationDescription')
            )
        } finally {
            setIsGenerating(false)
            currentCreationFlowIdRef.current = undefined
            if (cancelGenerationRef.current) {
                setIsCancelingGenerate(false)
            }
        }
    }, [activeBrandKit, aiConfig?.imageModel, buildSlidesFromCurrentState, scriptSlides, toast, caption])

    const handleCancelGenerate = useCallback(() => {
        cancelGenerationRef.current = true
        setIsGenerating(false)
        setSlides(prev => prev.map(s => s.status === 'generating' ? { ...s, status: 'pending' as const } : s))
        setIsCancelingGenerate(true)
        toast({
            title: t('ui.generationStoppedTitle'),
            description: t('ui.generationStoppedDescription')
        })
        setTimeout(() => setIsCancelingGenerate(false), 800)
    }, [toast])

    const handleGenerate = useCallback(async (settings: CarouselSettings) => {
        if (!settings.prompt.trim()) {
            openErrorModal(t('errors.genericTitle'), t('errors.missingTopic'))
            return
        }

        if (!activeBrandKit) {
            openErrorModal(t('errors.genericTitle'), t('errors.selectBrandKit'))
            return
        }

        if (!aiConfig?.imageModel) {
            openErrorModal(
                t('errors.missingAiConfigTitle'),
                t('errors.missingAiConfigDescription')
            )
            return
        }

        const generateAuditFlowId = getOrCreateCreationFlowId()
        const settingsWithStyle = await ensureStyleAnalysisInSettings(settings, generateAuditFlowId)

        if (!isAdmin) {
            await executeGenerate(settingsWithStyle)
            return
        }

        const slidesForPrompt =
            (scriptSlides && scriptSlides.length > 0 ? scriptSlides.slice(0, settingsWithStyle.slideCount) : null)
            || buildSlidesFromCurrentState(settingsWithStyle.slideCount)

        if (!slidesForPrompt) {
            openErrorModal(t('errors.genericTitle'), t('errors.noSlidesForPreview'))
            return
        }

        // Import buildFinalPrompt and getMoodForSlide for accurate debug
        const { buildFinalPrompt, generateCarouselSeed } = await import('@/lib/prompts/carousel/builder/final-prompt')
        const { getMoodForSlide } = await import('@/lib/prompts/carousel/mood')

        const compositionPreset = settings.structureId
            ? compositionsForDebug?.find((c) => c.composition_id === settingsWithStyle.compositionId)
            : undefined
        const resolvedCompositionPreset = compositionPreset || {
            layoutPrompt: "Standard clean social media composition with clear text area.",
            name: "Free Layout"
        }

        // Extract brand colors for injection with role-based helper
        const findColors = (role: string, fallback: string) => {
            const fromRole = (settingsWithStyle.selectedColors || [])
                .filter((entry) => entry?.role === role)
                .map((entry) => (entry?.color || '').trim())
                .filter(Boolean)
            if (fromRole.length === 0) return [fallback]
            return Array.from(new Set(fromRole))
        }

        const brandColors = {
            background: findColors('Fondo', '#141210'),
            accent: findColors('Acento', '#F0E500'),
            text: findColors('Texto', '#FFFFFF')
        }

        const seed = generateCarouselSeed()
        const slideCount = slidesForPrompt.length

        // Build per-slide debug info
        const slideDebug = slidesForPrompt.map((slide, idx) => {
            const currentMood = getMoodForSlide(idx, slideCount)
            const isLastSlide = idx === slideCount - 1
            const hasLayoutConsistencyRef = idx > 0
            const urlPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.(?:com|es|org|net|io|co)[^\s]*)/i
            const urlMatch = slide.description?.match(urlPattern)
            const extractedUrl = urlMatch ? urlMatch[0] : undefined
            const brandUrl = activeBrandKit?.url?.trim()
            const finalUrl = settingsWithStyle.ctaUrlEnabled
                ? (settingsWithStyle.ctaUrl?.trim() || brandUrl || extractedUrl)
                : undefined
            const includePrimaryLogo = shouldApplyPrimaryLogoToSlide(
                settingsWithStyle.selectedLogoUrl,
                settingsWithStyle.includeLogoOnSlides,
                idx,
                slideCount
            )
            const auxiliaryLogoCount = (settingsWithStyle.selectedReferenceImages || [])
                .filter((item) => item.role === 'logo').length
            const prompt = buildFinalPrompt({
                composition: resolvedCompositionPreset as any,
                brandColors,
                slideData: slide,
                currentMood,
                currentSlide: idx + 1,
                totalSlides: slideCount,
                logoPosition: extractLogoPosition(resolvedCompositionPreset?.layoutPrompt || ''),
                includeLogo: includePrimaryLogo,
                includeAuxiliaryLogos: includePrimaryLogo && auxiliaryLogoCount > 0,
                auxiliaryLogoCount,
                isSequentialSlide: idx > 0,
                ctaText: isLastSlide ? (slide.title || t('common:actions.show', { defaultValue: 'Show' })) : undefined,
                ctaUrl: isLastSlide ? finalUrl : undefined,
                contactLines: isLastSlide ? settingsWithStyle.finalContactLines : undefined,
                visualAnalysis: settingsWithStyle?.aiStyleDirectives,
                language: detectLanguageFromParts(
                    [
                        settingsWithStyle.prompt,
                        slide.title,
                        slide.description,
                        slide.visualPrompt
                    ],
                    activeBrandKit?.preferred_language || 'es'
                ),
                fonts: activeBrandKit?.fonts as any,
                applyStyleToTypography: settingsWithStyle.applyStyleToTypography
            })

            // Build references array
            const references: Array<{ type: string; label: string; weight: number; url: string }> = []
            settingsWithStyle.selectedReferenceImages?.forEach((item, refIndex) => {
                if (item.role === 'logo' && !includePrimaryLogo) return
                const shortUrl = item.url.length > 50 ? `${item.url.substring(0, 50)}...` : item.url
                references.push({
                    type: item.role === 'logo' ? 'aux_logo' : 'image',
                    label:
                        item.role === 'style' || item.role === 'style_content'
                            ? t('common:styleImage.referenceTitle', { defaultValue: 'Style reference' })
                            : item.role === 'logo'
                                ? t('common:auxLogos.uploadedAlt', { index: refIndex + 1, defaultValue: 'Uploaded auxiliary logo {{index}}' })
                                : t('ui.contextLabel', { defaultValue: 'Context' }),
                    weight: getDebugReferenceWeight(item.role, hasLayoutConsistencyRef),
                    url: shortUrl
                })
            })
            if (idx > 0) {
                references.push({
                    type: 'image',
                    label: t('common:styleImage.referenceTitle', { defaultValue: 'Style reference' }),
                    weight: 0.4,
                    url: '(Generated from Slide 1)'
                })
            }
            if (includePrimaryLogo && settingsWithStyle.selectedLogoUrl) {
                references.push({
                    type: 'logo',
                    label: t('common:visualAssets.mainLogo', { defaultValue: 'Main logo' }),
                    weight: 1.0,
                    url: settingsWithStyle.selectedLogoUrl.length > 50
                        ? settingsWithStyle.selectedLogoUrl.substring(0, 50) + '...'
                        : settingsWithStyle.selectedLogoUrl
                })
            }

            return {
                slideNumber: idx + 1,
                prompt,
                mood: currentMood,
                references
            }
        })

        const finalPrompt = slideDebug
            .map((s) => `--- SLIDE ${s.slideNumber} ---\n${s.prompt}`)
            .join('\n\n')

        const showAuxiliaryLogosInDebug = Boolean(settingsWithStyle.selectedLogoUrl)
        const debugContextItems = [
            ...(settingsWithStyle.selectedReferenceImages || [])
                .filter((item) => item.role !== 'logo' || showAuxiliaryLogosInDebug)
                .map((item, idx) => ({
                id: `carousel-ref-${idx}`,
                type: item.role === 'logo' ? 'aux_logo' : 'image',
                label:
                    item.role === 'style' || item.role === 'style_content'
                        ? t('common:styleImage.referenceTitle', { defaultValue: 'Style reference' })
                        : item.role === 'logo'
                            ? t('common:auxLogos.uploadedAlt', { index: idx + 1, defaultValue: 'Uploaded auxiliary logo {{index}}' })
                            : t('ui.contextLabel', { defaultValue: 'Context' }),
                url: item.url,
                source: 'unknown' as const,
                role: item.role,
            })),
            ...(settingsWithStyle.selectedLogoUrl ? [{
                id: 'carousel-logo',
                type: 'logo',
                label: t('common:brandDnaPanel.logoBadge', { defaultValue: 'Logo' }),
                url: settingsWithStyle.selectedLogoUrl,
                source: 'brandkit' as const,
                role: 'logo' as const,
            }] : []),
        ]

        const requestPayloadForDebug = {
            prompt: finalPrompt,
            model: aiConfig?.imageModel,
            aspectRatio: settingsWithStyle.aspectRatio,
            layoutId: settingsWithStyle.compositionId,
            layoutName: resolvedCompositionPreset.name,
            brandDNA: activeBrandKit,
            context: debugContextItems.map((item) => ({
                id: item.id,
                type: item.type,
                label: item.label,
                value: item.url
            })),
            slideDebug
        }

        setDebugPromptData({
            finalPrompt,
            logoUrl: settingsWithStyle.selectedLogoUrl,
            attachedImages: settingsWithStyle.selectedReferenceImages?.map((item) => item.url) || settingsWithStyle.selectedImageUrls,
            selectedStyles: [settingsWithStyle.style],
            platform: 'Instagram Carousel',
            format: settingsWithStyle.aspectRatio,
            intent: analysisIntentLabel || analysisIntent || undefined,
            seed,
            model: aiConfig?.imageModel,
            aspectRatio: settingsWithStyle.aspectRatio,
            layoutId: settingsWithStyle.compositionId,
            layoutName: resolvedCompositionPreset.name,
            contextItems: debugContextItems,
            requestPayload: requestPayloadForDebug,
            slideDebug
        })
        setPendingGenerateSettings(settingsWithStyle)
        setShowDebugModal(true)
    }, [
        activeBrandKit,
        aiConfig?.imageModel,
        analysisIntent,
        analysisIntentLabel,
        executeGenerate,
        isAdmin,
        buildSlidesFromCurrentState,
        ensureStyleAnalysisInSettings,
        openErrorModal,
        scriptSlides,
        toast
    ])

    const handleRetryLastGenerate = useCallback(async () => {
        if (!carouselSettings) return
        await executeGenerate(carouselSettings)
    }, [carouselSettings, executeGenerate])

    const handleRegenerateSlide = useCallback(async (index: number, correctionPrompt?: string) => {
        if (!carouselSettings || !activeBrandKit) return

        const slide = slides[index]
        if (!slide) return

        setIsRegenerating(true)
        setRegeneratingIndex(index)
        setSlides((prev) => prev.map((item, itemIndex) => (
            itemIndex === index
                ? { ...item, status: 'generating' as const, error: undefined }
                : item
        )))

        try {
            const slideContent: SlideContent = {
                index: slide.index,
                title: slide.title,
                description: slide.description,
                visualPrompt: correctionPrompt?.trim()
                    ? `${slide.description}\n\nCorrección local solicitada: ${correctionPrompt.trim()}`
                    : slide.description
            }

            if (!aiConfig?.imageModel) {
                throw new Error('Missing image model configuration')
            }

            const selectedLogoUrl = shouldApplyPrimaryLogoToSlide(
                carouselSettings.selectedLogoUrl,
                carouselSettings.includeLogoOnSlides,
                index,
                slides.length
            )
                ? carouselSettings.selectedLogoUrl
                : undefined
            const consistencyRefUrls: string[] = []
            const firstSlideImageUrl = slides[0]?.imageUrl
            if (index > 0 && firstSlideImageUrl) {
                consistencyRefUrls.push(firstSlideImageUrl)
            }
            const previousSlideImageUrl = slides[index - 1]?.imageUrl
            if (index > 0 && previousSlideImageUrl) {
                consistencyRefUrls.push(previousSlideImageUrl)
            }

            const result = await regenerateSlideAction(
                index,
                slideContent,
                slides.length,
                carouselSettings.prompt,
                carouselSettings.style,
                carouselSettings.aspectRatio,
                activeBrandKit,
                aiConfig.imageModel,
                selectedLogoUrl,
                carouselSettings.selectedColors,
                carouselSettings.compositionId,
                carouselSettings.structureId,
                carouselSettings.aiStyleDirectives,
                carouselSettings.applyStyleToTypography,
                carouselSettings.ctaUrlEnabled,
                carouselSettings.ctaUrl,
                carouselSettings.finalContactLines,
                carouselSettings.selectedReferenceImages,
                carouselSettings.selectedImageUrls,
                consistencyRefUrls.length > 0 ? consistencyRefUrls : undefined,
                createAuditFlowId('carousel_regenerate')
            )

            if (result.success && result.imageUrl) {
                const newSlides = [...slides]
                newSlides[index] = {
                    ...newSlides[index],
                    imageUrl: result.imageUrl,
                    status: 'done',
                    debugPrompt: result.debugPrompt,
                    debugReferences: result.debugReferences
                }
                setSlides(newSlides)
                toast({
                    title: t('ui.slideRegeneratedTitle'),
                    description: t('ui.slideRegeneratedDescription', { index: index + 1 })
                })
            } else {
                throw new Error(result.error || t('errors.unknown'))
            }

        } catch (error) {
            log.error('CAROUSEL', 'Slide regeneration failed', error)
            openErrorModal(
                t('errors.genericTitle'),
                error instanceof Error ? error.message : t('errors.regenerateSlide')
            )
        } finally {
            setIsRegenerating(false)
            setRegeneratingIndex(null)
        }
    }, [slides, carouselSettings, activeBrandKit, aiConfig?.imageModel, toast])

    useEffect(() => {
        setSlideCorrectionPrompt('')
    }, [currentSlideIndex])

    const currentSlide = slides[currentSlideIndex] || null
    const mappedSessionGenerations = useMemo(() => {
        return sessionHistory
            .map((item) => {
                const thumb = item.slides.find((s) => s.imageUrl)?.imageUrl
                if (!thumb) return null
                return {
                    id: item.id,
                    image_url: thumb,
                    preview_image_url: thumb,
                    original_image_url: thumb,
                    created_at: item.createdAt,
                }
            })
            .filter(Boolean) as Array<{
                id: string
                image_url: string
                preview_image_url?: string
                original_image_url?: string
                created_at: string
            }>
    }, [sessionHistory])

    const handleApplySlideCorrection = useCallback(() => {
        if (!currentSlide?.imageUrl) return
        const correction = slideCorrectionPrompt.trim()
        if (!correction) return
        void handleRegenerateSlide(currentSlideIndex, correction)
    }, [currentSlide?.imageUrl, currentSlideIndex, handleRegenerateSlide, slideCorrectionPrompt])

    const handleSelectSessionHistory = useCallback((id: string) => {
        const selected = sessionHistory.find((item) => item.id === id)
        if (!selected) return
        setSlides(selected.slides)
        setGeneratedCount(selected.slides.filter((s) => Boolean(s.imageUrl)).length)
        setCurrentSlideIndex(0)
        if (!isCaptionLocked) {
            setCaption(selected.caption || '')
        }
    }, [sessionHistory, isCaptionLocked])

    const handleRestorePreviewFromPreset = useCallback((state: {
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
    }) => {
        const restoredSlides = Array.isArray(state.slides) ? state.slides : []
        setSlides(restoredSlides)
        setGeneratedCount(restoredSlides.filter((s) => Boolean(s.imageUrl)).length)
        setCurrentSlideIndex(Math.max(0, Math.min((state.currentIndex ?? 0), Math.max(0, restoredSlides.length - 1))))

        const restoredScript = Array.isArray(state.scriptSlides)
            ? state.scriptSlides
            : restoredSlides.map((s) => ({
                index: s.index,
                title: s.title || '',
                description: s.description || '',
                visualPrompt: s.description || '',
                mustKeepFacts: 'mustKeepFacts' in s && Array.isArray(s.mustKeepFacts)
                    ? s.mustKeepFacts
                    : []
            }))
        setScriptSlides(restoredScript)
        setScriptSlideCount(restoredScript.length)
        setSuggestions(Array.isArray(state.suggestions) ? state.suggestions : [])
        setImagePromptSuggestions(Array.isArray(state.imagePromptSuggestions) ? state.imagePromptSuggestions : [])
        setSlideVariantSelection(Array.isArray(state.slideVariantSelection) ? state.slideVariantSelection : [])
        setAnalysisHook(state.analysisHook)
        setAnalysisStructure(state.analysisStructure)
        setAnalysisIntent(state.analysisIntent)
        setOriginalAnalysis(state.originalAnalysis || null)

        if (!isCaptionLocked) {
            setCaption(state.caption || '')
        }

        if (Array.isArray(state.sessionHistory)) {
            setSessionHistory(state.sessionHistory)
        }
    }, [isCaptionLocked])

    const handleResetCarousel = useCallback(() => {
        setSlides([])
        setGeneratedCount(0)
        setCurrentSlideIndex(0)
        setCaption('')
        setIsCaptionLocked(false)
        setIsCaptionGenerating(false)
        setReferenceImages([])
        setCarouselSettings(null)
        setScriptSlides(null)
        setScriptPrompt('')
        setScriptSlideCount(null)
        setAnalysisHook(undefined)
        setAnalysisStructure(undefined)
        setAnalysisIntent(undefined)
        setSuggestions([])
        setImagePromptSuggestions([])
        setSlideVariantSelection([])
        setOriginalAnalysis(null)
        setSessionHistory([])
        setPendingGenerateSettings(null)
        setDebugPromptData(null)
        setShowDebugModal(false)
    }, [])

    const invalidatePreview = useCallback(() => {
        const scriptSource = Array.isArray(scriptSlides) && scriptSlides.length > 0
            ? scriptSlides
            : null

        if (scriptSource) {
            const pendingSlides: CarouselSlide[] = scriptSource.map((slide, idx) => ({
                index: Number.isFinite(slide.index) ? slide.index : idx,
                headline: slide.headline,
                subtitle: slide.subtitle,
                title: slide.title || '',
                description: slide.description || '',
                status: 'pending' as const
            }))
            setSlides(pendingSlides)
        } else if (Array.isArray(slides) && slides.length > 0) {
            const pendingSlides: CarouselSlide[] = slides.map((slide, idx) => ({
                index: Number.isFinite(slide.index) ? slide.index : idx,
                headline: slide.headline,
                subtitle: slide.subtitle,
                title: slide.title || '',
                description: slide.description || '',
                status: 'pending' as const
            }))
            setSlides(pendingSlides)
        } else {
            setSlides([])
        }

        setGeneratedCount(0)
        setCurrentSlideIndex(0)
    }, [scriptSlides, slides])

    const confirmGeneration = useCallback(async () => {
        setShowDebugModal(false)
        if (pendingGenerateSettings) {
            await executeGenerate(pendingGenerateSettings)
            setPendingGenerateSettings(null)
            setDebugPromptData(null)
        }
    }, [executeGenerate, pendingGenerateSettings])

    const cancelGeneration = useCallback(() => {
        setShowDebugModal(false)
        setPendingGenerateSettings(null)
        setDebugPromptData(null)
    }, [])

    const controlsPanel = (
        <CarouselControlsPanel
            className="min-h-0 flex-1 !border-0 !bg-transparent"
            initialPrompt={carouselIncomingPrompt}
            onAnalyze={handleAnalyze}
            onGenerate={handleGenerate}
            onPreviewCompositionChange={setPreviewCompositionState}
            onCancelAnalyze={handleCancelAnalyze}
            onCancelGenerate={handleCancelGenerate}
            isCancelingAnalyze={isCancelingAnalyze}
            isCancelingGenerate={isCancelingGenerate}
            onAspectRatioChange={setAspectRatio}
            onReferenceImagesChange={setReferenceImages}
            onSelectedLogoChange={(_, logoUrl) => setSelectedLogoUrl(logoUrl)}
            onReset={handleResetCarousel}
            userId={user?.id}
            isAnalyzing={isAnalyzing}
            isGenerating={isGenerating}
            currentSlideIndex={currentSlideIndex}
            generatedCount={generatedCount}
            totalSlides={slides.length || 5}
            brandKit={activeBrandKit}
            suggestions={suggestions}
            onApplySuggestion={applySuggestion}
            onApplySlideVariant={applySlideVariant}
            onUndoSuggestion={undoSuggestion}
            hasOriginalSuggestion={!!originalAnalysis}
            slideVariantSelection={slideVariantSelection}
            suggestedImagePrompts={imagePromptSuggestions}
            analysisHook={analysisHook}
            analysisStructure={analysisStructure}
            analysisIntent={analysisIntent}
            analysisIntentLabel={analysisIntentLabel}
            isAdmin={isAdmin}
            slideCountOverride={slideCountOverride}
            onSlideCountOverrideApplied={() => setSlideCountOverride(null)}
            analysisReady={Boolean(scriptSlides?.length)}
            onReanalysisStateChange={setRequiresReanalysis}
            onInvalidatePreview={invalidatePreview}
            onReferencePreviewStateChange={setReferencePreviewState}
            previewSlides={slides}
            previewScriptSlides={scriptSlides}
            originalScriptSlides={originalAnalysis?.scriptSlides || scriptSlides}
            originalAnalysis={originalAnalysis}
            previewCaption={caption}
            previewCurrentIndex={currentSlideIndex}
            previewSessionHistory={sessionHistory}
            onRestorePreviewState={handleRestorePreviewFromPreset}
            getAuditFlowId={getOrCreateCreationFlowId}
            registerSettingsResolver={(resolver) => {
                latestCarouselSettingsResolverRef.current = resolver
            }}
            registerUnsavedBrandChangeGuard={(guard) => {
                unsavedBrandChangeGuardRef.current = guard
            }}
        />
    )

    const generateBar = (
        <StudioGenerateBar
            onGenerate={() => {
                const latestSettings = latestCarouselSettingsResolverRef.current?.() ?? carouselSettings
                if (!latestSettings) return
                void handleGenerate(latestSettings)
            }}
            onRetry={() => void handleRetryLastGenerate()}
            onCancelGenerate={handleCancelGenerate}
            isGenerating={isGenerating}
            isCancelingGenerate={isCancelingGenerate}
            canGenerate={Boolean(carouselSettings) && !isAnalyzing && !requiresReanalysis}
            hasGeneratedImage={slides.some(slide => Boolean(slide.imageUrl))}
            generatingLabel={t('carousel:ui.generating', { defaultValue: 'Generating...' })}
            generateLabel={t('carousel:ui.generateCarousel', { defaultValue: 'Generate carousel' })}
            retryLabel={t('carousel:ui.retryCarousel', { defaultValue: 'Generate another carousel with current settings' })}
            stopLabel={t('carousel:ui.stopGeneration', { defaultValue: 'Stop generation' })}
            cancelingLabel={t('carousel:ui.canceling', { defaultValue: 'Canceling...' })}
        />
    )

    const editPromptBar = (
        <StudioEditPromptBar
            editPrompt={slideCorrectionPrompt}
            onEditPromptChange={setSlideCorrectionPrompt}
            onApply={handleApplySlideCorrection}
            isApplying={Boolean(isRegenerating && regeneratingIndex === currentSlideIndex)}
            isEnabled={Boolean(currentSlide?.imageUrl)}
            hasGeneratedImage={Boolean(currentSlide?.imageUrl)}
            editPlaceholder={
                currentSlide?.imageUrl
                    ? t('carousel:ui.editSlidePlaceholder', { defaultValue: 'Describe the changes to edit the slide...' })
                    : t('carousel:ui.setupCarouselPlaceholder', { defaultValue: 'Set up your carousel in the side panel...' })
            }
            applyLabel={t('carousel:ui.applyCorrection', { defaultValue: 'Apply correction' })}
        />
    )

    const mobileControlsDrawer = isMobile ? (
        <MobileWorkPanelDrawer
            open={mobileControlsOpen}
            onOpenChange={setMobileControlsOpen}
            title={t('ui.workPanelTitle')}
            description={t('ui.workPanelDescription')}
            handleLabel={t('ui.adjustments')}
            closeLabel={t('ui.closeWorkPanel')}
        >
            {controlsPanel}
            <div className="sticky bottom-0 bg-transparent p-3 pt-2">
                <div className="rounded-[1.35rem] border border-border/45 bg-background/95 p-2 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)]">
                    <div
                        onClick={() => {
                            const latestSettings = latestCarouselSettingsResolverRef.current?.() ?? carouselSettings
                            if (!latestSettings || isGenerating || isAnalyzing || requiresReanalysis) return
                            setMobileControlsOpen(false)
                            void handleGenerate(latestSettings)
                        }}
                    >
                        {generateBar}
                    </div>
                </div>
            </div>
        </MobileWorkPanelDrawer>
    ) : null

    const actionBar = (
        <div className={cn(
            'studio-tone-shell flex-none flex flex-col border-t border-border/40 bg-surface min-h-[80px]',
            isMobile
                ? 'gap-3 p-3'
                : cn(
                    'lg:flex-row',
                    panelPosition === 'right' ? 'lg:flex-row' : 'lg:flex-row-reverse'
                )
        )}>
            <div className={cn(
                'flex-1 flex flex-col items-stretch gap-2',
                isMobile ? '' : 'p-3 md:p-4 sm:flex-row sm:items-end'
            )}>
                {editPromptBar}
            </div>

            {!isMobile ? <div className={cn(
                'flex flex-col justify-end gap-2',
                cn(
                    'w-full lg:w-[27%] p-3 md:p-4 border-t lg:border-t-0',
                    panelPosition === 'right' ? 'lg:border-l border-border/40' : 'lg:border-r border-border/40'
                )
            )}>
                {generateBar}
            </div> : null}
        </div>
    )

    if (brandKitsLoading && !activeBrandKit) {
        return (
            <DashboardLayout
                brands={brandKits}
                currentBrand={activeBrandKit}
                onBrandChange={handleBrandChange}
                onBrandDelete={deleteBrandKitById}
                onNewBrandKit={handleNewBrandKit}
                isFixed={!isMobile}
            >
                <div className="flex h-full items-center justify-center">
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <Loader2 className="h-8 w-8 text-primary" />
                        <span className="text-lg font-medium">{t('ui.loading')}</span>
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout
            brands={brandKits}
            currentBrand={activeBrandKit}
            onBrandChange={handleBrandChange}
            onBrandDelete={deleteBrandKitById}
            onNewBrandKit={handleNewBrandKit}
            isFixed={!isMobile}
            contentContainerVariant="plain"
            headerVariant="bar"
        >
            <div className={cn(
                'flex-1 relative min-h-0',
                isMobile ? 'flex flex-col overflow-y-auto' : 'flex flex-col overflow-hidden'
            )} style={isMobile ? { overscrollBehaviorY: 'none' } : undefined}>
                <div className={cn(
                    'flex-1 min-h-0',
                    isMobile
                        ? 'flex flex-col gap-3 px-2 py-3'
                        : cn(
                            'flex flex-col gap-4 overflow-hidden px-3 pb-3 pt-4 lg:flex-row',
                            panelPosition === 'right' ? 'lg:flex-row' : 'lg:flex-row-reverse'
                        )
                )}>
                    {/* LEFT COLUMN (Main Canvas) */}
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto no-scrollbar">
                    {!isMobile && isAdmin && activeComposition && activeCompositionRecommendation && (
                        <div className="shrink-0 px-4 pt-4 md:px-6">
                            <div className="rounded-2xl border border-border/70 bg-white shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => setIsAdminCompositionOpen((prev) => !prev)}
                                    className="flex w-full items-center justify-between gap-3 p-3 text-left"
                                >
                                    <div className="min-w-0 flex flex-1 flex-wrap items-center gap-2">
                                        <Badge variant="outline" className="gap-1">
                                            <IconSparkles className="h-3 w-3" />
                                            {t('admin.badge', { defaultValue: 'Admin composition' })}
                                        </Badge>
                                        <Badge variant={activeComposition.isActive ? 'default' : 'destructive'}>
                                            {activeComposition.isActive
                                                ? t('admin.active', { defaultValue: 'Active' })
                                                : t('admin.inactive', { defaultValue: 'Inactive' })}
                                        </Badge>
                                        <span className="truncate text-sm font-medium">{activeComposition.name}</span>
                                        <span className="truncate text-xs font-mono text-muted-foreground">
                                            {activeComposition.composition_id}
                                        </span>
                                        {isAdminCompositionOpen && (
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                <span>{t('admin.now', { defaultValue: 'Now:' })}</span>
                                                <Badge variant="secondary">{activeComposition.mode}</Badge>
                                                <Badge variant="outline">{activeComposition.scope}</Badge>
                                                <span className="text-muted-foreground/70">→</span>
                                                <span>{t('admin.proposal', { defaultValue: 'Proposal:' })}</span>
                                                <Badge
                                                    variant={activeCompositionRecommendation.shouldChangeMode ? 'default' : 'secondary'}
                                                >
                                                    {activeCompositionRecommendation.suggestedMode}
                                                </Badge>
                                                <Badge
                                                    variant={activeCompositionRecommendation.shouldChangeScope ? 'default' : 'outline'}
                                                >
                                                    {activeCompositionRecommendation.suggestedScope}
                                                </Badge>
                                                {!activeCompositionRecommendation.shouldChangeAnything && (
                                                    <span>{t('admin.noSuggestedChange', { defaultValue: 'No suggested change.' })}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                        {isAdminCompositionOpen
                                            ? t('common:actions.hide', { defaultValue: 'Hide' })
                                            : t('common:actions.show', { defaultValue: 'Show' })}
                                    </span>
                                </button>

                                {isAdminCompositionOpen && (
                                    <div className="border-t border-border/70 px-3 pb-3 pt-3">
                                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
                                        <div className="space-y-3">
                                            <div className="rounded-xl border border-border bg-muted/20 p-3">
                                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                                    {t('admin.currentState', { defaultValue: 'Current state' })}
                                                </p>
                                                <p className="mt-2 text-sm text-muted-foreground">
                                                    {t('admin.savedAs', { defaultValue: 'This composition is currently saved as' })}
                                                    {' '}
                                                    <span className="font-medium text-foreground">{activeComposition.mode}</span>
                                                    {' + '}
                                                    <span className="font-medium text-foreground">{activeComposition.scope}</span>
                                                    .
                                                </p>
                                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                                    {t('admin.modeScopeDescription', { defaultValue: '`basic` enters auto-selection. `advanced` only appears when you work in advanced mode. `global` can be reused in any narrative. `narrative` only works inside its narrative.' })}
                                                </p>
                                            </div>

                                            <div className="rounded-xl border border-border bg-muted/20 p-3">
                                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                                    {t('admin.automaticProposal', { defaultValue: 'Automatic proposal' })}
                                                </p>
                                                <p className="mt-2 text-sm text-muted-foreground">
                                                    {t('admin.heuristicProposal', { defaultValue: 'The heuristic suggests leaving it as' })}
                                                    {' '}
                                                    <span className="font-medium text-foreground">{activeCompositionRecommendation.suggestedMode}</span>
                                                    {' + '}
                                                    <span className="font-medium text-foreground">{activeCompositionRecommendation.suggestedScope}</span>
                                                    .
                                                </p>
                                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                                    {activeCompositionRecommendation.reasoning.join(' ')}
                                                </p>
                                                <p className="mt-2 text-[11px] text-muted-foreground/80">
                                                    Score: basic {activeCompositionRecommendation.scores.basic}
                                                    {' · '}
                                                    advanced {activeCompositionRecommendation.scores.advanced}
                                                    {' · '}
                                                    global {activeCompositionRecommendation.scores.global}
                                                    {' · '}
                                                    narrative {activeCompositionRecommendation.scores.narrative}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="rounded-xl border border-border bg-muted/20 p-3">
                                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                                    {t('admin.manualChanges', { defaultValue: 'Manual changes' })}
                                                </p>
                                                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                                    {t('admin.manualChangesDescription', { defaultValue: 'These buttons directly change the saved state of the active composition.' })}
                                                </p>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant={activeComposition.mode === 'basic' ? 'default' : 'outline'}
                                                        onClick={() => void handleAdminCompositionPatch({ mode: 'basic' })}
                                                    >
                                                        {t('admin.basic', { defaultValue: 'Basic' })}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant={activeComposition.mode === 'advanced' ? 'default' : 'outline'}
                                                        onClick={() => void handleAdminCompositionPatch({ mode: 'advanced' })}
                                                    >
                                                        {t('admin.advanced', { defaultValue: 'Advanced' })}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant={activeComposition.scope === 'global' ? 'default' : 'outline'}
                                                        onClick={() => void handleAdminCompositionPatch({ scope: 'global' })}
                                                    >
                                                        <IconLayers className="mr-1 h-4 w-4" />
                                                        Global
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant={activeComposition.scope === 'narrative' ? 'secondary' : 'outline'}
                                                        onClick={() => void handleAdminCompositionPatch({ scope: 'narrative' })}
                                                    >
                                                        {t('admin.currentNarrative', { defaultValue: 'Current narrative' })}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant={activeComposition.isActive ? 'outline' : 'destructive'}
                                                        onClick={() => void handleAdminCompositionPatch({ isActive: !activeComposition.isActive })}
                                                    >
                                                        <IconPower className="mr-1 h-4 w-4" />
                                                        {activeComposition.isActive
                                                            ? t('admin.deactivate', { defaultValue: 'Deactivate' })
                                                            : t('admin.activate', { defaultValue: 'Activate' })}
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-border bg-muted/20 p-3">
                                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                                    {t('admin.automaticShortcut', { defaultValue: 'Automatic shortcut' })}
                                                </p>
                                                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                                    {t('admin.automaticShortcutDescription', { defaultValue: 'This button applies the automatic proposal exactly on the active composition.' })}
                                                </p>
                                                <Button
                                                    size="sm"
                                                    className="mt-3 w-full"
                                                    disabled={!activeCompositionRecommendation.shouldChangeAnything}
                                                    onClick={() => void handleApplyAutomaticRecommendation()}
                                                >
                                                    <IconWand className="mr-1 h-4 w-4" />
                                                    {activeCompositionRecommendation.shouldChangeAnything
                                                        ? t('admin.applyAutomaticSuggestion', { defaultValue: 'Apply automatic suggestion' })
                                                        : t('admin.alreadyMatchesSuggestion', { defaultValue: 'The composition already matches the suggestion' })}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                        <div
                            className={cn(
                                'relative flex flex-col',
                                previewLayoutMode === 'compact-scroll'
                                    ? 'min-h-0 flex-none'
                                    : 'min-h-[340px] flex-1 md:min-h-[500px]'
                            )}
                        >
                            <CarouselCanvasPanel
                                slides={slides}
                                scriptSlides={scriptSlides}
                                currentIndex={currentSlideIndex}
                                onSelectSlide={setCurrentSlideIndex}
                                onRegenerateSlide={handleRegenerateSlide}
                                onUpdateSlideScript={handleUpdateSlideScript}
                                isGenerating={isGenerating}
                                isRegenerating={isRegenerating}
                                regeneratingIndex={regeneratingIndex}
                                aspectRatio={aspectRatio}
                                caption={caption}
                                onCaptionChange={setCaption}
                                onRegenerateCaption={handleRegenerateCaption}
                                onCancelCaptionGeneration={handleCancelCaption}
                                isCaptionGenerating={isCaptionGenerating}
                                isCancelingCaption={isCancelingCaption}
                                isCaptionLocked={isCaptionLocked}
                                onToggleCaptionLock={() => setIsCaptionLocked(!isCaptionLocked)}
                                referenceImages={previewReferenceImages}
                                referenceImageRoles={previewReferenceImageRoles}
                                referenceImageMode={referencePreviewState.imageSourceMode}
                                brandKitTexts={brandKitTexts}
                                brandName={activeBrandKit?.brand_name}
                                hook={analysisHook}
                                selectedLogoUrl={selectedLogoUrl}
                                showPrimaryLogoOnCurrentSlide={shouldApplyPrimaryLogoToSlide(
                                    selectedLogoUrl,
                                    carouselSettings?.includeLogoOnSlides,
                                    currentSlideIndex,
                                    Math.max(slides.length, 1)
                                )}
                                compositionGhostIcon={compositionGhostIcon || undefined}
                                isAdmin={Boolean(isAdmin)}
                                previewLayoutMode={previewLayoutMode}
                            />
                            {!isMobile && (
                                <FeedbackButton
                                    show={slides.some(slide => Boolean(slide.imageUrl))}
                                    brandId={activeBrandKit?.id as Id<"brand_dna"> | undefined}
                                    intent={analysisIntent || undefined}
                                    layout={carouselSettings?.compositionId}
                                    variant="tab"
                                    tabSide={panelPosition === 'right' ? 'right' : 'left'}
                                />
                            )}
                        </div>

                        <div className="flex flex-col gap-3">

                            {mappedSessionGenerations.length > 0 && (
                                <div className="min-w-0 flex-shrink-0 px-3 pb-1 md:px-4 md:pb-2">
                                    <ThumbnailHistory
                                        generations={mappedSessionGenerations}
                                        currentImageUrl={currentSlide?.imageUrl || null}
                                        onSelectGeneration={(gen) => handleSelectSessionHistory(gen.id)}
                                    />
                                </div>
                            )}
                            <div className="relative px-3 pb-3 pt-1 md:px-4 md:pb-3">
                                {editPromptBar}
                            </div>
                            {isMobile && slides.some(slide => Boolean(slide.imageUrl)) ? (
                                <div className="mt-3 shrink-0 rounded-2xl border border-border/50">
                                    {actionBar}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* RIGHT COLUMN - Controls Panel */}
                    {!isMobile ? (
                        <div className="flex w-full min-h-0 flex-col lg:w-[27%] lg:pb-3">
                            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.6rem] border border-border/60 bg-white shadow-[0_24px_70px_-46px_rgba(15,23,42,0.34)]">
                                {controlsPanel}
                                <div className="shrink-0 px-4 py-4">
                                    {generateBar}
                                </div>
                            </div>
                        </div>
                    ) : null}
                    {mobileControlsDrawer}
                </div>
            </div>

            <PromptDebugModal
                open={showDebugModal}
                onClose={cancelGeneration}
                onConfirm={confirmGeneration}
                promptData={debugPromptData}
            />

            <Dialog open={errorModal.open} onOpenChange={(open) => setErrorModal(prev => ({ ...prev, open }))}>
                <DialogContent className={STUDIO_DECISION_DIALOG_CLASS}>
                    <DialogHeader className={STUDIO_DECISION_DIALOG_HEADER_CLASS}>
                        <DialogTitle className={cn(STUDIO_DECISION_DIALOG_TITLE_CLASS, 'flex items-center gap-2 text-destructive')}>
                            {errorModal.title}
                        </DialogTitle>
                        <DialogDescription className={cn(STUDIO_DECISION_DIALOG_DESCRIPTION_CLASS, 'whitespace-pre-wrap')}>
                            {errorModal.message}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className={STUDIO_DECISION_DIALOG_FOOTER_CLASS}>
                        {errorModal.suggestedSlideCount ? (
                            <Button
                                variant="outline"
                                className={STUDIO_DECISION_BUTTON_CLASS}
                                onClick={() => {
                                    setSlideCountOverride(errorModal.suggestedSlideCount || null)
                                    setErrorModal(prev => ({ ...prev, open: false }))
                                }}
                            >
                                {t('errors.adjustToSlides', { count: errorModal.suggestedSlideCount, defaultValue: 'Adjust to {{count}} slides' })}
                            </Button>
                        ) : null}
                        <Button className={STUDIO_DECISION_BUTTON_CLASS} onClick={() => setErrorModal(prev => ({ ...prev, open: false }))}>
                            {t('common:actions.gotIt', { defaultValue: 'Got it' })}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    )
}



