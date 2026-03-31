import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const carouselCanvasPanelSource = fs.readFileSync(
    path.resolve(__dirname, '../CarouselCanvasPanel.tsx'),
    'utf8'
)

describe('carousel server-side video export', () => {
    it('uses the export-video api route instead of relying only on MediaRecorder codecs', () => {
        expect(carouselCanvasPanelSource).toContain('/api/carousel/export-video')
    })
})
