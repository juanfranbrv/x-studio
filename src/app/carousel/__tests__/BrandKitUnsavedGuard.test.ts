import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const carouselPageSource = fs.readFileSync(path.resolve(__dirname, '../page.tsx'), 'utf8')
const controlsPanelSource = fs.readFileSync(
    path.resolve(__dirname, '../../../components/studio/carousel/CarouselControlsPanel.tsx'),
    'utf8'
)

describe('Carousel brand kit unsaved guard', () => {
    it('no conecta el header directamente a setActiveBrandKit cuando hay cambios sin guardar', () => {
        expect(carouselPageSource).toContain('const handleBrandChange = useCallback(async (brandId: string) => {')
        expect(carouselPageSource).toContain('onBrandChange={handleBrandChange}')
        expect(carouselPageSource).not.toContain('onBrandChange={setActiveBrandKit}')
    })

    it('expone un guard desde el panel para reutilizar el modal de cambios sin guardar', () => {
        expect(controlsPanelSource).toContain('registerUnsavedBrandChangeGuard')
        expect(controlsPanelSource).toContain("confirmDiscardUnsavedChanges(t('ui.switchBrandAction'")
    })
})
