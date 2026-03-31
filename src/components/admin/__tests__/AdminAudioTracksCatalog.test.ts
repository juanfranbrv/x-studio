import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const schemaSource = fs.readFileSync(
    path.resolve(__dirname, '../../../../convex/schema.ts'),
    'utf8'
)

const canvasPanelSource = fs.readFileSync(
    path.resolve(__dirname, '../../studio/carousel/CarouselCanvasPanel.tsx'),
    'utf8'
)

const adminAudioCardSource = fs.readFileSync(
    path.resolve(__dirname, '../AdminAudioTracksCard.tsx'),
    'utf8'
)

describe('admin audio tracks catalog', () => {
    it('adds a dedicated table for admin-managed audio tracks', () => {
        expect(schemaSource).toContain('admin_audio_tracks')
    })

    it('loads active tracks from Convex instead of the experimental songs endpoint', () => {
        expect(canvasPanelSource).toContain('api.adminAudio.listActiveTracks')
        expect(canvasPanelSource).not.toContain("/api/experimental-songs")
    })

    it('still shows legacy local songs in the admin card during migration', () => {
        expect(adminAudioCardSource).toContain("/api/experimental-songs")
    })
})
