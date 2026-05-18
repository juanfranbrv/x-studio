import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'

import { api } from '@/../convex/_generated/api'
import { generateContentImageUnified } from '@/lib/gemini'
import { log } from '@/lib/logger'
import {
    buildReplaceGenerationPrompt,
    DEFAULT_REPLACE_SYSTEM_PROMPT,
    REPLACE_IMAGE_PROMPT_KEY,
} from '@/lib/replace-generation'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

function extractErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message
    if (typeof error === 'string') return error
    return 'Failed to generate replace image'
}

function isTransientProviderError(errorMessage: string): boolean {
    const normalized = errorMessage.toLowerCase()
    return normalized.includes('system busy') ||
        normalized.includes('system overloaded') ||
        normalized.includes('overloaded') ||
        normalized.includes('please try again') ||
        normalized.includes('no available channel') ||
        normalized.includes('429 received from upstream')
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let creditsData = await convex.query(api.users.getCredits, { clerk_id: userId })

        if (!creditsData) {
            const client = await clerkClient()
            const clerkUser = await client.users.getUser(userId)
            const email = clerkUser.emailAddresses[0]?.emailAddress || ''

            await convex.mutation(api.users.upsertUser, {
                clerk_id: userId,
                email,
            })

            creditsData = await convex.query(api.users.getCredits, { clerk_id: userId })
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
                error: statusMessages[creditsData.status] || 'Cuenta no activa',
            }, { status: 403 })
        }

        if (creditsData.credits < 1) {
            return NextResponse.json({
                error: 'Sin créditos disponibles. Contacta al admin para obtener más.',
            }, { status: 402 })
        }

        const body = await request.json() as {
            productImageUrl?: string
            templateImageUrl?: string
            userRefinement?: string
            brandName?: string
            templateName?: string
        }

        const productImageUrl = String(body.productImageUrl || '').trim()
        const templateImageUrl = String(body.templateImageUrl || '').trim()
        const userRefinement = String(body.userRefinement || '').trim()
        const brandName = String(body.brandName || '').trim()
        const templateName = String(body.templateName || '').trim()

        if (!productImageUrl || !templateImageUrl) {
            return NextResponse.json(
                { error: 'Product image and template image are required' },
                { status: 400 }
            )
        }

        log.info('REPLACE', `Start | user=${userId} brand=${brandName || 'N/A'} template=${templateName || 'N/A'}`)

        let [promptTemplate, aiConfig] = await Promise.all([
            convex.query(api.systemPrompts.getByKey, { key: REPLACE_IMAGE_PROMPT_KEY }),
            convex.query(api.settings.getAIConfig, {}),
        ])

        if (!promptTemplate) {
            await convex.mutation(api.systemPrompts.upsert, {
                key: DEFAULT_REPLACE_SYSTEM_PROMPT.key,
                name: DEFAULT_REPLACE_SYSTEM_PROMPT.name,
                body: DEFAULT_REPLACE_SYSTEM_PROMPT.body,
                description: DEFAULT_REPLACE_SYSTEM_PROMPT.description,
                updated_by: 'system/replace-bootstrap',
            })

            promptTemplate = await convex.query(api.systemPrompts.getByKey, { key: REPLACE_IMAGE_PROMPT_KEY })
            log.warn('REPLACE', 'System prompt missing in admin, created default replace prompt in system_prompts')
        }

        const prompt = buildReplaceGenerationPrompt(
            promptTemplate?.body || DEFAULT_REPLACE_SYSTEM_PROMPT.body,
            {
                brandName,
                userRefinement,
            }
        )

        const imageUrl = await generateContentImageUnified(
            {
                name: brandName || 'Brand',
                brand_dna: {
                    url: '',
                    brand_name: brandName || 'Brand',
                    tagline: '',
                    business_overview: '',
                    brand_values: [],
                    tone_of_voice: [],
                    visual_aesthetic: [],
                    colors: [],
                    fonts: [],
                    images: [],
                },
            },
            prompt,
            {
                model: aiConfig?.imageModel,
                promptAlreadyBuilt: true,
                context: [
                    {
                        type: 'image',
                        value: productImageUrl,
                        label: 'User product reference',
                    },
                ],
                layoutReference: templateImageUrl,
            }
        )

        try {
            const userRow = await convex.query(api.users.getUser, { clerk_id: userId })
            await convex.mutation(api.economic.logEconomicEvent, {
                phase: 'replace_generate_image',
                model: aiConfig?.imageModel || 'unknown-image-model',
                kind: 'image',
                user_clerk_id: userId,
                user_email: userRow?.email || undefined,
                metadata: {
                    prompt_key: REPLACE_IMAGE_PROMPT_KEY,
                    template_name: templateName || null,
                    prompt_len: prompt.length,
                    has_user_refinement: Boolean(userRefinement),
                },
            })
        } catch (auditError) {
            log.warn('REPLACE', 'No se pudo registrar el coste económico de replace', auditError)
        }

        try {
            await convex.mutation(api.users.consumeCredits, {
                clerk_id: userId,
                metadata: {
                    action: 'replace_generation',
                    templateName: templateName || null,
                },
            })
        } catch (creditError) {
            log.warn('REPLACE', 'Failed to consume credit (replace image was generated)', creditError)
        }

        log.success('REPLACE', 'Done')

        return NextResponse.json({
            success: true,
            imageUrl,
            creditsRemaining: creditsData.credits - 1,
        })
    } catch (error: unknown) {
        log.error('REPLACE', 'Generation error', error)
        const errorMessage = extractErrorMessage(error)
        const isTransient = isTransientProviderError(errorMessage)

        return NextResponse.json(
            {
                error: isTransient
                    ? 'El servicio esta temporalmente saturado. Por favor, intentalo de nuevo en unos segundos.'
                    : 'Error al generar la imagen de Replace. Por favor, intentalo de nuevo.',
                errorType: isTransient ? 'WISDOM_BUSY' : 'UNKNOWN',
                details: errorMessage,
            },
            { status: isTransient ? 503 : 500 }
        )
    }
}
