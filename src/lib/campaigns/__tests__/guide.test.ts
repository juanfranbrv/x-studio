import { describe, expect, it } from 'vitest'
import { buildCampaignPrompt, buildCatalogSummary, type GuideCatalog } from '../guide'

const catalogo: GuideCatalog = {
    brands: [{ slug: 'academia-bauset', name: 'ACADEMIA BAUSET' }],
    styles: [
        { slug: 'retrato-natural-calido', name: 'Retrato Natural Cálido' },
        { slug: 'comic-tinta-bicolor', name: 'Cómic Tinta Bicolor', description: 'Trazo grueso' },
    ],
    formats: [
        { id: 'ig-square', platform: 'instagram', name: 'Cuadrado', aspect_ratio: '1:1', description: 'Feed' },
        { id: 'ig-portrait-feed', platform: 'instagram', name: 'Vertical', aspect_ratio: '4:5' },
    ],
    layouts: [{ id: 'clean', name: 'Limpio', description: 'Espacio para texto' }],
    platforms: ['instagram', 'linkedin'],
    intents: [
        { id: 'servicio', name: 'El Servicio', description: 'Promoción de un servicio' },
        { id: 'lista', name: 'La Lista', description: 'Información breve estructurada' },
    ],
}

describe('buildCampaignPrompt', () => {
    const prompt = buildCampaignPrompt(catalogo)

    it('incluye todos los identificadores elegibles', () => {
        expect(prompt).toContain('academia-bauset')
        expect(prompt).toContain('retrato-natural-calido')
        expect(prompt).toContain('comic-tinta-bicolor')
        expect(prompt).toContain('linkedin')
        expect(prompt).not.toContain('clean')
        expect(prompt).not.toContain('layouts por tipo')
    })

    it('advierte de que no se pueden inventar identificadores', () => {
        expect(prompt.toLowerCase()).toContain('inventado')
    })

    it('deja claro que PostLaboratory resuelve la identidad visual', () => {
        expect(prompt).toContain('PostLaboratory')
        expect(prompt).toContain('layout predeterminado')
        expect(prompt).toContain('No generes hashtags')
    })

    it('exige dos entregables: prompts manuales en Markdown y JSON descargable', () => {
        expect(prompt).toContain('## Entregable 1: documento Markdown para uso manual')
        expect(prompt).toContain('No basta con mostrar el contenido en la respuesta')
        expect(prompt).toContain('<slug-de-marca>-<slug-de-campaña>.md')
        expect(prompt).toContain('No uses nombres genéricos como `campana.md`')
        expect(prompt).toContain('archivo descargable independiente')
        expect(prompt).toContain('Deseo crear una publicación para redes sociales (Facebook e Instagram) con este objetivo:')
        expect(prompt).toContain('Este es el contenido que debe aparecer y no debes alterarlo:')
        expect(prompt).toContain('CTA: <cta literal con la URL oficial incluida>')
        expect(prompt).toContain('URL protagonista: <cta_url exacta>')
        expect(prompt).toContain('Textos de apoyo visibles:')
        expect(prompt).toContain('Body/caption para publicar (NO debe aparecer en la imagen):')
        expect(prompt).toContain('Formato de imagen: <1:1 (ig-square) o 4:5 (ig-portrait-feed)>')
        expect(prompt).toContain('## Entregable 2: JSON descargable para PostLaboratory')
        expect(prompt).toContain('<slug-de-marca>-<slug-de-campaña>.json')
        expect(prompt).toContain('Adjunta ambos archivos')
    })

    it('obliga a utilizar los ficheros adicionales de contexto', () => {
        expect(prompt).toContain('ficheros adicionales de contexto')
        expect(prompt).toContain('debes leerlos y utilizarlos')
    })

    it('describe la estructura del manifiesto', () => {
        expect(prompt).toContain('"version": 1')
        expect(prompt).toContain('"posts"')
        expect(prompt).toContain('scheduled_at')
        expect(prompt).toContain('ref')
        expect(prompt).toContain('"style": "<slug de estilo autorizado para esta publicación>"')
        expect(prompt).toContain('"format": "<identificador de formato autorizado para esta publicación>"')
        expect(prompt).toContain('"intent": "<intención autorizada para elegir el layout predeterminado>"')
        expect(prompt).toContain('"image_texts": [')
        expect(prompt).toContain('"cta_url": "<URL oficial exacta que también aparece dentro de cta>"')
        expect(prompt).toContain('scheduled_at, style, format, intent, headline')
        expect(prompt).toContain('body es el caption editorial')
        expect(prompt).toContain('image_texts contiene de 2 a 4 textos breves')
        expect(prompt).toContain('PostLaboratory elige automáticamente el layout predeterminado')
        expect(prompt).toContain('Cada publicación debe elegir exactamente un estilo')
        expect(prompt).toContain('No uses "campaign.defaults.style"')
        expect(prompt).toContain('ig-square')
        expect(prompt).toContain('ig-portrait-feed')
        expect(prompt).toContain('## Intenciones permitidas (intent)')
        expect(prompt).toContain('servicio')
    })

    it('aguanta catalogos vacios sin romperse', () => {
        const vacio = buildCampaignPrompt({ brands: [], styles: [], formats: [], layouts: [], platforms: [] })
        expect(vacio).toContain('no hay marcas disponibles')
        expect(vacio).toContain('sin estilos')
    })
})

describe('buildCatalogSummary', () => {
    it('resume el tamano de cada catalogo', () => {
        expect(buildCatalogSummary(catalogo)).toBe('1 marcas · 2 estilos')
    })
})
