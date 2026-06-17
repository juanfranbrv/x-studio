import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const brandKitPageSource = fs.readFileSync(
    path.resolve(__dirname, '../page.tsx'),
    'utf8'
)

describe('Brand Kit next recovery', () => {
    it('rehidrata kits reales y selecciona uno antes de volver al modulo solicitado', () => {
        expect(brandKitPageSource).toContain("const nextParam = searchParams.get('next')")
        expect(brandKitPageSource).toContain('setEmptyStateRepairing(true)')
        expect(brandKitPageSource).toContain('await reloadBrandKits(true)')
        expect(brandKitPageSource).toContain('await setActiveBrandKit(serverKits.data[0].id, true, true)')
        expect(brandKitPageSource).toContain('router.replace(nextParam)')
    })

    it('no deja estados vacios sin UI durante la recuperacion inicial', () => {
        expect(brandKitPageSource).toContain('const shouldShowRecoveryState')
        expect(brandKitPageSource).toContain('const shouldShowSelectionState')
        expect(brandKitPageSource).toContain('const shouldShowRepairErrorState')
        expect(brandKitPageSource).toContain('const shouldShowVerifiedEmptyState')
        expect(brandKitPageSource).toContain('{(shouldShowRecoveryState || shouldShowSelectionState) && (')
    })
})
