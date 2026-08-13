import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const pageSource = fs.readFileSync(path.resolve(__dirname, '../page.tsx'), 'utf8')

describe('Campaigns admin access', () => {
    it('bloquea la pantalla para usuarios que no sean administradores', () => {
        expect(pageSource).toContain("import { isAdminEmail } from '@/lib/auth-config'")
        expect(pageSource).toContain('const isAdmin = isLoaded && isAdminEmail(userEmail)')
        expect(pageSource).toContain('if (!isAdmin) {')
        expect(pageSource).toContain('No tienes permisos para esta sección.')
        expect(pageSource).toContain('useCampaignJobs(isAdmin)')
    })
})
