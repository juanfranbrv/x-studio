import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const controlsPanelSource = fs.readFileSync(
    path.resolve(__dirname, '../ControlsPanel.tsx'),
    'utf8'
)
const suggestionsListSource = fs.readFileSync(
    path.resolve(__dirname, '../shared/SuggestionsList.tsx'),
    'utf8'
)
const creationFlowTypesSource = fs.readFileSync(
    path.resolve(__dirname, '../../../lib/creation-flow-types.ts'),
    'utf8'
)
const creationFlowHookSource = fs.readFileSync(
    path.resolve(__dirname, '../../../hooks/useCreationFlow.ts'),
    'utf8'
)
const layoutSelectorSource = fs.readFileSync(
    path.resolve(__dirname, '../creation-flow/LayoutSelector.tsx'),
    'utf8'
)
const socialFormatSelectorSource = fs.readFileSync(
    path.resolve(__dirname, '../creation-flow/SocialFormatSelector.tsx'),
    'utf8'
)
const contentImageCardSource = fs.readFileSync(
    path.resolve(__dirname, '../creation-flow/ContentImageCard.tsx'),
    'utf8'
)
const styleImageCardSource = fs.readFileSync(
    path.resolve(__dirname, '../creation-flow/StyleImageCard.tsx'),
    'utf8'
)
const auxiliaryLogosCardSource = fs.readFileSync(
    path.resolve(__dirname, '../creation-flow/AuxiliaryLogosCard.tsx'),
    'utf8'
)
const brandingConfiguratorSource = fs.readFileSync(
    path.resolve(__dirname, '../creation-flow/BrandingConfigurator.tsx'),
    'utf8'
)
const sharedSelectStylesSource = fs.readFileSync(
    path.resolve(__dirname, '../shared/selectStyles.ts'),
    'utf8'
)

describe('ControlsPanel bottom spacing', () => {
    it('reserva solo un margen corto antes de la barra de generar', () => {
        expect(controlsPanelSource).toContain('space-y-4 pr-4 pb-10 md:pr-5 md:pb-12')
        expect(controlsPanelSource).not.toContain('space-y-4 pr-4 pb-28 md:pr-5 md:pb-32')
    })

    it('da a la tarjeta de historial una jerarquia mas premium y coherente con el sistema', () => {
        expect(controlsPanelSource).toContain('{t(\'ui.history\')}')
        expect(controlsPanelSource).toContain('rounded-[1.8rem] border border-border/70 bg-white/92 p-4 shadow-[0_20px_55px_-36px_rgba(15,23,42,0.28)]')
        expect(controlsPanelSource).toContain('SelectTrigger')
        expect(controlsPanelSource).toContain('text-[0.94rem] font-bold uppercase tracking-[0.14em] text-foreground/92')
        expect(controlsPanelSource).toContain('const PANEL_SECTION_HEADER_TITLE_CLASS = "text-[0.94rem] font-bold uppercase tracking-[0.14em] text-foreground/92"')
        expect(controlsPanelSource).toContain('const PANEL_SECTION_SELECT_TRIGGER_CLASS = STUDIO_SELECT_TRIGGER_CLASS')
        expect(controlsPanelSource).toContain('const PANEL_SECTION_SELECT_CONTENT_CLASS = STUDIO_SELECT_CONTENT_CLASS')
        expect(controlsPanelSource).toContain('const PANEL_SECTION_SELECT_ITEM_CLASS = STUDIO_SELECT_ITEM_CLASS')
        expect(controlsPanelSource).toContain('const PANEL_RICH_SELECT_TRIGGER_CLASS = STUDIO_RICH_SELECT_TRIGGER_CLASS')
        expect(sharedSelectStylesSource).toContain('export const STUDIO_SELECT_TRIGGER_CLASS =')
        expect(sharedSelectStylesSource).toContain("'h-11 w-full rounded-2xl border border-input/80 bg-[hsl(var(--surface-alt))]/90 px-3.5 text-[clamp(1rem,0.96rem+0.2vw,1.08rem)] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-all hover:border-primary/20 hover:bg-white'")
        expect(sharedSelectStylesSource).toContain('export const STUDIO_RICH_SELECT_TRIGGER_CLASS =')
        expect(sharedSelectStylesSource).toContain('`${STUDIO_SELECT_TRIGGER_CLASS} relative !h-[3rem] !rounded-[1.1rem] justify-between gap-2 px-4 text-left [&_[data-slot=select-value]]:hidden`')
        expect(controlsPanelSource).toContain('const PANEL_SECONDARY_BUTTON_CLASS = "min-h-[42px] h-auto justify-center rounded-[1rem] px-4 py-2 text-center text-[clamp(0.93rem,0.89rem+0.12vw,1rem)] font-medium leading-tight whitespace-normal"')
        expect(controlsPanelSource).toContain('grid grid-cols-2 gap-2')
        expect(controlsPanelSource).toContain('className={PANEL_SECONDARY_BUTTON_CLASS}')
        expect(controlsPanelSource).toContain("t('ui.deleteAllSessions', { defaultValue: 'Borrar todas las sesiones' })")
        expect(sharedSelectStylesSource).toContain('border border-input/80 bg-[hsl(var(--surface-alt))]/90 px-3.5 text-[clamp(1rem,0.96rem+0.2vw,1.08rem)] font-medium')
        expect(controlsPanelSource).toContain('iconContainerClassName={PANEL_SECTION_HEADER_ICON_CLASS}')
        expect(controlsPanelSource).toContain('titleClassName={PANEL_SECTION_HEADER_TITLE_CLASS}')
        expect(controlsPanelSource).toContain('"inline-flex min-h-9 items-center text-[0.8rem] font-medium"')
        expect(controlsPanelSource).not.toContain('{t(\'ui.activeSession\')}\n                                </p>')
        expect(controlsPanelSource).not.toContain('justify-start rounded-xl px-3 text-[0.82rem] font-medium')
        expect(controlsPanelSource).not.toContain('rounded-full border border-border/70 bg-background/80 px-3 text-[0.8rem] font-medium text-muted-foreground')
        expect(controlsPanelSource).not.toContain('className="h-10 w-full min-w-0 rounded-xl border border-input/80 bg-background/90 px-3 text-xs')
        expect(controlsPanelSource).not.toContain('className="h-7 px-2 text-[10px]')
    })

    it('eleva la tarjeta de que quieres crear al mismo sistema visual del panel', () => {
        expect(controlsPanelSource).toContain("title={t('ui.whatToCreate')}")
        expect(controlsPanelSource).toContain("icon={IconIdea}")
        expect(controlsPanelSource).toContain("iconContainerClassName={PANEL_SECTION_HEADER_ICON_CLASS}")
        expect(controlsPanelSource).toContain("titleClassName={PANEL_SECTION_HEADER_TITLE_CLASS}")
        expect(controlsPanelSource).toContain('const PANEL_TEXT_BUTTON_REVEAL_CLASS = "rounded-xl px-3 py-2 text-[clamp(0.9rem,0.86rem+0.12vw,0.98rem)] text-muted-foreground transition-all duration-200 hover:bg-muted/80 hover:text-foreground hover:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.28)] disabled:opacity-50"')
        expect(controlsPanelSource).toContain("min-h-[132px] rounded-2xl border border-border/70 bg-background/90 px-4 py-3 !text-[14px] leading-[1.45]")
        expect(controlsPanelSource).toContain("md:!text-[14px]")
        expect(controlsPanelSource).toContain("group feedback-action h-[42px] rounded-[1rem] border border-transparent bg-primary/90 px-4 text-[clamp(0.94rem,0.9rem+0.12vw,1rem)] font-semibold text-primary-foreground")
        expect(controlsPanelSource).toContain('className={cn("mr-auto inline-flex items-center gap-1.5", PANEL_TEXT_BUTTON_REVEAL_CLASS)}')
    })

    it('mantiene la barra de acciones del prompt en una sola fila estructurada para evitar solapes con el texto', () => {
        expect(controlsPanelSource).toContain("'absolute left-2 right-2 bottom-2 flex items-center gap-3'")
        expect(controlsPanelSource).toContain("'flex min-w-0 flex-1 items-center gap-2 overflow-hidden'")
        expect(controlsPanelSource).toContain("'inline-flex min-w-0 items-center gap-1.5'")
        expect(controlsPanelSource).toContain('<span className="truncate">{t(\'inspireMe\')}</span>')
        expect(controlsPanelSource).toContain("'flex min-w-[146px] items-center justify-start gap-2'")
        expect(controlsPanelSource).not.toContain(": 'absolute left-2 right-2 bottom-2 flex flex-wrap items-center gap-2'")
    })

    it('simplifica las opciones alternativas a una sola linea y sin tooltip', () => {
        expect(controlsPanelSource).toContain('activeSuggestionIndex={state.selectedSuggestionIndex}')
        expect(creationFlowTypesSource).toContain('selectedSuggestionIndex?: number | null')
        expect(creationFlowTypesSource).toContain('selectedSuggestionIndex: null')
        expect(creationFlowHookSource).toContain('suggestions, selectedSuggestionIndex: null')
        expect(creationFlowHookSource).toContain('selectedSuggestionIndex: suggestionIndex')
        expect(creationFlowHookSource).toContain('selectedSuggestionIndex: null,\n                originalState: null')
        expect(suggestionsListSource).toContain('{t(\'suggestions.backToOriginal\')}')
        expect(suggestionsListSource).toContain('text-[clamp(0.88rem,0.84rem+0.1vw,0.94rem)]')
        expect(suggestionsListSource).toContain('min-h-[44px] w-full items-center rounded-[1rem] border px-4 py-3 text-left transition-all duration-200 hover:shadow-sm')
        expect(suggestionsListSource).toContain('border-primary/35 bg-primary/[0.07] shadow-[0_16px_34px_-26px_rgba(59,130,246,0.20)]')
        expect(suggestionsListSource).toContain('border-border/55 bg-background/55 hover:border-border/80 hover:bg-background/88')
        expect(suggestionsListSource).toContain('text-[clamp(0.96rem,0.92rem+0.1vw,1.02rem)] font-semibold')
        expect(suggestionsListSource).toContain('activeSuggestionIndex === idx ? "text-primary/90" : "text-foreground/92"')
        expect(suggestionsListSource).toContain('aria-pressed={activeSuggestionIndex === idx}')
        expect(suggestionsListSource).not.toContain('studio-tone-suggestion')
        expect(suggestionsListSource).not.toContain('TooltipProvider')
        expect(suggestionsListSource).not.toContain('TooltipContent')
        expect(suggestionsListSource).not.toContain('suggestion.subtitle')
        expect(suggestionsListSource).not.toContain('.toUpperCase()')
        expect(suggestionsListSource).not.toContain('IconCheck')
    })

    it('afina la tarjeta de diseno con mejor jerarquia interna y estados mas claros', () => {
        expect(controlsPanelSource).toContain('inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/72 px-2.5 py-1')
        expect(controlsPanelSource).toContain('text-[clamp(0.88rem,0.84rem+0.1vw,0.94rem)] font-medium')
        expect(controlsPanelSource).toContain('rounded-2xl border border-border/65 bg-background/72 px-4 py-3')
        expect(layoutSelectorSource).toContain("border-primary/32 bg-primary/[0.07] shadow-[0_18px_38px_-28px_rgba(120,142,84,0.42)]")
        expect(layoutSelectorSource).toContain("border-border/55 bg-background/55 hover:border-border/80 hover:bg-background/92")
        expect(layoutSelectorSource).toContain("text-[clamp(0.82rem,0.78rem+0.08vw,0.88rem)] font-semibold")
        expect(layoutSelectorSource).toContain("text-[clamp(0.74rem,0.7rem+0.08vw,0.8rem)] leading-snug")
        expect(layoutSelectorSource).toContain("h-11 w-11")
    })

    it('lleva la tarjeta de formato al mismo lenguaje visual del panel', () => {
        expect(socialFormatSelectorSource).toContain('relative flex h-11 w-11 items-center justify-center rounded-[1rem] border transition-all duration-300')
        expect(socialFormatSelectorSource).toContain('border-primary/30 bg-primary/[0.07] text-primary')
        expect(socialFormatSelectorSource).toContain('border-border/55 bg-background/55 text-muted-foreground')
        expect(socialFormatSelectorSource).toContain('rounded-[1rem] p-4 text-left transition-all duration-300')
        expect(socialFormatSelectorSource).toContain('border-primary/32 bg-primary/[0.07] shadow-[0_18px_38px_-28px_rgba(120,142,84,0.42)]')
        expect(socialFormatSelectorSource).toContain('text-[clamp(0.95rem,0.91rem+0.1vw,1rem)] font-semibold')
        expect(socialFormatSelectorSource).toContain('text-[clamp(0.8rem,0.76rem+0.08vw,0.86rem)] leading-snug')
    })

    it('ajusta el catalogo de formatos por red y elimina whatsapp del selector', () => {
        expect(creationFlowTypesSource).toContain("export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'x'")
        expect(creationFlowTypesSource).toContain("id: 'ig-mobile-portrait'")
        expect(creationFlowTypesSource).toContain("aspectRatio: '3:4'")
        expect(creationFlowTypesSource).toContain("id: 'ig-landscape-video'")
        expect(creationFlowTypesSource).toContain("id: 'tt-horizontal'")
        expect(creationFlowTypesSource).toContain("id: 'fb-event'")
        expect(creationFlowTypesSource).toContain("aspectRatio: '2:1'")
        expect(creationFlowTypesSource).toContain("id: 'x-carousel-horizontal'")
        expect(creationFlowTypesSource).toContain("id: 'li-video-vertical'")
        expect(creationFlowTypesSource).toContain("id: 'yt-landscape'")
        expect(creationFlowTypesSource).not.toContain("platform: 'whatsapp'")
        expect(creationFlowTypesSource).not.toContain("id: 'fb-cover'")
        expect(creationFlowTypesSource).not.toContain("id: 'x-header'")
        expect(creationFlowTypesSource).not.toContain("id: 'li-cover-company'")
        expect(socialFormatSelectorSource).not.toContain("whatsapp: {")
        expect(socialFormatSelectorSource).not.toContain('MessageCircle')
    })

    it('lleva contenido del usuario y su modal al mismo lenguaje premium del panel', () => {
        expect(contentImageCardSource).toContain("const CONTENT_ACTION_BUTTON_CLASS = 'min-h-[42px] h-auto justify-center rounded-[1rem]")
        expect(contentImageCardSource).toContain("const CONTENT_MODAL_CLASS = 'h-[min(88vh,860px)] w-[min(92vw,1120px)] !max-w-[min(92vw,1120px)] overflow-hidden rounded-[1.9rem]")
        expect(contentImageCardSource).toContain("data-[state=open]:slide-in-from-bottom-4")
        expect(contentImageCardSource).toContain("const CONTENT_REMOVE_BUTTON_CLASS = 'absolute right-2 top-2 inline-flex h-6 w-6")
        expect(contentImageCardSource).toContain("grid grid-cols-2 gap-2")
        expect(contentImageCardSource).toContain("className={cn(CONTENT_ACTION_BUTTON_CLASS, 'gap-2')}")
        expect(contentImageCardSource).toContain("grid grid-cols-3 gap-2.5")
        expect(contentImageCardSource).toContain("rounded-[1.15rem] border border-border/65 bg-background shadow-[0_18px_38px_-30px_rgba(15,23,42,0.28)]")
        expect(contentImageCardSource).toContain("rounded-[1.4rem] border border-dashed")
        expect(contentImageCardSource).toContain("border-primary/55 bg-primary/[0.08]")
        expect(contentImageCardSource).toContain("DialogContent className={CONTENT_MODAL_CLASS}")
        expect(contentImageCardSource).toContain("grid content-start [grid-template-columns:repeat(auto-fill,minmax(120px,1fr))] gap-4")
        expect(contentImageCardSource).toContain("initial={{ opacity: 0, y: 10, scale: 0.985 }}")
        expect(contentImageCardSource).toContain("IconCheckCircle className=\"absolute right-2.5 top-2.5 h-9 w-9 text-white")
        expect(contentImageCardSource).not.toContain("manualModeHint")
        expect(contentImageCardSource).not.toContain("contentImage.clear")
        expect(contentImageCardSource).not.toContain("border-b border-border/60")
        expect(contentImageCardSource).not.toContain("border-t border-border/60")
        expect(contentImageCardSource).not.toContain("rounded-full bg-primary text-primary-foreground")
    })

    it('normaliza estilo con botones de altura M en una rejilla 2x2 y mantiene una x consistente en la preview activa', () => {
        expect(styleImageCardSource).toContain("const STYLE_ACTION_BUTTON_CLASS = 'min-h-[42px] h-auto justify-center rounded-[1rem] px-4 py-2 text-center text-[clamp(0.93rem,0.89rem+0.12vw,1rem)] font-medium leading-tight whitespace-normal'")
        expect(styleImageCardSource).toContain("const STYLE_MODAL_CLASS = 'h-[min(88vh,860px)] w-[min(92vw,1120px)] !max-w-[min(92vw,1120px)] overflow-hidden rounded-[1.9rem] border border-border/70 bg-background/98 p-0")
        expect(styleImageCardSource).toContain("grid grid-cols-2 gap-2 min-w-0")
        expect(styleImageCardSource).toContain("const clearCurrentStyle = useCallback(() => {")
        expect(styleImageCardSource).toContain("className={cn(STYLE_ACTION_BUTTON_CLASS, 'gap-2 min-w-0')}")
        expect(styleImageCardSource).toContain("className={cn(STYLE_ACTION_BUTTON_CLASS, 'min-w-0', !currentStyleId && !selectedStylePresetId && 'opacity-45')}")
        expect(styleImageCardSource).toContain("disabled={!currentStyleId && !selectedStylePresetId}")
        expect(styleImageCardSource).toContain("{tt('styleImage.clear', 'Clear')}")
        expect(styleImageCardSource).toContain("DialogContent className={STYLE_MODAL_CLASS}")
        expect(styleImageCardSource).toContain("import { motion } from 'framer-motion'")
        expect(styleImageCardSource).toContain("initial={{ opacity: 0, y: 18, scale: 0.972 }}")
        expect(styleImageCardSource).toContain("animate={{ opacity: 1, y: 0, scale: 1 }}")
        expect(styleImageCardSource).toContain("transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}")
        expect(styleImageCardSource).toContain("transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}")
        expect(styleImageCardSource).toContain("DialogTitle className=\"text-[clamp(1.16rem,1.08rem+0.18vw,1.28rem)] font-semibold tracking-[-0.01em]\"")
        expect(styleImageCardSource).toContain("DialogDescription className=\"text-[1rem] leading-relaxed text-muted-foreground\"")
        expect(styleImageCardSource).toContain("className={STYLE_ACTION_BUTTON_CLASS}")
        expect(styleImageCardSource).toContain("rounded-[1.15rem] overflow-hidden border")
        expect(styleImageCardSource).toContain("text-[0.92rem] text-muted-foreground")
        expect(styleImageCardSource).toContain("absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white")
        expect(styleImageCardSource).toContain("aria-label={tt('styleImage.removeAria', 'Remove style image')}")
        expect(styleImageCardSource).toContain("IconClose className=\"h-3.5 w-3.5\"")
        expect(styleImageCardSource).toContain("IconCheck className=\"absolute right-2.5 top-2.5 h-7 w-7 text-white")
        expect(styleImageCardSource).not.toContain("border-t border-border")
        expect(styleImageCardSource).not.toContain("rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center")
        expect(styleImageCardSource).not.toContain("absolute inset-0 bg-primary/30 flex items-center justify-center")
    })

    it('lleva logos auxiliares al mismo lenguaje visual que contenido del usuario cuando se expande', () => {
        expect(auxiliaryLogosCardSource).toContain("const AUX_ACTION_BUTTON_CLASS = 'min-h-[42px] h-auto justify-center rounded-[1rem] px-4 py-2 text-center text-[clamp(0.93rem,0.89rem+0.12vw,1rem)] font-medium leading-tight whitespace-normal'")
        expect(auxiliaryLogosCardSource).toContain("const AUX_MODAL_CLASS = 'h-[min(88vh,860px)] w-[min(92vw,1120px)] !max-w-[min(92vw,1120px)] overflow-hidden rounded-[1.9rem] border border-border/70 bg-background/98 p-0")
        expect(auxiliaryLogosCardSource).toContain("const AUX_REMOVE_BUTTON_CLASS = 'absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-black/70'")
        expect(auxiliaryLogosCardSource).toContain("grid grid-cols-2 gap-2")
        expect(auxiliaryLogosCardSource).toContain("className={cn(AUX_ACTION_BUTTON_CLASS, 'gap-2')}")
        expect(auxiliaryLogosCardSource).toContain("grid grid-cols-3 gap-2.5")
        expect(auxiliaryLogosCardSource).toContain("rounded-[1.15rem] border border-border/65 bg-background shadow-[0_18px_38px_-30px_rgba(15,23,42,0.28)]")
        expect(auxiliaryLogosCardSource).toContain("rounded-[1.4rem] border border-dashed border-border/80 bg-background/72")
        expect(auxiliaryLogosCardSource).toContain("IconCheckCircle className=\"absolute right-2.5 top-2.5 h-9 w-9 text-white")
        expect(auxiliaryLogosCardSource).toContain("DialogContent className={AUX_MODAL_CLASS}")
        expect(auxiliaryLogosCardSource).toContain("initial={{ opacity: 0, y: 18, scale: 0.972 }}")
        expect(auxiliaryLogosCardSource).toContain("transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}")
        expect(auxiliaryLogosCardSource).toContain("initial={{ opacity: 0, y: 10, scale: 0.985 }}")
        expect(auxiliaryLogosCardSource).not.toContain("border-t border-border")
        expect(auxiliaryLogosCardSource).not.toContain("rounded-full bg-primary text-primary-foreground")
    })

    it('restyla kit de marca con grupos suaves y seleccion visual mas cuidada', () => {
        expect(controlsPanelSource).toContain('const BRAND_KIT_GROUP_CLASS = "space-y-3"')
        expect(controlsPanelSource).toContain('const BRAND_KIT_CONTACT_ROW_CLASS = "space-y-2 border-b border-border/40 py-2.5 last:border-b-0"')
        expect(controlsPanelSource).toContain('const BRAND_KIT_SUBTLE_BUTTON_CLASS = "h-9 rounded-xl border border-border/65 bg-background/82 px-3 text-[0.9rem] font-medium')
        expect(controlsPanelSource).toContain('className={BRAND_KIT_GROUP_CLASS}')
        expect(controlsPanelSource).toContain('className={cn(BRAND_KIT_SUBTLE_BUTTON_CLASS, "gap-1.5")}')
        expect(controlsPanelSource).toContain('const handleReloadBrandColors = async () => {')
        expect(controlsPanelSource).toContain('await refreshActiveBrandKitContent()')
        expect(controlsPanelSource).toContain('setIsRefreshingBrandColors(true)')
        expect(controlsPanelSource).toContain('disabled={isRefreshingBrandColors}')
        expect(controlsPanelSource).toContain("isRefreshingBrandColors ? t('ui.reloading', { defaultValue: 'Recargando...' }) : t('ui.reload')")
        expect(controlsPanelSource).toContain('className="h-11 rounded-2xl border border-input/80 bg-background/90 text-[0.95rem]"')
        expect(controlsPanelSource).toContain('className={BRAND_KIT_CONTACT_ROW_CLASS}')
        expect(controlsPanelSource).toContain('text-[0.95rem] text-foreground/82')
        expect(controlsPanelSource).not.toContain('rounded-[1.35rem] border border-border/65 bg-background/72 p-4')
        expect(controlsPanelSource).not.toContain('rounded-[1.15rem] border border-border/60 bg-background/82 px-3.5 py-3')
        expect(brandingConfiguratorSource).toContain('const logoOptionClassName =')
        expect(brandingConfiguratorSource).toContain('h-[62px] w-[62px] items-center justify-center overflow-hidden rounded-[1rem]')
        expect(brandingConfiguratorSource).toContain("t('brandingConfigurator.noLogo', { defaultValue: 'Sin logo' })")
        expect(brandingConfiguratorSource).toContain('border-primary/36 bg-primary/[0.07] shadow-[0_18px_38px_-28px_rgba(120,142,84,0.42)]')
        expect(brandingConfiguratorSource).toContain('grid grid-cols-5 gap-3')
        expect(brandingConfiguratorSource).toContain('rounded-[1rem] border transition-all shadow-[0_18px_34px_-28px_rgba(15,23,42,0.28)]')
        expect(brandingConfiguratorSource).not.toContain('bg-white$1')
        expect(brandingConfiguratorSource).not.toContain('border-white/30$1hover:border-primary/50 hover:scale-105')
        expect(brandingConfiguratorSource).not.toContain('logoCheckClassName')
    })
})
