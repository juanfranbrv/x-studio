import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const imagePageSource = fs.readFileSync(
    path.resolve(__dirname, '../page.tsx'),
    'utf8'
)

describe('Image admin generate fallback', () => {
    it('genera directamente cuando los overlays de debug están ocultos', () => {
        expect(imagePageSource).toContain('if (!isAdmin || !showStudioDebugOverlays) {')
        expect(imagePageSource).toContain('await handleGenerate(data)')
        expect(imagePageSource).toContain('open={showStudioDebugOverlays && showDebugModal}')
    })
})
