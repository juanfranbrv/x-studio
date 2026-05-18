import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const adminPageSource = fs.readFileSync(
    path.resolve(__dirname, '../page.tsx'),
    'utf8'
)

describe('Replace prompt admin visibility', () => {
    it('asegura el prompt de Replace dentro de la pestaña de prompts de admin', () => {
        expect(adminPageSource).toContain('DEFAULT_REPLACE_SYSTEM_PROMPT')
        expect(adminPageSource).toContain('hasEnsuredReplacePromptRef')
        expect(adminPageSource).toContain('const hasReplacePrompt = systemPrompts.some((prompt) => prompt.key === DEFAULT_REPLACE_SYSTEM_PROMPT.key)')
        expect(adminPageSource).toContain('void upsertSystemPrompt({')
    })
})
