import { describe, expect, it } from 'vitest'
import { IMAGE_GENERATION_BASE_PROMPT } from '../image-generator-base'
import { P09B } from '@/lib/prompts/priorities/p09b-cta-url-hierarchy'

/**
 * La plantilla base envuelve el prompt de cualquier via que NO mande
 * `promptAlreadyBuilt` — hoy, el carrusel. Durante un tiempo contenia reglas
 * que ordenaban empequenecer la URL ("visually secondary and compact", "never
 * dominant") mientras el propio carrusel pedia, via P09b, justo lo contrario:
 * URL como elemento protagonista. El modelo recibia las dos ordenes en el
 * mismo prompt y ganaba la que le parecia.
 *
 * Estos tests fijan que la plantilla no vuelva a contradecir a P09b.
 */
describe('IMAGE_GENERATION_BASE_PROMPT', () => {
    it('no ordena empequenecer la URL', () => {
        const contradicciones = [
            'CTA URL must be visually secondary and compact',
            'never dominant',
            'Render CTA URL at 50–70% of headline width',
            'Max width for CTA URL block',
            'shorten URL visual treatment',
        ]

        for (const linea of contradicciones) {
            expect(IMAGE_GENERATION_BASE_PROMPT).not.toContain(linea)
        }
    })

    it('delega la jerarquia de la URL en la peticion', () => {
        expect(IMAGE_GENERATION_BASE_PROMPT).toContain('CTA / URL: obedece la jerarquia que traiga la peticion')
    })

    it('sigue siendo compatible con el tratamiento HERO de P09b', () => {
        // Si la peticion pide URL protagonista, la plantilla no debe imponer
        // un tamano maximo que lo impida.
        const conHero = `${P09B.URL_HERO_INSTRUCTION('bauset.es')}\n${IMAGE_GENERATION_BASE_PROMPT}`
        expect(conHero).toContain('URL VISUAL ELEMENT (HERO)')
        expect(conHero).not.toMatch(/URL.{0,40}(secondary|never dominant)/i)
    })

    it('conserva el resto de reglas criticas', () => {
        expect(IMAGE_GENERATION_BASE_PROMPT).toContain('PROTECCION DE LOGOS')
        expect(IMAGE_GENERATION_BASE_PROMPT).toContain('AUTO-FIT TIPOGRAFICO OBLIGATORIO')
        expect(IMAGE_GENERATION_BASE_PROMPT).toContain('PROHIBICION DE COLORES EXTRANOS')
    })
})
