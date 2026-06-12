import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { generateContentImageUnified } from '@/lib/gemini'
import type { ImageGenerationOptions } from '@/lib/prompt-builder'
import type { BrandDNA } from '@/lib/brand-types'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/../convex/_generated/api'
import { authedFetchQuery, authedFetchMutation } from '@/lib/convex-server'
import { log } from '@/lib/logger'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

function extractErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message
    if (typeof error === 'string') return error

    if (error && typeof error === 'object') {
        const obj = error as Record<string, unknown>
        const direct = obj.message
        if (typeof direct === 'string' && direct.trim()) return direct

        const nestedError = obj.error
        if (typeof nestedError === 'string' && nestedError.trim()) return nestedError
        if (nestedError && typeof nestedError === 'object') {
            const nestedMessage = (nestedError as Record<string, unknown>).message
            if (typeof nestedMessage === 'string' && nestedMessage.trim()) return nestedMessage
        }

        try {
            const serialized = JSON.stringify(obj)
            if (serialized && serialized !== '{}') return serialized
        } catch {
            // no-op
        }
    }

    return 'Failed to generate image'
}

function normalizeBrandDNA(input: unknown): Partial<BrandDNA> | null {
    if (!input || typeof input !== 'object') return null
    return input as Partial<BrandDNA>
}

export async function POST(request: NextRequest) {
    try {
        // Verify authentication
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check user credits before generation
        let creditsData = await authedFetchQuery(api.users.getCredits, { clerk_id: userId })

        // If user doesn't exist in Convex, create them automatically
        if (!creditsData) {
            const client = await clerkClient()
            const clerkUser = await client.users.getUser(userId)
            const email = clerkUser.emailAddresses[0]?.emailAddress || ''

            await authedFetchMutation(api.users.upsertUser, {
                clerk_id: userId,
                email: email
            })

            // Re-fetch credits data
            creditsData = await authedFetchQuery(api.users.getCredits, { clerk_id: userId })
        }

        if (!creditsData) {
            return NextResponse.json({ error: 'Error creando usuario' }, { status: 500 })
        }

        if (creditsData.status !== 'active') {
            const statusMessages: Record<string, string> = {
                waitlist: 'Tu cuenta está en lista de espera. Contacta al admin para activarla.',
                suspended: 'Tu cuenta ha sido suspendida. Contacta al admin.',
            }
            return NextResponse.json({
                error: statusMessages[creditsData.status] || 'Cuenta no activa'
            }, { status: 403 })
        }

        if (creditsData.credits < 1) {
            return NextResponse.json({
                error: 'Sin créditos disponibles. Contacta al admin para obtener más.'
            }, { status: 402 })
        }

        // Parse request body
        // Parse request body
        const body = await request.json()
        const { prompt, headline, cta, platform, brandDNA: rawBrandDNA, context, model: incomingModel, layoutReference, aspectRatio, selectedColors, promptAlreadyBuilt, auditFlowId } = body as {
            prompt: string
            headline?: string
            cta?: string
            platform?: 'instagram' | 'tiktok' | 'youtube' | 'linkedin'
            brandDNA?: BrandDNA | null
            context?: ImageGenerationOptions['context']
            model?: string
            layoutReference?: string
            aspectRatio?: string
            selectedColors?: ImageGenerationOptions['selectedColors']
            promptAlreadyBuilt?: boolean
            auditFlowId?: string
        }
        const brandDNA = normalizeBrandDNA(rawBrandDNA)
        let model = incomingModel

        // Robust Server-Side Fallback: If model is missing, fetch from DB
        if (!model) {
            log.info('API', 'Model not provided by client, fetching from DB...')
            try {
                // Use the initialized convex client since we are in an API route
                const aiConfig = await convex.query(api.settings.getAIConfig)
                if (aiConfig && aiConfig.imageModel) {
                    model = aiConfig.imageModel
                    log.success('API', `Resolved model from DB: ${model}`)
                }
            } catch (err) {
                log.error('API', 'Failed to fetch AI config', err)
            }
        }

        const provider = model?.startsWith('wisdom/')
            ? 'Wisdom'
            : model?.startsWith('naga/')
                ? 'NagaAI'
            : model?.startsWith('replicate/')
                ? 'Replicate'
            : model?.startsWith('atlas/')
                ? 'Atlas'
            : model?.startsWith('openai/')
                ? 'OpenAI'
            : model?.startsWith('google/')
                ? 'Google Oficial'
                : 'Google Oficial'
        const generationStartedAt = Date.now()
        log.info('IMAGE', `Start | Provider=${provider} Model=${model || 'NO_CONFIG'} PromptLen=${prompt?.length || 0} Brand=${brandDNA?.brand_name || 'N/A'}`)

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
        }

        if (!brandDNA) {
            log.warn('API', 'Image generation requested without valid brandDNA payload')
        }

        // Generate image with brand context
        const imageUrl = await generateContentImageUnified(
            { name: brandDNA?.brand_name || 'Brand', brand_dna: (brandDNA || {}) as BrandDNA },
            prompt,
            {
                headline,
                cta,
                platform,
                context,
                model,
                layoutReference,
                aspectRatio,
                selectedColors,
                promptAlreadyBuilt
            }
        )

        try {
            let userEmail: string | undefined
            const userRow = await authedFetchQuery(api.users.getUser, { clerk_id: userId })
            if (userRow?.email) {
                userEmail = userRow.email
            }
            await convex.mutation(api.economic.logEconomicEvent, {
                flow_id: typeof auditFlowId === 'string' ? auditFlowId : undefined,
                phase: 'generate_image',
                model: model || 'unknown-image-model',
                kind: 'image',
                user_clerk_id: userId,
                user_email: userEmail,
                metadata: {
                    prompt_len: prompt.length,
                    platform: platform || null,
                    aspect_ratio: aspectRatio || null,
                }
            })
        } catch (auditError) {
            log.warn('API', 'No se pudo registrar coste económico de imagen', auditError)
        }

        // Consume credit after successful generation
        try {
            await authedFetchMutation(api.users.consumeCredits, {
                clerk_id: userId,
                metadata: { action: 'image_generation', prompt: prompt.substring(0, 100) }
            })
        } catch (creditError) {
            log.warn('API', 'Failed to consume credit (image was generated)', creditError)
            // Don't fail the request - image was generated, we just log the credit issue
        }

        const elapsedMs = Date.now() - generationStartedAt
        log.success('IMAGE', `Done | ${elapsedMs}ms`)

        return NextResponse.json({
            success: true,
            imageUrl,
            creditsRemaining: (creditsData.credits - 1)
        })

    } catch (error: unknown) {
        log.error('API', 'Generation error', error)

        const errorMessage = extractErrorMessage(error)

        // Determine error type and appropriate status code
        let status = 500
        let userMessage = 'Error al generar la imagen. Por favor, inténtalo de nuevo.'
        let errorType = 'UNKNOWN'

        if (errorMessage.toLowerCase().includes('system busy') ||
            errorMessage.toLowerCase().includes('system overloaded') ||
            errorMessage.toLowerCase().includes('overloaded') ||
            errorMessage.toLowerCase().includes('please try again') ||
            errorMessage.toLowerCase().includes('no available channel') ||
            errorMessage.toLowerCase().includes('429 received from upstream')) {
            status = 503
            userMessage = 'El servicio está temporalmente saturado. Por favor, inténtalo de nuevo en unos segundos.'
            errorType = 'WISDOM_BUSY'
        } else if (errorMessage.toLowerCase().includes('timeout') ||
            errorMessage.toLowerCase().includes('timed out')) {
            status = 504
            userMessage = 'La generacion tardo demasiado y se cancelo. Intentalo de nuevo o cambia de modelo.'
            errorType = 'PROVIDER_TIMEOUT'
        } else if (errorMessage.toLowerCase().includes('rate limit') ||
            errorMessage.toLowerCase().includes('quota')) {
            status = 429
            userMessage = 'Has alcanzado el límite de generaciones. Espera un momento antes de continuar.'
            errorType = 'RATE_LIMIT'
        } else if (errorMessage.toLowerCase().includes('no image found')) {
            status = 500
            userMessage = 'No se pudo generar la imagen. Inténtalo de nuevo con un prompt diferente.'
            errorType = 'NO_IMAGE'
        }

        return NextResponse.json(
            {
                error: userMessage,
                errorType,
                details: errorMessage // Technical details for debugging
            },
            { status }
        )
    }
}
