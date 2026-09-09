export type OpenAIImageQuality = 'low' | 'medium' | 'high' | 'auto'

const DEFAULT_OPENAI_IMAGE_QUALITY: OpenAIImageQuality = 'low'

export function resolveOpenAICompatibleImageModel(model: string): {
    providerModel: string
    quality: OpenAIImageQuality
} {
    const normalized = String(model || '').trim()
    const lower = normalized.toLowerCase()

    const qualityAlias = lower.match(/^(gpt-image-2|gpt-image-2\.5-flare)-(low|medium)$/)
    if (qualityAlias) {
        return {
            providerModel: qualityAlias[1],
            quality: qualityAlias[2] as OpenAIImageQuality,
        }
    }

    return { providerModel: normalized, quality: DEFAULT_OPENAI_IMAGE_QUALITY }
}
