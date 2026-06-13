// Helpers puros extraidos de generate-carousel.ts (saneamiento/troceo Fase B).
// Sin dependencias del modulo origen — testables de forma aislada.

export function createEconomicFlowId(prefix: string): string {
    return `flow_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function shortFlowId(flowId?: string): string {
    if (!flowId) return 'sin-flow'
    if (flowId.length <= 28) return flowId
    return `${flowId.slice(0, 22)}...${flowId.slice(-5)}`
}

export function normalizeSemanticText(value: string): string {
    return (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}+/gu, '')
        .replace(/[^\p{L}\p{N}\s:/@.%,-]/gu, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
}

export function dedupeMeaningfulLines(values: string[]): string[] {
    const seen = new Set<string>()
    const result: string[] = []
    values.forEach((value) => {
        const trimmed = value.trim().replace(/\s{2,}/g, ' ')
        if (!trimmed) return
        const key = normalizeSemanticText(trimmed)
        if (!key || seen.has(key)) return
        seen.add(key)
        result.push(trimmed)
    })
    return result
}

export function extractPromptDetailBlocks(prompt: string): string[] {
    const text = String(prompt || '').replace(/\r/g, '').trim()
    if (!text) return []

    const rawLines = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

    const bulletLines = rawLines
        .filter((line) => /^[-*•·]/.test(line))
        .map((line) => line.replace(/^[-*•·]\s*/, '').trim())

    const detailCandidates: string[] = []

    if (bulletLines.length > 0) {
        detailCandidates.push(...bulletLines)
        rawLines.forEach((line, index) => {
            if (index === 0) return
            if (/^[-*•·]/.test(line)) return
            if (/[,:;]|https?:\/\/|www\.|@|\b(?:a1|a2|b1|b2|c1|c2)\b/i.test(line)) {
                detailCandidates.push(line)
            }
        })
    } else if (rawLines.length > 1) {
        detailCandidates.push(...rawLines.slice(1))
    } else {
        const sentences = text
            .split(/(?<=[.!?])\s+|\n+/)
            .map((sentence) => sentence.trim())
            .filter((sentence) => sentence.length > 18)
        if (sentences.length > 1) {
            detailCandidates.push(...sentences.slice(1))
        }
    }

    return dedupeMeaningfulLines(
        detailCandidates.filter((line) => {
            const normalized = normalizeSemanticText(line)
            if (normalized.length < 4) return false
            if (/^(si|sí|no|ok)$/i.test(normalized)) return false
            return true
        })
    ).slice(0, 8)
}

export function appendNarrativeDetail(base: string, detail: string): string {
    const cleanBase = (base || '').trim()
    const cleanDetail = detail.trim()
    if (!cleanDetail) return cleanBase
    if (!cleanBase) return cleanDetail
    const normalizedBase = normalizeSemanticText(cleanBase)
    const normalizedDetail = normalizeSemanticText(cleanDetail)
    if (normalizedBase.includes(normalizedDetail)) return cleanBase
    const needsPeriod = !/[.!?]$/.test(cleanBase)
    return `${cleanBase}${needsPeriod ? '.' : ''} ${cleanDetail}`.trim()
}

export function stripBulletMarker(line: string): string {
    return line.replace(/^[-*•·]\s*/, '').trim()
}

export function normalizeEditorialLine(text: string): string {
    let value = stripBulletMarker(String(text || ''))
        .replace(/\s+/g, ' ')
        .trim()

    if (!value) return ''

    if (/^[A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÇ0-9\s]+$/u.test(value) && /[A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÇ]/u.test(value)) {
        value = value.toLowerCase()
    }

    const firstLetterIndex = value.search(/\p{L}/u)
    if (firstLetterIndex >= 0) {
        value = `${value.slice(0, firstLetterIndex)}${value.charAt(firstLetterIndex).toUpperCase()}${value.slice(firstLetterIndex + 1)}`
    }

    return value
}

export function descriptionHasBulletStructure(text: string): boolean {
    return /\n\s*[-*•·]\s+/m.test(text || '')
}

export function extractEditorialBulletCandidates(description: string): string[] {
    const text = String(description || '').replace(/\r/g, '').trim()
    if (!text) return []

    const bulletLines = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => /^[-*•·]\s+/.test(line))
        .map(stripBulletMarker)

    if (bulletLines.length > 0) {
        return dedupeMeaningfulLines(bulletLines.map(normalizeEditorialLine))
    }

    const plainLines = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

    if (plainLines.length > 1) {
        return dedupeMeaningfulLines(
            plainLines.slice(1).map(normalizeEditorialLine).filter((line) => line.length >= 5)
        )
    }

    const sentences = text
        .split(/(?<=[.!?])\s+|;\s+/)
        .map((sentence) => sentence.trim())
        .filter((sentence) => sentence.length >= 6)

    if (sentences.length <= 1) return []

    return dedupeMeaningfulLines(
        sentences
            .slice(1)
            .map((sentence) => sentence.replace(/[.!?]+$/g, '').trim())
            .map(normalizeEditorialLine)
            .filter((sentence) => sentence.length >= 5)
    )
}

export function extractBalancedJsonObject(input: string): string | null {
    const start = input.indexOf('{')
    if (start === -1) return null

    let depth = 0
    let inString = false
    let escape = false

    for (let i = start; i < input.length; i++) {
        const ch = input[i]

        if (inString) {
            if (escape) {
                escape = false
            } else if (ch === '\\') {
                escape = true
            } else if (ch === '"') {
                inString = false
            }
            continue
        }

        if (ch === '"') {
            inString = true
            continue
        }

        if (ch === '{') depth++
        if (ch === '}') depth--

        if (depth === 0) {
            return input.slice(start, i + 1)
        }
    }

    return null
}

export function sanitizeUrl(url?: string): string {
        if (!url) return ''
        let cleaned = url.trim().replace(/^["']|["']$/g, '')

        // Pattern 1: Direct Markdown match [text](url)
        const markdownMatch = cleaned.match(/\[.*?\]\((https?:\/\/.*?)\)/)
        if (markdownMatch) {
            cleaned = markdownMatch[1].trim()
        }

        // Pattern 2: Extract any valid URL starting with http
        const rawUrlMatch = cleaned.match(/(https?:\/\/[^\s\]\)]+)/)
        if (rawUrlMatch) {
            return rawUrlMatch[1].trim()
        }

        return cleaned
}
