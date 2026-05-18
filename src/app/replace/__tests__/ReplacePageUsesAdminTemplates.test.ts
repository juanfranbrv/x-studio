import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const replacePageSource = fs.readFileSync(
    path.resolve(__dirname, '../page.tsx'),
    'utf8'
)

describe('Replace page templates source', () => {
    it('lee las plantillas desde Convex en lugar de mantenerlas hardcodeadas', () => {
        expect(replacePageSource).toContain('api.replaceTemplates.listActive')
        expect(replacePageSource).not.toContain('const REPLACE_TEMPLATES = [')
    })
})
