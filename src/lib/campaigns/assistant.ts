import { buildCampaignPrompt, type GuideCatalog } from './guide'
import { buildContextDocumentPromptBlock, type AnalyticalContextDocument } from '@/lib/prompts/context-document'

export type CampaignDecisionMode = 'locked' | 'allowed' | 'delegated'

export type CampaignDecision = {
    mode: CampaignDecisionMode
    values?: string[]
}

export type CampaignChannel = {
    platform: string
    postsPerDay?: number
    /** @deprecated Campo ambiguo anterior; su cifra se reinterpreta como diaria. */
    postsPerWeek?: number
}

export const CAMPAIGN_IMAGE_FORMATS = {
    'ig-square': { ratio: '1:1', label: 'Cuadrado' },
    'ig-portrait-feed': { ratio: '4:5', label: 'Vertical' },
} as const

export type CampaignAssistantBrief = {
    objective: string
    offer?: string
    subcampaigns?: Array<{ name: string; objective?: string }>
    period?: { start?: string; end?: string }
    audience?: string
    tone?: string
    channels?: CampaignChannel[]
    pillars?: string[]
    formats?: CampaignDecision
    callsToAction?: string[]
    keywords?: string[]
    metrics?: string[]
    style?: CampaignDecision
    /** Se conserva para briefs antiguos; los activos los gestiona PostLaboratory. */
    auxiliaryLogos?: CampaignDecision
    notes?: string
}

export type CampaignBrandContext = {
    slug: string
    name: string
    businessOverview?: string
    audience?: string[]
    tone?: string[]
    values?: string[]
    website?: string
    auxiliaryLogos?: Array<{ id: string; label: string }>
}

type BuildCampaignAssistantPromptInput = {
    brief: CampaignAssistantBrief
    brand: CampaignBrandContext
    catalog: GuideCatalog
    contextDocument: AnalyticalContextDocument | null
}

function clean(value: string | undefined): string {
    return value?.trim() || ''
}

export function toggleCampaignStyleValue(values: string[] | undefined, value: string): string[] {
    const normalized = (values ?? []).map((item) => item.trim()).filter(Boolean)
    const nextValue = value.trim()
    if (!nextValue) return normalized
    return normalized.includes(nextValue)
        ? normalized.filter((item) => item !== nextValue)
        : [...normalized, nextValue]
}

function valueOrFallback(value: string | undefined): string {
    return clean(value) || 'No se ha especificado.'
}

function listOrFallback(values: string[] | undefined): string {
    const normalized = (values ?? []).map(clean).filter(Boolean)
    return normalized.length > 0 ? normalized.map((value) => '- ' + value).join('\n') : '- No se ha especificado.'
}

function renderStyleDecision(decision: CampaignDecision | undefined): string {
    if (!decision || !(decision.values ?? []).length) {
        return 'El estilo visual está fijado por el formulario, pero todavía no se ha seleccionado ningún valor.'
    }

    const values = decision.values?.map(clean).filter(Boolean) ?? []
    if (decision.mode === 'locked') {
        return 'El estilo visual está fijado por el formulario. Incluye este mismo valor en el campo style de cada publicación:\n' + values.map((value) => '- ' + value).join('\n')
    }

    if (decision.mode === 'allowed') {
        return 'El estilo visual está limitado por el formulario: cada publicación debe incluir su propio estilo; elige exactamente uno de estos valores autorizados según el objetivo, el pilar y el tipo de contenido de esa publicación. Puedes repetirlos cuando sea coherente:\n' + values.map((value) => '- ' + value).join('\n')
    }

    return 'El estilo visual debe resolverse desde el formulario; no inventes ni describas estilos.'
}

function renderFormatDecision(decision: CampaignDecision | undefined): string {
    const values = decision?.values?.map(clean).filter(Boolean) ?? []
    const selected = values.length === 1 ? CAMPAIGN_IMAGE_FORMATS[values[0] as keyof typeof CAMPAIGN_IMAGE_FORMATS] : undefined

    if (!selected) {
        return 'Formato de imagen: falta una elección única. Debe ser ig-square (1:1) o ig-portrait-feed (4:5).'
    }

    return `Formato de imagen fijado por el formulario para toda la campaña: ${values[0]} (${selected.ratio}, ${selected.label}). Incluye ese mismo identificador en format para cada publicación y ese mismo ratio en cada prompt Markdown.`
}

function renderSubcampaigns(subcampaigns: CampaignAssistantBrief['subcampaigns']): string {
    if (!subcampaigns || subcampaigns.length === 0) return '- No se ha especificado.'

    return subcampaigns
        .map((subcampaign) => {
            const name = valueOrFallback(subcampaign.name)
            const objective = clean(subcampaign.objective)
            return '- ' + name + (objective ? ': ' + objective : '')
        })
        .join('\n')
}

function renderChannels(channels: CampaignAssistantBrief['channels']): string {
    if (!channels || channels.length === 0) return '- No se ha especificado.'

    return channels
        .map((channel) => {
            const platform = valueOrFallback(channel.platform)
            const postsPerDay = getCampaignPostsPerDay(channel)
            const frequency = typeof postsPerDay === 'number'
                ? ' — ' + postsPerDay + (postsPerDay === 1 ? ' publicación por día' : ' publicaciones por día')
                : ''
            return '- ' + platform + frequency
        })
        .join('\n')
}

export function getCampaignPostsPerDay(channel: CampaignChannel): number | undefined {
    if (typeof channel.postsPerDay === 'number') return channel.postsPerDay
    if (typeof channel.postsPerWeek === 'number') return channel.postsPerWeek
    return undefined
}

export function normalizeCampaignChannels(channels: CampaignChannel[] | undefined): CampaignChannel[] {
    return (channels ?? []).map((channel) => ({
        platform: channel.platform,
        postsPerDay: getCampaignPostsPerDay(channel),
    }))
}

function renderBrandContext(brand: CampaignBrandContext): string {
    return [
        '## Kit de marca',
        '',
        '- Nombre: ' + valueOrFallback(brand.name),
        '- Slug obligatorio para campaign.brand: ' + valueOrFallback(brand.slug),
        '- URL oficial que debe aparecer dentro de la CTA y repetirse en cta_url: ' + valueOrFallback(brand.website),
        '',
        'No describas ni reproduzcas la identidad visual del kit. PostLaboratory resolverá los colores, tipografías, logotipos y demás activos a partir de este identificador. La URL indicada debe aparecer dentro de cta y repetirse sin texto adicional en cta_url.',
    ].join('\n')
}

function renderBrief(brief: CampaignAssistantBrief): string {
    const period = brief.period
        ? valueOrFallback(brief.period.start) + ' → ' + valueOrFallback(brief.period.end)
        : 'No se ha especificado.'

    return [
        '## Brief de campaña',
        '',
        '### Objetivo y oferta',
        '- Objetivo principal: ' + valueOrFallback(brief.objective),
        '- Oferta, producto o servicio: ' + valueOrFallback(brief.offer),
        '- Periodo: ' + period,
        '',
        '### Subcampañas',
        renderSubcampaigns(brief.subcampaigns),
        '',
        '### Audiencia y comunicación',
        '- Público específico: ' + valueOrFallback(brief.audience),
        '- Tono específico de esta campaña: ' + valueOrFallback(brief.tone),
        '',
        '### Plataformas y frecuencia',
        renderChannels(brief.channels),
        '',
        '### Estrategia de contenido',
        '- Pilares:',
        listOrFallback(brief.pillars),
        '- CTA: la genera el agente externo, debe incluir la URL oficial del kit como parte del texto y debe separar esa misma URL en cta_url.',
        '- Palabras clave de campaña:',
        listOrFallback(brief.keywords),
        '- Métricas de éxito:',
        listOrFallback(brief.metrics),
        '',
        '### Dirección creativa',
        renderFormatDecision(brief.formats),
        '',
        renderStyleDecision(brief.style),
        '',
        'El formato de imagen se fija en el formulario y se repite en cada publicación. El agente externo elige intent según la función de cada publicación; PostLaboratory usa ese intent para elegir automáticamente el layout predeterminado. Los logos auxiliares, los datos de contacto, los colores y demás activos los gestiona PostLaboratory desde la interfaz.',
        '',
        '### Notas adicionales',
        valueOrFallback(brief.notes),
    ].join('\n')
}

function integrityContract(): string {
    return [
        '## Contrato de integridad del contenido',
        '',
        'El contenido final producido en headline, image_texts, body y cta es definitivo. PostLaboratory no debe reescribirlo, resumirlo, traducirlo, corregirlo, ampliarlo, cambiar su orden ni sustituirlo por una versión alternativa.',
        '',
        '- headline, image_texts, body y cta contienen el contenido editorial final y deben conservarse literalmente.',
        '- body es el caption editorial para publicar y no debe aparecer dentro de la imagen.',
        '- image_texts contiene de 2 a 4 textos visibles, breves y escaneables; no debe reproducir el párrafo completo del body.',
        '- La CTA es obligatoria y debe incluir la URL oficial dentro del texto de la CTA. La genera el agente externo. cta_url repite exclusivamente esa URL exacta para que PostLaboratory la trate como elemento protagonista.',
        '- visual_content describe únicamente lo que debe verse y no debe convertirse en texto visible salvo que también se indique expresamente en headline, image_texts o cta.',
        '- No generes hashtags: PostLaboratory los genera a partir del contenido.',
        '- No generes prompt de imagen: PostLaboratory construye internamente el prompt técnico.',
        '- PostLaboratory puede añadir instrucciones técnicas de renderizado, pero no puede cambiar el contenido editorial ya decidido.',
    ].join('\n')
}

function agentContract(): string {
    return [
        '## Encargo al agente externo',
        '',
        'Actúa como estratega de marketing, director de contenidos y planificador editorial.',
        '',
        'Fase 1: diseña la estrategia completa a partir del brief, incluyendo subcampañas, pilares, distribución, frecuencia y calendario.',
        'Fase 2: convierte esa estrategia en publicaciones completas para PostLaboratory y prepara dos ficheros descargables independientes con un nombre significativo: `<slug-de-marca>-<slug-de-campaña>.md` para uso manual y el mismo nombre base con extensión `.json` para inyección en PostLaboratory.',
        '',
        'Si recibes ficheros adicionales de contexto junto con este encargo, debes leerlos y utilizarlos para completar la estrategia, el calendario, el contenido editorial y las ideas visuales. No los ignores ni inventes datos que los contradigan. El briefing estructurado y el kit de marca mandan sobre identidad, formato y activos; los ficheros aportan el contexto específico de la campaña.',
        '',
        'Cada publicación debe incluir headline, image_texts, body, cta, cta_url, visual_content, intent, scheduled_at, su propio style y el campo format. body es el caption editorial y no debe aparecer en la imagen; image_texts contiene de 2 a 4 textos visibles breves. Elige exactamente un estilo autorizado por publicación; no uses un estilo global en campaign.defaults. Repite en cada publicación el formato fijado por el formulario: ig-square (1:1) o ig-portrait-feed (4:5). Elige intent según la función comunicativa para que PostLaboratory seleccione el layout predeterminado. La CTA es obligatoria y debe incluir la URL oficial dentro del texto de la CTA; cta_url debe repetir esa URL exacta. La genera el agente externo.',
        '',
        'Adjunta ambos archivos con ese nombre significativo y ofrécelos claramente para su descarga. Usa el slug de la marca y un slug descriptivo de la campaña, en minúsculas, sin tildes y separado por guiones; no uses nombres genéricos como `campana.md` o `campana.json` salvo que la campaña se llame literalmente «Campaña». Ambos archivos deben compartir exactamente el mismo nombre base y diferenciarse solo por `.md` y `.json`. No basta con mostrar el contenido en la respuesta, pegarlo en bloques de código o describir cómo guardarlo manualmente. El fichero Markdown debe contener un bloque de código copiable por publicación. Cada bloque debe empezar por «Deseo crear una publicación para redes sociales (Facebook e Instagram) con este objetivo:» y continuar con «Este es el contenido que debe aparecer y no debes alterarlo:». El fichero JSON debe ser válido y estar listo para descargar e inyectar en PostLaboratory. Después puedes mostrar una vista previa, pero nunca como sustituto de los dos ficheros. No generes hashtags, colores ni layouts. No devuelvas prompts técnicos de imagen ni decisiones de activos de marca.',
    ].join('\n')
}

export function validateCampaignAssistantBrief(brief: CampaignAssistantBrief): string | null {
    if (!brief.objective.trim()) return 'El objetivo principal es obligatorio.'

    const formats = brief.formats?.values?.map(clean).filter(Boolean) ?? []
    if (formats.length !== 1 || !Object.prototype.hasOwnProperty.call(CAMPAIGN_IMAGE_FORMATS, formats[0])) {
        return 'Selecciona un formato de imagen: elige 1:1 o 4:5.'
    }

    const styles = brief.style?.values?.map(clean).filter(Boolean) ?? []
    if (brief.style?.mode === 'delegated' || styles.length === 0) {
        return 'Selecciona al menos un estilo visual en el formulario.'
    }

    return null
}

function narrowCatalog(catalog: GuideCatalog, brief: CampaignAssistantBrief, brand: CampaignBrandContext): GuideCatalog {
    const selectedStyles = new Set((brief.style?.values ?? []).map(clean).filter(Boolean))
    const selectedFormats = new Set((brief.formats?.values ?? []).map(clean).filter(Boolean))
    const availableFormats = catalog.formats.filter((item) => Object.prototype.hasOwnProperty.call(CAMPAIGN_IMAGE_FORMATS, item.id) && item.platform === 'instagram')

    return {
        ...catalog,
        brands: catalog.brands.filter((item) => item.slug === brand.slug),
        styles: selectedStyles.size > 0 ? catalog.styles.filter((item) => selectedStyles.has(item.slug)) : catalog.styles,
        formats: selectedFormats.size > 0 ? availableFormats.filter((item) => selectedFormats.has(item.id)) : availableFormats,
        layouts: [],
        layoutsByIntent: [],
    }
}

export function buildCampaignAssistantPrompt({ brief, brand, catalog, contextDocument }: BuildCampaignAssistantPromptInput): string {
    const scopedCatalog = narrowCatalog(catalog, brief, brand)

    return [
        agentContract(),
        buildContextDocumentPromptBlock(contextDocument),
        renderBrandContext(brand),
        renderBrief(brief),
        integrityContract(),
        '## Contrato técnico de salida',
        buildCampaignPrompt(scopedCatalog),
    ].filter(Boolean).join('\n\n')
}
