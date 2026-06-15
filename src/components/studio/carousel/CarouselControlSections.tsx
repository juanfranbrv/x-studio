'use client'

import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { IconLayers, IconCarousel, IconMinus, IconPlus } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/studio/shared/SectionHeader'
import {
    PANEL_SECTION_HEADER_ICON_CLASS,
    PANEL_SECTION_HEADER_TITLE_CLASS,
} from './CarouselControlsPanel.helpers'

type AspectRatio = '1:1' | '4:5' | '3:4'

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
