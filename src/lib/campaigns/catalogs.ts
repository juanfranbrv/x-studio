import { SOCIAL_FORMATS, LAYOUTS_BY_INTENT } from '@/lib/creation-flow-types'
import { DEFAULT_LAYOUTS, LAB_ADVANCED_LAYOUTS } from '@/lib/creation-flow/layout-catalog'

/**
 * Traduce los identificadores del manifiesto (formato, layout) a los catalogos
 * reales de la aplicacion. Se resuelven aqui, antes de encolar, para poder
 * fallar con "unknown_format" sin haber gastado un credito.
 */

export function findSocialFormat(id: string) {
    return SOCIAL_FORMATS.find((format) => format.id === id) ?? null
}

/** Todos los layouts disponibles, vengan de donde vengan, sin duplicados. */
export function listLayoutIds(): string[] {
    const ids = new Set<string>()

    for (const layout of [...DEFAULT_LAYOUTS, ...LAB_ADVANCED_LAYOUTS]) {
        if (layout?.id) ids.add(layout.id)
    }
    for (const group of Object.values(LAYOUTS_BY_INTENT)) {
        for (const layout of group ?? []) {
            if (layout?.id) ids.add(layout.id)
        }
    }

    return [...ids]
}

export function isKnownLayout(id: string): boolean {
    return listLayoutIds().includes(id)
}

/** Ids de formato validos, para poder sugerirlos en el mensaje de error. */
export function listSocialFormatIds(): string[] {
    return SOCIAL_FORMATS.map((format) => format.id)
}
