import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const carouselPageSource = fs.readFileSync(path.resolve(__dirname, '../page.tsx'), 'utf8')
const controlsPanelSource = fs.readFileSync(
    path.resolve(__dirname, '../../../components/studio/carousel/CarouselControlsPanel.tsx'),
    'utf8'
)

describe('carousel generation uses latest controls settings', () => {
    it('registers a settings resolver from the controls panel', () => {
        expect(controlsPanelSource).toContain('registerSettingsResolver?: (resolver: ((overrides?: Partial<CarouselSettings>) => CarouselSettings) | null) => void')
        expect(controlsPanelSource).toContain('registerSettingsResolver?.(buildSettings)')
    })

    it('reads the latest settings snapshot before generating from the shared bar', () => {
        expect(carouselPageSource).toContain('const latestCarouselSettingsResolverRef = useRef<(((overrides?: Partial<CarouselSettings>) => CarouselSettings) | null)>(null)')
        expect(carouselPageSource).toContain('const latestSettings = latestCarouselSettingsResolverRef.current?.()')
        expect(carouselPageSource).not.toContain('void handleGenerate(carouselSettings)')
    })
})
