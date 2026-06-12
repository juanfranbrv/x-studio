import { describe, expect, it } from 'vitest'
import { extractOpenAIImageResult, summarizeOpenAIImageResponseShape } from '../openai-image-response'

const sampleBase64 = 'a'.repeat(260)

describe('extractOpenAIImageResult', () => {
    it('extrae b64_json de la respuesta Image API estandar', () => {
        const result = extractOpenAIImageResult({
            data: [{ b64_json: sampleBase64 }],
        })

        expect(result?.value).toBe(`data:image/png;base64,${sampleBase64}`)
        expect(result?.source).toContain('b64_json')
    })

    it('extrae url de la respuesta Image API estandar', () => {
        const result = extractOpenAIImageResult({
            data: [{ url: 'https://cdn.example.com/image.png' }],
        })

        expect(result?.value).toBe('https://cdn.example.com/image.png')
        expect(result?.source).toContain('url')
    })

    it('extrae result de una respuesta tipo Responses API', () => {
        const result = extractOpenAIImageResult({
            output: [{ type: 'image_generation_call', result: sampleBase64 }],
        })

        expect(result?.value).toBe(`data:image/png;base64,${sampleBase64}`)
        expect(result?.source).toContain('result')
    })

    it('extrae image_url desde arrays de imagenes', () => {
        const result = extractOpenAIImageResult({
            images: [{ image_url: 'https://cdn.example.com/edited.png' }],
        })

        expect(result?.value).toBe('https://cdn.example.com/edited.png')
        expect(result?.source).toContain('image_url')
    })

    it('extrae payloads anidados bajo image_url.url', () => {
        const result = extractOpenAIImageResult({
            data: [{ image_url: { url: 'https://cdn.example.com/nested.png' } }],
        })

        expect(result?.value).toBe('https://cdn.example.com/nested.png')
        expect(result?.source).toContain('image_url')
    })

    it('extrae alias de base64 usados por proxies', () => {
        const result = extractOpenAIImageResult({
            data: [{ image_base64: sampleBase64 }],
        })

        expect(result?.value).toBe(`data:image/png;base64,${sampleBase64}`)
        expect(result?.source).toContain('image_base64')
    })

    it('no expone base64 completo al resumir la forma', () => {
        const summary = summarizeOpenAIImageResponseShape({
            data: [{ b64_json: sampleBase64 }],
        }) as Record<string, unknown>

        expect(JSON.stringify(summary)).toContain('[string:260]')
        expect(JSON.stringify(summary)).not.toContain(sampleBase64)
    })
})
