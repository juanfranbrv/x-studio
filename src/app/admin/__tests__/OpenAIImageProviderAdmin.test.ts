import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const adminPageSource = fs.readFileSync(
    path.resolve(__dirname, '../page.tsx'),
    'utf8'
)

const convexAdminSource = fs.readFileSync(
    path.resolve(__dirname, '../../../../convex/admin.ts'),
    'utf8'
)

describe('OpenAI image provider admin wiring', () => {
    it('expone GPT Image 2 como modelos low y medium, coste economico y API key configurable', () => {
        expect(adminPageSource).toContain("openai/gpt-image-2-low")
        expect(adminPageSource).toContain("openai/gpt-image-2-medium")
        expect(adminPageSource).toContain("wisdom/gpt-image-2-low")
        expect(adminPageSource).toContain("wisdom/gpt-image-2-medium")
        expect(adminPageSource).toContain('OpenAI · GPT Image 2 · Low')
        expect(adminPageSource).toContain('OpenAI · GPT Image 2 · Medium')
        expect(adminPageSource).toContain("if (value === 'wisdom/gpt-image-2') return 'wisdom/gpt-image-2-low'")
        expect(adminPageSource).toContain("if (value === 'openai/gpt-image-2') return 'openai/gpt-image-2-low'")
        expect(adminPageSource).toContain('sortedImageModelCosts')
        expect(adminPageSource).toContain("renderImageModelSortHead('model', 'Modelo')")
        expect(adminPageSource).toContain("renderImageModelSortHead('cost', 'Coste')")
        expect(adminPageSource).toContain("renderImageModelSortHead('updated', 'Actualizado')")
        expect(adminPageSource).toContain('provider_openai_api_key')
        expect(adminPageSource).toContain('OpenAI API Key')
        expect(adminPageSource).toContain('IMAGE_MODEL_OPTIONS.map((option) => option.value)')
        expect(convexAdminSource).toContain('"provider_openai_api_key"')
    })
})
