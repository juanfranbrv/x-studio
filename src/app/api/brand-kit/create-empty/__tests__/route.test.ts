import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const routeSource = fs.readFileSync(
    path.resolve(__dirname, '../route.ts'),
    'utf8'
)

describe('brand kit create-empty route', () => {
    it('valida la sesion y no acepta crear kits para otro clerk_user_id', () => {
        expect(routeSource).toContain("import { auth } from '@clerk/nextjs/server'")
        expect(routeSource).toContain('const { userId } = await auth()')
        expect(routeSource).toContain('if (!userId || userId !== clerk_user_id)')
    })
})
