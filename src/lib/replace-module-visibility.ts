export const REPLACE_MODULE_ENABLED_SETTING_KEY = 'replace_module_enabled'

const TRUE_VALUES = new Set(['1', 'true', 'on', 'yes', 'si', 'sí'])
const FALSE_VALUES = new Set(['0', 'false', 'off', 'no'])

export function normalizeReplaceModuleEnabled(value: unknown): boolean {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        if (!normalized) return false
        if (TRUE_VALUES.has(normalized)) return true
        if (FALSE_VALUES.has(normalized)) return false
    }

    return false
}
