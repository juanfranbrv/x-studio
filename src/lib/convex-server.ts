import 'server-only'

import { auth } from '@clerk/nextjs/server'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import type { FunctionReference, FunctionArgs, FunctionReturnType } from 'convex/server'

/**
 * Wrappers de fetchQuery/fetchMutation que adjuntan el JWT de Clerk
 * (template `convex`) para que las funciones Convex puedan verificar la
 * identidad con ctx.auth (ver convex/lib/authz.ts y docs/SANEAMIENTO.md F2).
 *
 * Si no hay sesión (p. ej. webhooks), el token es undefined y Convex verá
 * identidad nula: las funciones protegidas rechazarán la llamada.
 */
async function getConvexToken(): Promise<string | undefined> {
    try {
        const { getToken } = await auth()
        return (await getToken({ template: 'convex' })) ?? undefined
    } catch {
        return undefined
    }
}

export async function authedFetchQuery<Query extends FunctionReference<'query'>>(
    query: Query,
    args: FunctionArgs<Query>,
): Promise<FunctionReturnType<Query>> {
    const token = await getConvexToken()
    return fetchQuery(query, args, token ? { token } : undefined)
}

export async function authedFetchMutation<Mutation extends FunctionReference<'mutation'>>(
    mutation: Mutation,
    args: FunctionArgs<Mutation>,
): Promise<FunctionReturnType<Mutation>> {
    const token = await getConvexToken()
    return fetchMutation(mutation, args, token ? { token } : undefined)
}
