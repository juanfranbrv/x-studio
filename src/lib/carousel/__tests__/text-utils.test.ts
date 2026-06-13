import { describe, it, expect } from 'vitest'
import {
    normalizeSemanticText,
    dedupeMeaningfulLines,
    stripBulletMarker,
    normalizeEditorialLine,
    descriptionHasBulletStructure,
    extractPromptDetailBlocks,
    extractEditorialBulletCandidates,
    appendNarrativeDetail,
    extractBalancedJsonObject,
    sanitizeUrl,
    shortFlowId,
    createEconomicFlowId,
} from '../text-utils'

describe('normalizeSemanticText', () => {
    it('pasa a minúsculas, quita tildes y colapsa espacios', () => {
        expect(normalizeSemanticText('  Café   CON  Leche  ')).toBe('cafe con leche')
        expect(normalizeSemanticText('Ñandú Ágil')).toBe('nandu agil')
    })
    it('tolera entrada vacía/no string', () => {
        expect(normalizeSemanticText('')).toBe('')
        expect(normalizeSemanticText(undefined as unknown as string)).toBe('')
    })
})

describe('dedupeMeaningfulLines', () => {
    it('elimina duplicados semánticos (acentos/mayúsculas) conservando el primero', () => {
        expect(dedupeMeaningfulLines(['Café', 'cafe', 'CAFÉ', 'Té'])).toEqual(['Café', 'Té'])
    })
    it('descarta líneas vacías', () => {
        expect(dedupeMeaningfulLines(['  ', 'Hola', ''])).toEqual(['Hola'])
    })
})

describe('stripBulletMarker', () => {
    it('quita viñetas iniciales y recorta', () => {
        expect(stripBulletMarker('- Punto uno')).toBe('Punto uno')
        expect(stripBulletMarker('• Otro')).toBe('Otro')
        expect(stripBulletMarker('Sin viñeta')).toBe('Sin viñeta')
    })
})

describe('normalizeEditorialLine', () => {
    it('convierte ALL CAPS a minúsculas y capitaliza la primera letra', () => {
        expect(normalizeEditorialLine('OFERTA ESPECIAL')).toBe('Oferta especial')
    })
    it('capitaliza la primera letra de una frase normal', () => {
        expect(normalizeEditorialLine('- nuevo lanzamiento')).toBe('Nuevo lanzamiento')
    })
    it('devuelve vacío con entrada vacía', () => {
        expect(normalizeEditorialLine('')).toBe('')
    })
})

describe('descriptionHasBulletStructure', () => {
    it('detecta viñetas en líneas', () => {
        expect(descriptionHasBulletStructure('Intro\n- uno\n- dos')).toBe(true)
        expect(descriptionHasBulletStructure('Sin viñetas aquí')).toBe(false)
    })
})

describe('extractPromptDetailBlocks', () => {
    it('extrae los puntos de una lista con viñetas', () => {
        const out = extractPromptDetailBlocks('Título principal\n- detalle uno\n- detalle dos')
        expect(out).toContain('detalle uno')
        expect(out).toContain('detalle dos')
    })
    it('devuelve [] con entrada vacía', () => {
        expect(extractPromptDetailBlocks('')).toEqual([])
    })
})

describe('extractEditorialBulletCandidates', () => {
    it('normaliza y deduplica viñetas editoriales', () => {
        const out = extractEditorialBulletCandidates('Resumen\n- PRIMERO\n- segundo\n- primero')
        expect(out).toEqual(['Primero', 'Segundo'])
    })
})

describe('appendNarrativeDetail', () => {
    it('concatena añadiendo punto cuando falta', () => {
        expect(appendNarrativeDetail('Hola mundo', 'Adiós')).toBe('Hola mundo. Adiós')
    })
    it('no duplica si el detalle ya está contenido', () => {
        expect(appendNarrativeDetail('Hola mundo entero', 'mundo')).toBe('Hola mundo entero')
    })
    it('maneja base o detalle vacíos', () => {
        expect(appendNarrativeDetail('', 'Solo detalle')).toBe('Solo detalle')
        expect(appendNarrativeDetail('Solo base', '')).toBe('Solo base')
    })
})

describe('extractBalancedJsonObject', () => {
    it('extrae el objeto JSON balanceado e ignora texto alrededor', () => {
        expect(extractBalancedJsonObject('ruido {"a":1,"b":{"c":2}} cola')).toBe('{"a":1,"b":{"c":2}}')
    })
    it('ignora llaves dentro de strings', () => {
        expect(extractBalancedJsonObject('{"k":"}{"}')).toBe('{"k":"}{"}')
    })
    it('devuelve null si no hay objeto', () => {
        expect(extractBalancedJsonObject('sin json')).toBeNull()
    })
})

describe('sanitizeUrl', () => {
    it('extrae la URL de un enlace markdown', () => {
        expect(sanitizeUrl('[web](https://ejemplo.com/x)')).toBe('https://ejemplo.com/x')
    })
    it('quita comillas envolventes y extrae http', () => {
        expect(sanitizeUrl('"https://ejemplo.com"')).toBe('https://ejemplo.com')
    })
    it('devuelve cadena vacía con undefined', () => {
        expect(sanitizeUrl(undefined)).toBe('')
    })
})

describe('shortFlowId', () => {
    it('devuelve marcador cuando no hay id', () => {
        expect(shortFlowId(undefined)).toBe('sin-flow')
    })
    it('deja ids cortos intactos y trunca los largos', () => {
        expect(shortFlowId('corto')).toBe('corto')
        const long = 'flow_carousel_1700000000000_abcdef'
        expect(shortFlowId(long)).toContain('...')
        expect(shortFlowId(long).length).toBeLessThan(long.length)
    })
})

describe('createEconomicFlowId', () => {
    it('genera un id con el prefijo dado', () => {
        expect(createEconomicFlowId('carousel')).toMatch(/^flow_carousel_\d+_[a-z0-9]+$/)
    })
})
