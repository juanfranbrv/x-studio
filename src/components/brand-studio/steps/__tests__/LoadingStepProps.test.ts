import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const loadingStepSource = fs.readFileSync(
    path.resolve(__dirname, '../LoadingStep.tsx'),
    'utf8'
)

describe('LoadingStep props contract', () => {
    it('declara las props necesarias para reintentar analisis web e instagram desde BrandStudio', () => {
        expect(loadingStepSource).toContain('instagramHandle?: string')
        expect(loadingStepSource).toContain('usedFallback?: boolean')
        expect(loadingStepSource).toContain('onHandleChange?: (handle: string) => void')
    })
})
