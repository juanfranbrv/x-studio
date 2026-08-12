/**
 * Construccion del paquete descargable de una campana.
 *
 * El ZIP no es solo un monton de PNG: sin metadatos, quien programa el
 * calendario (en el caso de Juanfran, un agente sobre Postiz) tendria que
 * adivinar que texto y que fecha corresponden a cada imagen. Por eso ademas de
 * las imagenes se incluye `campaign.json` y `campaign.csv` con la
 * correspondencia completa.
 *
 * Cada fila lleva DOS bloques: el de publicacion (texto, fecha, redes) y el de
 * produccion (estilo, contenido visual, composicion, formato, activos de marca
 * y prosa de intencion). El segundo se anadio el 2026-08-12: sin el, el
 * paquete no decia con que estilo ni con que descripcion visual se genero cada
 * pieza, asi que no habia forma de auditarla ni de repetirla igual.
 */

export type ExportItem = {
    ref: string
    status: string
    asset_key?: string | null
    scheduled_at?: string | null
    payload?: Record<string, unknown> | null
}

/**
 * Una fila del paquete. Se ordena en dos bloques:
 *
 * 1. PUBLICACION: lo que necesita quien programa el calendario.
 * 2. PRODUCCION: lo que se le pidio a la plataforma para esa imagen (estilo,
 *    contenido visual, composicion, activos de marca...). Sin este bloque el
 *    ZIP no permite auditar por que salio una pieza como salio, ni rehacerla
 *    igual: los datos existen en el manifiesto pero no salian del sistema.
 */
export type ExportEntry = {
    ref: string
    file: string
    scheduled_at: string | null
    /** Redes donde hay que publicar la pieza. */
    publish_to: string[]
    /** Red para la que se optimizo la imagen (encuadre). */
    optimized_for: string | null
    headline: string | null
    body: string | null
    cta: string | null
    hashtags: string[]
    // --- Produccion -------------------------------------------------------
    /** Subcampana a la que pertenece la pieza. */
    group: string | null
    goal: string | null
    /** Que se ve en la imagen: la descripcion que guio al generador. */
    visual_content: string | null
    /** Slug del estilo visual aplicado. */
    style: string | null
    /** Id de la composicion aplicada. */
    layout: string | null
    /** Id del formato (encuadre y proporcion). */
    format: string | null
    /** Paleta usada, si la campana la fijo por encima de la del kit. */
    colors: string[]
    /** Si se incrusto el logo principal de la marca. */
    logo: boolean | null
    /** Datos del kit que la campana pidio imprimir: cta_url, phone, email... */
    brand_assets: string[]
    /** Prosa de intencion del manifiesto. Va al final por longitud. */
    prompt: string | null
}

const CSV_COLUMNS = [
    'ref',
    'file',
    'scheduled_at',
    'publish_to',
    'optimized_for',
    'headline',
    'body',
    'cta',
    'hashtags',
    'group',
    'goal',
    'visual_content',
    'style',
    'layout',
    'format',
    'colors',
    'logo',
    'brand_assets',
    'prompt',
] as const

/** Columnas que se serializan uniendo una lista con un separador propio. */
const CSV_LIST_SEPARATORS: Partial<Record<(typeof CSV_COLUMNS)[number], string>> = {
    hashtags: ' ',
    publish_to: ', ',
    colors: ' ',
    brand_assets: ', ',
}

/** Activos del kit que la campana puede pedir que aparezcan en la imagen. */
const BRAND_ASSET_KEYS = ['cta_url', 'phone', 'email', 'address', 'extra_logos'] as const

/**
 * Redes por defecto cuando el lote se genero antes de que existiera
 * `publish_to`: sin esto, las campanas ya generadas exportarian una sola red.
 */
const PUBLISH_TO_POR_DEFECTO = ['facebook', 'instagram']

function text(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null
}

function stringList(value: unknown): string[] {
    if (!Array.isArray(value)) return []
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

/**
 * Nombres de los activos de marca que la campana activo. Un activo cuenta como
 * activo tanto si se pidio del kit (`true`) como si se piso con un valor
 * concreto (una cadena) o con una lista de logos.
 */
function activeBrandAssets(payload: Record<string, unknown>): string[] {
    return BRAND_ASSET_KEYS.filter((key) => {
        const value = payload[key]
        if (value === true) return true
        if (typeof value === 'string') return value.trim().length > 0
        if (Array.isArray(value)) return value.length > 0
        return false
    })
}

/** Nombre de fichero de una publicacion: su referencia, como pedia el plan. */
export function fileNameFor(ref: string, extension = 'png'): string {
    const safe = (ref || 'sin-referencia').replace(/[^A-Za-z0-9_-]/g, '-')
    return `${safe}.${extension}`
}

/**
 * Solo se exportan las publicaciones generadas. Un lote a medias debe poder
 * descargarse sin esperar a que termine entero.
 */
export function selectExportable(items: ExportItem[]): ExportItem[] {
    return items.filter((item) => item.status === 'done' && Boolean(item.asset_key))
}

export function buildExportEntries(items: ExportItem[]): ExportEntry[] {
    return selectExportable(items).map((item) => {
        const payload = (item.payload ?? {}) as Record<string, unknown>
        const hashtags = Array.isArray(payload.hashtags)
            ? payload.hashtags.filter((tag): tag is string => typeof tag === 'string')
            : []

        const publishTo = stringList(payload.publish_to)

        return {
            ref: item.ref,
            file: fileNameFor(item.ref),
            scheduled_at: item.scheduled_at ?? text(payload.scheduled_at),
            publish_to: publishTo.length > 0 ? publishTo : PUBLISH_TO_POR_DEFECTO,
            optimized_for: text(payload.platform),
            headline: text(payload.headline),
            body: text(payload.body),
            cta: text(payload.cta),
            hashtags,
            group: text(payload.group),
            goal: text(payload.goal),
            // `visual_note` es el alias historico del campo: los lotes viejos
            // lo guardaron asi y tienen que exportarse igual.
            visual_content: text(payload.visual_content) ?? text(payload.visual_note),
            style: text(payload.style),
            layout: text(payload.layout),
            format: text(payload.format),
            colors: stringList(payload.colors),
            logo: typeof payload.logo === 'boolean' ? payload.logo : null,
            brand_assets: activeBrandAssets(payload),
            prompt: text(payload.prompt),
        }
    })
}

/** Escapa un valor para CSV: comillas dobladas y entrecomillado si hace falta. */
export function escapeCsv(value: unknown): string {
    const raw = value === null || value === undefined ? '' : String(value)
    if (!/[",\n\r]/.test(raw)) return raw
    return `"${raw.replaceAll('"', '""')}"`
}

/**
 * Marca de orden de bytes UTF-8.
 *
 * Sin ella, Excel abre el CSV como ANSI y destroza cualquier acento: "Mañana"
 * se convierte en "MaÃ±ana". El fichero estaba bien codificado, pero quien lo
 * abre no tiene forma de saberlo. Con el BOM, Excel lo reconoce solo.
 */
const BOM_UTF8 = '\uFEFF'

export function buildCampaignCsv(entries: ExportEntry[]): string {
    const filas = entries.map((entry) =>
        CSV_COLUMNS.map((column) => {
            const separator = CSV_LIST_SEPARATORS[column]
            const value = entry[column]
            if (separator && Array.isArray(value)) return escapeCsv(value.join(separator))
            return escapeCsv(value)
        }).join(','),
    )

    return BOM_UTF8 + [CSV_COLUMNS.join(','), ...filas].join('\r\n')
}

export function buildCampaignJson(campaignName: string, entries: ExportEntry[]): string {
    return JSON.stringify(
        {
            campaign: campaignName,
            exported_at: new Date().toISOString(),
            total: entries.length,
            posts: entries,
        },
        null,
        2,
    )
}

/** Nombre del ZIP, derivado del nombre de campana. */
export function zipFileName(campaignName: string): string {
    const base = (campaignName || 'campana')
        .normalize('NFD')
        .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)
        .replace(/-+$/g, '')

    return `${base || 'campana'}.zip`
}
