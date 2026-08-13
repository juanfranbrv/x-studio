import { SOCIAL_FORMATS, LAYOUTS_BY_INTENT, type IntentCategory } from '@/lib/creation-flow-types'
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
export function listLayouts() {
    const porId = new Map<string, (typeof DEFAULT_LAYOUTS)[number]>()

    const todos = [
        ...DEFAULT_LAYOUTS,
        ...LAB_ADVANCED_LAYOUTS,
        ...Object.values(LAYOUTS_BY_INTENT).flatMap((group) => group ?? []),
    ]

    for (const layout of todos) {
        if (layout?.id && !porId.has(layout.id)) porId.set(layout.id, layout)
    }

    return [...porId.values()]
}

export function listLayoutIds(): string[] {
    return listLayouts().map((layout) => layout.id)
}

/**
 * Layouts agrupados por intencion, que es como los ofrece el panel: al elegir
 * un intent ("El Servicio", "La Oferta"...) se muestran SUS layouts, no los
 * cientos que existen sumando todos. Exponer la lista plana seria dar a elegir
 * entre opciones que en la interfaz nunca aparecen juntas.
 */
export function listLayoutsByIntent(): Array<{ intent: string; layouts: Array<{ id: string; name: string; description?: string }> }> {
    return Object.entries(LAYOUTS_BY_INTENT)
        .filter(([, group]) => Array.isArray(group) && group.length > 0)
        .map(([intent, group]) => ({
            intent,
            layouts: (group ?? []).map((layout) => ({
                id: layout.id,
                name: layout.name,
                description: layout.description,
            })),
        }))
}

/** Layouts genericos, los que valen sea cual sea la intencion. */
export function listBaseLayouts() {
    return DEFAULT_LAYOUTS.map((layout) => ({
        id: layout.id,
        name: layout.name,
        description: layout.description,
    }))
}

export function listIntents(): string[] {
    return listLayoutsByIntent().map((entry) => entry.intent)
}

export function isKnownLayout(id: string): boolean {
    return listLayoutIds().includes(id)
}

/** Devuelve el layout completo, para poder pasar su imagen de referencia. */
export function findLayout(id: string) {
    const todos = [
        ...DEFAULT_LAYOUTS,
        ...LAB_ADVANCED_LAYOUTS,
        ...Object.values(LAYOUTS_BY_INTENT).flatMap((group) => group ?? []),
    ]
    return todos.find((layout) => layout?.id === id) ?? null
}

/** Primer layout del intent: replica la selección automática del módulo manual. */
export function findDefaultLayoutForIntent(intent: IntentCategory | undefined) {
    if (!intent) return null
    return LAYOUTS_BY_INTENT[intent]?.[0] ?? null
}

/** Un layout explícito conserva prioridad; en su ausencia manda la intención. */
export function resolveCampaignLayout(layoutId: string | undefined, intent: IntentCategory | undefined) {
    return layoutId ? findLayout(layoutId) : findDefaultLayoutForIntent(intent)
}

/** Ids de formato validos, para poder sugerirlos en el mensaje de error. */
export function listSocialFormatIds(): string[] {
    return SOCIAL_FORMATS.map((format) => format.id)
}
