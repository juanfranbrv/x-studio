export const STUDIO_DEBUG_OVERLAYS_ENABLED_SETTING_KEY = 'studio_debug_overlays_enabled'

const TRUE_VALUES = new Set(['1', 'true', 'on', 'yes', 'si', 'sí'])
const FALSE_VALUES = new Set(['0', 'false', 'off', 'no'])

export function normalizeStudioDebugOverlaysEnabled(value: unknown): boolean {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        if (!normalized) return true
        if (TRUE_VALUES.has(normalized)) return true
        if (FALSE_VALUES.has(normalized)) return false
    }

    return true
}
