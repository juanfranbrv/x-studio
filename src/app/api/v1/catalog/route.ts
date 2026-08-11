import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { api } from '@/../convex/_generated/api'
import { authedFetchQuery } from '@/lib/convex-server'
import { SOCIAL_FORMATS } from '@/lib/creation-flow-types'
import { listBaseLayouts, listLayoutsByIntent, listIntents } from '@/lib/campaigns/catalogs'
import { CAMPAIGN_PLATFORMS } from '@/lib/campaigns/manifest'
import { log } from '@/lib/logger'

/**
 * GET /api/v1/catalog — todo lo elegible en una campana, en una sola llamada.
 *
 * Es la fuente de verdad para escribir un manifiesto: estilos, formatos,
 * layouts y plataformas disponibles AHORA. Se sirve dinamicamente a proposito;
 * un listado escrito a mano nace obsoleto en cuanto se anade un estilo.
 */
export async function GET() {
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

        return NextResponse.json({
            ok: true,
            brands: (brands ?? [])
                .filter((brand) => Boolean(brand.slug))
                .map((brand) => ({ slug: brand.slug, name: brand.brand_name })),
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
            layouts_by_intent: listLayoutsByIntent(),
            intents: listIntents(),
            platforms: CAMPAIGN_PLATFORMS,
        })
    } catch (error) {
        log.error('CAMPAIGN', 'Fallo al servir el catalogo', error)
        const message = error instanceof Error ? error.message : 'Error desconocido.'
        return NextResponse.json({ ok: false, error: { code: 'internal_error', message } }, { status: 500 })
    }
}
