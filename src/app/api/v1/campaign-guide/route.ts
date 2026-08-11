import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { api } from '@/../convex/_generated/api'
import { authedFetchQuery } from '@/lib/convex-server'
import { SOCIAL_FORMATS } from '@/lib/creation-flow-types'
import { listBaseLayouts, listLayoutsByIntent } from '@/lib/campaigns/catalogs'
import { CAMPAIGN_PLATFORMS } from '@/lib/campaigns/manifest'
import { buildCampaignPrompt, buildCatalogSummary, type GuideCatalog } from '@/lib/campaigns/guide'
import { log } from '@/lib/logger'

/**
 * GET /api/v1/campaign-guide — el prompt de sistema para disenar campanas.
 *
 * Devuelve un texto listo para pegar en cualquier IA: explica el formato del
 * manifiesto e incrusta los catalogos reales de esta cuenta (sus marcas, los
 * estilos activos, formatos y layouts). Sin esto, quien escribe la campana
 * inventa identificadores que no existen y el lote se rechaza entero.
 *
 * `?format=text` lo devuelve en texto plano, para copiar y pegar directamente.
 */
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json(
                { ok: false, error: { code: 'unauthorized', message: 'Sesion no valida.' } },
                { status: 401 },
            )
        }

        const [styles, brands] = await Promise.all([
            authedFetchQuery(api.stylePresets.listCatalog, {}),
            authedFetchQuery(api.brands.listSummariesByClerkId, { clerk_user_id: userId }),
        ])

        const catalog: GuideCatalog = {
            brands: (brands ?? [])
                .filter((brand) => Boolean(brand.slug))
                .map((brand) => ({ slug: brand.slug as string, name: brand.brand_name })),
            styles: (styles ?? [])
                .filter((style) => Boolean(style.slug))
                .map((style) => ({ slug: style.slug, name: style.name, description: style.description ?? null })),
            formats: SOCIAL_FORMATS.map((format) => ({
                id: format.id,
                platform: format.platform,
                name: format.name,
                aspect_ratio: format.aspectRatio,
                description: format.description,
            })),
            layouts: listBaseLayouts().map((layout) => ({
                id: layout.id,
                name: layout.name,
                description: layout.description ?? null,
            })),
            layoutsByIntent: listLayoutsByIntent(),
            platforms: [...CAMPAIGN_PLATFORMS],
        }

        const prompt = buildCampaignPrompt(catalog)

        if (request.nextUrl.searchParams.get('format') === 'text') {
            return new NextResponse(prompt, {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
        }

        return NextResponse.json({
            ok: true,
            summary: buildCatalogSummary(catalog),
            prompt,
        })
    } catch (error) {
        log.error('CAMPAIGN', 'Fallo al generar la guia de campana', error)
        const message = error instanceof Error ? error.message : 'Error desconocido.'
        return NextResponse.json({ ok: false, error: { code: 'internal_error', message } }, { status: 500 })
    }
}
