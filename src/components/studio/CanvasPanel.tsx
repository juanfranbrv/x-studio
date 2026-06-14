'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import JSZip from 'jszip'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { TemplateSelectorModal, Template } from './TemplateSelectorModal'
import { ContextElement } from '@/app/image/page'
import { IconLayout, IconClose, IconImage, IconImageAdd, IconTextFont, IconLink, IconAtSign, IconMinus, IconPlus, IconSquareArrowDown, IconImageDownload, IconBug, IconSparkles, IconPaintbrush, IconZoomIn, IconZoomOut, IconMaximize, IconAiChat } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { DigitalStaticLoader } from './DigitalStaticLoader'
import { GeneratedCopyCard } from './GeneratedCopyCard'
import { useBrandKit } from '@/contexts/BrandKitContext'
import { useUI } from '@/contexts/UIContext'
import { generateSocialPost } from '@/app/actions/generate-social-post'
import { WireframeRenderer } from './previews/WireframeRenderer'
import { FloatingAssistance } from './creation-flow/FloatingAssistance'
import { ALL_IMAGE_LAYOUTS, GenerationState, TextAsset } from '@/lib/creation-flow-types'
import type { PreviewLayoutMode } from './previewLayoutMode'
import {
    CANVAS_FLOATING_TOOLBAR_CLASS,
    CANVAS_TOOL_BUTTON_CLASS,
    CANVAS_OVERLAY_BUTTON_CLASS,
    CANVAS_REMOVE_BUTTON_CLASS,
    CANVAS_TOOL_VALUE_CLASS,
    CANVAS_TOOL_ICON_CLASS,
} from './CanvasPanel.helpers'
import { renderLayoutIcon, StyleReferenceCorner } from './CanvasPanel.parts'

export interface Generation {
    id: string
    image_url: string
    created_at: string
}

import { GenerateButton } from './creation-flow/GenerateButton'
import { TextLayersEditor } from './TextLayersEditor'

export interface CanvasPanelProps {
    currentImage: string | null
    generations: Generation[]
    onSelectGeneration: (gen: Generation) => void
    selectedContext: ContextElement[]
    onRemoveContext: (id: string, type: 'style') => void
    onAddContext?: (element: ContextElement) => void
    draggedElement?: ContextElement | null
    isGenerating: boolean
    // Creation props
    creationState: GenerationState
    // Edit props
    editPrompt: string
    onEditPromptChange: (value: string) => void
    canGenerate: boolean
    onUnifiedAction: () => Promise<void>
    // New unified setters
    onCaptionChange?: (value: string) => void
    onHeadlineChange?: (value: string) => void
    onCtaChange?: (value: string) => void
    onCtaUrlChange?: (value: string) => void
    onCustomTextChange?: (id: string, value: string) => void
    // New handlers for text assets
    onAddTextAsset?: (asset: TextAsset) => void
    onRemoveTextAsset?: (id: string) => void
    onUpdateTextAsset?: (id: string, value: string) => void
    // Original props that were not removed but are still used

    aspectRatio?: string
    // Hide prompt area (when using external PromptCard)
    hidePromptArea?: boolean
    onSelectLogo?: (id: string | null) => void
    onClearUploadedImage?: () => void
    onRemoveReferenceImage?: (url: string) => void
    onDisableAiPromptReference?: () => void
    onOpenPromptDebug?: () => void
    showPromptDebugTrigger?: boolean
    layoutIconOverrides?: Record<string, string>
    isAdmin?: boolean
    sessionName?: string | null
    previewLayoutMode?: PreviewLayoutMode
}

export function CanvasPanel({
    currentImage,
    generations = [],
    onSelectGeneration,
    selectedContext = [],
    onRemoveContext,
    onAddContext,
    draggedElement,
    isGenerating,
    aspectRatio = "4:5",
    creationState,
    editPrompt,
    onEditPromptChange,
    canGenerate,
    onUnifiedAction,

    onCaptionChange,
    onHeadlineChange,
    onCtaChange,
    onCtaUrlChange,
    onCustomTextChange,
    onAddTextAsset,
    onRemoveTextAsset,
    onUpdateTextAsset,
    hidePromptArea = false,
    onSelectLogo,
    onClearUploadedImage,
    onRemoveReferenceImage,
    onDisableAiPromptReference,
    onOpenPromptDebug,
    showPromptDebugTrigger = false,
    layoutIconOverrides = {},
    isAdmin = false,
    sessionName = null,
    previewLayoutMode = 'default',
}: CanvasPanelProps) {
    const { t } = useTranslation()
    const tt = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
        t(key, { defaultValue, ...options })
    const { activeBrandKit } = useBrandKit()
    const { panelPosition, assistanceEnabled } = useUI()
    const [zoom, setZoom] = useState(100)
    const [hasManualZoom, setHasManualZoom] = useState(false)
    const lastViewportHeightRef = useRef<number | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [isDragActive, setIsDragActive] = useState(false)
    const [isDraggingOver, setIsDraggingOver] = useState(false)
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
    const [viewportHeight, setViewportHeight] = useState(800) // Default fallback
    const [viewportWidth, setViewportWidth] = useState(1200)
    const [isMobile, setIsMobile] = useState(false)
    const [currentImageNaturalSize, setCurrentImageNaturalSize] = useState<{ w: number; h: number } | null>(null)
    const selectedLogoUrl = useMemo(() => {
        if (!creationState.selectedLogoId || !activeBrandKit?.logos?.length) return null
        const found = activeBrandKit.logos.find((logo: any, idx: number) =>
            logo?._id === creationState.selectedLogoId || `logo-${idx}` === creationState.selectedLogoId
        )
        if (!found) return null
        return typeof found === 'string' ? found : found.url
    }, [activeBrandKit?.logos, creationState.selectedLogoId])

    const selectedLayoutIcon = useMemo(() => {
        const layoutId = creationState.selectedLayout
        if (!layoutId) return null
        const override = layoutIconOverrides[layoutId]
        if (override && override !== 'Layout') return override
        const layout = ALL_IMAGE_LAYOUTS.find((item) => item.id === layoutId)
        const icon = layout?.svgIcon || null
        if (!icon || icon === 'Layout') return null
        return icon
    }, [creationState.selectedLayout, layoutIconOverrides])

    const fallbackCanvasAspectRatio = useMemo(() => {
        const [w, h] = aspectRatio.split(':').map(Number)
        return w / h
    }, [aspectRatio])

    const canvasAspectRatio = useMemo(() => {
        if (currentImage && currentImageNaturalSize?.w && currentImageNaturalSize?.h) {
            return currentImageNaturalSize.w / currentImageNaturalSize.h
        }
        return fallbackCanvasAspectRatio
    }, [currentImage, currentImageNaturalSize, fallbackCanvasAspectRatio])

    const getCanvasFitMetrics = () => {
        const ratio = canvasAspectRatio
        const footerOffset = getFooterOffset()
        const availableHeight = Math.max(200, viewportHeight - footerOffset)
        const padding = isMobile ? 0 : 48
        const availableWidth = (
            containerRef.current?.parentElement?.clientWidth
                ? containerRef.current.parentElement.clientWidth - padding
                : (isMobile ? window.innerWidth : 1000)
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

    // Track viewport height for responsive canvas
    useEffect(() => {
        const updateHeight = () => {
            setViewportHeight(window.innerHeight)
            setIsMobile(window.innerWidth < 768)
            setViewportWidth(window.innerWidth)
        }
        updateHeight()
        window.addEventListener('resize', updateHeight)
        return () => window.removeEventListener('resize', updateHeight)
    }, [])

    useEffect(() => {
        setCurrentImageNaturalSize(null)
    }, [currentImage])

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


    const getFooterOffset = () => {
        if (isMobile) return currentImage ? 180 : 120
        if (previewLayoutMode === 'compact-scroll') {
            return currentImage ? 240 : 180
        }
        const base = currentImage ? 700 : 400
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

    // Calculate effective zoom (base scale * manual zoom)
    const effectiveZoom = useMemo(() => {
        const baseHeight = 600;
        const { canvasHeight } = getCanvasFitMetrics()

        const baseScale = (canvasHeight / baseHeight) * 100;
        return Math.round(baseScale * (zoom / 100));
    }, [canvasAspectRatio, viewportHeight, zoom, currentImage, isMobile])

    // Animation & Reveal States
    const [isRevealing, setIsRevealing] = useState(false)
    const [wasJustGenerated, setWasJustGenerated] = useState(false)
    const [prevImage, setPrevImage] = useState<string | null>(null)

    // Track last used prompt for regeneration
    const [lastUsedPrompt, setLastUsedPrompt] = useState('')

    // Copy Generation State
    const [generatedCopy, setGeneratedCopy] = useState<string | null>(null)
    const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([])
    const [previousCopyVersion, setPreviousCopyVersion] = useState<{ copy: string; hashtags: string[] } | null>(null)
    const [isGeneratingCopy, setIsGeneratingCopy] = useState(false)
    const [isCancelingCopy, setIsCancelingCopy] = useState(false)
    const [isCopyLocked, setIsCopyLocked] = useState(false) // New state for locking copy
    const cancelCopyGenerationRef = useRef(false)

    // Build brand kit text options for the dropdown
    const brandKitTexts = useMemo(() => {
        if (!activeBrandKit) return []
        const options: { id: string; label: string; value: string; type: 'url' | 'tagline' | 'cta' | 'hook' | 'custom' }[] = []

        // Tagline
        if (activeBrandKit.tagline) {
            options.push({
                id: 'bk-tagline',
                label: tt('common:brandDnaPanel.tagline', 'Tagline'),
                value: activeBrandKit.tagline,
                type: 'tagline'
            })
        }
        // Marketing Hooks
        if (activeBrandKit.text_assets?.marketing_hooks) {
            activeBrandKit.text_assets.marketing_hooks.forEach((hook, idx) => {
                options.push({
                    id: `bk-hook-${idx}`,
                    label: tt('common:textAssets.hookLabel', 'Hook {{index}}', { index: idx + 1 }),
                    value: hook,
                    type: 'hook'
                })
            })
        }
        return options
    }, [activeBrandKit])

    const handleZoomIn = () => {
        setHasManualZoom(true)
        setZoom((z) => Math.min(z + 25, 300))
    }
    const handleZoomOut = () => {
        setHasManualZoom(true)
        setZoom((z) => Math.max(z - 25, 25))
    }
    const handleResetZoom = () => {
        setHasManualZoom(true)
        setZoom(100)
    }

    const handleMaximizeZoom = () => {
        setHasManualZoom(true)
        const newZoom = calcMaxZoom();
        setZoom(newZoom);
    }

    const calcMaxZoom = () => {
        if (isMobile) return 100
        const { canvasHeight: baseHeight, availableHeight } = getCanvasFitMetrics()

        const fitScale = availableHeight / baseHeight;
        const boost = getAutoZoomBoost(viewportHeight);
        return Math.min(Math.round(fitScale * 100 * boost), 300);
    }

    // Auto-boost zoom on smaller screens unless user already adjusted it.
    useEffect(() => {
        const last = lastViewportHeightRef.current
        lastViewportHeightRef.current = viewportHeight
        if (last !== null && Math.abs(last - viewportHeight) > 40) {
            setHasManualZoom(false)
        }
    }, [viewportHeight])

    useEffect(() => {
        if (hasManualZoom) return
        const autoZoom = calcMaxZoom();
        if (zoom !== autoZoom) setZoom(autoZoom)
    }, [hasManualZoom, isMobile, viewportHeight, zoom])

    useEffect(() => {
        if (!isMobile) return
        setHasManualZoom(false)
        if (zoom !== 100) {
            setZoom(100)
        }
    }, [isMobile, currentImage, canvasAspectRatio])

    // Handle Generation Reveal Effect - simplified, no longer wraps generation

    // Handle Generation Reveal Effect
    useEffect(() => {
        if (isGenerating) {
            setWasJustGenerated(true)
            setIsRevealing(true)
        } else if (currentImage && currentImage !== prevImage) {
            setPrevImage(currentImage)
            setIsRevealing(false)

            if (wasJustGenerated) {
                const timer = setTimeout(() => {
                    setWasJustGenerated(false)
                }, 500)
                return () => clearTimeout(timer)
            }
        } else if (!currentImage) {
            setIsRevealing(false)
            setWasJustGenerated(false)
        }
    }, [isGenerating, currentImage, prevImage, wasJustGenerated])

    const handleGenerateCopy = async () => {
        if (!activeBrandKit || !currentImage) return

        // Respect Lock
        if (isCopyLocked) return

        const currentCopy = (creationState.caption || generatedCopy || '').trim()
        const currentHashtags = [...generatedHashtags]

        cancelCopyGenerationRef.current = false
        setIsCancelingCopy(false)
        setIsGeneratingCopy(true)
        try {
            const result = await generateSocialPost({
                brand: activeBrandKit,
                imageBase64: currentImage,
                topic: creationState.rawMessage || undefined,
                userPrompt: creationState.rawMessage || undefined,
                model: creationState.selectedIntelligenceModel,
                previousCopy: currentCopy || undefined,
                variationKey: Date.now().toString(36)
            })

            if (cancelCopyGenerationRef.current) {
                return
            }

            if (result.success && 'data' in result) {
                if (currentCopy || currentHashtags.length > 0) {
                    setPreviousCopyVersion({
                        copy: currentCopy,
                        hashtags: currentHashtags
                    })
                }
                setGeneratedCopy(result.data.copy)
                setGeneratedHashtags(result.data.hashtags)
                // Also update global state to ensure UI updates if creationState.caption is being used
                onCaptionChange?.(result.data.copy)
            }
        } catch (error) {
            if (cancelCopyGenerationRef.current) {
                return
            }
            console.error('Failed to generate copy:', error)
        } finally {
            setIsGeneratingCopy(false)
            if (cancelCopyGenerationRef.current) {
                window.setTimeout(() => setIsCancelingCopy(false), 900)
            }
        }
    }

    const handleCancelGenerateCopy = () => {
        cancelCopyGenerationRef.current = true
        setIsCancelingCopy(true)
        setIsGeneratingCopy(false)
    }

    const handleRestorePreviousCopy = () => {
        if (!previousCopyVersion) return

        const currentCopy = (creationState.caption || generatedCopy || '').trim()
        const currentHashtags = [...generatedHashtags]

        setGeneratedCopy(previousCopyVersion.copy)
        setGeneratedHashtags(previousCopyVersion.hashtags)
        onCaptionChange?.(previousCopyVersion.copy)
        setPreviousCopyVersion(
            currentCopy || currentHashtags.length > 0
                ? { copy: currentCopy, hashtags: currentHashtags }
                : null
        )
    }

    const sanitizeDownloadSegment = (value: string, fallback: string) => {
        const normalized = value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')

        return normalized || fallback
    }

    const createUniqueDownloadId = () => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID().split('-')[0]
        }

        return Date.now().toString(36)
    }

    const buildDownloadBaseName = () => {
        const safeBrandName = sanitizeDownloadSegment(activeBrandKit?.brand_name || '', 'x-image-generation')
        const safeSessionName = sanitizeDownloadSegment(sessionName || '', 'sesion')
        const uniqueId = createUniqueDownloadId()

        return `${safeBrandName}-${safeSessionName}-${uniqueId}`
    }

    // Trigger Copy Generation when image changes
    useEffect(() => {
        // Only auto-generate copy if we don't have one from the unified flow
        if (currentImage && activeBrandKit && !creationState.caption) {
            handleGenerateCopy()
        } else if (!currentImage) {
            // Clear copy when image is removed (e.g. on reset)
            setGeneratedCopy(null)
            setGeneratedHashtags([])
            setPreviousCopyVersion(null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentImage])

    const handleDownload = async () => {
        if (!currentImage) return

        try {
            let imageResponse = await fetch(currentImage)

            if (!imageResponse.ok) {
                const proxyResponse = await fetch('/api/download-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: currentImage }),
                })
                if (!proxyResponse.ok) {
                    throw new Error(`Proxy download failed: ${proxyResponse.status}`)
                }
                imageResponse = proxyResponse
            }

            const imageBlob = await imageResponse.blob()
            const imageUrl = URL.createObjectURL(imageBlob)
            const mime = (imageBlob.type || 'image/png').toLowerCase()
            const extension = mime.includes('jpeg') || mime.includes('jpg')
                ? 'jpg'
                : mime.includes('webp')
                    ? 'webp'
                    : mime.includes('png')
                        ? 'png'
                        : 'png'
            const link = document.createElement('a')
            link.href = imageUrl
            link.download = `${buildDownloadBaseName()}.${extension}`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(imageUrl)
        } catch (error) {
            console.error('Image download failed:', error)
        }
    }

    const handleDownloadBundle = async () => {
        if (!currentImage) return
        const timestamp = Date.now()

        const caption = (creationState.caption || generatedCopy || '').trim()
        const hashtags = generatedHashtags.length > 0 ? generatedHashtags.join(' ') : ''
        const urlText = creationState.ctaUrlEnabled ? (creationState.ctaUrl || '') : ''
        const textContent = [
            `COPY:\n${caption}`,
            `HASHTAGS:\n${hashtags}`,
            `HEADLINE:\n${creationState.headline || ''}`,
            `CTA:\n${creationState.cta || ''}`,
            `URL:\n${urlText}`,
        ].join('\n\n').trimEnd()

        const imageResponse = await fetch(currentImage)
        const imageBlob = await imageResponse.blob()

        const zip = new JSZip()
        zip.file(`image-${timestamp}.png`, imageBlob)
        zip.file(`copy-${timestamp}.txt`, textContent || '')

        const zipBlob = await zip.generateAsync({ type: 'blob' })
        const zipUrl = URL.createObjectURL(zipBlob)
        const zipLink = document.createElement('a')
        zipLink.href = zipUrl
        zipLink.download = `${buildDownloadBaseName()}.zip`
        document.body.appendChild(zipLink)
        zipLink.click()
        document.body.removeChild(zipLink)
        URL.revokeObjectURL(zipUrl)
    }



    const handleSelectTemplate = (template: Template) => {
        // Assuming 'template' is a valid type for ContextElement
        // The original onAddContext was not typed for 'template' specifically,
        // but the instruction implies it should be handled.
        // For now, mapping it to 'image' type as per existing ContextElement structure.
        // If 'template' is a new type, ContextElement interface needs update.
        // For this change, I'll assume it's added as a generic 'template' type.
        // The original ContextElement type was:
        // type ContextElement = { id: string; type: 'image' | 'logo' | 'color' | 'font' | 'text' | 'link' | 'contact'; value: string; label?: string; };
        // Adding 'template' to this type would be necessary for full type safety.
        // For now, I'll use 'template' as the type and assume ContextElement can handle it.
        // The instruction did not provide an update to ContextElement, so I'll proceed with this assumption.
        // If onAddContext is not provided, this will do nothing.
        // The original onAddContext was not part of the new CanvasPanelProps, but it's used here.
        // I'll assume it's still available or needs to be added to the new props.
        // For now, I'll keep the original onAddContext call.
        // The instruction removed onAddContext from CanvasPanelProps, so I'm commenting it out.
        // onAddContext?.({
        //     id: template.id,
        //     type: 'template', // Assuming 'template' is a valid type
        //     value: template.thumbnail,
        //     label: template.name
        // });
    }

    const handleDragOver = (e: React.DragEvent) => {
        if (e.dataTransfer.types.includes('application/x-image-context')) {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'copy'
            setIsDraggingOver(true)
        }
    }

    const handleDragLeave = () => {
        setIsDraggingOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDraggingOver(false)

        try {
            const data = e.dataTransfer.getData('application/x-image-context')
            if (data) {
                const element = JSON.parse(data) as ContextElement
                // The onAddContext prop was removed from the new CanvasPanelProps.
                // If it's still needed, it should be re-added to the interface.
                // For now, I'm commenting out the call to onAddContext.
                // if (!selectedContext.some(c => c.id === element.id)) {
                //     onAddContext?.(element)
                // }
            }
        } catch (err) {
            console.error('Failed to parse dropped context', err)
        }
    }

    return (
        <div className="relative isolate flex h-full flex-1 flex-col overflow-x-hidden">
            {/* Header Overlay */}
            <div className="absolute left-3 right-3 top-3 z-40 flex h-16 items-start justify-between px-3 pt-1 pointer-events-none md:left-4 md:right-4">

                {/* Left: Canvas info */}
                {false ? (
                    <div />
                ) : (
                    <div />
                )}

                {/* Right: Actions - Hidden on mobile (actions now with RESULTADO section) */}
                {/* Zoom Controls & Actions */}
                <div className={CANVAS_FLOATING_TOOLBAR_CLASS}>
                    <Button variant="ghost" size="icon" className={CANVAS_TOOL_BUTTON_CLASS} onClick={handleZoomOut} title={tt('common:preview.zoomOut', 'Zoom out')}>
                        <IconZoomOut className={CANVAS_TOOL_ICON_CLASS} />
                    </Button>
                    <button
                        type="button"
                        className={CANVAS_TOOL_VALUE_CLASS}
                        onClick={handleResetZoom}
                        title={tt('common:preview.resetZoom', 'Reset zoom')}
                        aria-label={tt('common:preview.resetZoomAria', 'Reset zoom')}
                    >
                        {effectiveZoom}%
                    </button>
                    <Button variant="ghost" size="icon" className={CANVAS_TOOL_BUTTON_CLASS} onClick={handleZoomIn} title={tt('common:preview.zoomIn', 'Zoom in')}>
                        <IconZoomIn className={CANVAS_TOOL_ICON_CLASS} />
                    </Button>
                    <Button variant="ghost" size="icon" className={CANVAS_TOOL_BUTTON_CLASS} onClick={handleMaximizeZoom} title={tt('common:preview.fitHeight', 'Fit to height')}>
                        <IconMaximize className={CANVAS_TOOL_ICON_CLASS} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleDownload} className={CANVAS_TOOL_BUTTON_CLASS} title={tt('common:preview.downloadImage', 'Download image')}>
                        <IconImageDownload className={CANVAS_TOOL_ICON_CLASS} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleDownloadBundle} className={CANVAS_TOOL_BUTTON_CLASS} title={tt('common:preview.downloadBundle', 'Download ZIP')}>
                        <IconSquareArrowDown className={CANVAS_TOOL_ICON_CLASS} />
                    </Button>
                </div>
            </div>

            <div className={cn(
                "canvas-scroll-region",
                "flex-1 relative flex flex-col items-center justify-start overflow-y-auto overflow-x-hidden no-scrollbar pr-0 -mr-[2px]",
                isMobile ? "pl-3 pb-4 pt-16" : "pl-4 pb-5 pt-[1.1rem]"
            )}>
                {/* Canvas Wrapper - reserves correct space and prevents overflow */}
                <div
                    className="shrink-0 flex w-full items-start justify-center px-2 py-3 md:px-3 md:py-4"
                    style={(() => {
                        const { canvasHeight } = getCanvasFitMetrics()
                        // Strictly follow scaled height to maintain fixed gap below
                        const scaledHeight = canvasHeight * (zoom / 100);
                        return {
                            height: `${scaledHeight}px`
                        };
                    })()}
                >
                    {/* Canvas Container */}
                    <div
                        ref={containerRef}
                        className={cn(
                            "canvas-panel relative flex shrink-0 items-center justify-center overflow-visible rounded-[1.65rem] border border-border/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] bg-dot shadow-[0_28px_64px_-42px_rgba(15,23,42,0.26)] transition-transform duration-300 ease-out",
                            "overflow-visible",
                            wasJustGenerated && "canvas-success-flash"
                        )}
                        style={(() => {
                            const { canvasWidth, canvasHeight } = getCanvasFitMetrics()

                            return {
                                width: `${canvasWidth}px`,
                                height: `${canvasHeight}px`,
                                transform: `scale(${zoom / 100})`,
                                transformOrigin: 'top center',
                                containerType: 'inline-size',
                                containerName: 'canvas',
                            };

                        })()}
                    >
                        <FloatingAssistance
                            isVisible={
                                assistanceEnabled &&
                                !isMobile &&
                                !isGenerating &&
                                !currentImage &&
                                creationState.currentStep >= 2 &&
                                !!creationState.selectedIntent
                            }
                            title={tt('common:preview.title', 'Preview')}
                            description={tt('common:preview.description', 'You can add, edit, or remove text. Click each layer to adjust it.')}
                            side={panelPosition === 'right' ? 'left' : 'right'}
                            anchorRef={containerRef}
                            className="w-[240px] opacity-95"
                        />
                        <AnimatePresence mode="wait">
                            {(isGenerating || isRevealing) && (
                                <motion.div
                                    key="loader"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.8 }}
                                    className="absolute inset-0 z-50 overflow-hidden rounded-[1.35rem] shadow-lg ring-1 ring-white/10"
                                >
                                    <DigitalStaticLoader />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Composition Icon Overlay - subtle ghosted backdrop */}
                        {selectedLayoutIcon && !isGenerating && !currentImage && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none opacity-50">
                                {renderLayoutIcon(selectedLayoutIcon)}
                            </div>
                        )}

                        {/* Main Content Area */}
                        {currentImage ? (
                            <div className="relative z-20 h-full w-full overflow-hidden rounded-[1.45rem] bg-background/72">
                                {showPromptDebugTrigger && onOpenPromptDebug && (
                                    <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={onOpenPromptDebug}
                                            className={CANVAS_OVERLAY_BUTTON_CLASS}
                                            title={tt('common:preview.viewPrompt', 'View prompt')}
                                        >
                                            <IconBug className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                                {isMobile && (
                                    <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleDownload}
                                            className={CANVAS_OVERLAY_BUTTON_CLASS}
                                            title={tt('common:preview.downloadImage', 'Download image')}
                                        >
                                            <IconImageDownload className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleDownloadBundle}
                                            className={CANVAS_OVERLAY_BUTTON_CLASS}
                                            title={tt('common:preview.downloadBundle', 'Download ZIP')}
                                        >
                                            <IconSquareArrowDown className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                                <div className="w-full h-full flex items-center justify-center text-center">
                                    <motion.div
                                        key={currentImage}
                                        initial={wasJustGenerated ? { opacity: 0, scale: 1.02 } : { opacity: 1, scale: 1 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={wasJustGenerated ? {
                                            duration: 0.24,
                                            ease: "easeOut",
                                        } : {
                                            duration: 0.12
                                        }}
                                        className="w-full h-full flex items-center justify-center"
                                    >
                                        <img
                                            src={currentImage}
                                            alt={tt('common:preview.currentImage', 'Current image')}
                                            className="w-full h-full object-contain"
                                            onLoad={(e) => {
                                                const target = e.currentTarget
                                                if (target.naturalWidth && target.naturalHeight) {
                                                    setCurrentImageNaturalSize({
                                                        w: target.naturalWidth,
                                                        h: target.naturalHeight,
                                                    })
                                                }
                                            }}
                                        />
                                    </motion.div>
                                </div>
                            </div>
                        ) : creationState ? (
                            <div className="relative w-full h-full z-10">
                                <WireframeRenderer
                                    state={creationState}
                                    aspectRatio={fallbackCanvasAspectRatio}
                                />
                            </div>
                        ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center rounded-[1.45rem] border border-dashed border-border/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] px-6 text-center text-muted-foreground transition-colors">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-border/50 bg-background/92 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.42)]">
                                    <IconImageAdd className="h-7 w-7 text-primary/80" />
                                </div>
                                <p className="text-sm font-medium text-foreground/80">
                                    {tt('common:preview.generateFirstToEdit', 'Generate an image first to edit it...')}
                                </p>
                                <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
                                    {tt('common:preview.generateFirstHint', 'When the first result appears, this canvas becomes your editing workspace with downloads, prompt debug and quick corrections.')}
                                </p>
                                <div className="mt-4 rounded-full border border-border/30 bg-background/80 px-3 py-1 text-xs font-mono uppercase tracking-wide text-muted-foreground/80">
                                    {aspectRatio}
                                </div>
                            </div>
                        )}

                        {/* PREVIEW OVERLAYS (Reference Image & Logo) */}
                        {!currentImage && !isGenerating && creationState && (
                            <>
                                {/* Reference Images by role */}
                                {(() => {
                                    // Combine uploaded images and brand kit selections
                                    const uploadedImgs = creationState.uploadedImages.map((url, i) => ({ url, source: 'upload' as const, key: `u-${i}` }))
                                    // Since selectedBrandKitImageIds now stores URLs directly, use them as-is
                                    const brandKitImgs = creationState.selectedBrandKitImageIds.map((url, i) => ({
                                        url,
                                        source: 'brandkit' as const,
                                        key: `bk-${i}`
                                    }))
                                    const allImages = [...uploadedImgs, ...brandKitImgs].map((item) => ({
                                        ...item,
                                        role: creationState.referenceImageRoles?.[item.url] || 'content'
                                    }))

                                    const contentImages = allImages.filter((item) => item.role === 'content' || item.role === 'style_content')
                                    const styleImages = allImages.filter((item) => item.role === 'style' || item.role === 'style_content')
                                    const auxLogos = allImages.filter((item) => item.role === 'logo')
                                    const hasAiPromptReference = creationState.imageSourceMode === 'generate' && (!isMobile || Boolean(currentImage))
                                    const contentPreviewImages = contentImages.slice(0, 6)

                                    const renderStrip = (
                                        images: Array<{ url: string; source: 'upload' | 'brandkit'; key: string }>,
                                        positionClass: string,
                                        badgeClass: string,
                                        variant: 'default' | 'style' = 'default'
                                    ) => {
                                        if (images.length === 0) return null
                                        return (
                                            <div className={cn("absolute z-20 flex gap-2 flex-wrap max-w-[220px]", positionClass)}>
                                                {images.slice(0, 6).map((item, idx) => (
                                                    <div
                                                        key={item.key}
                                                        className={cn(
                                                            "relative group",
                                                            variant === 'style' && "transition-transform duration-300 hover:-translate-y-0.5"
                                                        )}
                                                    >
                                        <img
                                            src={item.url}
                                            alt={`Ref ${idx + 1}`}
                                            loading="lazy"
                                            decoding="async"
                                            className={cn(
                                                "object-cover shadow-xl",
                                                                    variant === 'style'
                                                                        ? "rounded-2xl border-2 border-primary/30 ring-4 ring-primary/10 bg-background p-1 -rotate-6 group-hover:rotate-0 transition-transform duration-300"
                                                                        : "object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.28)]"
                                                                )}
                                                                style={variant === 'style'
                                                                    ? { width: 'var(--style-thumb-w)', height: 'var(--style-thumb-h)' }
                                                                    : { width: 'clamp(28px, 4.5cqw, 46px)', height: 'clamp(28px, 4.5cqw, 46px)' }
                                                                }
                                                            />
                                                        {variant === 'style' && (
                                                            <div className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow-md ring-2 ring-white/70">
                                                                <IconSparkles className="w-2.5 h-2.5" />
                                                            </div>
                                                        )}
                                                        {variant === 'style' && (
                                                            <div className={cn("absolute bottom-0 inset-x-0 text-[5px] text-white text-center py-0.5 backdrop-blur-sm rounded-b-lg", badgeClass)}>
                                                                {`ESTILO ${item.source === 'brandkit' ? 'BK' : idx + 1}`}
                                                            </div>
                                                        )}
                                                        {onRemoveReferenceImage && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => onRemoveReferenceImage(item.url)}
                                                                className={cn(
                                                                    CANVAS_REMOVE_BUTTON_CLASS,
                                                                    isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                                                )}
                                                                style={{ width: 'clamp(14px, 2.6cqw, 20px)', height: 'clamp(14px, 2.6cqw, 20px)' }}
                                                            >
                                                                <IconClose style={{ width: 'clamp(8px, 1.6cqw, 12px)', height: 'clamp(8px, 1.6cqw, 12px)' }} />
                                                            </Button>
                                                        )}
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

                                    const renderStyleCorner = (
                                        images: Array<{ url: string; source: 'upload' | 'brandkit'; key: string }>
                                    ) => {
                                        if (images.length === 0) return null
                                        const mainStyle = images[0]
                                        return (
                                            <StyleReferenceCorner
                                                url={mainStyle.url}
                                                onRemove={onRemoveReferenceImage ? () => onRemoveReferenceImage(mainStyle.url) : undefined}
                                                isMobile={isMobile}
                                            />
                                        )
                                    }

                                    return (
                                        <>
                                            {renderStyleCorner(styleImages)}
                                            {renderStrip(auxLogos, "bottom-6 right-4", "bg-amber-600/80")}
                                            {(hasAiPromptReference || contentPreviewImages.length > 0) && (
                                                <div className="absolute top-2 right-4 z-40 flex flex-col items-end gap-2">
                                                    {hasAiPromptReference && (
                                                        <div className="relative group">
                                                            <IconAiChat
                                                                className="text-primary drop-shadow-[0_10px_18px_rgba(0,0,0,0.26)]"
                                                                style={{ width: 'var(--canvas-ai-size)', height: 'var(--canvas-ai-size)' }}
                                                            />
                                                            {onDisableAiPromptReference && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={onDisableAiPromptReference}
                                                                    className={cn(
                                                                        CANVAS_REMOVE_BUTTON_CLASS,
                                                                        isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                                                    )}
                                                                    style={{ width: 'clamp(14px, 2.6cqw, 20px)', height: 'clamp(14px, 2.6cqw, 20px)' }}
                                                                >
                                                                    <IconClose style={{ width: 'clamp(8px, 1.6cqw, 12px)', height: 'clamp(8px, 1.6cqw, 12px)' }} />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}
                                                    {contentPreviewImages.map((item, idx) => (
                                                        <div key={item.key} className="relative group">
                                                            <img
                                                                src={item.url}
                                                                alt={`Contenido ${idx + 1}`}
                                                                loading="lazy"
                                                                decoding="async"
                                                                className="object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.28)]"
                                                                style={{ width: 'clamp(60px, 11cqw, 112px)', height: 'clamp(60px, 11cqw, 112px)' }}
                                                            />
                                                            {onRemoveReferenceImage && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => onRemoveReferenceImage(item.url)}
                                                                    className={cn(
                                                                        CANVAS_REMOVE_BUTTON_CLASS,
                                                                        isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                                                    )}
                                                                    style={{ width: 'clamp(14px, 2.6cqw, 20px)', height: 'clamp(14px, 2.6cqw, 20px)' }}
                                                                >
                                                                    <IconClose style={{ width: 'clamp(8px, 1.6cqw, 12px)', height: 'clamp(8px, 1.6cqw, 12px)' }} />
                                                                </Button>
                                                            )}
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

                                {/* Logo (Top Left) */}
                                {selectedLogoUrl && (
                                    <div className="absolute top-1 left-4 z-20 group">
                                        <img
                                            src={selectedLogoUrl}
                                            alt={tt('common:brandDnaPanel.logoAlt', 'Logo')}
                                            className="object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.26)]"
                                            style={{ width: 'var(--canvas-logo-size)', height: 'var(--canvas-logo-size)' }}
                                        />
                                        {onSelectLogo && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onSelectLogo(null)}
                                                className={cn(
                                                    CANVAS_REMOVE_BUTTON_CLASS.replace('z-40', 'z-30'),
                                                    isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                                )}
                                                style={{ width: 'clamp(16px, 2.8cqw, 22px)', height: 'clamp(16px, 2.8cqw, 22px)' }}
                                            >
                                                <IconClose style={{ width: 'clamp(9px, 1.8cqw, 13px)', height: 'clamp(9px, 1.8cqw, 13px)' }} />
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* TEXT LAYERS EDITOR - Overlay on Canvas (Only visible when no image is generated) */}
                        {!currentImage && (creationState.headline || creationState.cta || Object.keys(creationState.customTexts).length > 0 || creationState.selectedIntent) && (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none">
                                <div className="w-full h-full">
                                        <TextLayersEditor
                                            headline={creationState.headline}
                                            cta={creationState.cta}
                                            ctaUrl={creationState.ctaUrl}
                                            ctaUrlEnabled={creationState.ctaUrlEnabled}
                                            customTexts={creationState.customTexts}
                                            textAssets={creationState.selectedTextAssets}
                                            brandKitTexts={brandKitTexts}
                                        onHeadlineChange={(val) => onHeadlineChange?.(val)}
                                        onCtaChange={(val) => onCtaChange?.(val)}
                                        onCtaUrlChange={(val) => onCtaUrlChange?.(val)}
                                        onCustomTextChange={(id, val) => onCustomTextChange?.(id, val)}
                                        onAddTextAsset={onAddTextAsset}
                                        onUpdateTextAsset={onUpdateTextAsset}
                                        onDeleteLayer={(id, type) => {
                                            if (type === 'headline') onHeadlineChange?.('')
                                            if (type === 'cta') onCtaChange?.('')
                                            if (type === 'custom') onCustomTextChange?.(id, '')
                                            if (type === 'asset') onRemoveTextAsset?.(id)
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Close Canvas Wrapper */}
                </div>

                {/* CAPTION CARD - Shows below texts */}
                {(creationState.caption || isGeneratingCopy || creationState.selectedIntent) && (
                    <div className="mt-10 w-full max-w-[780px] shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 z-10 pb-16">
                        <GeneratedCopyCard
                            copy={creationState.caption || generatedCopy}
                            hashtags={generatedHashtags}
                            isLoading={isGeneratingCopy}
                            onRegenerate={handleGenerateCopy}
                            onRestorePrevious={handleRestorePreviousCopy}
                            hasPreviousVersion={Boolean(previousCopyVersion)}
                            onCancel={handleCancelGenerateCopy}
                            isCanceling={isCancelingCopy}
                            isLocked={isCopyLocked}
                            onToggleLock={() => setIsCopyLocked(!isCopyLocked)}
                            onCopyChange={(val) => onCaptionChange?.(val)}
                            className="rounded-[1.45rem] border-border/45 bg-background/72 shadow-[0_18px_36px_-32px_rgba(15,23,42,0.14)] backdrop-blur-0"
                        />
                    </div>
                )}
            </div>



            {/* Staging Area / Context Drawer */}
            {
                selectedContext.length > 0 && (
                    <div
                        className="px-4 py-2 bg-background"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="flex flex-wrap gap-2">
                            {selectedContext.map((item) => (
                                <div
                                    key={item.id}
                                    className={cn(
                                        "flex items-center gap-2 bg-background border border-border/50 rounded-lg shadow-sm group animate-in fade-in slide-in-from-bottom-1 transition-colors transition-shadow duration-200 overflow-hidden",
                                        (item.type === 'image' || item.type === 'logo') ? "p-0 pr-1.5" : "px-2 py-1"
                                    )}
                                >
                                    {item.type === 'color' && (
                                        <div className="w-4 h-4 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: item.value }} />
                                    )}
                                    {item.type === 'template' && (
                                        <IconLayout className="w-3.5 h-3.5 text-primary shrink-0" />
                                    )}
                                    {(item.type === 'logo' || item.type === 'image') && (
                                        <div className="w-10 h-10 flex-shrink-0 bg-muted/20 border-r border-border/30">
                                            <img
                                                src={item.value}
                                                loading="lazy"
                                                decoding="async"
                                                className={cn(
                                                    "w-full h-full",
                                                    item.type === 'logo' ? "object-contain p-1" : "object-cover"
                                                )}
                                                alt={item.label}
                                            />
                                        </div>
                                    )}

                                    {/* Font */}
                                    {item.type === 'font' && (
                                        <IconTextFont className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                    )}

                                    {/* Text assets */}
                                    {item.type === 'text' && (
                                        <IconTextFont className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                    )}

                                    {/* Links */}
                                    {item.type === 'link' && (
                                        <IconLink className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                    )}

                                    {/* Contact */}
                                    {item.type === 'contact' && (
                                        <IconAtSign className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                    )}

                                    {(item.type === 'color' || item.type === 'template' || item.type === 'font' || item.type === 'text' || item.type === 'link' || item.type === 'contact') && (
                                        <span className="text-[11px] font-medium max-w-[120px] truncate">
                                            {item.label || item.value}
                                        </span>
                                    )}

                                    <button
                                        onClick={() => onRemoveContext?.(item.id, 'style')}
                                        className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-destructive transition-colors ml-auto"
                                    >
                                        <IconClose className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))
                            }

                            {/* Preview Chip while dragging */}
                            {
                                isDraggingOver && draggedElement && !selectedContext.some(c => c.id === draggedElement.id) && (
                                    <div
                                        className={cn(
                                            "flex items-center gap-2 bg-primary/5 border border-primary/30 border-dashed rounded-lg shadow-sm animate-pulse overflow-hidden opacity-80",
                                            (draggedElement.type === 'image' || draggedElement.type === 'logo') ? "p-0 pr-1.5" : "px-2 py-1"
                                        )}
                                    >
                                        {draggedElement.type === 'color' && (
                                            <div className="w-4 h-4 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: draggedElement.value }} />
                                        )}
                                        {draggedElement.type === 'template' && (
                                            <IconLayout className="w-3.5 h-3.5 text-primary shrink-0" />
                                        )}
                                        {(draggedElement.type === 'logo' || draggedElement.type === 'image') && (
                                            <div className="w-10 h-10 flex-shrink-0 bg-muted/20 border-r border-border/30">
                                                <img
                                                    src={draggedElement.value}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className={cn(
                                                        "w-full h-full",
                                                        draggedElement.type === 'logo' ? "object-contain p-1" : "object-cover"
                                                    )}
                                                    alt={tt('common:preview.title', 'Preview')}
                                                />
                                            </div>
                                        )}

                                        {/* Font */}
                                        {draggedElement.type === 'font' && (
                                            <IconTextFont className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                        )}

                                        {/* Text assets */}
                                        {draggedElement.type === 'text' && (
                                            <IconTextFont className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                        )}

                                        {/* Links */}
                                        {draggedElement.type === 'link' && (
                                            <IconLink className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                        )}

                                        {/* Contact */}
                                        {draggedElement.type === 'contact' && (
                                            <IconAtSign className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                        )}

                                        {(draggedElement.type === 'color' || draggedElement.type === 'template' || draggedElement.type === 'font' || draggedElement.type === 'text' || draggedElement.type === 'link' || draggedElement.type === 'contact') && (
                                            <span className="text-[11px] font-medium opacity-50">
                                                {draggedElement.label}
                                            </span>
                                        )}
                                    </div>
                                )
                            }
                        </div >
                    </div >
                )
            }

            {/* Prompt Input Area - Hidden when using external PromptCard */}
            {
                !hidePromptArea && (
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={cn(
                            "transition-transform duration-300 relative mx-auto w-full max-w-[98%] mb-2 pointer-events-auto",
                            isDraggingOver ? "scale-[1.01]" : ""
                        )}
                    >
                        <div className={cn(
                            "flex items-center gap-2 rounded-full border border-border/60 bg-[linear-gradient(180deg,white,hsl(var(--surface-alt))/0.92)] p-2 pl-4 shadow-[0_22px_48px_-30px_rgba(15,23,42,0.42)] transition-colors transition-shadow duration-200",
                            isDraggingOver ? "bg-white ring-2 ring-primary ring-offset-2" : "hover:border-primary/20 hover:bg-white"
                        )}>
                            {/* Input */}
                            <Textarea
                                value={editPrompt}
                                onChange={(e) => onEditPromptChange?.(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        if (canGenerate || editPrompt.trim()) {
                                            onUnifiedAction()
                                        }
                                    }
                                }}
                                disabled={!currentImage}
                                placeholder={currentImage ? tt('image:ui.editPlaceholder', 'Describe the changes to edit the image...') : tt('common:preview.generateFirstToEdit', 'Generate an image first to edit it...')}
                                className="flex-1 min-h-[50px] max-h-[120px] py-3 bg-transparent border-0 focus-visible:ring-0 resize-none shadow-none text-base placeholder:text-muted-foreground/60 leading-relaxed scrollbar-hide disabled:opacity-50 disabled:cursor-not-allowed"
                            />



                            {/* Generate Button */}
                            <GenerateButton
                                onClick={onUnifiedAction}
                                isGenerating={isGenerating}

                                label={currentImage && editPrompt.trim() ? tt('common:actions.edit', 'Edit').toUpperCase() : tt('image:ui.generate', 'Generate')}
                                isDisabled={!canGenerate && !editPrompt.trim()}
                                className="h-14 px-8 rounded-xl font-bold shadow-lg hover:shadow-primary/25 bg-primary text-primary-foreground border-0 shrink-0 transition-transform transition-shadow duration-200 hover:scale-[1.02] active:scale-[0.98]"
                            />
                        </div>
                    </div>
                )
            }


            <TemplateSelectorModal
                isOpen={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                onSelect={handleSelectTemplate}
                selectedTemplateId={selectedContext.find(c => c.type === 'template')?.id}
            />
        </div >
    )
}
