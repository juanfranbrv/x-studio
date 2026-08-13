'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

import { useUser } from '@clerk/nextjs'
import { useBrandKit } from '@/contexts/BrandKitContext'
import { useToast } from '@/hooks/use-toast'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { CanvasPanel } from '@/components/studio/CanvasPanel'
import { ControlsPanel } from '@/components/studio/ControlsPanel'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Loader2 } from '@/components/ui/spinner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PromptCard } from '@/components/studio/PromptCard'
import { CaptionCard } from '@/components/studio/CaptionCard'
import { ThumbnailHistory } from '@/components/studio/ThumbnailHistory'
import { useCreationFlow, UseCreationFlowOptions } from '@/hooks/useCreationFlow'
import { useDisablePullToRefresh } from '@/hooks/useDisablePullToRefresh'
import { uploadBrandImage } from '@/app/actions/upload-image'
import { SOCIAL_FORMATS, ALL_IMAGE_LAYOUTS, LAYOUTS_BY_INTENT, type DebugPromptData, type DebugContextItem } from '@/lib/creation-flow-types'
import { IconPlus } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { PromptDebugModal } from '@/components/studio/modals/PromptDebugModal'
import { buildEditPrompt } from '@/lib/prompts/image-edit'
import { buildImagePrompt } from '@/lib/prompt-builder'
import { parseLazyIntentAction } from '@/app/actions/parse-intent'
import { shouldRefreshAiImageDescription } from '@/lib/prompts/intents/legacy-visual-brief'
import { IntentCategory, TextAsset } from '@/lib/creation-flow-types'
import { useUI } from '@/contexts/UIContext'
import { hexToHslString } from '@/lib/color-utils'
import { FeedbackButton } from '@/components/studio/FeedbackButton'
import { MobileWorkPanelDrawer } from '@/components/studio/shared/MobileWorkPanelDrawer'
import { SessionTitleDialog } from '@/components/studio/shared/SessionTitleDialog'
import { StudioEditPromptBar, StudioGenerateBar } from '@/components/studio/shared/StudioActionBar'
import { IndeterminateProgressBar } from '@/components/studio/shared/IndeterminateProgressBar'
import { resolvePreviewLayoutMode } from '@/components/studio/previewLayoutMode'
import {
    STUDIO_DECISION_BUTTON_CLASS,
    STUDIO_DECISION_DIALOG_CLASS,
    STUDIO_DECISION_DIALOG_DESCRIPTION_CLASS,
    STUDIO_DECISION_DIALOG_FOOTER_CLASS,
    STUDIO_DECISION_DIALOG_HEADER_CLASS,
    STUDIO_DECISION_DIALOG_TITLE_CLASS,
} from '@/components/studio/shared/dialogStyles'
import { Id } from '../../../convex/_generated/dataModel'
import type { BrandDNA } from '@/lib/brand-types'
import { getCompositionsSummaryAction, type CompositionSummary } from '@/lib/admin-compositions-actions'
import { useTranslation } from 'react-i18next'
import { buildAutomaticSessionTitle, getSessionDisplayTitle, normalizeCustomSessionTitle } from '@/lib/session-titles'
import { getLastVisitedModuleAction } from '@/app/actions/get-last-visited-module'
import { normalizeStudioDebugOverlaysEnabled } from '@/lib/studio-debug-visibility'
import { useBrandContextDocuments } from '@/hooks/useBrandContextDocuments'
import { signaturesMatch } from '@/lib/context-analysis-signature'
import type { ContextAnalysisSignature } from '@/lib/context-documents'
import { shouldApplyLastVisitedImageBrand } from './lastVisitedScope'
import {
    INCOMING_PROMPT_FLAG_STORAGE_KEY,
    initializeIncomingPromptTransfer,
    resolveDraftPromptAfterBrandReset,
    resolvePendingIncomingPrompt,
} from './incomingPromptTransfer'

// Admin email for debug modal access
const ADMIN_EMAIL = 'juanfranbrv@gmail.com'
const LAST_IMAGE_SCOPE_TIMEOUT_MS = 1800

interface Generation {
    id: string
    image_url: string
    image_storage_id?: string
    preview_image_url?: string
    preview_image_storage_id?: string
    original_image_url?: string
    original_image_storage_id?: string
    created_at: string
    prompt_used?: string
    caption?: string
    headline?: string
    cta?: string
    platform?: string
    format?: string
    request_payload?: Record<string, unknown>
    error_title?: string
    error_fallback?: string
}

interface ImageWorkspaceSnapshot {
    version: number
    module: 'image'
    promptValue: string
    editPrompt: string
    logoInclusion: boolean
    compositionMode: 'basic' | 'advanced'
    selectedContext: ContextElement[]
    sessionGenerations: Generation[]
    creationFlowState: Record<string, unknown>
    rootPrompt?: string
    usedBrandId?: string | null
    usedContextDocumentId?: string | null
    contextChangedSinceAnalysis?: boolean
}

type SessionDecisionButton = {
    id: string
    label: string
    variant?: 'default' | 'outline' | 'destructive'
}

type SessionDecisionModalState = {
    open: boolean
    title: string
    description: string
    buttons: SessionDecisionButton[]
}

type CompactGeneration = Pick<Generation, 'id' | 'image_url' | 'image_storage_id' | 'preview_image_url' | 'preview_image_storage_id' | 'original_image_url' | 'original_image_storage_id' | 'created_at' | 'prompt_used' | 'caption' | 'headline' | 'cta' | 'platform' | 'format' | 'error_title' | 'error_fallback'> & {
    request_payload?: {
        prompt?: string
        model?: string
        layoutId?: string
        aspectRatio?: string
    }
}

const IMAGE_DECISION_DIALOG_CLASS = STUDIO_DECISION_DIALOG_CLASS
const IMAGE_DECISION_DIALOG_HEADER_CLASS = STUDIO_DECISION_DIALOG_HEADER_CLASS
const IMAGE_DECISION_DIALOG_TITLE_CLASS = STUDIO_DECISION_DIALOG_TITLE_CLASS
const IMAGE_DECISION_DIALOG_DESCRIPTION_CLASS = STUDIO_DECISION_DIALOG_DESCRIPTION_CLASS
const IMAGE_DECISION_DIALOG_FOOTER_CLASS = STUDIO_DECISION_DIALOG_FOOTER_CLASS
const IMAGE_DECISION_BUTTON_CLASS = STUDIO_DECISION_BUTTON_CLASS

export type ContextType = 'color' | 'logo' | 'aux_logo' | 'template' | 'image' | 'font' | 'text' | 'link' | 'contact'

export interface ContextElement {
    id: string
    type: ContextType
    value: string
    label?: string
}



export default function ImagePage() {
    const { t } = useTranslation('image')
    const router = useRouter()
    const { user } = useUser()
    const { activeBrandKit, brandKits, loading, setActiveBrandKit, updateActiveBrandKit, deleteBrandKitById } = useBrandKit()
    const contextDocuments = useBrandContextDocuments(activeBrandKit?.id)
    const [usedContextSignature, setUsedContextSignature] = useState<ContextAnalysisSignature | null>(null)
    const [contextChangedSinceAnalysis, setContextChangedSinceAnalysis] = useState(false)
    const currentContextSignatureRef = useRef<ContextAnalysisSignature>({ brandId: '', contextDocumentId: null })
    const usedContextSignatureRef = useRef<ContextAnalysisSignature | null>(null)
    const userRecord = useQuery(api.users.getUser, user?.id ? { clerk_id: user.id } : 'skip')
    const { panelPosition } = useUI()
    const [isGenerating, setIsGenerating] = useState(false)
    const { toast } = useToast()
    const [selectedContext, setSelectedContext] = useState<ContextElement[]>([])
    const [logoInclusion, setLogoInclusion] = useState(true)
    const [compositionMode, setCompositionMode] = useState<'basic' | 'advanced'>('basic')

    useEffect(() => {
        const current = {
            brandId: activeBrandKit?.id || '',
            contextDocumentId: contextDocuments.activeDocument?.id ?? null,
        }
        currentContextSignatureRef.current = current
        if (usedContextSignatureRef.current && !signaturesMatch(usedContextSignatureRef.current, current)) {
            setContextChangedSinceAnalysis(true)
        }
    }, [activeBrandKit?.id, contextDocuments.activeDocument?.id])

    const handleContextDocumentChanged = useCallback((documentId: string | null) => {
        const current = { brandId: activeBrandKit?.id || '', contextDocumentId: documentId }
        currentContextSignatureRef.current = current
        if (usedContextSignatureRef.current) setContextChangedSinceAnalysis(true)
    }, [activeBrandKit?.id])

    const incomingPromptRef = useRef<string>('')
    const initialIncomingTransferRef = useRef<ReturnType<typeof initializeIncomingPromptTransfer> | null>(null)
    if (initialIncomingTransferRef.current === null) {
        initialIncomingTransferRef.current = typeof window === 'undefined'
            ? initializeIncomingPromptTransfer()
            : initializeIncomingPromptTransfer(sessionStorage)
        incomingPromptRef.current = initialIncomingTransferRef.current.pendingPrompt
    }
    const [pendingIncomingPrompt, setPendingIncomingPrompt] = useState<string>(initialIncomingTransferRef.current.pendingPrompt)
    const [promptValue, setPromptValue] = useState<string>(initialIncomingTransferRef.current.prompt)
    useEffect(() => {
        if (promptValue) creationFlow.setRawMessage(promptValue)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
    const [editPrompt, setEditPrompt] = useState('')
    const [isMobile, setIsMobile] = useState(false)
    const [viewportHeight, setViewportHeight] = useState(1080)
    useDisablePullToRefresh(isMobile)
    const [mobileControlsOpen, setMobileControlsOpen] = useState(false)
    const [isMagicParsing, setIsMagicParsing] = useState(false)
    const [isInspiring, setIsInspiring] = useState(false)
    const [isCancelingAnalyze, setIsCancelingAnalyze] = useState(false)
    const [isCancelingGenerate, setIsCancelingGenerate] = useState(false)
    const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set())
    const [auditFlowId, setAuditFlowId] = useState<string | null>(null)
    const auditFlowIdRef = useRef<string | null>(null)
    const smartAnalyzeInFlightRef = useRef(false)
    const cancelAnalyzeRef = useRef(false)
    const generationAbortControllerRef = useRef<AbortController | null>(null)

    // Layout Overrides for Icons
    const [layoutOverrides, setLayoutOverrides] = useState<CompositionSummary[]>([])

    useEffect(() => {
        getCompositionsSummaryAction()
            .then(setLayoutOverrides)
            .catch(err => console.error('Failed to load layout overrides:', err))
    }, [])

    useEffect(() => {
        auditFlowIdRef.current = auditFlowId
    }, [auditFlowId])

    const layoutIconOverrides = useMemo(() => {
        if (!layoutOverrides.length) return {}
        return layoutOverrides.reduce<Record<string, string>>((acc, item) => {
            if (item.svgIcon) acc[item.id] = item.svgIcon
            return acc
        }, {})
    }, [layoutOverrides])
    const lastCompositionModeRef = useRef<'basic' | 'advanced'>(compositionMode)

    // AI Configuration
    const aiConfig = useQuery(api.settings.getAIConfig)
    const studioDebugFlags = useQuery(api.settings.getStudioDebugFlags, {})

    // Detect mobile viewport
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

    // Debug Modal States
    const [showDebugModal, setShowDebugModal] = useState(false)
    const [debugPromptData, setDebugPromptData] = useState<DebugPromptData | null>(null)
    const [editableDebugPrompt, setEditableDebugPrompt] = useState('')
    const [isDebugViewOnly, setIsDebugViewOnly] = useState(false)
    const showStudioDebugOverlays = normalizeStudioDebugOverlaysEnabled(studioDebugFlags?.showDebugOverlays)
    const [pendingGenerationData, setPendingGenerationData] = useState<any>(null)
    const [pendingRetryRequest, setPendingRetryRequest] = useState<{
        payload: Record<string, unknown>
        errorTitle: string
        errorFallback: string
    } | null>(null)

    useEffect(() => {
        if (!showStudioDebugOverlays) {
            setShowDebugModal(false)
        }
    }, [showStudioDebugOverlays])
    const [lastGenerationRequest, setLastGenerationRequest] = useState<{
        payload: Record<string, unknown>
        errorTitle: string
        errorFallback: string
    } | null>(null)
    const basicLayoutCursorByIntentRef = useRef<Partial<Record<IntentCategory, number>>>({})

    // Local session history
    const [sessionGenerations, setSessionGenerations] = useState<Generation[]>([])
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
    const [selectedSessionToLoad, setSelectedSessionToLoad] = useState<string>('')
    const [sessionRootPrompt, setSessionRootPrompt] = useState<string | null>(null)
    const [isHydratingSession, setIsHydratingSession] = useState(false)
    const [isSavingSession, setIsSavingSession] = useState(false)
    const [isCreatingSession, setIsCreatingSession] = useState(false)
    const [sessionSavedAt, setSessionSavedAt] = useState<string | null>(null)
    const [sessionSaveError, setSessionSaveError] = useState<string | null>(null)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [unsavedNavModalOpen, setUnsavedNavModalOpen] = useState(false)
    const [pendingNavigationTarget, setPendingNavigationTarget] = useState<{ href: string; external: boolean } | null>(null)
    const [isResolvingUnsavedNavigation, setIsResolvingUnsavedNavigation] = useState(false)
    const hydrationScopeRef = useRef<string>('')
    const hasHydratedScopeRef = useRef(false)
    const lastSavedSnapshotSignatureRef = useRef<string | null>(null)
    const pendingBaselineResetRef = useRef(false)
    const baselineResetTimeoutRef = useRef<number | null>(null)
    const createSessionInFlightRef = useRef(false)
    const persistedSessionImageCacheRef = useRef<Map<string, {
        storageId: string
        imageUrl: string
        originalStorageId: string
        originalImageUrl: string
        previewStorageId: string
        previewImageUrl: string
    }>>(new Map())
    const persistImageInFlightRef = useRef<Map<string, Promise<{ storageId: string; imageUrl: string; originalStorageId: string; originalImageUrl: string; previewStorageId: string; previewImageUrl: string } | null>>>(new Map())
    const bypassUnsavedGuardRef = useRef(false)
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
    const [lastVisitedImageScopeReady, setLastVisitedImageScopeReady] = useState(false)
    const initialImageScopeResolvedRef = useRef(false)
    const activeBrandKitIdRef = useRef<string | null>(null)
    const setActiveBrandKitRef = useRef(setActiveBrandKit)
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
            title: t('unsaved.title'),
            description: t('unsaved.description', { action }),
            buttons: [
                { id: 'cancel', label: t('unsaved.stay'), variant: 'outline' },
                { id: 'discard', label: t('unsaved.discard'), variant: 'destructive' },
            ],
        })
        return decision === 'discard'
    }, [hasUnsavedChanges, openSessionDecisionModal, t])

    const createWorkSession = useMutation(api.work_sessions.createSession)
    const upsertWorkSession = useMutation(api.work_sessions.upsertActiveSession)
    const activateWorkSession = useMutation(api.work_sessions.activateSession)
    const deleteWorkSession = useMutation(api.work_sessions.deleteSession)
    const clearWorkSessions = useMutation(api.work_sessions.clearSessions)

    useEffect(() => {
        activeBrandKitIdRef.current = activeBrandKit?.id ?? null
    }, [activeBrandKit?.id])

    useEffect(() => {
        setActiveBrandKitRef.current = setActiveBrandKit
    }, [setActiveBrandKit])

    useEffect(() => {
        initialImageScopeResolvedRef.current = false
        setLastVisitedImageScopeReady(false)

        if (!user?.id) {
            setLastVisitedImageScopeReady(true)
            return
        }

        let cancelled = false
        const requestedActiveBrandId = activeBrandKitIdRef.current

        void (async () => {
            const result = await Promise.race([
                getLastVisitedModuleAction(user.id),
                new Promise<{ success: false; error: string }>((resolve) => {
                    setTimeout(() => resolve({ success: false, error: 'timeout' }), LAST_IMAGE_SCOPE_TIMEOUT_MS)
                }),
            ])

            if (cancelled || initialImageScopeResolvedRef.current) return
            initialImageScopeResolvedRef.current = true

            const lastVisitedModule = result.success ? (result.data ?? null) : null
            const targetBrandId =
                lastVisitedModule?.module === 'image' && typeof lastVisitedModule.brand_id === 'string'
                    ? lastVisitedModule.brand_id
                    : null

            if (targetBrandId && shouldApplyLastVisitedImageBrand({
                targetBrandId,
                requestedActiveBrandId,
                currentActiveBrandId: activeBrandKitIdRef.current,
                persistedActiveBrandId: userRecord?.current_brand_id ? String(userRecord.current_brand_id) : null,
            })) {
                await Promise.race([
                    setActiveBrandKitRef.current(targetBrandId, true, true),
                    new Promise<boolean>((resolve) => {
                        setTimeout(() => resolve(false), 1200)
                    }),
                ])
            }

            if (!cancelled) {
                setLastVisitedImageScopeReady(true)
            }
        })()

        return () => {
            cancelled = true
        }
    }, [user?.id, userRecord?.current_brand_id])

    const scopedBrandId = (lastVisitedImageScopeReady ? activeBrandKit?.id : undefined) as Id<'brand_dna'> | undefined
    const activeWorkSession = useQuery(
        api.work_sessions.getActiveSession,
        user?.id && scopedBrandId
            ? { user_id: user.id, module: 'image', brand_id: scopedBrandId }
            : 'skip'
    )
    const workSessions = useQuery(
        api.work_sessions.listSessions,
        user?.id && scopedBrandId
            ? { user_id: user.id, module: 'image', brand_id: scopedBrandId, limit: 50 }
            : 'skip'
    )

    // Sync history
    const displayGenerations = useMemo(() => {
        return sessionGenerations.filter((generation) => {
            const hasUrl = typeof generation.image_url === 'string' && generation.image_url.trim().length > 0
            const hasStorageId = typeof generation.image_storage_id === 'string' && generation.image_storage_id.trim().length > 0
            return hasUrl || hasStorageId
        })
    }, [sessionGenerations])

    const creationFlow = useCreationFlow({
        getOrCreateAuditFlowId: () => {
            const current = auditFlowIdRef.current
            if (current) return current
            const next = `flow_${Date.now()}`
            auditFlowIdRef.current = next
            setAuditFlowId(next)
            return next
        },
        onImageUploaded: async (file: File) => {
            // Reference images are only used for the current session/generation
            // and should not be persisted in the permanent Brand Kit image storage.
            console.log('Image uploaded for current flow:', file.name)
        },
        onReset: () => {
            creationFlow.setGeneratedImage(null)
            setDebugPromptData(null)
            setSelectedContext([])
            setPromptValue('')
            setCompositionMode('basic')
            basicLayoutCursorByIntentRef.current = {}
            setPendingRetryRequest(null)
            setLastGenerationRequest(null)
        }
    } as UseCreationFlowOptions)

    const updatePromptDraft = useCallback((nextPrompt: string) => {
        setPromptValue(nextPrompt)
        creationFlow.setRawMessage(nextPrompt)
        setPendingIncomingPrompt((prev) => {
            const nextPending = resolvePendingIncomingPrompt(prev, nextPrompt)
            incomingPromptRef.current = nextPending
            return nextPending
        })
    }, [creationFlow])

    const normalizePromptForSession = useCallback((value?: string | null) => {
        const cleaned = (value || '')
            .trim()
            .replace(/\s+/g, ' ')
            .toLowerCase()
        return cleaned.length > 0 ? cleaned : null
    }, [])

    const buildAutoSessionTitle = useCallback((value?: string | null) => (
        buildAutomaticSessionTitle(value, t('sessions.newSessionTitle', { defaultValue: 'New session' }))
    ), [t])

    const buildDisplaySessionTitle = useCallback((value?: string | null, customized = false) => (
        getSessionDisplayTitle(value, {
            fallback: t('sessions.newSessionTitle', { defaultValue: 'New session' }),
            customized,
        })
    ), [t])

    const buildCustomSessionTitle = useCallback((value?: string | null) => (
        normalizeCustomSessionTitle(value, t('sessions.newSessionTitle', { defaultValue: 'New session' }))
    ), [t])
    const activeSessionMeta = useMemo(() => {
        const currentId = currentSessionId ? String(currentSessionId) : ''
        if (!currentId) return null
        return (workSessions || []).find((session) => String(session._id) === currentId) || null
    }, [currentSessionId, workSessions])

    const buildWorkspaceSnapshot = useCallback((rootPromptOverride?: string | null, generationsOverride?: Generation[]): ImageWorkspaceSnapshot => {
        const sourceGenerations = generationsOverride ?? sessionGenerations
        const compactGenerations: CompactGeneration[] = sourceGenerations.slice(-24).map((generation) => {
            const payload = generation.request_payload || {}
            return {
                id: generation.id,
                image_url: generation.image_url,
                image_storage_id: generation.image_storage_id,
                preview_image_url: generation.preview_image_url,
                preview_image_storage_id: generation.preview_image_storage_id,
                original_image_url: generation.original_image_url,
                original_image_storage_id: generation.original_image_storage_id,
                created_at: generation.created_at,
                prompt_used: generation.prompt_used?.slice(0, 900),
                caption: generation.caption?.slice(0, 1200),
                headline: generation.headline?.slice(0, 300),
                cta: generation.cta?.slice(0, 180),
                platform: generation.platform?.slice(0, 80),
                format: generation.format?.slice(0, 80),
                error_title: generation.error_title,
                error_fallback: generation.error_fallback,
                request_payload: {
                    prompt: typeof payload.prompt === 'string' ? payload.prompt.slice(0, 900) : undefined,
                    model: typeof payload.model === 'string' ? payload.model : undefined,
                    layoutId: typeof payload.layoutId === 'string' ? payload.layoutId : undefined,
                    aspectRatio: typeof payload.aspectRatio === 'string' ? payload.aspectRatio : undefined,
                }
            }
        })

        return {
            version: 1,
            module: 'image',
            promptValue: promptValue.slice(0, 1800),
            editPrompt: editPrompt.slice(0, 1200),
            logoInclusion,
            compositionMode,
            selectedContext: selectedContext.slice(0, 16),
            sessionGenerations: compactGenerations,
            creationFlowState: creationFlow.getStateSnapshot(),
            rootPrompt: (rootPromptOverride ?? sessionRootPrompt ?? undefined)?.slice(0, 1800),
            usedBrandId: usedContextSignature?.brandId ?? null,
            usedContextDocumentId: usedContextSignature?.contextDocumentId ?? null,
            contextChangedSinceAnalysis,
        }
    }, [
        promptValue,
        editPrompt,
        logoInclusion,
        compositionMode,
        selectedContext,
        sessionGenerations,
        creationFlow,
        sessionRootPrompt,
        usedContextSignature,
        contextChangedSinceAnalysis,
    ])

    const buildWorkspaceChangeSignature = useCallback((snapshot: ImageWorkspaceSnapshot) => {
        const normalizedCreationFlowState = (
            snapshot.creationFlowState &&
            typeof snapshot.creationFlowState === 'object' &&
            !Array.isArray(snapshot.creationFlowState)
        )
            ? {
                ...snapshot.creationFlowState,
                generatedImage: null,
                hasGeneratedImage: Array.isArray(snapshot.sessionGenerations) && snapshot.sessionGenerations.length > 0,
            }
            : snapshot.creationFlowState

        return JSON.stringify({
            ...snapshot,
            creationFlowState: normalizedCreationFlowState,
        })
    }, [])

    const persistGenerationImage = useCallback(async (generation: Generation) => {
        const originalImageUrl = typeof generation.original_image_url === 'string' ? generation.original_image_url.trim() : ''
        const previewImageUrl = typeof generation.preview_image_url === 'string' ? generation.preview_image_url.trim() : ''
        const currentImageUrl = typeof generation.image_url === 'string' ? generation.image_url.trim() : ''
        const originalStorageId = typeof generation.original_image_storage_id === 'string' ? generation.original_image_storage_id.trim() : ''
        const legacyStorageId = typeof generation.image_storage_id === 'string' ? generation.image_storage_id.trim() : ''
        const previewStorageId = typeof generation.preview_image_storage_id === 'string' ? generation.preview_image_storage_id.trim() : ''

        if ((originalStorageId || legacyStorageId) && previewStorageId) return null

        const sourceImage = originalImageUrl || currentImageUrl || previewImageUrl || originalStorageId || legacyStorageId
        if (!sourceImage) return null

        const needsPersistence =
            sourceImage.startsWith('data:') ||
            sourceImage.startsWith('http://') ||
            sourceImage.startsWith('https://') ||
            /^[a-z0-9]{20,}$/i.test(sourceImage)

        if (!needsPersistence) return null

        const cached = persistedSessionImageCacheRef.current.get(generation.id)
        if (cached) return cached

        const inFlight = persistImageInFlightRef.current.get(generation.id)
        if (inFlight) return await inFlight

        const task = (async () => {
            const response = await fetch('/api/work-sessions/persist-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: sourceImage }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: t('sessions.persistImageError', { defaultValue: 'Could not persist the session image' }) }))
                throw new Error(errorData.error || t('sessions.persistImageError', { defaultValue: 'Could not persist the session image' }))
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
                throw new Error('Persistencia de imagen incompleta')
            }
            const persisted = {
                storageId: data.storageId,
                imageUrl: data.imageUrl,
                originalStorageId: data.originalStorageId,
                originalImageUrl: data.originalImageUrl,
                previewStorageId: data.previewStorageId,
                previewImageUrl: data.previewImageUrl,
            }
            persistedSessionImageCacheRef.current.set(generation.id, persisted)
            return persisted
        })()

        persistImageInFlightRef.current.set(generation.id, task)
        try {
            return await task
        } finally {
            persistImageInFlightRef.current.delete(generation.id)
        }
    }, [])

    const materializeGenerationsForSnapshot = useCallback(async (generations: Generation[]) => {
        const updated = await Promise.all(generations.map(async (generation) => {
            try {
                const persisted = await persistGenerationImage(generation)
                if (!persisted) return generation
                return {
                    ...generation,
                    image_storage_id: persisted.originalStorageId,
                    image_url: persisted.previewImageUrl,
                    preview_image_storage_id: persisted.previewStorageId,
                    preview_image_url: persisted.previewImageUrl,
                    original_image_storage_id: persisted.originalStorageId,
                    original_image_url: persisted.originalImageUrl,
                }
            } catch (error) {
                console.error('Session image persist failed:', error)
                return generation
            }
        }))
        return updated
    }, [persistGenerationImage])

    const restoreWorkspaceFromSnapshot = useCallback((snapshot: ImageWorkspaceSnapshot) => {
        setIsHydratingSession(true)
        try {
            if (snapshot.creationFlowState && typeof snapshot.creationFlowState === 'object') {
                creationFlow.loadPreset(snapshot.creationFlowState)
            }
            updatePromptDraft(snapshot.promptValue || '')
            setEditPrompt(snapshot.editPrompt || '')
            setLogoInclusion(typeof snapshot.logoInclusion === 'boolean' ? snapshot.logoInclusion : true)
            setCompositionMode(snapshot.compositionMode === 'advanced' ? 'advanced' : 'basic')
            setSelectedContext(Array.isArray(snapshot.selectedContext) ? snapshot.selectedContext : [])
            setSessionGenerations(
                Array.isArray(snapshot.sessionGenerations)
                    ? snapshot.sessionGenerations.filter((item) => {
                        if (!item || typeof item !== 'object') return false
                        const row = item as Generation
                        return Boolean(row.image_url || row.image_storage_id)
                    })
                    : []
            )
            setSessionRootPrompt(normalizePromptForSession(snapshot.rootPrompt || snapshot.promptValue))
            const restoredSignature = snapshot.usedBrandId
                ? {
                    brandId: snapshot.usedBrandId,
                    contextDocumentId: snapshot.usedContextDocumentId ?? null,
                }
                : null
            const hasLegacyAnalysis = Boolean(
                Array.isArray(snapshot.sessionGenerations) && snapshot.sessionGenerations.length > 0,
            ) || Boolean(
                snapshot.creationFlowState &&
                typeof snapshot.creationFlowState === 'object' &&
                (snapshot.creationFlowState as { selectedIntent?: unknown }).selectedIntent,
            )
            usedContextSignatureRef.current = restoredSignature
            setUsedContextSignature(restoredSignature)
            setContextChangedSinceAnalysis(
                snapshot.contextChangedSinceAnalysis === true ||
                (!restoredSignature && hasLegacyAnalysis && currentContextSignatureRef.current.contextDocumentId !== null),
            )
        } finally {
            window.setTimeout(() => setIsHydratingSession(false), 0)
        }
    }, [creationFlow, normalizePromptForSession, updatePromptDraft])

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

    const resetImageDraft = useCallback((initialPrompt = '') => {
        creationFlow.reset()
        setSessionGenerations([])
        setDebugPromptData(null)
        setSelectedContext([])
        setEditPrompt('')
        setPendingRetryRequest(null)
        setLastGenerationRequest(null)
        updatePromptDraft(initialPrompt)
        setSessionRootPrompt(null)
        setAuditFlowId(null)
        auditFlowIdRef.current = null
        setCurrentSessionId(null)
        setSelectedSessionToLoad('')
        setSessionSavedAt(null)
        setSessionSaveError(null)
        pendingBaselineResetRef.current = true
        setHasUnsavedChanges(false)
    }, [creationFlow, updatePromptDraft])

    const createNewImageSession = useCallback(async (
        initialPrompt?: string,
        silent = false,
        options?: { skipUnsavedConfirm?: boolean; persist?: boolean }
    ) => {
        if (!user?.id || !scopedBrandId) return null
        if (createSessionInFlightRef.current) return null
        if (!options?.skipUnsavedConfirm && !await confirmDiscardUnsavedChanges(t('sessions.actions.createNew', { defaultValue: 'create a new session' }))) return null
        createSessionInFlightRef.current = true
        setIsCreatingSession(true)

        try {
            const prompt = initialPrompt ?? ''
            const normalizedPrompt = normalizePromptForSession(prompt)
            resetImageDraft(prompt)

            if (!options?.persist) {
                if (!silent) {
                    toast({
                        title: t('sessions.newTitle'),
                        description: t('sessions.newDraftDescription'),
                    })
                }
                return null
            }

            setSessionRootPrompt(normalizedPrompt)
            const draftSnapshot = buildWorkspaceSnapshot(normalizedPrompt)

            const created = await createWorkSession({
                user_id: user.id,
                module: 'image',
                brand_id: scopedBrandId,
                title: buildAutoSessionTitle(prompt),
                title_customized: false,
                root_prompt: normalizedPrompt || undefined,
                snapshot: draftSnapshot,
            })

            const newId = String(created.session_id)
            setCurrentSessionId(newId)
            setSelectedSessionToLoad(newId)
            lastSavedSnapshotSignatureRef.current = buildWorkspaceChangeSignature(draftSnapshot)
            setHasUnsavedChanges(false)

            if (!silent) {
                toast({
                    title: t('sessions.newTitle'),
                    description: t('sessions.newStartedDescription'),
                })
            }
            return newId
        } finally {
            createSessionInFlightRef.current = false
            setIsCreatingSession(false)
        }
    }, [user?.id, scopedBrandId, normalizePromptForSession, resetImageDraft, createWorkSession, toast, buildAutoSessionTitle, confirmDiscardUnsavedChanges, buildWorkspaceSnapshot, buildWorkspaceChangeSignature, t])

    const handleLoadSession = useCallback(async (
        sessionId: string,
        options?: { skipUnsavedConfirm?: boolean }
    ) => {
        if (!sessionId || !user?.id) return false
        if (!options?.skipUnsavedConfirm && !await confirmDiscardUnsavedChanges(t('sessions.actions.switchSession', { defaultValue: 'switch sessions' }))) return false
        const activated = await activateWorkSession({
            user_id: user.id,
            session_id: sessionId as Id<'work_sessions'>,
        })
        if (activated?.snapshot) {
            pendingBaselineResetRef.current = true
            restoreWorkspaceFromSnapshot(activated.snapshot as ImageWorkspaceSnapshot)
        }
        setCurrentSessionId(String(activated?._id || sessionId))
        setSelectedSessionToLoad(String(activated?._id || sessionId))
        setSessionRootPrompt(normalizePromptForSession(activated?.root_prompt))
        setHasUnsavedChanges(false)
        return true
    }, [user?.id, activateWorkSession, restoreWorkspaceFromSnapshot, normalizePromptForSession, confirmDiscardUnsavedChanges])

    const handleDeleteCurrentSession = useCallback(async () => {
        if (!user?.id || !currentSessionId) return
        const decision = await openSessionDecisionModal({
            title: t('sessions.deleteTitle'),
            description: t('sessions.deleteDescription'),
            buttons: [
                { id: 'cancel', label: t('common:actions.cancel'), variant: 'outline' },
                { id: 'delete', label: t('sessions.deleteConfirm'), variant: 'destructive' },
            ],
        })
        if (decision !== 'delete') return

        const result = await deleteWorkSession({
            user_id: user.id,
            session_id: currentSessionId as Id<'work_sessions'>,
        })

        if (result?.next_session_id) {
            await handleLoadSession(String(result.next_session_id), { skipUnsavedConfirm: true })
        } else {
            await createNewImageSession('', true, { skipUnsavedConfirm: true })
        }

        toast({
            title: t('sessions.deletedTitle'),
            description: t('sessions.deletedDescription'),
        })
    }, [user?.id, currentSessionId, openSessionDecisionModal, deleteWorkSession, handleLoadSession, createNewImageSession, toast, t])

    const handleClearAllSessions = useCallback(async () => {
        if (!user?.id || !scopedBrandId) return
        const decision = await openSessionDecisionModal({
            title: t('sessions.clearTitle'),
            description: t('sessions.clearDescription'),
            buttons: [
                { id: 'cancel', label: t('common:actions.cancel'), variant: 'outline' },
                { id: 'clear', label: t('sessions.clearConfirm'), variant: 'destructive' },
            ],
        })
        if (decision !== 'clear') return

        await clearWorkSessions({
            user_id: user.id,
            module: 'image',
            brand_id: scopedBrandId,
        })

        await createNewImageSession('', true, { skipUnsavedConfirm: true })
        toast({
            title: t('sessions.clearedTitle'),
            description: t('sessions.clearedDescription'),
        })
    }, [user?.id, scopedBrandId, openSessionDecisionModal, clearWorkSessions, createNewImageSession, toast, t])

    // Hydrate one session per scope (user + module + brand kit).
    useEffect(() => {
        const scopeKey = `${user?.id || 'anon'}::image::${scopedBrandId || 'no-brand'}`
        if (hydrationScopeRef.current !== scopeKey) {
            if (baselineResetTimeoutRef.current !== null) {
                window.clearTimeout(baselineResetTimeoutRef.current)
                baselineResetTimeoutRef.current = null
            }
            pendingBaselineResetRef.current = false
            hydrationScopeRef.current = scopeKey
            hasHydratedScopeRef.current = false
            lastSavedSnapshotSignatureRef.current = null
            setCurrentSessionId(null)
            setSelectedSessionToLoad('')
            setSessionRootPrompt(null)
            setSessionSavedAt(null)
            setSessionSaveError(null)
            setHasUnsavedChanges(false)
            // Cambio de marca = escenario nuevo: no debe pervivir el historial de
            // imagenes de la marca anterior mientras se hidrata (o si la nueva
            // marca no tiene sesion todavia, en cuyo caso quedaria visible).
            setSessionGenerations([])
        }

        if (!user?.id || !scopedBrandId) return
        if (activeWorkSession === undefined) return
        if (hasHydratedScopeRef.current) return

        const hasIncoming = typeof window !== 'undefined' && !!sessionStorage.getItem(INCOMING_PROMPT_FLAG_STORAGE_KEY)
        if (hasIncoming) sessionStorage.removeItem(INCOMING_PROMPT_FLAG_STORAGE_KEY)
        if (activeWorkSession?.snapshot && !hasIncoming) {
            pendingBaselineResetRef.current = true
            restoreWorkspaceFromSnapshot(activeWorkSession.snapshot as ImageWorkspaceSnapshot)
            setCurrentSessionId(String(activeWorkSession._id))
            setSelectedSessionToLoad(String(activeWorkSession._id))
            setSessionRootPrompt(normalizePromptForSession(activeWorkSession.root_prompt))
            setHasUnsavedChanges(false)
            hasHydratedScopeRef.current = true
            return
        }

        hasHydratedScopeRef.current = true
        pendingBaselineResetRef.current = true
        setHasUnsavedChanges(false)
    }, [
        user?.id,
        scopedBrandId,
        activeWorkSession,
        restoreWorkspaceFromSnapshot,
        normalizePromptForSession
    ])

    const persistImageWorkspaceSnapshot = useCallback(async (options?: {
        silent?: boolean
        markSavedAt?: boolean
        force?: boolean
        titleOverride?: string
        titleCustomized?: boolean
    }) => {
        if (!user?.id || !scopedBrandId) return
        const isSilent = options?.silent === true
        const shouldMarkSavedAt = options?.markSavedAt !== false
        const forcePersist = options?.force === true

        if (!isSilent) {
            setIsSavingSession(true)
            setSessionSaveError(null)
        }
        try {
            const persistedGenerations = await materializeGenerationsForSnapshot(sessionGenerations)
            const hasPersistedChanges = persistedGenerations.some((generation, index) => (
                generation.image_storage_id !== sessionGenerations[index]?.image_storage_id ||
                generation.image_url !== sessionGenerations[index]?.image_url ||
                generation.preview_image_storage_id !== sessionGenerations[index]?.preview_image_storage_id ||
                generation.preview_image_url !== sessionGenerations[index]?.preview_image_url ||
                generation.original_image_storage_id !== sessionGenerations[index]?.original_image_storage_id ||
                generation.original_image_url !== sessionGenerations[index]?.original_image_url
            ))
            if (hasPersistedChanges) {
                setSessionGenerations(persistedGenerations)
            }

            const snapshot = buildWorkspaceSnapshot(undefined, persistedGenerations)
            const snapshotSignature = buildWorkspaceChangeSignature(snapshot)
            if (!forcePersist && lastSavedSnapshotSignatureRef.current === snapshotSignature) {
                if (shouldMarkSavedAt) {
                    setSessionSavedAt(new Date().toISOString())
                }
                return
            }

            const result = await upsertWorkSession({
                user_id: user.id,
                module: 'image',
                brand_id: scopedBrandId,
                session_id: currentSessionId ? (currentSessionId as Id<'work_sessions'>) : undefined,
                title: options?.titleOverride ?? buildAutoSessionTitle(snapshot.promptValue || t('sessions.imageSessionTitle', { defaultValue: 'Image session' })),
                title_customized: options?.titleCustomized,
                root_prompt: normalizePromptForSession(snapshot.rootPrompt || snapshot.promptValue) || undefined,
                snapshot,
            })
            const id = String(result.session_id)
            if (!currentSessionId) {
                setCurrentSessionId(id)
                setSelectedSessionToLoad(id)
            }
            lastSavedSnapshotSignatureRef.current = snapshotSignature
            setHasUnsavedChanges(false)
            if (shouldMarkSavedAt) {
                setSessionSavedAt(new Date().toISOString())
            }
        } catch (error) {
            if (!isSilent) {
                setSessionSaveError(error instanceof Error ? error.message : t('sessions.saveError', { defaultValue: 'Could not save' }))
            }
            throw error
        } finally {
            if (!isSilent) {
                setIsSavingSession(false)
            }
        }
    }, [
        user?.id,
        scopedBrandId,
        sessionGenerations,
        buildWorkspaceSnapshot,
        materializeGenerationsForSnapshot,
        upsertWorkSession,
        currentSessionId,
        buildAutoSessionTitle,
        normalizePromptForSession
    ])

    const ensureImageSessionForAnalyze = useCallback(async (normalizedPrompt: string | null) => {
        if (!user?.id || !scopedBrandId || currentSessionId) return currentSessionId

        const draftSnapshot = buildWorkspaceSnapshot(normalizedPrompt)
        const created = await createWorkSession({
            user_id: user.id,
            module: 'image',
            brand_id: scopedBrandId,
            title: buildAutoSessionTitle(promptValue || t('sessions.imageSessionTitle', { defaultValue: 'Image session' })),
            title_customized: false,
            root_prompt: normalizedPrompt || undefined,
            snapshot: draftSnapshot,
        })

        const sessionId = String(created.session_id)
        setCurrentSessionId(sessionId)
        setSelectedSessionToLoad(sessionId)
        setSessionRootPrompt(normalizedPrompt)
        lastSavedSnapshotSignatureRef.current = buildWorkspaceChangeSignature(draftSnapshot)
        setHasUnsavedChanges(false)
        return sessionId
    }, [user?.id, scopedBrandId, currentSessionId, buildWorkspaceSnapshot, createWorkSession, buildAutoSessionTitle, promptValue, buildWorkspaceChangeSignature])

    const handleSaveSessionNow = useCallback(async () => {
        if (!user?.id || !scopedBrandId || isHydratingSession) return
        try {
            if (activeSessionMeta?.title_customized !== true) {
                const suggestedTitle = buildDisplaySessionTitle(
                    activeSessionMeta?.title || promptValue || t('sessions.imageSessionTitle', { defaultValue: 'Image session' }),
                    Boolean(activeSessionMeta?.title_customized)
                )
                const selectedTitle = await openSessionTitleDialog(suggestedTitle)
                if (!selectedTitle) return
                await persistImageWorkspaceSnapshot({
                    silent: false,
                    markSavedAt: true,
                    force: true,
                    titleOverride: buildCustomSessionTitle(selectedTitle),
                    titleCustomized: true,
                })
                return
            }
            await persistImageWorkspaceSnapshot({
                silent: false,
                markSavedAt: true,
                force: true,
            })
        } catch (error) {
            console.error('Manual save session failed:', error)
        }
    }, [user?.id, scopedBrandId, isHydratingSession, activeSessionMeta, buildDisplaySessionTitle, openSessionTitleDialog, persistImageWorkspaceSnapshot, promptValue, buildCustomSessionTitle, t])
    const handleRenameCurrentSession = useCallback(async () => {
        if (!user?.id || !scopedBrandId || isHydratingSession || !currentSessionId) return
        const suggestedTitle = buildDisplaySessionTitle(
            activeSessionMeta?.title || promptValue || t('sessions.imageSessionTitle', { defaultValue: 'Image session' }),
            Boolean(activeSessionMeta?.title_customized)
        )
        const selectedTitle = await openSessionTitleDialog(suggestedTitle)
        if (!selectedTitle) return
        try {
            await persistImageWorkspaceSnapshot({
                silent: false,
                markSavedAt: true,
                force: true,
                titleOverride: buildCustomSessionTitle(selectedTitle),
                titleCustomized: true,
            })
        } catch (error) {
            console.error('Rename session failed:', error)
        }
    }, [user?.id, scopedBrandId, isHydratingSession, currentSessionId, activeSessionMeta, buildDisplaySessionTitle, openSessionTitleDialog, persistImageWorkspaceSnapshot, promptValue, buildCustomSessionTitle, t])

    const workspaceSignature = useMemo(() => {
        return buildWorkspaceChangeSignature(buildWorkspaceSnapshot())
    }, [buildWorkspaceSnapshot, buildWorkspaceChangeSignature])

    useEffect(() => {
        if (!hasHydratedScopeRef.current || isHydratingSession) return
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
    }, [workspaceSignature, isHydratingSession, scheduleBaselineReset])

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
            await persistImageWorkspaceSnapshot({
                silent: false,
                markSavedAt: true,
                force: true,
            })
            continuePendingNavigation()
        } catch (error) {
            console.error('Save before navigation failed:', error)
        } finally {
            setIsResolvingUnsavedNavigation(false)
            setPendingNavigationTarget(null)
        }
    }, [pendingNavigationTarget, persistImageWorkspaceSnapshot, continuePendingNavigation])

    const handleUnsavedNavigateCancel = useCallback(() => {
        setUnsavedNavModalOpen(false)
        setPendingNavigationTarget(null)
    }, [])

    // Reset Studio when Brand Kit changes
    useEffect(() => {
        if (activeBrandKit?.id) {
            setSelectedContext([])
            creationFlow.reset()
            setDebugPromptData(null)
            const restoredPrompt = resolveDraftPromptAfterBrandReset(incomingPromptRef.current || pendingIncomingPrompt)
            setPromptValue(restoredPrompt)
            creationFlow.setRawMessage(restoredPrompt)
            setCompositionMode('basic')
            basicLayoutCursorByIntentRef.current = {}
            setPendingRetryRequest(null)
            setLastGenerationRequest(null)
        }
    }, [activeBrandKit?.id]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const previous = lastCompositionModeRef.current
        lastCompositionModeRef.current = compositionMode
        if (previous === 'advanced' || compositionMode !== 'advanced') return

        const intentId = creationFlow.state.selectedIntent
        const intentLayouts = intentId ? LAYOUTS_BY_INTENT[intentId] || [] : []
        const libreFromIntent = intentLayouts.find(layout =>
            (layout.name || '').trim().toLowerCase() === 'libre'
        )
        const fallbackLibre = ALL_IMAGE_LAYOUTS.find(layout =>
            (layout.name || '').trim().toLowerCase() === 'libre'
        )
        const libreLayoutId = (libreFromIntent || fallbackLibre)?.id
        if (!libreLayoutId) return

        creationFlow.selectLayout(libreLayoutId)
    }, [compositionMode, creationFlow.state.selectedIntent, creationFlow])

    const getNextBasicLayoutId = useCallback((intent: IntentCategory, previousLayoutId?: string | null) => {
        const layoutsForIntent = LAYOUTS_BY_INTENT[intent] || []
        if (!layoutsForIntent.length) return null

        const currentCursor = basicLayoutCursorByIntentRef.current[intent] ?? 0
        let nextCursor = currentCursor % layoutsForIntent.length

        if (
            previousLayoutId &&
            layoutsForIntent.length > 1 &&
            layoutsForIntent[nextCursor]?.id === previousLayoutId
        ) {
            nextCursor = (nextCursor + 1) % layoutsForIntent.length
        }

        basicLayoutCursorByIntentRef.current[intent] = (nextCursor + 1) % layoutsForIntent.length
        return layoutsForIntent[nextCursor]?.id ?? null
    }, [])

    const executeGenerationRequest = async (
        requestPayload: Record<string, unknown>,
        errorTitle: string,
        errorFallback: string,
        signal?: AbortSignal
    ) => {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload),
            signal,
        })

        if (response.ok) {
            const result = await response.json()
            creationFlow.setGeneratedImage(result.imageUrl)

            setSessionGenerations(prev => [{
                id: Date.now().toString(),
                image_url: result.imageUrl,
                preview_image_url: result.imageUrl,
                original_image_url: result.imageUrl,
                created_at: new Date().toISOString(),
                prompt_used: typeof requestPayload.prompt === 'string' ? requestPayload.prompt : '',
                caption: creationFlow.state.caption,
                headline: creationFlow.state.headline,
                cta: creationFlow.state.cta,
                platform: creationFlow.state.selectedPlatform || undefined,
                format: creationFlow.state.selectedFormat || undefined,
                request_payload: { ...requestPayload },
                error_title: errorTitle,
                error_fallback: errorFallback
            }, ...prev].slice(0, 80))
            return
        }

        const errorData = await response.json().catch(() => ({ error: errorFallback }))
        toast({
            title: errorTitle,
            description: errorData.error || errorFallback,
            variant: "destructive",
        })
    }

    const buildFinalModelPrompt = (requestPayload: Record<string, unknown>): string => {
        const requestPrompt = typeof requestPayload.prompt === 'string' ? requestPayload.prompt : ''
        if (!requestPrompt) return ''

        if (requestPayload.promptAlreadyBuilt === true) {
            return requestPrompt
        }

        const brandDNA = requestPayload.brandDNA as BrandDNA | undefined
        if (!brandDNA) return requestPrompt

        return buildImagePrompt(
            { name: brandDNA.brand_name || 'Brand', brand_dna: brandDNA },
            requestPrompt,
            {
                headline: typeof requestPayload.headline === 'string' ? requestPayload.headline : undefined,
                cta: typeof requestPayload.cta === 'string' ? requestPayload.cta : undefined,
                platform: requestPayload.platform as 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | undefined,
                context: Array.isArray(requestPayload.context) ? requestPayload.context as any[] : [],
                model: typeof requestPayload.model === 'string' ? requestPayload.model : undefined,
                layoutReference: typeof requestPayload.layoutReference === 'string' ? requestPayload.layoutReference : undefined,
                aspectRatio: typeof requestPayload.aspectRatio === 'string' ? requestPayload.aspectRatio : undefined,
                selectedStyles: Array.isArray(requestPayload.selectedStyles)
                    ? requestPayload.selectedStyles.filter((item): item is string => typeof item === 'string')
                    : [],
                customStyle: typeof requestPayload.customStyle === 'string' ? requestPayload.customStyle : undefined,
                applyStyleToTypography: requestPayload.applyStyleToTypography === true,
                styleAnalysisKeywords: Array.isArray(requestPayload.styleAnalysisKeywords)
                    ? requestPayload.styleAnalysisKeywords.filter((item): item is string => typeof item === 'string')
                    : [],
                styleAnalysisSubject: typeof requestPayload.styleAnalysisSubject === 'string'
                    ? requestPayload.styleAnalysisSubject
                    : undefined,
                selectedColors: Array.isArray(requestPayload.selectedColors)
                    ? requestPayload.selectedColors as Array<{ color: string; role: string } | string>
                    : []
            }
        )
    }

    const buildGenerationRequestPayload = (data: {
        platform?: string
        headline?: string
        cta?: string
        prompt: string
        model?: string
        promptAlreadyBuilt?: boolean
        forcedLayoutId?: string
        auditFlowId?: string
    }) => {
        if (!activeBrandKit) return null

        const selectedImages = (activeBrandKit.images || [])
            .filter(img => img.selected !== false)
            .map(img => img.url)

        const finalContext: ContextElement[] = [...selectedContext]
        const styleReferenceImages: string[] = []
        const debugContextItems: DebugContextItem[] = []
        const activeBrandKitAssets = [...(activeBrandKit.images || []), ...(activeBrandKit.logos || [])]
        const resolveBrandKitAssetUrl = (value: string) => {
            if (!value) return ''
            if (
                value.startsWith('http://')
                || value.startsWith('https://')
                || value.startsWith('data:')
                || value.startsWith('blob:')
            ) {
                return value
            }
            const match = activeBrandKitAssets.find((asset: any) =>
                asset?.id === value
                || asset?._id === value
                || asset?.image_id === value
                || asset?.storage_id === value
            )
            return (match?.url || value) as string
        }
        const normalizeRole = (role?: string) => {
            if (role === 'aux_logo' || role === 'primary_logo') return 'logo'
            if (role === 'style' || role === 'style_content' || role === 'logo' || role === 'content') return role
            return 'content'
        }
        const getReferenceRole = (imageId: string) => {
            const directRole = creationFlow.state.referenceImageRoles?.[imageId]
            if (directRole) return normalizeRole(directRole)
            const resolvedUrl = resolveBrandKitAssetUrl(imageId)
            return normalizeRole(creationFlow.state.referenceImageRoles?.[resolvedUrl])
        }
        const isStyleRole = (role: string) => role === 'style' || role === 'style_content'
        const contextTypeFromRole = (role: string): ContextType => role === 'logo' ? 'aux_logo' : 'image'
        const hasDebugItem = (url: string, role?: DebugContextItem['role']) =>
            debugContextItems.some((item) => item.url === url && item.role === role)
        const addDebugItem = (item: DebugContextItem) => {
            if (hasDebugItem(item.url, item.role)) return
            debugContextItems.push(item)
        }

        if (creationFlow.state.uploadedImages.length > 0) {
            creationFlow.state.uploadedImages.forEach((imgUrl, idx) => {
                const role = getReferenceRole(imgUrl)
                if (isStyleRole(role)) styleReferenceImages.push(imgUrl)
                addDebugItem({
                    id: `debug-upload-${idx}`,
                    type: contextTypeFromRole(role),
                    label: role === 'logo'
                        ? t('common:auxLogos.uploadedAlt', { index: idx + 1, defaultValue: 'Uploaded auxiliary logo {{index}}' })
                        : t('image:preview.contextLabel', { index: idx + 1, defaultValue: 'Context {{index}}' }),
                    url: imgUrl,
                    source: 'upload',
                    role: role as DebugContextItem['role'],
                })
                if (role === 'style') return

                const hasImg = finalContext.some(c => c.id === `flow-upload-${idx}`)
                if (!hasImg) {
                    finalContext.push({
                        id: `flow-upload-${idx}`,
                        type: contextTypeFromRole(role),
                        value: imgUrl,
                        label: role === 'logo'
                            ? t('common:auxLogos.uploadedAlt', { index: idx + 1, defaultValue: 'Uploaded auxiliary logo {{index}}' })
                            : t('image:preview.contextLabel', { index: idx + 1, defaultValue: 'Context {{index}}' })
                    })
                }
            })
        }

        if (creationFlow.state.selectedBrandKitImageIds.length > 0) {
            creationFlow.state.selectedBrandKitImageIds.forEach((rawImageIdOrUrl, idx) => {
                const imgUrl = resolveBrandKitAssetUrl(rawImageIdOrUrl)
                const role = getReferenceRole(rawImageIdOrUrl)
                if (isStyleRole(role)) styleReferenceImages.push(imgUrl)
                addDebugItem({
                    id: `debug-brandkit-${idx}`,
                    type: contextTypeFromRole(role),
                    label: role === 'logo'
                        ? t('common:auxLogos.brandKitAssetAlt', { defaultValue: 'Brand Kit auxiliary asset' })
                        : t('common:contentImage.brandKitImageAlt', { defaultValue: 'Brand Kit image' }),
                    url: imgUrl,
                    source: 'brandkit',
                    role: role as DebugContextItem['role'],
                })
                if (role === 'style') return

                const hasImg = finalContext.some(c => c.id === `flow-brandkit-${idx}`)
                if (!hasImg) {
                    finalContext.push({
                        id: `flow-brandkit-${idx}`,
                        type: contextTypeFromRole(role),
                        value: imgUrl,
                        label: role === 'logo'
                            ? t('common:auxLogos.brandKitAssetAlt', { defaultValue: 'Brand Kit auxiliary asset' })
                            : t('common:contentImage.brandKitImageAlt', { defaultValue: 'Brand Kit image' })
                    })
                }
            })
        }

        if (logoInclusion && creationFlow.state.selectedLogoId) {
            const logo = activeBrandKit.logos?.find((l, idx) => {
                if (typeof l !== 'string') {
                    if ((l as any).id === creationFlow.state.selectedLogoId) return true
                    if ((l as any)._id === creationFlow.state.selectedLogoId) return true
                }
                return `logo-${idx}` === creationFlow.state.selectedLogoId
            })
            const logoUrl = typeof logo === 'string' ? logo : logo?.url || null
            if (logoUrl) {
                const hasLogo = finalContext.some(c => c.type === 'logo')
                if (!hasLogo) {
                    finalContext.push({
                        id: 'flow-logo',
                        type: 'logo',
                        value: logoUrl,
                        label: t('common:brandDnaPanel.logoBadge', { defaultValue: 'Logo' })
                    })
                }
                addDebugItem({
                    id: 'debug-primary-logo',
                    type: 'logo',
                    label: t('common:visualAssets.mainLogo', { defaultValue: 'Main logo' }),
                    url: logoUrl,
                    source: 'system',
                    role: 'primary_logo',
                })
            }
        }

        if (creationFlow.state.generatedImage) {
            const hasReference = finalContext.some(c => c.id === 'edit-reference')
            if (!hasReference) {
                finalContext.push({
                    id: 'edit-reference',
                    type: 'image',
                    value: creationFlow.state.generatedImage,
                    label: t('preview.currentImage', { defaultValue: 'Current image' })
                })
            }
            addDebugItem({
                id: 'debug-generated-reference',
                type: 'image',
                label: t('preview.currentImage', { defaultValue: 'Current image' }),
                url: creationFlow.state.generatedImage,
                source: 'generated',
                role: 'generated',
            })
        }

        const effectivePrompt = data.promptAlreadyBuilt
            ? data.prompt
            : (creationFlow.state.generatedImage ? buildEditPrompt(data.prompt) : data.prompt)

        const effectiveLayoutId = data.forcedLayoutId || creationFlow.state.selectedLayout
        const effectiveLayoutMeta = ALL_IMAGE_LAYOUTS.find((l) => l.id === effectiveLayoutId)
        const activeStyleAnalysis = creationFlow.state.firstVisionAnalysis ?? creationFlow.state.visionAnalysis ?? null
        const compositionSkill = effectiveLayoutMeta?.skillVersion
            ? {
                name: 'composiciones',
                version: effectiveLayoutMeta.skillVersion,
                layoutId: effectiveLayoutMeta.id,
            }
            : undefined

        const requestPayload = {
            ...data,
            prompt: effectivePrompt,
            promptAlreadyBuilt: Boolean(data.promptAlreadyBuilt),
            brandDNA: {
                ...activeBrandKit,
                images: selectedImages
            },
            logoInclusion,
            context: finalContext,
            model: data.model || creationFlow.state.selectedImageModel || aiConfig?.imageModel,
            layoutId: effectiveLayoutMeta?.id,
            layoutName: effectiveLayoutMeta?.name,
            layoutSkillVersion: effectiveLayoutMeta?.skillVersion,
            compositionSkill,
            layoutReference: effectiveLayoutMeta?.referenceImage,
            aspectRatio: SOCIAL_FORMATS.find(f => f.id === creationFlow.state.selectedFormat)?.aspectRatio,
            selectedStyles: creationFlow.state.selectedStyles,
            customStyle: creationFlow.state.customStyle,
            applyStyleToTypography: creationFlow.state.applyStyleToTypography,
            styleAnalysisKeywords: Array.isArray(activeStyleAnalysis?.keywords) ? activeStyleAnalysis.keywords : [],
            styleAnalysisSubject: typeof activeStyleAnalysis?.subjectLabel === 'string' ? activeStyleAnalysis.subjectLabel : undefined,
            selectedColors: creationFlow.state.selectedBrandColors,
            auditFlowId: data.auditFlowId
        } as Record<string, unknown>

        return {
            requestPayload,
            styleReferenceImage: styleReferenceImages[0],
            attachedImages: finalContext
                .filter((item) => item.type === 'image' || item.type === 'logo' || item.type === 'aux_logo')
                .map((item) => item.value),
            debugContextItems,
        }
    }

    const handleNewBrandKit = () => {
        router.push('/brand-kit/new')
    }

    const isAbortError = useCallback((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return true
        if (error instanceof Error && error.name === 'AbortError') return true
        return false
    }, [])

    const beginGenerationRequest = useCallback(() => {
        generationAbortControllerRef.current?.abort()
        const controller = new AbortController()
        generationAbortControllerRef.current = controller
        cancelAnalyzeRef.current = false
        setIsCancelingGenerate(false)
        return controller
    }, [])

    const clearGenerationController = useCallback((controller?: AbortController | null) => {
        if (controller && generationAbortControllerRef.current === controller) {
            generationAbortControllerRef.current = null
        }
    }, [])

    // Inspire: generate a prompt idea for the user
    const handleInspire = async () => {
        const brandId = activeBrandKit?.id as string | undefined
        if (!brandId || isInspiring) return
        setIsInspiring(true)
        try {
            const res = await fetch('/api/generate-user-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ module: 'image', brandKitId: brandId }),
            })
            const data = await res.json()
            if (data.success && data.text) {
                updatePromptDraft(data.text)
            }
        } catch (err) {
            console.error('Failed to generate prompt inspiration:', err)
        } finally {
            setIsInspiring(false)
        }
    }

    // Smart analyze prompt
    const handleSmartAnalyze = async (autoModel?: string) => {
        if (!promptValue.trim()) return null
        if (smartAnalyzeInFlightRef.current) return null

        smartAnalyzeInFlightRef.current = true
        cancelAnalyzeRef.current = false
        setIsMagicParsing(true)
        setIsCancelingAnalyze(false)
        setHighlightedFields(new Set())

        try {
            if (!activeBrandKit?.id) {
                throw new Error('Brand Kit required')
            }
            if (contextDocuments.isLoading) {
                throw new Error('Context documents are still loading')
            }
            const normalizedPrompt = normalizePromptForSession(promptValue)
            if (normalizedPrompt && sessionRootPrompt && normalizedPrompt !== sessionRootPrompt) {
                const decision = await openSessionDecisionModal({
                    title: t('sessions.newIdeaTitle', { defaultValue: 'This prompt looks like a new idea' }),
                    description: t('sessions.newIdeaDescription', { defaultValue: 'You can open a new session to keep this work separate, or stay in the current session and update its main idea.' }),
                    buttons: [
                        { id: 'cancel', label: t('common:actions.cancel', { defaultValue: 'Cancel' }), variant: 'outline' },
                        { id: 'keep', label: t('sessions.keepCurrent', { defaultValue: 'Stay in this session' }), variant: 'default' },
                        { id: 'new', label: t('sessions.createNew', { defaultValue: 'Create new session' }), variant: 'default' },
                    ],
                })
                if (decision === 'cancel' || decision === null) {
                    return null
                }
                if (decision === 'new') {
                    await createNewImageSession(promptValue, true, { skipUnsavedConfirm: true })
                } else {
                    setSessionRootPrompt(normalizedPrompt)
                }
            } else if (normalizedPrompt && !sessionRootPrompt) {
                setSessionRootPrompt(normalizedPrompt)
            }

            await ensureImageSessionForAnalyze(normalizedPrompt)

            const modelToUse = autoModel || aiConfig?.intelligenceModel
            if (!modelToUse) {
                toast({
                    title: t('errors.missingAiConfigTitle'),
                    description: t('errors.missingAiConfigDescription'),
                    variant: "destructive"
                })
                return null
            }

            creationFlow.setRawMessage(promptValue)
            const nextFlowId = auditFlowIdRef.current || `flow_${Date.now()}`
            if (!auditFlowIdRef.current) {
                auditFlowIdRef.current = nextFlowId
                setAuditFlowId(nextFlowId)
            }

            const previewTextContext = [
                creationFlow.state.headline?.trim() ? `HEADLINE: ${creationFlow.state.headline.trim()}` : '',
                creationFlow.state.cta?.trim() ? `CTA: ${creationFlow.state.cta.trim()}` : '',
                (creationFlow.state.ctaUrlEnabled && creationFlow.state.ctaUrl?.trim())
                    ? `URL: ${creationFlow.state.ctaUrl.trim()}`
                    : '',
                ...Object.entries(creationFlow.state.customTexts || {})
                    .map(([key, value]) => {
                        const val = Array.isArray(value) ? value.join(', ') : String(value ?? '')
                        return val.trim() ? `TEXT_${key.toUpperCase()}: ${val.trim()}` : ''
                    })
                    .filter(Boolean),
                ...(creationFlow.state.selectedTextAssets || [])
                    .map((asset) => asset?.value?.trim() ? `ASSET_${asset.label?.toUpperCase() || asset.type}: ${asset.value.trim()}` : '')
                    .filter(Boolean)
            ].filter(Boolean).join('\n')

            const requestedSignature = { ...currentContextSignatureRef.current }
            const result = await parseLazyIntentAction({
                userText: promptValue,
                brandId: String(activeBrandKit.id),
                brandDNA: activeBrandKit,
                brandWebsite: activeBrandKit?.url,
                intelligenceModel: modelToUse,
                intentId: creationFlow.currentIntent?.id,
                layoutId: creationFlow.selectedLayoutMeta?.id,
                variationSeed: Date.now(),
                previewTextContext,
                auditFlowId: nextFlowId
            })

            if (cancelAnalyzeRef.current) {
                return null
            }

            const returnedSignature = result.usedBrandId
                ? {
                    brandId: result.usedBrandId,
                    contextDocumentId: result.usedContextDocumentId ?? null,
                }
                : null
            if (
                !signaturesMatch(requestedSignature, returnedSignature) ||
                !signaturesMatch(returnedSignature, currentContextSignatureRef.current)
            ) {
                setContextChangedSinceAnalysis(true)
                toast({
                    title: t('contextDocuments.reanalysisRequiredTitle'),
                    description: t('contextDocuments.reanalysisRequiredDescription'),
                })
                return null
            }

            if (result.error) {
                toast({
                    title: t('errors.analyzePromptTitle'),
                    description: t('errors.analyzePromptDescription'),
                    variant: "destructive"
                })
                return null
            }

            const newHighlights = new Set<string>()

            // Auto-detect intent
            // IMPORTANT: do not gate this with stale local state checks after async resets/new session creation.
            if (result.detectedIntent) {
                creationFlow.selectIntent(result.detectedIntent as IntentCategory)
                toast({
                    title: t('analysis.intentDetectedTitle'),
                    description: t('analysis.intentDetectedDescription', { intent: result.detectedIntent }),
                })
            }

            // Populate fields
            if (result.headline) {
                creationFlow.setHeadline(result.headline)
                newHighlights.add('headline')
            }
            if (result.cta) {
                creationFlow.setCta(result.cta)
                newHighlights.add('cta')
            }
            if (result.ctaUrl) {
                creationFlow.setCtaUrl(result.ctaUrl)
                newHighlights.add('ctaUrl')
            }
            if (result.caption) {
                creationFlow.setCaption(result.caption)
                newHighlights.add('caption')
            }

            // Process imageTexts (secondary text layers for preview)
            const aiAssets: TextAsset[] = []
            const seenValues = new Set<string>()

            const addAsset = (label: string, value: string, type?: TextAsset['type']) => {
                const cleanValue = value.trim()
                if (!cleanValue) return
                if (seenValues.has(cleanValue.toLowerCase())) return
                seenValues.add(cleanValue.toLowerCase())
                aiAssets.push({
                    id: `ai-${Date.now()}-${aiAssets.length}`,
                    type: type || 'custom',
                    label: label.trim() || t('common:textLayerEditor.freeTextLabel', { defaultValue: 'Text' }),
                    value: cleanValue
                })
            }

            if (Array.isArray(result.imageTexts)) {
                result.imageTexts.forEach((item) => {
                    if (!item || typeof item !== 'object') return
                    const label = typeof item.label === 'string' ? item.label : t('common:textLayerEditor.freeTextLabel', { defaultValue: 'Text' })
                    const value = typeof item.value === 'string' ? item.value : ''
                    const type = item.type === 'tagline' || item.type === 'hook' ? item.type : 'custom'
                    addAsset(label, value, type)
                })
            } else if (result.imageTexts && typeof result.imageTexts === 'object') {
                Object.entries(result.imageTexts).forEach(([key, value]) => {
                    if (typeof value === 'string') {
                        addAsset(key, value, 'custom')
                    }
                })
            }

            // If parser already returned a consolidated imageTexts block,
            // do not re-expand customTexts into extra layers.
            if (result.customTexts && aiAssets.length === 0) {
                Object.entries(result.customTexts).forEach(([key, value]) => {
                    if (value && typeof value === 'string' && value.trim()) {
                        addAsset(key.replace(/_/g, ' '), value, 'custom')
                    }
                })
            }

            creationFlow.setSelectedTextAssets(aiAssets)

            if (result.suggestions) {
                creationFlow.setSuggestions(result.suggestions)
            } else {
                creationFlow.setSuggestions(undefined)
            }
            if (Array.isArray(result.imagePromptSuggestions)) {
                creationFlow.setImagePromptSuggestions(result.imagePromptSuggestions)
            } else {
                creationFlow.setImagePromptSuggestions([])
            }

            setHighlightedFields(newHighlights)
            setTimeout(() => setHighlightedFields(new Set()), 2500)

            // Reset preview after analysis but keep current selections
            creationFlow.setGeneratedImage(null)

            creationFlow.ensureDefaultFormat(creationFlow.state.selectedPlatform || 'instagram')

            if (shouldRefreshAiImageDescription({
                currentDescription: creationFlow.state.aiImageDescription,
                previousSuggestions: creationFlow.state.imagePromptSuggestions,
            })) {
                const fallbackDescription = Array.isArray(result.imagePromptSuggestions) && result.imagePromptSuggestions[0]
                    ? result.imagePromptSuggestions[0]
                    : (result.headline || promptValue)
                if (fallbackDescription) {
                    creationFlow.setAiImageDescription(fallbackDescription)
                }
            }

            // Expand all cards after a successful analysis
            creationFlow.setStep(6)
            usedContextSignatureRef.current = returnedSignature
            setUsedContextSignature(returnedSignature)
            setContextChangedSinceAnalysis(false)
            return result

        } catch (error) {
            if (cancelAnalyzeRef.current) {
                return null
            }
            console.error(error)
            toast({
                title: t('errors.magicAnalyzeTitle'),
                description: t('errors.magicAnalyzeDescription'),
                variant: "destructive"
            })
            return null
        } finally {
            setIsMagicParsing(false)
            smartAnalyzeInFlightRef.current = false
            if (cancelAnalyzeRef.current) {
                setIsCancelingAnalyze(false)
            }
        }
    }

    const handleCancelAnalyze = useCallback(() => {
        cancelAnalyzeRef.current = true
        smartAnalyzeInFlightRef.current = false
        setIsMagicParsing(false)
        setIsCancelingAnalyze(true)
        toast({
            title: t('ui.analysisStoppedTitle', { defaultValue: 'Analysis stopped' }),
            description: t('ui.analysisStoppedDescription', { defaultValue: 'Prompt analysis was canceled.' }),
        })
        window.setTimeout(() => setIsCancelingAnalyze(false), 900)
    }, [t, toast])

    const handleCancelGenerate = useCallback(() => {
        generationAbortControllerRef.current?.abort()
        generationAbortControllerRef.current = null
        setIsGenerating(false)
        setIsCancelingGenerate(true)
        toast({
            title: t('ui.generationStoppedTitle', { defaultValue: 'Generation stopped' }),
            description: t('ui.generationStoppedDescription', { defaultValue: 'Image generation was canceled.' }),
        })
        window.setTimeout(() => setIsCancelingGenerate(false), 900)
    }, [t, toast])

    const handleGenerate = async (data: {
        platform?: string
        headline?: string
        cta?: string
        prompt: string
        model?: string
        promptAlreadyBuilt?: boolean
        forcedLayoutId?: string
        auditFlowId?: string
    }) => {
        if (!activeBrandKit) return
        if (creationFlow.state.isAnalyzing) {
            toast({
                title: t('toasts.analyzingReferenceTitle', { defaultValue: 'Analyzing reference' }),
                description: t('toasts.analyzingReferenceDescription', { defaultValue: 'Wait for the analysis to finish before generating.' }),
                variant: "destructive",
            })
            return
        }

        setIsGenerating(true)
        const controller = beginGenerationRequest()
        try {
            const effectiveFlowId = data.auditFlowId || auditFlowId || `flow_${Date.now()}`
            if (!auditFlowId) setAuditFlowId(effectiveFlowId)
            const prepared = buildGenerationRequestPayload({
                ...data,
                auditFlowId: effectiveFlowId
            })
            if (!prepared) return

            const { requestPayload, styleReferenceImage, attachedImages, debugContextItems } = prepared
            const selectedFormat = SOCIAL_FORMATS.find(f => f.id === creationFlow.state.selectedFormat)
            const finalModelPrompt = buildFinalModelPrompt(requestPayload)

            const resolvedDebugModel = resolveImageModelForDebug(data.model)
            const requestPayloadForApi = {
                ...requestPayload,
                prompt: finalModelPrompt,
                promptAlreadyBuilt: true
            }
            setDebugPromptData({
                finalPrompt: finalModelPrompt,
                logoUrl: activeBrandKit?.logos?.[0]?.url,
                referenceImageUrl: styleReferenceImage,
                attachedImages,
                selectedStyles: creationFlow.state.selectedStyles,
                headline: creationFlow.state.headline,
                cta: creationFlow.state.cta,
                platform: creationFlow.state.selectedPlatform || undefined,
                format: creationFlow.state.selectedFormat || undefined,
                intent: creationFlow.state.selectedIntent || undefined,
                layoutId: data.forcedLayoutId || creationFlow.state.selectedLayout || undefined,
                layoutName: ALL_IMAGE_LAYOUTS.find((l) => l.id === (data.forcedLayoutId || creationFlow.state.selectedLayout))?.name,
                layoutSkillName: 'composiciones',
                layoutSkillVersion: ALL_IMAGE_LAYOUTS.find((l) => l.id === (data.forcedLayoutId || creationFlow.state.selectedLayout))?.skillVersion,
                model: resolvedDebugModel,
                aspectRatio: selectedFormat?.aspectRatio,
                compositionMode,
                contextItems: debugContextItems,
                requestPayload: requestPayloadForApi,
            })

            const effectiveModel = resolvedDebugModel
            const effectiveProvider = effectiveModel?.startsWith('wisdom/')
                ? 'Wisdom'
                : effectiveModel?.startsWith('naga/')
                    ? 'NagaAI'
                : effectiveModel?.startsWith('google/')
                    ? 'Google Oficial'
                    : 'Google Oficial'
            console.log(`[IMAGE][CLIENT] Request | Provider: ${effectiveProvider}`)
            console.log(`[IMAGE][CLIENT] Model: ${effectiveModel || 'NO_CONFIG'}`)

            setLastGenerationRequest({
                payload: requestPayloadForApi,
                errorTitle: t('errors.generationTitle', { defaultValue: 'Generation error' }),
                errorFallback: t('errors.generationDescription', { defaultValue: 'Error generating image' })
            })

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestPayloadForApi),
                signal: controller.signal,
            })

            if (response.ok) {
                const result = await response.json()
                creationFlow.setGeneratedImage(result.imageUrl)

                setSessionGenerations(prev => [{
                    id: Date.now().toString(),
                    image_url: result.imageUrl,
                    preview_image_url: result.imageUrl,
                    original_image_url: result.imageUrl,
                    created_at: new Date().toISOString(),
                    prompt_used: typeof requestPayloadForApi.prompt === 'string' ? requestPayloadForApi.prompt : '',
                    caption: creationFlow.state.caption,
                    headline: creationFlow.state.headline,
                    cta: creationFlow.state.cta,
                    platform: creationFlow.state.selectedPlatform || undefined,
                    format: creationFlow.state.selectedFormat || undefined,
                    request_payload: { ...requestPayloadForApi },
                    error_title: t('errors.generationTitle', { defaultValue: 'Generation error' }),
                    error_fallback: t('errors.generationDescription', { defaultValue: 'Error generating image' })
                }, ...prev].slice(0, 80))
            } else {
                const errorData = await response.json().catch(() => ({ error: t('errors.generationDescription', { defaultValue: 'Error generating image' }) }))
                toast({
                    title: t('errors.generationTitle', { defaultValue: 'Generation error' }),
                    description: errorData.error || t('errors.generationDescription', { defaultValue: 'Error generating image' }),
                    variant: "destructive",
                })
            }
        } catch (error: any) {
            if (isAbortError(error) || controller.signal.aborted) {
                return
            }
            console.error('Generation failed:', error)
            toast({
                title: t('errors.generationTitle', { defaultValue: 'Generation error' }),
                description: error.message || t('errors.generationFailed', { defaultValue: 'Could not generate the image.' }),
                variant: "destructive",
            })
        } finally {
            setIsGenerating(false)
            clearGenerationController(controller)
        }
    }

    const handleEditImage = async (editPrompt: string) => {
        if (!activeBrandKit || !creationFlow.state.generatedImage) return

        setIsGenerating(true)
        const controller = beginGenerationRequest()
        try {
            const effectiveFlowId = auditFlowId || `flow_${Date.now()}`
            if (!auditFlowId) setAuditFlowId(effectiveFlowId)
            const editContext = [{
                id: 'edit-reference',
                type: 'image' as const,
                value: creationFlow.state.generatedImage,
                label: t('preview.imageToEdit', { defaultValue: 'Image to edit' })
            }]

            const fullPrompt = buildEditPrompt(editPrompt)
            const selectedFormat = SOCIAL_FORMATS.find(f => f.id === creationFlow.state.selectedFormat)
            const selectedStyleRef = [
                ...creationFlow.state.uploadedImages,
                ...creationFlow.state.selectedBrandKitImageIds
            ].find((id) => {
                const role = creationFlow.state.referenceImageRoles?.[id] || 'content'
                return role === 'style' || role === 'style_content'
            })

            setDebugPromptData({
                finalPrompt: fullPrompt,
                logoUrl: activeBrandKit?.logos?.[0]?.url,
                referenceImageUrl: selectedStyleRef,
                attachedImages: [creationFlow.state.generatedImage],
                selectedStyles: creationFlow.state.selectedStyles,
                headline: creationFlow.state.headline,
                cta: creationFlow.state.cta,
                platform: creationFlow.state.selectedPlatform || undefined,
                format: creationFlow.state.selectedFormat || undefined,
                intent: creationFlow.state.selectedIntent || undefined,
                layoutId: creationFlow.state.selectedLayout || undefined,
                layoutName: ALL_IMAGE_LAYOUTS.find((l) => l.id === creationFlow.state.selectedLayout)?.name,
                layoutSkillName: 'composiciones',
                layoutSkillVersion: ALL_IMAGE_LAYOUTS.find((l) => l.id === creationFlow.state.selectedLayout)?.skillVersion,
                model: resolveImageModelForDebug(),
                aspectRatio: selectedFormat?.aspectRatio,
                compositionMode,
                contextItems: editContext.map((item, idx) => ({
                    id: `edit-context-${idx}`,
                    type: item.type,
                    label: item.label || t('preview.contextLabel', { index: idx + 1, defaultValue: 'Context {{index}}' }),
                    url: item.value,
                    source: item.id === 'edit-reference' ? 'generated' : 'unknown',
                    role: item.id === 'edit-reference' ? 'generated' : 'unknown',
                })),
            })

            const effectiveModel = resolveImageModelForDebug()
            const effectiveProvider = effectiveModel?.startsWith('wisdom/')
                ? 'Wisdom'
                : effectiveModel?.startsWith('naga/')
                    ? 'NagaAI'
                : effectiveModel?.startsWith('google/')
                    ? 'Google Oficial'
                    : 'Google Oficial'
            console.log(`[IMAGE][CLIENT] Request | Provider: ${effectiveProvider}`)
            console.log(`[IMAGE][CLIENT] Model: ${effectiveModel || 'NO_CONFIG'}`)

            const requestPayload = {
                prompt: fullPrompt,
                brandDNA: activeBrandKit,
                context: editContext,
                model: creationFlow.state.selectedImageModel || aiConfig?.imageModel,
                layoutId: creationFlow.state.selectedLayout || undefined,
                layoutName: ALL_IMAGE_LAYOUTS.find((l) => l.id === creationFlow.state.selectedLayout)?.name,
                layoutSkillVersion: ALL_IMAGE_LAYOUTS.find((l) => l.id === creationFlow.state.selectedLayout)?.skillVersion,
                compositionSkill: ALL_IMAGE_LAYOUTS.find((l) => l.id === creationFlow.state.selectedLayout)?.skillVersion
                    ? {
                        name: 'composiciones',
                        version: ALL_IMAGE_LAYOUTS.find((l) => l.id === creationFlow.state.selectedLayout)?.skillVersion,
                        layoutId: creationFlow.state.selectedLayout || undefined,
                    }
                    : undefined,
                aspectRatio: SOCIAL_FORMATS.find(f => f.id === creationFlow.state.selectedFormat)?.aspectRatio,
                selectedColors: creationFlow.state.selectedBrandColors,
                auditFlowId: effectiveFlowId
            }
            setLastGenerationRequest({
                payload: requestPayload,
                errorTitle: t('errors.editTitle', { defaultValue: 'Editing error' }),
                errorFallback: t('errors.editDescription', { defaultValue: 'Error editing image' })
            })

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestPayload),
                signal: controller.signal,
            })

            if (response.ok) {
                const result = await response.json()
                creationFlow.setGeneratedImage(result.imageUrl)

                setSessionGenerations(prev => [{
                    id: Date.now().toString(),
                    image_url: result.imageUrl,
                    preview_image_url: result.imageUrl,
                    original_image_url: result.imageUrl,
                    created_at: new Date().toISOString(),
                    prompt_used: typeof requestPayload.prompt === 'string' ? requestPayload.prompt : '',
                    caption: creationFlow.state.caption,
                    headline: creationFlow.state.headline,
                    cta: creationFlow.state.cta,
                    platform: creationFlow.state.selectedPlatform || undefined,
                    format: creationFlow.state.selectedFormat || undefined,
                    request_payload: { ...requestPayload },
                    error_title: t('errors.editTitle', { defaultValue: 'Editing error' }),
                    error_fallback: t('errors.editDescription', { defaultValue: 'Error editing image' })
                }, ...prev].slice(0, 80))
            } else {
                const errorData = await response.json().catch(() => ({ error: t('errors.editDescription', { defaultValue: 'Error editing image' }) }))
                toast({
                    title: t('errors.editTitle', { defaultValue: 'Editing error' }),
                    description: errorData.error || t('errors.editDescription', { defaultValue: 'Error editing image' }),
                    variant: "destructive",
                })
            }
        } catch (error: any) {
            if (isAbortError(error) || controller.signal.aborted) {
                return
            }
            console.error('Edit failed:', error)
            toast({
                title: t('errors.editTitle', { defaultValue: 'Editing error' }),
                description: error.message || t('errors.editFailed', { defaultValue: 'Could not edit the image.' }),
                variant: "destructive",
            })
        } finally {
            setIsGenerating(false)
            clearGenerationController(controller)
        }
    }

    // Check if current user is admin
    const isAdmin = user?.emailAddresses?.some(
        email => email.emailAddress === ADMIN_EMAIL
    ) ?? false

    // Rule: once prompt analysis has populated defaults, Generate should be enabled.
    // Do not rely only on `currentStep`, because async step corrections can temporarily
    // move the flow backwards even when generation requirements are already satisfied.
    const { state } = creationFlow
    const hasReachedBrandingStep =
        state.currentStep >= 5 ||
        (state.currentStep >= 4 && state.imageSourceMode === 'generate') ||
        state.hasGeneratedImage
    const hasAnalyzedPromptDefaults =
        Boolean(promptValue.trim()) &&
        Boolean(state.selectedIntent) &&
        Boolean(state.selectedPlatform) &&
        Boolean(state.selectedFormat)
    const canGenerate = Boolean(
        (creationFlow.canGenerate || hasReachedBrandingStep || hasAnalyzedPromptDefaults) &&
        !state.isAnalyzing &&
        !contextChangedSinceAnalysis
    )
    const resolveImageModelForDebug = (explicitModel?: string) =>
        explicitModel || state.selectedImageModel || aiConfig?.imageModel || undefined

    // Wrapped handleGenerate with debug modal intercept (admin only)
    const handleGenerateWithDebug = async (data: {
        platform?: string
        headline?: string
        cta?: string
        prompt: string
        model?: string
        promptAlreadyBuilt?: boolean
        forcedLayoutId?: string
        auditFlowId?: string
    }) => {
        if (!isAdmin || !showStudioDebugOverlays) {
            await handleGenerate(data)
            return
        }

        setIsDebugViewOnly(false)
        const prepared = buildGenerationRequestPayload(data)
        if (!prepared) return

        const { requestPayload, styleReferenceImage, attachedImages, debugContextItems } = prepared
        const finalModelPrompt = buildFinalModelPrompt(requestPayload)
        const requestPayloadForApi = {
            ...requestPayload,
            prompt: finalModelPrompt,
            promptAlreadyBuilt: true,
        }

        setDebugPromptData({
            finalPrompt: finalModelPrompt,
            logoUrl: activeBrandKit?.logos?.[0]?.url,
            referenceImageUrl: styleReferenceImage,
            attachedImages,
            selectedStyles: state.selectedStyles,
            headline: state.headline,
            cta: state.cta,
            platform: state.selectedPlatform || undefined,
            format: state.selectedFormat || undefined,
            intent: state.selectedIntent || undefined,
            layoutId: data.forcedLayoutId || state.selectedLayout || undefined,
            layoutName: ALL_IMAGE_LAYOUTS.find((l) => l.id === (data.forcedLayoutId || state.selectedLayout))?.name,
            layoutSkillName: 'composiciones',
            layoutSkillVersion: ALL_IMAGE_LAYOUTS.find((l) => l.id === (data.forcedLayoutId || state.selectedLayout))?.skillVersion,
            model: resolveImageModelForDebug(data.model),
            aspectRatio: SOCIAL_FORMATS.find(f => f.id === state.selectedFormat)?.aspectRatio,
            compositionMode,
            contextItems: debugContextItems,
            requestPayload: requestPayloadForApi,
        })
        setEditableDebugPrompt(finalModelPrompt)
        setPendingGenerationData({
            ...data,
            prompt: finalModelPrompt,
            promptAlreadyBuilt: true
        })
        setShowDebugModal(true)
    }

    const confirmGeneration = async (editedPrompt?: string) => {
        setIsDebugViewOnly(false)
        setShowDebugModal(false)
        if (pendingRetryRequest) {
            const promptFromPayload = typeof pendingRetryRequest.payload.prompt === 'string'
                ? pendingRetryRequest.payload.prompt
                : ''
            const promptToSend = editedPrompt?.trim() ? editedPrompt : promptFromPayload
            const retryPayload = {
                ...pendingRetryRequest.payload,
                prompt: promptToSend
            }

            setIsGenerating(true)
            const controller = beginGenerationRequest()
            try {
                setLastGenerationRequest({
                    payload: retryPayload,
                    errorTitle: pendingRetryRequest.errorTitle,
                    errorFallback: pendingRetryRequest.errorFallback
                })
                await executeGenerationRequest(
                    retryPayload,
                    pendingRetryRequest.errorTitle,
                    pendingRetryRequest.errorFallback,
                    controller.signal
                )
            } catch (error: any) {
                if (isAbortError(error) || controller.signal.aborted) {
                    return
                }
                console.error('Retry confirm failed:', error)
                toast({
                    title: t('errors.retryTitle'),
            description: error?.message || t('errors.retryFailed', { defaultValue: 'Could not generate again.' }),
                    variant: "destructive",
                })
            } finally {
                setIsGenerating(false)
                setPendingRetryRequest(null)
                clearGenerationController(controller)
            }
            return
        }

        if (pendingGenerationData) {
            const promptToSend = editedPrompt?.trim() ? editedPrompt : pendingGenerationData.prompt
            await handleGenerate({
                ...pendingGenerationData,
                prompt: promptToSend
            })
            setPendingGenerationData(null)
        }
    }

    const cancelGeneration = () => {
        setShowDebugModal(false)
        setPendingGenerationData(null)
        setPendingRetryRequest(null)
        setEditableDebugPrompt('')
        if (!isDebugViewOnly) {
            setDebugPromptData(null)
        }
        setIsDebugViewOnly(false)
    }

    const handleOpenPromptDebug = () => {
        if (!debugPromptData?.finalPrompt) {
            toast({
                title: t('errors.debugPromptTitle'),
                description: t('errors.debugPromptDescription'),
                variant: "destructive"
            })
            return
        }
        setIsDebugViewOnly(true)
        setEditableDebugPrompt(debugPromptData.finalPrompt || '')
        setShowDebugModal(true)
    }

    const handleUnifiedAction = async () => {
        // Mode 1: Edit existing image
        if (creationFlow.state.generatedImage && editPrompt.trim()) {
            await handleEditImage(editPrompt)
            setEditPrompt('')
            return
        }

        const currentIntent = creationFlow.state.selectedIntent
        if (!currentIntent) {
            toast({
                title: t('errors.missingIntentTitle'),
                description: t('errors.missingIntentDescription'),
                variant: "destructive",
            })
            return
        }

        if (compositionMode === 'advanced' && !creationFlow.state.selectedLayout) {
            toast({
                title: t('errors.selectLayoutTitle'),
                description: t('errors.selectLayoutDescription'),
                variant: "destructive",
            })
            return
        }

        let forcedLayoutId: string | undefined
        let promptForAttempt = creationFlow.buildGenerationPrompt()
        if (compositionMode === 'basic') {
            const basicLayoutId = getNextBasicLayoutId(currentIntent)
            if (!basicLayoutId) {
                toast({
                    title: t('errors.noLayoutsTitle'),
                    description: t('errors.noLayoutsDescription'),
                    variant: "destructive",
                })
                return
            }
            creationFlow.setSelectedLayoutForGeneration(basicLayoutId)
            forcedLayoutId = basicLayoutId
            promptForAttempt = creationFlow.buildGenerationPrompt({ selectedLayout: basicLayoutId })
        }

        // Mode 2: Generate new image
        await handleGenerateWithDebug({
            prompt: promptForAttempt,
            forcedLayoutId,
        })
    }

    const handleRetryLastPrompt = async () => {
        if (compositionMode === 'basic') {
            const currentIntent = creationFlow.state.selectedIntent
            if (!currentIntent) {
                toast({
                    title: t('errors.missingIntentTitle'),
                    description: t('errors.missingIntentDescription'),
                    variant: "destructive",
                })
                return
            }
            const previousLayoutId =
                (lastGenerationRequest?.payload?.layoutId as string | undefined) ||
                creationFlow.state.selectedLayout

            const nextLayoutId = getNextBasicLayoutId(currentIntent, previousLayoutId || null)
            if (!nextLayoutId) {
                toast({
                    title: t('errors.noLayoutsTitle'),
                    description: t('errors.noLayoutsDescription'),
                    variant: "destructive",
                })
                return
            }

            creationFlow.setSelectedLayoutForGeneration(nextLayoutId)
            const prompt = creationFlow.buildGenerationPrompt({ selectedLayout: nextLayoutId })
            await handleGenerateWithDebug({
                prompt,
                forcedLayoutId: nextLayoutId,
                promptAlreadyBuilt: true,
            })
            return
        }

        if (!lastGenerationRequest) {
            toast({
                title: t('errors.noPreviousPromptTitle'),
                description: t('errors.noPreviousPromptDescription'),
                variant: "destructive",
            })
            return
        }
        if (creationFlow.state.isAnalyzing) {
            toast({
                title: t('errors.analyzingReferenceTitle'),
                description: t('errors.analyzingReferenceDescription'),
                variant: "destructive",
            })
            return
        }

        setIsGenerating(true)
        try {
            await executeGenerationRequest(
                { ...lastGenerationRequest.payload },
                lastGenerationRequest.errorTitle,
                lastGenerationRequest.errorFallback
            )
        } catch (error: any) {
            console.error('Retry request failed:', error)
            toast({
                title: t('errors.retryTitle'),
                description: error?.message || t('errors.retryDescription'),
                variant: "destructive",
            })
        } finally {
            setIsGenerating(false)
        }
    }

    const handleRemoveReferenceFromPreview = (imageUrl: string) => {
        let removed = false
        if (creationFlow.state.uploadedImages.includes(imageUrl)) {
            creationFlow.removeUploadedImage(imageUrl)
            removed = true
        }
        if (creationFlow.state.selectedBrandKitImageIds.includes(imageUrl)) {
            creationFlow.toggleBrandKitImage(imageUrl)
            removed = true
        }
        if (!removed) {
            console.warn('[Preview Remove] No se encontro referencia para URL:', imageUrl.slice(0, 80))
        }
    }

    const handleDisableAiPromptReference = () => {
        creationFlow.setImageSourceMode('upload')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 text-primary" />
                <span className="ml-3 text-lg font-medium">{t('ui.loading')}</span>
            </div>
        )
    }

    // Localiza la generacion que coincide con la imagen actual para construir
    // el asset_key `image:{sessionId}:{generationId}` que usa la Biblioteca
    // (convex/contentLibrary.shared.ts). null si aun no hay sesion o si no se
    // encuentra la generacion (p.ej. justo tras cargar una sesion antigua).
    const currentGenerationForSchedule = creationFlow.state.generatedImage
        ? sessionGenerations.find((generation) =>
              generation.image_url === creationFlow.state.generatedImage ||
              generation.original_image_url === creationFlow.state.generatedImage ||
              generation.preview_image_url === creationFlow.state.generatedImage
          )
        : null
    const scheduleAssetKey =
        currentSessionId && currentGenerationForSchedule
            ? `image:${currentSessionId}:${currentGenerationForSchedule.id}`
            : null

    const editPromptBar = (
        <StudioEditPromptBar
            editPrompt={editPrompt}
            onEditPromptChange={setEditPrompt}
            onApply={() => {
                handleEditImage(editPrompt)
                setEditPrompt('')
            }}
            isApplying={isGenerating}
            isEnabled={Boolean(creationFlow.state.generatedImage)}
            hasGeneratedImage={Boolean(creationFlow.state.generatedImage)}
            editPlaceholder={
                creationFlow.state.generatedImage
                    ? t('image:ui.editPlaceholder', { defaultValue: 'Describe the changes to edit the image...' })
                    : t('image:ui.setupPlaceholder', { defaultValue: 'Set up your image in the top panel...' })
            }
            applyLabel={t('image:ui.applyCorrection', { defaultValue: 'Apply correction' })}
        />
    )

    const previewPane = (
        <>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto no-scrollbar">
                <div
                    className={cn(
                        "relative flex flex-col",
                        previewLayoutMode === 'compact-scroll'
                            ? "min-h-0 flex-none"
                            : "min-h-[340px] flex-1 md:min-h-[500px]"
                    )}
                >
                    <CanvasPanel
                        currentImage={creationFlow.state.generatedImage}
                        generations={[]}
                        onSelectGeneration={() => { }}
                        selectedContext={selectedContext}
                        onRemoveContext={(id) => setSelectedContext(prev => prev.filter(c => c.id !== id))}
                        onAddContext={(element) => setSelectedContext(prev => [...prev, element])}
                        draggedElement={null}
                        isGenerating={isGenerating}
                        aspectRatio={SOCIAL_FORMATS.find(f => f.id === creationFlow.state.selectedFormat)?.aspectRatio || "4:5"}
                        creationState={creationFlow.state}
                        editPrompt=""
                        onEditPromptChange={() => { }}
                        canGenerate={Boolean(canGenerate)}
                        onUnifiedAction={handleUnifiedAction}
                        onCaptionChange={creationFlow.setCaption}
                        onHeadlineChange={creationFlow.setHeadline}
                        onCtaChange={creationFlow.setCta}
                        onCtaUrlChange={(value) => {
                            if (value.trim()) {
                                creationFlow.setCtaUrl(value)
                                return
                            }
                            creationFlow.setCtaUrlEnabled(false)
                        }}
                        onCustomTextChange={creationFlow.setCustomText}
                        onAddTextAsset={(asset) => creationFlow.addTextAsset(asset)}
                        onRemoveTextAsset={creationFlow.removeTextAsset}
                        onUpdateTextAsset={creationFlow.updateTextAsset}
                        hidePromptArea={true}
                        onSelectLogo={creationFlow.selectLogo}
                        onClearUploadedImage={creationFlow.clearImage}
                        onRemoveReferenceImage={handleRemoveReferenceFromPreview}
                        onDisableAiPromptReference={handleDisableAiPromptReference}
                        onOpenPromptDebug={handleOpenPromptDebug}
                        showPromptDebugTrigger={Boolean(showStudioDebugOverlays && isAdmin && creationFlow.state.generatedImage && debugPromptData?.finalPrompt)}
                        layoutIconOverrides={layoutIconOverrides}
                        isAdmin={Boolean(isAdmin)}
                        sessionName={buildDisplaySessionTitle(
                            activeSessionMeta?.title || selectedSessionToLoad || t('sessions.newSessionTitle', { defaultValue: 'New session' }),
                            Boolean(activeSessionMeta?.title_customized)
                        )}
                        previewLayoutMode={previewLayoutMode}
                        assetKey={scheduleAssetKey}
                    />
                    {!isMobile && (
                        <FeedbackButton
                            show={Boolean(creationFlow.state.generatedImage)}
                            brandId={activeBrandKit?.id as Id<"brand_dna"> | undefined}
                            intent={creationFlow.state.selectedIntent || undefined}
                            layout={creationFlow.selectedLayoutMeta?.id}
                            variant="tab"
                            tabSide={panelPosition === 'right' ? 'right' : 'left'}
                        />
                    )}
                </div>
                <div className="flex flex-col gap-3">
                    <div className="min-w-0 flex-shrink-0 px-3 pb-1 md:px-4 md:pb-2">
                        <ThumbnailHistory
                            generations={displayGenerations}
                            currentImageUrl={creationFlow.state.generatedImage}
                            onSelectGeneration={(gen) => {
                                creationFlow.setGeneratedImage(gen.original_image_url || gen.image_url)
                                if (gen.request_payload) {
                                    setLastGenerationRequest({
                                        payload: { ...gen.request_payload },
                                        errorTitle: gen.error_title || t('errors.generationTitle', { defaultValue: 'Generation error' }),
                                        errorFallback: gen.error_fallback || t('errors.generationDescription', { defaultValue: 'Error generating image' })
                                    })
                                } else if (gen.prompt_used) {
                                    setLastGenerationRequest(prev => ({
                                        payload: {
                                            ...(prev?.payload || {}),
                                            prompt: gen.prompt_used
                                        },
                                        errorTitle: prev?.errorTitle || t('errors.generationTitle', { defaultValue: 'Generation error' }),
                                        errorFallback: prev?.errorFallback || t('errors.generationDescription', { defaultValue: 'Error generating image' })
                                    }))
                                }
                            }}
                        />
                    </div>

                    <div className="relative px-3 pb-3 pt-1 md:px-4 md:pb-3">
                        {editPromptBar}
                    </div>
                </div>
            </div>
        </>
    )

    const controlsPane = (
        <ControlsPanel
            className="min-h-0 flex-1 !border-0 !bg-transparent"
            creationFlow={creationFlow}
            highlightedFields={highlightedFields}
            promptValue={promptValue}
            onPromptChange={updatePromptDraft}
            isMagicParsing={isMagicParsing}
            isGenerating={isGenerating}
            canGenerate={Boolean(canGenerate)}
            onUnifiedAction={handleUnifiedAction}
            onAnalyze={() => handleSmartAnalyze()}
            onContextDocumentChanged={handleContextDocumentChanged}
            onSendToCarousel={promptValue.trim() ? () => {
                sessionStorage.setItem('x-studio:incoming-prompt', promptValue.trim())
                router.push('/carousel')
            } : undefined}
            onCancelAnalyze={handleCancelAnalyze}
            isAdmin={isAdmin}
            adminEmail={user?.emailAddresses?.[0]?.emailAddress}
            compositionMode={compositionMode}
            onCompositionModeChange={setCompositionMode}
            layoutOverrides={layoutOverrides}
            sessions={(workSessions || []).map((session) => ({
                id: String(session._id),
                title: buildDisplaySessionTitle(
                    session.title || t('sessions.untitled', { defaultValue: 'Untitled session' }),
                    Boolean(session.title_customized)
                ),
                updatedAt: session.updated_at,
                active: session.active,
            }))}
            selectedSessionId={selectedSessionToLoad}
            onSelectSession={(id) => {
                setSelectedSessionToLoad(id)
                if (id && id !== currentSessionId) {
                    void handleLoadSession(id).then((loaded) => {
                        if (!loaded) {
                            setSelectedSessionToLoad(currentSessionId || '')
                        }
                    })
                }
            }}
            onCreateSession={() => void createNewImageSession()}
            onRenameSession={() => void handleRenameCurrentSession()}
            isCreatingSession={isCreatingSession}
            onDeleteSession={() => void handleDeleteCurrentSession()}
            onClearSessions={() => void handleClearAllSessions()}
            onSaveSessionNow={() => void handleSaveSessionNow()}
            isSavingSession={isSavingSession}
            sessionSavedAt={sessionSavedAt}
            sessionSaveError={sessionSaveError}
            hasUnsavedChanges={hasUnsavedChanges}
            isCancelingAnalyze={isCancelingAnalyze}
        />
    )

    const generateBar = (
        <StudioGenerateBar
            onGenerate={handleUnifiedAction}
            onRetry={handleRetryLastPrompt}
            onCancelGenerate={handleCancelGenerate}
            isGenerating={isGenerating}
            isCancelingGenerate={isCancelingGenerate}
            canGenerate={Boolean(canGenerate)}
            hasGeneratedImage={Boolean(creationFlow.state.generatedImage)}
            generatingLabel={t('image:ui.generating', { defaultValue: 'Generating...' })}
            generateLabel={t('image:ui.generate', { defaultValue: 'Generate Image' })}
            retryLabel={t('image:ui.retrySameSettings', { defaultValue: 'Generate another with the same settings' })}
            stopLabel={t('image:ui.stop', { defaultValue: 'Stop' })}
            cancelingLabel={t('image:ui.canceling', { defaultValue: 'Canceling...' })}
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
            {controlsPane}
            <div className="sticky bottom-0 bg-transparent p-3 pt-2">
                <div className="rounded-[1.35rem] border border-border/45 bg-background/95 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)] p-2">
                    {generateBar}
                </div>
            </div>
        </MobileWorkPanelDrawer>
    ) : null

    return (
        <DashboardLayout
            brands={brandKits}
            currentBrand={activeBrandKit}
            onBrandChange={setActiveBrandKit}
            onBrandDelete={deleteBrandKitById}
            onNewBrandKit={handleNewBrandKit}
            isFixed={!isMobile}
            contentContainerVariant="plain"
            headerVariant="bar"
        >
            {activeBrandKit ? (
                <div className={cn(
                    "relative flex-1 min-h-0 min-w-0",
                    isMobile ? "flex flex-col overflow-y-auto" : "flex flex-col overflow-hidden"
                )} style={isMobile ? { overscrollBehaviorY: 'none' } : undefined}>
                    <div className={cn(
                        "flex min-h-0 min-w-0 flex-1",
                        isMobile
                            ? "flex-col gap-3 px-2 py-3"
                            : cn(
                                "flex-col gap-4 overflow-hidden px-3 pb-3 pt-4 lg:flex-row",
                                panelPosition === 'right' ? "lg:flex-row" : "lg:flex-row-reverse"
                            )
                        )}>
                        {isMobile ? (
                            <>
                                <div className="order-1 flex min-h-0 flex-col overflow-hidden">
                                    {previewPane}
                                </div>
                                <div className="order-2 shrink-0 overflow-hidden rounded-[1.6rem] border border-border/45 bg-background p-3 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.38)]">
                                    <div className="rounded-[1.35rem] border border-border/45 bg-background/95 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)] p-2">
                                        {generateBar}
                                    </div>
                                </div>
                                {mobileControlsDrawer}
                            </>
                        ) : (
                            <>
                                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                                    {previewPane}
                                </div>
                                <div className="flex w-full min-h-0 flex-col lg:w-[27%] lg:pb-3">
                                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.6rem] bg-white shadow-[0_24px_70px_-46px_rgba(15,23,42,0.34)]">
                                        {controlsPane}
                                        <div className="shrink-0 px-4 py-4">
                                            {generateBar}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="max-w-md space-y-4">
                        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-border/50 bg-[linear-gradient(180deg,white,hsl(var(--surface-alt))/0.92)] shadow-[0_20px_50px_-38px_rgba(15,23,42,0.4)]">
                            <IconPlus className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h2 className="text-2xl font-semibold tracking-tight">{t('ui.selectBrandKitTitle')}</h2>
                        <p className="text-muted-foreground">
                            {t('ui.selectBrandKitDescription')}
                        </p>
                    </div>
                </div>
            )}

            <PromptDebugModal
                open={showStudioDebugOverlays && showDebugModal}
                onClose={cancelGeneration}
                onConfirm={confirmGeneration}
                promptData={debugPromptData}
                viewOnly={isDebugViewOnly}
                editablePrompt={editableDebugPrompt}
                onEditablePromptChange={setEditableDebugPrompt}
            />

            <Dialog
                open={unsavedNavModalOpen}
                onOpenChange={(open) => { if (!open && !isResolvingUnsavedNavigation) handleUnsavedNavigateCancel() }}
            >
                <DialogContent
                    className={IMAGE_DECISION_DIALOG_CLASS}
                    showCloseButton={!isResolvingUnsavedNavigation}
                    onEscapeKeyDown={(event) => {
                        if (isResolvingUnsavedNavigation) event.preventDefault()
                    }}
                    onPointerDownOutside={(event) => {
                        if (isResolvingUnsavedNavigation) event.preventDefault()
                    }}
                    onInteractOutside={(event) => {
                        if (isResolvingUnsavedNavigation) event.preventDefault()
                    }}
                >
                    <DialogHeader className={IMAGE_DECISION_DIALOG_HEADER_CLASS}>
                        <DialogTitle className={IMAGE_DECISION_DIALOG_TITLE_CLASS}>{t('unsaved.navigateTitle')}</DialogTitle>
                        <DialogDescription className={IMAGE_DECISION_DIALOG_DESCRIPTION_CLASS}>
                            {t('unsaved.navigateDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className={IMAGE_DECISION_DIALOG_FOOTER_CLASS}>
                        <Button
                            variant="outline"
                            onClick={handleUnsavedNavigateCancel}
                            disabled={isResolvingUnsavedNavigation}
                            className={IMAGE_DECISION_BUTTON_CLASS}
                        >
                            {t('common:actions.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleUnsavedNavigateDiscard}
                            disabled={isResolvingUnsavedNavigation}
                            className={IMAGE_DECISION_BUTTON_CLASS}
                        >
                            {t('unsaved.discardLeave')}
                        </Button>
                        <Button
                            onClick={() => void handleUnsavedNavigateSave()}
                            disabled={isResolvingUnsavedNavigation}
                            className={IMAGE_DECISION_BUTTON_CLASS}
                        >
                            {t('unsaved.saveLeave')}
                        </Button>
                    </DialogFooter>
                    {isResolvingUnsavedNavigation ? <IndeterminateProgressBar className="mx-6 mb-6 mt-1" /> : null}
                </DialogContent>
            </Dialog>
            <Dialog
                open={sessionDecisionModal.open}
                onOpenChange={(open) => {
                    if (!open) {
                        closeSessionDecisionModal(null)
                    }
                }}
            >
                <DialogContent className={IMAGE_DECISION_DIALOG_CLASS}>
                    <DialogHeader className={IMAGE_DECISION_DIALOG_HEADER_CLASS}>
                        <DialogTitle className={IMAGE_DECISION_DIALOG_TITLE_CLASS}>{sessionDecisionModal.title}</DialogTitle>
                        <DialogDescription className={IMAGE_DECISION_DIALOG_DESCRIPTION_CLASS}>{sessionDecisionModal.description}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className={IMAGE_DECISION_DIALOG_FOOTER_CLASS}>
                        {sessionDecisionModal.buttons.map((button) => (
                            <Button
                                key={button.id}
                                variant={button.variant || 'default'}
                                onClick={() => closeSessionDecisionModal(button.id)}
                                className={IMAGE_DECISION_BUTTON_CLASS}
                            >
                                {button.label}
                            </Button>
                        ))}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
        </DashboardLayout >
    )
}



