import { describe, expect, it } from 'vitest'

import { normalizeStudioDebugOverlaysEnabled } from '../studio-debug-visibility'

describe('normalizeStudioDebugOverlaysEnabled', () => {
    it('mantiene visible la depuracion si no existe setting', () => {
        expect(normalizeStudioDebugOverlaysEnabled(undefined)).toBe(true)
        expect(normalizeStudioDebugOverlaysEnabled(null)).toBe(true)
        expect(normalizeStudioDebugOverlaysEnabled('')).toBe(true)
    })

    it('acepta booleanos y numeros de forma explicita', () => {
        expect(normalizeStudioDebugOverlaysEnabled(true)).toBe(true)
        expect(normalizeStudioDebugOverlaysEnabled(false)).toBe(false)
        expect(normalizeStudioDebugOverlaysEnabled(1)).toBe(true)
        expect(normalizeStudioDebugOverlaysEnabled(0)).toBe(false)
    })

    it('interpreta strings comunes de activacion y desactivacion', () => {
        expect(normalizeStudioDebugOverlaysEnabled('true')).toBe(true)
        expect(normalizeStudioDebugOverlaysEnabled('ON')).toBe(true)
        expect(normalizeStudioDebugOverlaysEnabled('yes')).toBe(true)
        expect(normalizeStudioDebugOverlaysEnabled('false')).toBe(false)
        expect(normalizeStudioDebugOverlaysEnabled('off')).toBe(false)
        expect(normalizeStudioDebugOverlaysEnabled('no')).toBe(false)
    })

    it('vuelve al default visible cuando recibe un valor desconocido', () => {
        expect(normalizeStudioDebugOverlaysEnabled('maybe')).toBe(true)
        expect(normalizeStudioDebugOverlaysEnabled({ hidden: true })).toBe(true)
    })
})
