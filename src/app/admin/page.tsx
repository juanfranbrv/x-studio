'use client'

import { Loader2 } from '@/components/ui/spinner'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useUser, UserButton } from '@clerk/nextjs'
import { useTheme } from 'next-themes'
import { dark } from '@clerk/themes'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import type { Id } from '@/../convex/_generated/dataModel'
import { IconUsers, IconCoins, IconRefresh, IconPlus, IconMinus, IconCheckSimple, IconClose, IconSettings, IconActivity, IconArrowLeft, IconMail, IconExternalLink, IconDelete, IconMessage, IconShapes, IconBanknote, IconSave, IconChevronRight, IconChevronDown, IconDownload, IconPalette, IconWand, IconLayers, IconLink } from '@/components/ui/icons'
import { CreditsBadge } from '@/components/layout/CreditsBadge'
import { getCompositionsSummaryAction, type CompositionSummary } from '@/lib/admin-compositions-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Fragment } from 'react'


import { CompositionsSummaryTable } from '@/components/admin/CompositionsSummaryTable'
import { ReplaceTemplatesManager } from '@/components/admin/ReplaceTemplatesManager'
import { StylePresetsManager } from '@/components/admin/StylePresetsManager'
import { BillingAdminPanel } from '@/components/admin/BillingAdminPanel'
import { CarouselVideoSettingsCard } from '@/components/admin/CarouselVideoSettingsCard'
import { AdminAudioTracksCard } from '@/components/admin/AdminAudioTracksCard'
import { DEFAULT_REPLACE_SYSTEM_PROMPT } from '@/lib/replace-generation'
import {
    buildThemeColors,
    deriveSchemeAsHex,
    DEFAULT_THEME_DRAFT,
    THEME_PALETTE_FIELDS,
    type ThemePaletteDraft,
    type ThemePaletteFieldKey,
} from '@/lib/theme-colors'
import { STUDIO_DEBUG_OVERLAYS_ENABLED_SETTING_KEY, normalizeStudioDebugOverlaysEnabled } from '@/lib/studio-debug-visibility'
import { REPLACE_MODULE_ENABLED_SETTING_KEY, normalizeReplaceModuleEnabled } from '@/lib/replace-module-visibility'
import { getErrorMessage } from '@/lib/utils'

const IMAGE_MODEL_OPTIONS = [
    { value: 'wisdom/gemini-3-pro-image-preview', label: 'Wisdom · Gemini 3 Pro Image Preview' },
    { value: 'wisdom/gemini-3.1-flash-image-preview', label: 'Wisdom · Gemini 3.1 Flash Image Preview' },
    { value: 'wisdom/gpt-image-2-low', label: 'Wisdom · GPT Image 2 · Low' },
    { value: 'wisdom/gpt-image-2-medium', label: 'Wisdom · GPT Image 2 · Medium' },
    { value: 'openai/gpt-image-2-low', label: 'OpenAI · GPT Image 2 · Low' },
    { value: 'openai/gpt-image-2-medium', label: 'OpenAI · GPT Image 2 · Medium' },
    { value: 'google/gemini-3-pro-image-preview', label: 'Google · Gemini 3 Pro Image Preview' },
    { value: 'naga/seedream-5-lite', label: 'NagaAI · seedream-5-lite' },
    { value: 'naga/gpt-image-1.5-2025-12-16', label: 'NagaAI · gpt-image-1.5-2025-12-16' },
    { value: 'atlas/google/nano-banana-2', label: 'Atlas · Google nano-banana-2' },
    { value: 'atlas/google/nano-banana-2/text-to-image', label: 'Atlas · Google nano-banana-2/text-to-image' },
    { value: 'atlas/bytedance/seedream-v5.0-lite', label: 'Atlas · ByteDance seedream-v5.0-lite' },
    { value: 'replicate/google/nano-banana-2', label: 'Replicate · Google nano-banana-2' },
    { value: 'replicate/google/nano-banana-pro', label: 'Replicate · Google nano-banana-pro (2K)' },
]

function normalizeImageModelSettingValue(value: string): string {
    if (value === 'wisdom/gpt-image-2') return 'wisdom/gpt-image-2-low'
    if (value === 'openai/gpt-image-2') return 'openai/gpt-image-2-low'
    return value
}

const INTELLIGENCE_MODEL_OPTIONS = [
    { value: 'wisdom/gemini-3-flash-preview', label: 'Wisdom · Gemini 3 Flash Preview' },
    { value: 'wisdom/gemini-3.1-flash-lite-preview', label: 'Wisdom · Gemini 3.1 Flash Lite Preview' },
    { value: 'wisdom/gemini-3.1-pro-preview', label: 'Wisdom · Gemini 3.1 Pro Preview' },
    { value: 'wisdom/gemini-2.5-flash', label: 'Wisdom · Gemini 2.5 Flash' },
    { value: 'gemini-3-flash-preview', label: 'Google (legacy) · gemini-3-flash-preview' },
    { value: 'google/gemini-3-flash-preview', label: 'Google · gemini-3-flash-preview' },
    { value: 'replicate/google/gemini-3-flash', label: 'Replicate · Google gemini-3-flash' },
    { value: 'naga/gemini-3-flash-preview', label: 'NagaAI · gemini-3-flash-preview' },
]

const PROVIDER_COST_LINKS: Record<string, string> = {
    wisdom: 'https://wisdom-gate.juheapi.com/hall/logs',
    naga: 'https://naga.ac/dashboard/logs',
    replicate: 'https://replicate.com/',
    atlas: 'https://www.atlascloud.ai/es/console/usage-history',
    google: 'https://aistudio.google.com/spend?project=gen-lang-client-0054505696',
    openai: 'https://platform.openai.com/usage',
}

const ADMIN_TAB_STORAGE_KEY = 'x-studio-admin-active-tab'
const ADMIN_TABS = ['requests', 'users', 'transactions', 'settings', 'models', 'styles', 'economics', 'billing', 'links', 'feedback', 'compositions', 'prompts'] as const
type AdminTab = (typeof ADMIN_TABS)[number]
type ImageModelSortKey = 'model' | 'cost' | 'updated'
type SortDirection = 'asc' | 'desc'
const DEFAULT_ADMIN_TAB: AdminTab = 'requests'
const ADMIN_EMAILS = ['juanfranbrv@gmail.com']
type ThemePreset = ThemePaletteDraft & {
    id: string
    name: string
    description: string
    palette: string[]
}

const hexToRgb = (hex: string) => {
    const normalized = hex.replace('#', '')
    const int = Number.parseInt(normalized, 16)
    return {
        r: (int >> 16) & 255,
        g: (int >> 8) & 255,
        b: int & 255,
    }
}

const getRelativeLuminance = (hex: string) => {
    const { r, g, b } = hexToRgb(hex)
    const channel = (value: number) => {
        const normalized = value / 255
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function createThemePreset(id: string, name: string, description: string, palette: string[]): ThemePreset {
    const uniquePalette = Array.from(new Set(palette.map((color) => color.trim())))
    const byLightness = [...uniquePalette].sort((a, b) => getRelativeLuminance(b) - getRelativeLuminance(a))
    const byDarkness = [...uniquePalette].sort((a, b) => getRelativeLuminance(a) - getRelativeLuminance(b))
    const middleColor = uniquePalette[Math.floor(uniquePalette.length / 2)] || uniquePalette[0]

    return {
        id,
        name,
        description,
        palette: uniquePalette,
        primary: uniquePalette[0] || byDarkness[0],
        secondary: uniquePalette[1] || uniquePalette[0],
        surface: byLightness[0] || uniquePalette[uniquePalette.length - 1],
        surfaceAlt: byLightness[1] || byLightness[0] || uniquePalette[0],
        muted: middleColor,
        border: byLightness[1] || byLightness[0] || uniquePalette[0],
        ring: uniquePalette[0] || byDarkness[0],
    }
}

const THEME_PRESETS: ThemePreset[] = [
    {
        id: 'postlab-classic',
        name: 'Postlab Classic',
        description: 'Azul limpio con acento cálido',
        palette: ['#1f5eff', '#f59e0b', '#f6f8ff', '#5f6b85', '#d7def4'],
        primary: '#1f5eff',
        secondary: '#f59e0b',
        surface: '#f6f8ff',
        surfaceAlt: '#ffffff',
        muted: '#5f6b85',
        border: '#d7def4',
        ring: '#1f5eff',
    },
    {
        id: 'olive-editorial',
        name: 'Olive Editorial',
        description: 'Marfil, oliva y piedra con tono de revista',
        palette: ['#556b2f', '#c2a878', '#f5f0e6', '#6f665b', '#d7cdbd'],
        primary: '#556b2f',
        secondary: '#c2a878',
        surface: '#f5f0e6',
        surfaceAlt: '#fbf7f1',
        muted: '#6f665b',
        border: '#d7cdbd',
        ring: '#6b7d3c',
    },
    {
        id: 'terracotta-paper',
        name: 'Terracotta Paper',
        description: 'Más cálido, más táctil, menos SaaS',
        palette: ['#a4472d', '#e3a86b', '#f7ede6', '#7a6257', '#ddc1b1'],
        primary: '#a4472d',
        secondary: '#e3a86b',
        surface: '#f7ede6',
        surfaceAlt: '#fff8f3',
        muted: '#7a6257',
        border: '#ddc1b1',
        ring: '#a4472d',
    },
    {
        id: 'midnight-editor',
        name: 'Midnight Editor',
        description: 'Nocturno profundo con contraste frío',
        palette: ['#7c8cff', '#37c8ab', '#161a28', '#aab3cf', '#303854'],
        primary: '#7c8cff',
        secondary: '#37c8ab',
        surface: '#161a28',
        surfaceAlt: '#1e2334',
        muted: '#aab3cf',
        border: '#303854',
        ring: '#8ea1ff',
    },
    {
        id: 'acid-notes',
        name: 'Acid Notes',
        description: 'Lima eléctrica sobre papel gris claro',
        palette: ['#334155', '#d9ff3f', '#eef1eb', '#5f6a57', '#c9d4b8'],
        primary: '#334155',
        secondary: '#d9ff3f',
        surface: '#eef1eb',
        surfaceAlt: '#f8fbf2',
        muted: '#5f6a57',
        border: '#c9d4b8',
        ring: '#b9ec18',
    },
    {
        id: 'mediterranean-signal',
        name: 'Mediterranean Signal',
        description: 'Azul mar con coral y superficies salinas',
        palette: ['#0f4c81', '#ff7a59', '#eef5fa', '#597489', '#c9d8e4'],
        primary: '#0f4c81',
        secondary: '#ff7a59',
        surface: '#eef5fa',
        surfaceAlt: '#f8fbfd',
        muted: '#597489',
        border: '#c9d8e4',
        ring: '#0f4c81',
    },
    {
        id: 'ink-berry',
        name: 'Ink Berry',
        description: 'Tinta oscura con baya intensa y fondo lavanda',
        palette: ['#312e81', '#e11d48', '#f4f1fb', '#655b7d', '#d8d0ea'],
        primary: '#312e81',
        secondary: '#e11d48',
        surface: '#f4f1fb',
        surfaceAlt: '#fcf8ff',
        muted: '#655b7d',
        border: '#d8d0ea',
        ring: '#4f46e5',
    },
    {
        id: 'sand-night',
        name: 'Sand Night',
        description: 'Carbón suave, arena y contraste editorial',
        palette: ['#1f2937', '#d4a373', '#f2ece5', '#72675d', '#d8cabd'],
        primary: '#1f2937',
        secondary: '#d4a373',
        surface: '#f2ece5',
        surfaceAlt: '#fbf8f4',
        muted: '#72675d',
        border: '#d8cabd',
        ring: '#8b5e34',
    },
]

const THEME_SETTINGS_HIDDEN_KEYS = new Set([
    ...THEME_PALETTE_FIELDS.map((field) => field.settingKey),
    'carousel_video_slide_duration_ms',
    'carousel_video_last_slide_duration_ms',
    'model_image_generation',
    'model_intelligence',
    'provider_google_api_key',
    'provider_wisdom_api_key',
    'provider_naga_api_key',
    'provider_replicate_api_key',
    'provider_atlas_api_key',
    'provider_openai_api_key',
    STUDIO_DEBUG_OVERLAYS_ENABLED_SETTING_KEY,
    REPLACE_MODULE_ENABLED_SETTING_KEY,
])

const CAROUSEL_VIDEO_SLIDE_DURATION_SETTING_KEY = 'carousel_video_slide_duration_ms'
const CAROUSEL_VIDEO_LAST_SLIDE_DURATION_SETTING_KEY = 'carousel_video_last_slide_duration_ms'

const hslToHex = (raw: string): string | null => {
    const trimmed = raw.replace(/^hsl\(/, '').replace(/\)$/, '').trim()
    const parts = trimmed.split(/[\s,]+/)
    if (parts.length < 3) return null
    const h = parseFloat(parts[0]) / 360
    const s = parseFloat(parts[1]) / 100
    const l = parseFloat(parts[2]) / 100
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    const toC = (t: number) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
    }
    const r = Math.round(toC(h + 1 / 3) * 255)
    const g = Math.round(toC(h) * 255)
    const b = Math.round(toC(h - 1 / 3) * 255)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

const resolveHex = (value: string | undefined, fallback: string) => {
    if (!value) return fallback
    if (value.startsWith('#') && /^#[0-9A-Fa-f]{6}$/.test(value)) return value
    return hslToHex(value) || fallback
}

const createAdminThemeDraft = (settingsMap?: Record<string, number | string>): ThemePaletteDraft => {
    const primary = typeof settingsMap?.theme_primary === 'string' ? settingsMap.theme_primary : DEFAULT_THEME_DRAFT.primary
    const secondary = typeof settingsMap?.theme_secondary === 'string' ? settingsMap.theme_secondary : DEFAULT_THEME_DRAFT.secondary
    const derived = buildThemeColors({ primary, secondary })

    return {
        primary: resolveHex(primary, DEFAULT_THEME_DRAFT.primary || '#7B61FF'),
        secondary: resolveHex(secondary, DEFAULT_THEME_DRAFT.secondary || '#00C4CC'),
        surface: resolveHex(
            typeof settingsMap?.theme_surface === 'string' ? settingsMap.theme_surface : undefined,
            hslToHex(derived.surface) || '#F8F7FC'
        ),
        surfaceAlt: resolveHex(
            typeof settingsMap?.theme_surface_alt === 'string' ? settingsMap.theme_surface_alt : undefined,
            hslToHex(derived.surfaceAlt) || '#FCFBFE'
        ),
        muted: resolveHex(
            typeof settingsMap?.theme_muted === 'string' ? settingsMap.theme_muted : undefined,
            hslToHex(derived.muted) || '#6F6A82'
        ),
        border: resolveHex(
            typeof settingsMap?.theme_border === 'string' ? settingsMap.theme_border : undefined,
            hslToHex(derived.border) || '#DED8EA'
        ),
        ring: resolveHex(
            typeof settingsMap?.theme_ring === 'string' ? settingsMap.theme_ring : undefined,
            resolveHex(primary, DEFAULT_THEME_DRAFT.primary || '#7B61FF')
        ),
    }
}

function isAdminTab(value: string | null): value is AdminTab {
    return !!value && (ADMIN_TABS as readonly string[]).includes(value)
}

function getProviderCostLink(model: string): string | null {
    const normalized = String(model || '').trim().toLowerCase()
    if (normalized.startsWith('gemini-')) {
        return PROVIDER_COST_LINKS.google
    }
    const provider = normalized.split('/')[0] || ''
    return PROVIDER_COST_LINKS[provider] || null
}

function getModelDisplayName(model: string): string {
    const normalized = String(model || '').trim()
    if (normalized.toLowerCase().startsWith('gemini-')) {
        return `google/${normalized}`
    }
    return normalized
}

export default function AdminPage() {
    const router = useRouter()
    const { user, isLoaded } = useUser()
    const { resolvedTheme } = useTheme()
    const { toast } = useToast()
    const userEmail = user?.emailAddresses[0]?.emailAddress || ''
    const hasAdminAccess = isLoaded && ADMIN_EMAILS.includes(userEmail.toLowerCase())

    // Queries
    const stats = useQuery(api.admin.getDashboardStats, hasAdminAccess ? { admin_email: userEmail } : 'skip')
    const users = useQuery(api.admin.listUsers, hasAdminAccess ? { admin_email: userEmail } : 'skip')
    const settings = useQuery(api.admin.getSettings, hasAdminAccess ? { admin_email: userEmail } : 'skip')
    const recentTransactions = useQuery(api.admin.getRecentTransactions, hasAdminAccess ? { admin_email: userEmail, limit: 20 } : 'skip')
    const betaRequests = useQuery(api.admin.listBetaRequests, hasAdminAccess ? { admin_email: userEmail } : 'skip')
    const modelCosts = useQuery(api.economic.listModelCosts, hasAdminAccess ? { admin_email: userEmail } : 'skip')
    const economicSummary = useQuery(api.economic.getEconomicSummary, hasAdminAccess ? { admin_email: userEmail, days: 30 } : 'skip')
    const economicEvents = useQuery(api.economic.listEconomicEvents, hasAdminAccess ? { admin_email: userEmail, limit: 100 } : 'skip')

    // Feedback queries
    const feedbackList = useQuery(api.feedback.listFeedback, { limit: 50 })
    const feedbackStats = useQuery(api.feedback.getFeedbackStats, {})

    // Mutations
    const activateUser = useMutation(api.admin.activateUser)
    const suspendUser = useMutation(api.admin.suspendUser)
    const deleteUser = useMutation(api.admin.deleteUser)
    const adjustCredits = useMutation(api.admin.adjustCredits)
    const updateSetting = useMutation(api.settings.saveAppSetting) // Use the new generic settings mutation
    const initializeSettings = useMutation(api.admin.initializeSettings)
    const approveBetaRequest = useMutation(api.admin.approveBetaRequest)
    const rejectBetaRequest = useMutation(api.admin.rejectBetaRequest)
    const deleteBetaRequest = useMutation(api.admin.deleteBetaRequest)
    const upsertModelCost = useMutation(api.economic.upsertModelCost)
    const deleteModelCost = useMutation(api.economic.deleteModelCost)
    const syncModelCatalog = useMutation(api.economic.syncModelCatalog)
    const clearEconomicEvents = useMutation(api.economic.clearEconomicEvents)
    const systemPrompts = useQuery(api.systemPrompts.listAll)
    const upsertSystemPrompt = useMutation(api.systemPrompts.upsert)
    const removeSystemPrompt = useMutation(api.systemPrompts.remove)

    // Local state
    const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
    const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null)
    const [creditAmount, setCreditAmount] = useState('50')
    const [creditReason, setCreditReason] = useState('')
    const [newCostModel, setNewCostModel] = useState('')
    const [newCostKind, setNewCostKind] = useState<'intelligence' | 'image'>('intelligence')
    const [newCostEur, setNewCostEur] = useState('0')
    const [newCostComment, setNewCostComment] = useState('')
    const [costDrafts, setCostDrafts] = useState<Record<string, string>>({})
    const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
    const [imageModelSort, setImageModelSort] = useState<{ key: ImageModelSortKey; direction: SortDirection }>({
        key: 'updated',
        direction: 'desc',
    })
    const [activatingModelId, setActivatingModelId] = useState<string | null>(null)
    const [savingModelSettings, setSavingModelSettings] = useState(false)
    const [syncingCatalog, setSyncingCatalog] = useState(false)
    const hasSyncedCatalogRef = useRef(false)
    const [activeTab, setActiveTab] = useState<AdminTab>(DEFAULT_ADMIN_TAB)
    const [refreshingEconomicLog, setRefreshingEconomicLog] = useState(false)
    const [expandedEconomicFlows, setExpandedEconomicFlows] = useState<Record<string, boolean>>({})
    const [clearingEconomicLogs, setClearingEconomicLogs] = useState(false)
    const [exportingEconomicCsv, setExportingEconomicCsv] = useState(false)

    // Compositions Summary
    const [compositionsSummary, setCompositionsSummary] = useState<CompositionSummary[]>([])
    const [loadingCompositions, setLoadingCompositions] = useState(true)

    useEffect(() => {
        async function fetchCompositions() {
            try {
                const data = await getCompositionsSummaryAction()
                setCompositionsSummary(data)
            } catch (error) {
                console.error('Error fetching compositions summary:', error)
            } finally {
                setLoadingCompositions(false)
            }
        }
        fetchCompositions()
    }, [])

    const [isProcessing, setIsProcessing] = useState(false)
    const [editingPromptKey, setEditingPromptKey] = useState<string | null>(null)
    const [promptDraft, setPromptDraft] = useState('')
    const [isSeedingPrompts, setIsSeedingPrompts] = useState(false)
    const hasEnsuredReplacePromptRef = useRef(false)

    // Settings state
    const [editingSettings, setEditingSettings] = useState<Record<string, number | string | boolean>>({})

    // Admin default theme state
    const [adminThemePalette, setAdminThemePalette] = useState<ThemePaletteDraft>(DEFAULT_THEME_DRAFT)
    const [savingTheme, setSavingTheme] = useState(false)

    useEffect(() => {
        if (!hasAdminAccess) return
        if (!Array.isArray(systemPrompts)) return

        const hasReplacePrompt = systemPrompts.some((prompt) => prompt.key === DEFAULT_REPLACE_SYSTEM_PROMPT.key)
        if (hasReplacePrompt) {
            hasEnsuredReplacePromptRef.current = true
            return
        }

        if (hasEnsuredReplacePromptRef.current) return
        hasEnsuredReplacePromptRef.current = true

        void upsertSystemPrompt({
            key: DEFAULT_REPLACE_SYSTEM_PROMPT.key,
            name: DEFAULT_REPLACE_SYSTEM_PROMPT.name,
            body: DEFAULT_REPLACE_SYSTEM_PROMPT.body,
            description: DEFAULT_REPLACE_SYSTEM_PROMPT.description,
            updated_by: userEmail || 'system/admin-prompts-bootstrap',
        }).catch((error) => {
            hasEnsuredReplacePromptRef.current = false
            console.error('Error ensuring Replace prompt in admin:', error)
        })
    }, [hasAdminAccess, systemPrompts, upsertSystemPrompt, userEmail])
    const [customPresets, setCustomPresets] = useState<ThemePreset[]>([])
    const [savingPresetName, setSavingPresetName] = useState('')
    const economicModelSuggestions = Array.from(
        new Set([
            ...INTELLIGENCE_MODEL_OPTIONS.map((option) => option.value),
            ...IMAGE_MODEL_OPTIONS.map((option) => option.value),
        ])
    )
    const activeImageModel = normalizeImageModelSettingValue(
        String(editingSettings.model_image_generation ?? 'wisdom/gemini-3-pro-image-preview')
    )
    const showStudioDebugOverlays = normalizeStudioDebugOverlaysEnabled(
        settings?.find((setting) => setting.key === STUDIO_DEBUG_OVERLAYS_ENABLED_SETTING_KEY)?.value
    )
    const showReplaceModule = normalizeReplaceModuleEnabled(
        settings?.find((setting) => setting.key === REPLACE_MODULE_ENABLED_SETTING_KEY)?.value
    )

    // Initialize settings on first load
    useEffect(() => {
        if (settings && settings.length === 0 && userEmail) {
            initializeSettings({ admin_email: userEmail })
        }
    }, [settings, userEmail])

    // Update local settings state when server data changes
    useEffect(() => {
        if (settings) {
            const settingsMap: Record<string, number | string> = {}
            settings.forEach(s => {
                settingsMap[s.key] = s.value
            })
            setEditingSettings(settingsMap)
            setAdminThemePalette(createAdminThemeDraft(settingsMap))
            // Load custom presets
            const raw = settingsMap['theme_custom_presets']
            if (typeof raw === 'string') {
                try { setCustomPresets(JSON.parse(raw)) } catch { /* ignore */ }
            }
        }
    }, [settings])

    useEffect(() => {
        if (!modelCosts) return
        setCostDrafts((prev) => {
            const next = { ...prev }
            modelCosts.forEach((row) => {
                const key = String(row._id)
                if (next[key] === undefined) {
                    next[key] = String(row.cost_eur ?? 0)
                }
            })
            return next
        })
        setCommentDrafts((prev) => {
            const next = { ...prev }
            modelCosts.forEach((row) => {
                const key = String(row._id)
                if (next[key] === undefined) {
                    next[key] = String(row.comment ?? '')
                }
            })
            return next
        })
    }, [modelCosts])

    useEffect(() => {
        if (!hasAdminAccess || !userEmail || hasSyncedCatalogRef.current || syncingCatalog) return

        const intelligenceModels = Array.from(new Set(INTELLIGENCE_MODEL_OPTIONS.map((option) => option.value)))
        const imageModels = Array.from(new Set(IMAGE_MODEL_OPTIONS.map((option) => option.value)))

        hasSyncedCatalogRef.current = true
        setSyncingCatalog(true)
        syncModelCatalog({
            admin_email: userEmail,
            intelligence_models: intelligenceModels,
            image_models: imageModels,
        })
            .catch((error: any) => {
                hasSyncedCatalogRef.current = false
                toast({ title: 'Error sincronizando catálogo económico', description: getErrorMessage(error), variant: 'destructive' })
            })
            .finally(() => setSyncingCatalog(false))
    }, [hasAdminAccess, userEmail, syncModelCatalog, syncingCatalog, toast])

    useEffect(() => {
        const saved = window.localStorage.getItem(ADMIN_TAB_STORAGE_KEY)
        if (isAdminTab(saved)) {
            setActiveTab(saved)
        }
    }, [])

    useEffect(() => {
        window.localStorage.setItem(ADMIN_TAB_STORAGE_KEY, activeTab)
    }, [activeTab])

    const handleSeedPrompts = async () => {
        setIsSeedingPrompts(true)
        try {
            await fetch('/api/admin/seed-prompts', { method: 'POST' })
        } finally {
            setIsSeedingPrompts(false)
        }
    }

    const handleRefreshEconomicLog = () => {
        setRefreshingEconomicLog(true)
        router.refresh()
        setTimeout(() => setRefreshingEconomicLog(false), 700)
    }

    const handleClearEconomicLogs = async () => {
        const accepted = window.confirm('¿Seguro que quieres borrar TODOS los registros de auditoría económica? Esta acción no se puede deshacer.')
        if (!accepted) return
        setClearingEconomicLogs(true)
        try {
            const result = await clearEconomicEvents({ admin_email: userEmail })
            toast({ title: 'Logs eliminados', description: `Se borraron ${result?.deleted ?? 0} registros.` })
            setExpandedEconomicFlows({})
            handleRefreshEconomicLog()
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error) || 'No se pudieron eliminar los logs.', variant: 'destructive' })
        } finally {
            setClearingEconomicLogs(false)
        }
    }

    const handleDownloadEconomicCsv = () => {
        setExportingEconomicCsv(true)
        try {
            const rows = economicEvents ?? []
            const headers = ['created_at', 'flow_id', 'phase', 'resolved_user_email', 'model', 'kind', 'estimated_cost_eur', 'cumulative_cost_eur', 'user_clerk_id', 'metadata']
            const escapeCsv = (value: unknown) => {
                const str = value == null ? '' : String(value)
                return `"${str.replace(/"/g, '""')}"`
            }
            const csvRows = rows.map((event) => [
                event.created_at,
                event.flow_id || 'no-flow',
                event.phase,
                event.resolved_user_email,
                event.model,
                event.kind,
                Number(event.estimated_cost_eur || 0).toFixed(6),
                Number(event.cumulative_cost_eur || 0).toFixed(6),
                event.user_clerk_id || '',
                event.metadata ? JSON.stringify(event.metadata) : '',
            ])
            const csv = [headers, ...csvRows].map((row) => row.map(escapeCsv).join(',')).join('\n')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            const stamp = new Date().toISOString().replace(/[:.]/g, '-')
            link.href = url
            link.download = `economic-audit-${stamp}.csv`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
            toast({ title: 'CSV descargado', description: `Se exportaron ${rows.length} eventos.` })
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error) || 'No se pudo generar el CSV.', variant: 'destructive' })
        } finally {
            setExportingEconomicCsv(false)
        }
    }

    const toggleEconomicFlow = (flowId: string) => {
        setExpandedEconomicFlows((prev) => ({
            ...prev,
            [flowId]: !prev[flowId],
        }))
    }

    // Hooks siempre antes de cualquier early-return (rules-of-hooks).
    const imageModelCosts = (modelCosts ?? []).filter((row) => row.kind === 'image')
    const sortedImageModelCosts = useMemo(() => {
        return [...imageModelCosts].sort((a, b) => {
            let comparison = 0
            if (imageModelSort.key === 'model') {
                comparison = String(a.model || '').localeCompare(String(b.model || ''), 'es', {
                    sensitivity: 'base',
                    numeric: true,
                })
            } else if (imageModelSort.key === 'cost') {
                comparison = Number(a.cost_eur || 0) - Number(b.cost_eur || 0)
            } else {
                comparison = new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime()
            }

            if (comparison === 0) {
                comparison = String(a.model || '').localeCompare(String(b.model || ''), 'es', {
                    sensitivity: 'base',
                    numeric: true,
                })
            }

            return imageModelSort.direction === 'asc' ? comparison : -comparison
        })
    }, [imageModelCosts, imageModelSort])

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8" />
            </div>
        )
    }

    // Check if current user is admin (we rely on backend validation, but show UI accordingly)
    if (!ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <IconClose className="w-16 h-16 text-destructive" />
                <h1 className="text-2xl font-bold">Acceso Denegado</h1>
                <p className="text-muted-foreground">No tienes permisos de administrador.</p>
            </div>
        )
    }

    const handleActivate = async (userId: Id<"users">) => {
        setIsProcessing(true)
        try {
            await activateUser({ admin_email: userEmail, user_id: userId })
            toast({ title: 'Usuario activado', description: 'Se le asignaron los créditos iniciales.' })
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' })
        }
        setIsProcessing(false)
    }

    const handleSuspend = async (userId: Id<"users">) => {
        setIsProcessing(true)
        try {
            await suspendUser({ admin_email: userEmail, user_id: userId })
            toast({ title: 'Usuario suspendido' })
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' })
        }
        setIsProcessing(false)
    }

    const handleDeleteUser = async (userId: Id<"users">, email: string) => {
        if (!confirm(`¿Estás seguro de que quieres ELIMINAR PERMANENTEMENTE al usuario ${email}?\n\nEsta acción no se puede deshacer.`)) {
            return
        }
        setIsProcessing(true)
        try {
            await deleteUser({ admin_email: userEmail, user_id: userId })
            toast({ title: 'Usuario eliminado', description: `${email} ha sido eliminado permanentemente` })
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' })
        }
        setIsProcessing(false)
    }

    const handleAdjustCredits = async () => {
        if (!selectedUserId || !creditAmount) return
        setIsProcessing(true)
        try {
            await adjustCredits({
                admin_email: userEmail,
                user_id: selectedUserId,
                amount: parseInt(creditAmount),
                reason: creditReason || undefined
            })
            toast({ title: 'Créditos ajustados' })
            setAdjustDialogOpen(false)
            setCreditAmount('')
            setCreditReason('')
            setSelectedUserId(null)
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' })
        }
        setIsProcessing(false)
    }

    const handleSaveSetting = async (key: string, value: number | string | boolean) => {
        try {
            await updateSetting({ admin_email: userEmail, key, value })
            toast({ title: 'Configuración guardada' })
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' })
        }
    }

    const handleSaveAdminTheme = async () => {
        setSavingTheme(true)
        try {
            await Promise.all(
                THEME_PALETTE_FIELDS.map((field) =>
                    updateSetting({
                        admin_email: userEmail,
                        key: field.settingKey,
                        value: adminThemePalette[field.key] || DEFAULT_THEME_DRAFT[field.key] || '',
                    })
                )
            )
            toast({ title: 'Paleta global guardada', description: 'Toda la aplicación usará esta paleta completa desde Admin.' })
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' })
        } finally {
            setSavingTheme(false)
        }
    }

    const handleApplyThemePreset = (preset: ThemePreset) => {
        const presetSettings: Record<string, string> = {}
        if (preset.primary) presetSettings.theme_primary = preset.primary
        if (preset.secondary) presetSettings.theme_secondary = preset.secondary
        if (preset.surface) presetSettings.theme_surface = preset.surface
        if (preset.surfaceAlt) presetSettings.theme_surface_alt = preset.surfaceAlt
        if (preset.muted) presetSettings.theme_muted = preset.muted
        if (preset.border) presetSettings.theme_border = preset.border
        if (preset.ring) presetSettings.theme_ring = preset.ring

        setAdminThemePalette(createAdminThemeDraft(presetSettings))
    }

    const handleThemeFieldChange = (field: ThemePaletteFieldKey, value: string) => {
        setAdminThemePalette((current) => ({
            ...current,
            [field]: value,
        }))
    }

    const handleDeriveFromPrimarySecondary = () => {
        const primary = adminThemePalette.primary || DEFAULT_THEME_DRAFT.primary || '#7B61FF'
        const secondary = adminThemePalette.secondary || DEFAULT_THEME_DRAFT.secondary || '#00C4CC'
        const derived = deriveSchemeAsHex(primary, secondary)
        setAdminThemePalette((current) => ({
            ...current,
            surface: derived.surface,
            surfaceAlt: derived.surfaceAlt,
            muted: derived.muted,
            border: derived.border,
            ring: derived.ring,
        }))
    }

    const handleSaveCustomPreset = async () => {
        const name = savingPresetName.trim()
        if (!name) {
            toast({ title: 'Nombre requerido', description: 'Escribe un nombre para la paleta.', variant: 'destructive' })
            return
        }
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const newPreset: ThemePreset = {
            id: `custom-${id}-${Date.now()}`,
            name,
            description: 'Paleta personalizada',
            palette: [
                adminThemePalette.primary || '#7B61FF',
                adminThemePalette.secondary || '#00C4CC',
                adminThemePalette.surface || '#f6f8ff',
                adminThemePalette.muted || '#5f6b85',
                adminThemePalette.border || '#d7def4',
            ],
            primary: adminThemePalette.primary,
            secondary: adminThemePalette.secondary,
            surface: adminThemePalette.surface,
            surfaceAlt: adminThemePalette.surfaceAlt,
            muted: adminThemePalette.muted,
            border: adminThemePalette.border,
            ring: adminThemePalette.ring,
        }
        const updated = [...customPresets, newPreset]
        setCustomPresets(updated)
        setSavingPresetName('')
        try {
            await updateSetting({ admin_email: userEmail, key: 'theme_custom_presets', value: JSON.stringify(updated) })
            toast({ title: 'Paleta guardada', description: `"${name}" disponible como preset.` })
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' })
        }
    }

    const handleDeleteCustomPreset = async (presetId: string) => {
        const updated = customPresets.filter((p) => p.id !== presetId)
        setCustomPresets(updated)
        try {
            await updateSetting({ admin_email: userEmail, key: 'theme_custom_presets', value: JSON.stringify(updated) })
            toast({ title: 'Paleta eliminada' })
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' })
        }
    }

    const handleUpsertCost = async (model: string, kind: 'intelligence' | 'image', costEur: number, comment?: string) => {
        if (!model.trim()) {
            toast({ title: 'Modelo requerido', description: 'Debes indicar el nombre del modelo.', variant: 'destructive' })
            return
        }

        try {
            await upsertModelCost({
                admin_email: userEmail,
                model: model.trim(),
                kind,
                cost_eur: Number.isFinite(costEur) ? Math.max(0, costEur) : 0,
                comment: comment?.trim() || undefined,
                active: true,
            })
            toast({ title: 'Coste guardado' })
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' })
        }
    }

    const handleCreateCost = async () => {
        const parsed = Number(newCostEur)
        await handleUpsertCost(newCostModel, newCostKind, Number.isFinite(parsed) ? parsed : 0, newCostComment)
        setNewCostModel('')
        setNewCostEur('0')
        setNewCostComment('')
        setNewCostKind('intelligence')
    }

    const handleDeleteCost = async (id: Id<"model_costs">) => {
        try {
            await deleteModelCost({ admin_email: userEmail, id })
            toast({ title: 'Entrada eliminada' })
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' })
        }
    }

    const handleSaveInlineCost = async (row: { _id: Id<"model_costs">, model: string, kind: string }) => {
        const key = String(row._id)
        const rawValue = costDrafts[key] ?? String(0)
        const parsed = Number(rawValue)
        const comment = commentDrafts[key] ?? ''
        if (!Number.isFinite(parsed) || parsed < 0) {
            toast({ title: 'Coste inválido', description: 'Introduce un número válido mayor o igual que 0.', variant: 'destructive' })
            return
        }

        await handleUpsertCost(
            row.model,
            row.kind === 'image' ? 'image' : 'intelligence',
            parsed,
            comment
        )
    }

    const handleActivateModel = async (kind: 'image' | 'intelligence', model: string, rowId: string) => {
        const settingKey = kind === 'image' ? 'model_image_generation' : 'model_intelligence'
        setActivatingModelId(rowId)
        try {
            setEditingSettings((prev) => ({
                ...prev,
                [settingKey]: model,
            }))
            await updateSetting({ admin_email: userEmail, key: settingKey, value: model })
            toast({ title: 'Modelo activo actualizado' })
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' })
        } finally {
            setActivatingModelId(null)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge variant="default" className="bg-green-500">Activo</Badge>
            case 'waitlist':
                return <Badge variant="secondary">Waitlist</Badge>
            case 'suspended':
                return <Badge variant="destructive">Suspendido</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const formatEuro = (value: number) =>
        new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 4,
            maximumFractionDigits: 4,
        }).format(value || 0)

    const MODEL_SETTINGS_KEYS = [
        'model_image_generation',
        'model_intelligence',
        'provider_google_api_key',
        'provider_wisdom_api_key',
        'provider_naga_api_key',
        'provider_replicate_api_key',
        'provider_atlas_api_key',
        'provider_openai_api_key',
    ] as const

    const isModelSettingsDirty = MODEL_SETTINGS_KEYS.some((key) => {
        const current = String(editingSettings[key] ?? '')
        const saved = String(settings?.find((s) => s.key === key)?.value ?? '')
        return current !== saved
    })

    const intelligenceModelCosts = (modelCosts ?? []).filter((row) => row.kind === 'intelligence')
    const groupedEconomicEvents = (() => {
        type EconomicEventRow = NonNullable<typeof economicEvents>[number]
        const groups = new Map<string, EconomicEventRow[]>()
        for (const event of economicEvents ?? []) {
            const flowKey = event.flow_id || 'no-flow'
            const current = groups.get(flowKey) || []
            current.push(event)
            groups.set(flowKey, current)
        }
        return Array.from(groups.entries()).map(([flowId, events]) => ({
            flowId,
            events,
            total: events.reduce((acc, event) => acc + (event.estimated_cost_eur || 0), 0),
        }))
    })()

    const allEconomicFlowsExpanded = groupedEconomicEvents.length > 0
        && groupedEconomicEvents.every((group) => Boolean(expandedEconomicFlows[group.flowId]))

    const handleToggleAllEconomicFlows = () => {
        if (groupedEconomicEvents.length === 0) return
        const nextExpanded = !allEconomicFlowsExpanded
        const nextState: Record<string, boolean> = {}
        groupedEconomicEvents.forEach((group) => {
            nextState[group.flowId] = nextExpanded
        })
        setExpandedEconomicFlows(nextState)
    }

    const handleSaveModelSettings = async () => {
        if (!isModelSettingsDirty) return
        setSavingModelSettings(true)
        try {
            for (const key of MODEL_SETTINGS_KEYS) {
                const current = String(editingSettings[key] ?? '')
                const saved = String(settings?.find((s) => s.key === key)?.value ?? '')
                if (current !== saved) {
                    await updateSetting({ admin_email: userEmail, key, value: current })
                }
            }
            toast({ title: 'Modelos y API keys guardados' })
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' })
        } finally {
            setSavingModelSettings(false)
        }
    }

    const handleImageModelSort = (key: ImageModelSortKey) => {
        setImageModelSort((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }))
    }

    const renderImageModelSortHead = (key: ImageModelSortKey, label: string) => {
        const isActive = imageModelSort.key === key
        const directionLabel = isActive && imageModelSort.direction === 'asc' ? 'ascendente' : 'descendente'

        return (
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-0 font-semibold text-foreground hover:bg-transparent"
                onClick={() => handleImageModelSort(key)}
                aria-label={`Ordenar por ${label} en orden ${directionLabel}`}
            >
                <span>{label}</span>
                <IconChevronDown
                    className={`ml-1.5 h-3.5 w-3.5 transition-transform ${isActive && imageModelSort.direction === 'asc' ? 'rotate-180' : ''} ${isActive ? 'opacity-100' : 'opacity-35'}`}
                />
            </Button>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto py-8 px-4">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/image">
                            <Button variant="ghost" size="icon" title="Volver a Imagen">
                                <IconArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">Panel de Administración</h1>
                            <p className="text-muted-foreground">Gestión de usuarios y créditos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/admin/compositions">
                            <Button variant="outline" className="gap-2">
                                <IconShapes className="h-4 w-4" />
                                Gestor de diseños
                            </Button>
                        </Link>
                        <Link href="/admin/carousel-compositions">
                            <Button variant="outline" className="gap-2">
                                <IconShapes className="h-4 w-4" />
                                Gestor carruseles
                            </Button>
                        </Link>
                        <Link href="/admin/replace-templates">
                            <Button variant="outline" className="gap-2">
                                <IconLayers className="h-4 w-4" />
                                Plantillas Replace
                            </Button>
                        </Link>
                        <Link href="/admin/postiz">
                            <Button variant="outline" className="gap-2">
                                <IconLink className="h-4 w-4" />
                                Postiz
                            </Button>
                        </Link>
                        <CreditsBadge />
                        <UserButton
                            appearance={{
                                theme: resolvedTheme === 'dark' ? dark : undefined
                            }}
                        />
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
                            <IconUsers className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.totalUsers ?? '-'}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Activos</CardTitle>
                            <IconCheckSimple className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-500">{stats?.activeUsers ?? '-'}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Waitlist</CardTitle>
                            <IconRefresh className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-500">{stats?.waitlistUsers ?? '-'}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Créditos Totales</CardTitle>
                            <IconCoins className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.totalCreditsInCirculation ?? '-'}</div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs value={activeTab} onValueChange={(value) => setActiveTab((isAdminTab(value) ? value : DEFAULT_ADMIN_TAB))} className="space-y-4">
                    <TabsList className="w-full justify-start overflow-x-auto whitespace-nowrap">
                        <TabsTrigger value="requests" className="gap-2">
                            <IconMail className="h-4 w-4" /> Solicitudes
                            {(stats?.pendingBetaRequests ?? 0) > 0 && (
                                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                                    {stats?.pendingBetaRequests}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="users" className="gap-2">
                            <IconUsers className="h-4 w-4" /> Usuarios
                        </TabsTrigger>
                        <TabsTrigger value="transactions" className="gap-2">
                            <IconActivity className="h-4 w-4" /> Transacciones
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="gap-2">
                            <IconSettings className="h-4 w-4" /> Configuración
                        </TabsTrigger>
                        <TabsTrigger value="models" className="gap-2">
                            <IconShapes className="h-4 w-4" /> Modelos
                        </TabsTrigger>
                        <TabsTrigger value="styles" className="gap-2">
                            <IconPalette className="h-4 w-4" /> Estilos
                        </TabsTrigger>
                        <TabsTrigger value="economics" className="gap-2">
                            <IconBanknote className="h-4 w-4" /> Economía
                        </TabsTrigger>
                        <TabsTrigger value="billing" className="gap-2">
                            <IconCoins className="h-4 w-4" /> Billing
                        </TabsTrigger>
                        <TabsTrigger value="links" className="gap-2">
                            <IconExternalLink className="h-4 w-4" /> Enlaces
                        </TabsTrigger>
                        <TabsTrigger value="feedback" className="gap-2">
                            <IconMessage className="h-4 w-4" /> Feedback
                            {(feedbackStats?.total ?? 0) > 0 && (
                                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                    {feedbackStats?.total}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="compositions" className="gap-2">
                            <IconShapes className="h-4 w-4" /> Diseños
                        </TabsTrigger>
                        <TabsTrigger value="prompts" className="gap-2">
                            <IconWand className="w-4 h-4" />
                            Prompts
                        </TabsTrigger>
                    </TabsList>

                    {/* Beta Requests Tab */}
                    <TabsContent value="requests">
                        <Card>
                            <CardHeader>
                                <CardTitle>Solicitudes de Acceso Beta</CardTitle>
                                <CardDescription>Usuarios que quieren acceso a la beta privada</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {betaRequests?.filter(r => r.status === 'pending').map((request) => (
                                            <TableRow key={request._id}>
                                                <TableCell className="font-medium">{request.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">Pendiente</Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {new Date(request.created_at).toLocaleDateString('es-ES')}
                                                </TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={async () => {
                                                            try {
                                                                await approveBetaRequest({
                                                                    admin_email: userEmail,
                                                                    request_id: request._id
                                                                })
                                                                toast({ title: 'Acceso aprobado', description: `${request.email} ahora puede acceder` })
                                                            } catch (e) {
                                                                toast({ title: 'Error', description: getErrorMessage(e), variant: 'destructive' })
                                                            }
                                                        }}
                                                    >
                                                        <IconCheckSimple className="h-4 w-4 mr-1" /> Aprobar
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={async () => {
                                                            try {
                                                                await rejectBetaRequest({
                                                                    admin_email: userEmail,
                                                                    request_id: request._id
                                                                })
                                                                toast({ title: 'Rechazado', description: `${request.email} ha sido rechazado` })
                                                            } catch (e) {
                                                                toast({ title: 'Error', description: getErrorMessage(e), variant: 'destructive' })
                                                            }
                                                        }}
                                                    >
                                                        <IconClose className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!betaRequests || betaRequests.filter(r => r.status === 'pending').length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                                    No hay solicitudes pendientes
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>

                                {/* Processed requests section */}
                                {betaRequests && betaRequests.filter(r => r.status !== 'pending').length > 0 && (
                                    <div className="mt-8">
                                        <h4 className="font-medium mb-4 text-muted-foreground">Historial de Solicitudes</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Email</TableHead>
                                                    <TableHead>Estado</TableHead>
                                                    <TableHead>Procesado</TableHead>
                                                    <TableHead className="text-right">Acciones</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {betaRequests.filter(r => r.status !== 'pending').map((request) => (
                                                    <TableRow key={request._id}>
                                                        <TableCell>{request.email}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={request.status === 'approved' ? 'default' : 'destructive'}>
                                                                {request.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground">
                                                            {request.processed_at ? new Date(request.processed_at).toLocaleDateString('es-ES') : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={async () => {
                                                                    try {
                                                                        await deleteBetaRequest({
                                                                            admin_email: userEmail,
                                                                            request_id: request._id
                                                                        })
                                                                    } catch (e) {
                                                                        toast({ title: 'Error', description: getErrorMessage(e), variant: 'destructive' })
                                                                    }
                                                                }}
                                                            >
                                                                <IconClose className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Users Tab */}
                    <TabsContent value="users">
                        <Card>
                            <CardHeader>
                                <CardTitle>Gestión de Usuarios</CardTitle>
                                <CardDescription>Activa, suspende y ajusta créditos de usuarios</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Créditos</TableHead>
                                            <TableHead>Registro</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users?.map((u) => (
                                            <TableRow key={u._id}>
                                                <TableCell className="font-medium">{u.email}</TableCell>
                                                <TableCell>{getStatusBadge(u.status)}</TableCell>
                                                <TableCell>
                                                    <span className="font-mono">{u.credits}</span>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {new Date(u.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    {u.status === 'waitlist' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleActivate(u._id)}
                                                            disabled={isProcessing}
                                                        >
                                                            <IconCheckSimple className="h-4 w-4 mr-1" /> Activar
                                                        </Button>
                                                    )}
                                                    {u.status === 'active' && (
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleSuspend(u._id)}
                                                            disabled={isProcessing}
                                                        >
                                                            <IconClose className="h-4 w-4 mr-1" /> Suspender
                                                        </Button>
                                                    )}
                                                    {u.status === 'suspended' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleActivate(u._id)}
                                                            disabled={isProcessing}
                                                        >
                                                            <IconCheckSimple className="h-4 w-4 mr-1" /> Reactivar
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelectedUserId(u._id)
                                                            setAdjustDialogOpen(true)
                                                        }}
                                                    >
                                                        <IconCoins className="h-4 w-4 mr-1" /> Créditos
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteUser(u._id, u.email)}
                                                        disabled={isProcessing || u.email.toLowerCase() === userEmail.toLowerCase()}
                                                        title="Eliminar usuario permanentemente"
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    >
                                                        <IconDelete className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!users || users.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                                    No hay usuarios registrados
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Transactions Tab */}
                    <TabsContent value="transactions">
                        <Card>
                            <CardHeader>
                                <CardTitle>Historial de Transacciones</CardTitle>
                                <CardDescription>Últimas 20 transacciones de créditos</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Usuario</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Cantidad</TableHead>
                                            <TableHead>Balance</TableHead>
                                            <TableHead>Fecha</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentTransactions?.map((tx) => (
                                            <TableRow key={tx._id}>
                                                <TableCell className="font-medium">{tx.user_email}</TableCell>
                                                <TableCell>
                                                    <Badge variant={tx.amount > 0 ? 'default' : 'secondary'}>
                                                        {tx.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className={tx.amount > 0 ? 'text-green-500' : 'text-red-500'}>
                                                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                                                </TableCell>
                                                <TableCell className="font-mono">{tx.balance_after}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {new Date(tx.created_at).toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!recentTransactions || recentTransactions.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                                    No hay transacciones
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Settings Tab */}
                    <TabsContent value="settings" className="space-y-4">
                        <CarouselVideoSettingsCard
                            adminEmail={userEmail}
                            slideDurationKey={CAROUSEL_VIDEO_SLIDE_DURATION_SETTING_KEY}
                            lastSlideDurationKey={CAROUSEL_VIDEO_LAST_SLIDE_DURATION_SETTING_KEY}
                        />

                        <AdminAudioTracksCard adminEmail={userEmail} />

                        {/* Default Theme Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <IconPalette className="h-5 w-5" />
                                    Tema por defecto
                                </CardTitle>
                                <CardDescription>Paleta global de la aplicación. Los usuarios ya no pueden sobrescribir estos colores desde settings.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-sm font-medium">Presets propuestos</Label>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Atajos para arrancar desde combinaciones de color coherentes antes de editar o guardar la paleta global.
                                        </p>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {THEME_PRESETS.map((preset) => (
                                            <button
                                                key={preset.id}
                                                type="button"
                                                onClick={() => handleApplyThemePreset(preset)}
                                                className="rounded-xl border border-border/70 bg-muted/20 p-3 text-left transition-colors hover:border-primary/30 hover:bg-accent/30"
                                            >
                                                <div className="mb-3 flex items-center gap-2">
                                                    {preset.palette.map((color) => (
                                                        <span
                                                            key={`${preset.id}-${color}`}
                                                            className="h-7 w-7 rounded-full border border-border/60"
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="text-sm font-semibold">{preset.name}</div>
                                                <div className="mt-1 text-xs text-muted-foreground">{preset.description}</div>
                                            </button>
                                        ))}
                                    </div>
                                    {customPresets.length > 0 && (
                                        <>
                                            <Label className="mt-4 text-sm font-medium">Mis paletas guardadas</Label>
                                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                {customPresets.map((preset) => (
                                                    <div
                                                        key={preset.id}
                                                        className="group relative rounded-xl border border-border/70 bg-muted/20 p-3 text-left transition-colors hover:border-primary/30 hover:bg-accent/30"
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => handleApplyThemePreset(preset)}
                                                            className="w-full text-left"
                                                        >
                                                            <div className="mb-3 flex items-center gap-2">
                                                                {preset.palette.map((color) => (
                                                                    <span
                                                                        key={`${preset.id}-${color}`}
                                                                        className="h-7 w-7 rounded-full border border-border/60"
                                                                        style={{ backgroundColor: color }}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <div className="text-sm font-semibold">{preset.name}</div>
                                                            <div className="mt-1 text-xs text-muted-foreground">{preset.description}</div>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteCustomPreset(preset.id)}
                                                            className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                                                            title="Eliminar paleta"
                                                        >
                                                            <IconClose className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-sm font-medium">Paleta expuesta</Label>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Estos tokens gobiernan la interfaz global. Puedes retocar cada uno antes de guardar.
                                        </p>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                        {THEME_PALETTE_FIELDS.map((field) => (
                                            <div key={field.key} className="rounded-xl border border-border/70 bg-muted/20 p-4">
                                                <Label className="text-sm font-medium">{field.label}</Label>
                                                <div className="mt-3 flex items-center gap-3">
                                                    <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-border/70">
                                                        <input
                                                            type="color"
                                                            value={adminThemePalette[field.key] || DEFAULT_THEME_DRAFT[field.key] || '#000000'}
                                                            onChange={(e) => handleThemeFieldChange(field.key, e.target.value)}
                                                            className="absolute -left-1/2 -top-1/2 h-[200%] w-[200%] cursor-pointer border-none p-0"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                                                            {adminThemePalette[field.key]}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {field.settingKey}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3">
                                    <Button variant="outline" size="sm" onClick={handleDeriveFromPrimarySecondary}>
                                        <IconWand className="mr-1.5 h-4 w-4" />
                                        Auto-derivar desde primario + secundario
                                    </Button>
                                    <span className="text-xs text-muted-foreground">
                                        Rellena surface, muted, border y ring a partir de los dos colores principales. Luego ajusta a mano.
                                    </span>
                                </div>

                                <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="text-sm font-medium">Vista previa rápida</span>
                                        <span className="h-8 w-8 rounded-full border border-border/70" style={{ backgroundColor: adminThemePalette.primary }} />
                                        <span className="h-8 w-8 rounded-full border border-border/70" style={{ backgroundColor: adminThemePalette.secondary }} />
                                        <span className="h-8 w-8 rounded-full border border-border/70" style={{ backgroundColor: adminThemePalette.surface }} />
                                        <span className="h-8 w-8 rounded-full border border-border/70" style={{ backgroundColor: adminThemePalette.surfaceAlt }} />
                                        <span className="h-8 w-8 rounded-full border border-border/70" style={{ backgroundColor: adminThemePalette.border }} />
                                    </div>
                                    <div className="mt-4 rounded-2xl border border-border/70 p-4" style={{ backgroundColor: adminThemePalette.surface }}>
                                        <div className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: adminThemePalette.border, backgroundColor: adminThemePalette.surfaceAlt }}>
                                            <div>
                                                <div className="text-sm font-semibold" style={{ color: adminThemePalette.primary }}>Post laboratory</div>
                                                <div className="text-xs" style={{ color: adminThemePalette.muted }}>Preview de cómo respiran superficies, bordes y acentos.</div>
                                            </div>
                                            <div className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: adminThemePalette.primary }}>
                                                CTA
                                            </div>
                                        </div>
                                        <div className="mt-3 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: adminThemePalette.border, backgroundColor: adminThemePalette.surfaceAlt, color: adminThemePalette.muted }}>
                                            Esta previsualización usa la paleta completa, no solo primario y secundario.
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap items-center gap-3">
                                        <Button onClick={handleSaveAdminTheme} disabled={savingTheme} size="sm">
                                            {savingTheme ? 'Guardando...' : 'Guardar paleta global'}
                                        </Button>
                                        <span className="text-sm text-muted-foreground">
                                            Persiste todos los tokens del tema en Convex para toda la app.
                                        </span>
                                    </div>
                                    <div className="mt-3 flex items-center gap-2">
                                        <Input
                                            placeholder="Nombre de la paleta..."
                                            value={savingPresetName}
                                            onChange={(e) => setSavingPresetName(e.target.value)}
                                            className="max-w-[220px] h-8 text-sm"
                                        />
                                        <Button variant="outline" size="sm" onClick={handleSaveCustomPreset}>
                                            <IconSave className="mr-1.5 h-3.5 w-3.5" />
                                            Guardar como preset
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Configuración del Sistema</CardTitle>
                                <CardDescription>Valores configurables para créditos</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
                                    <div className="flex-1">
                                        <Label className="text-base">Depuración visual del estudio</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Muestra u oculta los overlays de depuración del estudio para imagen y carrusel, incluido el botón de prompt y la barra de composición admin.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-muted-foreground">
                                            {showStudioDebugOverlays ? 'Visible' : 'Oculta'}
                                        </span>
                                        <Switch
                                            checked={showStudioDebugOverlays}
                                            onCheckedChange={(checked) => void handleSaveSetting(STUDIO_DEBUG_OVERLAYS_ENABLED_SETTING_KEY, checked)}
                                            aria-label="Mostrar depuración visual del estudio"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
                                    <div className="flex-1">
                                        <Label className="text-base">Visibilidad del módulo Replace</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Mostrar módulo Replace en la navegación del estudio y permitir acceso a su vista experimental.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-muted-foreground">
                                            {showReplaceModule ? 'Visible' : 'Oculto'}
                                        </span>
                                        <Switch
                                            checked={showReplaceModule}
                                            onCheckedChange={(checked) => void handleSaveSetting(REPLACE_MODULE_ENABLED_SETTING_KEY, checked)}
                                            aria-label="Mostrar módulo Replace en el estudio"
                                        />
                                    </div>
                                </div>
                                {settings?.filter(s => !THEME_SETTINGS_HIDDEN_KEYS.has(s.key)).map((setting) => (
                                    <div key={setting.key} className="flex items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <Label className="text-base">{setting.key}</Label>
                                            <p className="text-sm text-muted-foreground">{setting.description}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type={typeof setting.value === 'number' ? "number" : "text"}
                                                className="w-24"
                                                value={
                                                    typeof (editingSettings[setting.key] ?? setting.value) === 'number'
                                                        ? Number(editingSettings[setting.key] ?? setting.value)
                                                        : String(editingSettings[setting.key] ?? setting.value)
                                                }
                                                onChange={(e) => setEditingSettings(prev => ({
                                                    ...prev,
                                                    [setting.key]: typeof setting.value === 'number' ? (parseInt(e.target.value) || 0) : e.target.value
                                                }))}
                                            />
                                            <Button
                                                size="sm"
                                                onClick={() => handleSaveSetting(setting.key, editingSettings[setting.key] ?? setting.value)}
                                                disabled={editingSettings[setting.key] === setting.value}
                                            >
                                                Guardar
                                            </Button>
                                        </div>
                                    </div>
                                ))}

{(!settings || settings.length === 0) && (
                                    <div className="text-center py-8">
                                        <p className="text-muted-foreground mb-4">No hay configuración. Inicializar valores por defecto:</p>
                                        <Button onClick={() => initializeSettings({ admin_email: userEmail })}>
                                            Inicializar Configuración
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Economic Audit Tab */}
                    <TabsContent value="economics" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Coste estimado (30 días)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatEuro(economicSummary?.totalCost ?? 0)}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Llamadas auditadas</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{economicSummary?.totalCalls ?? 0}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Coste medio por llamada</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {formatEuro(
                                            (economicSummary?.totalCalls ?? 0) > 0
                                                ? (economicSummary?.totalCost ?? 0) / (economicSummary?.totalCalls ?? 1)
                                                : 0
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Catálogo de costes por modelo</CardTitle>
                                <CardDescription>Coste estimado en euros por llamada de modelo. Se aplica automáticamente a la auditoría.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                    <div className="md:col-span-2">
                                        <Label>Modelo</Label>
                                        <Input
                                            placeholder="ej: wisdom/gemini-3-flash-preview"
                                            value={newCostModel}
                                            list="economic-model-suggestions"
                                            onChange={(e) => setNewCostModel(e.target.value)}
                                        />
                                        <datalist id="economic-model-suggestions">
                                            {economicModelSuggestions.map((model) => (
                                                <option key={model} value={model} />
                                            ))}
                                        </datalist>
                                    </div>
                                    <div>
                                        <Label>Tipo</Label>
                                        <Select value={newCostKind} onValueChange={(v: 'intelligence' | 'image') => setNewCostKind(v)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="intelligence">Intelligence</SelectItem>
                                                <SelectItem value="image">Image</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Coste EUR</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.0001"
                                            value={newCostEur}
                                            onChange={(e) => setNewCostEur(e.target.value)}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <Label>Comentario</Label>
                                        <Input
                                            placeholder="ej: precio oficial proveedor (feb 2026)"
                                            value={newCostComment}
                                            onChange={(e) => setNewCostComment(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleCreateCost} className="gap-2">
                                    <IconPlus className="h-4 w-4" />
                                    Guardar coste
                                </Button>

                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold">Modelos de imagen</h3>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{renderImageModelSortHead('model', 'Modelo')}</TableHead>
                                                    <TableHead>{renderImageModelSortHead('cost', 'Coste')}</TableHead>
                                                    <TableHead>Comentario</TableHead>
                                                    <TableHead>{renderImageModelSortHead('updated', 'Actualizado')}</TableHead>
                                                    <TableHead className="text-right">Acciones</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sortedImageModelCosts.map((row) => (
                                                    <TableRow
                                                        key={row._id}
                                                        className={row.model === activeImageModel ? 'bg-primary/10' : undefined}
                                                    >
                                                        <TableCell className="font-mono text-xs">
                                                            <div className="flex items-center gap-2">
                                                                {(() => {
                                                                    const providerLink = getProviderCostLink(row.model)
                                                                    if (!providerLink) return <span>{getModelDisplayName(row.model)}</span>
                                                                    return (
                                                                        <a
                                                                            href={providerLink}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-primary hover:underline"
                                                                            title="Ver costes del proveedor"
                                                                        >
                                                                            <span>{getModelDisplayName(row.model)}</span>
                                                                        </a>
                                                                    )
                                                                })()}
                                                                {row.model === activeImageModel && (
                                                                    <Badge variant="default">Activo</Badge>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.0001"
                                                                className="h-8 w-28"
                                                                value={costDrafts[String(row._id)] ?? String(row.cost_eur ?? 0)}
                                                                onChange={(e) => setCostDrafts((prev) => ({
                                                                    ...prev,
                                                                    [String(row._id)]: e.target.value
                                                                }))}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        void handleSaveInlineCost(row)
                                                                    }
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                className="h-8"
                                                                value={commentDrafts[String(row._id)] ?? String(row.comment ?? '')}
                                                                placeholder="Sin comentario"
                                                                onChange={(e) => setCommentDrafts((prev) => ({
                                                                    ...prev,
                                                                    [String(row._id)]: e.target.value
                                                                }))}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        void handleSaveInlineCost(row)
                                                                    }
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground text-sm">
                                                            {new Date(row.updated_at).toLocaleString('es-ES')}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                size="sm"
                                                                variant={row.model === activeImageModel ? 'default' : 'secondary'}
                                                                className="mr-2"
                                                                disabled={row.model === activeImageModel || activatingModelId === String(row._id)}
                                                                onClick={() => void handleActivateModel('image', row.model, String(row._id))}
                                                                title="Activar modelo"
                                                            >
                                                                {activatingModelId === String(row._id)
                                                                    ? <Loader2 className="h-4 w-4" />
                                                                    : <IconCheckSimple className="h-4 w-4" />}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="mr-2"
                                                                onClick={() => void handleSaveInlineCost(row)}
                                                                title="Guardar coste"
                                                            >
                                                                <IconSave className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleDeleteCost(row._id)}
                                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            >
                                                                <IconDelete className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {imageModelCosts.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                                                            No hay modelos de imagen
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold">Modelos de inteligencia</h3>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Modelo</TableHead>
                                                    <TableHead>Coste</TableHead>
                                                    <TableHead>Comentario</TableHead>
                                                    <TableHead>Actualizado</TableHead>
                                                    <TableHead className="text-right">Acciones</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {intelligenceModelCosts.map((row) => (
                                                    <TableRow
                                                        key={row._id}
                                                        className={row.model === String(editingSettings.model_intelligence ?? '') ? 'bg-primary/10' : undefined}
                                                    >
                                                        <TableCell className="font-mono text-xs">
                                                            <div className="flex items-center gap-2">
                                                                {(() => {
                                                                    const providerLink = getProviderCostLink(row.model)
                                                                    if (!providerLink) return <span>{getModelDisplayName(row.model)}</span>
                                                                    return (
                                                                        <a
                                                                            href={providerLink}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-primary hover:underline"
                                                                            title="Ver costes del proveedor"
                                                                        >
                                                                            <span>{getModelDisplayName(row.model)}</span>
                                                                        </a>
                                                                    )
                                                                })()}
                                                                {row.model === String(editingSettings.model_intelligence ?? '') && (
                                                                    <Badge variant="default">Activo</Badge>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.0001"
                                                                className="h-8 w-28"
                                                                value={costDrafts[String(row._id)] ?? String(row.cost_eur ?? 0)}
                                                                onChange={(e) => setCostDrafts((prev) => ({
                                                                    ...prev,
                                                                    [String(row._id)]: e.target.value
                                                                }))}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        void handleSaveInlineCost(row)
                                                                    }
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                className="h-8"
                                                                value={commentDrafts[String(row._id)] ?? String(row.comment ?? '')}
                                                                placeholder="Sin comentario"
                                                                onChange={(e) => setCommentDrafts((prev) => ({
                                                                    ...prev,
                                                                    [String(row._id)]: e.target.value
                                                                }))}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        void handleSaveInlineCost(row)
                                                                    }
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground text-sm">
                                                            {new Date(row.updated_at).toLocaleString('es-ES')}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                size="sm"
                                                                variant={row.model === String(editingSettings.model_intelligence ?? '') ? 'default' : 'secondary'}
                                                                className="mr-2"
                                                                disabled={row.model === String(editingSettings.model_intelligence ?? '') || activatingModelId === String(row._id)}
                                                                onClick={() => void handleActivateModel('intelligence', row.model, String(row._id))}
                                                                title="Activar modelo"
                                                            >
                                                                {activatingModelId === String(row._id)
                                                                    ? <Loader2 className="h-4 w-4" />
                                                                    : <IconCheckSimple className="h-4 w-4" />}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="mr-2"
                                                                onClick={() => void handleSaveInlineCost(row)}
                                                                title="Guardar coste"
                                                            >
                                                                <IconSave className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleDeleteCost(row._id)}
                                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            >
                                                                <IconDelete className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {intelligenceModelCosts.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                                                            No hay modelos de inteligencia
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between gap-2">
                                    <CardTitle>Log de auditoría económica</CardTitle>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            onClick={handleDownloadEconomicCsv}
                                            disabled={exportingEconomicCsv || !economicEvents || economicEvents.length === 0}
                                            aria-label="Descargar logs en CSV"
                                            title="Descargar CSV"
                                        >
                                            {exportingEconomicCsv ? <Loader2 className="h-4 w-4" /> : <IconDownload className="h-4 w-4" />}
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            onClick={handleClearEconomicLogs}
                                            disabled={clearingEconomicLogs || !economicEvents || economicEvents.length === 0}
                                            aria-label="Borrar todos los logs económicos"
                                            title="Borrar logs"
                                            className="text-destructive hover:text-destructive"
                                        >
                                            {clearingEconomicLogs ? <Loader2 className="h-4 w-4" /> : <IconDelete className="h-4 w-4" />}
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={handleToggleAllEconomicFlows}
                                            disabled={groupedEconomicEvents.length === 0}
                                            aria-label={allEconomicFlowsExpanded ? 'Colapsar todos los flows' : 'Expandir todos los flows'}
                                            title={allEconomicFlowsExpanded ? 'Colapsar todos' : 'Expandir todos'}
                                        >
                                            {allEconomicFlowsExpanded ? 'Colapsar todo' : 'Expandir todo'}
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            onClick={handleRefreshEconomicLog}
                                            disabled={refreshingEconomicLog}
                                            aria-label="Refrescar log de auditoría económica"
                                            title="Refrescar datos"
                                        >
                                            {refreshingEconomicLog ? <Loader2 className="h-4 w-4" /> : <IconRefresh className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                                <CardDescription>Eventos de coste desde análisis hasta generación final.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Flow</TableHead>
                                            <TableHead>Fase</TableHead>
                                            <TableHead>Usuario</TableHead>
                                            <TableHead>Modelo</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Coste</TableHead>
                                            <TableHead className="w-10 text-right"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groupedEconomicEvents.map((group) => (
                                            <Fragment key={group.flowId}>
                                                <TableRow key={`${group.flowId}-total`} className="bg-muted/40">
                                                    <TableCell colSpan={6} className="font-medium">
                                                        <span className="inline-flex items-center gap-2">
                                                            <span>Total flow {group.flowId}</span>
                                                            <Badge variant="outline">{group.events.length} eventos</Badge>
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="font-semibold">{formatEuro(group.total)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => toggleEconomicFlow(group.flowId)}
                                                            aria-expanded={Boolean(expandedEconomicFlows[group.flowId])}
                                                            aria-label={`Desplegar eventos del flow ${group.flowId}`}
                                                            title={expandedEconomicFlows[group.flowId] ? 'Colapsar flow' : 'Expandir flow'}
                                                        >
                                                            {expandedEconomicFlows[group.flowId]
                                                                ? <IconChevronDown className="h-4 w-4 text-muted-foreground" />
                                                                : <IconChevronRight className="h-4 w-4 text-muted-foreground" />}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                                {expandedEconomicFlows[group.flowId] && group.events.map((event) => (
                                                    <TableRow key={event._id}>
                                                        <TableCell className="text-muted-foreground text-sm">
                                                            {new Date(event.created_at).toLocaleString('es-ES')}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">{group.flowId}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary">{event.phase}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-sm">{event.resolved_user_email}</TableCell>
                                                        <TableCell className="font-mono text-xs">{event.model}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{event.kind}</Badge>
                                                        </TableCell>
                                                        <TableCell>{formatEuro(event.estimated_cost_eur || 0)}</TableCell>
                                                        <TableCell></TableCell>
                                                    </TableRow>
                                                ))}
                                            </Fragment>
                                        ))}
                                        {(!economicEvents || economicEvents.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                                    No hay eventos económicos todavía
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Models Tab */}
                    <TabsContent value="models">
                        <Card>
                            <CardHeader>
                                <CardTitle>Modelos y API Keys</CardTitle>
                                <CardDescription>Configura los modelos activos y las credenciales de proveedores.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <p className="text-sm text-muted-foreground">
                                        Edita los campos y guarda todos los cambios de una vez.
                                    </p>
                                    <Button onClick={handleSaveModelSettings} disabled={!isModelSettingsDirty || savingModelSettings}>
                                        {savingModelSettings ? <Loader2 className="h-4 w-4 mr-2" /> : <IconSave className="h-4 w-4 mr-2" />}
                                        Guardar cambios
                                    </Button>
                                </div>
                                <div className="rounded-lg border p-4 space-y-4">
                                    <div>
                                        <Label className="text-base">Modelo de imagen</Label>
                                        <p className="text-sm text-muted-foreground">Modelo que usará la generación de imagen en toda la app.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={activeImageModel}
                                            onValueChange={(value) => setEditingSettings(prev => ({ ...prev, model_image_generation: value }))}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="Selecciona modelo de imagen" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {IMAGE_MODEL_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label className="text-base">Modelo de inteligencia</Label>
                                        <p className="text-sm text-muted-foreground">Modelo usado para análisis, intenciones y texto de apoyo.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={String(editingSettings.model_intelligence ?? 'wisdom/gemini-3-flash-preview')}
                                            onValueChange={(value) => setEditingSettings(prev => ({ ...prev, model_intelligence: value }))}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="Selecciona modelo de inteligencia" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {INTELLIGENCE_MODEL_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label className="text-base">Google API Key</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="text"
                                            value={String(editingSettings.provider_google_api_key ?? '')}
                                            onChange={(e) => setEditingSettings(prev => ({
                                                ...prev,
                                                provider_google_api_key: e.target.value
                                            }))}
                                            placeholder="AIza..."
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-base">Wisdom API Key</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="text"
                                            value={String(editingSettings.provider_wisdom_api_key ?? '')}
                                            onChange={(e) => setEditingSettings(prev => ({
                                                ...prev,
                                                provider_wisdom_api_key: e.target.value
                                            }))}
                                            placeholder="wg-..."
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-base">OpenAI API Key</Label>
                                        <p className="text-sm text-muted-foreground">Se usa al seleccionar modelos con prefijo <code>openai/</code>.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="text"
                                            value={String(editingSettings.provider_openai_api_key ?? '')}
                                            onChange={(e) => setEditingSettings(prev => ({
                                                ...prev,
                                                provider_openai_api_key: e.target.value
                                            }))}
                                            placeholder="sk-..."
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-base">NagaAI API Key</Label>
                                        <p className="text-sm text-muted-foreground">Se usa al seleccionar modelos con prefijo <code>naga/</code>.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="text"
                                            value={String(editingSettings.provider_naga_api_key ?? '')}
                                            onChange={(e) => setEditingSettings(prev => ({
                                                ...prev,
                                                provider_naga_api_key: e.target.value
                                            }))}
                                            placeholder="ng-..."
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-base">Replicate API Key</Label>
                                        <p className="text-sm text-muted-foreground">Se usa al seleccionar modelos con prefijo <code>replicate/</code>.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="text"
                                            value={String(editingSettings.provider_replicate_api_key ?? '')}
                                            onChange={(e) => setEditingSettings(prev => ({
                                                ...prev,
                                                provider_replicate_api_key: e.target.value
                                            }))}
                                            placeholder="r8_..."
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-base">Atlas API Key</Label>
                                        <p className="text-sm text-muted-foreground">Se usa al seleccionar modelos con prefijo <code>atlas/</code>.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="text"
                                            value={String(editingSettings.provider_atlas_api_key ?? '')}
                                            onChange={(e) => setEditingSettings(prev => ({
                                                ...prev,
                                                provider_atlas_api_key: e.target.value
                                            }))}
                                            placeholder="atlas-..."
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Styles Tab */}
                    <TabsContent value="styles" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Estilos predefinidos</CardTitle>
                                <CardDescription>Gestión de estilos con análisis guardado para inyección directa en prompt.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <StylePresetsManager adminEmail={userEmail} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <CardTitle>Plantillas Replace</CardTitle>
                                        <CardDescription>Gestión de imágenes de plantilla para el panel derecho del módulo Replace.</CardDescription>
                                    </div>
                                    <Link href="/admin/replace-templates">
                                        <Button variant="outline" className="gap-2">
                                            <IconLayers className="h-4 w-4" />
                                            Abrir gestor completo
                                        </Button>
                                    </Link>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ReplaceTemplatesManager adminEmail={userEmail} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Links Tab */}
                    <TabsContent value="billing">
                        <BillingAdminPanel adminEmail={userEmail} />
                    </TabsContent>

                    {/* Links Tab */}
                    <TabsContent value="links">
                        <Card>
                            <CardHeader>
                                <CardTitle>Enlaces de Gestión</CardTitle>
                                <CardDescription>Accesos directos a las plataformas de control de la aplicación</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[
                                        { name: 'Vercel', url: 'https://vercel.com/juanfranbrvs-projects/x-studio', desc: 'Despliegues, logs y dominios' },
                                        { name: 'Convex', url: 'https://dashboard.convex.dev', desc: 'Base de datos y funciones backend' },
                                        { name: 'Clerk', url: 'https://dashboard.clerk.com', desc: 'Autenticación y usuarios' },
                                        { name: 'Google AI Studio', url: 'https://aistudio.google.com', desc: 'API Keys y modelos Gemini' },
                                        { name: 'GitHub', url: 'https://github.com/juanfranbrv/x-studio', desc: 'Repositorio de código fuente' }
                                    ].map((link) => (
                                        <a
                                            key={link.name}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex flex-col p-4 rounded-lg border bg-card hover:bg-accent transition-colors group"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-semibold">{link.name}</span>
                                                <IconExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </div>
                                            <span className="text-xs text-muted-foreground">{link.desc}</span>
                                        </a>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Feedback Tab */}
                    <TabsContent value="feedback">
                        {/* Stats Row */}
                        <div className="grid gap-4 md:grid-cols-4 mb-6">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{feedbackStats?.total ?? 0}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-green-500">Positivo</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-500">{feedbackStats?.positive ?? 0}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-yellow-500">Neutral</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-yellow-500">{feedbackStats?.neutral ?? 0}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-red-500">Negativo</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-red-500">{feedbackStats?.negative ?? 0}</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Feedback Table */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Feedback Reciente</CardTitle>
                                <CardDescription>Últimas valoraciones de los usuarios</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Usuario</TableHead>
                                            <TableHead>Valoración</TableHead>
                                            <TableHead>Intent</TableHead>
                                            <TableHead className="max-w-[300px]">Comentario</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {feedbackList?.map((fb) => (
                                            <TableRow key={fb._id}>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {new Date(fb.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </TableCell>
                                                <TableCell className="font-medium text-sm">
                                                    {fb.userEmail}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xl">
                                                        {fb.rating === 'positive' ? 'Positivo' : fb.rating === 'neutral' ? 'Neutral' : 'Negativo'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {fb.context?.intent ? (
                                                        <Badge variant="outline" className="text-xs">
                                                            {fb.context.intent}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                                                    {fb.comment || <span className="italic">Sin comentario</span>}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!feedbackList || feedbackList.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    No hay feedback todavía
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Compositions Tab */}
                    <TabsContent value="compositions" className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-medium">Gestión de Catálogo</h3>
                                <p className="text-sm text-muted-foreground">Explora y edita las estructuras de las publicaciones.</p>
                            </div>
                            <Link href="/admin/compositions">
                                <Button className="gap-2 shadow-sm">
                                    <IconShapes className="h-4 w-4" />
                                    Abrir gestor completo
                                </Button>
                            </Link>
                        </div>

                        <Card>
                            <CardContent className="p-0">
                                {loadingCompositions ? (
                                    <div className="h-64 flex items-center justify-center">
                                        <Loader2 className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                ) : (
                                    <CompositionsSummaryTable initialData={compositionsSummary} />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="prompts" className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold">System Prompts</h3>
                                <p className="text-sm text-muted-foreground">
                                    {'Edit the AI prompts used throughout the app. Variables use {{variable}} syntax.'}
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSeedPrompts}
                                disabled={isSeedingPrompts}
                            >
                                {isSeedingPrompts ? <Loader2 className="w-4 h-4 mr-2" /> : <IconPlus className="w-4 h-4 mr-2" />}
                                Seed defaults
                            </Button>
                        </div>

                        {!systemPrompts || systemPrompts.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>No prompts yet.</p>
                                <p className="text-sm mt-1">Click &quot;Seed defaults&quot; to add the default prompts.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {systemPrompts.map((prompt) => (
                                    <div key={String(prompt._id)} className="rounded-xl border border-border p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="font-medium">{prompt.name}</div>
                                                <div className="text-xs text-muted-foreground font-mono">{prompt.key}</div>
                                                {prompt.description && (
                                                    <div className="text-sm text-muted-foreground mt-1">{prompt.description}</div>
                                                )}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setEditingPromptKey(prompt.key)
                                                    setPromptDraft(prompt.body)
                                                }}
                                            >
                                                Edit
                                            </Button>
                                        </div>

                                        {editingPromptKey === prompt.key ? (
                                            <div className="space-y-2">
                                                <textarea
                                                    className="w-full min-h-[200px] text-sm p-3 rounded-lg border border-border bg-white font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                    value={promptDraft}
                                                    onChange={(e) => setPromptDraft(e.target.value)}
                                                />
                                                <div className="flex gap-2 justify-end">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setEditingPromptKey(null)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={async () => {
                                                            await upsertSystemPrompt({
                                                                key: prompt.key,
                                                                name: prompt.name,
                                                                body: promptDraft,
                                                                description: prompt.description,
                                                            })
                                                            setEditingPromptKey(null)
                                                        }}
                                                    >
                                                        Save
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <pre className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 overflow-auto max-h-[120px] whitespace-pre-wrap">
                                                {prompt.body}
                                            </pre>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Adjust Credits Dialog */}
            <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajustar Créditos</DialogTitle>
                        <DialogDescription>
                            Ingresa un número positivo para añadir o negativo para quitar créditos.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Cantidad</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCreditAmount(prev => String((parseInt(prev) || 0) - 10))}
                                >
                                    <IconMinus className="h-4 w-4" />
                                </Button>
                                <Input
                                    type="number"
                                    value={creditAmount}
                                    onChange={(e) => setCreditAmount(e.target.value)}
                                    placeholder="ej: 50 o -10"
                                    className="text-center"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCreditAmount(prev => String((parseInt(prev) || 0) + 10))}
                                >
                                    <IconPlus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Razón (opcional)</Label>
                            <Input
                                value={creditReason}
                                onChange={(e) => setCreditReason(e.target.value)}
                                placeholder="ej: Bonus por feedback"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleAdjustCredits} disabled={!creditAmount || isProcessing}>
                            {isProcessing ? <Loader2 className="h-4 w-4 mr-2" /> : null}
                            Aplicar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}



