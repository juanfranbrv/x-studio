import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const creationFlowSource = fs.readFileSync(
    path.resolve(__dirname, '../../../hooks/useCreationFlow.ts'),
    'utf8'
)

describe('Image CTA default state', () => {
    it('no autoactiva el enlace al inicializar desde el Brand Kit', () => {
        expect(creationFlowSource).toContain("nextState.ctaUrlEnabled = false")
        expect(creationFlowSource).not.toContain("nextState.ctaUrlEnabled = Boolean(activeBrandKit.cta_url_enabled && kitUrl)")
    })
})
