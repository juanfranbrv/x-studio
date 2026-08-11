/**
 * Seleccion del logo del kit para una campana.
 *
 * El logo NO se describe con palabras: se adjunta al generador como imagen de
 * referencia, en un elemento de contexto de tipo 'logo'. Es lo que hace el
 * modulo de imagen cuando el interruptor de logo esta activo. Sin ese adjunto,
 * el modelo dibuja un logotipo inventado que se parece a la marca pero no es
 * el suyo.
 */

export type ContextItem = {
    id: string
    type: string
    value: string
    label?: string
}

type BrandLike = {
    logo_url?: unknown
    logos?: unknown
}

/**
 * Devuelve la URL del logo elegido. `preferred` acepta el id del logo o su
 * posicion ("logo-0"); sin preferencia se toma el primero disponible, que es
 * el que la interfaz marca por defecto.
 */
export function selectBrandLogoUrl(brand: BrandLike | null | undefined, preferred?: string): string | null {
    if (!brand) return null

    const logos = Array.isArray(brand.logos) ? brand.logos : []

    const urlOf = (entry: unknown): string | null => {
        if (typeof entry === 'string') return entry.trim() || null
        const value = (entry as { url?: unknown } | null)?.url
        return typeof value === 'string' && value.trim() ? value.trim() : null
    }

    if (preferred) {
        const match = logos.find((entry, index) => {
            if (`logo-${index}` === preferred) return true
            const item = (entry ?? {}) as Record<string, unknown>
            return item.id === preferred || item._id === preferred
        })
        const url = urlOf(match)
        if (url) return url
    }

    for (const entry of logos) {
        const url = urlOf(entry)
        if (url) return url
    }

    const fallback = brand.logo_url
    return typeof fallback === 'string' && fallback.trim() ? fallback.trim() : null
}

/**
 * Construye los elementos de contexto que acompanan a la generacion. Hoy solo
 * el logo; cuando la campana admita imagenes de referencia propias, se anaden
 * aqui con el mismo formato.
 */
export function buildCampaignContext(
    brand: BrandLike | null | undefined,
    options: { includeLogo?: boolean; preferredLogo?: string } = {},
): ContextItem[] {
    const context: ContextItem[] = []

    // El logo se incluye salvo que la campana lo desactive explicitamente:
    // es el comportamiento por defecto del modulo de imagen.
    if (options.includeLogo === false) return context

    const logoUrl = selectBrandLogoUrl(brand, options.preferredLogo)
    if (logoUrl) {
        context.push({ id: 'flow-logo', type: 'logo', value: logoUrl, label: 'Logo' })
    }

    return context
}
