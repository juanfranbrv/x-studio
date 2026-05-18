'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { IconCheck, IconCheckCircle, IconImage, IconPalette, IconSparkles, IconUpload, IconClose } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { ReferenceImageRole, VisionAnalysis } from '@/lib/creation-flow-types'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

type ImageSourceMode = 'upload' | 'brandkit' | 'generate'

const MAX_CONTENT_IMAGES = 8
const CONTENT_ACTION_BUTTON_CLASS = 'min-h-[42px] h-auto justify-center rounded-[1rem] px-4 py-2 text-center text-[clamp(0.93rem,0.89rem+0.12vw,1rem)] font-medium leading-tight whitespace-normal'
const CONTENT_MODAL_CLASS = 'h-[min(88vh,860px)] w-[min(92vw,1120px)] !max-w-[min(92vw,1120px)] overflow-hidden rounded-[1.9rem] border border-border/70 bg-background/98 p-0 shadow-[0_38px_100px_-56px_rgba(15,23,42,0.42)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-[0.985] data-[state=closed]:zoom-out-[0.985] data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-2 duration-200 flex flex-col'
const CONTENT_REMOVE_BUTTON_CLASS = 'absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-black/70'

interface ContentImageCardProps {
    mode?: ImageSourceMode
    onModeChange?: (mode: ImageSourceMode) => void
    uploadedImages: string[]
    onUpload: (file: File, roleHint?: ReferenceImageRole) => void
    onRemoveUploadedImage?: (url: string) => void
    onClearUploadedImages?: () => void
    brandKitImages?: Array<{ id: string; url: string; name?: string }>
    selectedBrandKitImageIds?: string[]
    onToggleBrandKitImage?: (imageId: string) => void
    onClearBrandKitImages?: () => void
    referenceImageRoles?: Record<string, ReferenceImageRole>
    onReferenceRoleChange?: (imageId: string, role: ReferenceImageRole) => void
    aiImageDescription?: string
    onAiDescriptionChange?: (description: string) => void
    suggestedImagePrompts?: string[]
    isAnalyzing?: boolean
    error?: string | null
    visionAnalysis?: VisionAnalysis | null
}

export function ContentImageCard({
    mode = 'upload',
    onModeChange,
    uploadedImages = [],
    onUpload,
    onRemoveUploadedImage,
    onClearUploadedImages,
    brandKitImages = [],
    selectedBrandKitImageIds = [],
    onToggleBrandKitImage,
    onClearBrandKitImages,
    referenceImageRoles = {},
    onReferenceRoleChange,
    aiImageDescription = '',
    onAiDescriptionChange,
    suggestedImagePrompts = [],
    error = null,
}: ContentImageCardProps) {
    const { t } = useTranslation('common')
    const tt = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
        t(key, { defaultValue, ...options })
    const [isDragging, setIsDragging] = useState(false)
    const [isBrandKitModalOpen, setIsBrandKitModalOpen] = useState(false)
    const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(0)
    const [editedSuggestionDescriptions, setEditedSuggestionDescriptions] = useState<Record<number, string>>({})
    const inputRef = useRef<HTMLInputElement>(null)

    const isAiContentMode = mode === 'generate'
    const isContentRole = useCallback((id: string) => {
        const role = referenceImageRoles[id]
        if (!role) return true
        return role === 'content' || role === 'style_content'
    }, [referenceImageRoles])

    const contentUploadedImages = useMemo(
        () => uploadedImages.filter((id) => isContentRole(id)),
        [uploadedImages, isContentRole]
    )
    const contentBrandKitImageIds = useMemo(
        () => selectedBrandKitImageIds.filter((id) => isContentRole(id)),
        [selectedBrandKitImageIds, isContentRole]
    )

    const totalManualSelected = contentUploadedImages.length + contentBrandKitImageIds.length
    const canAddMoreManual = totalManualSelected < MAX_CONTENT_IMAGES
    const hasSuggestions = suggestedImagePrompts.length > 0
    const safeSuggestionIndex = hasSuggestions ? Math.min(activeSuggestionIdx, suggestedImagePrompts.length - 1) : 0

    const getSuggestionText = useCallback((index: number) => {
        const original = suggestedImagePrompts[index] || ''
        const edited = editedSuggestionDescriptions[index]
        return typeof edited === 'string' ? edited : original
    }, [editedSuggestionDescriptions, suggestedImagePrompts])


    const selectedBrandKitMap = useMemo(() => {
        const map = new Map<string, { id: string; url: string; name?: string }>()
        for (const image of brandKitImages) {
            map.set(image.id, image)
        }
        return map
    }, [brandKitImages])

    const setMode = useCallback((nextMode: ImageSourceMode) => {
        onModeChange?.(nextMode)
    }, [onModeChange])

    const applySuggestion = useCallback((index: number) => {
        setActiveSuggestionIdx(index)
        onAiDescriptionChange?.(getSuggestionText(index))
        setMode('generate')
    }, [getSuggestionText, onAiDescriptionChange, setMode])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback(() => {
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (isAiContentMode || !canAddMoreManual) return
        const files = Array.from(e.dataTransfer.files).filter((file) => file.type.startsWith('image/'))
        files.slice(0, MAX_CONTENT_IMAGES - totalManualSelected).forEach((file) => onUpload(file, 'content'))
        setMode('upload')
    }, [isAiContentMode, canAddMoreManual, totalManualSelected, onUpload, setMode])

    const handleSelectFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (isAiContentMode) return
        files.slice(0, MAX_CONTENT_IMAGES - totalManualSelected).forEach((file) => onUpload(file, 'content'))
        if (files.length > 0) setMode('upload')
        if (inputRef.current) inputRef.current.value = ''
    }, [isAiContentMode, totalManualSelected, onUpload, setMode])

    const renderManualPreview = () => {
        const selectedBrandKitImages = contentBrandKitImageIds
            .map((id) => selectedBrandKitMap.get(id))
            .filter((item): item is { id: string; url: string; name?: string } => Boolean(item))

        const hasManual = contentUploadedImages.length > 0 || selectedBrandKitImages.length > 0
        if (!hasManual) return null

        return (
            <div className="grid grid-cols-3 gap-2.5">
                {contentUploadedImages.map((url, index) => (
                    <div key={url} className="group relative aspect-square overflow-hidden rounded-[1.15rem] border border-border/65 bg-background shadow-[0_18px_38px_-30px_rgba(15,23,42,0.28)]">
                        <img src={url} alt={tt('contentImage.ownImageAlt', 'Own content image {{index}}', { index: index + 1 })} className="w-full h-full object-cover" />
                        <span className="absolute left-2 top-2 rounded-full border border-sky-500/20 bg-sky-500/90 px-2 py-1 text-[0.7rem] font-semibold text-white shadow-sm">
                            {tt('contentImage.contentBadge', 'Content')}
                        </span>
                        {onRemoveUploadedImage && (
                            <button
                                type="button"
                                onClick={() => onRemoveUploadedImage(url)}
                                className={CONTENT_REMOVE_BUTTON_CLASS}
                                aria-label={tt('contentImage.removeUploadedAria', 'Remove content image')}
                            >
                                <IconClose className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                ))}
                {selectedBrandKitImages.map((image) => (
                    <button
                        key={image.id}
                        type="button"
                        onClick={() => onToggleBrandKitImage?.(image.id)}
                            className="group relative aspect-square overflow-hidden rounded-[1.15rem] border border-border/65 bg-background shadow-[0_18px_38px_-30px_rgba(15,23,42,0.28)]"
                            title={tt('contentImage.removeFromContentTitle', 'Remove from content')}
                        >
                            <img src={image.url} alt={image.name || tt('contentImage.brandKitImageAlt', 'Imagen de Kit de marca')} className="w-full h-full object-cover" />
                        <span className="absolute left-2 top-2 rounded-full border border-emerald-500/20 bg-emerald-500/90 px-2 py-1 text-[0.7rem] font-semibold text-white shadow-sm">
                            {tt('contentImage.brandKitBadge', 'Kit de marca')}
                        </span>
                        <span className={CONTENT_REMOVE_BUTTON_CLASS}>
                            <IconClose className="w-3 h-3" />
                        </span>
                    </button>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {isAiContentMode ? (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    {hasSuggestions ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                            {suggestedImagePrompts.map((_, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => applySuggestion(index)}
                                    className={cn(
                                        'h-6 px-2.5 rounded-full text-[10px] border transition-all',
                                        index === activeSuggestionIdx
                                            ? 'border-primary/50 bg-primary/15 text-primary'
                                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    {tt('contentImage.suggestion', 'Suggestion {{index}}', { index: index + 1 })}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-border bg-background px-3 py-2.5">
                            <p className="text-[0.84rem] text-muted-foreground leading-relaxed">
                                {tt('contentImage.analyzeHint', 'Press Analyze to generate visual content suggestions with AI.')}
                            </p>
                        </div>
                    )}

                    <Textarea
                        value={aiImageDescription}
                        onChange={(e) => {
                            const next = e.target.value
                            onAiDescriptionChange?.(next)
                            if (hasSuggestions) {
                                setEditedSuggestionDescriptions((prev) => ({
                                    ...prev,
                                    [safeSuggestionIndex]: next,
                                }))
                            }
                            setMode('generate')
                        }}
                        placeholder={tt('contentImage.aiPlaceholder', 'Describe the visual content you want AI to generate...')}
                        className="min-h-[108px] resize-none rounded-2xl border border-border/70 bg-background/90 px-4 py-3 text-[14px] leading-[1.45] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                    />
                    <p className="inline-flex items-center gap-1.5 text-[clamp(0.86rem,0.82rem+0.1vw,0.92rem)] text-muted-foreground">
                        <IconSparkles className="w-3 h-3 text-primary" />
                        {tt('contentImage.aiHelper', 'AI will build the main visual content of the image.')}
                    </p>
                </div>
            ) : (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={cn(CONTENT_ACTION_BUTTON_CLASS, 'gap-2')}
                            onClick={() => inputRef.current?.click()}
                            disabled={!canAddMoreManual}
                        >
                            <IconUpload className="h-3.5 w-3.5" />
                            {tt('contentImage.upload', 'Upload content')}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={cn(CONTENT_ACTION_BUTTON_CLASS, 'gap-2')}
                            onClick={() => setIsBrandKitModalOpen(true)}
                        >
                            <IconPalette className="h-3.5 w-3.5" />
                            {tt('contentImage.fromBrandKit', 'Desde Kit de marca')}
                        </Button>
                    </div>

                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleSelectFiles}
                        className="hidden"
                    />

                    {renderManualPreview()}

                    {canAddMoreManual && (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => inputRef.current?.click()}
                            className={cn(
                                'flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[1.4rem] border border-dashed px-5 py-6 text-center transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]',
                                isDragging
                                    ? 'border-primary/55 bg-primary/[0.08] shadow-[0_18px_40px_-30px_rgba(120,142,84,0.32)]'
                                    : 'border-border/80 bg-background/72 hover:border-primary/35 hover:bg-background hover:shadow-[0_16px_38px_-30px_rgba(15,23,42,0.2)]'
                            )}
                        >
                            <div className={cn(
                                'flex h-10 w-10 items-center justify-center rounded-[1rem] border transition-colors',
                                isDragging
                                    ? 'border-primary/25 bg-primary/[0.1]'
                                    : 'border-border/70 bg-background'
                            )}>
                                {isDragging ? <IconUpload className="h-4.5 w-4.5 text-primary" /> : <IconImage className="h-4.5 w-4.5 text-muted-foreground" />}
                            </div>
                            <p className="text-[clamp(0.96rem,0.92rem+0.1vw,1.02rem)] font-semibold text-foreground/92">
                                {isDragging
                                    ? tt('contentImage.dropHere', 'Drop your content images here')
                                    : tt('contentImage.dragOrClick', 'Drag content images here or click')}
                            </p>
                            <p className="text-[clamp(0.84rem,0.8rem+0.08vw,0.9rem)] text-muted-foreground">
                                {tt('contentImage.maxImages', 'Hasta {{count}} imágenes combinando subidas y Kit de marca.', { count: MAX_CONTENT_IMAGES })}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {error && (
                <p className="text-[0.8rem] text-destructive">{error}</p>
            )}

            <Dialog open={isBrandKitModalOpen} onOpenChange={setIsBrandKitModalOpen}>
                <DialogContent className={CONTENT_MODAL_CLASS}>
                    <DialogHeader className="px-7 pb-2 pt-7">
                        <DialogTitle className="text-[clamp(1.08rem,1.02rem+0.14vw,1.18rem)] font-semibold tracking-[-0.01em]">
                            {tt('contentImage.selectFromBrandKitTitle', 'Selecciona contenido desde Kit de marca')}
                        </DialogTitle>
                        <DialogDescription className="text-[0.94rem] leading-relaxed text-muted-foreground">
                            {tt('contentImage.selectFromBrandKitDescription', 'Choose the images you want to use as the main content in the generation.')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 min-h-0 overflow-y-auto px-7 py-6">
                        {brandKitImages.length > 0 ? (
                            <div className="grid content-start [grid-template-columns:repeat(auto-fill,minmax(120px,1fr))] gap-4 sm:[grid-template-columns:repeat(auto-fill,minmax(132px,1fr))]">
                                {brandKitImages.map((image, index) => {
                                const isSelected = contentBrandKitImageIds.includes(image.id)
                                const canSelect = canAddMoreManual || isSelected
                                return (
                                    <motion.button
                                        key={image.id}
                                        type="button"
                                        initial={{ opacity: 0, y: 10, scale: 0.985 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ duration: 0.18, delay: Math.min(0.012 * (index + 1), 0.14), ease: 'easeOut' }}
                                        onClick={() => {
                                            if (!canSelect) return
                                            if (isSelected) {
                                                onToggleBrandKitImage?.(image.id)
                                            } else if (selectedBrandKitImageIds.includes(image.id)) {
                                                onReferenceRoleChange?.(image.id, 'content')
                                            } else {
                                                onToggleBrandKitImage?.(image.id)
                                            }
                                            onReferenceRoleChange?.(image.id, 'content')
                                            if (!isAiContentMode) setMode('brandkit')
                                        }}
                                        className={cn(
                                            'group relative w-full overflow-hidden rounded-[1.15rem] border aspect-square transition-all text-left',
                                            isSelected
                                                ? 'border-primary/30 bg-primary/[0.07] shadow-[0_18px_38px_-28px_rgba(120,142,84,0.42)]'
                                                : canSelect
                                                    ? 'border-border/65 bg-background hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-30px_rgba(15,23,42,0.24)]'
                                                    : 'cursor-not-allowed border-border/50 bg-muted/30 opacity-50'
                                        )}>
                                            <img src={image.url} alt={image.name || tt('contentImage.brandKitImageAlt', 'Imagen de Kit de marca')} className="w-full h-full object-cover" />
                                            {isSelected && (
                                                <IconCheckCircle className="absolute right-2.5 top-2.5 h-9 w-9 text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.62)]" />
                                            )}
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-3 pb-2 pt-6">
                                                <p className="truncate text-[0.82rem] font-medium text-white">
                                                    {image.name || tt('contentImage.brandKitImageAlt', 'Imagen de Kit de marca')}
                                                </p>
                                            </div>
                                        </motion.button>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="mt-1 rounded-[1.15rem] border border-dashed border-border/70 bg-background/72 p-8 text-center text-[0.94rem] text-muted-foreground">
                                {tt('contentImage.noBrandKitImages', 'Este Kit de marca todavía no tiene imágenes.')}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end px-7 pb-6 pt-2">
                        <Button
                            type="button"
                            size="sm"
                            className={CONTENT_ACTION_BUTTON_CLASS}
                            onClick={() => setIsBrandKitModalOpen(false)}
                        >
                            {tt('actions.continue', 'Continue')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
