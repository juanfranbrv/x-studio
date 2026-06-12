import { describe, expect, it } from 'vitest'
import { resolveOpenAICompatibleImageModel } from '../openai-image-model-alias'

describe('OpenAI-compatible image model aliases', () => {
    it('resuelve GPT Image 2 low al modelo real con quality low', () => {
        expect(resolveOpenAICompatibleImageModel('gpt-image-2-low')).toEqual({
            providerModel: 'gpt-image-2',
            quality: 'low',
        })
    })

    it('resuelve GPT Image 2 medium al modelo real con quality medium', () => {
        expect(resolveOpenAICompatibleImageModel('gpt-image-2-medium')).toEqual({
            providerModel: 'gpt-image-2',
            quality: 'medium',
        })
    })

    it('mantiene el id legacy como low por defecto', () => {
        expect(resolveOpenAICompatibleImageModel('gpt-image-2')).toEqual({
            providerModel: 'gpt-image-2',
            quality: 'low',
        })
    })
})
