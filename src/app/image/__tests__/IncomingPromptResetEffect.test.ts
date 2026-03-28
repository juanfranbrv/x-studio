import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const imagePageSource = fs.readFileSync(path.resolve(__dirname, '../page.tsx'), 'utf8')

describe('ImagePage incoming prompt reset effect', () => {
    it('solo depende del cambio real de brand kit para evitar bucles de actualizacion', () => {
        expect(imagePageSource).toContain("}, [activeBrandKit?.id]) // eslint-disable-line react-hooks/exhaustive-deps")
        expect(imagePageSource).not.toContain('}, [activeBrandKit?.id, creationFlow, pendingIncomingPrompt])')
    })
})
