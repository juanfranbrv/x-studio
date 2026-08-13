import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const routeFiles = [
    '../route.ts',
    '../../campaign-guide/route.ts',
    '../../catalog/route.ts',
    '../[jobId]/route.ts',
    '../[jobId]/run/route.ts',
    '../[jobId]/export/route.ts',
    '../[jobId]/retry/route.ts',
    '../[jobId]/cancel/route.ts',
].map((file) => path.resolve(__dirname, file))

describe('Campaign API admin guards', () => {
    it.each(routeFiles)('protege %s con el guard de administrador', (file) => {
        const source = fs.readFileSync(file, 'utf8')
        expect(source).toContain("import { requireCampaignAdmin } from '@/lib/campaign-admin-guard'")
        expect(source).toContain('const access = await requireCampaignAdmin()')
        expect(source).toContain('if (!access.ok) return access.response')
    })
})
