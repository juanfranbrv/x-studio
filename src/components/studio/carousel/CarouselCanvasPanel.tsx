'use client'

import { Loader2 } from '@/components/ui/spinner'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { GeneratedCopyCard } from '@/components/studio/GeneratedCopyCard'
import { useToast } from '@/hooks/use-toast'
import { IconRefresh, IconZoomIn, IconZoomOut, IconImage, IconFingerprint, IconImageDownload, IconSquareArrowDown, IconBug, IconVideo, IconMusic, IconMaximize, IconAiChat, IconEdit, IconEye } from '@/components/ui/icons'
import JSZip from 'jszip'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { CarouselSlide, SlideContent } from '@/app/actions/generate-carousel'
import { DigitalStaticLoader } from '../DigitalStaticLoader'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ReferenceImageRole } from '@/lib/creation-flow-types'
import { useTranslation } from 'react-i18next'
import {
    STUDIO_DECISION_DIALOG_CLASS,
    STUDIO_DECISION_DIALOG_HEADER_CLASS,
    STUDIO_DECISION_DIALOG_TITLE_CLASS,
} from '@/components/studio/shared/dialogStyles'
import type { PreviewLayoutMode } from '@/components/studio/previewLayoutMode'
import {
    DEFAULT_SLIDE_DURATION_MS,
    DEFAULT_LAST_SLIDE_DURATION_MS,
    formatDurationLabel,
    splitVisualPromptForEditor,
    CANVAS_FLOATING_TOOLBAR_CLASS,
    CANVAS_TOOL_BUTTON_CLASS,
    CANVAS_TOOL_VALUE_CLASS,
    CANVAS_TOOL_ICON_CLASS,
} from './CarouselCanvasPanel.helpers'
import { renderCompositionGhostIcon, StyleReferenceCorner } from './CarouselCanvasPanel.parts'

interface CarouselCanvasPanelProps {
    slides: CarouselSlide[]
    scriptSlides?: SlideContent[] | null
    currentIndex: number
    onSelectSlide: (index: number) => void
    onRegenerateSlide: (index: number, correctionPrompt?: string) => void
    onUpdateSlideScript?: (index: number, updates: { headline?: string; subtitle?: string; title?: string; description?: string; visualPrompt?: string; mustKeepFacts?: string[] }) => void
    isGenerating?: boolean
    isRegenerating: boolean
    regeneratingIndex: number | null
    aspectRatio: '1:1' | '4:5' | '3:4'
    caption?: string
    onCaptionChange?: (value: string) => void
    onRegenerateCaption?: () => void
    onCancelCaptionGeneration?: () => void
    isCaptionGenerating?: boolean
    isCancelingCaption?: boolean
    isCaptionLocked?: boolean
    onToggleCaptionLock?: () => void
    referenceImages?: Array<{ url: string; source: 'upload' | 'brandkit' | 'preset' }>
    referenceImageRoles?: Record<string, ReferenceImageRole>
    referenceImageMode?: 'upload' | 'brandkit' | 'generate'
    brandKitTexts?: Array<{ id: string; label: string; value: string }>
    brandName?: string
    hook?: string
    selectedLogoUrl?: string
    showPrimaryLogoOnCurrentSlide?: boolean
    compositionGhostIcon?: string
    isAdmin?: boolean
    showDebugTools?: boolean
    previewLayoutMode?: PreviewLayoutMode
}

export function CarouselCanvasPanel({
    slides,
    scriptSlides = null,
    currentIndex,
    onSelectSlide,
    onRegenerateSlide,
    onUpdateSlideScript,
    isGenerating = false,
    isRegenerating,
    regeneratingIndex,
    aspectRatio,
    caption,
    onCaptionChange,
    onRegenerateCaption,
    onCancelCaptionGeneration,
    isCaptionGenerating = false,
    isCancelingCaption = false,
    isCaptionLocked = false,
    onToggleCaptionLock,
    referenceImages = [],
    referenceImageRoles = {},
    referenceImageMode = 'upload',
    brandKitTexts = [],
    brandName,
    hook,
    selectedLogoUrl,
    showPrimaryLogoOnCurrentSlide = true,
    compositionGhostIcon,
    isAdmin = false,
    showDebugTools = true,
    previewLayoutMode = 'default'
}: CarouselCanvasPanelProps) {
    const { t } = useTranslation()
    const tt = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
        t(key, { defaultValue, ...options })
    const carouselVideoConfig = useQuery(api.settings.getCarouselVideoConfig, {})
    const activeAudioTracks = useQuery(api.adminAudio.listActiveTracks, {})
    const slideDurationMs = carouselVideoConfig?.slideDurationMs ?? DEFAULT_SLIDE_DURATION_MS
    const lastSlideDurationMs = carouselVideoConfig?.lastSlideDurationMs ?? DEFAULT_LAST_SLIDE_DURATION_MS
    const [zoom, setZoom] = useState(110)
    const [hasManualZoom, setHasManualZoom] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const [viewportHeight, setViewportHeight] = useState(800)
    const [viewportWidth, setViewportWidth] = useState(1200)
    const [isMobile, setIsMobile] = useState(false)
    const lastViewportHeightRef = useRef<number | null>(null)
    const [isEditingScript, setIsEditingScript] = useState(false)
    const [isEditingVisualContent, setIsEditingVisualContent] = useState(false)
    const [showScriptOverlay, setShowScriptOverlay] = useState(false)
    const [draftTitle, setDraftTitle] = useState('')
    const [draftHeadline, setDraftHeadline] = useState('')
    const [draftSubtitle, setDraftSubtitle] = useState('')
    const [draftDescription, setDraftDescription] = useState('')
    const [draftVisualPrompt, setDraftVisualPrompt] = useState('')
    const loaderVisibleRef = useRef(false)
    const [debugOpen, setDebugOpen] = useState(false)
    const [debugSlide, setDebugSlide] = useState<CarouselSlide | null>(null)
    const [isExportingVideo, setIsExportingVideo] = useState(false)
    const [videoExportProgress, setVideoExportProgress] = useState(0)
    const [videoExportPhase, setVideoExportPhase] = useState('')
    const [prevImageUrl, setPrevImageUrl] = useState<string | null>(null)
    const [wasJustGenerated, setWasJustGenerated] = useState(false)
    const [currentSlideNaturalSize, setCurrentSlideNaturalSize] = useState<{ w: number; h: number } | null>(null)
    const { toast } = useToast()

    // Track viewport for responsive heights
    useEffect(() => {
        const updateDimensions = () => {
            setViewportHeight(window.innerHeight)
            setIsMobile(window.innerWidth < 768)
            setViewportWidth(window.innerWidth)
        }
        updateDimensions()
        window.addEventListener('resize', updateDimensions)
        return () => window.removeEventListener('resize', updateDimensions)
    }, [])

    const getWidthBucket = (width: number) => {
        if (width <= 1366) return '1:HD (<=1366)'
        if (width <= 1600) return '2:HD+ (1367-1600)'
        if (width <= 1920) return '3:FHD (1601-1920)'
        return '4:QHD+ (>=1921)'
    }

    const getHeightBucket = (height: number) => {
        if (height <= 760) return 'H1:<=760'
        if (height <= 900) return 'H2:761-900'
        if (height <= 1080) return 'H3:901-1080'
        return 'H4:>=1081'
    }

    useEffect(() => {
        const last = lastViewportHeightRef.current
        lastViewportHeightRef.current = viewportHeight
        if (last !== null && Math.abs(last - viewportHeight) > 40) {
            setHasManualZoom(false)
        }
    }, [viewportHeight])

    const getFooterOffset = () => {
        const slide = slides[currentIndex]
        if (isMobile) return slide?.imageUrl ? 180 : 120
        if (previewLayoutMode === 'compact-scroll') {
            return slide?.imageUrl ? 240 : 180
        }
        const base = slide?.imageUrl ? 700 : 400
        const maxOffset = Math.max(220, Math.round(viewportHeight * 0.45))
        return Math.min(base, maxOffset)
    }

    const getAutoZoomBoost = (height: number) => {
        if (isMobile) return 1
        if (height <= 760) return 1.25
        if (height <= 900) return 1.2
        if (height <= 1080) return 1.14
        return 1.08
    }

    const calcMaxZoom = () => {
        if (isMobile) return 100
        const { canvasHeight: baseHeight, availableHeight } = getCanvasFitMetrics()

        const fitScale = availableHeight / baseHeight
        const boost = getAutoZoomBoost(viewportHeight)
        return Math.min(Math.round(fitScale * 100 * boost), 300)
    }

    const currentSlide = slides[currentIndex]
    const currentScriptSlide = useMemo(() => {
        if (!Array.isArray(scriptSlides) || scriptSlides.length === 0) return null
        const slideIndex = currentSlide?.index
        if (typeof slideIndex === 'number') {
            const byIndex = scriptSlides.find((slide) => slide.index === slideIndex)
            if (byIndex) return byIndex
        }
        return scriptSlides[currentIndex] || null
    }, [currentIndex, currentSlide?.index, scriptSlides])
    const currentVisualContent = useMemo(() => {
        const value = typeof currentScriptSlide?.visualPrompt === 'string'
            ? currentScriptSlide.visualPrompt.trim()
            : ''
        return value || ''
    }, [currentScriptSlide])
    const currentVisualPromptParts = useMemo(
        () => splitVisualPromptForEditor(currentVisualContent),
        [currentVisualContent]
    )
    const currentVisualContentEditable = currentVisualPromptParts.editable
    const currentVisualIntentHidden = currentVisualPromptParts.hiddenIntent
    const currentImageUrl = currentSlide?.imageUrl || null
    const fallbackCanvasAspectRatio = useMemo(() => {
        const [w, h] = aspectRatio.split(':').map(Number)
        return w / h
    }, [aspectRatio])
    const canvasAspectRatio = useMemo(() => {
        if (currentImageUrl && currentSlideNaturalSize?.w && currentSlideNaturalSize?.h) {
            return currentSlideNaturalSize.w / currentSlideNaturalSize.h
        }
        return fallbackCanvasAspectRatio
    }, [currentImageUrl, currentSlideNaturalSize, fallbackCanvasAspectRatio])

    const getCanvasFitMetrics = () => {
        const ratio = canvasAspectRatio
        const footerOffset = getFooterOffset()
        const availableHeight = Math.max(200, viewportHeight - footerOffset)
        const availableWidth = (
            containerRef.current?.parentElement?.clientWidth
                ? containerRef.current.parentElement.clientWidth - (isMobile ? 12 : 32)
                : (isMobile ? window.innerWidth - 12 : 900)
        )

        let canvasWidth: number
        let canvasHeight: number

        if (isMobile) {
            canvasWidth = availableWidth
            canvasHeight = canvasWidth / ratio
        } else if (ratio >= 1) {
            canvasWidth = Math.min(availableWidth, availableHeight * ratio)
            canvasHeight = canvasWidth / ratio
        } else {
            canvasHeight = Math.min(availableHeight, availableWidth / ratio)
            canvasWidth = canvasHeight * ratio
        }

        return {
            ratio,
            availableHeight,
            availableWidth,
            canvasWidth,
            canvasHeight,
        }
    }

    useEffect(() => {
        setCurrentSlideNaturalSize(null)
    }, [currentImageUrl])

    useEffect(() => {
        if (hasManualZoom) return
        const autoZoom = calcMaxZoom()
        if (zoom !== autoZoom) setZoom(autoZoom)
    }, [hasManualZoom, isMobile, viewportHeight, zoom, currentSlide?.imageUrl, canvasAspectRatio])

    useEffect(() => {
        if (!isMobile) return
        setHasManualZoom(false)
        setZoom(100)
    }, [isMobile, currentSlide?.imageUrl, canvasAspectRatio])

    const hasScript = Boolean(currentSlide && !currentSlide.imageUrl && (currentSlide.title || currentSlide.description))
    const completedSlides = slides.filter(s => s.status === 'done').length
    const isGeneratingAny = isGenerating || slides.some(s => s.status === 'generating') || isRegenerating
    const isCurrentSlideRegenerating = Boolean(isRegenerating && regeneratingIndex === currentIndex)
    const hasAnyImage = slides.some(s => Boolean(s.imageUrl))
    const isLoaderVisible = Boolean(isGeneratingAny && !hasAnyImage)
    useEffect(() => {
        if (!currentSlide) return
        setDraftTitle(currentSlide.title || '')
        setDraftHeadline(currentSlide.headline || '')
        setDraftSubtitle(currentSlide.subtitle || '')
        setDraftDescription(currentSlide.description || '')
        setDraftVisualPrompt(currentVisualContentEditable)
        setIsEditingScript(false)
        setIsEditingVisualContent(false)
        setShowScriptOverlay(false)
    }, [currentSlide?.index, currentVisualContentEditable])

    useEffect(() => {
        loaderVisibleRef.current = isLoaderVisible
    }, [isLoaderVisible])

    useEffect(() => {
        if (!showDebugTools) {
            setDebugOpen(false)
        }
    }, [showDebugTools])

    useEffect(() => {
        if (isGenerating && currentImageUrl && currentImageUrl !== prevImageUrl) {
            setWasJustGenerated(true)
            setPrevImageUrl(currentImageUrl)
        } else if (currentImageUrl && currentImageUrl !== prevImageUrl) {
            setPrevImageUrl(currentImageUrl)
            if (wasJustGenerated) {
                const timer = setTimeout(() => setWasJustGenerated(false), 600)
                return () => clearTimeout(timer)
            }
        }
    }, [isGenerating, currentImageUrl, prevImageUrl, wasJustGenerated])

    const handleSaveScript = () => {
        if (!currentSlide) return
        const nextHeadline = draftHeadline.trim() || currentSlide.headline
        const nextSubtitle = draftSubtitle.trim() || currentSlide.subtitle
        const nextDescription = draftDescription.trim() || currentSlide.description
        const headlineChanged = nextHeadline !== (currentSlide.headline || '')
        const subtitleChanged = nextSubtitle !== (currentSlide.subtitle || '')
        onUpdateSlideScript?.(currentSlide.index, {
            title: currentSlide.title,
            headline: nextHeadline,
            subtitle: nextSubtitle,
            description: nextDescription
        })
        setIsEditingScript(false)
        if ((headlineChanged || subtitleChanged) && currentSlide.imageUrl) {
            setShowScriptOverlay(false)
            onRegenerateSlide(currentSlide.index)
        }
    }

    const handleSaveVisualContent = () => {
        if (!currentSlide) return
        const nextEditablePrompt = draftVisualPrompt.trim() || currentVisualContentEditable
        const nextVisualPrompt = [nextEditablePrompt, currentVisualIntentHidden].filter(Boolean).join(' ').trim()
        onUpdateSlideScript?.(currentSlide.index, {
            visualPrompt: nextVisualPrompt
        })
        setIsEditingVisualContent(false)
    }

    const handleOpenDebug = () => {
        if (!currentSlide) return
        setDebugSlide(currentSlide)
        setDebugOpen(true)
    }

    const appendBrandText = (currentValue: string, value: string) => {
        const trimmed = value.trim()
        if (!trimmed) return currentValue
        if (!currentValue.trim()) return trimmed
        return `${currentValue} ${trimmed}`
    }

    const renderBrandTextMenu = (onSelect: (value: string) => void) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title={tt('common:preview.useBrandText', 'Use Brand Kit text')}
                >
                    <IconFingerprint className="w-4 h-4" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 max-h-80 overflow-y-auto">
                <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
                    {tt('common:preview.brandTexts', 'Brand Kit texts')}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {brandKitTexts.length === 0 ? (
                    <DropdownMenuItem disabled className="text-xs text-muted-foreground italic">
                        {tt('common:preview.noBrandTexts', 'No texts available')}
                    </DropdownMenuItem>
                ) : (
                    brandKitTexts.map((option) => (
                        <DropdownMenuItem
                            key={option.id}
                            onClick={() => onSelect(option.value)}
                            className="text-xs flex flex-col items-start gap-0.5 py-2"
                        >
                            <span className="text-[9px] uppercase text-primary font-bold">{option.label}</span>
                            <span className="text-foreground truncate max-w-full">{option.value}</span>
                        </DropdownMenuItem>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )

    // Navigation handlers
    const handlePrevious = () => currentIndex > 0 && onSelectSlide(currentIndex - 1)
    const handleNext = () => currentIndex < slides.length - 1 && onSelectSlide(currentIndex + 1)

    // Zoom handlers
    const handleIconZoomIn = () => {
        setHasManualZoom(true)
        setZoom(z => Math.min(z + 25, 300))
    }
    const handleIconZoomOut = () => {
        setHasManualZoom(true)
        setZoom(z => Math.max(z - 25, 25))
    }
    const handleResetZoom = () => {
        setHasManualZoom(true)
        setZoom(100)
    }

    const handleMaximizeZoom = () => {
        setHasManualZoom(true)
        setZoom(calcMaxZoom())
    }

    // Download handlers
    const handleDownloadCurrent = () => {
        if (!currentSlide?.imageUrl) return
        const link = document.createElement('a')
        link.href = currentSlide.imageOriginalUrl || currentSlide.imageUrl
        link.download = `slide-${currentIndex + 1}.png`
        link.click()
    }

    const handleDownloadBundle = async () => {
        const timestamp = Date.now()
        const zip = new JSZip()

        // Add all slides to zip
        for (const [i, slide] of slides.entries()) {
            if (slide.imageUrl) {
                try {
                    const response = await fetch(slide.imageOriginalUrl || slide.imageUrl)
                    const blob = await response.blob()
                    zip.file(`slide-${i + 1}.png`, blob)
                } catch (e) {
                    console.error(`Failed to fetch slide ${i + 1}:`, e)
                }
            }
        }

        // Add caption as text file
        if (caption) {
            const textContent = `CAPTION:\n${caption}`.trimEnd()
            zip.file(`caption-${timestamp}.txt`, textContent)
        }

        // Generate and download ZIP
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        const zipUrl = URL.createObjectURL(zipBlob)
        const zipLink = document.createElement('a')
        zipLink.href = zipUrl
        // Format: brandname-hook-YYYY-MM-DD.zip
        const date = new Date()
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        const safeBrandName = (brandName || 'carousel').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const safeHook = (hook || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 30) || 'slides'
        zipLink.download = `${safeBrandName}-${safeHook}-${dateStr}.zip`
        document.body.appendChild(zipLink)
        zipLink.click()
        document.body.removeChild(zipLink)
        URL.revokeObjectURL(zipUrl)
    }

    const exportCarouselVideo = async (withMusic: boolean) => {
        const completedSlidesOrdered = [...slides]
            .filter((slide) => slide.status === 'done' && Boolean(slide.imageUrl))
            .sort((a, b) => a.index - b.index)

        if (completedSlidesOrdered.length === 0) {
            toast({
                title: tt('common:preview.noExportableSlidesTitle', 'No exportable slides'),
                description: tt('common:preview.noExportableSlidesDescription', 'Generate at least one slide before exporting video.'),
                variant: 'destructive'
            })
            return
        }

        const hasAllSlides = completedSlidesOrdered.length === slides.length
        if (!hasAllSlides) {
            toast({
                title: tt('common:preview.missingSlidesTitle', 'Slides still pending'),
                description: tt('common:preview.missingSlidesDescription', 'To export a full MP4, finish generating all the slides.'),
                variant: 'destructive'
            })
            return
        }

        setIsExportingVideo(true)
        setVideoExportProgress(5)
        setVideoExportPhase(tt('common:preview.preparingExport', 'Preparing export'))
        toast({
            title: tt('common:preview.exportingVideoTitle', 'Exporting video'),
            description: tt('common:preview.exportingVideoDescription', 'We are assembling the carousel MP4. This can take a moment.')
        })

        try {
            if (withMusic) {
                const songs = Array.isArray(activeAudioTracks)
                    ? activeAudioTracks.filter((track) => typeof track?.url === 'string' && track.url)
                    : []
                if (songs.length === 0) {
                    throw new Error(tt('common:preview.noExperimentalTracks', 'No hay pistas activas disponibles en Admin.'))
                }
            }

            setVideoExportProgress(15)
            setVideoExportPhase(tt('common:preview.loadingSlides', 'Loading slides'))
            const response = await fetch('/api/carousel/export-video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    slides: completedSlidesOrdered.map((slide) => ({
                        index: slide.index,
                        imageUrl: slide.imageUrl,
                    })),
                    aspectRatio,
                    withMusic,
                    brandName,
                    hook,
                }),
            })

            if (!response.ok) {
                const payload = await response.json().catch(() => null)
                throw new Error(
                    typeof payload?.error === 'string'
                        ? payload.error
                        : tt('common:preview.videoExportErrorDescription', 'The video could not be generated.')
                )
            }

            setVideoExportProgress(76)
            setVideoExportPhase(
                withMusic
                    ? tt('common:preview.renderingVideoWithAudio', 'Rendering video with audio: {{track}}', { track: tt('common:preview.experimentalTrack', 'compatible track') })
                    : tt('common:preview.renderingVideo', 'Rendering video')
            )

            setVideoExportProgress(94)
            setVideoExportPhase(tt('common:preview.finalizingFile', 'Finalizing file'))
            const blob = await response.blob()
            const downloadUrl = URL.createObjectURL(blob)
            const link = document.createElement('a')
            const extension = 'mp4'

            const date = new Date()
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
            const safeBrandName = (brandName || 'carousel').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            const safeHook = (hook || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 30) || 'video'

            link.href = downloadUrl
            link.download = `${safeBrandName}-${safeHook}-${dateStr}.${extension}`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(downloadUrl)
            setVideoExportProgress(100)
            setVideoExportPhase(tt('common:preview.completed', 'Completed'))

            toast({
                title: tt('common:preview.mp4ExportedTitle', 'MP4 exported'),
                description: tt('common:preview.mp4ExportedDescription', 'Ready to publish on Facebook or TikTok.')
            })
        } catch (error) {
            console.error('Video export error:', error)
            toast({
                title: tt('common:preview.videoExportErrorTitle', 'Video export error'),
                description: error instanceof Error ? error.message : tt('common:preview.videoExportErrorDescription', 'The video could not be generated.'),
                variant: 'destructive'
            })
        } finally {
            setTimeout(() => {
                setVideoExportProgress(0)
                setVideoExportPhase('')
            }, 350)
            setIsExportingVideo(false)
        }
    }

    const effectiveZoom = useMemo(() => {
        return zoom // Simplified for carousel as we don't have the same baseScale complexity yet
    }, [zoom])

    return (
        <div className="flex-1 flex flex-col h-full relative isolate overflow-x-hidden p-0">
            {/* Header Overlay - Balanced with Image Canvas */}
            <div className="absolute left-3 right-3 top-3 z-40 flex h-16 items-start justify-between px-3 pt-1 pointer-events-none md:left-4 md:right-4">
                {/* Left: Metadata */}
                <div />

                {/* Right: Actions */}
                <div className={CANVAS_FLOATING_TOOLBAR_CLASS}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={CANVAS_TOOL_BUTTON_CLASS}
                        onClick={handleIconZoomOut}
                        aria-label={tt('common:preview.zoomOut', 'Zoom out')}
                        title={tt('common:preview.zoomOut', 'Zoom out')}
                    >
                        <IconZoomOut className={CANVAS_TOOL_ICON_CLASS} />
                    </Button>
                    <button
                        type="button"
                        className={CANVAS_TOOL_VALUE_CLASS}
                        onClick={handleResetZoom}
                        title={tt('common:preview.resetZoom', 'Reset zoom')}
                        aria-label={tt('common:preview.resetZoomAria', 'Reset zoom')}
                    >
                        {zoom}%
                    </button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={CANVAS_TOOL_BUTTON_CLASS}
                        onClick={handleIconZoomIn}
                        aria-label={tt('common:preview.zoomIn', 'Zoom in')}
                        title={tt('common:preview.zoomIn', 'Zoom in')}
                    >
                        <IconZoomIn className={CANVAS_TOOL_ICON_CLASS} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={CANVAS_TOOL_BUTTON_CLASS}
                        onClick={handleMaximizeZoom}
                        aria-label={tt('common:preview.fitHeight', 'Fit to height')}
                        title={tt('common:preview.fitHeight', 'Fit to height')}
                    >
                        <IconMaximize className={CANVAS_TOOL_ICON_CLASS} />
                    </Button>
                    <Button variant="ghost" size="icon" className={CANVAS_TOOL_BUTTON_CLASS} onClick={handleDownloadCurrent} disabled={!currentSlide?.imageUrl} title={tt('common:preview.downloadCurrentSlide', 'Download current slide')} aria-label={tt('common:preview.downloadCurrentSlide', 'Download current slide')}>
                        <IconImageDownload className={CANVAS_TOOL_ICON_CLASS} />
                    </Button>
                    <Button variant="ghost" size="icon" className={CANVAS_TOOL_BUTTON_CLASS} onClick={handleDownloadBundle} disabled={completedSlides === 0} title={tt('common:preview.downloadCarouselZip', 'Download carousel ZIP')} aria-label={tt('common:preview.downloadCarouselZip', 'Download carousel ZIP')}>
                        <IconSquareArrowDown className={CANVAS_TOOL_ICON_CLASS} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={CANVAS_TOOL_BUTTON_CLASS}
                        onClick={() => onRegenerateSlide(currentIndex)}
                        disabled={!currentSlide || isRegenerating}
                        title={isCurrentSlideRegenerating
                            ? tt('common:preview.regeneratingCurrentSlide', 'Regenerating current slide...')
                            : tt('common:preview.regenerateCurrentSlide', 'Regenerate current slide')}
                        aria-label={isCurrentSlideRegenerating
                            ? tt('common:preview.regeneratingCurrentSlide', 'Regenerating current slide...')
                            : tt('common:preview.regenerateCurrentSlide', 'Regenerate current slide')}
                    >
                        {isRegenerating ? <Loader2 className="w-4 h-4" /> : <IconRefresh className={CANVAS_TOOL_ICON_CLASS} />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={CANVAS_TOOL_BUTTON_CLASS}
                        onClick={() => exportCarouselVideo(true)}
                        disabled={isExportingVideo || completedSlides === 0}
                        title={tt('common:preview.exportVideoWithMusic', 'Export video with music')}
                        aria-label={tt('common:preview.exportVideoWithMusic', 'Export video with music')}
                    >
                        <IconMusic className={cn(CANVAS_TOOL_ICON_CLASS, isExportingVideo && "animate-pulse")} />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className={CANVAS_TOOL_BUTTON_CLASS}
                        onClick={() => exportCarouselVideo(false)}
                        disabled={isExportingVideo || completedSlides === 0}
                        title={tt('common:preview.exportVideoDurations', 'Export video ({{slide}} / {{last}})', {
                            slide: formatDurationLabel(slideDurationMs),
                            last: formatDurationLabel(lastSlideDurationMs),
                        })}
                        aria-label={tt('common:preview.exportVideo', 'Export video')}
                    >
                        <IconVideo className={cn(CANVAS_TOOL_ICON_CLASS, isExportingVideo && "animate-pulse")} />
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className={cn(
                "flex-1 relative flex flex-col items-center justify-start thin-scrollbar",
                previewLayoutMode === 'compact-scroll'
                    ? 'overflow-visible'
                    : 'overflow-x-hidden overflow-y-auto',
                isMobile ? "pt-5 px-4 pb-4" : "pt-[1.1rem] px-5 pb-5"
            )}>
                {/* Canvas Scaling logic matching Image Canvas */}
                <div
                    className="shrink-0 flex items-start justify-center w-full"
                    style={(() => {
                        const { canvasHeight } = getCanvasFitMetrics()
                        return { height: `${canvasHeight * (zoom / 100)}px` }
                    })()}
                >
                    <div
                        ref={containerRef}
                        className={cn(
                            "canvas-panel relative flex shrink-0 items-center justify-center overflow-visible rounded-[1.65rem] border border-border/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] bg-dot shadow-[0_28px_64px_-42px_rgba(15,23,42,0.26)] transition-transform duration-300 ease-out",
                            wasJustGenerated && "canvas-success-flash"
                        )}
                        style={(() => {
                            const { canvasWidth, canvasHeight } = getCanvasFitMetrics()

                            return {
                                width: `${canvasWidth}px`,
                                height: `${canvasHeight}px`,
                                transform: `scale(${zoom / 100})`,
                                transformOrigin: 'top center',
                            }
                        })()}
                    >
                        <AnimatePresence mode="wait">
                            {/* Loading Overlay */}
                            {isLoaderVisible && (
                                <motion.div
                                    key="loader"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.8 }}
                                    className="absolute inset-0 z-50 overflow-hidden rounded-sm shadow-lg ring-1 ring-white/10"
                                >
                                    <DigitalStaticLoader />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {compositionGhostIcon && !isGeneratingAny && !currentSlide?.imageUrl && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none opacity-30">
                                {renderCompositionGhostIcon(compositionGhostIcon)}
                            </div>
                        )}

                        {/* Instagram-style slide navigation */}
                        {slides.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={handlePrevious}
                                    disabled={currentIndex === 0}
                                    className={cn(
                                        "absolute left-3 top-1/2 -translate-y-1/2 z-40",
                                        "h-[clamp(22px,4.5cqw,32px)] w-[clamp(22px,4.5cqw,32px)] rounded-full bg-white/90 shadow-lg",
                                        "flex items-center justify-center",
                                        "text-neutral-500 transition-all hover:bg-white hover:text-neutral-700",
                                        "disabled:opacity-0 disabled:pointer-events-none"
                                    )}
                                    aria-label={tt('common:preview.previousSlide', 'Previous slide')}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[45%] h-[45%]">
                                        <polyline points="15 18 9 12 15 6" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    disabled={currentIndex === slides.length - 1}
                                    className={cn(
                                        "absolute right-3 top-1/2 -translate-y-1/2 z-40",
                                        "h-[clamp(22px,4.5cqw,32px)] w-[clamp(22px,4.5cqw,32px)] rounded-full bg-white/90 shadow-lg",
                                        "flex items-center justify-center",
                                        "text-neutral-500 transition-all hover:bg-white hover:text-neutral-700",
                                        "disabled:opacity-0 disabled:pointer-events-none"
                                    )}
                                    aria-label={tt('common:preview.nextSlide', 'Next slide')}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[45%] h-[45%]">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </button>
                            </>
                        )}

                        {/* PREVIEW OVERLAYS (same as image module) */}
                        {!currentSlide?.imageUrl && (
                            <>
                                {(() => {
                                    const allImages = referenceImages.map((item, idx) => ({
                                        ...item,
                                        key: `${item.source}-${idx}`,
                                        role: referenceImageRoles?.[item.url] || 'content'
                                    }))

                                    const contentImages = allImages.filter((item) => item.role === 'content' || item.role === 'style_content')
                                    const styleImages = allImages.filter((item) => item.role === 'style' || item.role === 'style_content')
                                    const auxLogos = allImages.filter((item) => item.role === 'logo')
                                    const hasAiPromptReference = referenceImageMode === 'generate'
                                    const contentPreviewImages = contentImages.slice(0, 6)

                                    const renderStrip = (
                                        images: Array<{ url: string; source: 'upload' | 'brandkit' | 'preset'; key: string }>,
                                        positionClass: string
                                    ) => {
                                        if (images.length === 0) return null
                                        return (
                                            <div className={cn('absolute z-20 flex gap-2 flex-wrap max-w-[220px]', positionClass)}>
                                                {images.slice(0, 6).map((item, idx) => (
                                                    <div key={item.key} className="relative group">
                                                        <img
                                                            src={item.url}
                                                            alt={tt('common:auxLogos.uploadedAlt', 'Uploaded auxiliary logo {{index}}', { index: idx + 1 })}
                                                            loading="lazy"
                                                            decoding="async"
                                                            className="object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.28)]"
                                                            style={{ width: 'clamp(28px, 4.5cqw, 46px)', height: 'clamp(28px, 4.5cqw, 46px)' }}
                                                        />
                                                    </div>
                                                ))}
                                                {images.length > 6 && (
                                                    <div className="w-11 h-14 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center text-white text-[10px] font-bold ring-1 ring-white/20">
                                                        +{images.length - 6}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    }

                                    return (
                                        <>
                                            {styleImages.length > 0 && <StyleReferenceCorner url={styleImages[0].url} />}
                                            {renderStrip(auxLogos, 'bottom-6 right-4')}
                                            {(hasAiPromptReference || contentPreviewImages.length > 0) && (
                                                <div className="absolute top-2 right-4 z-40 flex flex-col items-end gap-2">
                                                    {hasAiPromptReference && (
                                                        <div className="relative group">
                                                            <IconAiChat
                                                                className="text-primary drop-shadow-[0_10px_18px_rgba(0,0,0,0.26)]"
                                                                style={{ width: 'var(--canvas-ai-size)', height: 'var(--canvas-ai-size)' }}
                                                            />
                                                        </div>
                                                    )}
                                                    {contentPreviewImages.map((item, idx) => (
                                                        <div key={item.key} className="relative group">
                                                            <img
                                                                src={item.url}
                                                                alt={tt('common:contentImage.ownImageAlt', 'Own content image {{index}}', { index: idx + 1 })}
                                                                loading="lazy"
                                                                decoding="async"
                                                                className="object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.28)]"
                                                                style={{ width: 'clamp(60px, 11cqw, 112px)', height: 'clamp(60px, 11cqw, 112px)' }}
                                                            />
                                                        </div>
                                                    ))}
                                                    {contentImages.length > 6 && (
                                                        <div className="min-w-7 h-7 px-2 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white text-[10px] font-bold ring-1 ring-white/20">
                                                            +{contentImages.length - 6}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )
                                })()}

                                {selectedLogoUrl && showPrimaryLogoOnCurrentSlide && (
                                    <div className="absolute top-1 left-4 z-20 group">
                                        <img
                                            src={selectedLogoUrl}
                                            alt={tt('common:brandDnaPanel.logoAlt', 'Logo')}
                                            loading="lazy"
                                            decoding="async"
                                            className="object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.26)]"
                                            style={{ width: 'var(--canvas-logo-size)', height: 'var(--canvas-logo-size)' }}
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {/* Debug + Script Toggle (Top Right) */}
                        {currentSlide?.imageUrl && (
                            <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setShowScriptOverlay(!showScriptOverlay)
                                        if (!showScriptOverlay) {
                                            setIsEditingScript(false)
                                        }
                                    }}
                                    className="h-9 w-9 rounded-full bg-white backdrop-blur border border-border shadow-sm hover:shadow-md transition-transform transition-shadow duration-200 hover:scale-[1.03] active:scale-[0.98]"
                                    title={showScriptOverlay
                                        ? tt('common:preview.showImage', 'Show image')
                                        : tt('common:preview.editHeadline', 'Edit headline')
                                    }
                                >
                                    {showScriptOverlay
                                        ? <IconEye className="w-4 h-4" />
                                        : <IconEdit className="w-4 h-4" />
                                    }
                                </Button>
                                {showDebugTools ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleOpenDebug}
                                        className="h-9 w-9 rounded-full bg-white backdrop-blur border border-border shadow-sm hover:shadow-md transition-transform transition-shadow duration-200 hover:scale-[1.03] active:scale-[0.98]"
                                        title={tt('common:preview.promptDebug', 'Prompt debug')}
                                    >
                                        <IconBug className="w-4 h-4" />
                                    </Button>
                                ) : null}
                            </div>
                        )}

                        {/* Content */}
                        {!currentSlide ? (
                            <div className="flex flex-col items-center justify-center text-muted-foreground p-12 text-center">
                                <div className="w-20 h-20 rounded-3xl bg-white border border-border/50 shadow-inner flex items-center justify-center mb-6">
                                    <IconImage className="w-10 h-10 opacity-20" />
                                </div>
                                <h3 className="text-lg font-semibold opacity-80">{tt('common:preview.startCreation', 'Start your creation')}</h3>
                                <p className="text-sm opacity-50 max-w-[200px] mt-1">{tt('common:preview.configureCarouselPanel', 'Set up the details in the right panel to generate slides')}</p>
                            </div>
                        ) : currentSlide.status === 'error' ? (
                            <div className="flex flex-col items-center justify-center bg-destructive/10 p-8 rounded-xl border border-destructive/20">
                                <p className="text-destructive font-medium mb-4">{currentSlide.error || tt('common:preview.slideError', 'Error on this slide')}</p>
                                <Button variant="outline" size="sm" onClick={() => onRegenerateSlide(currentIndex)}>
                                    <IconRefresh className="w-4 h-4 mr-2" /> {tt('common:actions.retry', 'Retry')}
                                </Button>
                            </div>
                        ) : currentSlide.imageUrl ? (
                            <div className="flex h-full w-full items-center justify-center">
                                <motion.div
                                    key={currentSlide.imageUrl}
                                    initial={wasJustGenerated ? { opacity: 0, scale: 1.02 } : { opacity: 1, scale: 1 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={wasJustGenerated ? {
                                        duration: 0.24,
                                        ease: 'easeOut',
                                    } : {
                                        duration: 0.12
                                    }}
                                    className="flex h-full w-full items-center justify-center"
                                >
                                    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.45rem] border border-border/45 bg-background/72 shadow-[0_18px_36px_-32px_rgba(15,23,42,0.14)] backdrop-blur-0">
                                        {isCurrentSlideRegenerating && (
                                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/42 backdrop-blur-sm">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-white shadow-lg">
                                                    <Loader2 className="h-6 w-6 text-primary" />
                                                </div>
                                                <div className="rounded-full border border-border/60 bg-white px-4 py-2 text-sm font-medium shadow-sm">
                                                    {tt('common:preview.regeneratingCurrentSlide', 'Regenerating this slide...')}
                                                </div>
                                            </div>
                                        )}
                                        {showScriptOverlay && !isCurrentSlideRegenerating && (
                                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-white/90 backdrop-blur-sm p-8">
                                                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/50">
                                                    {currentSlide.title || `${tt('common:preview.slide', 'Slide')} ${currentIndex + 1}`}
                                                </p>
                                                {isEditingScript ? (
                                                    <div className="w-full max-w-lg space-y-3">
                                                        <Input
                                                            value={draftHeadline}
                                                            onChange={(e) => setDraftHeadline(e.target.value)}
                                                            placeholder={tt('common:preview.slideHeadlinePlaceholder', 'Headline visible en la imagen')}
                                                            className="text-sm font-semibold text-center"
                                                            disabled={isGeneratingAny}
                                                            autoFocus
                                                        />
                                                        <Input
                                                            value={draftSubtitle}
                                                            onChange={(e) => setDraftSubtitle(e.target.value)}
                                                            placeholder={tt('common:preview.slideSubtitlePlaceholder', 'Subtítulo visible en la imagen')}
                                                            className="text-sm text-center"
                                                            disabled={isGeneratingAny}
                                                        />
                                                        <div className="flex gap-2 justify-center">
                                                            <Button size="sm" onClick={handleSaveScript} disabled={isGeneratingAny}>
                                                                {tt('common:preview.saveAndRegenerate', 'Save & regenerate')}
                                                            </Button>
                                                            <Button size="sm" variant="outline" onClick={() => {
                                                                setIsEditingScript(false)
                                                                setDraftHeadline(currentSlide.headline || '')
                                                                setDraftSubtitle(currentSlide.subtitle || '')
                                                                setDraftDescription(currentSlide.description || '')
                                                            }}>
                                                                {tt('common:actions.cancel', 'Cancel')}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <h3
                                                            className="cursor-text px-4 text-center text-lg font-semibold text-foreground"
                                                            onClick={() => {
                                                                setDraftHeadline(currentSlide.headline || '')
                                                                setDraftSubtitle(currentSlide.subtitle || '')
                                                                setDraftDescription(currentSlide.description || '')
                                                                setIsEditingScript(true)
                                                            }}
                                                            title={tt('common:preview.clickToEdit', 'Click to edit')}
                                                        >
                                                            {currentSlide.headline || currentSlide.title || `${tt('common:preview.slide', 'Slide')} ${currentIndex + 1}`}
                                                        </h3>
                                                        {currentSlide.subtitle && (
                                                            <p className="px-4 text-center text-sm text-muted-foreground">
                                                                {currentSlide.subtitle}
                                                            </p>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setDraftHeadline(currentSlide.headline || '')
                                                                setDraftSubtitle(currentSlide.subtitle || '')
                                                                setDraftDescription(currentSlide.description || '')
                                                                setIsEditingScript(true)
                                                            }}
                                                        >
                                                            {tt('common:preview.editScript', 'Edit script')}
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        <img
                                            src={currentSlide.imageUrl}
                                            alt={tt('common:preview.slideThumbnailAlt', 'Slide {{index}} thumbnail', { index: currentIndex + 1 })}
                                            className="h-full w-full object-contain"
                                            onLoad={(e) => {
                                                const target = e.currentTarget
                                                if (target.naturalWidth && target.naturalHeight) {
                                                    setCurrentSlideNaturalSize({
                                                        w: target.naturalWidth,
                                                        h: target.naturalHeight,
                                                    })
                                                }
                                            }}
                                        />
                                    </div>
                                </motion.div>
                            </div>
                        ) : hasScript ? (
                            <div className="w-full h-full flex items-center justify-center p-10">
                                <div className="w-full max-w-lg space-y-3">
                                    <div className="carousel-script-preview rounded-2xl border border-border/60 bg-white backdrop-blur-sm p-6 text-center shadow-lg space-y-3">
                                    <p className="uppercase tracking-widest text-muted-foreground" style={{ fontSize: 'var(--cs-label)' }}>
                                        {tt('common:preview.scriptPreview', 'Script preview')}
                                    </p>
                                    {isEditingScript ? (
                                        <div className="space-y-3 text-left">
                                            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/50 text-center" style={{ fontSize: 'var(--cs-label, 9px)' }}>
                                                {currentSlide?.title || `${tt('common:preview.slide', 'Slide')} ${currentIndex + 1}`}
                                            </p>
                                            <div className="relative">
                                                <Input
                                                    value={draftHeadline}
                                                    onChange={(e) => setDraftHeadline(e.target.value)}
                                                    placeholder={tt('common:preview.slideHeadlinePlaceholder', 'Headline visible en la imagen')}
                                                    className="text-sm font-semibold pr-9"
                                                    disabled={isGeneratingAny}
                                                />
                                                {brandKitTexts.length > 0 && renderBrandTextMenu((value) =>
                                                    setDraftHeadline(prev => appendBrandText(prev, value))
                                                )}
                                            </div>
                                            <Input
                                                value={draftSubtitle}
                                                onChange={(e) => setDraftSubtitle(e.target.value)}
                                                placeholder={tt('common:preview.slideSubtitlePlaceholder', 'Subtítulo visible en la imagen')}
                                                className="text-sm"
                                                disabled={isGeneratingAny}
                                            />
                                            <div className="flex gap-2 justify-center">
                                                <Button size="sm" onClick={handleSaveScript} disabled={isGeneratingAny}>
                                                    {tt('common:actions.save', 'Save')}
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => setIsEditingScript(false)} disabled={isGeneratingAny}>
                                                    {tt('common:actions.cancel', 'Cancel')}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => {
                                                    setIsEditingVisualContent(false)
                                                    setIsEditingScript(true)
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault()
                                                        setIsEditingVisualContent(false)
                                                        setIsEditingScript(true)
                                                    }
                                                }}
                                                className="space-y-2 cursor-text"
                                                aria-label={tt('common:preview.editScript', 'Edit script')}
                                                title={tt('common:preview.clickToEdit', 'Click to edit')}
                                            >
                                                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/50" style={{ fontSize: 'var(--cs-label, 9px)' }}>
                                                    {currentSlide?.title || `${tt('common:preview.slide', 'Slide')} ${currentIndex + 1}`}
                                                </p>
                                                <h3 className="font-semibold text-foreground" style={{ fontSize: 'var(--cs-title)', lineHeight: 1.2 }}>
                                                    {currentSlide?.headline || currentSlide?.title || `${tt('common:preview.slide', 'Slide')} ${currentIndex + 1}`}
                                                </h3>
                                                {currentSlide?.subtitle && (
                                                    <p className="text-muted-foreground/70 font-medium" style={{ fontSize: 'var(--cs-body)', lineHeight: 1.4 }}>
                                                        {currentSlide.subtitle}
                                                    </p>
                                                )}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    setIsEditingVisualContent(false)
                                                    setIsEditingScript(true)
                                                }}
                                                className="mt-1"
                                                style={{ fontSize: 'var(--cs-button)' }}
                                            >
                                                {tt('common:preview.editScript', 'Edit script')}
                                            </Button>
                                        </>
                                    )}
                                    </div>
                                    {(currentVisualContentEditable || isEditingVisualContent) && (
                                        <div className="rounded-2xl border border-border/60 bg-white backdrop-blur-sm p-4 text-left shadow-md space-y-1.5">
                                            <p
                                                className="uppercase tracking-widest text-muted-foreground"
                                                style={{ fontSize: 'calc(var(--cs-label) - 1px)' }}
                                            >
                                                {tt('common:preview.visualContent', 'Planned visual content')}
                                            </p>
                                            {isEditingVisualContent ? (
                                                <div className="space-y-3">
                                                    <Textarea
                                                        value={draftVisualPrompt}
                                                        onChange={(e) => setDraftVisualPrompt(e.target.value)}
                                                        placeholder={tt('common:preview.visualContent', 'Planned visual content')}
                                                        className="min-h-[110px] text-sm resize-none"
                                                        disabled={isGeneratingAny}
                                                    />
                                                    {currentVisualIntentHidden ? (
                                                        <p className="text-xs leading-relaxed text-muted-foreground">
                                                            {tt('common:preview.visualContentHint', 'The narrative intent and advanced visual rules are kept internally, so you do not need to edit them here.')}
                                                        </p>
                                                    ) : null}
                                                    <div className="flex gap-2">
                                                        <Button size="sm" onClick={handleSaveVisualContent} disabled={isGeneratingAny}>
                                                            {tt('common:actions.save', 'Save')}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setDraftVisualPrompt(currentVisualContentEditable)
                                                                setIsEditingVisualContent(false)
                                                            }}
                                                            disabled={isGeneratingAny}
                                                        >
                                                            {tt('common:actions.cancel', 'Cancel')}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <p
                                                        className="text-muted-foreground leading-relaxed"
                                                        style={{ fontSize: 'var(--cs-body)' }}
                                                    >
                                                        {currentVisualContentEditable}
                                                    </p>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setIsEditingScript(false)
                                                            setIsEditingVisualContent(true)
                                                        }}
                                                        className="mt-2"
                                                        style={{ fontSize: 'var(--cs-button)' }}
                                                    >
                                                        {tt('common:preview.editVisualContent', 'Edit visual content')}
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-muted-foreground opacity-30 flex flex-col items-center gap-2">
                                <Loader2 className="w-8 h-8" />
                                <span className="text-xs uppercase tracking-tighter font-mono">{tt('common:preview.pending', 'Pending')}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Lower Navigation & Thumbnails */}
                <div className="mt-4 w-full flex flex-col items-center gap-3 pb-4">
                    {/* Thumbnail Strip */}
                    {slides.length > 0 && (
                        <div className="flex max-w-full gap-2 overflow-x-auto px-2 pb-2 pt-1 no-scrollbar">
                            {slides.map((slide, index) => (
                                <button
                                    key={index}
                                    onClick={() => onSelectSlide(index)}
                                    className={cn(
                                        "relative flex-shrink-0 rounded-xl p-1.5 transition-colors transition-shadow transition-opacity duration-200",
                                        "bg-white backdrop-blur border border-border/60",
                                        aspectRatio === '1:1' ? "w-16 h-16" : "w-14 h-20",
                                        currentIndex === index
                                            ? "ring-2 ring-primary/70 shadow-[0_0_12px_hsl(var(--primary)/0.25)] z-10"
                                            : "opacity-60 hover:opacity-100"
                                    )}
                                >
                                    {/* Phone skin notch */}
                                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-1.5 rounded-full bg-foreground/15" />
                                    <div
                                        className={cn(
                                            "relative w-full h-full rounded-xl overflow-hidden bg-muted/60 border border-border/50",
                                            aspectRatio === '1:1' ? "aspect-square" : "aspect-[3/4]"
                                        )}
                                    >
                                        {slide.imageUrl ? (
                                            <img
                                                src={slide.imageUrl}
                                                alt={tt('common:preview.slideThumbnailAlt', 'Slide {{index}} thumbnail', {
                                                    index: index + 1,
                                                })}
                                                loading="lazy"
                                                decoding="async"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-muted flex items-center justify-center">
                                                <span className="text-[10px] font-mono opacity-50">{index + 1}</span>
                                            </div>
                                        )}
                                    </div>
                                    {slide.status === 'generating' && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                                            <div className="w-1 h-1 bg-primary-foreground rounded-full animate-ping" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Caption Card - Integrated with preview scroll */}
                {caption && (
                    <div className="mt-10 w-full max-w-[780px] shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 z-10 pb-16">
                        <GeneratedCopyCard
                            copy={caption}
                            hashtags={[]}
                            onRegenerate={onRegenerateCaption}
                            onCancel={onCancelCaptionGeneration}
                            isLoading={isCaptionGenerating}
                            isCanceling={isCancelingCaption}
                            isLocked={isCaptionLocked}
                            onToggleLock={onToggleCaptionLock}
                            onCopyChange={(val) => onCaptionChange?.(val)}
                            className="rounded-[1.45rem] border-border/45 bg-background/72 shadow-[0_18px_36px_-32px_rgba(15,23,42,0.14)] backdrop-blur-0"
                        />
                    </div>
                )}

            </div>

            <Dialog open={showDebugTools && debugOpen} onOpenChange={setDebugOpen}>
                <DialogContent
                    className="flex flex-col h-[calc(100vh-3rem)] top-6 bottom-6 left-auto right-6 translate-x-0 translate-y-0"
                    style={{ width: '620px', maxWidth: 'calc(100vw - 3rem)' }}
                >
                    <DialogHeader>
                        <DialogTitle>
                            {tt('common:preview.promptDebug', 'Prompt debug')} - {tt('common:preview.slide', 'Slide')} {debugSlide ? debugSlide.index + 1 : currentIndex + 1}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 overflow-y-auto pr-1">
                        <div className="space-y-3">
                            <div className="text-sm uppercase tracking-wider text-muted-foreground">
                                {tt('common:preview.sentImages', 'Images sent in the request')}
                            </div>
                            {debugSlide?.debugReferences && debugSlide.debugReferences.length > 0 ? (
                                <div className="flex flex-wrap gap-3">
                                    {debugSlide.debugReferences.map((ref, idx) => (
                                        <div key={`${ref.type}-${idx}`} className="w-24 space-y-1">
                                            <div className="w-24 h-24 rounded-lg overflow-hidden border border-border bg-muted/50">
                                                <img
                                                    src={ref.url}
                                                    alt={ref.label || ref.type}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {ref.label || ref.type}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">
                                    {tt('common:preview.noSentImages', 'No images were sent in this request.')}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <div className="text-sm uppercase tracking-wider text-muted-foreground">
                                {tt('common:preview.promptSent', 'Prompt sent to the model')}
                            </div>
                            <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-muted/30 p-4">
                                <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono text-foreground">
                                    {debugSlide?.debugPrompt || tt('common:preview.noPromptForSlide', 'There is no prompt recorded for this slide.')}
                                </pre>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isExportingVideo} onOpenChange={() => { }}>
                <DialogContent className={STUDIO_DECISION_DIALOG_CLASS}>
                    <DialogHeader className={STUDIO_DECISION_DIALOG_HEADER_CLASS}>
                        <DialogTitle className={STUDIO_DECISION_DIALOG_TITLE_CLASS}>{tt('common:preview.generatingVideo', 'Generating carousel video')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 px-6 pb-6">
                        <p className="text-sm text-muted-foreground">
                            {videoExportPhase || tt('common:preview.processing', 'Processing')}
                        </p>
                        <div className="grid grid-cols-10 gap-1.5">
                            {Array.from({ length: 30 }).map((_, idx) => {
                                const threshold = Math.round(((idx + 1) / 30) * 100)
                                const active = videoExportProgress >= threshold
                                return (
                                    <div
                                        key={`video-progress-square-${idx}`}
                                        className={cn(
                                            'h-3 rounded-sm transition-[width,background-color] duration-200',
                                            active ? 'bg-primary shadow-sm' : 'bg-muted'
                                        )}
                                    />
                                )
                            })}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{tt('common:preview.progress', 'Progress')}</span>
                            <span className="font-mono">{videoExportProgress}%</span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}




