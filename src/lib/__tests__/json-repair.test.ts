import { describe, it, expect } from 'vitest'
import { extractJson, normalizeSmartQuotes, repairJsonString } from '../json-repair'

describe('extractJson', () => {
  it('strips ```json fences and returns the object', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toBe('{"a":1}')
  })

  it('strips bare ``` fences', () => {
    expect(extractJson('```\n{"a":1}\n```')).toBe('{"a":1}')
  })

  it('extracts the first balanced object from surrounding noise', () => {
    expect(extractJson('prefix {"a":1} suffix')).toBe('{"a":1}')
  })

  it('respects nested braces when balancing', () => {
    expect(extractJson('noise {"a":{"b":2}} more')).toBe('{"a":{"b":2}}')
  })

  it('stops at the first complete top-level object', () => {
    expect(extractJson('{"a":1} {"b":2}')).toBe('{"a":1}')
  })

  it('returns the cleaned text untouched when there is no opening brace', () => {
    expect(extractJson('no json here')).toBe('no json here')
  })

  it('returns the remainder when braces never balance', () => {
    expect(extractJson('{"a":1')).toBe('{"a":1')
  })
})

describe('normalizeSmartQuotes', () => {
  it('converts smart double quotes to straight double quotes', () => {
    expect(normalizeSmartQuotes('“hi”')).toBe('"hi"')
  })

  it('converts smart single quotes to straight single quotes', () => {
    expect(normalizeSmartQuotes('‘x’')).toBe("'x'")
  })

  it('converts non-breaking spaces to regular spaces', () => {
    expect(normalizeSmartQuotes('a b')).toBe('a b')
  })
})

describe('repairJsonString', () => {
  // Helper: a successful repair must yield JSON that parses to the expected value.
  const expectRepairToParseAs = (input: string, expected: unknown) => {
    const repaired = repairJsonString(input)
    expect(() => JSON.parse(repaired), `repaired was: ${repaired}`).not.toThrow()
    expect(JSON.parse(repaired)).toEqual(expected)
  }

  it('repairs smart quotes around keys and string values', () => {
    expectRepairToParseAs('{“a”:“b”}', { a: 'b' })
  })

  it('repairs single-quoted keys and string values', () => {
    expectRepairToParseAs("{'name': 'John', 'age': 30}", { name: 'John', age: 30 })
  })

  it('removes trailing commas in objects and arrays', () => {
    expectRepairToParseAs('{"a":1, "b":2,}', { a: 1, b: 2 })
    expectRepairToParseAs('{"a":["x","y",]}', { a: ['x', 'y'] })
  })

  it('quotes unquoted plain string values', () => {
    expectRepairToParseAs('{"a": hello world, "b": 2}', { a: 'hello world', b: 2 })
  })

  it('escapes literal newlines inside strings', () => {
    expectRepairToParseAs('{"a": "line1\nline2"}', { a: 'line1\nline2' })
  })

  it('preserves boolean, null and numeric literals', () => {
    expectRepairToParseAs('{"a": true, "b": false, "c": null, "d": -3.5}', {
      a: true,
      b: false,
      c: null,
      d: -3.5,
    })
  })

  it('handles a combination of single quotes, arrays and trailing commas', () => {
    expectRepairToParseAs("{'a': 'x', 'b': ['p','q',], 'c': 1,}", {
      a: 'x',
      b: ['p', 'q'],
      c: 1,
    })
  })

  it('keeps already-valid JSON parseable (no spurious quotes after string values)', () => {
    expectRepairToParseAs('{"a":"b","c":1,"d":"e"}', { a: 'b', c: 1, d: 'e' })
  })

  it('handles nested objects whose last value is a string', () => {
    expectRepairToParseAs('{"o": {"n": "v"}, "k": 2}', { o: { n: 'v' }, k: 2 })
  })
})
