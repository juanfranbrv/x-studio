import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const sidebarSource = fs.readFileSync(
    path.resolve(__dirname, '../Sidebar.tsx'),
    'utf8'
)

describe('Sidebar replace visibility', () => {
    it('consulta el flag global de Replace antes de pintar la navegacion', () => {
        expect(sidebarSource).toContain('const replaceModuleFlags = useQuery(api.settings.getReplaceModuleFlags, {})')
        expect(sidebarSource).toContain("...(replaceModuleFlags?.showReplaceModule ? [{ icon: IconLayers, label: t('nav.replace'), href: '/replace' }] : [])")
    })
})
