import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const libraryPageSource = fs.readFileSync(
    path.resolve(__dirname, '../page.tsx'),
    'utf8'
)

describe('Library grid publication count', () => {
    it('muestra el contador de publicaciones de la rejilla desde los activos filtrados', () => {
        expect(libraryPageSource).toContain('const hasActiveLibraryFilters = Boolean(')
        expect(libraryPageSource).toContain('const gridPublicationCountLabel = hasActiveLibraryFilters')
        expect(libraryPageSource).toContain('filteredAssets.length === 1 ?')
        expect(libraryPageSource).toContain('{view === \'grid\' && (')
        expect(libraryPageSource).toContain('{gridPublicationCountLabel}')
    })
})
