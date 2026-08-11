import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { api } from '@/../convex/_generated/api'
import type { Id } from '@/../convex/_generated/dataModel'
import { authedFetchMutation } from '@/lib/convex-server'
import { log } from '@/lib/logger'

/**
 * POST /api/v1/campaigns/{jobId}/retry — devuelve a la cola lo que fallo.
 *
 * Pensado para fallos que no son del contenido sino del entorno (un modelo mal
 * configurado, el proveedor caido): se corrige la causa y se reintenta sin
 * volver a encolar la campana entera ni duplicar lo ya generado.
 */
export async function POST(_request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json(
                { ok: false, error: { code: 'unauthorized', message: 'Sesion no valida.' } },
                { status: 401 },
            )
        }

        const { jobId } = await context.params

        const result = await authedFetchMutation(api.campaigns.retryFailedItems, {
            clerk_user_id: userId,
            job_id: jobId as Id<'campaign_jobs'>,
        })

        log.info('CAMPAIGN', `Reintento de lote | job=${jobId} devueltas=${result.requeued}`)

        return NextResponse.json({ ok: true, ...result })
    } catch (error) {
        log.error('CAMPAIGN', 'Fallo al reintentar lote', error)
        const message = error instanceof Error ? error.message : 'Error desconocido.'
        return NextResponse.json({ ok: false, error: { code: 'internal_error', message } }, { status: 500 })
    }
}
