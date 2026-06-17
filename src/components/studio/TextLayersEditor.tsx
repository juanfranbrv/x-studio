import React, { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { IconClose, IconMouseClick, IconFingerprint, IconLink, IconPlus } from '@/components/ui/icons'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { TextAsset } from '@/lib/creation-flow-types'
import { useTranslation } from 'react-i18next'
import { buildPreviewTextLayout, PreviewTextLayer } from './previewTextLayout'
import { PreviewEditableTextBlock } from './PreviewEditableTextBlock'
import { usePreviewComposition } from './usePreviewComposition'

export interface BrandKitTextOption {
    id: string
    label: string
    value: string
    type: 'url' | 'tagline' | 'cta' | 'hook' | 'custom'
}

interface TextLayersEditorProps {
    headline: string
    cta: string
    ctaUrl?: string
    ctaUrlEnabled?: boolean
    customTexts: Record<string, string>
    textAssets?: TextAsset[]
    brandKitTexts?: BrandKitTextOption[]
    onHeadlineChange: (value: string) => void
    onCtaChange: (value: string) => void
    onCtaUrlChange?: (value: string) => void
    onCustomTextChange: (id: string, value: string) => void
    onDeleteLayer: (id: string, type: 'headline' | 'cta' | 'custom' | 'asset') => void
    onAddTextAsset?: (asset: TextAsset) => void
    onUpdateTextAsset?: (id: string, value: string) => void
}

function getInlineFieldWidth(value: string, minCh: number, maxCh: number) {
    const textLength = Math.max(minCh, Math.min(maxCh, String(value || '').trim().length || minCh))
    return `min(${textLength}ch, 100%)`
}

const PREVIEW_TEXT_REMOVE_BUTTON_CLASS = 'absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white opacity-0 transition-all duration-200 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-black/70'
const PREVIEW_TEXT_FRAME_CLASS = 'relative mx-auto w-fit max-w-full rounded-[1.15rem] border border-transparent bg-transparent px-4 py-2 transition-all duration-200 group-hover:border-border/70 group-hover:bg-background/72 group-focus-within:border-primary/35 group-focus-within:bg-background/90 group-focus-within:shadow-[0_18px_38px_-30px_rgba(15,23,42,0.18)]'
const PREVIEW_TEXT_INLINE_ACTION_CLASS = 'group mx-auto inline-flex max-w-full items-start justify-center gap-1.5 align-top pointer-events-auto'
const PREVIEW_TEXT_INLINE_FRAME_CLASS = 'relative inline-flex max-w-full items-start justify-center rounded-[1rem] border border-transparent bg-transparent px-3 pt-[0.16rem] pb-[0.01rem] transition-all duration-200 group-hover:border-border/70 group-hover:bg-background/72 group-focus-within:border-primary/35 group-focus-within:bg-background/90 group-focus-within:shadow-[0_18px_38px_-30px_rgba(15,23,42,0.16)]'
const PREVIEW_TEXT_CHIP_REMOVE_SPACER_CLASS = 'pr-8'
const PREVIEW_TEXT_INLINE_REMOVE_BUTTON_CLASS = 'mt-[0.08rem] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white opacity-0 transition-all duration-200 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-black/70'

export function TextLayersEditor({
    headline,
    cta,
    ctaUrl = '',
    ctaUrlEnabled = true,
    customTexts,
    textAssets = [],
    brandKitTexts = [],
    onHeadlineChange,
    onCtaChange,
    onCtaUrlChange,
    onCustomTextChange,
    onDeleteLayer,
    onAddTextAsset,
    onUpdateTextAsset
}: TextLayersEditorProps) {
    const { t } = useTranslation('common')
    const containerRef = useRef<HTMLDivElement | null>(null)
    const touchVisibleActionClass = 'focus-visible:opacity-100'
    const layout = buildPreviewTextLayout({
        headline,
        customTexts,
        textAssets,
        cta,
        ctaUrl,
        ctaUrlEnabled,
    })
    const compositionPlan = usePreviewComposition(containerRef, {
        headline: layout.headline.value,
        support: layout.support.map((item) => item.value),
        meta: layout.meta.map((item) => item.value),
        hasCta: Boolean(layout.cta?.value),
        hasUrl: Boolean(layout.url?.value),
    })

    const handleMiddleLayerChange = (layer: PreviewTextLayer, value: string) => {
        if (layer.source === 'asset') {
            onUpdateTextAsset?.(layer.id, value)
            return
        }
        onCustomTextChange(layer.id, value)
    }

    const handleMiddleLayerDelete = (layer: PreviewTextLayer) => {
        onDeleteLayer(layer.id, layer.source === 'asset' ? 'asset' : 'custom')
    }

    return (
        <div
            ref={containerRef}
            className="text-layer-editor w-full h-full grid animate-in fade-in zoom-in-95 duration-500 overflow-hidden"
            style={{
                paddingTop: 'calc(var(--tl-pad-top) + var(--tl-plan-flow-top, 0rem))',
                paddingBottom: 'var(--tl-pad-bottom)',
                paddingLeft: 'var(--tl-pad-x)',
                paddingRight: 'var(--tl-pad-x)',
                gridTemplateRows: 'auto 1fr auto',
                rowGap: 'var(--tl-section-gap)',
                ['--tl-plan-flow-top' as string]: `${compositionPlan.flowTopInset}rem`,
                ['--tl-plan-stack-gap' as string]: `${compositionPlan.stackGap}rem`,
                ['--tl-plan-support-gap' as string]: `${compositionPlan.supportGap}rem`,
                ['--tl-plan-meta-gap' as string]: `${compositionPlan.metaGap}rem`,
                ['--tl-plan-title-top' as string]: `${compositionPlan.titleTop}rem`,
                ['--tl-plan-middle-top' as string]: `${compositionPlan.middleTop}rem`,
                ['--tl-plan-brand-top' as string]: `${compositionPlan.brandTop}rem`,
                ['--tl-plan-cta-bottom' as string]: `${compositionPlan.ctaBottom}rem`,
                ['--tl-plan-head-scale' as string]: compositionPlan.headlineScale,
                ['--tl-plan-support-scale' as string]: compositionPlan.supportScale,
                ['--tl-plan-meta-scale' as string]: compositionPlan.metaScale,
                ['--tl-zone-headline-max' as string]: `min(98cqi, ${compositionPlan.zoneHeadlineMaxCh}ch)`,
                ['--tl-zone-support-max' as string]: `min(94cqi, ${compositionPlan.zoneSupportMaxCh}ch)`,
                ['--tl-zone-meta-max' as string]: `min(86cqi, ${compositionPlan.zoneMetaMaxCh}ch)`,
            }}
            data-layout-mode={compositionPlan.mode}
        >
            <div
                data-zone="headline"
                className="tl-zone tl-zone-headline mx-auto w-full"
                style={{ marginTop: 'var(--tl-plan-title-top, var(--tl-title-top))' }}
            >
                <PreviewEditableTextBlock
                    value={headline || ''}
                    onChange={onHeadlineChange}
                    onDelete={() => onDeleteLayer('headline', 'headline')}
                    placeholder={t('textLayerEditor.headlinePlaceholder', { defaultValue: 'WRITE YOUR HEADLINE' })}
                    fontSize="calc(var(--tl-head-size) * var(--tl-plan-head-scale, 1))"
                    lineHeight="var(--tl-head-line)"
                    minWidthCh={compositionPlan.minHeadlineWidthCh}
                    maxWidthCh={compositionPlan.zoneHeadlineMaxCh}
                    frameClassName={PREVIEW_TEXT_FRAME_CLASS}
                    actionClassName={PREVIEW_TEXT_INLINE_ACTION_CLASS}
                    removeButtonClassName={PREVIEW_TEXT_INLINE_REMOVE_BUTTON_CLASS}
                    touchVisibleActionClass={touchVisibleActionClass}
                    textClassName="font-black text-foreground placeholder:text-muted-foreground/20 leading-tight drop-shadow-sm [text-wrap:balance]"
                    textWrap="balance"
                />
            </div>

            <div
                className="tl-middle w-full flex flex-col items-center justify-start"
                style={{ rowGap: 'var(--tl-plan-stack-gap, var(--tl-stack-gap))', minHeight: 0 }}
            >
                {layout.support.length > 0 && (
                    <div
                        data-zone="support"
                        className="w-full flex flex-col items-center"
                        style={{ rowGap: 'var(--tl-plan-support-gap, var(--tl-support-gap))', marginTop: 'var(--tl-plan-middle-top, var(--tl-middle-top))' }}
                    >
                        {layout.support.map((layer) => (
                            <div key={layer.id} className="tl-zone tl-zone-support w-full">
                                <PreviewEditableTextBlock
                                    value={layer.value || ''}
                                    onChange={(value) => handleMiddleLayerChange(layer, value)}
                                    onDelete={() => handleMiddleLayerDelete(layer)}
                                    placeholder={t('textLayerEditor.customPlaceholder', {
                                        defaultValue: 'PROMPT FOR {{label}}...',
                                        label: layer.label.replace(/_/g, ' ').toUpperCase()
                                    })}
                                    fontSize="calc(var(--tl-support-size) * var(--tl-plan-support-scale, 1))"
                                    lineHeight="var(--tl-support-line)"
                                    minWidthCh={compositionPlan.minSupportWidthCh}
                                    maxWidthCh={compositionPlan.zoneSupportMaxCh}
                                    frameClassName={PREVIEW_TEXT_INLINE_FRAME_CLASS}
                                    actionClassName={PREVIEW_TEXT_INLINE_ACTION_CLASS}
                                    removeButtonClassName={PREVIEW_TEXT_INLINE_REMOVE_BUTTON_CLASS}
                                    touchVisibleActionClass={touchVisibleActionClass}
                                    textClassName="font-medium text-foreground/90 placeholder:text-muted-foreground/15 leading-tight transition-all drop-shadow-sm py-0 [text-wrap:pretty]"
                                />
                            </div>
                        ))}
                    </div>
                )}

                {layout.meta.length > 0 && (
                    <div
                        data-zone="meta"
                        className="w-full flex flex-col items-center pt-1"
                        style={{ rowGap: 'var(--tl-plan-meta-gap, var(--tl-meta-gap))' }}
                    >
                        {layout.meta.map((layer) => (
                            <div key={layer.id} className="tl-zone tl-zone-meta w-full">
                                <PreviewEditableTextBlock
                                    value={layer.value || ''}
                                    onChange={(value) => handleMiddleLayerChange(layer, value)}
                                    onDelete={() => handleMiddleLayerDelete(layer)}
                                    placeholder={t('textLayerEditor.assetPlaceholder', {
                                        defaultValue: 'Value for {{label}}...',
                                        label: layer.label
                                    })}
                                    fontSize="calc(var(--tl-meta-size) * var(--tl-plan-meta-scale, 1))"
                                    lineHeight="var(--tl-meta-line)"
                                    minWidthCh={compositionPlan.minMetaWidthCh}
                                    maxWidthCh={compositionPlan.zoneMetaMaxCh}
                                    frameClassName={PREVIEW_TEXT_INLINE_FRAME_CLASS}
                                    actionClassName={PREVIEW_TEXT_INLINE_ACTION_CLASS}
                                    removeButtonClassName={PREVIEW_TEXT_INLINE_REMOVE_BUTTON_CLASS}
                                    touchVisibleActionClass={touchVisibleActionClass}
                                    textClassName="font-semibold text-foreground/88 placeholder:text-muted-foreground/15 leading-tight transition-all drop-shadow-sm py-0 [text-wrap:pretty]"
                                />
                            </div>
                        ))}
                    </div>
                )}

                <div className="pointer-events-auto flex justify-center" style={{ marginTop: 'var(--tl-plan-brand-top, var(--tl-brand-top))' }}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="uppercase font-bold tracking-widest text-muted-foreground hover:text-foreground transition-colors gap-2 bg-foreground/5 hover:bg-foreground/10 rounded-full"
                                style={{
                                    height: 'var(--tl-brand-h)',
                                    paddingLeft: 'var(--tl-brand-px)',
                                    paddingRight: 'var(--tl-brand-px)',
                                    fontSize: 'var(--tl-brand-fs)',
                                    width: 'fit-content',
                                    maxWidth: '92%',
                                }}
                            >
                                <IconFingerprint style={{ width: 'var(--tl-brand-icon)', height: 'var(--tl-brand-icon)' }} className="text-primary" />
                                {t('preview.brandTexts', { defaultValue: 'Brand Kit texts' })}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-72 max-h-80 overflow-y-auto">
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                {t('preview.selectBrandText', { defaultValue: 'Select a Brand Kit text' })}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                onClick={() => onAddTextAsset?.({
                                    id: `text-${Date.now()}`,
                                    type: 'custom',
                                    label: t('textLayerEditor.freeTextLabel', { defaultValue: 'Text' }),
                                    value: ''
                                })}
                                className="text-xs gap-2"
                            >
                                <IconPlus className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">{t('textLayerEditor.addFreeText', { defaultValue: 'Add free text...' })}</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {brandKitTexts && brandKitTexts.length > 0 ? (
                                brandKitTexts.map((option) => (
                                    <DropdownMenuItem
                                        key={option.id}
                                        onClick={() => onAddTextAsset?.({
                                            id: `text-${Date.now()}-${option.id}`,
                                            type: option.type,
                                            label: option.label,
                                            value: option.value
                                        })}
                                        className="text-xs flex flex-col items-start gap-0.5 py-2"
                                    >
                                        <span className="text-[9px] uppercase text-primary font-bold">{option.label}</span>
                                        <span className="text-foreground truncate max-w-full">{option.value}</span>
                                    </DropdownMenuItem>
                                ))
                            ) : (
                                <DropdownMenuItem disabled className="text-xs text-muted-foreground italic">
                                    {t('preview.noBrandTexts', { defaultValue: 'No texts available' })}
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div
                data-zone="cta"
                className="tl-cta flex-none flex flex-col items-center justify-center pb-4 pointer-events-auto"
                style={{ marginTop: 'auto', marginBottom: 'var(--tl-plan-cta-bottom, var(--tl-cta-bottom))' }}
            >
                <div className="flex flex-col items-center" style={{ rowGap: 'var(--tl-cta-gap)' }}>
                    <div
                        className={cn(
                            'group relative mx-auto flex w-fit max-w-full items-center gap-2 rounded-full border border-border bg-muted/60 text-muted-foreground shadow-sm',
                            (cta || ctaUrl) && PREVIEW_TEXT_CHIP_REMOVE_SPACER_CLASS
                        )}
                        style={{
                            paddingLeft: 'var(--tl-cta-px)',
                            paddingRight: 'var(--tl-cta-px)',
                            paddingTop: 'var(--tl-cta-py)',
                            paddingBottom: 'var(--tl-cta-py)',
                            width: 'fit-content',
                            maxWidth: '92%',
                        }}
                    >
                        <IconMouseClick style={{ width: 'var(--tl-cta-icon)', height: 'var(--tl-cta-icon)' }} className="text-muted-foreground flex-shrink-0" />
                        <input
                            value={cta || ''}
                            onChange={(event) => onCtaChange(event.target.value)}
                            className="max-w-full bg-transparent text-muted-foreground font-semibold border-none placeholder:text-muted-foreground/60 focus:ring-0 focus:outline-none text-center"
                            style={{
                                fontSize: 'var(--tl-cta-size)',
                                width: getInlineFieldWidth(cta, 14, 26),
                            }}
                        />
                        {(cta || ctaUrl) && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDeleteLayer('cta', 'cta')}
                                aria-label={t('textLayerEditor.clearCta', { defaultValue: 'Clear CTA' })}
                                className={cn(PREVIEW_TEXT_REMOVE_BUTTON_CLASS, touchVisibleActionClass)}
                            >
                                <IconClose className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>

                    {ctaUrlEnabled && (
                        <div
                            className={cn(
                                'group relative mx-auto flex w-fit max-w-full items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-muted/70 shadow-md',
                                ctaUrl && PREVIEW_TEXT_CHIP_REMOVE_SPACER_CLASS
                            )}
                            style={{
                                paddingLeft: 'var(--tl-url-px)',
                                paddingRight: 'var(--tl-url-px)',
                                paddingTop: 'var(--tl-url-py)',
                                paddingBottom: 'var(--tl-url-py)',
                                width: 'fit-content',
                                maxWidth: '92%',
                            }}
                        >
                            <IconLink style={{ width: 'var(--tl-url-icon)', height: 'var(--tl-url-icon)' }} className={`${ctaUrl ? 'text-primary' : 'text-muted-foreground'}`} />
                            <input
                                type="text"
                                value={ctaUrl || ''}
                                onChange={(event) => onCtaUrlChange?.(event.target.value)}
                                className="max-w-full bg-transparent text-primary font-semibold border-none focus:ring-0 focus:outline-none text-center font-mono placeholder:text-muted-foreground/60"
                                placeholder={t('textLayerEditor.urlPlaceholder', { defaultValue: 'yourbrand.com/...' })}
                                style={{
                                    width: getInlineFieldWidth(ctaUrl, 12, 28),
                                    fontSize: 'var(--tl-url-size)'
                                }}
                            />
                            {ctaUrl && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('textLayerEditor.clearUrl', { defaultValue: 'Clear URL' })}
                                    onClick={() => onCtaUrlChange?.('')}
                                    className={cn(PREVIEW_TEXT_REMOVE_BUTTON_CLASS, touchVisibleActionClass)}
                                >
                                    <IconClose className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
