'use client'

import { Loader2 } from '@/components/ui/spinner'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { BrandDNA, TextAssets } from '@/lib/brand-types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { IconGlobe, IconShield, IconQuote, IconArrowLeft, IconArrowRight, IconCheck, IconPalette, IconUpload, IconImage, IconClose, IconPlus, IconColorPicker, IconSparkles, IconTextFont, IconMessage, IconMegaphone, IconMouseClick } from '@/components/ui/icons'
import { HexColorPicker } from 'react-colorful'
import { ContactSocialCard } from './ContactSocialCard'
import { TypographySection } from './TypographySection'
import { ImageGallery } from './VisualAssetComponents'
import { BrandContextCard } from './BrandContextCard'
import { useTranslation } from 'react-i18next'
import {
  BRAND_KIT_CALLOUT_CLASS,
  BRAND_KIT_MODAL_CLASS,
  BRAND_KIT_MODAL_DESCRIPTION_CLASS,
  BRAND_KIT_MODAL_FOOTER_CLASS,
  BRAND_KIT_MODAL_HEADER_CLASS,
  BRAND_KIT_MODAL_TITLE_CLASS,
  BRAND_KIT_FIELD_CLASS,
  BRAND_KIT_INLINE_REMOVE_BUTTON_CLASS,
  BRAND_KIT_OUTLINE_DASHED_BUTTON_CLASS,
  BRAND_KIT_SECONDARY_BUTTON_CLASS,
  BRAND_KIT_TEXTAREA_CLASS,
} from './brandKitStyles'

const WIZARD_FIELD_CLASS = `${BRAND_KIT_FIELD_CLASS} !h-[42px] !rounded-[16px] !px-4 !text-[14px]`
const WIZARD_TEXTAREA_CLASS = `${BRAND_KIT_TEXTAREA_CLASS} !rounded-[16px] !px-4 !py-3.5 !text-[14px]`

type WizardStepId =
  | 'intro'
  | 'name'
  | 'url'
  | 'post-analysis'
  | 'logos'
  | 'colors'
  | 'brand-context'
  | 'contact'
  | 'typography'
  | 'slogan'
  | 'values'
  | 'visual-styles'
  | 'tone'
  | 'marketing-hooks'
  | 'ctas'
  | 'image-gallery'
  | 'done'

interface BrandKitAssistantWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  brand: BrandDNA
  forceMode?: boolean
  onUpdateBrandName: (value: string) => void
  onUpdateUrl: (value: string) => void
  onAnalyzeUrl: (urlOverride?: string) => Promise<void> | void
  onStopAnalyzeUrl?: () => void
  onPreviewUrl: (url: string) => Promise<{
    success: boolean
    url: string
    title?: string
    screenshotUrl?: string
    error?: string
  }>
  onUploadLogos: (files: FileList | File[]) => Promise<void>
  onToggleLogo: (index: number) => void
  onRemoveLogo: (index: number) => void
  onAddColor: () => void
  onUpdateColor: (index: number, color: string) => void
  onUpdateColorRole: (index: number, role: string) => void
  onRemoveColor: (index: number) => void
  onUpdateBrandContext: (value: string) => void
  onUpdateContact: (data: { socialLinks: { platform: string; url: string; username?: string }[]; emails: string[]; phones: string[]; addresses: string[] }) => void
  onAddFont: (font: string) => void
  onSelectFontForRole: (family: string, role: 'heading' | 'body') => void
  onRemoveFont: (index: number) => void
  onUpdateFontRole: (index: number, role?: 'heading' | 'body') => void
  onUpdateTagline: (val: string) => void
  onUpdateValue: (index: number, val: string) => void
  onAddValue: () => void
  onRemoveValue: (index: number) => void
  onUpdateAesthetic: (index: number, val: string) => void
  onAddAesthetic: () => void
  onRemoveAesthetic: (index: number) => void
  onUpdateTone: (index: number, val: string) => void
  onAddTone: () => void
  onRemoveTone: (index: number) => void
  onChangeTextAssets: (newTextAssets: TextAssets) => void
  onAppendExtractedData: (extracted: any) => void
  onUploadImages: (files: FileList | File[]) => Promise<void>
  onRemoveImage: (index: number) => void
  onOpenLightbox: (url: string) => void
  isUploadingImages?: boolean
  completionPercentage: number
  minimumCompletionToFinish?: number
  onFinish: () => void
}

const STEPS: WizardStepId[] = ['intro', 'name', 'url', 'post-analysis', 'logos', 'colors', 'brand-context', 'contact', 'typography', 'slogan', 'values', 'visual-styles', 'tone', 'marketing-hooks', 'ctas', 'image-gallery', 'done']
const FLOW_STEPS: WizardStepId[] = ['name', 'url', 'post-analysis', 'logos', 'colors', 'brand-context', 'contact', 'typography', 'slogan', 'values', 'visual-styles', 'tone', 'marketing-hooks', 'ctas', 'image-gallery', 'done']
const ASSISTANT_STEP_KEY = 'brand-kit-assistant-step'
function normalizeUrl(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  if (value.toLowerCase().startsWith('manual-')) return null
  try {
    const withProtocol = value.startsWith('http://') || value.startsWith('https://')
      ? value
      : `https://${value}`
    const parsed = new URL(withProtocol)
    if (!isSyntacticallyValidWebHostname(parsed.hostname)) return null
    return parsed.toString()
  } catch {
    return null
  }
}

function isSyntacticallyValidWebHostname(hostnameRaw: string): boolean {
  const hostname = hostnameRaw.trim().toLowerCase()
  if (!hostname) return false
  if (/\s/.test(hostname)) return false

  if (hostname === 'localhost') return true

  const ipv4Match = hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/)
  if (ipv4Match) {
    return hostname.split('.').every((part) => {
      const n = Number(part)
      return Number.isInteger(n) && n >= 0 && n <= 255
    })
  }

  // Dominio web sintácticamente válido: labels + TLD (sin validar existencia)
  if (!hostname.includes('.')) return false
  const labels = hostname.split('.')
  if (labels.some((label) => !label)) return false

  const validLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
  if (!labels.every((label) => validLabel.test(label))) return false

  const tld = labels[labels.length - 1]
  return /^[a-z]{2,63}$/.test(tld)
}

function getInitialAssistantStep(): number {
  if (typeof window === 'undefined') return 0
  const stored = window.sessionStorage.getItem(ASSISTANT_STEP_KEY)
  if (!stored) return 0
  const parsed = Number(stored)
  if (!Number.isInteger(parsed)) return 0
  if (parsed < 0 || parsed >= STEPS.length) return 0
  return parsed
}

function normalizeHexColor(color: string): string {
  const base = (color || '').trim().toLowerCase()
  if (!base) return '#000000'
  const withHash = base.startsWith('#') ? base : `#${base}`
  return /^#[0-9a-f]{6}$/i.test(withHash) ? withHash : '#000000'
}

function RoleColorSwatch({
  color,
  onCommit,
  onEyedropper,
  draggable = false,
  onDragStart,
  onDragEnd,
  sizeClass = 'w-12 h-12 rounded-full',
}: {
  color: string
  onCommit: (nextColor: string) => void
  onEyedropper?: () => void
  draggable?: boolean
  onDragStart?: (event: React.DragEvent<HTMLButtonElement>) => void
  onDragEnd?: (event: React.DragEvent<HTMLButtonElement>) => void
  sizeClass?: string
}) {
  const { t } = useTranslation('brandKit')
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
          className={cn(sizeClass, 'border border-border/70 shadow-sm')}
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
          {t('wizard.applyColor', { defaultValue: 'Apply color' })}
        </Button>
        {onEyedropper && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs gap-1"
            onClick={() => onEyedropper()}
          >
            <IconColorPicker className="w-3.5 h-3.5" />
            {t('palette.pickSample', { defaultValue: 'Pick sample' })}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}

function AddAccentSwatch({
  disabled,
  onAdd,
}: {
  disabled?: boolean
  onAdd: (nextColor: string) => void
}) {
  const { t } = useTranslation('brandKit')
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('#4f46e5')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            BRAND_KIT_CALLOUT_CLASS,
            'w-12 h-12 rounded-full flex items-center justify-center p-0 text-muted-foreground',
            'hover:text-primary hover:border-primary/60 transition-colors',
            disabled && 'opacity-40 cursor-not-allowed'
          )}
          title={t('wizard.addAccent', { defaultValue: 'Add accent' })}
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
            {t('wizard.addAccent', { defaultValue: 'Add accent' })}
        </Button>
      </PopoverContent>
    </Popover>
  )
}

export function BrandKitAssistantWizard({
  open,
  onOpenChange,
  brand,
  forceMode = false,
  onUpdateBrandName,
  onUpdateUrl,
  onAnalyzeUrl,
  onStopAnalyzeUrl,
  onPreviewUrl,
  onUploadLogos,
  onToggleLogo,
  onRemoveLogo,
  onAddColor,
  onUpdateColor,
  onUpdateColorRole,
  onRemoveColor,
  onUpdateBrandContext,
  onUpdateContact,
  onAddFont,
  onSelectFontForRole,
  onRemoveFont,
  onUpdateFontRole,
  onUpdateTagline,
  onUpdateValue,
  onAddValue,
  onRemoveValue,
  onUpdateAesthetic,
  onAddAesthetic,
  onRemoveAesthetic,
  onUpdateTone,
  onAddTone,
  onRemoveTone,
  onChangeTextAssets,
  onAppendExtractedData,
  onUploadImages,
  onRemoveImage,
  onOpenLightbox,
  isUploadingImages = false,
  completionPercentage,
  minimumCompletionToFinish = 70,
  onFinish,
}: BrandKitAssistantWizardProps) {
  const { t } = useTranslation('brandKit')
  const analyzingMessages = useMemo(() => ([
    t('wizard.analyzingMessages.connecting', { defaultValue: 'Connecting to your website...' }),
    t('wizard.analyzingMessages.opening', { defaultValue: 'Opening the page in analysis mode...' }),
    t('wizard.analyzingMessages.reading', { defaultValue: 'Reading structure and main styles...' }),
    t('wizard.analyzingMessages.logos', { defaultValue: 'Detecting logos and brand variations...' }),
    t('wizard.analyzingMessages.palette', { defaultValue: 'Extracting the dominant color palette...' }),
    t('wizard.analyzingMessages.support', { defaultValue: 'Identifying support and contrast colors...' }),
    t('wizard.analyzingMessages.typography', { defaultValue: 'Reviewing visible typography...' }),
    t('wizard.analyzingMessages.hierarchy', { defaultValue: 'Analyzing visual hierarchy and key blocks...' }),
    t('wizard.analyzingMessages.copy', { defaultValue: 'Extracting useful brand copy...' }),
    t('wizard.analyzingMessages.images', { defaultValue: 'Looking for featured images and assets...' }),
    t('wizard.analyzingMessages.merging', { defaultValue: 'Merging website findings...' }),
    t('wizard.analyzingMessages.preparing', { defaultValue: 'Preparing a base kit for you...' }),
    t('wizard.analyzingMessages.validating', { defaultValue: 'Running final validations...' }),
  ]), [t])
  const [stepIndex, setStepIndex] = useState(getInitialAssistantStep)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewAnalyzing, setPreviewAnalyzing] = useState(false)
  const [analyzingMessageIndex, setAnalyzingMessageIndex] = useState(0)
  const [analyzingProgress, setAnalyzingProgress] = useState(12)
  const [previewData, setPreviewData] = useState<{ url: string; title?: string; screenshotUrl?: string } | null>(null)
  const [previewError, setPreviewError] = useState('')
  const cancelPreviewAnalysisRef = useRef(false)
  const [isDraggingLogos, setIsDraggingLogos] = useState(false)
  const [draggedColorSource, setDraggedColorSource] = useState<{ role: 'Texto' | 'Fondo' | 'Acento'; index: number } | null>(null)
  const [pendingRoleAdd, setPendingRoleAdd] = useState<{ role: 'Texto' | 'Fondo' | 'Acento'; color: string; previousLength: number } | null>(null)
  const logoInputRef = useRef<HTMLInputElement | null>(null)

  const step = STEPS[stepIndex]
  const flowStepIndex = FLOW_STEPS.indexOf(step)
  const progress = step === 'intro'
    ? 0
    : Math.round(((Math.max(flowStepIndex, 0) + 1) / FLOW_STEPS.length) * 100)
  const headerStepLabel = step === 'intro'
              ? t('wizard.introLabel', { defaultValue: 'Introduction' })
    : `Paso ${flowStepIndex + 1} de ${FLOW_STEPS.length}`
  const currentUrl = brand.url || ''
  const isManualPlaceholderUrl = currentUrl.trim().toLowerCase().startsWith('manual-')
  const visibleUrlValue = isManualPlaceholderUrl ? '' : currentUrl
  const normalizedCurrentUrl = normalizeUrl(visibleUrlValue)
  const canAnalyze = Boolean(normalizedCurrentUrl)
  const hasTypedUrl = visibleUrlValue.trim().length > 0
  const invalidUrl = hasTypedUrl && !canAnalyze
  const currentLogos = useMemo(
    () => brand.logos || (brand.logo_url ? [{ url: brand.logo_url, selected: true }] : []),
    [brand.logos, brand.logo_url]
  )
  const colorItems = useMemo(
    () => (brand.colors || []).map((item, index) => ({ ...item, index })),
    [brand.colors]
  )
  const normalizeRole = (role?: string): 'Texto' | 'Fondo' | 'Acento' => {
    const raw = (role || '').toLowerCase()
    if (raw.includes('text') || raw.includes('texto')) return 'Texto'
    if (raw.includes('fondo') || raw.includes('background')) return 'Fondo'
    return 'Acento'
  }
  const groupedColors = useMemo(() => {
    const grouped = {
      Texto: [] as Array<{ index: number; color: string }>,
      Fondo: [] as Array<{ index: number; color: string }>,
      Acento: [] as Array<{ index: number; color: string }>,
    }
    colorItems.forEach((item) => {
      const role = normalizeRole(item.role)
      grouped[role].push({ index: item.index, color: item.color })
    })
    return grouped
  }, [colorItems])
  const fonts = useMemo(
    () => (brand.fonts || []).map((f) => (typeof f === 'string' ? { family: f } : f)),
    [brand.fonts]
  )
  const textAssets = useMemo<TextAssets>(() => ({
    marketing_hooks: brand.text_assets?.marketing_hooks || [],
    visual_keywords: brand.text_assets?.visual_keywords || [],
    ctas: brand.text_assets?.ctas || [],
    brand_context: brand.text_assets?.brand_context || brand.business_overview || '',
  }), [brand.text_assets, brand.business_overview])
  const hasHeadingFont = fonts.some((font) => font.role === 'heading')
  const hasBodyFont = fonts.some((font) => font.role === 'body')
  const canProceedFromTypography = hasHeadingFont && hasBodyFont
  const completionClamped = Math.max(0, Math.min(100, completionPercentage))
  const canFinishWizard = completionClamped >= minimumCompletionToFinish
  const completionMissing = Math.max(0, minimumCompletionToFinish - completionClamped)
  const hasUrlValue = hasTypedUrl

  const goNext = () => setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1))
  const goBack = () => setStepIndex((prev) => Math.max(prev - 1, 0))

  useEffect(() => {
    if (!pendingRoleAdd) return
    if (!brand.colors) return
    if (brand.colors.length <= pendingRoleAdd.previousLength) return
    const newIndex = brand.colors.length - 1
    onUpdateColor(newIndex, pendingRoleAdd.color)
    onUpdateColorRole(newIndex, pendingRoleAdd.role)
    setPendingRoleAdd(null)
  }, [brand.colors, pendingRoleAdd, onUpdateColor, onUpdateColorRole])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(ASSISTANT_STEP_KEY, String(stepIndex))
  }, [stepIndex])

  useEffect(() => {
    if (!previewAnalyzing) return

    const messageTimer = setInterval(() => {
      setAnalyzingMessageIndex((prev) => Math.min(prev + 1, analyzingMessages.length - 1))
    }, 1700)

    const progressTimer = setInterval(() => {
      setAnalyzingProgress((prev) => Math.min(prev + Math.random() * 9, 92))
    }, 700)

    return () => {
      clearInterval(messageTimer)
      clearInterval(progressTimer)
    }
  }, [previewAnalyzing])

  const closeWizard = () => {
    onOpenChange(false)
    setStepIndex(0)
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(ASSISTANT_STEP_KEY)
    }
  }

  const completeWizard = () => {
    if (!canFinishWizard) return
    onFinish()
    setStepIndex(0)
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(ASSISTANT_STEP_KEY)
    }
  }

  const handleAnalyzeClick = async () => {
    const normalizedUrl = normalizeUrl(visibleUrlValue)
    if (!normalizedUrl) return

    setPreviewOpen(true)
    setPreviewLoading(true)
    setPreviewError('')
    setPreviewData({ url: normalizedUrl })

    try {
      const result = await onPreviewUrl(normalizedUrl)
      if (!result.success) {
      setPreviewError(result.error || t('wizard.previewError', { defaultValue: 'We could not load a preview of this website.' }))
        return
      }
      setPreviewData({
        url: result.url || normalizedUrl,
        title: result.title,
        screenshotUrl: result.screenshotUrl,
      })
    } catch {
      setPreviewError(t('wizard.previewError', { defaultValue: 'We could not load a preview of this website.' }))
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleNextClick = async () => {
    if (step === 'url') {
      if (!hasUrlValue) {
        goNext()
        return
      }

      if (!canAnalyze) return

      await handleAnalyzeClick()
      return
    }

    goNext()
  }

  const confirmAnalyze = async () => {
    if (!previewData?.url) return
    cancelPreviewAnalysisRef.current = false
    setPreviewAnalyzing(true)
    setAnalyzingMessageIndex(0)
    setAnalyzingProgress(14)
    setPreviewError('')

    const urlStep = STEPS.indexOf('url')
    const postAnalysisStep = STEPS.indexOf('post-analysis')
    const nextStep = stepIndex <= urlStep ? postAnalysisStep : stepIndex
    setStepIndex(nextStep)
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(ASSISTANT_STEP_KEY, String(nextStep))
    }

    try {
      await onAnalyzeUrl(previewData.url)
      if (cancelPreviewAnalysisRef.current) {
        return
      }
      setAnalyzingProgress(100)
      setPreviewOpen(false)
    } catch (error: any) {
      if (cancelPreviewAnalysisRef.current) {
        return
      }
      setPreviewError(error?.message || t('wizard.errors.analyzeUrl', { defaultValue: 'We could not analyze the website. Check the URL and try again.' }))
    } finally {
      setPreviewAnalyzing(false)
    }
  }

  const stopPreviewAnalysis = () => {
    cancelPreviewAnalysisRef.current = true
    onStopAnalyzeUrl?.()
    setPreviewAnalyzing(false)
    setPreviewOpen(false)
    setPreviewError('')
  }

  const handleLogoFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return
    await onUploadLogos(files)
  }

  const ensureRoleColor = (role: 'Texto' | 'Fondo' | 'Acento', fallbackColor: string) => {
    const current = groupedColors[role][0]
    if (current) {
      onUpdateColorRole(current.index, role)
      return current.index
    }

    const previousLength = brand.colors?.length || 0
    onAddColor()
    setPendingRoleAdd({ role, color: fallbackColor, previousLength })
    return null
  }

  const handleEyedropperForIndex = async (index: number) => {
    if (!('EyeDropper' in window)) return
    try {
      const eyeDropper = new window.EyeDropper()
      const result = await eyeDropper.open()
      if (result?.sRGBHex) {
        onUpdateColor(index, result.sRGBHex)
      }
    } catch {
      // cancelado por el usuario
    }
  }

  const moveOrSwapRole = (
    sourceRole: 'Texto' | 'Fondo' | 'Acento',
    sourceIdx: number,
    targetRole: 'Texto' | 'Fondo' | 'Acento',
    explicitTargetIdx?: number
  ) => {
    if (sourceRole === targetRole && explicitTargetIdx === undefined) return

    let targetIdx = explicitTargetIdx
    if (targetIdx === undefined && targetRole !== 'Acento') {
      targetIdx = groupedColors[targetRole][0]?.index
    }

    onUpdateColorRole(sourceIdx, targetRole)

    if (targetIdx !== undefined && targetIdx !== sourceIdx) {
      const fallbackRole: 'Texto' | 'Fondo' | 'Acento' = sourceRole === 'Acento' ? 'Acento' : sourceRole
      onUpdateColorRole(targetIdx, fallbackRole)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          if (forceMode) return
          closeWizard()
          return
        }
        onOpenChange(next)
      }}
    >
        <DialogContent
          showCloseButton={!forceMode}
          overlayClassName="bg-black/85 backdrop-blur-md"
          onEscapeKeyDown={(event) => {
            if (forceMode) event.preventDefault()
          }}
          onPointerDownOutside={(event) => event.preventDefault()}
          className={cn(
            BRAND_KIT_MODAL_CLASS,
            "!w-[min(97.5vw,1160px)] !max-w-[1160px] sm:!max-w-[1160px] h-[min(92vh,860px)] overflow-hidden p-0 !rounded-[2rem]"
          )}
        >
        <div className="h-full min-h-0 flex flex-col">
          <DialogHeader className={cn(BRAND_KIT_MODAL_HEADER_CLASS, "shrink-0 px-8 pb-3 pt-8 pr-20")}>
            <div className="flex items-start justify-between gap-4">
              <DialogTitle className={cn(BRAND_KIT_MODAL_TITLE_CLASS, "min-w-0 pr-0 text-[clamp(1.55rem,1.35rem+0.4vw,1.9rem)] leading-[1.08]")}>
            {t('wizard.title', { defaultValue: 'Brand Kit Assistant' })}
              </DialogTitle>
              <div className="flex items-start gap-2 shrink-0">
                <div className="rounded-full border border-border/70 bg-[hsl(var(--surface-alt))]/78 px-3 py-1 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground whitespace-nowrap">
                  {headerStepLabel}
                </div>
              </div>
            </div>
            <DialogDescription className={cn(BRAND_KIT_MODAL_DESCRIPTION_CLASS, "pr-12 text-[1.02rem]")}>
              Te guiamos paso a paso.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 px-8 py-5 overflow-y-auto flex-1 min-h-0">
            <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="rounded-[1.35rem] border border-border/70 bg-[hsl(var(--surface-alt))]/62 p-4 md:p-5 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <div className="flex items-center justify-between">
                <p className="text-[0.9rem] font-medium text-muted-foreground">{t('wizard.realCompletion', { defaultValue: 'Real kit completion' })}</p>
                <p
                  className={cn(
                    'text-[0.95rem] font-semibold',
                    canFinishWizard ? 'text-emerald-600' : 'text-amber-600'
                  )}
                >
                  {completionClamped}%
                </p>
              </div>
              <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-300',
                    canFinishWizard ? 'bg-emerald-500' : 'bg-amber-500'
                  )}
                  style={{ width: `${completionClamped}%` }}
                />
              </div>
              <p className="text-[0.92rem] leading-relaxed text-muted-foreground">
                {t('wizard.completionHint', { defaultValue: 'This percentage grows with what you complete manually and with any auto-filled data extracted from the URL analysis.' })}
              </p>
            </div>

            {step === 'intro' && (
              <section className="rounded-[1.55rem] border border-border/70 bg-[hsl(var(--surface-alt))]/52 p-7 md:p-9 space-y-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
                <div className="flex items-start gap-3">
                  <IconShield className="w-6 h-6 text-primary mt-1" />
                  <div className="space-y-3">
                    {forceMode ? (
                      <>
                        <p className="font-semibold text-2xl leading-tight">{t('wizard.requiredTitle', { defaultValue: 'Your brand kit is required' })}</p>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                  {t('wizard.minCompletionGate', { defaultValue: 'Image and the rest of the modules stay locked until your kit is above 70%.' })}
                        </p>
                        <p className="text-base text-muted-foreground">
                  {t('wizard.completeAndContinue', { defaultValue: 'Finish this assistant and you go straight to the editor.' })}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-2xl leading-tight">{t('wizard.createNewTitle', { defaultValue: 'Let’s create a new brand kit' })}</p>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                          {t('wizard.createNewDescription', { defaultValue: 'We will guide you step by step so it is ready quickly.' })}
                        </p>
                        <p className="text-base text-muted-foreground">
                  {t('wizard.closeAnytime', { defaultValue: 'You can close this assistant whenever you want.' })}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </section>
            )}

            {step === 'name' && (
              <section className="space-y-4">
                <p className="text-base text-muted-foreground">{t('wizard.brandNameIntro', { defaultValue: 'Write the name of your brand.' })}</p>
                <Input
                  value={brand.brand_name || ''}
                  onChange={(e) => onUpdateBrandName(e.target.value)}
                    placeholder={t('wizard.brandNamePlaceholder', { defaultValue: 'e.g. My Brand' })}
                  className={WIZARD_FIELD_CLASS}
                />
              </section>
            )}

            {step === 'url' && (
              <section className="space-y-5">
                <div className={cn(BRAND_KIT_CALLOUT_CLASS, "space-y-2 p-4")}>
                  <div className="flex items-center gap-2">
                    <IconGlobe className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">{t('wizard.optionalAnalyzeTitle', { defaultValue: 'Optional step: analyze your website' })}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('wizard.optionalAnalyzeDescription', { defaultValue: 'If you enter your website, we will try to extract logos, colors, typography, and copy automatically.' })}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('wizard.websiteLabel', { defaultValue: 'Your website address' })}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={visibleUrlValue}
                      onChange={(e) => onUpdateUrl(e.target.value)}
                      placeholder="https://tuweb.com"
                      className={WIZARD_FIELD_CLASS}
                    />
                    <Button variant="outline" disabled={!canAnalyze} onClick={handleAnalyzeClick} className="h-11 text-base">
                    {t('wizard.analyzeUrl', { defaultValue: 'Analyze URL' })}
                    </Button>
                  </div>
                </div>

                {invalidUrl && (
                  <p className="text-xs text-destructive">
                    {t('wizard.invalidUrl', { defaultValue: 'Check the URL. Valid example: `https://yoursite.com`.' })}
                  </p>
                )}

                {hasUrlValue && canAnalyze && (
                  <p className="text-xs text-emerald-600">
                    {t('wizard.validUrlHint.before')} <span className="font-medium">{t('wizard.analyzeUrl', { defaultValue: 'Analyze URL' })}</span> {t('wizard.validUrlHint.middle')} <span className="font-medium">{t('wizard.next', { defaultValue: 'Next' })}</span> {t('wizard.validUrlHint.after')}
                  </p>
                )}

                <div className={cn(BRAND_KIT_CALLOUT_CLASS, "p-3")}>
                  <p className="text-xs text-muted-foreground">
                    {t('wizard.noWebsiteHint.before')} <span className="font-medium text-foreground">{t('wizard.next', { defaultValue: 'Next' })}</span> {t('wizard.noWebsiteHint.after')}
                  </p>
                </div>

              </section>
            )}

            {step === 'post-analysis' && (
              <section className={cn(BRAND_KIT_CALLOUT_CLASS, "space-y-4 p-6 md:p-8")}>
                <div className="flex items-start gap-3">
                  <IconCheck className="w-6 h-6 text-primary mt-1" />
                  <div className="space-y-3">
                    <p className="font-semibold text-xl leading-tight">{t('wizard.basePreparedTitle', { defaultValue: 'We prepared a base version of your kit from the website' })}</p>
                    <p className="text-base text-muted-foreground">
                      {t('wizard.basePreparedDescriptionA', { defaultValue: 'In the next steps you will see logos, colors, copy, and other data detected automatically.' })}
                    </p>
                    <p className="text-base text-muted-foreground">
                {t('wizard.reviewRole', { defaultValue: 'Your role now is to review it: keep it as is, correct it, or add whatever is missing.' })}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {step === 'logos' && (
              <section className="space-y-4">
                <div className="flex items-start gap-2">
                  <IconImage className="w-5 h-5 text-primary mt-0.5" />
                  <p className="text-base text-muted-foreground">{t('wizard.reviewLogos', { defaultValue: 'Review the detected logos or upload your own.' })}</p>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => logoInputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      logoInputRef.current?.click()
                    }
                  }}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setIsDraggingLogos(true)
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault()
                    setIsDraggingLogos(false)
                  }}
                  onDrop={async (event) => {
                    event.preventDefault()
                    setIsDraggingLogos(false)
                    await handleLogoFiles(event.dataTransfer.files)
                  }}
                  className={cn(
                    `${BRAND_KIT_CALLOUT_CLASS} cursor-pointer p-4 transition-colors`,
                    isDraggingLogos ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(BRAND_KIT_CALLOUT_CLASS, "flex h-9 w-9 items-center justify-center rounded-lg bg-background p-0")}>
                      <IconUpload className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{t('wizard.logosDropzone', { defaultValue: 'Drag logos here or click to upload' })}</p>
                      <p className="text-xs text-muted-foreground">{currentLogos.length} / 6 logos</p>
                    </div>
                  </div>
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const inputEl = e.currentTarget
                    const files = inputEl.files
                    if (!files || files.length === 0) return
                    try {
                      await handleLogoFiles(files)
                    } finally {
                      if (inputEl) inputEl.value = ''
                    }
                  }}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[280px] overflow-y-auto pr-1">
                  {currentLogos.length === 0 && (
                    <div className={cn(BRAND_KIT_CALLOUT_CLASS, "col-span-full p-3 text-sm text-muted-foreground")}>
                      {t('wizard.noLogosYet', { defaultValue: 'There are no logos yet. You can upload one or several.' })}
                    </div>
                  )}
                  {currentLogos.map((logo, index) => (
                    <div key={`${logo.url}-${index}`} className={cn(BRAND_KIT_CALLOUT_CLASS, "overflow-hidden rounded-[1.1rem] p-0")}>
                      <div className={cn(BRAND_KIT_CALLOUT_CLASS, "h-20 transparency-grid")}>
                        <img
                          src={logo.url}
                          alt={t('visualAssets.mainLogo', { defaultValue: 'Main logo' })}
                          className="w-full h-full object-contain p-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]"
                        />
                      </div>
                      <div className="p-2 flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className={BRAND_KIT_INLINE_REMOVE_BUTTON_CLASS}
                          onClick={() => onRemoveLogo(index)}
                          aria-label={t('wizard.removeLogo', { defaultValue: 'Remove logo' })}
                        >
                          <IconClose className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {step === 'colors' && (
              <section className="space-y-4">
                <div className="flex items-start gap-2">
                  <IconPalette className="w-5 h-5 text-primary mt-0.5" />
                <p className="text-base text-muted-foreground">{t('wizard.paletteIntro', { defaultValue: 'Adjust your palette. Text, Background, and up to 5 accents.' })}</p>
                </div>

                <div className="grid grid-cols-[auto_auto_auto] items-start gap-x-2 gap-y-3">
                  <div
                    className={cn(
                      'w-[64px] flex flex-col items-center gap-1.5 rounded-xl p-1.5 transition-colors',
                      draggedColorSource && draggedColorSource.role !== 'Texto' ? 'bg-primary/5 border border-primary/20' : ''
                    )}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault()
                      if (!draggedColorSource) return
                      moveOrSwapRole(draggedColorSource.role, draggedColorSource.index, 'Texto')
                      setDraggedColorSource(null)
                    }}
                  >
                    <RoleColorSwatch
                      color={groupedColors.Texto[0]?.color || '#111111'}
                      onCommit={(nextColor) => {
                        const idx = ensureRoleColor('Texto', nextColor)
                        if (idx !== null) onUpdateColor(idx, nextColor)
                      }}
                      onEyedropper={() => {
                        const idx = ensureRoleColor('Texto', '#111111')
                        if (idx !== null) void handleEyedropperForIndex(idx)
                      }}
                      draggable={Boolean(groupedColors.Texto[0])}
                      onDragStart={() => {
                        const idx = groupedColors.Texto[0]?.index
                        if (idx === undefined) return
                        setDraggedColorSource({ role: 'Texto', index: idx })
                      }}
                      onDragEnd={() => setDraggedColorSource(null)}
                    />
                    <span className="text-xs text-muted-foreground">{t('wizard.textRole', { defaultValue: 'Text' })}</span>
                  </div>

                  <div
                    className={cn(
                      'w-[64px] flex flex-col items-center gap-1.5 rounded-xl p-1.5 transition-colors',
                      draggedColorSource && draggedColorSource.role !== 'Fondo' ? 'bg-primary/5 border border-primary/20' : ''
                    )}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault()
                      if (!draggedColorSource) return
                      moveOrSwapRole(draggedColorSource.role, draggedColorSource.index, 'Fondo')
                      setDraggedColorSource(null)
                    }}
                  >
                    <RoleColorSwatch
                      color={groupedColors.Fondo[0]?.color || '#ffffff'}
                      onCommit={(nextColor) => {
                        const idx = ensureRoleColor('Fondo', nextColor)
                        if (idx !== null) onUpdateColor(idx, nextColor)
                      }}
                      onEyedropper={() => {
                        const idx = ensureRoleColor('Fondo', '#ffffff')
                        if (idx !== null) void handleEyedropperForIndex(idx)
                      }}
                      draggable={Boolean(groupedColors.Fondo[0])}
                      onDragStart={() => {
                        const idx = groupedColors.Fondo[0]?.index
                        if (idx === undefined) return
                        setDraggedColorSource({ role: 'Fondo', index: idx })
                      }}
                      onDragEnd={() => setDraggedColorSource(null)}
                    />
                    <span className="text-xs text-muted-foreground">{t('wizard.backgroundRole', { defaultValue: 'Background' })}</span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5 min-w-0 rounded-xl p-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {groupedColors.Acento.slice(0, 5).map((accent) => (
                        <div
                          key={accent.index}
                          className={cn(
                            'relative inline-flex items-center group/accent rounded-full',
                            draggedColorSource && draggedColorSource.index !== accent.index ? 'ring-2 ring-primary/20' : ''
                          )}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault()
                            if (!draggedColorSource) return
                            moveOrSwapRole(draggedColorSource.role, draggedColorSource.index, 'Acento', accent.index)
                            setDraggedColorSource(null)
                          }}
                        >
                          <RoleColorSwatch
                            color={accent.color}
                            onCommit={(nextColor) => {
                              onUpdateColorRole(accent.index, 'Acento')
                              onUpdateColor(accent.index, nextColor)
                            }}
                            onEyedropper={() => void handleEyedropperForIndex(accent.index)}
                            draggable
                            onDragStart={() => setDraggedColorSource({ role: 'Acento', index: accent.index })}
                            onDragEnd={() => setDraggedColorSource(null)}
                          />
                          <button
                            type="button"
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-background border border-border/70 text-muted-foreground hover:text-destructive hover:border-destructive/50 inline-flex items-center justify-center shadow-sm opacity-0 group-hover/accent:opacity-100 group-focus-within/accent:opacity-100 transition-opacity"
                            onClick={() => onRemoveColor(accent.index)}
                          title={t('wizard.removeAccent', { defaultValue: 'Remove accent' })}
                          >
                            <IconClose className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {groupedColors.Acento.length < 5 && (
                        <AddAccentSwatch
                          onAdd={(nextColor) => {
                            const accentCount = groupedColors.Acento.length
                            if (accentCount >= 5) return
                            const previousLength = brand.colors?.length || 0
                            onAddColor()
                            setPendingRoleAdd({ role: 'Acento', color: nextColor, previousLength })
                          }}
                        />
                      )}
                    </div>
                        <span className="text-xs text-muted-foreground">{t('wizard.accentsLabel', { defaultValue: 'Accents' })}</span>
                  </div>
                </div>
                <div className={cn(BRAND_KIT_CALLOUT_CLASS, "space-y-2 p-4")}>
                  <p className="text-sm font-medium text-foreground">{t('wizard.colorRolesUsageTitle', { defaultValue: 'How these roles are used' })}</p>
                  <p className="text-xs text-muted-foreground">
                  {t('wizard.textColorHint.before', { defaultValue: 'The' })} <span className="font-medium text-foreground">{t('wizard.textRole', { defaultValue: 'Text' })}</span> {t('wizard.textColorHint.after', { defaultValue: 'color will be used for headlines and text inside generated images.' })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                  {t('wizard.backgroundColorHint.before', { defaultValue: 'The' })} <span className="font-medium text-foreground">{t('wizard.backgroundRole', { defaultValue: 'Background' })}</span> {t('wizard.backgroundColorHint.after', { defaultValue: 'color will be the main base tone in generated images.' })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                  {t('wizard.accentHint.before', { defaultValue: 'Accent colors will be used to highlight key elements.' })}
                  </p>
                  <p className="text-xs text-muted-foreground pt-1">
                  {t('wizard.swapColorRoles', { defaultValue: 'Drag one color onto another to swap its role (Text, Background, or Accent).' })}
                  </p>
                </div>
              </section>
            )}

            {step === 'contact' && (
              <section className="space-y-4">
                <p className="text-base text-muted-foreground">
                {t('wizard.contactIntro', { defaultValue: 'Complete your contact details: email, phones, addresses, and social profiles.' })}
                </p>
                <ContactSocialCard
                  socialLinks={brand.social_links || []}
                  emails={brand.emails || []}
                  phones={brand.phones || []}
                  addresses={brand.addresses || []}
                  onUpdate={onUpdateContact}
                />
              </section>
            )}

            {step === 'brand-context' && (
              <section className="space-y-4">
                <p className="text-base text-muted-foreground">
                  {t('wizard.brandContextIntro', { defaultValue: 'Explain in a few lines what your brand does, who it serves, and what approach it follows.' })}
                </p>
                <BrandContextCard
                  context={brand.business_overview || brand.text_assets?.brand_context || ''}
                  onUpdate={onUpdateBrandContext}
                  minHeightClassName="min-h-[220px]"
                />
              </section>
            )}

            {step === 'typography' && (
              <section className="space-y-4">
                <div className={cn(BRAND_KIT_CALLOUT_CLASS, "p-4")}>
                  <p className="text-sm font-medium text-foreground">{t('wizard.typographyNoKnowledge', { defaultValue: "Don't worry if you do not know Google Fonts." })}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                {t('wizard.typographyIntro', { defaultValue: 'Choose one font for headlines and another for paragraphs. You can test and change them at any time.' })}
                  </p>
                </div>
                <TypographySection
                  fonts={fonts}
                  tagline={brand.tagline || ''}
                  guidedMode
                  onAddFont={onAddFont}
                  onSelectFontForRole={onSelectFontForRole}
                  onRemoveFont={onRemoveFont}
                  onUpdateRole={onUpdateFontRole}
                />
              </section>
            )}

            {step === 'slogan' && (
              <section className="space-y-4">
                <div className="flex items-start gap-2">
                  <IconQuote className="w-5 h-5 text-primary mt-0.5" />
                <p className="text-base text-muted-foreground">{t('wizard.sloganIntro', { defaultValue: 'Define your main tagline.' })}</p>
                </div>
                <Input
                  value={brand.tagline || ''}
                  onChange={(event) => onUpdateTagline(event.target.value)}
                  placeholder={t('wizard.sloganPlaceholder', { defaultValue: 'e.g. Your brand, your style' })}
                  className={WIZARD_FIELD_CLASS}
                />
              </section>
            )}

            {step === 'values' && (
              <section className="space-y-4">
                <div className="flex items-start gap-2">
                  <IconSparkles className="w-5 h-5 text-primary mt-0.5" />
                  <p className="text-base text-muted-foreground">{t('wizard.valuesDescription', { defaultValue: 'Add the key values of your brand.' })}</p>
                </div>
                <div className="space-y-2">
                  {(brand.brand_values || []).map((value, index) => (
                    <div key={`value-${index}`} className="flex items-center gap-2">
                      <Input
                        value={value}
                        onChange={(event) => onUpdateValue(index, event.target.value)}
                    placeholder={t('wizard.valuePlaceholder', { defaultValue: 'Brand value' })}
                        className={WIZARD_FIELD_CLASS}
                      />
                      <Button type="button" variant="ghost" size="sm" className={BRAND_KIT_INLINE_REMOVE_BUTTON_CLASS} onClick={() => onRemoveValue(index)}>
                        <IconClose className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className={BRAND_KIT_OUTLINE_DASHED_BUTTON_CLASS} onClick={onAddValue}>
                    <IconPlus className="w-4 h-4 mr-1" />
                  {t('wizard.addValue', { defaultValue: 'Add value' })}
                  </Button>
                </div>
              </section>
            )}

            {step === 'visual-styles' && (
              <section className="space-y-4">
                <div className="flex items-start gap-2">
                  <IconTextFont className="w-5 h-5 text-primary mt-0.5" />
                  <p className="text-base text-muted-foreground">{t('wizard.visualStylesDescription', { defaultValue: 'Define visual styles for your pieces.' })}</p>
                </div>
                <div className="space-y-2">
                  {(brand.visual_aesthetic || []).map((style, index) => (
                    <div key={`style-${index}`} className="flex items-center gap-2">
                      <Input
                        value={style}
                        onChange={(event) => onUpdateAesthetic(index, event.target.value)}
                        placeholder={t('wizard.visualStylePlaceholder', { defaultValue: 'e.g. Minimalist, editorial, premium...' })}
                        className={WIZARD_FIELD_CLASS}
                      />
                      <Button type="button" variant="ghost" size="sm" className={BRAND_KIT_INLINE_REMOVE_BUTTON_CLASS} onClick={() => onRemoveAesthetic(index)}>
                        <IconClose className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className={BRAND_KIT_OUTLINE_DASHED_BUTTON_CLASS} onClick={onAddAesthetic}>
                    <IconPlus className="w-4 h-4 mr-1" />
                  {t('wizard.addStyle', { defaultValue: 'Add style' })}
                  </Button>
                </div>
              </section>
            )}

            {step === 'tone' && (
              <section className="space-y-4">
                <div className="flex items-start gap-2">
                  <IconMessage className="w-5 h-5 text-primary mt-0.5" />
                  <p className="text-base text-muted-foreground">{t('wizard.toneDescription', { defaultValue: 'Choose the tone of voice of your brand.' })}</p>
                </div>
                <div className="space-y-2">
                  {(brand.tone_of_voice || []).map((tone, index) => (
                    <div key={`tone-${index}`} className="flex items-center gap-2">
                      <Input
                        value={tone}
                        onChange={(event) => onUpdateTone(index, event.target.value)}
                        placeholder={t('wizard.tonePlaceholder', { defaultValue: 'e.g. Close, professional, direct...' })}
                        className={WIZARD_FIELD_CLASS}
                      />
                      <Button type="button" variant="ghost" size="sm" className={BRAND_KIT_INLINE_REMOVE_BUTTON_CLASS} onClick={() => onRemoveTone(index)}>
                        <IconClose className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className={BRAND_KIT_OUTLINE_DASHED_BUTTON_CLASS} onClick={onAddTone}>
                    <IconPlus className="w-4 h-4 mr-1" />
                  {t('wizard.addTone', { defaultValue: 'Add tone' })}
                  </Button>
                </div>
              </section>
            )}

            {step === 'marketing-hooks' && (
              <section className="space-y-4">
                <div className="flex items-start gap-2">
                  <IconMegaphone className="w-5 h-5 text-primary mt-0.5" />
                  <p className="text-base text-muted-foreground">{t('wizard.marketingHooksDescription', { defaultValue: 'Define marketing headlines for campaigns.' })}</p>
                </div>
                <div className="space-y-2">
                  {textAssets.marketing_hooks.map((hook, index) => (
                    <div key={`hook-${index}`} className="flex items-start gap-2">
                      <textarea
                        value={hook}
                        onChange={(event) => {
                          const nextHooks = [...textAssets.marketing_hooks]
                          nextHooks[index] = event.target.value
                          onChangeTextAssets({ ...textAssets, marketing_hooks: nextHooks })
                        }}
                        className={cn(WIZARD_TEXTAREA_CLASS, "min-h-[108px]")}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={BRAND_KIT_INLINE_REMOVE_BUTTON_CLASS}
                        onClick={() => {
                          const nextHooks = textAssets.marketing_hooks.filter((_, itemIndex) => itemIndex !== index)
                          onChangeTextAssets({ ...textAssets, marketing_hooks: nextHooks })
                        }}
                      >
                        <IconClose className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={BRAND_KIT_OUTLINE_DASHED_BUTTON_CLASS}
                    onClick={() => onChangeTextAssets({ ...textAssets, marketing_hooks: [...textAssets.marketing_hooks, t('wizard.newHook', { defaultValue: 'New headline' })] })}
                  >
                    <IconPlus className="w-4 h-4 mr-1" />
                  {t('wizard.addHook', { defaultValue: 'Add hook' })}
                  </Button>
                </div>
              </section>
            )}

            {step === 'ctas' && (
              <section className="space-y-4">
                <div className="flex items-start gap-2">
                  <IconMouseClick className="w-5 h-5 text-primary mt-0.5" />
                  <p className="text-base text-muted-foreground">{t('wizard.ctasDescription', { defaultValue: 'Add calls to action (CTAs).' })}</p>
                </div>
                <p className="text-base text-muted-foreground">
                  {t('wizard.ctasUsageHint', { defaultValue: 'These lines will be used in buttons and closing phrases.' })}
                </p>
                <div className="space-y-2">
                  {textAssets.ctas.map((cta, index) => (
                    <div key={`cta-${index}`} className="flex items-center gap-2">
                      <Input
                        value={cta}
                        onChange={(event) => {
                          const nextCtas = [...textAssets.ctas]
                          nextCtas[index] = event.target.value
                          onChangeTextAssets({ ...textAssets, ctas: nextCtas })
                        }}
                        placeholder={t('wizard.ctaPlaceholder', { defaultValue: 'e.g. Book now' })}
                        className={WIZARD_FIELD_CLASS}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={BRAND_KIT_INLINE_REMOVE_BUTTON_CLASS}
                        onClick={() => {
                          const nextCtas = textAssets.ctas.filter((_, itemIndex) => itemIndex !== index)
                          onChangeTextAssets({ ...textAssets, ctas: nextCtas })
                        }}
                      >
                        <IconClose className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={BRAND_KIT_OUTLINE_DASHED_BUTTON_CLASS}
                    onClick={() => onChangeTextAssets({ ...textAssets, ctas: [...textAssets.ctas, t('wizard.newCta', { defaultValue: 'New CTA' })] })}
                  >
                    <IconPlus className="w-4 h-4 mr-1" />
                  {t('wizard.addCta', { defaultValue: 'Add CTA' })}
                  </Button>
                </div>
              </section>
            )}

            {step === 'image-gallery' && (
              <section className="space-y-4">
                <p className="text-base text-muted-foreground">
                {t('wizard.imagesReview', { defaultValue: 'Review the detected images and upload any you want to keep in your kit.' })}
                </p>
                <ImageGallery
                  images={brand.images || []}
                  isUploading={isUploadingImages}
                  onUpload={onUploadImages}
                  onRemoveImage={onRemoveImage}
                  onOpenLightbox={onOpenLightbox}
                />
              </section>
            )}

            {step === 'done' && (
              <section className={cn(BRAND_KIT_CALLOUT_CLASS, "space-y-3 p-5")}>
                <div className="flex items-start gap-3">
                  <IconCheck className="w-5 h-5 text-primary mt-0.5" />
                  <div className="space-y-1">
                  <p className="font-medium text-base">{t('wizard.baseReady', { defaultValue: 'Kit base ready' })}</p>
                    <p className="text-base text-muted-foreground">{t('wizard.readyEditorDescription', { defaultValue: 'You can keep refining everything in the editor now.' })}</p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Resumen: {brand.brand_name?.trim() ? 'nombre definido,' : 'nombre pendiente,'}{' '}
                    {normalizeUrl(brand.url || '')
                      ? t('wizard.summary.validUrl', { defaultValue: 'valid URL,' })
                      : t('wizard.summary.noUrl', { defaultValue: 'no URL,' })}{' '}
                    {(currentLogos.length || 0) > 0
                      ? t('wizard.summary.logos', { count: currentLogos.length, defaultValue: '{{count}} logos,' })
                      : t('wizard.summary.noLogos', { defaultValue: 'no logos,' })}{' '}
                    {t('wizard.summary.colors', { count: brand.colors?.length || 0, defaultValue: '{{count}} colors,' })}{' '}
                    {t('wizard.summary.fonts', { count: brand.fonts?.length || 0, defaultValue: '{{count}} fonts,' })}{' '}
                    {t('wizard.summary.images', { count: brand.images?.length || 0, defaultValue: '{{count}} images.' })}
                </div>
                {!canFinishWizard && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                    <p className="text-sm text-amber-700">
                      {t('wizard.missingCompletionGate', {
                        defaultValue: 'You still need {{missing}}% to reach the minimum {{minimum}}% and unlock Image.',
                        missing: completionMissing,
                        minimum: minimumCompletionToFinish,
                      })}
                    </p>
                  </div>
                )}
              </section>
            )}
          </div>

          <div className="px-8 pb-8 pt-4 shrink-0">
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
              <Button variant="outline" onClick={goBack} disabled={stepIndex === 0} className={cn(BRAND_KIT_SECONDARY_BUTTON_CLASS, "h-[42px] text-base")}>
                <IconArrowLeft className="w-4 h-4 mr-1" />
                {t('wizard.previous', { defaultValue: 'Previous' })}
              </Button>
              </div>
              <div className="flex items-center justify-end gap-2 flex-wrap">
                {step !== 'done' ? (
                  <Button
                    onClick={handleNextClick}
                    className={cn(BRAND_KIT_SECONDARY_BUTTON_CLASS, "h-[42px] text-base")}
                    disabled={previewLoading || previewAnalyzing}
                  >
              {step === 'url' && hasUrlValue
                ? t('wizard.analyzeAndContinue', { defaultValue: 'Analyze and continue' })
                : t('wizard.next', { defaultValue: 'Next' })}
                    <IconArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={completeWizard} className={cn(BRAND_KIT_SECONDARY_BUTTON_CLASS, "h-[42px] text-base")} disabled={!canFinishWizard}>
                    {canFinishWizard
                      ? t('wizard.goToEditor', { defaultValue: 'Go to editor' })
                      : t('wizard.pendingCompletion', { defaultValue: '{{missing}}% left', missing: completionMissing })}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
      <Dialog
        open={previewOpen}
        onOpenChange={(next) => {
          if (!next && (previewLoading || previewAnalyzing)) return
          setPreviewOpen(next)
        }}
      >
        <DialogContent
          showCloseButton={!previewLoading && !previewAnalyzing}
          onEscapeKeyDown={(event) => {
            if (previewLoading || previewAnalyzing) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (previewLoading || previewAnalyzing) event.preventDefault()
          }}
          className={cn(BRAND_KIT_MODAL_CLASS, "!w-[min(96vw,980px)] !max-w-[980px] sm:!max-w-[980px] !rounded-[1.9rem] p-0")}
        >
          <DialogHeader className={cn(BRAND_KIT_MODAL_HEADER_CLASS, "px-8 pb-3 pt-8 pr-20")}>
          <DialogTitle className={BRAND_KIT_MODAL_TITLE_CLASS}>{t('wizard.confirmWebsiteTitle', { defaultValue: 'Confirm your website' })}</DialogTitle>
            <DialogDescription className={BRAND_KIT_MODAL_DESCRIPTION_CLASS}>
              {previewData?.url || currentUrl}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-8 pb-4 pt-2">
            {previewLoading && (
              <div className="rounded-[1.2rem] border border-border/70 p-6 flex items-center justify-center gap-2 text-muted-foreground bg-[hsl(var(--surface-alt))]/52">
                <Loader2 className="h-4 w-4" />
                {t('wizard.preparingPreview', { defaultValue: 'Preparing preview...' })}
              </div>
            )}

            {previewAnalyzing && (
              <div className="rounded-[1.2rem] border border-border/70 p-6 space-y-4 bg-[hsl(var(--surface-alt))]/52">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4" />
              {t('wizard.analyzingWebsite', { defaultValue: 'We are analyzing your website. This may take a few seconds.' })}
                </div>
                <div className="space-y-2">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${analyzingProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
              {analyzingMessages[analyzingMessageIndex]}
                  </p>
                </div>
              </div>
            )}

            {!previewLoading && previewData?.screenshotUrl && (
              <div className="rounded-[1.25rem] border border-border/70 overflow-hidden bg-[hsl(var(--surface-alt))]/42 flex items-center justify-center p-3">
                <img
                  src={previewData.screenshotUrl}
                    alt={t('wizard.websitePreviewAlt', { defaultValue: 'Website preview' })}
                  className="w-full max-h-[520px] object-contain rounded-[1.2rem]"
                />
              </div>
            )}

            {!previewLoading && !previewData?.screenshotUrl && (
              <div className={cn(BRAND_KIT_CALLOUT_CLASS, "p-4 text-sm text-muted-foreground")}>
                  {t('wizard.previewUnavailable', { defaultValue: 'We could not show the screenshot right now, but you can still confirm whether the URL is correct.' })}
              </div>
            )}

            {!previewLoading && previewData?.title && (
              <p className="text-sm text-muted-foreground">
                  {t('wizard.detectedTitle', { defaultValue: 'Detected title:' })} <span className="text-foreground font-medium">{previewData.title}</span>
              </p>
            )}

            {!previewLoading && previewError && (
              <p className="text-sm text-destructive">{previewError}</p>
            )}
          </div>

          <DialogFooter className={BRAND_KIT_MODAL_FOOTER_CLASS}>
            <Button variant="outline" onClick={() => setPreviewOpen(false)} disabled={previewLoading || previewAnalyzing} className={BRAND_KIT_SECONDARY_BUTTON_CLASS}>
            {t('wizard.fixUrl', { defaultValue: 'No, fix URL' })}
            </Button>
            {previewAnalyzing ? (
              <Button
                variant="link"
                onClick={stopPreviewAnalysis}
                className="h-10 px-0 text-sm text-muted-foreground hover:text-destructive"
              >
                {t('wizard.stopAnalysis', { defaultValue: 'Stop' })}
              </Button>
            ) : null}
            <Button onClick={confirmAnalyze} disabled={previewLoading || previewAnalyzing || !previewData?.url} className={BRAND_KIT_SECONDARY_BUTTON_CLASS}>
            {previewAnalyzing
              ? t('wizard.analyzing', { defaultValue: 'Analyzing...' })
              : t('wizard.confirmWebsite', { defaultValue: 'Yes, this is my website' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}


