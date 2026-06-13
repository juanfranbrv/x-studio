'use client'

import { Loader2 } from '@/components/ui/spinner'
import { useCreationFlow } from '@/hooks/useCreationFlow'
import { LayoutSelector } from './creation-flow/LayoutSelector'
import { SocialFormatSelector } from './creation-flow/SocialFormatSelector'
import { BrandingConfigurator } from './creation-flow/BrandingConfigurator'
import { ContentImageCard } from './creation-flow/ContentImageCard'
import { StyleImageCard } from './creation-flow/StyleImageCard'
import { AuxiliaryLogosCard } from './creation-flow/AuxiliaryLogosCard'
import { useBrandKit } from '@/contexts/BrandKitContext'
import { IconLayout, IconDashboardSquare, IconImageAdd, IconWand, IconIdea, IconFingerprint, IconRotate, IconHistory, IconPlus, IconSave, IconCheck, IconAlertCircle, IconClose, IconPaintbrush02, IconCarousel } from '@/components/ui/icons'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { HexColorPicker } from 'react-colorful'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useToast } from '@/hooks/use-toast'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useTranslation } from 'react-i18next'
import { useStylePresetImages } from '@/hooks/useStylePresetImages'
import {
    IntentCategory,
    INTENT_CATALOG,
    MERGED_LAYOUTS_BY_INTENT,
    type VisionAnalysis,
    type TextAsset,
} from '@/lib/creation-flow-types'
import { FloatingAssistance } from './creation-flow/FloatingAssistance'
import { cn } from '@/lib/utils'
import { SectionHeader } from '@/components/studio/shared/SectionHeader'
import {
    STUDIO_CONTROLS_SHELL_CLASS,
} from '@/components/studio/shared/panelStyles'
import {
    STUDIO_SELECT_CONTENT_CLASS,
    STUDIO_SELECT_ITEM_CLASS,
    STUDIO_RICH_SELECT_TRIGGER_CLASS,
    STUDIO_SELECT_TRIGGER_CLASS,
} from '@/components/studio/shared/selectStyles'
import { SuggestionsList } from '@/components/studio/shared/SuggestionsList'
import {
    clearLegacyLayoutRatingStorage,
    getLayoutRatingStats,
    hasLayoutRatingsMigrationRun,
    markLayoutRatingsMigrationAsDone,
    readLegacyLayoutMarks,
    readLegacyLayoutRatings,
    type LayoutRatingStoreEntry,
} from '@/lib/layout-ratings'
import type { CompositionSummary } from '@/lib/admin-compositions-actions'
import { getDetectedIntentLabel } from '@/lib/intent-label'

const RESET_USES4_FLAG = 'admin_layout_ratings_reset_uses4_done_v1'
const PANEL_SECTION_HEADER_ICON_CLASS = "h-9 w-9 rounded-none border-0 bg-transparent text-foreground/72 shadow-none"
const PANEL_SECTION_HEADER_TITLE_CLASS = "text-[0.94rem] font-bold uppercase tracking-[0.14em] text-foreground/92"
const PANEL_SECTION_SELECT_TRIGGER_CLASS = STUDIO_SELECT_TRIGGER_CLASS
const PANEL_SECTION_SELECT_CONTENT_CLASS = STUDIO_SELECT_CONTENT_CLASS
const PANEL_SECTION_SELECT_ITEM_CLASS = STUDIO_SELECT_ITEM_CLASS
const PANEL_SECTION_LABEL_CLASS = "text-[0.78rem] font-semibold text-foreground/90 uppercase tracking-[0.08em]"
const PANEL_SECTION_HELPER_CLASS = "text-[0.84rem] text-muted-foreground leading-relaxed"
const PANEL_TEXT_BUTTON_REVEAL_CLASS = "rounded-xl px-3 py-2 text-[clamp(0.9rem,0.86rem+0.12vw,0.98rem)] text-muted-foreground transition-all duration-200 hover:bg-muted/80 hover:text-foreground hover:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.28)] disabled:opacity-50"
const PANEL_SECONDARY_BUTTON_CLASS = "min-h-[42px] h-auto justify-center rounded-[1rem] px-4 py-2 text-center text-[clamp(0.93rem,0.89rem+0.12vw,1rem)] font-medium leading-tight whitespace-normal"
const PANEL_RICH_SELECT_TRIGGER_CLASS = STUDIO_RICH_SELECT_TRIGGER_CLASS
const PANEL_RICH_SELECT_CONTENT_STYLE = {
    width: 'var(--radix-select-trigger-width)',
    minWidth: 'var(--radix-select-trigger-width)',
    maxWidth: 'var(--radix-select-trigger-width)',
} as const
const BRAND_KIT_GROUP_CLASS = "space-y-3"
const BRAND_KIT_CONTACT_ROW_CLASS = "space-y-2 border-b border-border/40 py-2.5 last:border-b-0"
const BRAND_KIT_SUBTLE_BUTTON_CLASS = "h-9 rounded-xl border border-border/65 bg-background/82 px-3 text-[0.9rem] font-medium text-foreground/88 transition-all duration-200 hover:border-border/90 hover:bg-background hover:shadow-[0_12px_28px_-24px_rgba(15,23,42,0.18)]"
const PANEL_SECTION_DIVIDER_WRAP_CLASS = "relative py-5 first:pt-0 last:pb-0 before:absolute before:left-[-1rem] before:right-[-1rem] before:top-0 before:h-[2px] before:bg-border/35 before:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-1px_0_rgba(15,23,42,0.04)] first:before:hidden md:before:left-[-1.25rem] md:before:right-[-1.25rem]"
const PANEL_SECTION_STACK_CLASS = `${PANEL_SECTION_DIVIDER_WRAP_CLASS} space-y-[0.85rem]`
const PANEL_SECTION_SURFACE_CLASS = "rounded-2xl border border-border/65 bg-background/72 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
const PANEL_SECTION_BODY_CLASS = "rounded-[1.5rem] border border-border/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.74))] px-4 py-4 shadow-[0_16px_38px_-36px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.74)] backdrop-blur-[8px]"

type BrandColorRole = 'Texto' | 'Fondo' | 'Acento'
type DraggedBrandColor = { role: BrandColorRole; color: string } | null

function normalizeHexColor(color: string): string {
    const base = (color || '').trim().toLowerCase()
    if (!base) return '#000000'
    const withHash = base.startsWith('#') ? base : `#${base}`
    return /^#[0-9a-f]{6}$/i.test(withHash) ? withHash : '#000000'
}

function RoleColorSwatch({
    color,
    onCommit,
    applyLabel,
    draggable = false,
    onDragStart,
    onDragEnd,
    sizeClass = "w-14 h-14 rounded-2xl",
}: {
    color: string
    onCommit: (nextColor: string) => void
    applyLabel: string
    draggable?: boolean
    onDragStart?: (event: React.DragEvent<HTMLButtonElement>) => void
    onDragEnd?: (event: React.DragEvent<HTMLButtonElement>) => void
    sizeClass?: string
}) {
    const initial = normalizeHexColor(color)
    const [draft, setDraft] = useState(initial)
    const [open, setOpen] = useState(false)

    useEffect(() => {
        setDraft(initial)
    }, [initial])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(sizeClass, "border border-border/70 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.28)] transition-transform duration-200 hover:scale-[1.03]")}
                    style={{ backgroundColor: initial }}
                    title={initial}
                    draggable={draggable}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                />
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3 space-y-3 bg-card border border-border/80 shadow-xl z-[140]" align="start">
                <HexColorPicker
                    color={draft}
                    onChange={(next) => setDraft(normalizeHexColor(next))}
                    className="!w-full !h-28"
                />
                <Input
                    value={draft.toUpperCase()}
                    onChange={(e) => setDraft(normalizeHexColor(e.target.value))}
                    className="h-8 text-xs font-mono"
                />
                <Button
                    type="button"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => {
                        onCommit(draft)
                        setOpen(false)
                    }}
                >
                    {applyLabel}
                </Button>
            </PopoverContent>
        </Popover>
    )
}

function AddAccentSwatch({
    disabled,
    onAdd,
    label,
}: {
    disabled?: boolean
    onAdd: (nextColor: string) => void
    label: string
}) {
    const [open, setOpen] = useState(false)
    const [draft, setDraft] = useState('#4f46e5')
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                        "w-14 h-14 rounded-2xl border border-dashed border-border/80 flex items-center justify-center text-muted-foreground shadow-[0_14px_28px_-24px_rgba(15,23,42,0.2)]",
                        "hover:text-primary hover:border-primary/60 transition-colors",
                        disabled && "opacity-40 cursor-not-allowed"
                    )}
                    title={label}
                >
                    <IconPlus className="w-5 h-5" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3 space-y-3 bg-card border border-border/80 shadow-xl z-[140]" align="start">
                <HexColorPicker
                    color={draft}
                    onChange={(next) => setDraft(normalizeHexColor(next))}
                    className="!w-full !h-28"
                />
                <Input
                    value={draft.toUpperCase()}
                    onChange={(e) => setDraft(normalizeHexColor(e.target.value))}
                    className="h-8 text-xs font-mono"
                />
                <Button
                    type="button"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => {
                        onAdd(draft)
                        setOpen(false)
                    }}
                >
                    {label}
                </Button>
            </PopoverContent>
        </Popover>
    )
}

interface ControlsPanelProps {
    creationFlow: ReturnType<typeof useCreationFlow>
    highlightedFields?: Set<string>
    aspectRatio?: string
    hidePromptArea?: boolean
    promptValue: string
    onPromptChange: (value: string) => void
    isMagicParsing: boolean
    isGenerating: boolean
    canGenerate: boolean
    onUnifiedAction: () => void
    onAnalyze: () => Promise<any>
    onCancelAnalyze?: () => void
    isAdmin?: boolean
    adminEmail?: string
    compositionMode?: 'basic' | 'advanced'
    onCompositionModeChange?: (mode: 'basic' | 'advanced') => void
    layoutOverrides?: CompositionSummary[]
    sessions?: Array<{
        id: string
        title: string
        updatedAt: string
        active?: boolean
    }>
    selectedSessionId?: string
    onSelectSession?: (id: string) => void
    onCreateSession?: () => void
    onRenameSession?: () => void
    onDeleteSession?: () => void
    onClearSessions?: () => void
    onSaveSessionNow?: () => void
    isCreatingSession?: boolean
    isSavingSession?: boolean
    sessionSavedAt?: string | null
    sessionSaveError?: string | null
    hasUnsavedChanges?: boolean
    isCancelingAnalyze?: boolean
    onSendToCarousel?: () => void
    className?: string
}

export function ControlsPanel({
    creationFlow,
    highlightedFields = new Set(),
    aspectRatio,
    hidePromptArea = false,
    promptValue,
    onPromptChange,
    isMagicParsing,
    isGenerating,
    canGenerate,
    onUnifiedAction,
    onAnalyze,
    onCancelAnalyze,
    isAdmin = false,
    adminEmail,
    compositionMode,
    onCompositionModeChange,
    layoutOverrides,
    sessions = [],
    selectedSessionId,
    onSelectSession,
    onCreateSession,
    onRenameSession,
    onDeleteSession,
    onClearSessions,
    onSaveSessionNow,
    isCreatingSession = false,
    isSavingSession = false,
    sessionSavedAt = null,
    sessionSaveError = null,
    hasUnsavedChanges = false,
    isCancelingAnalyze = false,
    onSendToCarousel,
    className,
}: ControlsPanelProps) {
    const { t, i18n } = useTranslation('image')
    const { toast } = useToast()
    const { panelPosition, assistanceEnabled } = useUI()
    const [isMobile, setIsMobile] = useState(false)
    const [showLabCatalog, setShowLabCatalog] = useState(compositionMode === 'advanced')
    const [layoutIntentOverride, setLayoutIntentOverride] = useState<'auto' | IntentCategory>('auto')
    const [draggedBrandColor, setDraggedBrandColor] = useState<DraggedBrandColor>(null)
    const [isInspiring, setIsInspiring] = useState(false)
    const [isRefreshingBrandColors, setIsRefreshingBrandColors] = useState(false)
    const STEP_ASSISTANCE: Record<number, { title: string; description: string }> = {
        1: { title: t('ui.ideaTitle'), description: t('ui.ideaDescription') },
        2: { title: t('ui.designTitle'), description: t('ui.designDescription') },
        3: { title: t('ui.formatTitle'), description: t('ui.formatDescription') },
        4: { title: t('ui.imageTitle'), description: t('ui.imageDescription') },
        6: { title: t('ui.brandTitle'), description: t('ui.brandDescription') }
    }
    const upsertLayoutVote = useMutation(api.layoutRatings.upsertLayoutVote)
    const migrateLegacyRatings = useMutation(api.layoutRatings.migrateLegacyRatings)
    const resetLayoutRatings = useMutation(api.layoutRatings.resetLayoutRatings)
    const { activeBrandKit, updateActiveBrandKit, setActiveBrandKit, reloadBrandKits } = useBrandKit()
    const layoutRatingsRows = useQuery(
        api.layoutRatings.listLayoutRatings,
        isAdmin && adminEmail ? { admin_email: adminEmail, layoutIdPrefix: 'lab-v6-' } : 'skip'
    )

    // REFS FOR STEPS (To anchor the Floating Assistance via Portals)
    const step1Ref = useRef<HTMLDivElement>(null)
    const step2Ref = useRef<HTMLDivElement>(null)
    const step3Ref = useRef<HTMLDivElement>(null)
    const step4Ref = useRef<HTMLDivElement>(null)
    const step6Ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const updateViewport = () => setIsMobile(window.innerWidth < 768)
        updateViewport()
        window.addEventListener('resize', updateViewport)
        return () => window.removeEventListener('resize', updateViewport)
    }, [])

    const {
        state,
        availableLayouts,
        selectLayout,
        selectLogo,
        setHeadline,
        setCta,
        setCtaUrl,
        setCtaUrlEnabled,
        setCustomStyle,
        setApplyStyleToTypography,
        toggleBrandColor,
        removeBrandColor,
        swapBrandColorPositions,
        addCustomColor,
        syncBrandingFromActiveKit,
        selectPlatform,
        selectFormat,
        selectedLayoutMeta,
        uploadImage,
        removeUploadedImage,
        clearUploadedImages,
        setImageSourceMode,
        setAiImageDescription,
        toggleBrandKitImage,
        clearBrandKitImages,
        setReferenceImageRole,
        setStylePreset,
        reset,
        addTextAsset,
        removeTextAsset,
        updateTextAsset,
    } = creationFlow
    const currentGenerationKey = (state.generatedImage || '').trim()
    const hasVotedCurrentGeneration = useQuery(
        api.layoutRatings.hasLayoutVoteForGeneration,
        isAdmin && adminEmail && state.selectedLayout && currentGenerationKey
            ? {
                admin_email: adminEmail,
                layoutId: state.selectedLayout,
                generationKey: currentGenerationKey,
            }
            : 'skip'
    )
    const { stylePresets } = useStylePresetImages()
    const stylePresetsStatus = 'Exhausted' as const

    const lastInitBrandId = useRef<string | null>(null)

    useEffect(() => {
        const brandId = activeBrandKit?.id || (activeBrandKit as any)?._id
        if (!activeBrandKit || !brandId) return

        const hasSelectedColors = state.selectedBrandColors.length > 0
        if (hasSelectedColors && lastInitBrandId.current === brandId) return

        if (!hasSelectedColors && activeBrandKit.colors && activeBrandKit.colors.length > 0) {
            console.log(`[ControlsPanel] Initializing colors for Brand Kit: ${brandId}`)
            activeBrandKit.colors.forEach((c) => {
                const rawRole = ((c.role as string) || 'Acento').trim().toUpperCase()
                let role: 'Texto' | 'Fondo' | 'Acento' = 'Acento'
                if (rawRole.includes('TEXT')) role = 'Texto'
                else if (rawRole.includes('FOND')) role = 'Fondo'
                else if (rawRole.includes('ACENT')) role = 'Acento'

                const color = (c.color || (c as any).hex || (typeof c === 'string' ? c : '')).toLowerCase()
                if (color) toggleBrandColor(color, role)
            })
        }

        lastInitBrandId.current = brandId
    }, [activeBrandKit, state.selectedBrandColors.length, toggleBrandColor])



    const handleInspire = async () => {
        const brandKitId = (activeBrandKit?.id || (activeBrandKit as any)?._id) as string | undefined
        if (!brandKitId || isInspiring) return
        setIsInspiring(true)
        try {
            const res = await fetch('/api/generate-user-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ module: 'image', brandKitId }),
            })
            const data = await res.json()
            if (data.success && data.text) {
                onPromptChange(data.text)
            }
        } catch (err) {
            console.error('Failed to generate prompt inspiration:', err)
        } finally {
            setIsInspiring(false)
        }
    }

    const brandKitImages = (activeBrandKit?.images || []).reduce((acc: Array<{ id: string; url: string; name?: string }>, img, idx) => {
        const imageUrl = typeof img === 'string' ? img : img.url
        if (imageUrl && !acc.find(i => i.url === imageUrl)) {
            acc.push({
                id: imageUrl,
                url: imageUrl,
                name: t('ui.brandKitImageLabel', { defaultValue: 'Image {{index}}', index: idx + 1 })
            })
        }
        return acc
    }, [])
    const brandKitLogos = (activeBrandKit?.logos || []).reduce((acc: Array<{ id: string; url: string; name?: string }>, logo, idx) => {
        const logoUrl = typeof logo === 'string' ? logo : logo.url
        if (logoUrl && !acc.find((item) => item.url === logoUrl)) {
            acc.push({ id: logoUrl, url: logoUrl, name: `Logo ${idx + 1}` })
        }
        return acc
    }, [])

    const refreshActiveBrandKitContent = async () => {
        const currentId = activeBrandKit?.id || (activeBrandKit as any)?._id
        if (!currentId) return
        await setActiveBrandKit(String(currentId), false, false)
        await reloadBrandKits(true)
    }

    const handleReloadBrandKit = async () => {
        if (isRefreshingBrandColors) return
        setIsRefreshingBrandColors(true)
        await refreshActiveBrandKitContent()
        syncBrandingFromActiveKit()
        toast({
            title: t('ui.brandKitReloadedTitle', { defaultValue: 'Kit de marca actualizado' }),
            description: t('ui.brandKitReloadedDescription', { defaultValue: 'Se han recargado logos y colores desde el kit actual.' }),
        })
        setIsRefreshingBrandColors(false)
    }

    const layoutRatingStore: Record<string, LayoutRatingStoreEntry> = (layoutRatingsRows || []).reduce(
        (acc: Record<string, LayoutRatingStoreEntry>, row: { layoutId: string; totalPoints: number; uses: number; votes: number }) => {
            acc[row.layoutId] = {
                totalPoints: row.totalPoints,
                uses: row.uses,
                votes: row.votes,
            }
            return acc
        },
        {}
    )

    useEffect(() => {
        if (!isAdmin || !adminEmail || hasLayoutRatingsMigrationRun()) return

        const legacyMarks = readLegacyLayoutMarks()
        const legacyRatings = readLegacyLayoutRatings()
        const hasMarks = Object.keys(legacyMarks).length > 0
        const hasRatings = Object.keys(legacyRatings).length > 0

        if (!hasMarks && !hasRatings) {
            markLayoutRatingsMigrationAsDone()
            return
        }

        let cancelled = false

        const runMigration = async () => {
            try {
                await migrateLegacyRatings({
                    admin_email: adminEmail,
                    marks: hasMarks ? legacyMarks : undefined,
                    ratings: hasRatings ? legacyRatings : undefined,
                })
                if (!cancelled) {
                    clearLegacyLayoutRatingStorage()
                    markLayoutRatingsMigrationAsDone()
                    toast({
                        title: t('ui.layoutVotesImportedTitle', {
                            defaultValue: 'Ratings migrated to Convex',
                        }),
                        description: t('ui.layoutVotesImportedDescription', {
                            defaultValue: 'Previous layout votes and marks were imported.',
                        }),
                    })
                }
            } catch (error) {
                console.error('Layout ratings migration failed:', error)
            }
        }

        runMigration()
        return () => {
            cancelled = true
        }
    }, [adminEmail, isAdmin, migrateLegacyRatings, toast])

    useEffect(() => {
        if (!isAdmin || !adminEmail || typeof window === 'undefined') return
        if (window.localStorage.getItem(RESET_USES4_FLAG) === '1') return

        let cancelled = false
        const runReset = async () => {
            try {
                const result = await resetLayoutRatings({
                    admin_email: adminEmail,
                    layoutIdPrefix: 'lab-v6-',
                    exactUses: 4,
                })
                if (!cancelled) {
                    window.localStorage.setItem(RESET_USES4_FLAG, '1')
                    if (result?.updated > 0) {
                        toast({
                            title: t('ui.layoutRatingsResetTitle', {
                                defaultValue: 'Ratings corrected',
                            }),
                            description: t('ui.layoutRatingsResetDescription', {
                                defaultValue: '{{count}} layouts with 4 uses were reset to 0.',
                                count: result.updated,
                            }),
                        })
                    }
                }
            } catch (error) {
                console.error('resetLayoutRatings failed:', error)
            }
        }

        runReset()
        return () => {
            cancelled = true
        }
    }, [adminEmail, isAdmin, resetLayoutRatings, toast])

    const selectedLayoutRatingStats = state.selectedLayout
        ? getLayoutRatingStats(state.selectedLayout, layoutRatingStore)
        : null
    const primaryEmail = useMemo(() => {
        const emails = (activeBrandKit as any)?.emails
        if (!Array.isArray(emails)) return ''
        return String(emails.find((value: unknown) => typeof value === 'string' && value.trim()) || '').trim()
    }, [activeBrandKit])
    const phoneValues = useMemo(() => {
        const phones = (activeBrandKit as any)?.phones
        if (!Array.isArray(phones)) return [] as string[]
        return phones
            .map((value: unknown) => String(value || '').trim())
            .filter(Boolean)
    }, [activeBrandKit])
    const addressValues = useMemo(() => {
        const addresses = (activeBrandKit as any)?.addresses
        if (!Array.isArray(addresses)) return [] as string[]
        return addresses
            .map((value: unknown) => String(value || '').trim())
            .filter(Boolean)
    }, [activeBrandKit])

    const getContactAssetById = (assetId: string) =>
        state.selectedTextAssets.find((asset) => asset.id === assetId) || null

    const toggleContactAsset = (asset: TextAsset) => {
        const exists = getContactAssetById(asset.id)
        if (exists) {
            removeTextAsset(asset.id)
            return
        }
        addTextAsset(asset)
    }

    const updateContactAssetValue = (assetId: string, value: string) => {
        updateTextAsset(assetId, value)
    }
    const brandColorsByRole = useMemo(() => {
        const grouped: Record<BrandColorRole, string[]> = {
            Texto: [],
            Fondo: [],
            Acento: [],
        }

        state.selectedBrandColors.forEach((item) => {
            const normalized = normalizeHexColor(item.color)
            const role = item.role === 'Texto' || item.role === 'Fondo' ? item.role : 'Acento'
            if (!grouped[role].includes(normalized)) {
                grouped[role].push(normalized)
            }
        })

        return grouped
    }, [state.selectedBrandColors])

    const replaceRoleColor = (role: BrandColorRole, nextColorRaw: string, previousColor?: string) => {
        const nextColor = normalizeHexColor(nextColorRaw)
        const prevColor = previousColor ? normalizeHexColor(previousColor) : null

        if (prevColor && prevColor !== nextColor) {
            removeBrandColor(prevColor)
        }

        if (role !== 'Acento') {
            brandColorsByRole[role].forEach((existing) => {
                if (!prevColor || existing !== prevColor) {
                    removeBrandColor(existing)
                }
            })
        }

        toggleBrandColor(nextColor, role)
    }

    const addAccentColor = (nextColorRaw: string) => {
        const nextColor = normalizeHexColor(nextColorRaw)
        if (brandColorsByRole.Acento.length >= 5) return
        toggleBrandColor(nextColor, 'Acento')
    }

    const setColorRole = (colorRaw: string, role: BrandColorRole) => {
        const color = normalizeHexColor(colorRaw)
        removeBrandColor(color)
        toggleBrandColor(color, role)
    }

    const swapBrandColorRoles = (
        source: { role: BrandColorRole; color: string },
        targetRole: BrandColorRole,
        explicitTargetColor?: string
    ) => {
        const sourceColor = normalizeHexColor(source.color)
        const sourceRole = source.role
        const targetColor = explicitTargetColor
            ? normalizeHexColor(explicitTargetColor)
            : (targetRole === 'Acento' ? undefined : brandColorsByRole[targetRole][0])

        if (sourceRole === targetRole && (!targetColor || targetColor === sourceColor)) return

        // Same role (e.g. both Accents) → swap positions in array
        if (sourceRole === targetRole && targetColor && targetColor !== sourceColor) {
            swapBrandColorPositions(sourceColor, targetColor)
            return
        }

        setColorRole(sourceColor, targetRole)

        if (targetColor && targetColor !== sourceColor) {
            const returnRole: BrandColorRole = sourceRole === 'Acento' ? 'Acento' : sourceRole
            setColorRole(targetColor, returnRole)
        }
    }
    const effectiveSessionId = selectedSessionId !== undefined
        ? selectedSessionId
        : (sessions.find((session) => session.active)?.id || '')
    const selectedSession = sessions.find((session) => session.id === effectiveSessionId)
    const selectedIntentMeta = INTENT_CATALOG.find((intent) => intent.id === state.selectedIntent)
    const detectedIntentLabel = getDetectedIntentLabel(state.selectedIntent, t('ui.selectIntent'))
    const effectiveLayoutIntent: IntentCategory = (
        layoutIntentOverride === 'auto'
            ? (state.selectedIntent as IntentCategory)
            : layoutIntentOverride
    )
    const selectedLayoutIntentMeta = layoutIntentOverride === 'auto'
        ? selectedIntentMeta
        : INTENT_CATALOG.find((intent) => intent.id === layoutIntentOverride)

    const compositionCatalogLayouts = useMemo(() => {
        const base = MERGED_LAYOUTS_BY_INTENT[effectiveLayoutIntent] || availableLayouts
        if (!layoutOverrides || layoutOverrides.length === 0) return base

        return base.map(layout => {
            const override = layoutOverrides.find(o => o.id === layout.id)
            if (override && override.svgIcon && override.svgIcon !== 'Layout') {
                return { ...layout, svgIcon: override.svgIcon }
            }
            return layout
        })
    }, [effectiveLayoutIntent, availableLayouts, layoutOverrides])

    useEffect(() => {
        if (!compositionMode) return
        setShowLabCatalog(compositionMode === 'advanced')
    }, [compositionMode])

    useEffect(() => {
        onCompositionModeChange?.(showLabCatalog ? 'advanced' : 'basic')
    }, [showLabCatalog, onCompositionModeChange])

    useEffect(() => {
        if (!showLabCatalog && state.currentStep === 2) {
            creationFlow.setStep(3)
        }
    }, [showLabCatalog, state.currentStep, creationFlow])

    const handleAdminLayoutVote = async (score: number) => {
        if (!isAdmin || !adminEmail || !state.selectedLayout || !currentGenerationKey) return
        if (hasVotedCurrentGeneration) {
            toast({
                title: t('ui.voteAlreadyRecordedTitle', { defaultValue: 'Already rated' }),
                description: t('ui.voteAlreadyRecordedCurrentDescription', {
                    defaultValue: 'This generation already has a vote for this layout.',
                }),
            })
            return
        }
        try {
            const nextStats = await upsertLayoutVote({
                admin_email: adminEmail,
                layoutId: state.selectedLayout,
                score,
                generationKey: currentGenerationKey,
            })
            if (nextStats.alreadyVoted) {
                toast({
                    title: t('ui.voteAlreadyRecordedTitle', { defaultValue: 'Already rated' }),
                    description: t('ui.voteAlreadyRecordedDescription', {
                        defaultValue: 'This generation already had a registered vote.',
                    }),
                })
                return
            }
            toast({
                title: t('ui.voteRegisteredTitle', { defaultValue: 'Vote saved' }),
                description: t('ui.voteRegisteredDescription', {
                    defaultValue: '{{score}}/5 · avg {{average}} · uses {{uses}}',
                    score,
                    average: nextStats.average.toFixed(2),
                    uses: nextStats.uses,
                }),
            })
        } catch (error: any) {
            toast({
                title: t('ui.voteSaveErrorTitle', { defaultValue: 'Error saving vote' }),
                description: error?.message || t('ui.voteSaveErrorDescription', {
                    defaultValue: 'The vote could not be recorded.',
                }),
                variant: 'destructive',
            })
        }
    }

    return (
        <div className={cn(STUDIO_CONTROLS_SHELL_CLASS, className)}>
            <div className="thin-scrollbar flex-1 overflow-y-auto pl-4 pr-0 -mr-[2px] pt-4 md:pl-5 md:pr-0 md:pt-5">
                <div className="space-y-3 pr-4 pb-10 md:pr-5 md:pb-12">
                {/* SECTION: Sessions */}
                <div className={PANEL_SECTION_DIVIDER_WRAP_CLASS}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center text-foreground/72">
                                <IconHistory className="h-[18px] w-[18px]" />
                            </div>
                            <p className={PANEL_SECTION_HEADER_TITLE_CLASS}>
                                {t('ui.history')}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <span
                                className={cn(
                                    "inline-flex min-h-9 items-center text-[0.8rem] font-medium",
                                    sessionSaveError
                                        ? "text-destructive"
                                        : hasUnsavedChanges
                                            ? "text-foreground/78"
                                            : "text-muted-foreground"
                                )}
                            >
                                {isSavingSession ? (
                                    <>
                                        <Loader2 className="mr-1.5 h-3.5 w-3.5" />
                                        {t('ui.saving')}
                                    </>
                                ) : sessionSaveError ? (
                                    <>
                                        <IconAlertCircle className="mr-1.5 h-3.5 w-3.5 text-destructive" />
                                        {t('ui.errorShort')}
                                    </>
                                ) : hasUnsavedChanges ? (
                                    t('ui.unsavedChanges')
                                ) : sessionSavedAt ? (
                                    <>
                                        <IconCheck className="mr-1.5 h-3.5 w-3.5 text-primary" />
                                        {t('ui.savedAt', {
                                            time: new Date(sessionSavedAt).toLocaleTimeString(i18n.language || t('ui.locale'), { hour: '2-digit', minute: '2-digit' })
                                        })}
                                    </>
                                ) : t('ui.noChanges')}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-xl border border-border/55 bg-background/72"
                                onClick={onSaveSessionNow}
                                disabled={isSavingSession || !hasUnsavedChanges}
                                title={t('ui.saveHistoryNow')}
                            >
                                <IconSave
                                    className={cn(
                                        "h-4 w-4 transition-colors",
                                        isSavingSession
                                            ? "text-muted-foreground/40"
                                            : hasUnsavedChanges
                                                ? "text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.45)]"
                                                : "text-muted-foreground/55"
                                    )}
                                />
                            </Button>
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        <Select
                            value={effectiveSessionId || '__none'}
                            onValueChange={(value) => {
                                if (value && value !== '__none') onSelectSession?.(value)
                            }}
                        >
                            <SelectTrigger className={PANEL_RICH_SELECT_TRIGGER_CLASS}>
                                <SelectValue
                                    placeholder={t('ui.noSessions')}
                                    className="sr-only"
                                />
                                <span className="flex min-w-0 items-center gap-2">
                                    <span className="block truncate text-left text-[clamp(1rem,0.96rem+0.2vw,1.08rem)] font-medium leading-tight">
                                        {selectedSession?.title || t('ui.noSessions')}
                                    </span>
                                    {selectedSession?.active ? (
                                        <span className="whitespace-nowrap rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[0.78rem] font-semibold text-primary">
                                            {t('ui.activeSession')}
                                        </span>
                                    ) : null}
                                    {selectedSession?.updatedAt ? (
                                        <span className="shrink-0 text-[0.82rem] text-muted-foreground">
                                            {new Date(selectedSession.updatedAt).toLocaleTimeString(i18n.language || t('ui.locale'), { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    ) : null}
                                </span>
                            </SelectTrigger>
                            <SelectContent className={PANEL_SECTION_SELECT_CONTENT_CLASS} position="popper" align="start" style={PANEL_RICH_SELECT_CONTENT_STYLE}>
                                {sessions.length === 0 ? (
                                    <SelectItem
                                        value="__none"
                                        disabled
                                        className={PANEL_SECTION_SELECT_ITEM_CLASS}
                                    >
                                        {t('ui.noSessions')}
                                    </SelectItem>
                                ) : null}
                                {sessions.map((session) => (
                                    <SelectItem
                                        key={session.id}
                                        value={session.id}
                                        className={PANEL_SECTION_SELECT_ITEM_CLASS}
                                    >
                                        <span className="flex min-w-0 items-center gap-2">
                                            <span className="truncate">
                                                {session.title}
                                            </span>
                                            {session.active ? (
                                                <span className="rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[0.78rem] font-semibold text-primary">
                                                    {t('ui.activeSession')}
                                                </span>
                                            ) : null}
                                            <span className="shrink-0 text-[0.82rem] text-muted-foreground">
                                                {new Date(session.updatedAt).toLocaleTimeString(i18n.language || t('ui.locale'), { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant="default"
                                size="sm"
                                className={PANEL_SECONDARY_BUTTON_CLASS}
                                onClick={onCreateSession}
                                disabled={isCreatingSession}
                            >
                                <IconPlus className="mr-1.5 h-3.5 w-3.5" />
                                {t('ui.newSession')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className={PANEL_SECONDARY_BUTTON_CLASS}
                                onClick={onRenameSession}
                                disabled={!effectiveSessionId}
                            >
                                {t('ui.renameSession')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className={PANEL_SECONDARY_BUTTON_CLASS}
                                onClick={onDeleteSession}
                                disabled={!effectiveSessionId}
                            >
                                {t('ui.deleteSession')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className={PANEL_SECONDARY_BUTTON_CLASS}
                                onClick={onClearSessions}
                            >
                                {t('ui.deleteAllSessions', { defaultValue: 'Borrar todas las sesiones' })}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* STEP 1: Intent Input */}
                <div ref={step1Ref} className={cn(PANEL_SECTION_STACK_CLASS, 'group')}>
                    {(isMagicParsing || isGenerating) && (
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 animate-shimmer" />
                    )}
                    <SectionHeader
                        icon={IconIdea}
                        title={t('ui.whatToCreate')}
                        iconContainerClassName={PANEL_SECTION_HEADER_ICON_CLASS}
                        titleClassName={PANEL_SECTION_HEADER_TITLE_CLASS}
                    />
                    <div className="relative">
                        <Textarea
                            value={promptValue}
                            onChange={(e) => onPromptChange(e.target.value)}
                            placeholder={t('ui.ideaPlaceholder')}
                            className={cn(
                                'min-h-[132px] rounded-2xl border border-border/70 bg-background/90 px-4 py-3 !text-[14px] leading-[1.45] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/18 md:!text-[14px]',
                                isMobile ? 'pb-3 pr-3' : 'pb-14 pr-3'
                            )}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    if (!isMagicParsing && promptValue.trim()) {
                                        onAnalyze()
                                    }
                                }
                            }}
                        />
                        {isMobile && activeBrandKit && (
                            <button
                                type="button"
                                onClick={handleInspire}
                                disabled={isInspiring}
                                className={cn("mt-2 inline-flex items-center gap-1.5", PANEL_TEXT_BUTTON_REVEAL_CLASS)}
                            >
                                {isInspiring ? (
                                    <Loader2 className="w-3.5 h-3.5" />
                                ) : (
                                    <IconWand className="w-3.5 h-3.5" />
                                )}
                                {t('inspireMe')}
                            </button>
                        )}
                        <div className={cn(
                            isMobile
                                ? 'mt-2 flex items-center justify-end gap-2'
                                : 'absolute left-2 right-2 bottom-2 flex items-center gap-3'
                        )}>
                            {activeBrandKit && !isMobile && (
                                <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={handleInspire}
                                        disabled={isInspiring}
                                        className={cn("inline-flex min-w-0 items-center gap-1.5", PANEL_TEXT_BUTTON_REVEAL_CLASS)}
                                    >
                                        {isInspiring ? (
                                            <Loader2 className="h-3.5 w-3.5 shrink-0" />
                                        ) : (
                                            <IconWand className="h-3.5 w-3.5 shrink-0" />
                                        )}
                                        <span className="truncate">{t('inspireMe')}</span>
                                    </button>
                                    <div className="flex min-w-[146px] items-center justify-start gap-2">
                                        {isMagicParsing && onCancelAnalyze ? (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={onCancelAnalyze}
                                                className="min-h-[42px] rounded-[1rem] px-4 text-[clamp(0.9rem,0.86rem+0.1vw,0.96rem)] font-semibold text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                            >
                                                {t('ui.stop')}
                                            </Button>
                                        ) : null}
                                        {isCancelingAnalyze ? (
                                            <span className="text-[clamp(0.9rem,0.86rem+0.1vw,0.96rem)] font-medium text-muted-foreground">
                                                {t('ui.canceling')}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            )}
                            {(!activeBrandKit || isMobile) && isMagicParsing && onCancelAnalyze ? (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={onCancelAnalyze}
                                    className={cn(
                                        'min-h-[42px] rounded-[1rem] px-4 text-[clamp(0.9rem,0.86rem+0.1vw,0.96rem)] font-semibold text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                                        isMobile ? 'w-auto' : ''
                                    )}
                                >
                                    {t('ui.stop')}
                                </Button>
                            ) : null}
                            {(!activeBrandKit || isMobile) && isCancelingAnalyze ? (
                                <span className="text-[clamp(0.9rem,0.86rem+0.1vw,0.96rem)] font-medium text-muted-foreground">
                                    {t('ui.canceling')}
                                </span>
                            ) : null}
                            {onSendToCarousel && promptValue.trim() ? (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={onSendToCarousel}
                                    title={t('ui.sendToCarousel', { defaultValue: 'Usar en Carrusel' })}
                                    className="h-[42px] w-[42px] shrink-0 rounded-[1rem] p-0 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                >
                                    <IconCarousel className="h-4 w-4" />
                                </Button>
                            ) : null}
                            <Button
                                size="sm"
                                onClick={onAnalyze}
                                disabled={isMagicParsing || !promptValue.trim()}
                                className={cn(
                                    'group feedback-action h-[42px] rounded-[1rem] border border-transparent bg-primary/90 px-4 text-[clamp(0.94rem,0.9rem+0.12vw,1rem)] font-semibold text-primary-foreground shadow-[0_16px_34px_-22px_rgba(59,130,246,0.58)] transition-all hover:bg-primary hover:shadow-primary/25 sm:px-5 whitespace-nowrap',
                                    isMobile ? 'w-full justify-center' : 'ml-auto'
                                )}
                            >
                                {isMagicParsing ? (
                                    <>
                                        <Loader2 className="mr-2 h-3.5 w-3.5" />
                                        {t('ui.analyzing', { defaultValue: 'Analizando' })}
                                    </>
                                ) : (
                                    t('ui.analyze')
                                )}
                            </Button>
                        </div>
                    </div>
                    <SuggestionsList
                        suggestions={state.suggestions}
                        hasOriginalState={!!state.originalState}
                        activeSuggestionIndex={state.selectedSuggestionIndex}
                        onApply={(index) => {
                            creationFlow.applySuggestion(index)
                            toast({
                                title: t('ui.suggestionAppliedTitle'),
                                description: t('ui.suggestionAppliedDescription'),
                            })
                        }}
                        onUndo={() => {
                            creationFlow.undoSuggestion()
                            toast({
                                title: t('ui.changesRevertedTitle'),
                                description: t('ui.changesRevertedDescription'),
                            })
                        }}
                    />
                    <FloatingAssistance
                        isVisible={assistanceEnabled && state.currentStep === 1 && !state.hasGeneratedImage && !isGenerating}
                        {...STEP_ASSISTANCE[1]}
                        side={panelPosition === 'right' ? 'left' : 'right'}
                        anchorRef={step1Ref}
                    />
                </div>

                {(state.selectedIntent || state.currentStep >= 2) && (
                    <>
                        {/* STEP 2: LAYOUT */}
                        {availableLayouts.length > 0 && (
                            <div ref={step2Ref} className={PANEL_SECTION_STACK_CLASS}>
                                <FloatingAssistance isVisible={assistanceEnabled && state.currentStep === 2 && !state.hasGeneratedImage && !isGenerating} {...STEP_ASSISTANCE[2]} side={panelPosition === 'right' ? 'left' : 'right'} anchorRef={step2Ref} />
                                <SectionHeader
                                    icon={IconLayout}
                                    title={t('ui.designTitle')}
                                    iconContainerClassName={PANEL_SECTION_HEADER_ICON_CLASS}
                                    titleClassName={PANEL_SECTION_HEADER_TITLE_CLASS}
                                    extra={
                                        <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/62 px-2 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                                            <span className={cn('text-[clamp(0.88rem,0.84rem+0.1vw,0.94rem)] font-medium', showLabCatalog ? 'text-primary/90' : 'text-muted-foreground')}>
                                                {t('ui.designAdvancedAria')}
                                            </span>
                                            <Switch
                                                checked={showLabCatalog}
                                                onCheckedChange={setShowLabCatalog}
                                                aria-label={t('ui.designAdvancedAria')}
                                            />
                                        </div>
                                    }
                                />
                                {showLabCatalog ? (
                                    <>
                                        <div className="space-y-1.5">
                                            <Select
                                                value={layoutIntentOverride}
                                                onValueChange={(value) => setLayoutIntentOverride(value as 'auto' | IntentCategory)}
                                            >
                                                <SelectTrigger className={PANEL_RICH_SELECT_TRIGGER_CLASS}>
                                                    <SelectValue
                                                        placeholder={t('ui.selectIntent')}
                                                        className="sr-only"
                                                    />
                                                    <span className="flex min-w-0 items-center gap-2">
                                                        <span className="block truncate text-left text-[clamp(1rem,0.96rem+0.2vw,1.08rem)] font-medium leading-tight">
                                                            {layoutIntentOverride === 'auto'
                                                                ? t('ui.autoDetectedIntent', {
                                                                    defaultValue: 'Auto (detected: {{intent}})',
                                                                    intent: detectedIntentLabel,
                                                                })
                                                                : (selectedLayoutIntentMeta?.name || t('ui.selectIntent'))}
                                                        </span>
                                                    </span>
                                                </SelectTrigger>
                                                <SelectContent className={PANEL_SECTION_SELECT_CONTENT_CLASS} position="popper" align="start" style={PANEL_RICH_SELECT_CONTENT_STYLE}>
                                                    <SelectItem value="auto" className={PANEL_SECTION_SELECT_ITEM_CLASS}>
                                                        {t('ui.autoDetectedIntent', {
                                                            defaultValue: 'Auto (detected: {{intent}})',
                                                            intent: detectedIntentLabel,
                                                        })}
                                                    </SelectItem>
                                                    {INTENT_CATALOG.map((intent) => (
                                                        <SelectItem key={intent.id} value={intent.id} className={PANEL_SECTION_SELECT_ITEM_CLASS}>
                                                            {intent.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="w-full">
                                            <LayoutSelector
                                                availableLayouts={compositionCatalogLayouts}
                                                selectedLayout={state.selectedLayout}
                                                onSelectLayout={selectLayout}
                                                intent={effectiveLayoutIntent}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className={PANEL_SECTION_SURFACE_CLASS}>
                                        <p className="text-[clamp(0.9rem,0.86rem+0.1vw,0.96rem)] leading-relaxed text-muted-foreground">
                                            {t('ui.basicModeDescription')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STEP 3: FORMAT */}
                        <div ref={step3Ref} className={PANEL_SECTION_STACK_CLASS}>
                                <FloatingAssistance isVisible={assistanceEnabled && state.currentStep === 3 && !state.hasGeneratedImage && !isGenerating} {...STEP_ASSISTANCE[3]} side={panelPosition === 'right' ? 'left' : 'right'} anchorRef={step3Ref} />
                                <SectionHeader
                                    icon={IconDashboardSquare}
                                    title={t('ui.formatTitle')}
                                    iconContainerClassName={PANEL_SECTION_HEADER_ICON_CLASS}
                                    titleClassName={PANEL_SECTION_HEADER_TITLE_CLASS}
                                />
                                <SocialFormatSelector
                                    selectedPlatform={state.selectedPlatform}
                                    selectedFormat={state.selectedFormat}
                                    onSelectPlatform={selectPlatform}
                                    onSelectFormat={selectFormat}
                                />
                        </div>

                        {/* STEP 4A: CONTENT */}
                        <div ref={step4Ref} className={PANEL_SECTION_STACK_CLASS}>
                                <FloatingAssistance isVisible={assistanceEnabled && state.currentStep === 4 && !state.hasGeneratedImage && !isGenerating} {...STEP_ASSISTANCE[4]} side={panelPosition === 'right' ? 'left' : 'right'} anchorRef={step4Ref} />
                                <SectionHeader
                                    icon={IconImageAdd}
                                    title={state.imageSourceMode === 'generate' ? t('ui.generatedContentTitle') : t('ui.userContentTitle')}
                                    iconContainerClassName={PANEL_SECTION_HEADER_ICON_CLASS}
                                    titleClassName={PANEL_SECTION_HEADER_TITLE_CLASS}
                                    extra={(
                                        <Switch
                                            checked={state.imageSourceMode === 'generate'}
                                            onCheckedChange={(checked) => setImageSourceMode(checked ? 'generate' : 'upload')}
                                        />
                                    )}
                                />
                                <ContentImageCard
                                    mode={state.imageSourceMode}
                                    onModeChange={setImageSourceMode}
                                    uploadedImages={state.uploadedImages}
                                    onUpload={uploadImage}
                                    onRemoveUploadedImage={removeUploadedImage}
                                    onClearUploadedImages={clearUploadedImages}
                                    brandKitImages={brandKitImages}
                                    selectedBrandKitImageIds={state.selectedBrandKitImageIds}
                                    onToggleBrandKitImage={toggleBrandKitImage}
                                    onClearBrandKitImages={clearBrandKitImages}
                                    referenceImageRoles={state.referenceImageRoles}
                                    onReferenceRoleChange={setReferenceImageRole}
                                    aiImageDescription={state.aiImageDescription}
                                    onAiDescriptionChange={setAiImageDescription}
                                    suggestedImagePrompts={state.imagePromptSuggestions}
                                    isAnalyzing={state.isAnalyzing || false}
                                    error={null}
                                    visionAnalysis={state.visionAnalysis ?? null}
                                />
                        </div>

                        {/* STEP 4B: STYLE */}
                        <div className={PANEL_SECTION_STACK_CLASS}>
                                <SectionHeader
                                    icon={IconPaintbrush02}
                                    title={t('ui.styleTitle', { defaultValue: 'Estilo' })}
                                    iconContainerClassName={PANEL_SECTION_HEADER_ICON_CLASS}
                                    titleClassName={PANEL_SECTION_HEADER_TITLE_CLASS}
                                />
                                <StyleImageCard
                                    uploadedImages={state.uploadedImages}
                                    onUpload={uploadImage}
                                    onRemoveUploadedImage={removeUploadedImage}
                                    brandKitImages={brandKitImages}
                                    selectedBrandKitImageIds={state.selectedBrandKitImageIds}
                                    onToggleBrandKitImage={toggleBrandKitImage}
                                    referenceImageRoles={state.referenceImageRoles}
                                    onReferenceRoleChange={setReferenceImageRole}
                                    stylePresets={stylePresets || []}
                                    stylePresetsStatus={stylePresetsStatus}
                                    selectedStylePresetId={state.selectedStylePresetId || null}
                                    selectedStylePresetName={state.selectedStylePresetName || null}
                                    onSelectStylePreset={(preset) => {
                                        if (!preset) {
                                            setStylePreset(null)
                                            return
                                        }
                                        setStylePreset({
                                            id: preset.id,
                                            name: preset.name || t('ui.styleFallbackName', { defaultValue: 'Style' }),
                                        })
                                    }}
                                    isAnalyzing={state.isAnalyzing || false}
                                    error={state.error}
                                />
                                <div className="rounded-xl border border-border/60 bg-muted/35 px-3 py-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <p className="text-[0.88rem] font-medium leading-none">{t('ui.styleTypographyTitle')}</p>
                                            <p className={PANEL_SECTION_HELPER_CLASS}>
                                                {t('ui.styleTypographyDescription')}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={Boolean(state.applyStyleToTypography)}
                                            onCheckedChange={setApplyStyleToTypography}
                                            aria-label={t('ui.styleTypographyAria')}
                                        />
                                    </div>
                                </div>
                        </div>

                        {/* STEP 4C: AUXILIARY LOGOS */}
                        <div className={PANEL_SECTION_STACK_CLASS}>
                                <AuxiliaryLogosCard
                                    uploadedImages={state.uploadedImages}
                                    onUpload={uploadImage}
                                    onRemoveUploadedImage={removeUploadedImage}
                                    brandKitImages={brandKitImages}
                                    brandKitLogos={brandKitLogos}
                                    onRefreshBrandKitContent={refreshActiveBrandKitContent}
                                    selectedBrandKitImageIds={state.selectedBrandKitImageIds}
                                    onToggleBrandKitImage={toggleBrandKitImage}
                                    referenceImageRoles={state.referenceImageRoles}
                                    onReferenceRoleChange={setReferenceImageRole}
                                />
                        </div>

                        {/* STEP 6: KIT DE MARCA */}
                        <div ref={step6Ref} className={cn(PANEL_SECTION_DIVIDER_WRAP_CLASS, 'space-y-6')}>
                                <FloatingAssistance isVisible={assistanceEnabled && state.currentStep >= 5 && !state.hasGeneratedImage && !isGenerating} {...STEP_ASSISTANCE[6]} side={panelPosition === 'right' ? 'left' : 'right'} anchorRef={step6Ref} />
                                <SectionHeader
                                    icon={IconFingerprint}
                                    title={t('ui.brandKitSection')}
                                    extra={(
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleReloadBrandKit}
                                            disabled={isRefreshingBrandColors}
                                            className={cn(BRAND_KIT_SUBTLE_BUTTON_CLASS, "gap-1.5")}
                                        >
                                            <IconRotate className={cn("h-3.5 w-3.5", isRefreshingBrandColors && "animate-spin")} />
                                            {isRefreshingBrandColors
                                                ? t('ui.reloading', { defaultValue: 'Recargando...' })
                                                : t('ui.reloadBrandKit', { defaultValue: 'Recargar kit' })}
                                        </Button>
                                    )}
                                    iconContainerClassName={PANEL_SECTION_HEADER_ICON_CLASS}
                                    titleClassName={PANEL_SECTION_HEADER_TITLE_CLASS}
                                />

                                <div className={BRAND_KIT_GROUP_CLASS}>
                                    <p className={PANEL_SECTION_LABEL_CLASS}>{t('ui.logo')}</p>
                                    <BrandingConfigurator
                                        selectedLayout={selectedLayoutMeta || null}
                                        selectedLogoId={state.selectedLogoId}
                                        selectedBrandColors={state.selectedBrandColors}
                                        onSelectLogo={selectLogo}
                                        onToggleBrandColor={toggleBrandColor}
                                        onAddCustomColor={addCustomColor}
                                        showLogo={true} showColors={false} showTypography={false} showBrandTexts={false}
                                        rawMessage={promptValue}
                                    />
                                </div>

                                <div className={cn(BRAND_KIT_GROUP_CLASS, "pt-1")}>
                                    <p className={PANEL_SECTION_LABEL_CLASS}>{t('ui.colors')}</p>

                                    <div className="flex items-end gap-4 flex-wrap pb-1">
                                        <div
                                            className={cn(
                                                "flex flex-col items-center gap-2 rounded-[1rem] border border-transparent px-2 py-1.5 transition-colors",
                                                draggedBrandColor && draggedBrandColor.role !== 'Texto' && "border-primary/20 bg-primary/5"
                                            )}
                                            onDragOver={(event) => event.preventDefault()}
                                            onDrop={(event) => {
                                                event.preventDefault()
                                                if (!draggedBrandColor) return
                                                swapBrandColorRoles(
                                                    draggedBrandColor,
                                                    'Texto',
                                                    brandColorsByRole.Texto[0]
                                                )
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
                                                    className={cn(BRAND_KIT_SUBTLE_BUTTON_CLASS, "h-11 px-3 text-[0.88rem]")}
                                                    onClick={() => replaceRoleColor('Texto', '#111111')}
                                                >
                                                    {t('ui.add')}
                                                </Button>
                                            )}
                                            <span className="text-[0.8rem] font-medium text-muted-foreground">{t('ui.text')}</span>
                                        </div>

                                        <div
                                            className={cn(
                                                "flex flex-col items-center gap-2 rounded-[1rem] border border-transparent px-2 py-1.5 transition-colors",
                                                draggedBrandColor && draggedBrandColor.role !== 'Fondo' && "border-primary/20 bg-primary/5"
                                            )}
                                            onDragOver={(event) => event.preventDefault()}
                                            onDrop={(event) => {
                                                event.preventDefault()
                                                if (!draggedBrandColor) return
                                                swapBrandColorRoles(
                                                    draggedBrandColor,
                                                    'Fondo',
                                                    brandColorsByRole.Fondo[0]
                                                )
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
                                                    className={cn(BRAND_KIT_SUBTLE_BUTTON_CLASS, "h-11 px-3 text-[0.88rem]")}
                                                    onClick={() => replaceRoleColor('Fondo', '#ffffff')}
                                                >
                                                    {t('ui.add')}
                                                </Button>
                                            )}
                                            <span className="text-[0.8rem] font-medium text-muted-foreground">{t('ui.background')}</span>
                                        </div>

                                        <div
                                            className="ml-1 flex min-w-0 flex-col gap-2 rounded-[1rem] border border-transparent px-2 py-1.5"
                                            onDragOver={(event) => event.preventDefault()}
                                            onDrop={(event) => {
                                                event.preventDefault()
                                                if (!draggedBrandColor) return
                                                swapBrandColorRoles(draggedBrandColor, 'Acento')
                                                setDraggedBrandColor(null)
                                            }}
                                        >
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                {brandColorsByRole.Acento.map((accentColor) => (
                                                    <div
                                                        key={accentColor}
                                                        className={cn(
                                                            "relative inline-flex items-center group/accent rounded-2xl",
                                                            draggedBrandColor && draggedBrandColor.color !== accentColor && "ring-2 ring-primary/30 ring-offset-1 ring-offset-background"
                                                        )}
                                                        onDragOver={(event) => event.preventDefault()}
                                                        onDrop={(event) => {
                                                            event.preventDefault()
                                                            if (!draggedBrandColor) return
                                                            swapBrandColorRoles(
                                                                draggedBrandColor,
                                                                'Acento',
                                                                accentColor
                                                            )
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
                                                            className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-sm opacity-0 transition-opacity group-hover/accent:opacity-100 group-focus-within/accent:opacity-100 hover:bg-black/70"
                                                            onClick={() => removeBrandColor(accentColor)}
                                                            title={t('ui.removeAccent')}
                                                        >
                                                            <IconClose className="w-3 h-3" />
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
                                            <span className="text-[0.8rem] font-medium text-muted-foreground">{t('ui.accents')}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={cn(BRAND_KIT_GROUP_CLASS, "pt-1")}>
                                    <div className="flex items-center justify-between gap-3">
                                        <p className={PANEL_SECTION_LABEL_CLASS}>{t('ui.link')}</p>
                                        <Switch
                                            checked={state.ctaUrlEnabled}
                                            onCheckedChange={(checked) => {
                                                setCtaUrlEnabled(checked, { useKitIfEmpty: true })
                                            }}
                                        />
                                    </div>
                                    {state.ctaUrlEnabled ? (
                                        <Input
                                            value={state.ctaUrl}
                                            onChange={(e) => setCtaUrl(e.target.value)}
                                            placeholder={activeBrandKit?.url?.trim() || 'tuweb.com'}
                                            className="h-11 rounded-2xl border border-input/80 bg-background/90 text-[0.95rem]"
                                        />
                                    ) : (
                                        <p className={cn(PANEL_SECTION_HELPER_CLASS, "text-[0.9rem]")}>
                                            {t('ui.linkDescription')}
                                        </p>
                                    )}
                                </div>

                                {(primaryEmail || phoneValues.length > 0 || addressValues.length > 0) ? (
                                    <div className={cn(BRAND_KIT_GROUP_CLASS, "pt-2")}>
                                        <div className="space-y-3">
                                            {primaryEmail ? (
                                                <div className={BRAND_KIT_CONTACT_ROW_CLASS}>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className={PANEL_SECTION_LABEL_CLASS}>{t('ui.email')}</p>
                                                        <Switch
                                                            checked={Boolean(getContactAssetById('contact-email-main'))}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    toggleContactAsset({
                                                                        id: 'contact-email-main',
                                                                        type: 'custom',
                                                                        label: t('ui.email'),
                                                                        value: primaryEmail,
                                                                    })
                                                                } else {
                                                                    removeTextAsset('contact-email-main')
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    {getContactAssetById('contact-email-main') ? (
                                                        <Input
                                                            value={getContactAssetById('contact-email-main')?.value || ''}
                                                            onChange={(e) => updateContactAssetValue('contact-email-main', e.target.value)}
                                                            placeholder={primaryEmail}
                                                            className="h-11 rounded-2xl border border-input/80 bg-background/90 text-[0.95rem]"
                                                        />
                                                    ) : (
                                                        <p className="truncate text-[0.95rem] text-foreground/82">{primaryEmail}</p>
                                                    )}
                                                </div>
                                            ) : null}

                                            {phoneValues.map((phone, idx) => {
                                                const assetId = `contact-phone-${idx}`
                                                const selectedPhoneAsset = getContactAssetById(assetId)
                                                return (
                                                    <div key={assetId} className={BRAND_KIT_CONTACT_ROW_CLASS}>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className={PANEL_SECTION_LABEL_CLASS}>{t('ui.phone', { index: idx + 1 })}</p>
                                                            <Switch
                                                                checked={Boolean(selectedPhoneAsset)}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) {
                                                                        toggleContactAsset({
                                                                            id: assetId,
                                                                            type: 'custom',
                                                                            label: t('ui.phone', { index: idx + 1 }),
                                                                            value: phone,
                                                                        })
                                                                    } else {
                                                                    removeTextAsset(assetId)
                                                                }
                                                            }}
                                                        />
                                                        </div>
                                                        {selectedPhoneAsset ? (
                                                            <Input
                                                                value={selectedPhoneAsset.value || ''}
                                                                onChange={(e) => updateContactAssetValue(assetId, e.target.value)}
                                                                placeholder={phone}
                                                                className="h-11 rounded-2xl border border-input/80 bg-background/90 text-[0.95rem]"
                                                            />
                                                        ) : (
                                                            <p className="truncate text-[0.95rem] text-foreground/82">{phone}</p>
                                                        )}
                                                    </div>
                                                )
                                            })}

                                            {addressValues.map((address, idx) => {
                                                const assetId = `contact-address-${idx}`
                                                const selectedAddressAsset = getContactAssetById(assetId)
                                                return (
                                                    <div key={assetId} className={BRAND_KIT_CONTACT_ROW_CLASS}>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className={PANEL_SECTION_LABEL_CLASS}>{t('ui.address', { index: idx + 1 })}</p>
                                                            <Switch
                                                                checked={Boolean(selectedAddressAsset)}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) {
                                                                        toggleContactAsset({
                                                                            id: assetId,
                                                                            type: 'custom',
                                                                            label: t('ui.address', { index: idx + 1 }),
                                                                            value: address,
                                                                        })
                                                                    } else {
                                                                    removeTextAsset(assetId)
                                                                }
                                                            }}
                                                        />
                                                        </div>
                                                        {selectedAddressAsset ? (
                                                            <Input
                                                                value={selectedAddressAsset.value || ''}
                                                                onChange={(e) => updateContactAssetValue(assetId, e.target.value)}
                                                                placeholder={address}
                                                                className="h-11 rounded-2xl border border-input/80 bg-background/90 text-[0.95rem]"
                                                            />
                                                        ) : (
                                                            <p className="break-words text-[0.95rem] text-foreground/82">{address}</p>
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
                </div>
            </div>

        </div>
    )
}


