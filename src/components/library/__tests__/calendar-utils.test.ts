import { describe, expect, it } from 'vitest'

import { buildMonthMatrix, dateKey, groupAssetsByDateKey, toDateKey } from '../calendar-utils'

describe('toDateKey', () => {
    it('mantiene una fecha YYYY-MM-DD', () => {
        expect(toDateKey('2026-06-20')).toBe('2026-06-20')
    })
    it('recorta una fecha ISO al dia', () => {
        expect(toDateKey('2026-06-20T18:30:00.000Z')).toBe('2026-06-20')
    })
    it('devuelve null para vacio o invalido', () => {
        expect(toDateKey(undefined)).toBeNull()
        expect(toDateKey('')).toBeNull()
        expect(toDateKey('no-fecha')).toBeNull()
    })
})

describe('dateKey', () => {
    it('formatea un Date local a YYYY-MM-DD', () => {
        expect(dateKey(new Date(2026, 5, 9))).toBe('2026-06-09')
    })
})

describe('buildMonthMatrix', () => {
    it('devuelve 6 semanas de 7 dias', () => {
        const weeks = buildMonthMatrix(2026, 5) // junio 2026
        expect(weeks).toHaveLength(6)
        weeks.forEach((week) => expect(week).toHaveLength(7))
    })

    it('empieza en lunes y contiene el dia 1 del mes', () => {
        const weeks = buildMonthMatrix(2026, 5) // junio 2026 (1 = lunes)
        expect(weeks[0][0].getDay()).toBe(1) // lunes
        const allKeys = weeks.flat().map(dateKey)
        expect(allKeys).toContain('2026-06-01')
        expect(allKeys).toContain('2026-06-30')
    })

    it('incluye dias de relleno del mes anterior cuando el 1 no es lunes', () => {
        // Julio 2026: el 1 es miércoles -> la matriz arranca el lunes 29 de junio
        const weeks = buildMonthMatrix(2026, 6)
        expect(dateKey(weeks[0][0])).toBe('2026-06-29')
    })
})

describe('groupAssetsByDateKey', () => {
    it('agrupa por dia e ignora los sin fecha', () => {
        const assets = [
            { id: 'a', planned_at: '2026-06-20' },
            { id: 'b', planned_at: '2026-06-20T09:00:00.000Z' },
            { id: 'c', planned_at: '2026-06-21' },
            { id: 'd' },
        ]
        const grouped = groupAssetsByDateKey(assets)
        expect(grouped.get('2026-06-20')).toHaveLength(2)
        expect(grouped.get('2026-06-21')).toHaveLength(1)
        expect(grouped.has('')).toBe(false)
        expect([...grouped.keys()].sort()).toEqual(['2026-06-20', '2026-06-21'])
    })
})
