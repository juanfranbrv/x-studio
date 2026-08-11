import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { api } from '@/../convex/_generated/api'
import type { Id } from '@/../convex/_generated/dataModel'
import { authedFetchQuery } from '@/lib/convex-server'
import { log } from '@/lib/logger'

/** GET /api/v1/campaigns/{jobId} — estado del lote y de cada publicacion. */
export async function GET(_request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json(
                { ok: false, error: { code: 'unauthorized', message: 'Sesion no valida.' } },
                { status: 401 },
            )
        }

        const { jobId } = await context.params

        const job = await authedFetchQuery(api.campaigns.getJob, {
            clerk_user_id: userId,
            job_id: jobId as Id<'campaign_jobs'>,
        })

        if (!job) {
            return NextResponse.json(
                { ok: false, error: { code: 'not_found', message: 'Lote no encontrado.' } },
                { status: 404 },
            )
        }

        return NextResponse.json({ ok: true, ...job })
    } catch (error) {
        log.error('CAMPAIGN', 'Fallo al consultar lote', error)
        const message = error instanceof Error ? error.message : 'Error desconocido.'
        return NextResponse.json({ ok: false, error: { code: 'internal_error', message } }, { status: 500 })
    }
}
