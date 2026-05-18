import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolvePreviewLayoutMode } from '../previewLayoutMode'

const imagePageSource = fs.readFileSync(
    path.resolve(__dirname, '../../../app/image/page.tsx'),
    'utf8'
)

const carouselPageSource = fs.readFileSync(
    path.resolve(__dirname, '../../../app/carousel/page.tsx'),
    'utf8'
)

const canvasPanelSource = fs.readFileSync(
    path.resolve(__dirname, '../CanvasPanel.tsx'),
    'utf8'
)

const carouselCanvasPanelSource = fs.readFileSync(
    path.resolve(__dirname, '../carousel/CarouselCanvasPanel.tsx'),
    'utf8'
)

describe('Preview layout mode', () => {
    it('activa el layout scroll compacto por debajo de 935px de altura util en desktop', () => {
        expect(resolvePreviewLayoutMode({
            isMobile: false,
            viewportHeight: 934,
        })).toBe('compact-scroll')
    })

    it('mantiene el layout actual desde 935px de altura util y en mobile', () => {
        expect(resolvePreviewLayoutMode({
            isMobile: false,
            viewportHeight: 935,
        })).toBe('default')

        expect(resolvePreviewLayoutMode({
            isMobile: true,
            viewportHeight: 760,
        })).toBe('default')
    })

    it('cablea el modo de layout entre ImagePage y CanvasPanel', () => {
        expect(imagePageSource).toContain('const previewLayoutMode = resolvePreviewLayoutMode(')
        expect(imagePageSource).toContain("previewLayoutMode === 'compact-scroll'")
        expect(imagePageSource).toContain('previewLayoutMode={previewLayoutMode}')
        expect(canvasPanelSource).toContain("previewLayoutMode?: PreviewLayoutMode")
        expect(canvasPanelSource).toContain("previewLayoutMode = 'default'")
        expect(canvasPanelSource).toContain("if (previewLayoutMode === 'compact-scroll')")
    })

    it('apaga el overlay de revelado si la generacion termina sin imagen', () => {
        expect(canvasPanelSource).toContain('} else if (!currentImage) {')
        expect(canvasPanelSource).toContain('setIsRevealing(false)')
        expect(canvasPanelSource).toContain('setWasJustGenerated(false)')
    })

    it('cablea el mismo modo de layout entre CarouselPage y CarouselCanvasPanel', () => {
        expect(carouselPageSource).toContain('const previewLayoutMode = resolvePreviewLayoutMode(')
        expect(carouselPageSource).toContain("previewLayoutMode === 'compact-scroll'")
        expect(carouselPageSource).toContain('previewLayoutMode={previewLayoutMode}')
        expect(carouselCanvasPanelSource).toContain("previewLayoutMode?: PreviewLayoutMode")
        expect(carouselCanvasPanelSource).toContain("previewLayoutMode = 'default'")
        expect(carouselCanvasPanelSource).toContain("if (previewLayoutMode === 'compact-scroll')")
        expect(carouselCanvasPanelSource).toContain("previewLayoutMode === 'compact-scroll'")
    })
})
