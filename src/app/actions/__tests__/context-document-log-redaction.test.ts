import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('redacción de logs del análisis contextual', () => {
    it('no registra fragmentos de respuesta ni prompts completos en Imagen', () => {
        const source = readFileSync('src/app/actions/parse-intent.ts', 'utf8')
        expect(source).not.toMatch(/jsonResponse\.(substring|slice)\(/)
        expect(source).toContain("log.debug('LazyPrompt', 'Respuesta recibida', { responseLength: jsonResponse.length })")
        expect(source).not.toMatch(/log\.(?:debug|info|warn|error)\([^\n]*(?:promptWithVariation|activeContextDocument\.content)/)
    })

    it('los errores públicos de análisis son constantes', () => {
        const image = readFileSync('src/app/actions/parse-intent.ts', 'utf8')
        const carousel = readFileSync('src/app/actions/generate-carousel.ts', 'utf8')
        const analyzeStart = carousel.indexOf('export async function analyzeCarouselAction')
        const analyzeEnd = carousel.indexOf('export async function regenerateCarouselCaptionAction')
        const analyzeHandler = carousel.slice(analyzeStart, analyzeEnd)

        expect(image).toContain("throw new Error('No se pudo analizar la publicación.')")
        expect(analyzeHandler).toContain("error: 'No se pudo analizar el carrusel.'")
        expect(analyzeHandler).not.toContain('motivo: error instanceof Error ? error.message')
    })
})
