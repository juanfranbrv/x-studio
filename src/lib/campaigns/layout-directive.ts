import { findLayout } from '@/lib/campaigns/catalogs'

/**
 * Traduce un layout a la instruccion de composicion que se anade al prompt.
 *
 * Por que hace falta: `buildImagePrompt` (servidor) solo aplica el layout si
 * llega `layoutReference`, y busca el layout por su `referenceImage`. Pero
 * NINGUNO de los layouts del catalogo tiene `referenceImage`: los 279 llevan
 * su composicion en `promptInstruction` y `structuralPrompt`. Es decir, por la
 * via del servidor el layout no llegaba nunca.
 *
 * La interfaz no sufre este problema porque construye el prompt en el cliente
 * (useCreationFlow) y alli si usa esos campos. Como el lote deja construir el
 * prompt al servidor, la instruccion se adjunta aqui explicitamente.
 */

type LayoutLike = {
    id?: string
    name?: string
    promptInstruction?: string
    structuralPrompt?: string
}

export function buildLayoutDirective(layoutId: string | undefined): string {
    if (!layoutId) return ''

    const layout = findLayout(layoutId) as LayoutLike | null
    if (!layout) return ''

    const partes = [layout.promptInstruction?.trim(), layout.structuralPrompt?.trim()].filter(Boolean)
    if (partes.length === 0) return ''

    return [
        'COMPOSICIÓN Y ESTRUCTURA (OBLIGATORIO):',
        ...partes,
    ].join('\n')
}
