import { describe, it, expect } from 'vitest'
import {
  hexToRgb,
  hexToHsl,
  hexToHslString,
  deltaE,
  clusterColors,
  categorizeColorRole,
  relativeLuminance,
  assignStudioColorRoles,
  getHarmonyBonus,
  rgbToLab,
} from '../color-utils'

describe('hexToRgb', () => {
  it('parses full 6-digit hex with leading #', () => {
    expect(hexToRgb('#FF8800')).toEqual({ r: 255, g: 136, b: 0 })
  })
  it('parses hex without a leading #', () => {
    expect(hexToRgb('00FF00')).toEqual({ r: 0, g: 255, b: 0 })
  })
  it('expands 3-digit shorthand', () => {
    expect(hexToRgb('#0f0')).toEqual({ r: 0, g: 255, b: 0 })
  })
  it('returns null for invalid input', () => {
    expect(hexToRgb('notacolor')).toBeNull()
    expect(hexToRgb('#12345')).toBeNull()
  })
})

describe('hexToHsl', () => {
  it('converts pure red', () => {
    expect(hexToHsl('#FF0000')).toEqual({ h: 0, s: 100, l: 50 })
  })
  it('converts white (no saturation, full lightness)', () => {
    expect(hexToHsl('#FFFFFF')).toEqual({ h: 0, s: 0, l: 100 })
  })
  it('converts black', () => {
    expect(hexToHsl('#000000')).toEqual({ h: 0, s: 0, l: 0 })
  })
  it('returns null for invalid input', () => {
    expect(hexToHsl('xyz')).toBeNull()
  })
})

describe('hexToHslString', () => {
  it('formats an HSL CSS-variable string', () => {
    expect(hexToHslString('#FF0000')).toBe('0.0 100.0% 50.0%')
  })
  it('returns null for invalid input', () => {
    expect(hexToHslString('nope')).toBeNull()
  })
})

describe('deltaE', () => {
  it('is 0 for identical colors', () => {
    expect(deltaE('#123456', '#123456')).toBe(0)
  })
  it('is the euclidean RGB distance for black vs white', () => {
    expect(deltaE('#000000', '#FFFFFF')).toBeCloseTo(441.67, 1)
  })
  it('returns max distance (100) when a color is invalid', () => {
    expect(deltaE('#000000', 'invalid')).toBe(100)
  })
})

describe('clusterColors', () => {
  it('groups identical colors into a single cluster and sums weight', () => {
    const clusters = clusterColors([{ hex: '#FF0000', weight: 2 }, { hex: '#FF0000', weight: 3 }], 30)
    expect(clusters).toHaveLength(1)
    expect(clusters[0].score).toBe(5)
    expect(clusters[0].originalColors).toHaveLength(2)
  })
  it('keeps very different colors in separate clusters', () => {
    const clusters = clusterColors([{ hex: '#000000', weight: 1 }, { hex: '#FFFFFF', weight: 1 }], 30)
    expect(clusters).toHaveLength(2)
  })
  it('uses the highest-weight color as the cluster representative', () => {
    const clusters = clusterColors([{ hex: '#FF0000', weight: 1 }, { hex: '#FE0000', weight: 9 }], 30)
    expect(clusters).toHaveLength(1)
    expect(clusters[0].representative).toBe('#FE0000')
  })
})

describe('categorizeColorRole', () => {
  const palette = [
    { color: '#FF0000', score: 10 },
    { color: '#00FF00', score: 5 },
    { color: '#0000FF', score: 1 },
  ]
  it('detects light low-saturation backgrounds', () => {
    expect(categorizeColorRole('#FFFFFF', palette)).toBe('background')
  })
  it('detects dark low-saturation backgrounds', () => {
    expect(categorizeColorRole('#000000', palette)).toBe('background')
  })
  it('labels the top-scoring vibrant color primary', () => {
    expect(categorizeColorRole('#FF0000', palette)).toBe('primary')
  })
  it('labels the second vibrant color secondary', () => {
    expect(categorizeColorRole('#00FF00', palette)).toBe('secondary')
  })
  it('labels other vibrant colors accent', () => {
    expect(categorizeColorRole('#0000FF', palette)).toBe('accent')
  })
  it('labels low-saturation mid colors neutral', () => {
    expect(categorizeColorRole('#808080', palette)).toBe('neutral')
  })
  it('returns neutral for invalid colors', () => {
    // 'xyz' has non-hex chars (note: 'bad' would be a valid #bbaadd shorthand).
    expect(categorizeColorRole('xyz', palette)).toBe('neutral')
  })
})

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5)
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5)
  })
  it('is 0 for invalid input', () => {
    expect(relativeLuminance('nope')).toBe(0)
  })
})

describe('assignStudioColorRoles', () => {
  it('returns empty for no colors', () => {
    expect(assignStudioColorRoles([])).toEqual([])
  })
  it('assigns Fondo to highest score and Texto to the darkest of the rest', () => {
    const result = assignStudioColorRoles([
      { color: '#FFFFFF', score: 10 },
      { color: '#FF0000', score: 8 },
      { color: '#000000', score: 5 },
    ])
    const byColor = Object.fromEntries(result.map((r) => [r.color, r.role]))
    expect(byColor['#FFFFFF']).toBe('Fondo')
    expect(byColor['#000000']).toBe('Texto')
    expect(byColor['#FF0000']).toBe('Acento')
  })
})

describe('getHarmonyBonus', () => {
  it('returns 0 for fewer than two colors', () => {
    expect(getHarmonyBonus([])).toBe(0)
    expect(getHarmonyBonus(['#FF0000'])).toBe(0)
  })
  it('returns 1.0 for exactly two colors', () => {
    expect(getHarmonyBonus(['#FF0000', '#00FF00'])).toBe(1.0)
  })
  it('returns 1.05 for three or more colors', () => {
    expect(getHarmonyBonus(['#FF0000', '#00FF00', '#0000FF'])).toBe(1.05)
  })
})

describe('rgbToLab', () => {
  it('maps black to L≈0', () => {
    const lab = rgbToLab({ r: 0, g: 0, b: 0 })
    expect(lab.l).toBeCloseTo(0, 1)
  })
  it('maps white to L≈100 with near-zero a/b', () => {
    const lab = rgbToLab({ r: 255, g: 255, b: 255 })
    expect(lab.l).toBeCloseTo(100, 0)
    expect(lab.a).toBeCloseTo(0, 1)
    expect(lab.b).toBeCloseTo(0, 1)
  })
})
