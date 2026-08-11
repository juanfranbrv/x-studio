import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { api } from '@/../convex/_generated/api'
import type { Id } from '@/../convex/_generated/dataModel'
import { authedFetchMutation } from '@/lib/convex-server'
import { log } from '@/lib/logger'

/**
 * POST /api/v1/campaigns/{jobId}/cancel — cancela las publicaciones pendientes.
 *
 * Las ya generadas se quedan: cancelar no debe tirar trabajo (ni creditos) que
 * ya se ha gastado.
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

        const result = await authedFetchMutation(api.campaigns.cancelJob, {
            clerk_user_id: userId,
            job_id: jobId as Id<'campaign_jobs'>,
        })

        log.info('CAMPAIGN', `Lote cancelado | job=${jobId} pendientes=${result.cancelled}`)

        return NextResponse.json({ ok: true, ...result })
    } catch (error) {
        log.error('CAMPAIGN', 'Fallo al cancelar lote', error)
        const message = error instanceof Error ? error.message : 'Error desconocido.'
        return NextResponse.json({ ok: false, error: { code: 'internal_error', message } }, { status: 500 })
    }
}
