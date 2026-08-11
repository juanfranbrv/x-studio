/**
 * Construccion del paquete descargable de una campana.
 *
 * El ZIP no es solo un monton de PNG: sin metadatos, quien programa el
 * calendario (en el caso de Juanfran, un agente sobre Postiz) tendria que
 * adivinar que texto y que fecha corresponden a cada imagen. Por eso ademas de
 * las imagenes se incluye `campaign.json` y `campaign.csv` con la
 * correspondencia completa.
 */

export type ExportItem = {
    ref: string
    status: string
    asset_key?: string | null
    scheduled_at?: string | null
    payload?: Record<string, unknown> | null
}

export type ExportEntry = {
    ref: string
    file: string
    scheduled_at: string | null
    platform: string | null
    headline: string | null
    body: string | null
    cta: string | null
    hashtags: string[]
}

const CSV_COLUMNS = ['ref', 'file', 'scheduled_at', 'platform', 'headline', 'body', 'cta', 'hashtags'] as const

function text(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null
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

        return {
            ref: item.ref,
            file: fileNameFor(item.ref),
            scheduled_at: item.scheduled_at ?? text(payload.scheduled_at),
            platform: text(payload.platform),
            headline: text(payload.headline),
            body: text(payload.body),
            cta: text(payload.cta),
            hashtags,
        }
    })
}

/** Escapa un valor para CSV: comillas dobladas y entrecomillado si hace falta. */
export function escapeCsv(value: unknown): string {
    const raw = value === null || value === undefined ? '' : String(value)
    if (!/[",\n\r]/.test(raw)) return raw
    return `"${raw.replaceAll('"', '""')}"`
}

export function buildCampaignCsv(entries: ExportEntry[]): string {
    const filas = entries.map((entry) =>
        CSV_COLUMNS.map((column) => {
            const value = column === 'hashtags' ? entry.hashtags.join(' ') : entry[column]
            return escapeCsv(value)
        }).join(','),
    )

    return [CSV_COLUMNS.join(','), ...filas].join('\r\n')
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
