import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/../convex/_generated/api'
import { isAdminEmail } from '@/lib/auth-config'

export const runtime = 'nodejs'

// Puente local dev -> prod. Solo funciona en local (donde existen las dos
// conexiones, la URL de prod y el MIGRATION_SECRET). Append-only: inserta
// sesiones nuevas en prod, nunca borra ni sobrescribe.

interface IncomingSlide {
    title?: string
    description?: string
    preview_url?: string
    original_url?: string
}

interface IncomingAsset {
    asset_key: string
    module: 'image' | 'carousel'
    session_title: string
    copy?: string
    platform?: string
    format?: string
    created_at?: string
    preview_url?: string
    original_url?: string
    slides?: IncomingSlide[]
}

async function uploadToProd(prod: ConvexHttpClient, secret: string, sourceUrl: string): Promise<string> {
    const download = await fetch(sourceUrl)
    if (!download.ok) throw new Error(`No se pudo descargar la imagen origen (${download.status})`)
    const contentType = download.headers.get('content-type') || 'image/png'
    const bytes = await download.arrayBuffer()

    const uploadUrl = await prod.mutation(api.migration.generateUploadUrl, { secret })
    const uploaded = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': contentType },
        body: bytes,
    })
    if (!uploaded.ok) throw new Error(`Fallo al subir a prod (${uploaded.status})`)
    const { storageId } = await uploaded.json()
    if (!storageId) throw new Error('Prod no devolvio storageId')
    return storageId as string
}

export async function POST(request: Request) {
    // 1. Autorizacion: solo admin autenticado.
    const user = await currentUser()
    const email = user?.emailAddresses?.[0]?.emailAddress
    if (!user || !isAdminEmail(email)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // 2. Configuracion del puente (solo presente en local).
    const prodUrl = process.env.CONVEX_PROD_URL
    const secret = process.env.MIGRATION_SECRET
    if (!prodUrl || !secret) {
        return NextResponse.json(
            { error: 'Migrador no configurado (faltan CONVEX_PROD_URL / MIGRATION_SECRET). Disponible solo en local.' },
            { status: 400 }
        )
    }

    const body = await request.json().catch(() => null) as { assets?: IncomingAsset[] } | null
    const assets = Array.isArray(body?.assets) ? body!.assets : []
    if (assets.length === 0) {
        return NextResponse.json({ error: 'No se enviaron activos' }, { status: 400 })
    }

    const prod = new ConvexHttpClient(prodUrl)

    // 3. Resolver el clerk_id del mismo usuario en prod (por email).
    let targetUserId: string | null
    try {
        targetUserId = await prod.query(api.migration.findClerkIdByEmail, { secret, email: email! })
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error('[migrate-to-prod] fallo consultando prod:', msg)
        return NextResponse.json({ error: `Fallo conectando a producción: ${msg}` }, { status: 500 })
    }

    if (!targetUserId) {
        return NextResponse.json(
            { error: `No existe un usuario en produccion con el email ${email}. Inicia sesion una vez en produccion y reintenta.` },
            { status: 400 }
        )
    }

    let migrated = 0
    const errors: Array<{ asset_key: string; error: string }> = []

    for (const asset of assets) {
        try {
            if (asset.module === 'image') {
                const source = asset.original_url || asset.preview_url
                if (!source) throw new Error('La imagen no tiene URL de origen')
                const storageId = await uploadToProd(prod, secret, source)
                const snapshot = {
                    module: 'image',
                    creationFlowState: {
                        caption: asset.copy,
                        selectedPlatform: asset.platform,
                        selectedFormat: asset.format,
                    },
                    sessionGenerations: [
                        {
                            id: `migrated-${Date.now()}`,
                            created_at: asset.created_at,
                            caption: asset.copy,
                            platform: asset.platform,
                            format: asset.format,
                            image_storage_id: storageId,
                            preview_image_storage_id: storageId,
                        },
                    ],
                }
                await prod.mutation(api.migration.createMigratedSession, {
                    secret,
                    user_id: targetUserId,
                    module: 'image',
                    title: asset.session_title,
                    snapshot,
                })
                migrated += 1
            } else if (asset.module === 'carousel') {
                const slides = Array.isArray(asset.slides) ? asset.slides : []
                if (slides.length === 0) throw new Error('El carrusel no tiene slides')
                const migratedSlides = []
                for (let i = 0; i < slides.length; i++) {
                    const source = slides[i].original_url || slides[i].preview_url
                    if (!source) continue
                    const storageId = await uploadToProd(prod, secret, source)
                    migratedSlides.push({
                        index: i,
                        title: slides[i].title,
                        description: slides[i].description,
                        image_storage_id: storageId,
                    })
                }
                if (migratedSlides.length === 0) throw new Error('Ninguna slide tenia imagen descargable')
                const snapshot = {
                    module: 'carousel',
                    caption: asset.copy,
                    previewState: { slides: migratedSlides },
                }
                await prod.mutation(api.migration.createMigratedSession, {
                    secret,
                    user_id: targetUserId,
                    module: 'carousel',
                    title: asset.session_title,
                    snapshot,
                })
                migrated += 1
            }
        } catch (error) {
            errors.push({
                asset_key: asset.asset_key,
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    return NextResponse.json({ migrated, failed: errors.length, errors })
}
