import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(path.resolve(__dirname, '../../campaigns.ts'), 'utf8')

describe('Campaign Convex authorization', () => {
    it('exige admin y mantiene la identidad del usuario en cada operación', () => {
        expect(source).toContain('requireAdmin')
        expect(source).toContain('async function requireCampaignUser')
        expect(source.match(/requireCampaignUser\(ctx, args\.clerk_user_id\)/g)?.length).toBe(10)
    })
})
