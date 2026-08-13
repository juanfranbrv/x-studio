import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

describe('contrato de documentos de contexto en análisis', () => {
    it('Imagen autentica y resuelve el documento antes de detectar idioma o invocar el modelo', () => {
        const source = read('src/app/actions/parse-intent.ts')
        const handler = source.slice(source.indexOf('export async function parseLazyIntentAction'))
        const authIndex = handler.indexOf('await auth()')
        const contextIndex = handler.indexOf('api.contextDocuments.getActiveForBrand')
        const languageIndex = handler.indexOf('detectLanguageWithApi(')
        const modelIndex = handler.indexOf('generateTextUnified(')

        expect(authIndex).toBeGreaterThan(-1)
        expect(contextIndex).toBeGreaterThan(authIndex)
        expect(languageIndex).toBeGreaterThan(contextIndex)
        expect(modelIndex).toBeGreaterThan(contextIndex)
        expect(handler).toContain('brandId: string')
        expect(handler).toContain('expectedBrandId?: string')
        expect(handler).toContain('expectedContextDocumentId?: string | null')
        expect(handler).toContain('organized.usedBrandId = brandId')
        expect(handler).toContain('organized.usedContextDocumentId = usedContextDocumentId')
    })

    it('Carrusel resuelve el documento antes de iniciar cualquier fase de análisis', () => {
        const source = read('src/app/actions/generate-carousel.ts')
        const start = source.indexOf('export async function analyzeCarouselAction')
        const end = source.indexOf('export async function regenerateCarouselCaptionAction')
        const handler = source.slice(start, end)
        const authIndex = handler.indexOf('await auth()')
        const contextIndex = handler.indexOf('api.contextDocuments.getActiveForBrand')
        const decompositionIndex = handler.indexOf('decomposeIntoSlides(')

        expect(authIndex).toBeGreaterThan(-1)
        expect(contextIndex).toBeGreaterThan(authIndex)
        expect(decompositionIndex).toBeGreaterThan(contextIndex)
        expect(handler).toContain('usedBrandId: input.brandId')
        expect(handler).toContain('usedContextDocumentId')
        expect(handler).toContain('contextDocument: activeContextDocument')
    })

    it('el documento no entra en el contrato de generación visual', () => {
        const source = read('src/app/actions/generate-carousel.ts')
        const start = source.indexOf('export interface GenerateCarouselInput')
        const end = source.indexOf('export interface AnalyzeCarouselInput')
        expect(source.slice(start, end)).not.toContain('contextDocument')
    })
})
