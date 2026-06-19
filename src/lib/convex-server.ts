import 'server-only'

import { auth } from '@clerk/nextjs/server'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import type { FunctionReference, FunctionArgs, FunctionReturnType } from 'convex/server'

/**
 * Wrappers de fetchQuery/fetchMutation que adjuntan el JWT de Clerk
 * (template `convex`) para que las funciones Convex puedan verificar la
 * identidad con ctx.auth (ver convex/lib/authz.ts y docs/SANEAMIENTO.md F2).
 *
 * Blindaje (causa raíz de fallos "solo en producción"): en serverless frío,
 * la emisión del JWT (`getToken`) puede no estar lista en el primer intento
 * justo tras navegar/loguear. Si en ese instante se lanza la query SIN token,
 * Convex ve identidad nula y `requireIdentity` lanza `Unauthorized`, lo que la
 * UI interpretaba como "0 kits / error" y degeneraba en redirecciones y
 * pantallas de error. Aquí distinguimos tres situaciones:
 *   - No hay sesión        -> token undefined, hasSession=false (webhooks, etc.)
 *   - Sesión + token listo -> token presente (caso normal)
 *   - Sesión + token NO listo todavía -> reintentamos con backoff corto y, si
 *     aun así no llega, marcamos el fallo como TRANSITORIO para que el llamador
 *     reintente en lugar de tratarlo como un estado terminal.
 */

const TOKEN_RETRY_DELAYS_MS = [120, 280, 520]

/**
 * Error transitorio de autenticación: hay sesión de usuario pero el JWT de
 * Convex no se pudo obtener a tiempo. El llamador DEBE reintentar; nunca debe
 * tratarse como "sin permisos" ni como "sin datos".
 */
export class TransientAuthError extends Error {
    readonly transient = true as const
    constructor(message = 'Convex auth token not ready yet') {
        super(message)
        this.name = 'TransientAuthError'
    }
}

export function isTransientAuthError(error: unknown): error is TransientAuthError {
    return (
        error instanceof TransientAuthError ||
        (typeof error === 'object' && error !== null && (error as { transient?: unknown }).transient === true)
    )
}

type TokenResult = { token?: string; hasSession: boolean }

async function getConvexToken(): Promise<TokenResult> {
    let hasSession = false
    try {
        const { userId, getToken } = await auth()
        hasSession = Boolean(userId)

        // Sin sesión de usuario: no hay token que adjuntar (p. ej. webhooks).
        if (!hasSession) return { hasSession: false }

        for (let attempt = 0; attempt <= TOKEN_RETRY_DELAYS_MS.length; attempt++) {
            const token = await getToken({ template: 'convex' }).catch(() => null)
            if (token) return { token, hasSession: true }

            const delay = TOKEN_RETRY_DELAYS_MS[attempt]
            if (typeof delay === 'number') {
                await new Promise((resolve) => setTimeout(resolve, delay))
            }
        }

        // Hay sesión pero el token no llegó: situación transitoria.
        return { hasSession: true }
    } catch {
        return { hasSession }
    }
}

export async function authedFetchQuery<Query extends FunctionReference<'query'>>(
    query: Query,
    args: FunctionArgs<Query>,
): Promise<FunctionReturnType<Query>> {
    const { token, hasSession } = await getConvexToken()
    if (hasSession && !token) {
        // Hay usuario logueado pero el JWT no está disponible aún: no lanzamos
        // una lectura que Convex rechazaría por identidad nula. Señalamos
        // transitoriedad para que el llamador reintente.
        throw new TransientAuthError()
    }
    return fetchQuery(query, args, token ? { token } : undefined)
}

export async function authedFetchMutation<Mutation extends FunctionReference<'mutation'>>(
    mutation: Mutation,
    args: FunctionArgs<Mutation>,
): Promise<FunctionReturnType<Mutation>> {
    const { token, hasSession } = await getConvexToken()
    if (hasSession && !token) {
        throw new TransientAuthError()
    }
    return fetchMutation(mutation, args, token ? { token } : undefined)
}
