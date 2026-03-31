import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const carouselPageSource = fs.readFileSync(path.resolve(__dirname, '../page.tsx'), 'utf8')

describe('carousel new session reset', () => {
    it('limpia las alternativas y el analisis previo al resetear el borrador', () => {
        const match = carouselPageSource.match(/const handleResetCarousel = useCallback\(\(\) => \{([\s\S]*?)\n\s*\}, \[\]\)/)

        expect(match?.[1]).toBeTruthy()
        expect(match?.[1]).toContain('setSuggestions([])')
        expect(match?.[1]).toContain('setSlideVariantSelection([])')
        expect(match?.[1]).toContain('setOriginalAnalysis(null)')
    })
})
