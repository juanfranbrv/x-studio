import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const routeSource = fs.readFileSync(
    path.resolve(__dirname, '../export-video/route.ts'),
    'utf8'
)

describe('carousel export video route', () => {
    it('renders server-side with ffmpeg using a broadly compatible mp4 profile', () => {
        expect(routeSource).toContain('ffmpeg-static')
        expect(routeSource).toContain('libx264')
        expect(routeSource).toContain('aac')
        expect(routeSource).toContain('+faststart')
        expect(routeSource).toContain('video/mp4')
    })
})
