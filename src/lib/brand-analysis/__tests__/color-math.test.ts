import { describe, it, expect } from 'vitest'
import { colorDistance, deduplicateSimilarColors, rgbToHex, isColorful } from '../color-math'

describe('colorDistance', () => {
    it('es 0 entre colores idénticos', () => {
        expect(colorDistance('#ffffff', '#ffffff')).toBe(0)
    })
    it('mide la distancia euclidiana RGB (negro vs blanco)', () => {
        expect(colorDistance('#000000', '#ffffff')).toBeCloseTo(Math.sqrt(3 * 255 ** 2), 5)
    })
})

describe('deduplicateSimilarColors', () => {
    it('colapsa colores casi idénticos bajo el umbral', () => {
        expect(deduplicateSimilarColors(['#ff0000', '#fe0101'])).toEqual(['#ff0000'])
    })
    it('conserva colores claramente distintos', () => {
        expect(deduplicateSimilarColors(['#ff0000', '#00ff00', '#0000ff'])).toHaveLength(3)
    })
    it('respeta un umbral personalizado', () => {
        expect(deduplicateSimilarColors(['#000000', '#0a0a0a'], 5)).toHaveLength(2)
    })
})

describe('rgbToHex', () => {
    it('formatea con padding a 2 dígitos', () => {
        expect(rgbToHex(0, 0, 0)).toBe('#000000')
        expect(rgbToHex(255, 255, 255)).toBe('#ffffff')
        expect(rgbToHex(16, 8, 1)).toBe('#100801')
    })
})

describe('isColorful', () => {
    it('rechaza blancos, negros y grises puros', () => {
        expect(isColorful('#ffffff')).toBe(false)
        expect(isColorful('#000000')).toBe(false)
        expect(isColorful('#808080')).toBe(false)
    })
    it('rechaza valores no válidos', () => {
        expect(isColorful('')).toBe(false)
        expect(isColorful('transparent')).toBe(false)
        expect(isColorful('null')).toBe(false)
    })
    it('acepta colores con saturación apreciable', () => {
        expect(isColorful('#ff0000')).toBe(true)
        expect(isColorful('#3366cc')).toBe(true)
    })
})
