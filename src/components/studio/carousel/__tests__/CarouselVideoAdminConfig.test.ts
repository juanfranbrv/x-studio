import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const carouselCanvasPanelSource = fs.readFileSync(
    path.resolve(__dirname, '../CarouselCanvasPanel.tsx'),
    'utf8'
)

const adminPageSource = fs.readFileSync(
    path.resolve(__dirname, '../../../../app/admin/page.tsx'),
    'utf8'
)

describe('carousel video export admin config', () => {
    it('reads slide durations from global settings instead of fixed 4s/6s values', () => {
        expect(carouselCanvasPanelSource).toContain('api.settings.getCarouselVideoConfig')
        expect(carouselCanvasPanelSource).toContain('slideDurationMs')
        expect(carouselCanvasPanelSource).toContain('lastSlideDurationMs')
        expect(carouselCanvasPanelSource).not.toContain("Export video (4s / 6s)")
    })

    it('exposes admin fields for global carousel video durations', () => {
        expect(adminPageSource).toContain('carousel_video_slide_duration_ms')
        expect(adminPageSource).toContain('carousel_video_last_slide_duration_ms')
    })
})

