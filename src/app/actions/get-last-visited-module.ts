'use server'

import { auth } from '@clerk/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '../../../convex/_generated/api'
import { authedFetchQuery } from '@/lib/convex-server'

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
        const data = await authedFetchQuery(api.work_sessions.getLastVisitedModule, {
            user_id: userId,
        })

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
