import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const controlsSource = fs.readFileSync(
    path.resolve(__dirname, '../ReplaceControlsPanel.tsx'),
    'utf8'
)

describe('replace controls panel contract', () => {
    it('declara un CTA principal de generar imagen desactivado hasta tener producto y plantilla', () => {
        expect(controlsSource).toContain('const canGenerate =')
        expect(controlsSource).toContain('disabled={!canGenerate')
        expect(controlsSource).toContain('Generar imagen')
    })

    it('mantiene un refinamiento opcional del usuario sin exigirlo para generar', () => {
        expect(controlsSource).toContain('Prompt opcional')
        expect(controlsSource).toContain('value={userRefinement}')
    })
})
