import { describe, it, expect } from 'vitest'
import {
  discoverValuablePages,
  extractFontsFromContent,
  analyzeStaticWeightedDOM,
} from '../html-extractors'

describe('discoverValuablePages', () => {
  it('returns same-domain valuable pages as absolute URLs', () => {
    const html = `
      <a href="/about">About</a>
      <a href="/contacto">Contacto</a>
      <a href="/blog/post-1">Blog</a>
    `
    const pages = discoverValuablePages(html, 'https://example.com')
    expect(pages).toContain('https://example.com/about')
    expect(pages).toContain('https://example.com/contacto')
    expect(pages).not.toContain('https://example.com/blog/post-1')
  })

  it('excludes links to other domains', () => {
    const html = `<a href="https://other.com/about">x</a><a href="/servicios">s</a>`
    const pages = discoverValuablePages(html, 'https://example.com')
    expect(pages.some((p) => p.includes('other.com'))).toBe(false)
    expect(pages).toContain('https://example.com/servicios')
  })

  it('caps the result at 3 pages', () => {
    const html = ['about', 'servicios', 'equipo', 'contacto', 'empresa']
      .map((p) => `<a href="/${p}">${p}</a>`)
      .join('')
    expect(discoverValuablePages(html, 'https://example.com').length).toBeLessThanOrEqual(3)
  })

  it('returns an empty array when there are no links', () => {
    expect(discoverValuablePages('<p>no links</p>', 'https://example.com')).toEqual([])
  })
})

describe('extractFontsFromContent', () => {
  it('extracts fonts from a classic Google Fonts URL (| separated)', () => {
    const content = `<link href="https://fonts.googleapis.com/css?family=Lato:400,700|Merriweather">`
    const fonts = extractFontsFromContent(content)
    expect(fonts).toContain('Lato')
    expect(fonts).toContain('Merriweather')
  })

  it('decodes + into spaces in Google Fonts family names', () => {
    const content = `<link href="https://fonts.googleapis.com/css?family=Playfair+Display">`
    expect(extractFontsFromContent(content)).toContain('Playfair Display')
  })

  it('extracts fonts from @font-face declarations', () => {
    const content = `@font-face { font-family: 'BrandSans'; src: url(b.woff2) }`
    expect(extractFontsFromContent(content)).toContain('BrandSans')
  })

  it('deduplicates repeated fonts', () => {
    // Use a non-system font name (system fonts like Roboto/Arial are filtered out).
    const content = `
      @font-face { font-family: 'Brandington'; src: url(a.woff2) }
      @font-face { font-family: 'Brandington'; src: url(b.woff2) }
    `
    const fonts = extractFontsFromContent(content)
    expect(fonts.filter((f) => f === 'Brandington')).toHaveLength(1)
  })

  it('returns an empty array for content without fonts', () => {
    expect(extractFontsFromContent('<p>hello</p>')).toEqual([])
  })

  it('never returns more than 8 candidates', () => {
    const families = ['Aa', 'Bb', 'Cc', 'Dd', 'Ee', 'Ff', 'Gg', 'Hh', 'Ii', 'Jj']
      .map((n) => `@font-face { font-family: '${n}Font'; }`)
      .join('\n')
    expect(extractFontsFromContent(families).length).toBeLessThanOrEqual(8)
  })
})

describe('analyzeStaticWeightedDOM', () => {
  it('weights inline 6-digit hex colors with a base weight of 100', () => {
    const { weightedColors } = analyzeStaticWeightedDOM('<div style="color:#FF0000"></div>', {})
    expect(weightedColors).toContainEqual({ hex: '#FF0000', weight: 100 })
  })

  it('ignores 3-digit hex shortcuts', () => {
    const { weightedColors } = analyzeStaticWeightedDOM('<div style="color:#abc"></div>', {})
    expect(weightedColors).toEqual([])
  })

  it('gives header/hero sections a higher weight than the base', () => {
    const base = analyzeStaticWeightedDOM('<div style="color:#ABCDEF"></div>', {})
    const header = analyzeStaticWeightedDOM('<header><div style="color:#ABCDEF"></div></header>', {})
    const baseWeight = base.weightedColors.find((c) => c.hex === '#ABCDEF')!.weight
    const headerWeight = header.weightedColors.find((c) => c.hex === '#ABCDEF')!.weight
    expect(headerWeight).toBeGreaterThan(baseWeight)
  })

  it('weights colors coming from CSS variables and boosts primary/brand vars', () => {
    const { weightedColors } = analyzeStaticWeightedDOM('', { '--primary-color': '#123456' })
    const entry = weightedColors.find((c) => c.hex === '#123456')
    expect(entry).toBeDefined()
    expect(entry!.weight).toBeGreaterThan(80) // base 80 * 1.8 boost
  })

  it('extracts and weights fonts declared in headings (lowercased)', () => {
    // analyzeStaticWeightedDOM lowercases the tag before reading the font name,
    // so heading fonts come back lowercased.
    const { weightedFonts } = analyzeStaticWeightedDOM(
      `<h1 style="font-family:'Brand Sans'">Title</h1>`,
      {},
    )
    expect(weightedFonts.some((f) => f.font === 'brand sans')).toBe(true)
  })

  it('returns empty results for empty input', () => {
    expect(analyzeStaticWeightedDOM('', {})).toEqual({ weightedColors: [], weightedFonts: [] })
  })
})
