import { NextRequest, NextResponse } from 'next/server'
import type { Id } from '@/../convex/_generated/dataModel'
import { api } from '@/../convex/_generated/api'
import { authedFetchQuery } from '@/lib/convex-server'
import { requireCampaignAdmin } from '@/lib/campaign-admin-guard'
import { INTENT_CATALOG, SOCIAL_FORMATS } from '@/lib/creation-flow-types'
import { listBaseLayouts, listLayoutsByIntent } from '@/lib/campaigns/catalogs'
import { CAMPAIGN_PLATFORMS } from '@/lib/campaigns/manifest'
import { buildCampaignPrompt, buildCatalogSummary, type GuideCatalog } from '@/lib/campaigns/guide'
import {
    buildCampaignAssistantPrompt,
    type CampaignAssistantBrief,
    type CampaignBrandContext,
} from '@/lib/campaigns/assistant'
import { log } from '@/lib/logger'

/**
 * GET /api/v1/campaign-guide — el prompt de sistema para disenar campanas.
 *
 * Devuelve un texto listo para pegar en cualquier IA: explica las dos salidas
 * esperadas e incrusta los catálogos reales de esta cuenta. El agente externo
 * produce los prompts Markdown para uso manual y el manifiesto JSON.
 *
 * `?format=text` lo devuelve en texto plano, para copiar y pegar directamente.
 */
export async function GET(request: NextRequest) {
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
            intents: INTENT_CATALOG.map((intent) => ({
                id: intent.id,
                name: intent.name,
                description: intent.description,
            })),
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
            catalog,
            prompt,
        })
    } catch (error) {
        log.error('CAMPAIGN', 'Fallo al generar la guia de campana', error)
        const message = error instanceof Error ? error.message : 'Error desconocido.'
        return NextResponse.json({ ok: false, error: { code: 'internal_error', message } }, { status: 500 })
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function buildCatalog(styles: Awaited<ReturnType<typeof authedFetchQuery<typeof api.stylePresets.listCatalog>>>, brands: Awaited<ReturnType<typeof authedFetchQuery<typeof api.brands.listSummariesByClerkId>>>) {
    return {
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
        intents: INTENT_CATALOG.map((intent) => ({
            id: intent.id,
            name: intent.name,
            description: intent.description,
        })),
        platforms: [...CAMPAIGN_PLATFORMS],
    } satisfies GuideCatalog
}

function buildBrandContext(brand: Record<string, unknown>, requestedSlug: string): CampaignBrandContext {
    const logos = Array.isArray(brand.logos) ? brand.logos : []

    return {
        slug: text(brand.slug) ?? requestedSlug,
        name: text(brand.brand_name) ?? 'Kit de marca',
        businessOverview: text(brand.business_overview),
        audience: Array.isArray(brand.target_audience) ? brand.target_audience.filter((item): item is string => typeof item === 'string') : undefined,
        tone: Array.isArray(brand.tone_of_voice) ? brand.tone_of_voice.filter((item): item is string => typeof item === 'string') : undefined,
        values: Array.isArray(brand.brand_values) ? brand.brand_values.filter((item): item is string => typeof item === 'string') : undefined,
        website: text(brand.url),
        auxiliaryLogos: logos.map((logo, index) => {
            const item = (logo ?? {}) as Record<string, unknown>
            return {
                id: text(item.id) ?? text(item._id) ?? `logo-${index}`,
                label: text(item.name) ?? text(item.label) ?? `Logo auxiliar ${index + 1}`,
            }
        }),
    }
}

/**
 * POST /api/v1/campaign-guide — crea una guía personalizada para el agente
 * externo a partir del briefing y el kit de marca del usuario.
 */
export async function POST(request: NextRequest) {
    try {
        const access = await requireCampaignAdmin()
        if (!access.ok) return access.response
        const { userId } = access
        if (!userId) {
            return NextResponse.json(
                { ok: false, error: { code: 'unauthorized', message: 'Sesión no válida.' } },
                { status: 401 },
            )
        }

        let body: unknown
        try {
            body = await request.json()
        } catch {
            return NextResponse.json(
                { ok: false, error: { code: 'invalid_json', message: 'El cuerpo de la petición no es JSON válido.' } },
                { status: 400 },
            )
        }

        if (!isRecord(body)) {
            return NextResponse.json(
                { ok: false, error: { code: 'invalid_request', message: 'El cuerpo debe ser un objeto JSON.' } },
                { status: 422 },
            )
        }

        const brandSlug = text(body.brand_slug)
        const brandId = text(body.brand_id)
        const brief = isRecord(body.brief) ? (body.brief as unknown as CampaignAssistantBrief) : null

        if ((!brandSlug && !brandId) || !brief || !text(brief.objective)) {
            return NextResponse.json(
                { ok: false, error: { code: 'invalid_brief', message: 'Faltan brand_slug u objective en el briefing.' } },
                { status: 422 },
            )
        }

        let brand = null
        if (brandId) {
            try {
                brand = await authedFetchQuery(api.brands.getBrandDNAById, {
                    id: brandId as Id<'brand_dna'>,
                    clerk_user_id: userId,
                })
            } catch {
                // Un ID legado o mal serializado no debe impedir resolver el kit por slug.
                brand = null
            }
        }
        if (!brand && brandSlug) {
            brand = await authedFetchQuery(api.brands.getBrandDNABySlug, { slug: brandSlug, clerk_user_id: userId })
        }

        if (!brand) {
            return NextResponse.json(
                { ok: false, error: { code: 'unknown_brand', message: `No existe el kit de marca solicitado.` } },
                { status: 422 },
            )
        }

        const [styles, brands, activeContextDocument] = await Promise.all([
            authedFetchQuery(api.stylePresets.listCatalog, {}),
            authedFetchQuery(api.brands.listSummariesByClerkId, { clerk_user_id: userId }),
            authedFetchQuery(api.contextDocuments.getActiveForBrand, {
                brand_id: brand._id,
                clerk_user_id: userId,
            }),
        ])
        const contextDocument = activeContextDocument
            ? {
                id: String(activeContextDocument._id),
                title: activeContextDocument.title,
                content: activeContextDocument.content,
            }
            : null

        const catalog = buildCatalog(styles, brands)
        const brandContext = buildBrandContext(brand as unknown as Record<string, unknown>, brandSlug ?? '')
        const prompt = buildCampaignAssistantPrompt({ brief, brand: brandContext, catalog, contextDocument })

        return NextResponse.json({
            ok: true,
            prompt,
            brand: { slug: brandContext.slug, name: brandContext.name },
            summary: buildCatalogSummary(catalog),
        })
    } catch (error) {
        log.error('CAMPAIGN', 'Fallo al generar la guía personalizada', error)
        const message = error instanceof Error ? error.message : 'Error desconocido.'
        return NextResponse.json({ ok: false, error: { code: 'internal_error', message } }, { status: 500 })
    }
}
