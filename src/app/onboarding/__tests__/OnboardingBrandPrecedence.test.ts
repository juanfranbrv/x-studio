import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const onboardingSource = fs.readFileSync(
    path.resolve(__dirname, '../page.tsx'),
    'utf8'
)

describe('Onboarding brand precedence', () => {
    it('usa la ultima sesion solo para decidir el modulo, no para sustituir el brand activo', () => {
        // El ternario actual contempla tambien 'brand-kit'; lo relevante es que la ultima
        // sesion solo decide la ruta de destino.
        expect(onboardingSource).toContain("const targetPath = lastVisitedModule.module === 'brand-kit'")
        expect(onboardingSource).toContain('completeRedirect(targetPath)')
        expect(onboardingSource).not.toContain("const targetBrandId = typeof lastVisitedModule.brand_id === 'string' ? lastVisitedModule.brand_id : null")
        expect(onboardingSource).not.toContain('setActiveBrandKit(targetBrandId, true, true)')
    })
})
