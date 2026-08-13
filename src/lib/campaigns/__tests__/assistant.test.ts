import { describe, expect, it } from 'vitest'
import { buildCampaignAssistantPrompt, getCampaignPostsPerDay, normalizeCampaignChannels, toggleCampaignStyleValue, validateCampaignAssistantBrief, type CampaignAssistantBrief, type CampaignBrandContext } from '../assistant'
import type { GuideCatalog } from '../guide'

const catalog: GuideCatalog = {
    brands: [{ slug: 'academia-bauset', name: 'ACADEMIA BAUSET' }],
    styles: [
        { slug: 'retrato-natural-calido', name: 'Retrato Natural Cálido', description: 'Humano y educativo' },
        { slug: 'comic-tinta-bicolor', name: 'Cómic Tinta Bicolor', description: 'Trazo expresivo' },
    ],
    formats: [{ id: 'ig-portrait-feed', platform: 'instagram', name: 'Vertical', aspect_ratio: '4:5' }],
    layouts: [{ id: 'clean', name: 'Limpio', description: 'Espacio para texto' }],
    platforms: ['instagram', 'linkedin'],
}

const brand: CampaignBrandContext = {
    slug: 'academia-bauset',
    name: 'ACADEMIA BAUSET',
    website: 'https://academia-bauset.example',
}

const brief: CampaignAssistantBrief = {
    objective: 'Conseguir nuevas matrículas para el curso 2026-2027.',
    offer: 'Matrícula abierta para cursos de idiomas.',
    subcampaigns: [
        { name: 'Reconocimiento', objective: 'Explicar la propuesta educativa.' },
        { name: 'Conversión', objective: 'Llevar tráfico a la web.' },
    ],
    period: { start: '2026-08-15', end: '2026-09-15' },
    audience: 'Familias con hijos de 6 a 16 años que buscan apoyo educativo.',
    channels: [{ platform: 'instagram', postsPerDay: 3 }, { platform: 'linkedin', postsPerDay: 1 }],
    pillars: ['Resultados', 'Método', 'Historias de alumnos'],
    callsToAction: ['Visita la web', 'Solicita información'],
    keywords: ['matrícula 2026', 'idiomas'],
    metrics: ['Solicitudes de información', 'Visitas a la página de matrícula'],
    style: { mode: 'allowed', values: ['retrato-natural-calido', 'comic-tinta-bicolor'] },
    formats: { mode: 'locked', values: ['ig-portrait-feed'] },
    notes: 'La campaña debe sentirse útil y concreta, no agresiva.',
}

describe('buildCampaignAssistantPrompt', () => {
    it('expresa la frecuencia como publicaciones por día', () => {
        const prompt = buildCampaignAssistantPrompt({ brief, brand, catalog })
        expect(prompt).toContain('instagram — 3 publicaciones por día')
        expect(prompt).toContain('linkedin — 1 publicación por día')
        expect(prompt).not.toContain('publicaciones por semana')
    })

    it('reinterpreta el campo semanal anterior como diario y prioriza el campo nuevo', () => {
        expect(getCampaignPostsPerDay({ platform: 'instagram', postsPerWeek: 2 })).toBe(2)
        expect(getCampaignPostsPerDay({ platform: 'instagram', postsPerDay: 4, postsPerWeek: 2 })).toBe(4)
        expect(normalizeCampaignChannels([{ platform: 'instagram', postsPerWeek: 2 }])).toEqual([
            { platform: 'instagram', postsPerDay: 2 },
        ])
    })

    it('permite seleccionar varios estilos visuales', () => {
        expect(toggleCampaignStyleValue(['retrato-natural-calido'], 'comic-tinta-bicolor')).toEqual([
            'retrato-natural-calido',
            'comic-tinta-bicolor',
        ])
        expect(toggleCampaignStyleValue(['retrato-natural-calido', 'comic-tinta-bicolor'], 'retrato-natural-calido')).toEqual([
            'comic-tinta-bicolor',
        ])
    })

    it('exige que el formulario haya fijado al menos un estilo', () => {
        expect(validateCampaignAssistantBrief({ objective: 'Campaña de prueba', formats: { mode: 'locked', values: ['ig-square'] }, style: { mode: 'delegated' } })).toMatch(/estilo/i)
        expect(validateCampaignAssistantBrief({ objective: 'Campaña de prueba', formats: { mode: 'locked', values: ['ig-square'] }, style: { mode: 'locked', values: ['retrato-natural-calido'] } })).toBeNull()
    })

    it('exige que el formulario haya fijado un formato de imagen', () => {
        expect(validateCampaignAssistantBrief({ objective: 'Campaña de prueba', style: { mode: 'locked', values: ['retrato-natural-calido'] } })).toBe('Selecciona un formato de imagen: elige 1:1 o 4:5.')
        expect(validateCampaignAssistantBrief({ objective: 'Campaña de prueba', formats: { mode: 'locked', values: ['ig-square', 'ig-portrait-feed'] }, style: { mode: 'locked', values: ['retrato-natural-calido'] } })).toBe('Selecciona un formato de imagen: elige 1:1 o 4:5.')
        expect(validateCampaignAssistantBrief({ objective: 'Campaña de prueba', formats: { mode: 'locked', values: ['ig-square'] }, style: { mode: 'locked', values: ['retrato-natural-calido'] } })).toBeNull()
    })

    it('define un contrato editorial mínimo y delega la producción visual a PostLaboratory', () => {
        const prompt = buildCampaignAssistantPrompt({
            brief: { ...brief, style: { mode: 'locked', values: ['retrato-natural-calido'] } },
            brand,
            catalog,
        })

        expect(prompt).toContain('headline')
        expect(prompt).toContain('body')
        expect(prompt).toContain('cta')
        expect(prompt).toContain('visual_content')
        expect(prompt).toContain('image_texts')
        expect(prompt).toContain('cta_url')
        expect(prompt).toContain('body es el caption editorial')
        expect(prompt).toContain('scheduled_at')
        expect(prompt).toContain('El estilo visual está fijado por el formulario')
        expect(prompt).toContain('No generes hashtags')
        expect(prompt).toContain('No generes hashtags, colores ni layouts')
        expect(prompt).toContain('No representes fachadas')
        expect(prompt).toContain('La CTA es obligatoria y debe incluir la URL oficial')
        expect(prompt).toContain('https://academia-bauset.example')
        expect(prompt).toContain('Entregable 1: documento Markdown para uso manual')
        expect(prompt).toContain('Entregable 2: JSON descargable para PostLaboratory')
        expect(prompt).toContain('No basta con mostrar el contenido en la respuesta')
        expect(prompt).toContain('<slug-de-marca>-<slug-de-campaña>.md')
        expect(prompt).toContain('<slug-de-marca>-<slug-de-campaña>.json')
        expect(prompt).toContain('No uses nombres genéricos como `campana.md`')
        expect(prompt).toContain('Adjunta ambos archivos')
        expect(prompt).toContain('ficheros adicionales de contexto')
        expect(prompt).toContain('debes leerlos y utilizarlos')
        expect(prompt).not.toContain('\"hashtags\"')
        expect(prompt).not.toContain('\"prompt\"')
        expect(prompt).not.toContain('\"layout\"')
        expect(prompt).toContain('\"format\"')
    })

    it('construye un mega prompt con briefing, kit y contrato técnico', () => {
        const prompt = buildCampaignAssistantPrompt({ brief, brand, catalog })

        expect(prompt).toContain('estratega de marketing')
        expect(prompt).toContain('Conseguir nuevas matrículas')
        expect(prompt).toContain('2026-08-15')
        expect(prompt).toContain('Familias con hijos de 6 a 16 años')
        expect(prompt).toContain('academia-bauset')
        expect(prompt).toContain('retrato-natural-calido')
        expect(prompt).toContain('calendario')
        expect(prompt).toContain('headline')
        expect(prompt).toContain('no debe reescribirlo')
        expect(prompt).toContain('Entregable 2: JSON descargable para PostLaboratory')
        expect(prompt).toContain('URL oficial dentro del texto de la CTA')
        expect(prompt).toContain('Formato de imagen')
        expect(prompt).toContain('4:5')
        expect(prompt).toContain('ig-portrait-feed')
        expect(prompt).not.toContain('Orientaciones para llamadas a la acción')
    })

    it('limita el estilo a la decisión del formulario y no delega formatos', () => {
        const prompt = buildCampaignAssistantPrompt({
            brief: {
                ...brief,
                style: { mode: 'allowed', values: ['retrato-natural-calido', 'comic-tinta-bicolor'] },
            },
            brand,
            catalog,
        })

        expect(prompt).toContain('El estilo visual está limitado por el formulario')
        expect(prompt).toContain('valores autorizados')
        expect(prompt).toContain('cada publicación debe incluir su propio estilo')
        expect(prompt).toContain('elige exactamente uno')
        expect(prompt).toContain('el campo format')
        expect(prompt).toContain('no uses un estilo global en campaign.defaults')
        expect(prompt).toContain('Formatos de imagen permitidos')
    })

    it('no inventa contexto cuando el briefing es parcial', () => {
        const prompt = buildCampaignAssistantPrompt({
            brief: { objective: 'Presentar un nuevo servicio.' },
            brand,
            catalog,
        })

        expect(prompt).toContain('Presentar un nuevo servicio.')
        expect(prompt).toContain('No se ha especificado')
        expect(prompt).not.toContain('undefined')
    })
})
