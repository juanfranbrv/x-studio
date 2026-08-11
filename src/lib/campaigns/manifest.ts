/**
 * Validacion del manifiesto de campana (docs/API_AUTOMATIZACION.md).
 *
 * Modulo puro a proposito: no toca red ni base de datos. La validacion ocurre
 * ENTERA y ANTES de encolar nada, para que un fichero mal formado no gaste ni
 * un credito ni deje medio lote a medias.
 */

export type CampaignPlatform = 'instagram' | 'tiktok' | 'youtube' | 'linkedin'

export const CAMPAIGN_PLATFORMS: CampaignPlatform[] = ['instagram', 'tiktok', 'youtube', 'linkedin']

export type ManifestDefaults = {
    platform?: CampaignPlatform
    format?: string
    style?: string
    layout?: string
    colors?: string[]
    logo?: boolean
    logo_id?: string
}

export type ManifestPost = {
    ref: string
    scheduled_at?: string
    group?: string
    goal?: string
    /** Prompt en prosa. Si viene, manda sobre headline/body/cta. */
    prompt?: string
    headline?: string
    body?: string
    cta?: string
    hashtags?: string[]
    visual_note?: string
    platform?: CampaignPlatform
    format?: string
    style?: string
    layout?: string
    /** Heredados de `campaign.defaults` al resolver el post. */
    colors?: string[]
    logo?: boolean
    /** Cual de los logos del kit usar (id o posicion "logo-0"). */
    logo_id?: string
}

export type CampaignManifest = {
    version: number
    campaign: {
        name: string
        brand: string
        defaults?: ManifestDefaults
    }
    posts: ManifestPost[]
}

export type ManifestIssue = {
    /** Ruta del problema: "campaign.brand", "posts[3].ref"... */
    path: string
    message: string
    /** Referencia del post afectado, cuando se conoce. */
    ref?: string
}

export type ManifestValidation =
    | { ok: true; manifest: CampaignManifest; warnings: ManifestIssue[] }
    | { ok: false; errors: ManifestIssue[]; warnings: ManifestIssue[] }

const SUPPORTED_VERSION = 1
const MAX_POSTS = 200
const REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : ''
}

function readStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return []
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
}

/**
 * Un post necesita ALGO que describa que generar: o prompt en prosa, o al
 * menos un titular. Los prompts en prosa son validos por si solos (ver §4.2
 * del contrato): no se obliga a trocear el texto en campos.
 */
function hasContent(post: ManifestPost): boolean {
    return Boolean(post.prompt || post.headline || post.body)
}

function validatePlatform(value: unknown, path: string, errors: ManifestIssue[], ref?: string): CampaignPlatform | undefined {
    const platform = readString(value)
    if (!platform) return undefined
    if (!CAMPAIGN_PLATFORMS.includes(platform as CampaignPlatform)) {
        errors.push({
            path,
            ref,
            message: `Plataforma no reconocida: "${platform}". Validas: ${CAMPAIGN_PLATFORMS.join(', ')}.`,
        })
        return undefined
    }
    return platform as CampaignPlatform
}

/**
 * Valida la forma del manifiesto. NO comprueba que la marca, el estilo o el
 * formato existan de verdad: eso exige base de datos y se hace despues, al
 * encolar (ver `collectReferencedSlugs`).
 */
export function validateManifest(input: unknown): ManifestValidation {
    const errors: ManifestIssue[] = []
    const warnings: ManifestIssue[] = []

    if (!isPlainObject(input)) {
        return { ok: false, errors: [{ path: '', message: 'El manifiesto debe ser un objeto JSON.' }], warnings }
    }

    const version = typeof input.version === 'number' ? input.version : 0
    if (version !== SUPPORTED_VERSION) {
        errors.push({
            path: 'version',
            message: `Version no soportada: ${input.version ?? '(ausente)'}. Se espera ${SUPPORTED_VERSION}.`,
        })
    }

    const campaignRaw = isPlainObject(input.campaign) ? input.campaign : null
    if (!campaignRaw) {
        errors.push({ path: 'campaign', message: 'Falta el bloque "campaign".' })
    }

    const name = readString(campaignRaw?.name)
    if (campaignRaw && !name) {
        errors.push({ path: 'campaign.name', message: 'La campana necesita un nombre: agrupa las piezas en la Biblioteca.' })
    }

    const brand = readString(campaignRaw?.brand)
    if (campaignRaw && !brand) {
        errors.push({ path: 'campaign.brand', message: 'Falta "campaign.brand" (slug del kit de marca).' })
    }

    const defaultsRaw = isPlainObject(campaignRaw?.defaults) ? campaignRaw!.defaults as Record<string, unknown> : {}
    const defaults: ManifestDefaults = {
        platform: validatePlatform(defaultsRaw.platform, 'campaign.defaults.platform', errors),
        format: readString(defaultsRaw.format) || undefined,
        style: readString(defaultsRaw.style) || undefined,
        layout: readString(defaultsRaw.layout) || undefined,
        colors: readStringArray(defaultsRaw.colors),
        logo: typeof defaultsRaw.logo === 'boolean' ? defaultsRaw.logo : undefined,
        logo_id: readString(defaultsRaw.logo_id) || undefined,
    }

    const postsRaw = Array.isArray(input.posts) ? input.posts : null
    if (!postsRaw) {
        errors.push({ path: 'posts', message: 'Falta la lista "posts".' })
    } else if (postsRaw.length === 0) {
        errors.push({ path: 'posts', message: 'La campana no tiene ninguna publicacion.' })
    } else if (postsRaw.length > MAX_POSTS) {
        errors.push({ path: 'posts', message: `Demasiadas publicaciones: ${postsRaw.length}. Maximo ${MAX_POSTS} por lote.` })
    }

    const posts: ManifestPost[] = []
    const seenRefs = new Set<string>()

    for (const [index, raw] of (postsRaw ?? []).entries()) {
        const path = `posts[${index}]`

        if (!isPlainObject(raw)) {
            errors.push({ path, message: 'Cada publicacion debe ser un objeto.' })
            continue
        }

        const ref = readString(raw.ref)
        if (!ref) {
            errors.push({ path: `${path}.ref`, message: 'Falta la referencia (identifica la imagen resultante, p. ej. "BAU-01").' })
        } else if (!REF_PATTERN.test(ref)) {
            errors.push({
                path: `${path}.ref`,
                ref,
                message: `Referencia no valida: "${ref}". Solo letras, numeros, guion y guion bajo (se usa como nombre de fichero).`,
            })
        } else if (seenRefs.has(ref.toLowerCase())) {
            errors.push({ path: `${path}.ref`, ref, message: `Referencia duplicada: "${ref}".` })
        } else {
            seenRefs.add(ref.toLowerCase())
        }

        const scheduledAt = readString(raw.scheduled_at)
        if (scheduledAt && Number.isNaN(Date.parse(scheduledAt))) {
            errors.push({ path: `${path}.scheduled_at`, ref, message: `Fecha no valida: "${scheduledAt}". Se espera formato ISO 8601.` })
        }

        const post: ManifestPost = {
            ref,
            scheduled_at: scheduledAt || undefined,
            group: readString(raw.group) || undefined,
            goal: readString(raw.goal) || undefined,
            prompt: readString(raw.prompt) || undefined,
            headline: readString(raw.headline) || undefined,
            body: readString(raw.body) || undefined,
            cta: readString(raw.cta) || undefined,
            hashtags: readStringArray(raw.hashtags),
            visual_note: readString(raw.visual_note) || undefined,
            platform: validatePlatform(raw.platform, `${path}.platform`, errors, ref),
            format: readString(raw.format) || undefined,
            style: readString(raw.style) || undefined,
            layout: readString(raw.layout) || undefined,
        }

        if (!hasContent(post)) {
            errors.push({
                path,
                ref,
                message: 'La publicacion no describe nada que generar: necesita "prompt", "headline" o "body".',
            })
        }

        if (!scheduledAt) {
            warnings.push({
                path: `${path}.scheduled_at`,
                ref,
                message: 'Sin fecha: la pieza ira a la tira "sin fecha" del calendario.',
            })
        }

        posts.push(post)
    }

    if (errors.length > 0) return { ok: false, errors, warnings }

    return {
        ok: true,
        warnings,
        manifest: {
            version,
            campaign: { name, brand, defaults },
            posts,
        },
    }
}

/**
 * Slugs de estilo y ids de formato/layout referenciados por el manifiesto, ya
 * deduplicados. Quien encola los contrasta contra la base de datos para poder
 * fallar con "unknown_style" ANTES de generar nada.
 */
export function collectReferencedSlugs(manifest: CampaignManifest): {
    styles: string[]
    formats: string[]
    layouts: string[]
} {
    const styles = new Set<string>()
    const formats = new Set<string>()
    const layouts = new Set<string>()

    const add = (set: Set<string>, value?: string) => {
        if (value) set.add(value)
    }

    add(styles, manifest.campaign.defaults?.style)
    add(formats, manifest.campaign.defaults?.format)
    add(layouts, manifest.campaign.defaults?.layout)

    for (const post of manifest.posts) {
        add(styles, post.style)
        add(formats, post.format)
        add(layouts, post.layout)
    }

    return { styles: [...styles], formats: [...formats], layouts: [...layouts] }
}

/**
 * Aplica los valores por defecto de la campana a un post concreto. Lo del post
 * siempre gana sobre lo de la campana.
 */
export function resolvePost(manifest: CampaignManifest, post: ManifestPost): Required<Pick<ManifestPost, 'ref'>> & ManifestPost {
    const defaults = manifest.campaign.defaults ?? {}
    return {
        ...post,
        platform: post.platform ?? defaults.platform,
        format: post.format ?? defaults.format,
        style: post.style ?? defaults.style,
        layout: post.layout ?? defaults.layout,
        // La paleta y el logo son de campana, pero viajan resueltos en cada
        // post para que el worker no tenga que releer el manifiesto entero.
        colors: post.colors ?? defaults.colors,
        logo: post.logo ?? defaults.logo,
        logo_id: post.logo_id ?? defaults.logo_id,
    }
}
