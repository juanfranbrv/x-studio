import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const routeSource = fs.readFileSync(
    path.resolve(__dirname, '../route.ts'),
    'utf8'
)

describe('replace generate route contract', () => {
    it('carga el prompt configurable desde system_prompts', () => {
        expect(routeSource).toContain('api.systemPrompts.getByKey')
        expect(routeSource).toContain('REPLACE_IMAGE_PROMPT_KEY')
    })

    it('si falta el prompt lo crea en system_prompts para que aparezca en admin', () => {
        expect(routeSource).toContain('api.systemPrompts.upsert')
        expect(routeSource).toContain('system/replace-bootstrap')
        expect(routeSource).toContain("log.warn('REPLACE', 'System prompt missing in admin, created default replace prompt in system_prompts')")
    })

    it('reutiliza el modelo de imagen configurado en admin', () => {
        expect(routeSource).toContain('api.settings.getAIConfig')
        expect(routeSource).toContain('model: aiConfig?.imageModel')
    })

    it('envía tanto la imagen del producto como la plantilla al generador', () => {
        expect(routeSource).toContain("type: 'image'")
        expect(routeSource).toContain('layoutReference: templateImageUrl')
    })
})
