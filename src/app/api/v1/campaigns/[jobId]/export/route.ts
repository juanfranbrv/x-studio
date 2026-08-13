import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { api } from '@/../convex/_generated/api'
import type { Id } from '@/../convex/_generated/dataModel'
import { authedFetchQuery } from '@/lib/convex-server'
import {
    buildCampaignCsv,
    buildCampaignJson,
    buildExportEntries,
    selectExportable,
    zipFileName,
    type ExportItem,
} from '@/lib/campaigns/export'
import { log } from '@/lib/logger'
import { requireCampaignAdmin } from '@/lib/campaign-admin-guard'

/**
 * GET /api/v1/campaigns/{jobId}/export — descarga el lote como ZIP.
 *
 * Contiene las imagenes nombradas con la referencia de cada publicacion
 * (BAU-01.png) mas `campaign.json` y `campaign.csv` con la correspondencia
 * entre imagen, texto y fecha. Sin esos metadatos, quien programa el
 * calendario tendria que adivinar que va con que.
 *
 * Se puede descargar con el lote a medias: solo entra lo ya generado.
 */

// Las descargas van de dos en dos: en tandas grandes, pedir 60 imagenes a la
// vez al almacenamiento no acelera nada y multiplica los fallos por timeout.
const DOWNLOAD_CONCURRENCY = 4

export async function GET(_request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
    const startedAt = Date.now()

    try {
        const access = await requireCampaignAdmin()
        if (!access.ok) return access.response
        const { userId } = access
        if (!userId) {
            return NextResponse.json(
                { ok: false, error: { code: 'unauthorized', message: 'Sesion no valida.' } },
                { status: 401 },
            )
        }

        const { jobId } = await context.params

        const job = await authedFetchQuery(api.campaigns.getJobForExport, {
            clerk_user_id: userId,
            job_id: jobId as Id<'campaign_jobs'>,
        })

        if (!job) {
            return NextResponse.json(
                { ok: false, error: { code: 'not_found', message: 'Lote no encontrado.' } },
                { status: 404 },
            )
        }

        const exportables = selectExportable(job.items as ExportItem[])

        if (exportables.length === 0) {
            return NextResponse.json(
                {
                    ok: false,
                    error: {
                        code: 'nothing_to_export',
                        message: 'El lote todavia no tiene ninguna imagen generada.',
                    },
                },
                { status: 409 },
            )
        }

        const entries = buildExportEntries(job.items as ExportItem[])
        const zip = new JSZip()

        zip.file('campaign.json', buildCampaignJson(job.name, entries))
        zip.file('campaign.csv', buildCampaignCsv(entries))

        const fallidas: string[] = []
        let cursor = 0

        const descargar = async () => {
            while (cursor < exportables.length) {
                const index = cursor++
                const item = exportables[index]
                const entry = entries[index]

                try {
                    const response = await fetch(item.asset_key as string)
                    if (!response.ok) throw new Error(`HTTP ${response.status}`)
                    zip.file(entry.file, await response.arrayBuffer())
                } catch (error) {
                    // Una imagen que no se pueda descargar no debe tumbar el ZIP
                    // entero: se anota y el resto del paquete sigue siendo util.
                    fallidas.push(item.ref)
                    log.warn('CAMPAIGN', `Export: no se pudo descargar ${item.ref}`, error)
                }
            }
        }

        await Promise.all(
            Array.from({ length: Math.min(DOWNLOAD_CONCURRENCY, exportables.length) }, descargar),
        )

        if (fallidas.length > 0) {
            zip.file('IMAGENES-QUE-FALTAN.txt', `No se pudieron descargar:\n${fallidas.join('\n')}\n`)
        }

        const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
        const nombre = zipFileName(job.name)

        log.success(
            'CAMPAIGN',
            `Export | job=${jobId} imagenes=${exportables.length - fallidas.length} fallidas=${fallidas.length} ${Math.round(buffer.byteLength / 1024)}KB ${Date.now() - startedAt}ms`,
        )

        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${nombre}"`,
                'Content-Length': String(buffer.byteLength),
            },
        })
    } catch (error) {
        log.error('CAMPAIGN', 'Fallo al exportar el lote', error)
        const message = error instanceof Error ? error.message : 'Error desconocido.'
        return NextResponse.json({ ok: false, error: { code: 'internal_error', message } }, { status: 500 })
    }
}
