import { NextRequest, NextResponse } from 'next/server'
import type { VisionAnalysis, DetectedSubject } from '@/lib/creation-flow-types'
import type { BrandDNA } from '@/lib/brand-types'
import { IMAGE_ANALYSIS_PROMPT } from '@/lib/prompts/vision/image-analysis.prompt'
import { generateTextUnified } from '@/lib/gemini'
import { log } from '@/lib/logger'
import { auth } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/../convex/_generated/api'
import { authedFetchQuery } from '@/lib/convex-server'

const DEFAULT_INTELLIGENCE_MODEL = 'wisdom/gemini-3-flash-preview'


export async function POST(request: NextRequest) {
    const startedAt = Date.now()
    try {
        const {
            imageBase64,
            imageUrl,
            mimeType: incomingMimeType = 'image/jpeg',
            auditFlowId,
            intelligenceModel: incomingIntelligenceModel
        } = await request.json()
        const { userId } = await auth()
        log.info('VISION', `Analyze request start | user=${userId || 'anonymous'} hasBase64=${Boolean(imageBase64)} hasUrl=${Boolean(imageUrl)}`)

        let effectiveMimeType = incomingMimeType
        let effectiveBase64 = imageBase64 as string | undefined

        if (!effectiveBase64 && typeof imageUrl === 'string' && imageUrl.trim()) {
            const imageResponse = await fetch(imageUrl)
            if (!imageResponse.ok) {
                return NextResponse.json(
                    { success: false, error: 'No se pudo descargar la imagen de referencia' },
                    { status: 400 }
                )
            }
            const arrayBuffer = await imageResponse.arrayBuffer()
            effectiveBase64 = Buffer.from(arrayBuffer).toString('base64')
            const detectedMimeType = imageResponse.headers.get('content-type')
            if (detectedMimeType) {
                effectiveMimeType = detectedMimeType
            }
        }

        if (!effectiveBase64) {
            return NextResponse.json(
                { success: false, error: 'No image provided (base64 or imageUrl)' },
                { status: 400 }
            )
        }

        const base64Data = effectiveBase64.replace(/^data:image\/\w+;base64,/, '')
        const imageDataUrl = effectiveBase64.startsWith('data:')
            ? effectiveBase64
            : `data:${effectiveMimeType};base64,${base64Data}`

        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
        let intelligenceModel = DEFAULT_INTELLIGENCE_MODEL
        if (convexUrl) {
            const convex = new ConvexHttpClient(convexUrl)
            const aiConfig = await convex.query(api.settings.getAIConfig, {})
            const configured = String(aiConfig?.intelligenceModel || '').trim()
            if (configured) intelligenceModel = configured
        }
        const overrideModel = typeof incomingIntelligenceModel === 'string'
            ? incomingIntelligenceModel.trim()
            : ''
        if (overrideModel) {
            intelligenceModel = overrideModel
        }
        log.info('VISION', `Analyze model selected | model=${intelligenceModel} mime=${effectiveMimeType}`)

        const modelCallStartedAt = Date.now()
        const text = await generateTextUnified(
            { name: 'Style Analyzer', brand_dna: {} as BrandDNA },
            IMAGE_ANALYSIS_PROMPT,
            intelligenceModel,
            [imageDataUrl],
            'Eres un analizador visual. Responde solo JSON válido, sin markdown ni texto adicional.',
            { temperature: 0.2, topP: 0.9 }
        )
        log.success('VISION', `Analyze model response received | ${Date.now() - modelCallStartedAt}ms`)

        // Parse JSON from response
        let analysis: VisionAnalysis
        try {
            // Clean up potential markdown wrapping
            const jsonText = text.replace(/```json\n?|\n?```/g, '').trim()
            const parsed = JSON.parse(jsonText)

            // Validate and normalize the response
            const rawKeywords = Array.isArray(parsed.keywords)
                ? parsed.keywords.filter((k: unknown) => typeof k === 'string')
                : (typeof parsed.keywords === 'string' ? [parsed.keywords] : [])
            const normalizedKeywords = normalizeStyleKeywords(rawKeywords)

            analysis = {
                subject: validateSubject(parsed.subject),
                subjectLabel: parsed.subjectLabel || 'Objeto detectado',
                lighting: parsed.lighting || 'unknown',
                colorPalette: Array.isArray(parsed.colorPalette) ? parsed.colorPalette : [],
                keywords: normalizedKeywords,
                confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
            }
        } catch {
            // Fallback if parsing fails
            analysis = {
                subject: 'product',
                subjectLabel: 'Producto',
                lighting: 'unknown',
                colorPalette: [],
                keywords: ['commercial', 'product'],
                confidence: 0.5,
            }
        }

        try {
            if (convexUrl) {
                const convex = new ConvexHttpClient(convexUrl)
                const userRow = userId ? await authedFetchQuery(api.users.getUser, { clerk_id: userId }) : null
                await convex.mutation(api.economic.logEconomicEvent, {
                    flow_id: typeof auditFlowId === 'string' ? auditFlowId : undefined,
                    phase: 'analyze_style_image',
                    model: intelligenceModel,
                    kind: 'intelligence',
                    user_clerk_id: userId ?? undefined,
                    user_email: userRow?.email || undefined,
                    metadata: {
                        mime_type: effectiveMimeType,
                        subject: analysis.subject,
                        confidence: analysis.confidence,
                    }
                })
                log.success('ECONOMIC', `Audit event registered | phase=analyze_style_image model=${intelligenceModel}`)
            }
        } catch (auditError) {
            log.warn('ECONOMIC', 'Audit event failed | phase=analyze_style_image', auditError)
        }

        log.success('VISION', `Analyze request done | ${Date.now() - startedAt}ms subject=${analysis.subject} confidence=${analysis.confidence}`)

        return NextResponse.json({
            success: true,
            data: analysis,
        })
    } catch (error) {
        log.error('VISION', 'Analyze request failed', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Vision analysis failed',
            },
            { status: 500 }
        )
    }
}

function normalizeStyleKeywords(rawKeywords: string[]): string[] {
    if (!rawKeywords || rawKeywords.length === 0) return []

    const merged = rawKeywords.join(' ').replace(/\s+/g, ' ').trim()
    if (!merged) return []

    const cleaned = merged
        .replace(/```json|```/gi, '')
        .replace(/\s+/g, ' ')
        .trim()

    const fallback =
        'photorealistic commercial treatment with controlled contrast, coherent natural lighting, clean finishing, balanced texture, and professional art direction focused on readability and visual clarity'

    const safeText = cleaned.length > 24 ? cleaned : fallback
    return [safeText]
}

function validateSubject(subject: string): DetectedSubject {
    const validSubjects: DetectedSubject[] = [
        'food', 'tech', 'fashion', 'beauty', 'home', 'sports',
        'nature', 'people', 'abstract', 'product', 'unknown'
    ]
    return validSubjects.includes(subject as DetectedSubject)
        ? (subject as DetectedSubject)
        : 'unknown'
}
