import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const adminPageSource = fs.readFileSync(
    path.resolve(__dirname, '../page.tsx'),
    'utf8'
)

describe('Replace module admin setting', () => {
    it('expone un switch dedicado en el panel de administracion', () => {
        expect(adminPageSource).toContain('REPLACE_MODULE_ENABLED_SETTING_KEY')
        expect(adminPageSource).toContain('Visibilidad del módulo Replace')
        expect(adminPageSource).toContain('Mostrar módulo Replace en la navegación del estudio')
        expect(adminPageSource).toContain("onCheckedChange={(checked) => void handleSaveSetting(REPLACE_MODULE_ENABLED_SETTING_KEY, checked)}")
    })
})
