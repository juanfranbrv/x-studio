import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const adminPageSource = fs.readFileSync(
    path.resolve(__dirname, '../page.tsx'),
    'utf8'
)

describe('Replace templates admin access', () => {
    it('expone un acceso visible desde admin a la gestión de plantillas de Replace', () => {
        expect(adminPageSource).toContain('/admin/replace-templates')
        expect(adminPageSource).toContain('Plantillas Replace')
    })
})
