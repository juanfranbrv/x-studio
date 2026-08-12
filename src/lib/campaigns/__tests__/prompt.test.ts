import { describe, expect, it } from 'vitest'
import { buildCampaignImagePrompt, stripHashtags } from '../prompt'
import type { ManifestPost } from '../manifest'

const kit = {
    tone_of_voice: ['cercano', 'profesional'],
    fonts: [{ family: 'Poppins', role: 'heading' as const }, { family: 'Inter', role: 'body' as const }],
    url: 'bauset.es',
    phones: ['961 49 00 00'],
    emails: ['info@bauset.es'],
    addresses: ['Avda. Santa Maria, 31 Meliana'],
}

const basePost: ManifestPost = {
    ref: 'BAU-01',
    headline: 'Ver tu progreso es lo que te hará seguir',
    body: 'La evaluación es continua y la orientación, trimestral.',
    cta: 'Matricúlate para septiembre',
    hashtags: ['#AcademiaBauset', '#Meliana'],
    cta_url: true,
}

const build = (post: Partial<ManifestPost> = {}, extra: Partial<Parameters<typeof buildCampaignImagePrompt>[0]> = {}) =>
    buildCampaignImagePrompt({
        post: { ...basePost, ...post },
        brand: kit,
        colors: [
            { color: '#ffd400', role: 'Fondo' },
            { color: '#111111', role: 'Texto' },
            { color: '#e2262b', role: 'Acento' },
        ],
        style: { name: 'editorial-plano', keywords: ['editorial', 'flat'], subject: 'escritorio' },
        format: { name: 'Instagram Post', aspectRatio: '4:5' },
        hasPrimaryLogo: true,
        auxiliaryLogoCount: 0,
        ...extra,
    })

describe('stripHashtags', () => {
    it('quita los hashtags dejando el resto intacto', () => {
        expect(stripHashtags('Matricúlate ya #AcademiaBauset #Meliana')).toBe('Matricúlate ya')
    })

    it('elimina la linea que solo servia de cabecera', () => {
        expect(stripHashtags('Texto\nHashtags:\n#Uno #Dos')).toBe('Texto')
    })

    it('respeta almohadillas dentro de una palabra', () => {
        expect(stripHashtags('Nivel C#1 aprobado')).toBe('Nivel C#1 aprobado')
    })

    it('tolera vacios', () => {
        expect(stripHashtags(undefined)).toBe('')
        expect(stripHashtags(null)).toBe('')
    })
})

describe('buildCampaignImagePrompt', () => {
    it('da a la web tratamiento de elemento protagonista (P09b)', () => {
        const prompt = build()
        expect(prompt).toContain('URL VISUAL ELEMENT (HERO): "bauset.es"')
        expect(prompt).toContain('CRITICAL VISUAL HIERARCHY: The URL "bauset.es" must be the PROMINENT visual element')
        expect(prompt).toContain('FINAL LAYOUT CHECK: The URL "bauset.es"')
    })

    it('no arrastra las reglas que empequenecian la URL', () => {
        const prompt = build()
        expect(prompt).not.toContain('CTA URL must be visually secondary and compact')
        expect(prompt).not.toContain('never dominant')
    })

    it('nunca mete hashtags en la imagen, venga de donde venga', () => {
        // Cada campo de texto libre es una via posible: el manifiesto lo
        // escribe una IA y cuela almohadillas donde le parece.
        const prompt = build({
            prompt: 'Post sobre progreso #AcademiaBauset',
            headline: 'Titular #Meliana',
            body: 'Cuerpo #InglésParaAdultos',
            cta: 'Matricúlate #Curso2026',
            goal: 'Cerrar matrículas #HortaNord',
            visual_content: 'Un portátil sobre la mesa #PearsonPTE',
            hashtags: ['#AcademiaBauset', '#Meliana'],
        })

        for (const tag of ['AcademiaBauset', 'Meliana', 'InglésParaAdultos', 'Curso2026', 'HortaNord', 'PearsonPTE']) {
            expect(prompt).not.toContain(tag)
        }
        // El resto del texto sí sobrevive: se quita la etiqueta, no la frase.
        expect(prompt).toContain('Post sobre progreso')
        expect(prompt).toContain('Un portátil sobre la mesa')
    })

    it('la lista de hashtags del manifiesto no entra en el prompt', () => {
        const prompt = build({ hashtags: ['#CertificadoOficial', '#VueltaAlCole'] })
        expect(prompt).not.toContain('CertificadoOficial')
        expect(prompt).not.toContain('VueltaAlCole')
    })

    it('coloca la llamada a la accion como copy secundario sobre la URL', () => {
        const prompt = build()
        expect(prompt).toContain('SECONDARY ACTION COPY: "Matricúlate para septiembre"')
    })

    it('sin web, la llamada a la accion va sola', () => {
        const prompt = build({ cta_url: false })
        expect(prompt).toContain('ACTION COPY: "Matricúlate para septiembre"')
        expect(prompt).not.toContain('URL VISUAL ELEMENT (HERO)')
    })

    it('separa los datos de contacto del resto del texto', () => {
        const prompt = build({ phone: true, address: true })
        expect(prompt).toContain('CONTACT INFORMATION (SEPARATE BLOCK):')
        expect(prompt).toContain('- TELEFONO: "961 49 00 00"')
        expect(prompt).toContain('- DIRECCION: "Avda. Santa Maria, 31 Meliana"')
    })

    it('incluye la pila de prioridades del panel', () => {
        const prompt = build()
        expect(prompt).toContain('PRIORITY 12 - PREFERRED LANGUAGE ENFORCEMENT')
        expect(prompt).toContain('PRIORITY 10 - ABSOLUTE OVERRIDE (LOGO INTEGRITY)')
        expect(prompt).toContain('MANDATORY TEXT CONTENT')
        expect(prompt).toContain('TYPOGRAPHY CONTRACT (NON-NEGOTIABLE)')
        expect(prompt).toContain('PRIORITY 5 - VISUAL STYLE')
        expect(prompt).toContain('PRIORITY 4 - BRAND COLOR PALETTE')
        expect(prompt).toContain('PRIORITY 2 - TECHNICAL SPECIFICATIONS')
        expect(prompt).toContain('ASPECT RATIO: 4:5')
    })

    it('usa las fuentes del kit en el contrato tipografico', () => {
        const prompt = build()
        expect(prompt).toContain('HEADLINE_FONT = "Poppins"')
        expect(prompt).toContain('BODY_FONT = "Inter"')
    })

    it('agrupa los colores por rol', () => {
        const prompt = build()
        expect(prompt).toContain('#ffd400')
        expect(prompt).toContain('#e2262b')
        expect(prompt).toContain('FONDO')
        expect(prompt).toContain('ACENTO')
    })

    it('omite el bloque de logo cuando la campana no lo pide', () => {
        const prompt = build({}, { hasPrimaryLogo: false })
        expect(prompt).not.toContain('PRIORITY 10 - ABSOLUTE OVERRIDE (LOGO INTEGRITY)')
    })

    it('anade la jerarquia de sellos solo si hay logos auxiliares', () => {
        expect(build()).not.toContain('PRIORITY 10b')
        expect(build({}, { auxiliaryLogoCount: 2 })).toContain('PRIORITY 10b')
    })

    it('trata la prosa del manifiesto como intencion, no como texto a imprimir', () => {
        const prompt = build({ prompt: 'Publicacion sobre el seguimiento del alumnado' })
        expect(prompt).toContain('USER ORIGINAL INTENTION / RAW CONTEXT:')
        expect(prompt).toContain('Publicacion sobre el seguimiento del alumnado')
    })

    it('describe el contenido visual con la misma instruccion que el panel', () => {
        const prompt = build({ visual_content: 'Un portatil sobre una mesa de madera con una taza' })
        expect(prompt).toContain('Un portatil sobre una mesa de madera con una taza')
    })
})
