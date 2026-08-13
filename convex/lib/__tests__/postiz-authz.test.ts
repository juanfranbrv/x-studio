import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(path.resolve(__dirname, '../../postizAccounts.ts'), 'utf8')

describe('Autorizacion de las credenciales de Postiz', () => {
    it('exige admin y la identidad del propio usuario en todas las operaciones', () => {
        expect(source).toContain('requireAdmin')
        expect(source).toContain('requireSameUser')
        // Las tres funciones exportadas pasan por el mismo portero.
        expect(source.match(/await requirePostizUser\(ctx, args\.clerk_user_id\)/g)?.length).toBe(3)
    })

    it('la consulta apta para el cliente no devuelve nunca la clave', () => {
        const getStatus = source.slice(source.indexOf('export const getStatus'), source.indexOf('export const getCredentials'))
        expect(getStatus).not.toContain('api_key:')
    })
})
