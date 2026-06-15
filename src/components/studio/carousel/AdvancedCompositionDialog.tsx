'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { IconLayers, IconRotate } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { ADVANCED_COMPOSITION_MODAL_CLASS, PANEL_SECONDARY_BUTTON_CLASS } from './CarouselControlsPanel.helpers'
import type { CarouselSlide, SlideContent } from '@/app/actions/generate-carousel'

type VariantSlide = SlideContent | CarouselSlide

interface SlideVariantSource {
    id: string
    label: string
    tone: string
    slides: VariantSlide[]
}

export function AdvancedCompositionDialog({
    open,
    onOpenChange,
    previewScriptSlides,
    slideVariantSelection,
    slideVariantSources,
    hasOriginalSuggestion,
    onUndoSuggestion,
    onApplySlideVariant,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    previewScriptSlides: SlideContent[]
    slideVariantSelection: string[]
    slideVariantSources: SlideVariantSource[]
    hasOriginalSuggestion?: boolean
    onUndoSuggestion?: () => void
    onApplySlideVariant?: (slideIndex: number, sourceId: string) => void
}) {
    const { t } = useTranslation('carousel')
    const shouldReduceMotion = useReducedMotion()

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={ADVANCED_COMPOSITION_MODAL_CLASS}>
                <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 18, scale: 0.972 }}
                    animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                    transition={shouldReduceMotion ? undefined : { duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <DialogHeader className="px-7 pb-2 pt-7">
                        <div className="flex flex-wrap items-start justify-between gap-3 pr-16">
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                                    <IconLayers className="h-3.5 w-3.5" />
                                    {t('ui.advancedCompositionBadge', { defaultValue: 'Advanced composition' })}
                                </div>
                                <DialogTitle className="text-[clamp(1.16rem,1.08rem+0.18vw,1.28rem)] font-semibold tracking-[-0.01em]">
                                    {t('ui.composeSlideBySlide', { defaultValue: 'Build the carousel slide by slide' })}
                                </DialogTitle>
                                <DialogDescription className="max-w-3xl text-[1rem] leading-relaxed text-muted-foreground">
                                    {t('ui.composeSlideBySlideDescription', { defaultValue: 'Each row represents one slide. Horizontally you see the original option and every available variant for that position.' })}
                                </DialogDescription>
                            </div>
                            {hasOriginalSuggestion && onUndoSuggestion && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onUndoSuggestion}
                                    className={cn(PANEL_SECONDARY_BUTTON_CLASS, 'pr-5')}
                                >
                                    <IconRotate className="mr-1.5 h-3.5 w-3.5" />
                                    {t('common:suggestions.backToOriginal', { defaultValue: 'Back to original' })}
                                </Button>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
                        <div className="space-y-4">
                            {previewScriptSlides.map((slide, slideIndex) => {
                                const selectedSource = slideVariantSelection[slideIndex] || 'original'
                                return (
                                    <div
                                        key={`variant-row-modal-${slideIndex}`}
                                        className="rounded-[1.4rem] border border-border/60 bg-background/74 p-4 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.16)]"
                                    >
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-primary/12 px-2 text-sm font-bold text-primary">
                                                    {slideIndex + 1}
                                                </span>
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">
                                                        {slide.title || (slide.role === 'hook'
                                                            ? t('ui.hook', { defaultValue: 'Hook' })
                                                            : slide.role === 'cta'
                                                                ? t('ui.closingCta', { defaultValue: 'Closing / CTA' })
                                                                : t('ui.slideLabel', { index: slideIndex + 1, defaultValue: 'Slide {{index}}' }))}
                                                    </p>
                                                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                                                        {t('ui.activeVariant', { defaultValue: 'Active' })}: {slideVariantSources.find((source) => source.id === selectedSource)?.label || t('ui.original', { defaultValue: 'Original' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                                {t('ui.variantsCount', { count: slideVariantSources.length, defaultValue: '{{count}} variants' })}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                                            {slideVariantSources.map((source) => {
                                                const candidate = source.slides[slideIndex]
                                                if (!candidate) return null
                                                const isSelected = selectedSource === source.id
                                                return (
                                                    <button
                                                        key={`${source.id}-${slideIndex}`}
                                                        type="button"
                                                        onClick={() => onApplySlideVariant?.(slideIndex, source.id)}
                                                        className={cn(
                                                            'group flex min-h-[220px] w-full flex-col overflow-hidden rounded-[1.15rem] border text-left transition-all duration-200',
                                                            isSelected
                                                                ? 'border-primary/30 bg-primary/[0.07] shadow-[0_18px_38px_-28px_rgba(120,142,84,0.42)]'
                                                                : 'border-border/65 bg-background/78 hover:border-primary/18 hover:bg-[hsl(var(--surface-alt))]/82 hover:shadow-[0_14px_30px_-24px_rgba(15,23,42,0.24)]'
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            'w-full px-3 py-3 transition-colors',
                                                            isSelected
                                                                ? 'bg-primary/[0.055]'
                                                                : 'bg-background/40 group-hover:bg-background/78'
                                                        )}>
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-[0.82rem] font-semibold text-foreground">
                                                                        {source.label}
                                                                    </p>
                                                                    <p className="mt-0.5 line-clamp-1 text-[0.74rem] text-muted-foreground">
                                                                        {source.tone}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className={cn(
                                                            'flex flex-1 flex-col gap-2 border-t px-3 py-3 transition-colors',
                                                            isSelected
                                                                ? 'border-primary/18 bg-primary/[0.055]'
                                                                : 'border-border/40 bg-background/72'
                                                        )}>
                                                            <p className={cn(
                                                                'line-clamp-2 text-[clamp(0.92rem,0.88rem+0.08vw,0.98rem)] font-semibold leading-tight transition-colors',
                                                                isSelected ? 'text-primary/90' : 'text-foreground/86 group-hover:text-foreground/92'
                                                            )}>
                                                                {candidate.headline || candidate.title || t('ui.untitled', { defaultValue: 'Untitled' })}
                                                            </p>
                                                            <p className={cn(
                                                                'line-clamp-3 text-[0.8rem] leading-relaxed opacity-90',
                                                                isSelected ? 'text-primary/72' : 'text-muted-foreground/82'
                                                            )}>
                                                                {candidate.subtitle || candidate.description || t('ui.noDescription', { defaultValue: 'No description' })}
                                                            </p>
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-3 px-7 pb-6 pt-2">
                        <p className="text-[0.92rem] leading-relaxed text-muted-foreground">
                            {t('ui.variantChangesInstant', { defaultValue: 'Changes apply instantly while you choose variants.' })}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                className={PANEL_SECONDARY_BUTTON_CLASS}
                            >
                                {t('ui.keepEditingLater', { defaultValue: 'Keep editing later' })}
                            </Button>
                            <Button
                                onClick={() => onOpenChange(false)}
                                className={PANEL_SECONDARY_BUTTON_CLASS}
                            >
                                {t('ui.useThisComposition', { defaultValue: 'Use this composition' })}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </DialogContent>
        </Dialog>
    )
}
