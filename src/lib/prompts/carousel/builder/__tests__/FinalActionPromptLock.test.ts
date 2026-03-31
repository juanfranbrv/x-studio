import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(path.resolve(__dirname, '../final-prompt.ts'), 'utf8')

describe('carousel final action prompt lock', () => {
    it('convierte url y datos de contacto en salida obligatoria cuando existen', () => {
        expect(source).toContain('If a URL is provided here, it is MANDATORY visible output on the final slide')
        expect(source).toContain('Omitting any provided contact line is a failed output.')
        expect(source).toContain('Do not shorten, normalize, translate, paraphrase, reorder, or merge these contact lines.')
    })
})
