'use server'

import { auth } from '@clerk/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '../../../convex/_generated/api'
import { authedFetchQuery, isTransientAuthError } from '@/lib/convex-server'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const TRANSIENT_RETRY_DELAYS_MS = [200, 450, 800]

type LastVisitedModuleResult = {
    module: 'image' | 'carousel' | 'brand-kit'
    session_id: string
    brand_id: string | null
    updated_at: string
}

export async function getLastVisitedModuleAction(clerkUserId: string) {
    const { userId } = await auth()
    if (!userId || userId !== clerkUserId) {
        return { success: false as const, error: 'No autorizado' }
    }

    try {
        // El token Clerk->Convex puede no estar listo en el primer intento tras
        // navegar (frecuente en serverless frio). Reintentamos ante transitorios
        // para aterrizar SIEMPRE en el ultimo modulo correcto, no en el fallback.
        let data: Awaited<ReturnType<typeof authedFetchQuery<typeof api.work_sessions.getLastVisitedModule>>> | null = null
        for (let attempt = 0; attempt <= TRANSIENT_RETRY_DELAYS_MS.length; attempt++) {
            try {
                data = await authedFetchQuery(api.work_sessions.getLastVisitedModule, {
                    user_id: userId,
                })
                break
            } catch (error) {
                if (isTransientAuthError(error) && attempt < TRANSIENT_RETRY_DELAYS_MS.length) {
                    await wait(TRANSIENT_RETRY_DELAYS_MS[attempt])
                    continue
                }
                throw error
            }
        }

        const normalizedData: LastVisitedModuleResult | null =
            data && (data.module === 'image' || data.module === 'carousel' || data.module === 'brand-kit')
                ? {
                    module: data.module,
                    session_id: String(data.session_id),
                    brand_id: data.brand_id ? String(data.brand_id) : null,
                    updated_at: data.updated_at,
                }
                : null

        return {
            success: true as const,
            data: normalizedData,
        }
    } catch (error) {
        console.error('Unexpected error in getLastVisitedModuleAction:', error)
        return { success: false as const, error: 'Error inesperado' }
    }
}
