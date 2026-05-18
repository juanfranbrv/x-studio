import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const schemaSource = fs.readFileSync(
    path.resolve(__dirname, '../schema.ts'),
    'utf8'
)
const templatesSource = fs.readFileSync(
    path.resolve(__dirname, '../replaceTemplates.ts'),
    'utf8'
)

describe('replace templates contract', () => {
    it('declara una tabla dedicada en el schema', () => {
        expect(schemaSource).toContain('replace_templates: defineTable({')
        expect(schemaSource).toContain('.index("by_sort_order", ["sort_order"])')
    })

    it('expone queries y mutations admin para listar, crear y borrar plantillas', () => {
        expect(templatesSource).toContain('export const listActive = query({')
        expect(templatesSource).toContain('export const listAllForAdmin = query({')
        expect(templatesSource).toContain('export const create = mutation({')
        expect(templatesSource).toContain('export const remove = mutation({')
    })
})
