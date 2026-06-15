import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const workSessionsSource = fs.readFileSync(
  path.resolve(__dirname, '../work_sessions.ts'),
  'utf8'
)

const imagePageSource = fs.readFileSync(
  path.resolve(__dirname, '../../src/app/image/page.tsx'),
  'utf8'
)

describe('work sessions content library metadata contract', () => {
  it('conserva metadatos ligeros por generacion al compactar snapshots de image', () => {
    expect(workSessionsSource).toContain('caption: limitText(row.caption, 1200)')
    expect(workSessionsSource).toContain('headline: limitText(row.headline, 300)')
    expect(workSessionsSource).toContain('cta: limitText(row.cta, 180)')
    expect(workSessionsSource).toContain('platform: limitText(row.platform, 80)')
    expect(workSessionsSource).toContain('format: limitText(row.format, 80)')
  })

  it('la pagina de image escribe esos metadatos en cada generacion futura', () => {
    expect(imagePageSource).toContain('caption: creationFlow.state.caption')
    expect(imagePageSource).toContain('headline: creationFlow.state.headline')
    expect(imagePageSource).toContain('cta: creationFlow.state.cta')
    expect(imagePageSource).toContain('platform: creationFlow.state.selectedPlatform || undefined')
    expect(imagePageSource).toContain('format: creationFlow.state.selectedFormat || undefined')
  })
})
