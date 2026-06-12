export type OpenAIImageQuality = 'low' | 'medium' | 'high' | 'auto'

const DEFAULT_OPENAI_IMAGE_QUALITY: OpenAIImageQuality = 'low'

export function resolveOpenAICompatibleImageModel(model: string): {
    providerModel: string
    quality: OpenAIImageQuality
} {
    const normalized = String(model || '').trim()
    const lower = normalized.toLowerCase()

    if (lower === 'gpt-image-2-low') {
        return { providerModel: 'gpt-image-2', quality: 'low' }
    }

    if (lower === 'gpt-image-2-medium') {
        return { providerModel: 'gpt-image-2', quality: 'medium' }
    }

    return { providerModel: normalized, quality: DEFAULT_OPENAI_IMAGE_QUALITY }
}
