import { describe, expect, it } from 'vitest'
import { findGenericNames, parseNameProposals } from '../naming'

describe('findGenericNames', () => {
    it('marca como genericos los nombres repetidos', () => {
        const generic = findGenericNames([
            { name: 'Comic' },
            { name: 'Comic' },
            { name: 'Acuarela' },
        ])

        expect(generic.has('comic')).toBe(true)
        expect(generic.has('acuarela')).toBe(false)
    })

    it('ignora mayusculas y espacios al comparar', () => {
        const generic = findGenericNames([{ name: 'Comic' }, { name: '  comic  ' }])
        expect(generic.has('comic')).toBe(true)
    })

    it('marca como generico el nombre vacio', () => {
        const generic = findGenericNames([{ name: '' }, { name: 'Acuarela' }])
        expect(generic.has('')).toBe(true)
    })

    it('no marca nada cuando todos los nombres son unicos', () => {
        const generic = findGenericNames([{ name: 'Acuarela' }, { name: 'Risograph' }])
        expect(generic.size).toBe(0)
    })
})

describe('parseNameProposals', () => {
    it('lee un array JSON limpio', () => {
        const result = parseNameProposals('[{"id":"a1","name":"Comic tinta gruesa"}]')
        expect(result).toEqual([{ id: 'a1', name: 'Comic tinta gruesa' }])
    })

    it('tolera el JSON envuelto en un bloque de codigo', () => {
        const raw = '```json\n[{"id":"a1","name":"Acuarela suave"}]\n```'
        expect(parseNameProposals(raw)).toEqual([{ id: 'a1', name: 'Acuarela suave' }])
    })

    it('tolera texto explicativo alrededor del JSON', () => {
        const raw = 'Aqui tienes los nombres:\n[{"id":"a1","name":"Retro solar"}]\nEspero que te sirvan.'
        expect(parseNameProposals(raw)).toEqual([{ id: 'a1', name: 'Retro solar' }])
    })

    it('descarta entradas sin id o sin nombre', () => {
        const raw = '[{"id":"a1","name":"Valido"},{"id":"","name":"Sin id"},{"id":"a3","name":""}]'
        expect(parseNameProposals(raw)).toEqual([{ id: 'a1', name: 'Valido' }])
    })

    it('devuelve vacio ante una respuesta irrecuperable', () => {
        expect(parseNameProposals('lo siento, no puedo ayudarte con eso')).toEqual([])
        expect(parseNameProposals('')).toEqual([])
    })

    it('devuelve vacio si el JSON no es un array', () => {
        expect(parseNameProposals('{"id":"a1","name":"Objeto suelto"}')).toEqual([])
    })
})
