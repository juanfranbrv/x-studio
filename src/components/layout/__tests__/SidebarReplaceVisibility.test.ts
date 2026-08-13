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

    it('muestra el acceso a campañas solo para el administrador', () => {
        expect(sidebarSource).toContain("import { isAdminEmail } from '@/lib/auth-config'")
        expect(sidebarSource).toContain("const isAdmin = user?.emailAddresses?.some((email) => isAdminEmail(email.emailAddress)) ?? false")
        expect(sidebarSource).toContain("...(isAdmin ? [{ icon: IconSparkles, label: t('nav.campaigns'), href: '/campaigns' }] : []),")
    })
})
