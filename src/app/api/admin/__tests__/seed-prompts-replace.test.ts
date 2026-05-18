import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const seedSource = fs.readFileSync(
    path.resolve(__dirname, '../seed-prompts/route.ts'),
    'utf8'
)

describe('replace seed prompt', () => {
    it('incluye un prompt editable para replace en el seed de admin', () => {
        expect(seedSource).toContain('DEFAULT_REPLACE_SYSTEM_PROMPT')
    })
})
