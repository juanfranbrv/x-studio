import { describe, expect, it } from 'vitest'
import { getOpenAIImageSizeForAspectRatio } from '../openai-image-size'

describe('OpenAI image size mapping', () => {
    it('preserva orientaciones comunes en tamanos validos para GPT Image 2', () => {
        expect(getOpenAIImageSizeForAspectRatio('1:1')).toBe('1024x1024')
        expect(getOpenAIImageSizeForAspectRatio('4:5')).toBe('1024x1280')
        expect(getOpenAIImageSizeForAspectRatio('3:4')).toBe('1024x1360')
        expect(getOpenAIImageSizeForAspectRatio('9:16')).toBe('1024x1792')
        expect(getOpenAIImageSizeForAspectRatio('16:9')).toBe('1792x1024')
        expect(getOpenAIImageSizeForAspectRatio('1.91:1')).toBe('1952x1024')
        expect(getOpenAIImageSizeForAspectRatio('4:1')).toBe('3072x768')
    })
})
