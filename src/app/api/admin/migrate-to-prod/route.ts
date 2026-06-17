import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/../convex/_generated/api'
import { isAdminEmail } from '@/lib/auth-config'

export const runtime = 'nodejs'

const DEFAULT_SOURCE_USER_ID = 'user_37R8MiIJvgY7ZIQaMyDnQCqDl5t'
const DEFAULT_TARGET_USER_ID = 'user_3AB2BmaIPSkUvq1jIap4rKqRqdL'

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

function getDeploymentName(url: string | undefined) {
    if (!url) return null
    try {
        return new URL(url).hostname.split('.')[0] || null
    } catch {
        return null
    }
}

function getMigrationConfig() {
    const sourceConvexUrl = process.env.MIGRATION_SOURCE_URL?.trim() || process.env.NEXT_PUBLIC_CONVEX_URL?.trim() || null
    const targetConvexUrl = process.env.MIGRATION_TARGET_URL?.trim() || process.env.CONVEX_PROD_URL?.trim() || null
    const sourceUserId = process.env.MIGRATION_SOURCE_USER_ID?.trim() || DEFAULT_SOURCE_USER_ID
    const targetUserId = process.env.MIGRATION_TARGET_USER_ID?.trim() || DEFAULT_TARGET_USER_ID
    const sourceDeployment = getDeploymentName(sourceConvexUrl || undefined)
    const targetDeployment = getDeploymentName(targetConvexUrl || undefined)

    return {
        sourceConvexUrl,
        targetConvexUrl,
        sourceUserId,
        targetUserId,
        sourceDeployment,
        targetDeployment,
        sameDeployment: Boolean(sourceDeployment && targetDeployment && sourceDeployment === targetDeployment),
        sameUser: sourceUserId === targetUserId,
        blockedAsDuplicateTarget: Boolean(sourceDeployment && targetDeployment && sourceDeployment === targetDeployment && sourceUserId === targetUserId),
    }
}

async function listSourceAssets(config: ReturnType<typeof getMigrationConfig>, secret: string | undefined) {
    if (!config.sourceConvexUrl || !secret) return []
    const source = new ConvexHttpClient(config.sourceConvexUrl)
    return await source.query(api.migration.listMigratableAssets, {
        secret,
        user_id: config.sourceUserId,
        limit: 240,
    })
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

export async function GET() {
    const user = await currentUser()
    const email = user?.emailAddresses?.[0]?.emailAddress
    if (!user || !isAdminEmail(email)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const config = getMigrationConfig()
    const assets = await listSourceAssets(config, process.env.MIGRATION_SECRET)

    return NextResponse.json({ ...config, assets })
}

export async function POST(request: Request) {
    // 1. Autorizacion: solo admin autenticado.
    const user = await currentUser()
    const email = user?.emailAddresses?.[0]?.emailAddress
    if (!user || !isAdminEmail(email)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // 2. Configuracion del puente (solo presente en local).
    const config = getMigrationConfig()
    const prodUrl = config.targetConvexUrl
    const secret = process.env.MIGRATION_SECRET
    if (!prodUrl || !secret) {
        return NextResponse.json(
            { error: 'Migrador no configurado (faltan CONVEX_PROD_URL / MIGRATION_SECRET). Disponible solo en local.' },
            { status: 400 }
        )
    }

    const body = await request.json().catch(() => null) as { assets?: IncomingAsset[]; targetUserId?: string } | null
    const assets = Array.isArray(body?.assets) ? body!.assets : []
    if (assets.length === 0) {
        return NextResponse.json({ error: 'No se enviaron activos' }, { status: 400 })
    }

    const prod = new ConvexHttpClient(prodUrl)

    // 3. La migración local copia desde el usuario dev fijado hacia el usuario prod fijado.
    const targetUserId = config.targetUserId

    let migrated = 0
    let skipped = 0
    const errors: Array<{ asset_key: string; error: string }> = []

    for (const asset of assets) {
        try {
            if (asset.module === 'image') {
                const source = asset.original_url || asset.preview_url
                if (!source) throw new Error('La imagen no tiene URL de origen')
                const storageId = await uploadToProd(prod, secret, source)
                const snapshot = {
                    module: 'image',
                    migration: {
                        source_asset_key: asset.asset_key,
                        source_deployment: config.sourceDeployment,
                        target_deployment: config.targetDeployment,
                        migrated_at: new Date().toISOString(),
                    },
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
                const result = await prod.mutation(api.migration.createMigratedSession, {
                    secret,
                    user_id: targetUserId,
                    module: 'image',
                    title: asset.session_title,
                    source_asset_key: asset.asset_key,
                    snapshot,
                })
                if (result.created) migrated += 1
                else skipped += 1
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
                    migration: {
                        source_asset_key: asset.asset_key,
                        source_deployment: config.sourceDeployment,
                        target_deployment: config.targetDeployment,
                        migrated_at: new Date().toISOString(),
                    },
                    caption: asset.copy,
                    previewState: { slides: migratedSlides },
                }
                const result = await prod.mutation(api.migration.createMigratedSession, {
                    secret,
                    user_id: targetUserId,
                    module: 'carousel',
                    title: asset.session_title,
                    source_asset_key: asset.asset_key,
                    snapshot,
                })
                if (result.created) migrated += 1
                else skipped += 1
            }
        } catch (error) {
            errors.push({
                asset_key: asset.asset_key,
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    return NextResponse.json({ migrated, skipped, failed: errors.length, errors, ...config })
}
