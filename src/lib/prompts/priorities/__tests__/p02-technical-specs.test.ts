import { describe, expect, it } from 'vitest'
import { buildCompositionRules } from '../p02-technical-specs'

/**
 * El color de las vinetas estuvo fijado a `#ed2aed`, un magenta ajeno a
 * cualquier marca. Como estas reglas viajan en TODAS las generaciones, el
 * prompt acababa exigiendo la paleta de marca (PRIORITY 4) y nombrando acto
 * seguido un color que no estaba en ella.
 */
describe('buildCompositionRules', () => {
    it('usa el acento real cuando se le pasa', () => {
        const rules = buildCompositionRules('#e2262b')
        expect(rules).toContain(`- COLOR: The markers MUST be strictly in the 'ACENTO' color (#e2262b).`)
    })

    it('remite a PRIORITY 4 cuando no hay acento', () => {
        const rules = buildCompositionRules()
        expect(rules).toContain(`'ACENTO' color defined in PRIORITY 4`)
        expect(rules).toContain('Do NOT introduce any hue outside the brand palette')
    })

    it('no arrastra el magenta de pruebas en ningun caso', () => {
        for (const entrada of [undefined, '', '#e2262b', '#fff']) {
            expect(buildCompositionRules(entrada)).not.toContain('#ed2aed')
        }
    })

    it('acepta hex de 3 y de 6 digitos', () => {
        expect(buildCompositionRules('#fff')).toContain('(#fff)')
        expect(buildCompositionRules('#FFD400')).toContain('(#FFD400)')
    })

    it('ignora valores que no son un hex y no los inyecta en el prompt', () => {
        // El valor se escribe literal en el prompt: colar basura equivale a
        // pedirle al modelo un color inventado.
        for (const basura of ['rojo', 'rgb(1,2,3)', '#12345', 'ffd400', '#zzzzzz']) {
            const rules = buildCompositionRules(basura)
            expect(rules).toContain(`'ACENTO' color defined in PRIORITY 4`)
            expect(rules).not.toContain(basura)
        }
    })

    it('trata una cadena en blanco como ausencia de acento', () => {
        expect(buildCompositionRules('   ')).toContain(`'ACENTO' color defined in PRIORITY 4`)
    })

    it('recorta espacios alrededor del hex', () => {
        expect(buildCompositionRules('  #e2262b  ')).toContain('(#e2262b)')
    })

    it('conserva intacto el resto del bloque', () => {
        const rules = buildCompositionRules('#e2262b')
        expect(rules).toContain('BACKGROUND: NEVER use transparency')
        expect(rules).toContain('PRIORITY 2A - LIST LAYOUT, MARKER LIBRARY & SIZE CONTROL')
        expect(rules).toContain('K) Bold Plus Sign (+) (Swiss Cross style)')
        expect(rules).toContain('5. ALIGNMENT: The bullets must align perfectly on the left margin.')
        expect(rules).toContain('CONTACT SEPARATION RULE')
        expect(rules).toContain('CASING RULE')
    })

    it('el bloque es identico salvo la linea del color', () => {
        const conAcento = buildCompositionRules('#e2262b').split('\n')
        const sinAcento = buildCompositionRules().split('\n')

        expect(conAcento).toHaveLength(sinAcento.length)
        const distintas = conAcento.filter((linea, i) => linea !== sinAcento[i])
        expect(distintas).toHaveLength(1)
        expect(distintas[0]).toContain('COLOR: The markers')
    })
})
