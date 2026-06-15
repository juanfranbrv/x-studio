'use client'

import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { IconLayers, IconCarousel, IconMinus, IconPlus, IconLayout } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SectionHeader } from '@/components/studio/shared/SectionHeader'
import { CarouselCompositionSelector } from '@/components/studio/carousel/CarouselCompositionSelector'
import {
    STUDIO_RICH_SELECT_TRIGGER_CLASS,
    STUDIO_SELECT_CONTENT_CLASS,
    STUDIO_SELECT_ITEM_CLASS,
} from '@/components/studio/shared/selectStyles'
import {
    PANEL_SECTION_HEADER_ICON_CLASS,
    PANEL_SECTION_HEADER_TITLE_CLASS,
    PANEL_RICH_SELECT_CONTENT_STYLE,
    pickCompositionId,
} from './CarouselControlsPanel.helpers'
import type { CompositionMode, UiComposition, UiStructure } from './CarouselControlsPanel.types'

type AspectRatio = '1:1' | '4:5' | '3:4'
type StepValue = 1 | 2 | 3 | 4 | 5 | 6 | 7

/** Selector del numero de diapositivas del carrusel. */
export function SlideCountSection({
    slideCount,
    onChange,
}: {
    slideCount: number
    onChange: (delta: number) => void
}) {
    const { t } = useTranslation('carousel')

    return (
        <>
            <SectionHeader
                icon={IconCarousel}
                title={t('ui.slideCount')}
                iconContainerClassName={PANEL_SECTION_HEADER_ICON_CLASS}
                titleClassName={PANEL_SECTION_HEADER_TITLE_CLASS}
            />
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => onChange(-1)} disabled={slideCount <= 0}>
                    <IconMinus className="w-4 h-4" />
                </Button>
                <div className="flex-1 text-center">
                    <span className="text-3xl font-bold">{slideCount}</span>
                    <span className="text-sm text-muted-foreground ml-2">{t('ui.slides')}</span>
                </div>
                <Button variant="outline" size="icon" onClick={() => onChange(1)} disabled={slideCount >= 15}>
                    <IconPlus className="w-4 h-4" />
                </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('ui.slideRange')}</p>
        </>
    )
}

/** Selector de formato (aspect ratio) del carrusel. */
export function FormatSection({
    aspectRatio,
    onSelect,
}: {
    aspectRatio: AspectRatio
    onSelect: (ratio: AspectRatio) => void
}) {
    const { t } = useTranslation('carousel')

    return (
        <>
            <SectionHeader
                icon={IconLayers}
                title={t('ui.formatTitle')}
                iconContainerClassName={PANEL_SECTION_HEADER_ICON_CLASS}
                titleClassName={PANEL_SECTION_HEADER_TITLE_CLASS}
            />
            <div className="space-y-2">
                <button
                    onClick={() => onSelect('4:5')}
                    className={cn(
                        'feedback-action flex items-center gap-3 rounded-[1.2rem] border p-3.5 transition-all w-full text-left',
                        aspectRatio === '4:5'
                            ? 'border-primary/35 bg-primary/8 shadow-[0_18px_38px_-30px_rgba(59,130,246,0.3)]'
                            : 'border-border/65 bg-background/74 hover:border-primary/20 hover:bg-[hsl(var(--surface-alt))]/75'
                    )}
                >
                    <div className="w-8 h-10 rounded bg-muted border border-border" />
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{t('ui.formatVerticalTitle', { defaultValue: 'Standard vertical (portrait)' })}</span>
                            <span className="text-[10px] font-medium text-muted-foreground">4:5</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                            {t('ui.formatVerticalDescription', { defaultValue: '1080x1350 · the safest standard to avoid cropping on older devices or Meta Ads.' })}
                        </p>
                    </div>
                </button>
                <button
                    onClick={() => onSelect('3:4')}
                    className={cn(
                        'feedback-action flex items-center gap-3 rounded-[1.2rem] border p-3.5 transition-all w-full text-left',
                        aspectRatio === '3:4'
                            ? 'border-primary/35 bg-primary/8 shadow-[0_18px_38px_-30px_rgba(59,130,246,0.3)]'
                            : 'border-border/65 bg-background/74 hover:border-primary/20 hover:bg-[hsl(var(--surface-alt))]/75'
                    )}
                >
                    <div className="w-8 h-10 rounded bg-muted border border-border" />
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{t('ui.formatTallTitle', { defaultValue: 'Tall / extended vertical (2026 trend)' })}</span>
                            <span className="text-[10px] font-medium text-muted-foreground">3:4</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                            {t('ui.formatTallDescription', { defaultValue: '1080x1440 · +6.6% more screen space · dominates the feed and fits the new vertical grid.' })}
                        </p>
                    </div>
                </button>
                <button
                    onClick={() => onSelect('1:1')}
                    className={cn(
                        'feedback-action flex items-center gap-3 rounded-[1.2rem] border p-3.5 transition-all w-full text-left',
                        aspectRatio === '1:1'
                            ? 'border-primary/35 bg-primary/8 shadow-[0_18px_38px_-30px_rgba(59,130,246,0.3)]'
                            : 'border-border/65 bg-background/74 hover:border-primary/20 hover:bg-[hsl(var(--surface-alt))]/75'
                    )}
                >
                    <div className="w-10 h-10 rounded bg-muted border border-border" />
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{t('ui.formatSquareTitle', { defaultValue: 'Square (traditional)' })}</span>
                            <span className="text-[10px] font-medium text-muted-foreground">1:1</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                            {t('ui.formatSquareDescription', { defaultValue: '1080x1080 · the original classic format for balanced layouts.' })}
                        </p>
                    </div>
                </button>
            </div>
        </>
    )
}

/** Seccion de diseno: modo basico/avanzado, estructura narrativa y composicion. */
export function CompositionSection({
    compositionMode,
    setCompositionMode,
    compositions,
    advancedCompositions,
    compositionId,
    setCompositionId,
    structureId,
    setStructureId,
    structures,
    setHasUserSelectedStructure,
    markStructuralReanalysisNeeded,
    setCurrentStep,
}: {
    compositionMode: CompositionMode
    setCompositionMode: Dispatch<SetStateAction<CompositionMode>>
    compositions: UiComposition[]
    advancedCompositions: UiComposition[]
    compositionId: string
    setCompositionId: Dispatch<SetStateAction<string>>
    structureId: string
    setStructureId: Dispatch<SetStateAction<string>>
    structures: UiStructure[]
    setHasUserSelectedStructure: Dispatch<SetStateAction<boolean>>
    markStructuralReanalysisNeeded: () => void
    setCurrentStep: Dispatch<SetStateAction<StepValue>>
}) {
    const { t } = useTranslation('carousel')

    return (
        <>
            <SectionHeader
                icon={IconLayout}
                title={t('ui.designTitle')}
                iconContainerClassName={PANEL_SECTION_HEADER_ICON_CLASS}
                titleClassName={PANEL_SECTION_HEADER_TITLE_CLASS}
                extra={
                    <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/72 px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                        <span className={cn('text-[clamp(0.88rem,0.84rem+0.1vw,0.94rem)] font-medium', compositionMode === 'advanced' ? 'text-primary/90' : 'text-muted-foreground')}>
                            {t('ui.advancedMode')}
                        </span>
                        <Switch
                            checked={compositionMode === 'advanced'}
                        onCheckedChange={(checked) => {
                            const nextMode: CompositionMode = checked ? 'advanced' : 'basic'
                            setCompositionMode(nextMode)
                            setCompositionId(
                                pickCompositionId(
                                    compositions,
                                    nextMode,
                                    compositionId,
                                    `${structureId}|0`
                                )
                            )
                        }}
                            aria-label={t('ui.designAdvancedAria')}
                        />
                    </div>
                }
            />
            <Select
                value={structureId}
                onValueChange={(value) => {
                    setHasUserSelectedStructure(true)
                    setStructureId(value)
                    markStructuralReanalysisNeeded()
                }}
            >
                <SelectTrigger
                    className={STUDIO_RICH_SELECT_TRIGGER_CLASS}
                >
                    <SelectValue placeholder={t('ui.structurePlaceholder')} className="sr-only" />
                    <span className="flex min-w-0 items-center gap-2">
                        <span className="block truncate text-left text-[clamp(1rem,0.96rem+0.2vw,1.08rem)] font-medium leading-tight">
                            {structures.find((structure) => structure.id === structureId)?.name || t('ui.structurePlaceholder')}
                        </span>
                    </span>
                </SelectTrigger>
                <SelectContent className={STUDIO_SELECT_CONTENT_CLASS} position="popper" align="start" style={PANEL_RICH_SELECT_CONTENT_STYLE}>
                    {structures.map((structure) => (
                        <SelectItem key={structure.id} value={structure.id} className={STUDIO_SELECT_ITEM_CLASS}>
                            <span className="flex items-center justify-between w-full gap-2">
                                <span>{structure.name}</span>
                            </span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {compositionMode === 'advanced' ? (
                <>
                    <CarouselCompositionSelector
                        key={`${structureId}-advanced`}
                        compositions={advancedCompositions}
                        selectedId={compositionId}
                        onSelect={(id) => {
                            setCompositionId(id)
                            setCurrentStep(prev => (prev < 4 ? 4 : prev))
                        }}
                    />
                    <p className="text-[11px] text-muted-foreground leading-snug">
                        {t('ui.advancedModeDescription')}
                    </p>
                </>
            ) : (
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
                    <p className="text-[11px] text-primary font-medium leading-relaxed">
                        {t('ui.basicModeDescription')}
                    </p>
                </div>
            )}
        </>
    )
}
