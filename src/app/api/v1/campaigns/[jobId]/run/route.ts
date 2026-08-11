import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { api } from '@/../convex/_generated/api'
import type { Id } from '@/../convex/_generated/dataModel'
import { authedFetchQuery, authedFetchMutation } from '@/lib/convex-server'
import { generateContentImageUnified } from '@/lib/gemini'
import type { BrandDNA } from '@/lib/brand-types'
import { findSocialFormat, findLayout } from '@/lib/campaigns/catalogs'
import { persistGeneratedImage } from '@/lib/campaigns/store-image'
import { resolveCampaignColors } from '@/lib/campaigns/brand-colors'
import { buildCampaignContext, type ContextItem } from '@/lib/campaigns/brand-logo'
import { P06B } from '@/lib/prompts/priorities/p06b-ai-image-description'
import { buildLayoutDirective } from '@/lib/campaigns/layout-directive'
import type { SelectedColor } from '@/lib/creation-flow-types'
import type { ManifestPost } from '@/lib/campaigns/manifest'
import { log } from '@/lib/logger'

/**
 * POST /api/v1/campaigns/{jobId}/run — procesa publicaciones pendientes del lote.
 *
 * El worker vive aqui, en Next, y no en Convex, porque toda la cadena de
 * construccion de prompt y generacion (`src/lib/gemini`, `prompt-builder`)
 * vive en el lado de Next: meterla en una action de Convex obligaria a
 * duplicarla. Convex guarda el ESTADO de la cola; Next hace el trabajo.
 *
 * Se procesa por tandas y el llamante repite hasta que el lote termina. Asi
 * ninguna peticion se acerca al limite de tiempo de Vercel.
 */

// Concurrencia deliberadamente baja: el proveedor de imagen ya devuelve
// "System busy" con normalidad, y 60 peticiones a la vez lo garantizarian.
const DEFAULT_CONCURRENCY = 2
const DEFAULT_BATCH = 4
const MAX_ATTEMPTS = 3

type ClaimedItem = {
    item_id: Id<'campaign_job_items'>
    ref: string
    payload: ManifestPost
    scheduled_at?: string
    attempts: number
}

/** Traduce un post del manifiesto a las opciones que espera el generador. */
function buildOptions(
    post: ManifestPost,
    style: { name?: string; analysis?: unknown } | null,
    model: string | undefined,
    selectedColors: SelectedColor[],
    context: ContextItem[],
) {
    const format = post.format ? findSocialFormat(post.format) : null
    const analysis = (style?.analysis ?? {}) as { keywords?: string[]; subjectLabel?: string }
    const layout = post.layout ? findLayout(post.layout) : null

    return {
        headline: post.headline,
        cta: post.cta,
        platform: post.platform,
        aspectRatio: format?.aspectRatio,
        model,
        // Sin `selectedColors` el prompt deja la paleta en "Sin definir" y el
        // modelo se inventa los colores de marca: es lo que hace la interfaz
        // al inicializar el kit, y aqui tiene que pasar lo mismo.
        selectedColors,
        // El logo viaja aqui, como imagen de referencia: describirlo con
        // palabras hace que el modelo se invente uno parecido.
        context,
        layoutReference: layout?.referenceImage,
        // Mismo mapeo que hace el modulo de imagen al enviar su peticion.
        selectedStyles: style?.name ? [style.name] : [],
        styleAnalysisKeywords: Array.isArray(analysis.keywords) ? analysis.keywords : [],
        styleAnalysisSubject: typeof analysis.subjectLabel === 'string' ? analysis.subjectLabel : undefined,
    }
}

/**
 * El texto que se manda a generar. Un prompt en prosa manda tal cual (es como
 * trabaja hoy Juanfran y funciona); si no lo hay, se compone a partir de los
 * campos estructurados.
 */
function buildPrompt(post: ManifestPost): string {
    const base = post.prompt
        ? post.prompt
        : [
            post.goal ? `Objetivo: ${post.goal}` : '',
            post.headline ? `Título: ${post.headline}` : '',
            post.body ? `Texto:\n${post.body}` : '',
            post.cta ? `Llamada a la acción: ${post.cta}` : '',
            post.hashtags?.length ? post.hashtags.join(' ') : '',
        ].filter(Boolean).join('\n\n')

    const partes = [base]

    // La composicion del layout se adjunta aqui porque el servidor solo la
    // aplicaria a traves de `layoutReference`, y ningun layout del catalogo
    // tiene imagen de referencia (ver layout-directive.ts).
    const layoutDirective = buildLayoutDirective(post.layout)
    if (layoutDirective) partes.push('', layoutDirective)

    // El contenido visual se inyecta con la MISMA instruccion que usa la
    // interfaz al aplicar una sugerencia, para que el resultado sea el mismo
    // se pida desde el panel o desde una campana.
    const visual = (post.visual_content || post.visual_note || '').trim()
    if (visual) {
        partes.push('', P06B.PRIORITY_HEADER, '', P06B.AI_IMAGE_DESCRIPTION_INSTRUCTION(visual))
    }

    return partes.join('\n')
}

export async function POST(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
    const startedAt = Date.now()

    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json(
                { ok: false, error: { code: 'unauthorized', message: 'Sesion no valida.' } },
                { status: 401 },
            )
        }

        const { jobId } = await context.params
        let batch = DEFAULT_BATCH
        try {
            const body = await request.json()
            if (typeof body?.max === 'number' && body.max > 0) batch = Math.min(body.max, 12)
        } catch {
            // Sin cuerpo: se usa la tanda por defecto.
        }

        const claimed = await authedFetchQuery(api.campaigns.claimPendingItems, {
            clerk_user_id: userId,
            job_id: jobId as Id<'campaign_jobs'>,
            limit: batch,
        })

        if (!claimed) {
            return NextResponse.json(
                { ok: false, error: { code: 'not_found', message: 'Lote no encontrado.' } },
                { status: 404 },
            )
        }

        if (claimed.items.length === 0) {
            return NextResponse.json({ ok: true, processed: 0, remaining: 0, job: claimed.job })
        }

        // El modelo de imagen se toma SIEMPRE de la configuracion de Admin
        // (AGENTS.md, regla 14): nada de hardcodear nombres de modelo aqui.
        const aiConfig = await authedFetchQuery(api.settings.getAIConfig, {})
        const imageModel = aiConfig?.imageModel
        if (!imageModel) {
            return NextResponse.json(
                {
                    ok: false,
                    error: {
                        code: 'model_not_configured',
                        message: 'No hay modelo de imagen configurado en Admin > Modelos.',
                    },
                },
                { status: 503 },
            )
        }

        const brandDoc = claimed.brand as (Record<string, unknown> & { brand_name?: string }) | null
        const brand = {
            name: brandDoc?.brand_name || 'Brand',
            brand_dna: (brandDoc || {}) as unknown as BrandDNA,
        }

        const items = claimed.items as ClaimedItem[]
        const results: Array<{ ref: string; ok: boolean; error?: string }> = []

        // Cola con concurrencia limitada: varios trabajadores tirando de la
        // misma lista en vez de lanzar todo a la vez.
        let cursor = 0
        const worker = async () => {
            while (cursor < items.length) {
                const item = items[cursor++]

                await authedFetchMutation(api.campaigns.startItem, {
                    clerk_user_id: userId,
                    item_id: item.item_id,
                })

                try {
                    const post = item.payload
                    const style = post.style
                        ? await authedFetchQuery(api.stylePresets.getActiveBySlug, { slug: post.style })
                        : null

                    const selectedColors = resolveCampaignColors(
                        post.colors,
                        (brandDoc as { colors?: unknown } | null)?.colors,
                    )

                    const campaignContext = buildCampaignContext(brandDoc as { logo_url?: unknown; logos?: unknown } | null, {
                        includeLogo: post.logo,
                        preferredLogo: post.logo_id,
                    })

                    const generated = await generateContentImageUnified(
                        brand,
                        buildPrompt(post),
                        buildOptions(post, style, imageModel, selectedColors, campaignContext),
                    )

                    // La imagen llega como data URL de varios MB: hay que
                    // guardarla en Storage antes de referenciarla.
                    const storedUrl = await persistGeneratedImage(generated)

                    await authedFetchMutation(api.campaigns.finishItem, {
                        clerk_user_id: userId,
                        item_id: item.item_id,
                        ok: true,
                        asset_key: storedUrl,
                    })

                    // El credito se cobra SOLO si la imagen salio, igual que en
                    // el modulo de imagen.
                    try {
                        await authedFetchMutation(api.users.consumeCredits, {
                            clerk_id: userId,
                            metadata: { action: 'campaign_batch', ref: item.ref },
                        })
                    } catch (creditError) {
                        log.warn('CAMPAIGN', `Credito no descontado para ${item.ref} (la imagen si se genero)`, creditError)
                    }

                    results.push({ ref: item.ref, ok: true })
                    log.success('CAMPAIGN', `Generada ${item.ref}`)
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Error desconocido'
                    const agotado = item.attempts + 1 >= MAX_ATTEMPTS

                    // Mientras queden intentos vuelve a la cola sin contar como
                    // fallo; solo al agotarlos se da por perdida, y aun asi el
                    // lote sigue adelante con el resto.
                    if (agotado) {
                        await authedFetchMutation(api.campaigns.finishItem, {
                            clerk_user_id: userId,
                            item_id: item.item_id,
                            ok: false,
                            error: message,
                        })
                    } else {
                        await authedFetchMutation(api.campaigns.requeueItem, {
                            clerk_user_id: userId,
                            item_id: item.item_id,
                            error: `Reintentable: ${message}`,
                        })
                    }

                    results.push({ ref: item.ref, ok: false, error: message })
                    log.warn('CAMPAIGN', `Fallo ${item.ref} (intento ${item.attempts + 1}/${MAX_ATTEMPTS}): ${message}`)
                }
            }
        }

        await Promise.all(Array.from({ length: Math.min(DEFAULT_CONCURRENCY, items.length) }, worker))

        const job = await authedFetchQuery(api.campaigns.getJob, {
            clerk_user_id: userId,
            job_id: jobId as Id<'campaign_jobs'>,
        })

        const remaining = job ? job.total - job.completed - job.failed : 0

        log.info(
            'CAMPAIGN',
            `Tanda completada | job=${jobId} procesadas=${results.length} restantes=${remaining} ${Date.now() - startedAt}ms`,
        )

        return NextResponse.json({
            ok: true,
            processed: results.length,
            results,
            remaining,
            job: job ? { status: job.status, total: job.total, completed: job.completed, failed: job.failed } : null,
        })
    } catch (error) {
        log.error('CAMPAIGN', 'Fallo procesando lote', error)
        const message = error instanceof Error ? error.message : 'Error desconocido.'
        return NextResponse.json({ ok: false, error: { code: 'internal_error', message } }, { status: 500 })
    }
}
