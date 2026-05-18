import { describe, expect, it } from 'vitest'

import {
    REPLACE_MODULE_ENABLED_SETTING_KEY,
    normalizeReplaceModuleEnabled,
} from '../replace-module-visibility'

describe('replace module visibility', () => {
    it('expone una clave estable de app_settings', () => {
        expect(REPLACE_MODULE_ENABLED_SETTING_KEY).toBe('replace_module_enabled')
    })

    it('mantiene el modulo oculto si no existe configuracion', () => {
        expect(normalizeReplaceModuleEnabled(undefined)).toBe(false)
        expect(normalizeReplaceModuleEnabled(null)).toBe(false)
        expect(normalizeReplaceModuleEnabled('')).toBe(false)
    })

    it('interpreta booleanos, numeros y strings comunes', () => {
        expect(normalizeReplaceModuleEnabled(true)).toBe(true)
        expect(normalizeReplaceModuleEnabled(false)).toBe(false)
        expect(normalizeReplaceModuleEnabled(1)).toBe(true)
        expect(normalizeReplaceModuleEnabled(0)).toBe(false)
        expect(normalizeReplaceModuleEnabled('true')).toBe(true)
        expect(normalizeReplaceModuleEnabled('on')).toBe(true)
        expect(normalizeReplaceModuleEnabled('false')).toBe(false)
        expect(normalizeReplaceModuleEnabled('off')).toBe(false)
    })
})
