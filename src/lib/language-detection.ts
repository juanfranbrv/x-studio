import { log } from './logger'

type DetectionAnalysis = {
    detectedLang: string
    scores: Record<string, number>
    topScore: number
    secondScore: number
    wordCount: number
    spanishMarkers: number
    portugueseMarkers: number
    catalanMarkers: number
    catalanApostropheMarkers: number
    frenchMarkers: number
}

type ApiDetection = {
    language?: string
    isReliable?: boolean
    confidence?: number
}

const SUPPORTED_LANGUAGES = new Set(['es', 'en', 'fr', 'de', 'pt', 'it', 'ca'])
const DETECT_LANGUAGE_ENDPOINT = 'https://ws.detectlanguage.com/0.2/detect'
const DETECT_LANGUAGE_CACHE_TTL_MS = 10 * 60 * 1000
const detectLanguageCache = new Map<string, { language: string; expiresAt: number }>()
let hasWarnedMissingApiKey = false

const LANGUAGE_PATTERNS = {
    es: {
        common: ['el', 'la', 'de', 'que', 'y', 'en', 'los', 'las', 'del', 'para', 'con', 'por', 'una', 'sobre', 'algo'],
        strong: ['quien', 'quienes', 'cual', 'cuales', 'porque', 'aqui', 'asi', 'tambien', 'mas', 'desde', 'hasta', 'esto', 'esta', 'este'],
    },
    en: {
        common: ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'this', 'have', 'from', 'they'],
        strong: ['what', 'who', 'where', 'when', 'how'],
    },
    fr: {
        common: ['avec', 'dans', 'pour', 'sur', 'nous', 'vous', 'mais', 'donc', 'sans', 'chez'],
        strong: ['est', 'pas', 'tout', 'tres', 'etre', 'ainsi', 'alors'],
    },
    de: {
        common: ['der', 'die', 'das', 'und', 'den', 'des', 'dem', 'ein', 'eine', 'ist', 'sind', 'mit', 'auf', 'von', 'zu'],
        strong: ['nicht', 'werden', 'wurde', 'auch', 'fur'],
    },
    pt: {
        // Avoid highly ambiguous 1-letter tokens and generic romance stopwords.
        common: ['do', 'da', 'em', 'um', 'uma', 'os', 'no', 'na', 'dos', 'das', 'ao', 'aos', 'sua', 'seu'],
        strong: ['nao', 'voce', 'voces', 'tambem', 'pra', 'porque'],
    },
    it: {
        common: ['il', 'di', 'e', 'la', 'che', 'per', 'un', 'in', 'del', 'le', 'da', 'con', 'una', 'dei', 'delle', 'alla', 'nel', 'sono'],
        strong: ['piu'],
    },
    ca: {
        // Keep Catalan common words focused on less ambiguous forms.
        common: ['i', 'els', 'les', 'amb', 'per', 'mes', 'son', 'dels', 'altra', 'algun'],
        strong: [
            'aixo', 'aquest', 'aquesta', 'aquests', 'aquestes', 'allo', 'acord',
            'tambe', 'perque', 'dons', 'doncs', 'fins', 'despres', 'avui',
            'hui', 'aci', 'eixe', 'eixa', 'xiquet', 'xiqueta', 'vosaltres', 'vostres',
            'nostre', 'nostra', 'seua', 'seues', 'llengua', 'servei', 'cal',
            'vols', 'titol', 'administracio', 'opositar', 'admissio', 'convalidacio',
            'assignatures', 'estudis', 'universitaris', 'funcio', 'docent', 'obri',
            'portes', 'teu', 'teua', 'moltes', 'falta', 'trencaclosques', 'professional',
        ],
    },
} as const

const countMatches = (source: string, regex: RegExp): number => (source.match(regex) || []).length

function analyzeLanguage(text: string): DetectionAnalysis {
    const lowerText = text.toLowerCase()
    const normalizedText = lowerText.normalize('NFD').replace(/\p{M}+/gu, '')
    const words = normalizedText.match(/[\p{L}\p{M}]+/gu) || []
    const wordCounts = new Map<string, number>()

    for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
    }

    const scores: Record<string, number> = {
        es: 0,
        en: 0,
        fr: 0,
        de: 0,
        pt: 0,
        it: 0,
        ca: 0,
    }

    for (const [lang, groups] of Object.entries(LANGUAGE_PATTERNS)) {
        for (const keyword of groups.common) {
            const count = wordCounts.get(keyword)
            if (count) scores[lang] += count
        }
        for (const keyword of groups.strong) {
            const count = wordCounts.get(keyword)
            if (count) scores[lang] += count * 3
        }
    }

    const frenchMarkers = countMatches(lowerText, /\b(c'est|d'accord|qu'|j'|n'|s'|t'|je|tu|vous|nous|avec|dans|pour|sans|chez)\b/g)
    const spanishMarkers = countMatches(
        normalizedText,
        /\b(algo|sobre|porque|tambien|asi|aprendizaje|mecanografia|motivador|motivadora|teclado|del|desde|hasta)\b/g
    ) + countMatches(normalizedText, /\b[\p{L}]+aje(s)?\b/gu)
    const portugueseMarkers = countMatches(
        normalizedText,
        /\b(nao|voce|voces|tambem|pra|aprendizagem|digitacao|teclado|seu|sua|dos|das|aos)\b/g
    ) + countMatches(lowerText, /\u00e7\u00e3o|\u00e7\u00f5es|\u00f5es/g) + countMatches(normalizedText, /\b[\p{L}]+agem\b/gu)
    const catalanMarkers = countMatches(
        normalizedText,
        /\b(aixo|aquest|aquesta|aquests|aquestes|allo|tambe|perque|doncs|fins|despres|avui|hui|aci|eixe|eixa|xiquet|xiqueta|vosaltres|vostres|seua|seues|llengua|vols|titol|administracio|opositar|admissio|convalidacio|assignatures|estudis|universitaris|funcio|docent|obri|portes|teu|teua|moltes|trencaclosques)\b/g
    )
    const catalanApostropheMarkers = countMatches(
        normalizedText,
        /\b(l'|d'|m'|n'|s'|t')(?=(administracio|assignatures|universitat|universitari|estudi|escola|oposicio|opositar|idioma|valencia|funcio|article|acces|admissio))/g
    )

    scores.es += spanishMarkers * 2
    scores.pt += portugueseMarkers * 3
    scores.fr += frenchMarkers * 3
    scores.ca += catalanMarkers * 3
    scores.ca += catalanApostropheMarkers * 2

    if (countMatches(lowerText, /[\u00e4\u00f6\u00fc\u00df]/g) > 0) scores.de += 3
    if (countMatches(lowerText, /[\u00bf\u00a1]/g) > 0) scores.es += 3
    if (countMatches(lowerText, /[\u00f1]/g) > 0) scores.es += 2

    if (countMatches(lowerText, /[\u00e0\u00e8\u00f2\u00ef\u00fc]/g) > 0 && countMatches(lowerText, /[\u00f1]/g) === 0) {
        scores.ca += 2
    }
    if (countMatches(lowerText, /[\u00b7]/g) > 0) {
        scores.ca += 2
    }
    if (countMatches(lowerText, /[\u00e0\u00e2\u00e9\u00e8\u00ea\u00eb\u00ee\u00ef\u00f4\u00f9\u00fb\u00e7]/g) > 0) {
        scores.fr += 1
    }

    if (frenchMarkers === 0 && catalanMarkers >= 2) {
        scores.ca += 4
        scores.fr = Math.max(0, scores.fr - 3)
    }

    if (catalanMarkers >= 2 || catalanApostropheMarkers >= 2) {
        scores.ca += 3
        scores.fr = Math.max(0, scores.fr - 4)
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
    const [firstLang, firstScore] = sorted[0] || ['es', 0]
    const [, secondScore] = sorted[1] || ['es', 0]

    let detectedLang = firstLang
    if (firstScore === secondScore && firstScore > 0) {
        if (scores.ca === firstScore) detectedLang = 'ca'
        else detectedLang = 'es'
    }

    if (detectedLang === 'fr' && scores.ca >= scores.fr - 1 && catalanMarkers > 0) {
        detectedLang = 'ca'
    }

    if (words.length <= 8) {
        const portugueseHasEvidence = portugueseMarkers > 0
        const catalanHasEvidence = catalanMarkers > 0 || catalanApostropheMarkers > 0

        if (
            detectedLang === 'pt' &&
            !portugueseHasEvidence &&
            scores.es >= Math.max(1, scores.pt - 1)
        ) {
            detectedLang = 'es'
        }

        if (
            detectedLang === 'ca' &&
            !catalanHasEvidence &&
            scores.es >= Math.max(1, scores.ca - 1)
        ) {
            detectedLang = 'es'
        }

        if (
            detectedLang !== 'es' &&
            spanishMarkers > 0 &&
            scores.es >= Math.max(1, firstScore - 2)
        ) {
            detectedLang = 'es'
        }
    }

    return {
        detectedLang,
        scores,
        topScore: firstScore,
        secondScore,
        wordCount: words.length,
        spanishMarkers,
        portugueseMarkers,
        catalanMarkers,
        catalanApostropheMarkers,
        frenchMarkers,
    }
}

function getCacheKey(text: string, fallback: string) {
    return `${fallback}::${text.trim().toLowerCase()}`
}

function getCachedLanguage(text: string, fallback: string): string | null {
    const key = getCacheKey(text, fallback)
    const cached = detectLanguageCache.get(key)
    if (!cached) return null
    if (cached.expiresAt <= Date.now()) {
        detectLanguageCache.delete(key)
        return null
    }
    return cached.language
}

function setCachedLanguage(text: string, fallback: string, language: string) {
    const key = getCacheKey(text, fallback)
    detectLanguageCache.set(key, {
        language,
        expiresAt: Date.now() + DETECT_LANGUAGE_CACHE_TTL_MS,
    })
}

function normalizeLanguageCode(raw?: string, fallback = 'es') {
    const normalized = String(raw || '')
        .trim()
        .toLowerCase()
        .slice(0, 2)

    if (SUPPORTED_LANGUAGES.has(normalized)) {
        return normalized
    }

    return fallback
}

function getDetectLanguageApiKey() {
    if (typeof window !== 'undefined') return ''
    return process.env.DETECT_LANGUAGE_API_KEY || process.env.DETECTLANGUAGE_API_KEY || ''
}

async function requestDetectLanguage(text: string): Promise<ApiDetection | null> {
    const apiKey = getDetectLanguageApiKey()
    if (!apiKey) {
        if (!hasWarnedMissingApiKey) {
            hasWarnedMissingApiKey = true
            log.warn('API', 'Detect Language API desactivada: falta DETECT_LANGUAGE_API_KEY')
        }
        return null
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)

    try {
        const response = await fetch(DETECT_LANGUAGE_ENDPOINT, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ q: text }),
            signal: controller.signal,
            cache: 'no-store',
        })

        if (!response.ok) {
            log.warn('API', 'Detect Language API respondio con error', {
                status: response.status,
                statusText: response.statusText,
            })
            return null
        }

        const payload = await response.json() as {
            data?: {
                detections?: ApiDetection[]
            }
        }

        const detection = payload?.data?.detections?.[0]
        if (!detection?.language) {
            return null
        }

        return detection
    } catch (error) {
        log.warn('API', 'Detect Language API fallo; se usa fallback local', error)
        return null
    } finally {
        clearTimeout(timeout)
    }
}

function shouldTrustApiDetection(detection: ApiDetection | null, localLanguage: string) {
    if (!detection?.language) return false

    const normalized = normalizeLanguageCode(detection.language, localLanguage)
    const confidence = Number(detection.confidence || 0)
    const reliable = Boolean(detection.isReliable)

    if (!SUPPORTED_LANGUAGES.has(normalized)) return false
    if (reliable) return true
    if (confidence >= 12) return true

    // For short romance-language prompts be stricter unless API aligns with local heuristic.
    return confidence >= 6 && normalized === localLanguage
}

/**
 * Detects the language of a text based on common words and patterns.
 * Supports: Spanish, English, French, German, Portuguese, Italian, Catalan.
 */
export function detectLanguage(text: string): string {
    if (!text || text.trim().length === 0) return 'es'

    const analysis = analyzeLanguage(text)

    log.debug('FLOW', 'Deteccion de idioma', {
        idioma: analysis.detectedLang,
        puntuaciones: analysis.scores,
        palabras: analysis.wordCount,
        marcadores_es: analysis.spanishMarkers,
        marcadores_pt: analysis.portugueseMarkers,
        marcadores_ca: analysis.catalanMarkers,
        apostrofos_ca: analysis.catalanApostropheMarkers,
        marcadores_fr: analysis.frenchMarkers,
    })

    return analysis.detectedLang
}

export function detectLanguageFromParts(
    parts: Array<string | null | undefined>,
    fallback = 'es'
): string {
    const normalizedParts = parts
        .map((part) => (typeof part === 'string' ? part.trim() : ''))
        .filter(Boolean)

    if (normalizedParts.length === 0) return fallback

    const combined = normalizedParts.join('\n')
    const analysis = analyzeLanguage(combined)

    if (
        analysis.wordCount <= 6 &&
        analysis.topScore <= 2 &&
        analysis.spanishMarkers === 0 &&
        analysis.portugueseMarkers === 0 &&
        analysis.catalanMarkers === 0 &&
        analysis.catalanApostropheMarkers === 0 &&
        analysis.frenchMarkers === 0
    ) {
        return fallback
    }

    if (
        analysis.wordCount <= 8 &&
        analysis.topScore - analysis.secondScore <= 1 &&
        analysis.spanishMarkers === 0 &&
        analysis.portugueseMarkers === 0 &&
        analysis.catalanMarkers === 0 &&
        analysis.catalanApostropheMarkers === 0
    ) {
        return fallback
    }

    return analysis.detectedLang || fallback
}

export async function detectLanguageWithApi(
    text: string,
    fallback = 'es'
): Promise<string> {
    const normalizedText = String(text || '').trim()
    const safeFallback = normalizeLanguageCode(fallback, 'es')

    if (!normalizedText) return safeFallback

    // Skip external API for very short texts — local heuristic is sufficient
    if (normalizedText.length < 15) return detectLanguage(normalizedText) || safeFallback

    const cached = getCachedLanguage(normalizedText, safeFallback)
    if (cached) return cached

    const localLanguage = detectLanguage(normalizedText) || safeFallback
    const apiDetection = await requestDetectLanguage(normalizedText)

    const resolved = shouldTrustApiDetection(apiDetection, localLanguage)
        ? normalizeLanguageCode(apiDetection?.language, localLanguage)
        : localLanguage

    setCachedLanguage(normalizedText, safeFallback, resolved)

    const details: Record<string, string | number | boolean> = {
        origen: shouldTrustApiDetection(apiDetection, localLanguage) ? 'api' : 'local',
        idioma: resolved,
        fallback: safeFallback,
    }

    if (typeof apiDetection?.confidence === 'number') {
        details.confianza_api = apiDetection.confidence
    }

    if (typeof apiDetection?.isReliable === 'boolean') {
        details.fiable_api = apiDetection.isReliable
    }

    log.debug('FLOW', 'Deteccion final de idioma', details)

    return resolved
}

export async function detectLanguageFromPartsWithApi(
    parts: Array<string | null | undefined>,
    fallback = 'es'
): Promise<string> {
    const normalizedParts = parts
        .map((part) => (typeof part === 'string' ? part.trim() : ''))
        .filter(Boolean)

    if (normalizedParts.length === 0) {
        return normalizeLanguageCode(fallback, 'es')
    }

    const combined = normalizedParts.join('\n')
    const localLanguage = detectLanguageFromParts(normalizedParts, fallback)
    const apiLanguage = await detectLanguageWithApi(combined, fallback)

    if (apiLanguage === localLanguage) {
        return apiLanguage
    }

    const combinedWordCount = combined.match(/[\p{L}\p{M}]+/gu)?.length || 0
    if (combinedWordCount <= 10) {
        return apiLanguage
    }

    return localLanguage
}

export async function resolveGenerationLanguage(params: {
    promptParts: Array<string | null | undefined>
    fallback?: string
}): Promise<string> {
    const normalizedParts = params.promptParts
        .map((part) => (typeof part === 'string' ? part.trim() : ''))
        .filter(Boolean)

    const safeFallback = normalizeLanguageCode(params.fallback, 'es')

    if (normalizedParts.length === 0) {
        return safeFallback
    }

    return detectLanguageFromPartsWithApi(normalizedParts, safeFallback)
}
