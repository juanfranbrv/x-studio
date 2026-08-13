import { describe, expect, it } from 'vitest'
import {
    CONTEXT_DOCUMENT_MAX_CHARACTERS,
    CONTEXT_DOCUMENT_MAX_FILE_BYTES,
    CONTEXT_DOCUMENT_MAX_PER_BRAND,
    CONTEXT_DOCUMENT_MAX_SOURCE_FILENAME_CHARACTERS,
    CONTEXT_DOCUMENT_MAX_TITLE_CHARACTERS,
    countContextCharacters,
    isSupportedContextFile,
    readContextTextFile,
    validateContextDocument,
} from '../context-documents'

describe('documentos de contexto', () => {
    describe('constantes del dominio', () => {
        it('expone los límites compartidos', () => {
            expect(CONTEXT_DOCUMENT_MAX_CHARACTERS).toBe(12_000)
            expect(CONTEXT_DOCUMENT_MAX_TITLE_CHARACTERS).toBe(100)
            expect(CONTEXT_DOCUMENT_MAX_SOURCE_FILENAME_CHARACTERS).toBe(255)
            expect(CONTEXT_DOCUMENT_MAX_FILE_BYTES).toBe(65_536)
            expect(CONTEXT_DOCUMENT_MAX_PER_BRAND).toBe(20)
        })
    })

    describe('countContextCharacters', () => {
        it('cuenta exactamente textos de 8.553, 12.000 y 12.001 puntos de código', () => {
            expect(countContextCharacters('a'.repeat(8_553))).toBe(8_553)
            expect(countContextCharacters('a'.repeat(12_000))).toBe(12_000)
            expect(countContextCharacters('a'.repeat(12_001))).toBe(12_001)
        })

        it('cuenta cada emoji astral como un único punto de código', () => {
            expect('😀'.length).toBe(2)
            expect(countContextCharacters('A😀B🚀')).toBe(4)
        })
    })

    describe('validateContextDocument', () => {
        it('acepta exactamente 12.000 caracteres de contenido', () => {
            expect(validateContextDocument({ title: 'A', content: 'a'.repeat(12_000) })).toEqual({ ok: true })
        })

        it('rechaza 12.001 caracteres de contenido', () => {
            expect(validateContextDocument({ title: 'A', content: 'a'.repeat(12_001) })).toEqual({
                ok: false,
                error: 'content_too_long',
            })
        })

        it('rechaza contenido vacío tras aplicar trim solo para validarlo', () => {
            expect(validateContextDocument({ title: 'A', content: '   \n\t' })).toEqual({
                ok: false,
                error: 'content_required',
            })
        })

        it('rechaza un título vacío tras aplicar trim', () => {
            expect(validateContextDocument({ title: '   ', content: 'Contenido' })).toEqual({
                ok: false,
                error: 'title_required',
            })
        })

        it('acepta un título de 100 caracteres y rechaza uno de 101', () => {
            expect(validateContextDocument({ title: 't'.repeat(100), content: 'Contenido' })).toEqual({ ok: true })
            expect(validateContextDocument({ title: 't'.repeat(101), content: 'Contenido' })).toEqual({
                ok: false,
                error: 'title_too_long',
            })
        })

        it('acepta un nombre de origen de 255 caracteres y rechaza uno de 256', () => {
            expect(
                validateContextDocument({
                    title: 'Título',
                    content: 'Contenido',
                    sourceFilename: 'f'.repeat(255),
                }),
            ).toEqual({ ok: true })
            expect(
                validateContextDocument({
                    title: 'Título',
                    content: 'Contenido',
                    sourceFilename: 'f'.repeat(256),
                }),
            ).toEqual({ ok: false, error: 'source_filename_too_long' })
        })
    })

    describe('isSupportedContextFile', () => {
        it('acepta Markdown y texto sin distinguir mayúsculas', () => {
            expect(isSupportedContextFile('documento.md')).toBe(true)
            expect(isSupportedContextFile('DOCUMENTO.MD')).toBe(true)
            expect(isSupportedContextFile('notas.TxT')).toBe(true)
        })

        it('rechaza PDF y nombres sin una extensión admitida', () => {
            expect(isSupportedContextFile('documento.pdf')).toBe(false)
            expect(isSupportedContextFile('documento')).toBe(false)
        })
    })

    describe('readContextTextFile', () => {
        it('deriva el título, elimina solo el BOM inicial y preserva el cuerpo', async () => {
            const file = new File(['\uFEFF  Primera línea\n\uFEFFSegunda línea  '], 'contexto.final.MD', {
                type: 'text/markdown',
            })

            await expect(readContextTextFile(file)).resolves.toEqual({
                title: 'contexto.final',
                content: '  Primera línea\n\uFEFFSegunda línea  ',
                sourceFilename: 'contexto.final.MD',
            })
        })

        it('rechaza extensiones no admitidas', async () => {
            const file = new File(['contenido'], 'contexto.pdf', { type: 'application/pdf' })

            await expect(readContextTextFile(file)).rejects.toThrowError(new Error('unsupported_context_file'))
        })

        it('rechaza archivos mayores de 64 KiB antes de decodificarlos', async () => {
            const file = new File([new Uint8Array(65_537)], 'contexto.txt', { type: 'text/plain' })

            expect(file.size).toBe(CONTEXT_DOCUMENT_MAX_FILE_BYTES + 1)
            await expect(readContextTextFile(file)).rejects.toThrowError(new Error('context_file_too_large'))
        })

        it('rechaza bytes que no forman UTF-8 válido', async () => {
            const file = new File([new Uint8Array([0xc3, 0x28])], 'contexto.txt', { type: 'text/plain' })

            await expect(readContextTextFile(file)).rejects.toThrow()
        })
    })
})
