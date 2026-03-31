'use client'

import { Loader2 } from '@/components/ui/spinner'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { IconCheck, IconImage, IconPalette, IconUpload, IconClose } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { ReferenceImageRole } from '@/lib/creation-flow-types'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

const STYLE_ACTION_BUTTON_CLASS = 'min-h-[42px] h-auto justify-center rounded-[1rem] px-4 py-2 text-center text-[clamp(0.93rem,0.89rem+0.12vw,1rem)] font-medium leading-tight whitespace-normal'
const STYLE_MODAL_CLASS = 'h-[min(88vh,860px)] w-[min(92vw,1120px)] !max-w-[min(92vw,1120px)] overflow-hidden rounded-[1.9rem] border border-border/70 bg-background/98 p-0 shadow-[0_38px_100px_-56px_rgba(15,23,42,0.42)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-[0.985] data-[state=closed]:zoom-out-[0.985] data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-2 duration-200 flex flex-col'

interface StyleImageCardProps {
    uploadedImages: string[]
    onUpload: (file: File, roleHint?: ReferenceImageRole) => void
    onRemoveUploadedImage?: (url: string) => void
    brandKitImages?: Array<{ id: string; url: string; name?: string }>
    selectedBrandKitImageIds?: string[]
    onToggleBrandKitImage?: (imageId: string) => void
    referenceImageRoles?: Record<string, ReferenceImageRole>
    onReferenceRoleChange?: (imageId: string, role: ReferenceImageRole) => void
    stylePresets?: Array<{
        _id: string
        name?: string
        image_url: string
    }>
    stylePresetsStatus?: 'LoadingFirstPage' | 'CanLoadMore' | 'LoadingMore' | 'Exhausted'
    onLoadMoreStylePresets?: () => void
    selectedStylePresetId?: string | null
    selectedStylePresetName?: string | null
    onSelectStylePreset?: (preset: { id: string; name?: string } | null) => void
    isAnalyzing?: boolean
    error?: string | null
}

const isStyleRole = (role?: ReferenceImageRole) => role === 'style' || role === 'style_content'
const hasRenderableImage = (url?: string) => typeof url === 'string' && url.trim().length > 0

export function StyleImageCard({
    uploadedImages = [],
    onUpload,
    onRemoveUploadedImage,
    brandKitImages = [],
    selectedBrandKitImageIds = [],
    onToggleBrandKitImage,
    referenceImageRoles = {},
    onReferenceRoleChange,
    stylePresets = [],
    stylePresetsStatus = 'Exhausted',
    onLoadMoreStylePresets,
    selectedStylePresetId = null,
    onSelectStylePreset,
    isAnalyzing = false,
    error = null,
}: StyleImageCardProps) {
    const { t } = useTranslation('common')
    const tt = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
        t(key, { defaultValue, ...options })
    const [isDragging, setIsDragging] = useState(false)
    const [isBrandKitModalOpen, setIsBrandKitModalOpen] = useState(false)
    const [isPresetModalOpen, setIsPresetModalOpen] = useState(false)
    const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(new Set())
    const inputRef = useRef<HTMLInputElement>(null)
    const previousUploadedRef = useRef<string[]>(uploadedImages)
    const waitingForUploadedStyleRef = useRef(false)

    const brandKitMap = useMemo(() => {
        const map = new Map<string, { id: string; url: string; name?: string }>()
        brandKitImages.forEach((image) => map.set(image.id, image))
        return map
    }, [brandKitImages])

    const styleIds = useMemo(
        () => [...uploadedImages, ...selectedBrandKitImageIds].filter((id) => isStyleRole(referenceImageRoles[id])),
        [uploadedImages, selectedBrandKitImageIds, referenceImageRoles]
    )

    const currentStyleId = styleIds.length > 0 ? styleIds[styleIds.length - 1] : null
    const currentStyleIsUpload = Boolean(currentStyleId && uploadedImages.includes(currentStyleId))
    const currentStyleImage = currentStyleId
        ? (currentStyleIsUpload
            ? { id: currentStyleId, url: currentStyleId, name: tt('styleImage.uploadedStyle', 'Uploaded style') }
            : brandKitMap.get(currentStyleId) || null)
        : null

    const selectedPreset = useMemo(
        () => (selectedStylePresetId ? stylePresets.find((preset) => preset._id === selectedStylePresetId) || null : null),
        [selectedStylePresetId, stylePresets]
    )
    const canRenderImageUrl = useCallback((url?: string) => {
        if (!hasRenderableImage(url)) return false
        return !failedImageUrls.has(String(url))
    }, [failedImageUrls])
    const markImageAsFailed = useCallback((url?: string) => {
        if (!url) return
        setFailedImageUrls((prev) => {
            if (prev.has(url)) return prev
            const next = new Set(prev)
            next.add(url)
            return next
        })
    }, [])

    const visualStylePreview = currentStyleImage
        ? {
            id: currentStyleImage.id,
            url: currentStyleImage.url,
            sourceLabel: currentStyleIsUpload ? tt('styleImage.uploadedBadge', 'Uploaded') : tt('styleImage.brandKitBadge', 'Brand Kit'),
            title: currentStyleImage.name || tt('styleImage.referenceTitle', 'Style reference'),
            removable: true,
        }
            : selectedPreset
            ? {
                id: selectedPreset._id,
                url: selectedPreset.image_url,
                sourceLabel: tt('styleImage.presetBadge', 'Preset'),
                title: selectedPreset.name || tt('styleImage.presetTitle', 'Predefined style'),
                removable: false,
            }
            : null

    const removeStyleId = useCallback((id: string) => {
        if (uploadedImages.includes(id)) {
            onRemoveUploadedImage?.(id)
            return
        }
        if (selectedBrandKitImageIds.includes(id)) {
            onToggleBrandKitImage?.(id)
        }
    }, [uploadedImages, selectedBrandKitImageIds, onRemoveUploadedImage, onToggleBrandKitImage])

    const clearCurrentStyle = useCallback(() => {
        if (currentStyleId) {
            removeStyleId(currentStyleId)
            return
        }
        if (selectedStylePresetId) {
            onSelectStylePreset?.(null)
        }
    }, [currentStyleId, onSelectStylePreset, removeStyleId, selectedStylePresetId])

    const applyAsSingleStyle = useCallback((id: string, source: 'upload' | 'brandkit') => {
        if (!onReferenceRoleChange) return
        onSelectStylePreset?.(null)

        styleIds
            .filter((existingId) => existingId !== id)
            .forEach((existingId) => removeStyleId(existingId))

        if (source === 'brandkit' && !selectedBrandKitImageIds.includes(id)) {
            onToggleBrandKitImage?.(id)
        }

        onReferenceRoleChange(id, 'style')
    }, [onReferenceRoleChange, onSelectStylePreset, onToggleBrandKitImage, removeStyleId, selectedBrandKitImageIds, styleIds])

    useEffect(() => {
        if (!waitingForUploadedStyleRef.current) {
            previousUploadedRef.current = uploadedImages
            return
        }

        const added = uploadedImages.filter((id) => !previousUploadedRef.current.includes(id))
        if (added.length === 0) return

        const latestId = added[added.length - 1]
        applyAsSingleStyle(latestId, 'upload')
        waitingForUploadedStyleRef.current = false
        previousUploadedRef.current = uploadedImages
    }, [uploadedImages, applyAsSingleStyle])

    const handleUploadFiles = useCallback((files: File[]) => {
        if (files.length === 0) return
        const file = files.find((item) => item.type.startsWith('image/'))
        if (!file) return
        waitingForUploadedStyleRef.current = true
        onUpload(file, 'style')
    }, [onUpload])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        handleUploadFiles(Array.from(e.dataTransfer.files))
    }, [handleUploadFiles])

    const handleSelectFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        handleUploadFiles(Array.from(e.target.files || []))
        if (inputRef.current) inputRef.current.value = ''
    }, [handleUploadFiles])

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <div className="w-full">
                    <div className="grid grid-cols-2 gap-2 min-w-0">
                        <Button
                            type="button"
                            variant="outline"
                            className={cn(STYLE_ACTION_BUTTON_CLASS, 'gap-2 min-w-0')}
                            onClick={() => inputRef.current?.click()}
                        >
                            <IconUpload className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{tt('styleImage.upload', 'Upload style')}</span>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className={cn(STYLE_ACTION_BUTTON_CLASS, 'gap-2 min-w-0')}
                            onClick={() => setIsBrandKitModalOpen(true)}
                        >
                            <IconPalette className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{tt('styleImage.fromBrandKit', 'From Brand Kit')}</span>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className={cn(STYLE_ACTION_BUTTON_CLASS, 'min-w-0')}
                            onClick={() => setIsPresetModalOpen(true)}
                        >
                            <span className="truncate">{tt('styleImage.presetButton', 'Predefined style')}</span>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className={cn(STYLE_ACTION_BUTTON_CLASS, 'min-w-0', !currentStyleId && !selectedStylePresetId && 'opacity-45')}
                            onClick={clearCurrentStyle}
                            disabled={!currentStyleId && !selectedStylePresetId}
                        >
                            <span className="truncate">{tt('styleImage.clear', 'Clear')}</span>
                        </Button>
                    </div>
                </div>
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleSelectFiles}
                className="hidden"
            />

            {visualStylePreview ? (
                <div className="relative rounded-xl border border-border/60 bg-background p-3 min-h-[120px] group">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg border border-border/70 shadow-sm bg-background p-1 shrink-0 w-[6.5rem]">
                            {canRenderImageUrl(visualStylePreview.url) ? (
                                <img
                                    src={visualStylePreview.url}
                                    alt={visualStylePreview.title || tt('styleImage.previewAlt', 'Style preview')}
                                    className="w-full aspect-[2/3] rounded-md object-cover"
                                    onError={() => markImageAsFailed(visualStylePreview.url)}
                                />
                            ) : (
                                <div className="w-full aspect-[2/3] rounded-md bg-muted/50 text-[11px] text-muted-foreground flex items-center justify-center">
                                    {tt('styleImage.noImage', 'No image')}
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                            <span className="inline-flex rounded-full px-2 py-1 text-[0.72rem] font-semibold bg-violet-500/10 text-violet-700 border border-violet-500/30">
                                {visualStylePreview.sourceLabel}
                            </span>
                            <p className="text-[0.84rem] text-muted-foreground leading-relaxed">
                                {tt('styleImage.activeHint', 'Active style reference for the next generation.')}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={clearCurrentStyle}
                        className={cn(
                            'absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-black/70',
                            !visualStylePreview.removable && !selectedStylePresetId && 'pointer-events-none'
                        )}
                        aria-label={tt('styleImage.removeAria', 'Remove style image')}
                    >
                        <IconClose className="h-3.5 w-3.5" />
                    </button>
                </div>
            ) : (
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className={cn(
                        'rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center p-4',
                        isDragging
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-background hover:border-primary/50 hover:bg-primary/5'
                    )}
                >
                    <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                        {isDragging ? <IconUpload className="w-4 h-4 text-primary" /> : <IconImage className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <p className="text-[0.88rem] font-medium">
                        {isDragging ? tt('styleImage.dropHere', 'Drop your style image') : tt('styleImage.dragOrClick', 'Drag one style image here or click')}
                    </p>
                    <p className="text-[0.8rem] text-muted-foreground">
                        {tt('styleImage.singleHint', 'Only one style image. If you choose another, it replaces the current one.')}
                    </p>
                </div>
            )}

            {isAnalyzing && (
                <div className="inline-flex items-center gap-1.5 text-[0.8rem] text-muted-foreground">
                    <Loader2 className="w-3 h-3 text-primary" />
                    {tt('styleImage.analyzing', 'Analyzing style...')}
                </div>
            )}
            {error && (
                <p className="text-[0.8rem] text-destructive">{error}</p>
            )}

            <Dialog open={isBrandKitModalOpen} onOpenChange={setIsBrandKitModalOpen}>
                <DialogContent className={STYLE_MODAL_CLASS}>
                    <motion.div
                        initial={{ opacity: 0, y: 18, scale: 0.972 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <DialogHeader className="px-7 pb-2 pt-7">
                            <DialogTitle className="text-[clamp(1.16rem,1.08rem+0.18vw,1.28rem)] font-semibold tracking-[-0.01em]">
                                {tt('styleImage.selectFromBrandKitTitle', 'Select style from Brand Kit')}
                            </DialogTitle>
                            <DialogDescription className="text-[1rem] leading-relaxed text-muted-foreground">
                                {tt('styleImage.selectFromBrandKitDescription', 'You can only choose one style image. If you select another one, it replaces the current one.')}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 min-h-0 overflow-y-auto px-7 py-6">
                            {brandKitImages.length > 0 ? (
                                <div className="grid content-start [grid-template-columns:repeat(auto-fill,minmax(120px,1fr))] gap-4 sm:[grid-template-columns:repeat(auto-fill,minmax(132px,1fr))]">
                                    {brandKitImages.map((image) => {
                                        const isSelected = currentStyleId === image.id
                                        return (
                                            <button
                                                key={image.id}
                                                type="button"
                                                onClick={() => {
                                                    applyAsSingleStyle(image.id, 'brandkit')
                                                    setIsBrandKitModalOpen(false)
                                                }}
                                                className={cn(
                                                    'relative w-full rounded-[1.15rem] overflow-hidden border aspect-square transition-all',
                                                    isSelected
                                                        ? 'border-primary/30 bg-primary/[0.07] shadow-[0_18px_38px_-28px_rgba(120,142,84,0.42)]'
                                                        : 'border-border/65 bg-background hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-30px_rgba(15,23,42,0.24)]'
                                                )}
                                            >
                                                <img src={image.url} alt={image.name || tt('styleImage.brandKitImageAlt', 'Brand Kit image')} className="w-full h-full object-cover" />
                                                {isSelected && (
                                                    <IconCheck className="absolute right-2.5 top-2.5 h-7 w-7 text-white drop-shadow-[0_3px_10px_rgba(15,23,42,0.55)]" />
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="mt-1 rounded-[1.15rem] border border-dashed border-border/70 bg-background/72 p-8 text-center text-[0.94rem] text-muted-foreground">
                                    {tt('styleImage.noBrandKitImages', 'This Brand Kit does not have any images yet.')}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end px-7 pb-6 pt-2">
                            <Button
                                type="button"
                                size="sm"
                                className={STYLE_ACTION_BUTTON_CLASS}
                                onClick={() => setIsBrandKitModalOpen(false)}
                            >
                                {tt('actions.continue', 'Continue')}
                            </Button>
                        </div>
                    </motion.div>
                </DialogContent>
            </Dialog>

            <Dialog open={isPresetModalOpen} onOpenChange={setIsPresetModalOpen}>
                <DialogContent className={STYLE_MODAL_CLASS}>
                    <motion.div
                        initial={{ opacity: 0, y: 18, scale: 0.972 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <DialogHeader className="px-7 pb-2 pt-7">
                            <DialogTitle className="text-[clamp(1.16rem,1.08rem+0.18vw,1.28rem)] font-semibold tracking-[-0.01em]">
                                {tt('styleImage.selectPresetTitle', 'Select preset style')}
                            </DialogTitle>
                            <DialogDescription className="text-[1rem] leading-relaxed text-muted-foreground">
                                {tt('styleImage.selectPresetDescription', 'This style uses a saved analysis and is injected directly into the prompt.')}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 min-h-0 overflow-y-auto px-7 py-6">
                            {stylePresets.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="text-[0.92rem] text-muted-foreground">
                                        {tt('styleImage.showingPresets', 'Showing {{count}} styles', { count: stylePresets.length })}
                                    </div>
                                    <div className="grid content-start [grid-template-columns:repeat(auto-fill,minmax(118px,1fr))] gap-4 sm:[grid-template-columns:repeat(auto-fill,minmax(132px,1fr))]">
                                        {stylePresets.map((preset) => {
                                            const isSelected = selectedStylePresetId === preset._id
                                            return (
                                                <button
                                                    key={preset._id}
                                                    type="button"
                                                    onClick={() => {
                                                        onSelectStylePreset?.({
                                                            id: preset._id,
                                                            name: preset.name,
                                                        })
                                                        setIsPresetModalOpen(false)
                                                    }}
                                                    className={cn(
                                                        'relative w-full rounded-[1.15rem] overflow-hidden border transition-all text-left group',
                                                        isSelected
                                                            ? 'border-primary/30 bg-primary/[0.07] shadow-[0_18px_38px_-28px_rgba(120,142,84,0.42)]'
                                                            : 'border-border/65 bg-background hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-30px_rgba(15,23,42,0.24)]'
                                                    )}
                                                >
                                                    <div className="aspect-[2/3]">
                                                        {canRenderImageUrl(preset.image_url) ? (
                                                            <img
                                                                src={preset.image_url}
                                                                alt={preset.name || tt('styleImage.presetTitle', 'Predefined style')}
                                                                className="w-full h-full object-cover"
                                                                onError={() => markImageAsFailed(preset.image_url)}
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center bg-muted/50 text-[0.84rem] font-medium text-muted-foreground">
                                                                {tt('styleImage.noImage', 'No image')}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {isSelected && (
                                                        <IconCheck className="absolute right-2.5 top-2.5 h-7 w-7 text-white drop-shadow-[0_3px_10px_rgba(15,23,42,0.55)]" />
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    {stylePresetsStatus !== 'Exhausted' ? (
                                        <div className="flex justify-center">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className={STYLE_ACTION_BUTTON_CLASS}
                                                onClick={onLoadMoreStylePresets}
                                                disabled={stylePresetsStatus === 'LoadingFirstPage' || stylePresetsStatus === 'LoadingMore'}
                                            >
                                                {stylePresetsStatus === 'LoadingFirstPage' || stylePresetsStatus === 'LoadingMore'
                                                    ? <Loader2 className="w-4 h-4 mr-2" />
                                                    : null}
                                                {tt('styleImage.loadMore', 'Load more styles')}
                                            </Button>
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="mt-1 rounded-[1.15rem] border border-dashed border-border/70 bg-background/72 p-8 text-center text-[0.94rem] text-muted-foreground">
                                    {tt('styleImage.noActivePresets', 'There are no active preset styles.')}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end px-7 pb-6 pt-2">
                            <Button type="button" size="sm" className={STYLE_ACTION_BUTTON_CLASS} onClick={() => setIsPresetModalOpen(false)}>
                                {tt('actions.continue', 'Continue')}
                            </Button>
                        </div>
                    </motion.div>
                </DialogContent>
            </Dialog>
        </div>
    )
}


