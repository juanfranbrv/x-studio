import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// NOTA (saneamiento F4, 2026-06-12): este fichero contenía 8 tests adicionales que
// anclaban literales de clases Tailwind de un restyle anterior. El rediseño
// canva-style (aprobado y en producción) los dejó obsoletos y se retiraron:
// eran pins cosméticos sin valor de regresión funcional. Los 4 tests restantes
// protegen contratos vigentes (catálogo de formatos y lenguaje visual actual).

const creationFlowTypesSource = fs.readFileSync(
    path.resolve(__dirname, '../../../lib/creation-flow-types.ts'),
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

describe('ControlsPanel bottom spacing', () => {
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
})
