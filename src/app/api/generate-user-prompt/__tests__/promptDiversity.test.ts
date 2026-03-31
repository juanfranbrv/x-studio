import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildPromptDiversitySuffix } from '../promptDiversity'

const routeSource = fs.readFileSync(path.resolve(__dirname, '../route.ts'), 'utf8')

describe('generate-user-prompt diversity suffix', () => {
    it('endurece variedad y especificidad sin tocar la temperatura', () => {
        const suffix = buildPromptDiversitySuffix('carousel')

        expect(suffix).toContain('Do NOT reuse the same response structure, framing, or opening move')
        expect(suffix).toContain('Pick ONE creative angle from this set and commit to it fully')
        expect(suffix).toContain('benefit-led, emotion-led, contrast-led, curiosity-led, objection-led, scene-led')
        expect(suffix).toContain('Avoid generic formulas')
        expect(suffix).toContain('The proposal must suggest a concrete narrative or communicative move')
    })

    it('blinda el modo image contra briefs visuales y encabezados de intent', () => {
        const suffix = buildPromptDiversitySuffix('image')

        expect(suffix).toContain('This is NOT a visual scene brief')
        expect(suffix).toContain('Return an editorial angle only')
        expect(suffix).toContain('Do NOT start with labels or headers such as "BEHIND THE SCENES:"')
        expect(suffix).toContain('Do NOT write "show", "mostrar", "mostrem"')
        expect(suffix).toContain('max 45 words total')
        expect(suffix).toContain('If you feel tempted to describe the image, stop and rewrite')
    })

    it('inyecta el refuerzo local en el endpoint', () => {
        expect(routeSource).toContain("import { buildPromptDiversitySuffix } from './promptDiversity'")
        expect(routeSource).toContain("import { buildForcedIntentInstruction, selectPromptIntent } from './intentRotation'")
        expect(routeSource).toContain("const forcedIntentBlock = module === 'image'")
        expect(routeSource).toContain("const finalPrompt = `${injectedPrompt}\\n\\n${forcedIntentBlock}\\n\\n${buildPromptDiversitySuffix(module)}`")
        expect(routeSource).toContain("parts: [{ text: finalPrompt }]")
    })
})
