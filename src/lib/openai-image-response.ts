export type ExtractedOpenAIImageResult = {
    value: string
    source: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isImageUrl(value: string): boolean {
    return /^https?:\/\//i.test(value) || /^data:image\//i.test(value)
}

function isLikelyBase64Image(value: string): boolean {
    const normalized = value.trim()
    if (normalized.length < 256) return false
    if (/^data:image\//i.test(normalized)) return true
    if (!/^[A-Za-z0-9+/=\r\n]+$/.test(normalized)) return false
    return normalized.length % 4 === 0 || normalized.endsWith('=')
}

function normalizeImageValue(value: unknown, source: string): ExtractedOpenAIImageResult | null {
    if (typeof value !== 'string') return null

    const trimmed = value.trim()
    if (!trimmed) return null
    if (isImageUrl(trimmed)) return { value: trimmed, source }
    if (isLikelyBase64Image(trimmed)) return { value: `data:image/png;base64,${trimmed.replace(/\s+/g, '')}`, source }

    return null
}

function fromObject(obj: Record<string, unknown>, source: string): ExtractedOpenAIImageResult | null {
    const directKeys = [
        'b64_json',
        'image_url',
        'image_base64',
        'base64_json',
        'url',
        'image',
        'base64',
        'b64',
        'result',
        'content',
    ]

    for (const key of directKeys) {
        const result = normalizeImageValue(obj[key], `${source}.${key}`)
        if (result) return result

        const child = obj[key]
        if (Array.isArray(child) || isRecord(child)) {
            const nested = extractOpenAIImageResult(child)
            if (nested) return { ...nested, source: `${source}.${key}${nested.source === '$' ? '' : nested.source}` }
        }
    }

    return null
}

export function extractOpenAIImageResult(payload: unknown): ExtractedOpenAIImageResult | null {
    if (Array.isArray(payload)) {
        for (const [index, item] of payload.entries()) {
            const result = extractOpenAIImageResult(item)
            if (result) return { ...result, source: `[${index}]${result.source}` }
        }
        return null
    }

    const direct = normalizeImageValue(payload, '$')
    if (direct) return direct

    if (!isRecord(payload)) return null

    const objectResult = fromObject(payload, '$')
    if (objectResult) return objectResult

    const containers = [
        'data',
        'output',
        'images',
        'result',
        'response',
        'generated_images',
        'generatedImages',
    ]

    for (const key of containers) {
        const child = payload[key]
        if (child == null) continue

        const result = extractOpenAIImageResult(child)
        if (result) return { ...result, source: `$.${key}${result.source === '$' ? '' : result.source}` }
    }

    return null
}

export function summarizeOpenAIImageResponseShape(payload: unknown): unknown {
    if (Array.isArray(payload)) {
        return payload.slice(0, 3).map((item) => summarizeOpenAIImageResponseShape(item))
    }

    if (!isRecord(payload)) {
        if (typeof payload === 'string') {
            return payload.length > 120 ? `[string:${payload.length}]` : payload
        }
        return typeof payload
    }

    const summary: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(payload)) {
        if (typeof value === 'string') {
            summary[key] = value.length > 120 ? `[string:${value.length}]` : value
        } else if (Array.isArray(value)) {
            summary[key] = `[array:${value.length}]`
            if (value.length > 0) {
                summary[`${key}[0]`] = summarizeOpenAIImageResponseShape(value[0])
            }
        } else if (isRecord(value)) {
            summary[key] = summarizeOpenAIImageResponseShape(value)
        } else {
            summary[key] = typeof value
        }
    }
    return summary
}
