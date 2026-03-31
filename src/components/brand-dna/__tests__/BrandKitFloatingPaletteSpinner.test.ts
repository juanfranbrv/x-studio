import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const floatingPaletteSource = fs.readFileSync(
    path.resolve(__dirname, '../BrandKitFloatingPalette.tsx'),
    'utf8'
)

describe('BrandKit floating palette spinner', () => {
    it('no fuerza animate-spin en el spinner de exportar', () => {
        expect(floatingPaletteSource).not.toContain("<Loader2 className={cn(TOOL_ICON_CLASS, 'animate-spin')} />")
    })
})
