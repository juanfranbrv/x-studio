import type { ContextItem } from '@/lib/campaigns/brand-logo'

/**
 * Activos del kit que la campana puede pedir que aparezcan en la imagen:
 * la llamada a la accion con la web, los datos de contacto y los logos
 * auxiliares (sellos, certificaciones, colaboradores).
 *
 * El formato de las lineas replica el que ya usa la plataforma al componer el
 * contexto de texto (`CTA:`, `URL:`, `ASSET_...`), para no introducir un
 * dialecto nuevo que el modelo interprete de otra manera.
 */

type BrandLike = {
    url?: unknown
    phones?: unknown
    emails?: unknown
    addresses?: unknown
    text_assets?: unknown
    logos?: unknown
    cta_url_enabled?: unknown
}

/** `true` = tomar el valor del kit; una cadena = usar ese valor tal cual. */
export type AssetChoice = boolean | string | undefined

function firstString(value: unknown): string | null {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (Array.isArray(value)) {
        for (const entry of value) {
            const found = firstString(entry)
            if (found) return found
        }
    }
    return null
}

/** Resuelve una eleccion contra el kit: valor explicito, del kit, o nada. */
export function resolveAsset(choice: AssetChoice, fromKit: unknown): string | null {
    if (choice === false || choice === undefined) return null
    if (typeof choice === 'string') return choice.trim() || null
    return firstString(fromKit)
}

export type BrandTextOptions = {
    cta_url?: AssetChoice
    phone?: AssetChoice
    email?: AssetChoice
    address?: AssetChoice
}

/**
 * Lineas de texto de marca que deben aparecer en la imagen. Se devuelven como
 * bloque etiquetado para que el generador las trate como contenido obligatorio
 * y no como sugerencia.
 */
export function buildBrandTextBlock(brand: BrandLike | null | undefined, options: BrandTextOptions): string {
    if (!brand) return ''

    const url = resolveAsset(options.cta_url, brand.url)
    const phone = resolveAsset(options.phone, brand.phones)
    const email = resolveAsset(options.email, brand.emails)
    const address = resolveAsset(options.address, brand.addresses)

    const lineas = [
        url ? `URL: ${url}` : '',
        phone ? `ASSET_TELEFONO: ${phone}` : '',
        email ? `ASSET_EMAIL: ${email}` : '',
        address ? `ASSET_DIRECCION: ${address}` : '',
    ].filter(Boolean)

    if (lineas.length === 0) return ''

    return [
        'DATOS DE CONTACTO (deben aparecer legibles en la imagen, sin alterarlos):',
        ...lineas,
    ].join('\n')
}

/**
 * Logos auxiliares (sellos, certificaciones) como imagenes de referencia.
 * `true` incluye todos los del kit salvo el principal; una lista incluye solo
 * los indicados por id, posicion o URL.
 */
export function buildAuxiliaryLogoContext(
    brand: BrandLike | null | undefined,
    choice: boolean | string[] | undefined,
    primaryLogoUrl?: string | null,
): ContextItem[] {
    if (!brand || !choice) return []

    const logos = Array.isArray(brand.logos) ? brand.logos : []
    const wanted = Array.isArray(choice) ? choice : null

    const items: ContextItem[] = []

    logos.forEach((entry, index) => {
        const item = (typeof entry === 'string' ? { url: entry } : (entry ?? {})) as Record<string, unknown>
        const url = typeof item.url === 'string' ? item.url.trim() : ''
        if (!url) return

        // El logo principal ya viaja aparte: repetirlo confunde al generador.
        if (primaryLogoUrl && url === primaryLogoUrl) return

        if (wanted) {
            const matches = wanted.some(
                (ref) => ref === `logo-${index}` || ref === item.id || ref === item._id || ref === url,
            )
            if (!matches) return
        }

        items.push({
            id: `campaign-aux-logo-${index}`,
            type: 'logo',
            value: url,
            label: `Logo auxiliar ${index + 1}`,
        })
    })

    return items
}
