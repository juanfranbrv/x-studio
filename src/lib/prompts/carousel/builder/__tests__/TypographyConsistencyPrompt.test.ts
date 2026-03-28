import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(path.resolve(__dirname, '../final-prompt.ts'), 'utf8')

describe('carousel typography consistency prompt', () => {
    it('bloquea el mismo especimen tipografico entre diapositivas', () => {
        expect(source).toContain('same title type specimen established in Slide 1')
        expect(source).toContain('Do not substitute a nearby family, a cleaner serif, a different sans, or a lookalike font.')
    })
})
