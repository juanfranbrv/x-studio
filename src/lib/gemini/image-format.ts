// Mappers puros de formato/aspect-ratio por proveedor de imagen.
// Extraido de gemini.ts (troceo Fase 2, paso 1 de la division por proveedor). Comportamiento-cero.
import { getOpenAIImageSizeForAspectRatio } from '../openai-image-size'

export const REPLICATE_MODEL_NANO_BANANA_PRO = 'google/nano-banana-pro'

const ATLAS_MODEL_ALIASES: Record<string, string> = {
    'google/nano-banana-2': 'google/nano-banana-2/text-to-image',
    'google/nano-banana': 'google/nano-banana/text-to-image-developer',
    'google/nano-banana-2/text-to-image': 'google/nano-banana-2/text-to-image',
    'bytedance/seedream-v5.0-lite': 'bytedance/seedream-v5.0-lite',
}

export function getOpenAISize(aspectRatio?: string): string {
    return getOpenAIImageSizeForAspectRatio(aspectRatio)
}

export function getNagaImageSize(model: string, aspectRatio?: string): string {
    const normalizedModel = String(model || '').trim().toLowerCase()
    const normalizedRatio = String(aspectRatio || '').trim()

    // Naga GPT-Image 1.5 currently supports only:
    // 1024x1024, 1024x1536, 1536x1024 and auto.
    // We use the maximum available size per orientation.
    if (normalizedModel.startsWith('gpt-image-1.5')) {
        switch (normalizedRatio) {
            case '9:16':
            case '3:4':
                return '1024x1536'
            case '16:9':
            case '4:3':
                return '1536x1024'
            case '1:1':
            default:
                return '1024x1024'
        }
    }

    return getOpenAISize(aspectRatio)
}

export function toReplicateAspectRatio(aspectRatio?: string): string {
    if (!aspectRatio) return '1:1'

    const normalized = aspectRatio.trim()
    const supported = new Set([
        'match_input_image',
        '1:1',
        '1:4',
        '1:8',
        '2:3',
        '3:2',
        '3:4',
        '4:1',
        '4:3',
        '4:5',
        '5:4',
        '8:1',
        '9:16',
        '16:9',
        '21:9',
    ])

    if (supported.has(normalized)) {
        return normalized
    }

    if (normalized === '1.91:1') return '16:9'
    if (normalized === '1.2:1') return '5:4'

    return '1:1'
}

export function toReplicateAspectRatioForModel(model: string, aspectRatio?: string): string {
    const normalizedModel = String(model || '').trim().toLowerCase()
    const mapped = toReplicateAspectRatio(aspectRatio)

    if (normalizedModel === REPLICATE_MODEL_NANO_BANANA_PRO) {
        const supported = new Set([
            'match_input_image',
            '1:1',
            '2:3',
            '3:2',
            '3:4',
            '4:3',
            '4:5',
            '5:4',
            '9:16',
            '16:9',
            '21:9',
        ])
        return supported.has(mapped) ? mapped : '1:1'
    }

    return mapped
}

export function toAtlasAspectRatio(aspectRatio?: string): string {
    if (!aspectRatio) return '1:1'
    const normalized = aspectRatio.trim()
    const supported = new Set(['1:1', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '2:3', '3:2'])
    if (supported.has(normalized)) return normalized
    if (normalized === '1.91:1') return '16:9'
    if (normalized === '1.2:1') return '5:4'
    return '1:1'
}

export function resolveAtlasModel(model: string): string {
    const normalized = String(model || '').trim().toLowerCase()
    return ATLAS_MODEL_ALIASES[normalized] || String(model || '').trim()
}
