import { describe, expect, it } from 'vitest'

import {
    DEFAULT_REPLACE_SYSTEM_PROMPT,
    DEFAULT_REPLACE_IMAGE_PROMPT_TEMPLATE,
    REPLACE_IMAGE_PROMPT_DESCRIPTION,
    REPLACE_IMAGE_PROMPT_KEY,
    REPLACE_IMAGE_PROMPT_NAME,
    buildReplaceGenerationPrompt,
    canGenerateReplaceImage,
} from '../replace-generation'

describe('replace generation helpers', () => {
    it('expone una clave estable para el prompt editable de replace', () => {
        expect(REPLACE_IMAGE_PROMPT_KEY).toBe('generate_replace_image')
    })

    it('mantiene un fallback interno del prompt base de replace', () => {
        expect(DEFAULT_REPLACE_IMAGE_PROMPT_TEMPLATE).toContain('Replace the hero product with the product from my uploaded image')
        expect(DEFAULT_REPLACE_IMAGE_PROMPT_TEMPLATE).toContain('{{user_refinement}}')
    })

    it('expone la definicion completa reutilizable del prompt de replace', () => {
        expect(DEFAULT_REPLACE_SYSTEM_PROMPT.key).toBe(REPLACE_IMAGE_PROMPT_KEY)
        expect(DEFAULT_REPLACE_SYSTEM_PROMPT.name).toBe(REPLACE_IMAGE_PROMPT_NAME)
        expect(DEFAULT_REPLACE_SYSTEM_PROMPT.description).toBe(REPLACE_IMAGE_PROMPT_DESCRIPTION)
        expect(DEFAULT_REPLACE_SYSTEM_PROMPT.body).toBe(DEFAULT_REPLACE_IMAGE_PROMPT_TEMPLATE)
    })

    it('inyecta el refinamiento opcional del usuario sin romper el prompt base', () => {
        const template = [
            'Brand: {{brand_name}}',
            'Refinement: {{user_refinement}}',
        ].join('\n')

        expect(
            buildReplaceGenerationPrompt(template, {
                brandName: 'Post Laboratory',
                userRefinement: 'Hazlo más premium y con sombras suaves.',
            })
        ).toContain('Refinement: Hazlo más premium y con sombras suaves.')
    })

    it('usa un fallback neutro cuando el refinamiento del usuario está vacío', () => {
        const template = 'Refinement: {{user_refinement}}'

        expect(
            buildReplaceGenerationPrompt(template, {
                userRefinement: '   ',
            })
        ).toContain('Refinement: No additional user refinement.')
    })

    it('solo habilita la generación cuando hay producto y plantilla', () => {
        expect(
            canGenerateReplaceImage({
                selectedProductImageUrl: 'https://cdn.test/product.png',
                selectedTemplateId: 'template-1',
            })
        ).toBe(true)

        expect(
            canGenerateReplaceImage({
                selectedProductImageUrl: null,
                selectedTemplateId: 'template-1',
            })
        ).toBe(false)

        expect(
            canGenerateReplaceImage({
                selectedProductImageUrl: 'https://cdn.test/product.png',
                selectedTemplateId: null,
            })
        ).toBe(false)
    })
})
