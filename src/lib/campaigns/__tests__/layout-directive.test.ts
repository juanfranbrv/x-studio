import { describe, expect, it } from 'vitest'
import { buildLayoutDirective } from '../layout-directive'
import { listLayouts } from '../catalogs'

describe('buildLayoutDirective', () => {
    it('devuelve vacio sin layout o con uno inexistente', () => {
        expect(buildLayoutDirective(undefined)).toBe('')
        expect(buildLayoutDirective('')).toBe('')
        expect(buildLayoutDirective('layout-que-no-existe')).toBe('')
    })

    it('incluye la instruccion de composicion del layout', () => {
        const directive = buildLayoutDirective('clean')
        expect(directive).toContain('COMPOSICIÓN')
        expect(directive.toLowerCase()).toContain('negative space')
    })

    /**
     * Cobertura completa del catalogo sin generar una sola imagen: probar los
     * 279 layouts generando costaria horas y creditos, mientras que verificar
     * que cada uno aporta instruccion al prompt cuesta milisegundos.
     */
    it('TODOS los layouts del catalogo producen instruccion', () => {
        const layouts = listLayouts()
        expect(layouts.length).toBeGreaterThan(100)

        const mudos = layouts
            .map((layout) => ({ id: layout.id, directive: buildLayoutDirective(layout.id) }))
            .filter((entry) => entry.directive.trim().length === 0)

        expect(mudos.map((m) => m.id)).toEqual([])
    })

    it('ningun layout produce una instruccion sospechosamente corta', () => {
        const pobres = listLayouts()
            .map((layout) => ({ id: layout.id, len: buildLayoutDirective(layout.id).length }))
            .filter((entry) => entry.len < 60)

        expect(pobres.map((p) => p.id)).toEqual([])
    })
})
