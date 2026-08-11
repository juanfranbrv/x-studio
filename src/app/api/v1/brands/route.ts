import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { api } from '@/../convex/_generated/api'
import { authedFetchQuery } from '@/lib/convex-server'
import { log } from '@/lib/logger'

/**
 * GET /api/v1/brands — kits de marca del usuario con su slug.
 *
 * Es el catalogo que hay que consultar para saber que poner en
 * `campaign.brand` del manifiesto.
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

        const brands = await authedFetchQuery(api.brands.listSummariesByClerkId, { clerk_user_id: userId })

        return NextResponse.json({
            ok: true,
            brands: (brands ?? []).map((brand) => ({
                slug: brand.slug ?? null,
                name: brand.brand_name,
                url: brand.url,
                updated_at: brand.updated_at,
            })),
        })
    } catch (error) {
        log.error('CAMPAIGN', 'Fallo al listar marcas', error)
        const message = error instanceof Error ? error.message : 'Error desconocido.'
        return NextResponse.json({ ok: false, error: { code: 'internal_error', message } }, { status: 500 })
    }
}
