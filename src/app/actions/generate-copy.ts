'use server'

import { BrandDNA } from '@/lib/brand-types'
import { VisionAnalysis, IntentCategory, INTENT_CATALOG } from '@/lib/creation-flow-types'
import { buildCopywriterPrompt } from '@/lib/prompts/actions/copywriter'
import { getGoogleTextGenerativeModel } from '@/lib/gemini'
import { resolveGenerationLanguage } from '@/lib/language-detection'

export async function generateFieldCopy(params: {
    brandName: string
    brandDNA: BrandDNA
    intent: IntentCategory
    visionAnalysis?: VisionAnalysis | null
    fieldLabel: string
    fieldDescription?: string
    currentValue?: string
    rawMessage?: string
}) {
    const { brandName, brandDNA, intent, visionAnalysis, fieldLabel, fieldDescription, rawMessage } = params

    // Find intent metadata
    const intentMeta = INTENT_CATALOG.find(i => i.id === intent)

    // DEBUG LOGGING
    console.log('--- generateFieldCopy call ---')
    console.log('Params:', { fieldLabel, rawMessage, intent })

    const detectedLanguage = await resolveGenerationLanguage({
        promptParts: [rawMessage],
    })

    const systemPrompt = buildCopywriterPrompt({
        brandName,
        brandDNA,
        visionAnalysis,
        intent: intentMeta?.name || intent,
        intentDescription: intentMeta?.extendedDescription || intentMeta?.description,
        fieldLabel,
        fieldDescription,
        rawMessage,
        languageOverride: detectedLanguage,
    })

    console.log('Generated System Prompt:', systemPrompt)

    try {
        const model = await getGoogleTextGenerativeModel('gemini-flash-latest')
        const result = await model.generateContent(systemPrompt)
        const text = result.response.text().trim().replace(/^["']|["']$/g, '') // Remove quotes if any
        console.log('AI Response:', text)
        return { success: true, text }
    } catch (error) {
        console.error('Error generating copy:', error)
        return { success: false, error: 'No se pudo generar el texto' }
    }
}
