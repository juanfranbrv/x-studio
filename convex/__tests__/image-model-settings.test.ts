import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'

const modules = (import.meta as ImportMeta & {
    glob: (pattern: string) => Record<string, () => Promise<unknown>>
}).glob('../**/*.ts')
const adminEmail = 'juanfranbrv@gmail.com'

describe('Configuración predeterminada de imagen', () => {
    it('inicializa Flare Low y lo devuelve cuando todavía no hay ajustes guardados', async () => {
        const t = convexTest(schema, modules)
        expect((await t.query(api.settings.getAIConfig, {})).imageModel).toBe('openai/gpt-image-2.5-flare-low')

        const admin = t.withIdentity({ subject: 'test-admin', email: adminEmail })
        await admin.mutation(api.admin.initializeSettings, { admin_email: adminEmail })
        expect(await t.query(api.admin.getSetting, { key: 'model_image_generation' })).toBe('openai/gpt-image-2.5-flare-low')
    })

    it('respeta el modelo guardado y permite cambiar a Flare desde Admin', async () => {
        const t = convexTest(schema, modules)
        const admin = t.withIdentity({ subject: 'test-admin', email: adminEmail })
        await admin.mutation(api.settings.saveAppSetting, {
            admin_email: adminEmail, key: 'model_image_generation', value: 'openai/gpt-image-2-medium',
        })
        await admin.mutation(api.admin.initializeSettings, { admin_email: adminEmail })
        expect((await t.query(api.settings.getAIConfig, {})).imageModel).toBe('openai/gpt-image-2-medium')

        await admin.mutation(api.settings.saveAppSetting, {
            admin_email: adminEmail, key: 'model_image_generation', value: 'openai/gpt-image-2.5-flare-low',
        })
        expect((await t.query(api.settings.getAIConfig, {})).imageModel).toBe('openai/gpt-image-2.5-flare-low')
    })
})
