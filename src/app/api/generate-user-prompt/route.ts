import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getGoogleTextGenerativeModel } from '@/lib/gemini'
import { log } from '@/lib/logger'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/../convex/_generated/api'
import { Id } from '@/../convex/_generated/dataModel'
import { buildPromptDiversitySuffix } from './promptDiversity'
import { buildForcedIntentInstruction, selectPromptIntent } from './intentRotation'

const LANGUAGE_NAMES: Record<string, string> = {
    es: 'Spanish',
    en: 'English',
    fr: 'French',
    de: 'German',
    pt: 'Portuguese',
    it: 'Italian',
    ca: 'Catalan',
}

function injectVariables(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

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
        const { module, brandKitId } = body as { module: 'image' | 'carousel', brandKitId: string }

        log.info('PROMPT', `Generate-user-prompt start | user=${userId} module=${module} brandKitId=${brandKitId}`)

        if (!module || !brandKitId) {
            return NextResponse.json({ error: 'Module and brandKitId are required' }, { status: 400 })
        }

        if (module !== 'image' && module !== 'carousel') {
            return NextResponse.json({ error: 'Module must be "image" or "carousel"' }, { status: 400 })
        }

        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
        if (!convexUrl) {
            throw new Error('NEXT_PUBLIC_CONVEX_URL not configured')
        }

        const convex = new ConvexHttpClient(convexUrl)

        // Fetch in parallel: system prompt template, brand kit, AI config
        const [promptTemplate, brandKit, aiConfig, recentIntents] = await Promise.all([
            convex.query(api.systemPrompts.getByKey, { key: `generate_user_prompt_${module}` }),
            convex.query(api.brands.getBrandDNAById, {
                id: brandKitId as Id<'brand_dna'>,
                clerk_user_id: userId,
            }),
            convex.query(api.settings.getAIConfig, {}),
            convex.query(api.work_sessions.listRecentPromptIntents, {
                user_id: userId,
                module,
                brand_id: brandKitId as Id<'brand_dna'>,
                limit: 6,
            }),
        ])

        if (!promptTemplate) {
            return NextResponse.json(
                { error: `System prompt template not found for module: ${module}` },
                { status: 404 }
            )
        }

        if (!brandKit) {
            return NextResponse.json(
                { error: 'Brand kit not found or access denied' },
                { status: 404 }
            )
        }

        // Prepare variables for injection
        const textAssets =
            brandKit.text_assets && typeof brandKit.text_assets === 'object'
                ? brandKit.text_assets as { marketing_hooks?: unknown }
                : {}
        const marketingHooks = Array.isArray(textAssets.marketing_hooks)
            ? textAssets.marketing_hooks.slice(0, 3).join(', ')
            : ''

        const variables: Record<string, string> = {
            brand_name: brandKit.brand_name || '',
            business_overview: brandKit.business_overview || '',
            tone_of_voice: Array.isArray(brandKit.tone_of_voice) ? brandKit.tone_of_voice.join(', ') : '',
            target_audience: Array.isArray(brandKit.target_audience) ? brandKit.target_audience.join(', ') : '',
            brand_values: Array.isArray(brandKit.brand_values) ? brandKit.brand_values.join(', ') : '',
            marketing_hooks: marketingHooks,
            language: LANGUAGE_NAMES[brandKit.preferred_language || 'es'] || 'Spanish',
            module: module,
        }

        // Inject variables into template
        const injectedPrompt = injectVariables(promptTemplate.body, variables)
        const selectedIntent = module === 'image'
            ? selectPromptIntent({
                module,
                brandKitId,
                seed: new Date().toISOString().slice(0, 10),
                brandName: brandKit.brand_name || '',
                businessOverview: brandKit.business_overview || '',
                toneOfVoice: Array.isArray(brandKit.tone_of_voice) ? brandKit.tone_of_voice.join(', ') : '',
                targetAudience: Array.isArray(brandKit.target_audience) ? brandKit.target_audience.join(', ') : '',
                brandValues: Array.isArray(brandKit.brand_values) ? brandKit.brand_values.join(', ') : '',
                marketingHooks,
                recentIntents: Array.isArray(recentIntents) ? recentIntents : [],
            })
            : null

        const forcedIntentBlock = module === 'image'
            ? buildForcedIntentInstruction(selectedIntent!)
            : ''

        const finalPrompt = `${injectedPrompt}\n\n${forcedIntentBlock}\n\n${buildPromptDiversitySuffix(module)}`

        // Determine model to use
        let modelId = 'gemini-2.0-flash-lite'
        if (aiConfig?.intelligenceModel) {
            const model = aiConfig.intelligenceModel as string
            // Only use the model if it's a direct Gemini model (not wisdom/naga/etc providers)
            if (model.startsWith('gemini-')) {
                modelId = model
            }
            // Otherwise fall back to gemini-2.0-flash-lite
        }

        // Call the intelligence model
        const model = await getGoogleTextGenerativeModel(modelId)
        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [{ text: finalPrompt }]
                }
            ],
            generationConfig: {
                temperature: 0.85,
                maxOutputTokens: 300,
            }
        })

        const text = result.response.text()?.trim() || ''
        log.success('PROMPT', `Generate-user-prompt done | model=${modelId} ${Date.now() - startedAt}ms`)

        // Log economic event
        try {
            const userRow = await convex.query(api.users.getUser, { clerk_id: userId })
            await convex.mutation(api.economic.logEconomicEvent, {
                phase: 'generate_user_prompt',
                model: `google/${modelId}`,
                kind: 'intelligence',
                user_clerk_id: userId,
                user_email: userRow?.email || undefined,
                metadata: {
                    module,
                    selected_intent: selectedIntent?.id,
                    template_len: promptTemplate.body.length,
                    final_prompt_len: finalPrompt.length,
                    output_len: text.length,
                }
            })
            log.success('ECONOMIC', 'Audit event registered | phase=generate_user_prompt')
        } catch (auditError) {
            log.warn('ECONOMIC', 'Audit event failed | phase=generate_user_prompt', auditError)
        }

        return NextResponse.json({
            success: true,
            text
        })

    } catch (error: unknown) {
        log.error('PROMPT', 'Generate-user-prompt failed', error)
        const details = error instanceof Error ? error.message : String(error)

        return NextResponse.json(
            {
                error: 'Error generating user prompt. Please try again.',
                details
            },
            { status: 500 }
        )
    }
}
