import { describe, it, expect } from 'vitest'
import { assignStudioColorRoles, createFinalPalette } from '../color-consensus'

const c = (color: string, score: number, sources: string[] = ['visual']) => ({ color, score, sources })

describe('assignStudioColorRoles', () => {
  it('returns an empty array for no colors', () => {
    expect(assignStudioColorRoles([])).toEqual([])
  })

  it('assigns Fondo to a single color', () => {
    const result = assignStudioColorRoles([c('#FFFFFF', 5)])
    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('Fondo')
  })

  it('orders by score desc and makes the highest-scored color the Fondo', () => {
    const result = assignStudioColorRoles([c('#111111', 3), c('#EEEEEE', 9), c('#FF0000', 6)])
    expect(result.map((r) => r.color)).toEqual(['#EEEEEE', '#FF0000', '#111111'])
    expect(result[0].role).toBe('Fondo')
  })

  it('assigns Texto to the darkest color among the non-background colors', () => {
    // white (highest score -> Fondo), red, black(darkest). Black must be Texto.
    const result = assignStudioColorRoles([c('#FFFFFF', 10), c('#FF0000', 8), c('#000000', 5)])
    const byColor = Object.fromEntries(result.map((r) => [r.color, r.role]))
    expect(byColor['#FFFFFF']).toBe('Fondo')
    expect(byColor['#000000']).toBe('Texto')
    expect(byColor['#FF0000']).toBe('Acento')
  })

  it('makes the second color Texto when only two colors are present', () => {
    const result = assignStudioColorRoles([c('#EEEEEE', 5), c('#111111', 3)])
    expect(result[0]).toMatchObject({ color: '#EEEEEE', role: 'Fondo' })
    expect(result[1]).toMatchObject({ color: '#111111', role: 'Texto' })
  })

  it('preserves sources and score on each color', () => {
    const result = assignStudioColorRoles([c('#ABCDEF', 4, ['logo', 'visual'])])
    expect(result[0].sources).toEqual(['logo', 'visual'])
    expect(result[0].score).toBe(4)
  })
})

describe('createFinalPalette', () => {
  it('returns an empty palette when every source is empty', () => {
    expect(createFinalPalette([], [], [])).toEqual([])
  })

  it('ignores entries that are not hex strings', () => {
    const result = createFinalPalette(['red', '#00FF00', 123 as unknown as string], [], [])
    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('Fondo')
    expect(result[0].sources).toContain('visual')
    expect(result[0].color).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  it('records the contributing source for a single visual color', () => {
    const result = createFinalPalette(['#123456'], [], [])
    expect(result).toHaveLength(1)
    expect(result[0].sources).toEqual(['visual'])
  })

  it('caps the consolidated palette at six roled colors', () => {
    const many = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#800000', '#008000']
    const result = createFinalPalette(many, [], [])
    expect(result.length).toBeLessThanOrEqual(6)
    expect(result.every((r) => ['Fondo', 'Texto', 'Acento'].includes(r.role as string))).toBe(true)
  })
})
