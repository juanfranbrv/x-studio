import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/../convex/_generated/api'
import { authedFetchQuery, authedFetchMutation } from '@/lib/convex-server'
import { requireCampaignAdmin } from '@/lib/campaign-admin-guard'
import { validateManifest, collectReferencedSlugs, resolvePost, type ManifestIssue } from '@/lib/campaigns/manifest'
import { findSocialFormat, isKnownLayout, listSocialFormatIds } from '@/lib/campaigns/catalogs'
import { log } from '@/lib/logger'

/**
 * POST /api/v1/campaigns — valida un manifiesto y encola el lote.
 *
 * No devuelve imagenes: generar 60 no cabe en una peticion HTTP. Devuelve un
 * `job_id` que se consulta en GET /api/v1/campaigns/{job_id}.
 *
 * Contrato completo en docs/API_AUTOMATIZACION.md.
 */

type ApiError = {
    code: string
    message: string
    issues?: ManifestIssue[]
}

function fail(status: number, error: ApiError) {
    return NextResponse.json({ ok: false, error }, { status })
}

export async function POST(request: NextRequest) {
    const startedAt = Date.now()

    try {
        // Fase 1: la identidad sale de la sesion de Clerk. Cuando existan API
        // keys, solo cambia esta resolucion, no el resto del endpoint.
        const access = await requireCampaignAdmin()
        if (!access.ok) return access.response
        const { userId } = access

        let body: unknown
        try {
            body = await request.json()
        } catch {
            return fail(400, { code: 'invalid_json', message: 'El cuerpo de la peticion no es JSON valido.' })
        }

        const envelope = (body ?? {}) as Record<string, unknown>
        const dryRun = envelope.dry_run === true
        const idempotencyKey =
            typeof envelope.idempotency_key === 'string' && envelope.idempotency_key.trim()
                ? envelope.idempotency_key.trim()
                : request.headers.get('idempotency-key')?.trim() || undefined

        // El manifiesto puede venir suelto o envuelto en {manifest: ...}.
        const manifestInput = envelope.manifest ?? body

        const validation = validateManifest(manifestInput)
        if (!validation.ok) {
            return fail(422, {
                code: 'manifest_invalid',
                message: `El manifiesto tiene ${validation.errors.length} error(es).`,
                issues: validation.errors,
            })
        }

        const { manifest, warnings } = validation

        // --- Resolucion de referencias contra datos reales ---

        const brand = await authedFetchQuery(api.brands.getBrandDNABySlug, {
            slug: manifest.campaign.brand,
            clerk_user_id: userId,
        })

        if (!brand) {
            return fail(422, {
                code: 'unknown_brand',
                message: `No existe un kit de marca con el slug "${manifest.campaign.brand}" en tu cuenta.`,
            })
        }

        const referenced = collectReferencedSlugs(manifest)
        const issues: ManifestIssue[] = []

        for (const formatId of referenced.formats) {
            if (!findSocialFormat(formatId)) {
                issues.push({
                    path: 'format',
                    message: `Formato desconocido: "${formatId}". Validos: ${listSocialFormatIds().join(', ')}.`,
                })
            }
        }

        for (const layoutId of referenced.layouts) {
            if (!isKnownLayout(layoutId)) {
                issues.push({ path: 'layout', message: `Layout desconocido: "${layoutId}".` })
            }
        }

        for (const styleSlug of referenced.styles) {
            const style = await authedFetchQuery(api.stylePresets.getActiveBySlug, { slug: styleSlug })
            if (!style) {
                issues.push({
                    path: 'style',
                    message: `Estilo desconocido o inactivo: "${styleSlug}". Consulta /api/v1/styles.`,
                })
            }
        }

        if (issues.length > 0) {
            return fail(422, {
                code: 'unknown_reference',
                message: 'El manifiesto referencia elementos que no existen.',
                issues,
            })
        }

        // --- Todo resuelto: o se simula, o se encola ---

        const items = manifest.posts.map((post) => {
            const resolved = resolvePost(manifest, post)
            return {
                ref: resolved.ref,
                scheduled_at: resolved.scheduled_at,
                payload: resolved,
            }
        })

        if (dryRun) {
            log.info('CAMPAIGN', `Dry run | campana="${manifest.campaign.name}" posts=${items.length}`)
            return NextResponse.json({
                ok: true,
                dry_run: true,
                campaign: manifest.campaign.name,
                brand: { slug: manifest.campaign.brand, name: brand.brand_name },
                total: items.length,
                warnings,
            })
        }

        const job = await authedFetchMutation(api.campaigns.enqueue, {
            clerk_user_id: userId,
            brand_id: brand._id,
            name: manifest.campaign.name,
            source: 'api',
            idempotency_key: idempotencyKey,
            manifest,
            items,
        })

        log.success(
            'CAMPAIGN',
            `Lote encolado | job=${job.job_id} posts=${job.total} reusado=${job.reused} ${Date.now() - startedAt}ms`,
        )

        return NextResponse.json({ ok: true, ...job, warnings }, { status: job.reused ? 200 : 201 })
    } catch (error) {
        log.error('CAMPAIGN', 'Fallo al encolar lote', error)
        const message = error instanceof Error ? error.message : 'Error desconocido.'
        return fail(500, { code: 'internal_error', message })
    }
}

/** GET /api/v1/campaigns — lotes del usuario, del mas reciente al mas antiguo. */
export async function GET() {
    try {
        const access = await requireCampaignAdmin()
        if (!access.ok) return access.response
        const { userId } = access

        const jobs = await authedFetchQuery(api.campaigns.listJobs, { clerk_user_id: userId })
        return NextResponse.json({ ok: true, jobs })
    } catch (error) {
        log.error('CAMPAIGN', 'Fallo al listar lotes', error)
        const message = error instanceof Error ? error.message : 'Error desconocido.'
        return fail(500, { code: 'internal_error', message })
    }
}
