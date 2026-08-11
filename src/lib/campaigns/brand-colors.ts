import type { SelectedColor, ColorRole } from '@/lib/creation-flow-types'

/**
 * Deriva los colores seleccionados a partir de la paleta del kit de marca.
 *
 * Replica lo que hace `buildBrandColorsFromKit` en `useCreationFlow`: la
 * interfaz inicializa asi los colores al elegir un kit, y el generador los
 * recibe en `selectedColors`. Sin ellos, `buildImagePrompt` deja la paleta
 * como "Sin definir" y el modelo se inventa los colores de marca.
 */

type RawColor = { color?: string; hex?: string; role?: string } | string

export function normalizeColorRole(rawRole: unknown): ColorRole {
    const role = String(rawRole ?? 'Acento').trim().toUpperCase()

    if (role.includes('TEXT')) return 'Texto'
    if (role.includes('FOND')) return 'Fondo'
    return 'Acento'
}

export function buildBrandColorsFromKit(colors: unknown): SelectedColor[] {
    if (!Array.isArray(colors) || colors.length === 0) return []

    return colors
        .map((entry) => {
            const raw = entry as RawColor
            const value = typeof raw === 'string' ? raw : (raw?.color || raw?.hex || '')
            const hex = String(value || '').trim().toLowerCase()
            const role = normalizeColorRole(typeof raw === 'string' ? undefined : raw?.role)

            return {
                color: hex.startsWith('#') ? hex : `#${hex}`,
                role,
            }
        })
        .filter((entry) => Boolean(entry.color) && entry.color !== '#')
}

/**
 * Colores efectivos de una campana: los que declare el manifiesto y, si no
 * declara ninguno, los del propio kit de marca.
 */
export function resolveCampaignColors(manifestColors: string[] | undefined, brandColors: unknown): SelectedColor[] {
    if (Array.isArray(manifestColors) && manifestColors.length > 0) {
        return buildBrandColorsFromKit(manifestColors)
    }
    return buildBrandColorsFromKit(brandColors)
}
