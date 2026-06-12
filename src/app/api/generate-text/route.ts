import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getGoogleTextGenerativeModel } from '@/lib/gemini'
import { log } from '@/lib/logger'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/../convex/_generated/api'
import { authedFetchQuery } from '@/lib/convex-server'

export async function POST(request: NextRequest) {
    const startedAt = Date.now()
    try {
        // Verify authentication
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Parse request body
        const body = await request.json()
        const { prompt } = body as { prompt: string }
        log.info('TEXT', `Generate-text start | user=${userId} promptLen=${prompt?.length || 0}`)

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
        }

        // Generate text using Gemini Flash (fast and cheap for copywriting)
        const flashModel = await getGoogleTextGenerativeModel('gemini-2.0-flash-lite')
        const result = await flashModel.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }]
                }
            ],
            generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 100,
            }
        })

        const text = result.response.text()?.trim() || ''
        log.success('TEXT', `Generate-text done | model=gemini-2.0-flash-lite ${Date.now() - startedAt}ms`)

        try {
            const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
            if (convexUrl) {
                const convex = new ConvexHttpClient(convexUrl)
                const userRow = await authedFetchQuery(api.users.getUser, { clerk_id: userId })
                await convex.mutation(api.economic.logEconomicEvent, {
                    phase: 'generate_text_copy',
                    model: 'google/gemini-2.0-flash-lite',
                    kind: 'intelligence',
                    user_clerk_id: userId,
                    user_email: userRow?.email || undefined,
                    metadata: {
                        prompt_len: prompt.length,
                        output_len: text.length,
                    }
                })
                log.success('ECONOMIC', 'Audit event registered | phase=generate_text_copy model=google/gemini-2.0-flash-lite')
            }
        } catch (auditError) {
            log.warn('ECONOMIC', 'Audit event failed | phase=generate_text_copy', auditError)
        }

        return NextResponse.json({
            success: true,
            text
        })

    } catch (error: unknown) {
        log.error('TEXT', 'Generate-text failed', error)
        const details = error instanceof Error ? error.message : String(error)

        return NextResponse.json(
            {
                error: 'Error al generar el texto. Por favor, inténtalo de nuevo.',
                details
            },
            { status: 500 }
        )
    }
}
