import { GoogleGenerativeAI } from '@google/generative-ai'
import type { BrandDNA } from './brand-types'
import { buildImagePrompt, ImageGenerationOptions } from './prompt-builder'
import { mapGeminiAspectRatio } from './gemini-aspect-ratio'
import { getOpenAIImageSizeForAspectRatio } from './openai-image-size'
import { REPLICATE_MODEL_NANO_BANANA_PRO, getOpenAISize, getNagaImageSize, toReplicateAspectRatioForModel, toAtlasAspectRatio, resolveAtlasModel } from './gemini/image-format'
import { resolveOpenAICompatibleImageModel } from './openai-image-model-alias'
import { extractOpenAIImageResult, summarizeOpenAIImageResponseShape } from './openai-image-response'
import { log } from './logger'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/../convex/_generated/api'

// Default image model
const DEFAULT_IMAGE_MODEL = 'gemini-3-pro-image-preview'

// Brand-aware system prompt builder
import { buildBrandDirectorPrompt } from './prompts/system/brand-director'
export const buildBrandSystemPrompt = buildBrandDirectorPrompt

// Generate marketing copy with brand context
export async function generateMarketingCopy(
    brand: { name: string; brand_dna: BrandDNA },
    prompt: string
): Promise<string> {
    const systemPrompt = buildBrandSystemPrompt(brand)
    const model = await getGoogleTextGenerativeModel('gemini-flash-latest')
    const result = await model.generateContent({
        contents: [
            {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nSOLICITUD DEL USUARIO:\n${prompt}` }]
            }
        ]
    })

    return result.response.text()
}

// Helper to fetch image and convert to Gemini Part
async function urlToPart(url: string): Promise<{ inlineData: { data: string; mimeType: string } } | null> {
    try {
        // Handle Data URLs (Base64) immediately without fetching
        if (url.startsWith('data:')) {
            const base64Index = url.indexOf(';base64,')
            if (base64Index === -1) throw new Error('Invalid Data URL: missing ;base64,')

            const base64 = url.substring(base64Index + 8)
            const mimeType = url.substring(5, base64Index)

            return {
                inlineData: {
                    data: base64,
                    mimeType
                }
            }
        }

        const response = await fetch(url)
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`)

        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64 = buffer.toString('base64')
        const mimeType = response.headers.get('content-type') || 'image/png'

        return {
            inlineData: {
                data: base64,
                mimeType
            }
        }
    } catch (error) {
        console.error('Error processing context image:', error)
        return null
    }
}


// Generate image with brand context
export async function generateBrandImage(
    brand: { name: string; brand_dna: BrandDNA },
    userPrompt: string,
    options: ImageGenerationOptions = {}
): Promise<string> {

    // 1. Build text prompt
    const enhancedPrompt = buildImagePrompt(brand, userPrompt, options)

    // 2. Prepare Payload Parts from options
    const model = options.model || DEFAULT_IMAGE_MODEL
    log.info('IMAGE', `Start | Model=${model}`)

    // Build parts array for Wisdom API
    const parts: any[] = [{ text: enhancedPrompt }]

    // Add context images if any
    if (options.context && options.context.length > 0) {
        const imageItems = options.context.filter(
            c => c.type === 'image' || c.type === 'logo' || c.type === 'aux_logo'
        )

        if (imageItems.length > 0) {
            log.info('IMAGE', `Context images: ${imageItems.length}`)
            // Convert urls/base64 to parts suitable for standard Gemini format
            // generateWisdomImage will handle final formatting if needed
            const imagePartsPromises = imageItems.map(async (item) => {
                if (!item.value) return null
                return await urlToPart(item.value)
            })

            const imageParts = await Promise.all(imagePartsPromises)
            imageParts.forEach(part => {
                if (part) parts.push(part)
            })
        }
    }

    // Add layout reference if any
    if (options.layoutReference) {
        let layoutUrl = options.layoutReference
        if (layoutUrl.startsWith('/')) {
            const baseUrl = typeof window !== 'undefined'
                ? window.location.origin
                : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
            layoutUrl = `${baseUrl}${layoutUrl}`
        }

        const layoutPart = await urlToPart(layoutUrl)
        if (layoutPart) {
            log.info('IMAGE', 'Layout reference added')
            parts.push(layoutPart)
        }
    }

    // 3. Call Wisdom API
    return await generateWisdomImage(parts, model, options.aspectRatio)
}

// --- WIDOM GATE INTEGRATION ---
const WISDOM_BASE_URL = 'https://wisdom-gate.juheapi.com'
const NAGA_BASE_URL = 'https://api.naga.ac/v1'
const OPENAI_BASE_URL = 'https://api.openai.com/v1'
const GOOGLE_TEXT_SETTING_KEY = 'provider_google_api_key'
const WISDOM_SETTING_KEY = 'provider_wisdom_api_key'
const OPENAI_SETTING_KEY = 'provider_openai_api_key'
const NAGA_SETTING_KEY = 'provider_naga_api_key'
const REPLICATE_BASE_URL = 'https://api.replicate.com/v1'
const REPLICATE_SETTING_KEY = 'provider_replicate_api_key'
const REPLICATE_MODEL_NANO_BANANA_2 = 'google/nano-banana-2'
const REPLICATE_TEXT_MODEL_GEMINI_3_FLASH = 'google/gemini-3-flash'
const ATLAS_BASE_URL = 'https://api.atlascloud.ai'
const IMAGE_PROVIDER_TIMEOUT_MS = 90_000
const ATLAS_IMAGE_ENDPOINTS = [
    '/api/v1/model/generateImage',
    '/v1/model/generateImage',
]
const ATLAS_PREDICTION_PATH = '/api/v1/model/prediction'
const ATLAS_SETTING_KEY = 'provider_atlas_api_key'
const NAGA_DEFAULT_PROMPT_LIMIT = 8192
const NAGA_MODEL_ALIASES: Record<string, string> = {}
const NAGA_UNSUPPORTED_MODELS = new Set([
    'gemini-3-pro-image-preview',
    'google/gemini-3-pro-image-preview',
])
const NAGA_MODEL_PROMPT_LIMITS: Record<string, number> = {
    'seedream-5-lite': 8192,
    'gpt-image-1.5-2025-12-16': 8192,
    'gemini-3-pro-image-preview': 8192,
    'google/gemini-3-pro-image-preview': 8192,
}
let nagaApiKeyCache = ''
let nagaApiKeyCacheAt = 0
let replicateApiKeyCache = ''
let replicateApiKeyCacheAt = 0
let atlasApiKeyCache = ''
let atlasApiKeyCacheAt = 0
let googleTextApiKeyCache = ''
let googleTextApiKeyCacheAt = 0
let wisdomApiKeyCache = ''
let wisdomApiKeyCacheAt = 0
let openaiApiKeyCache = ''
let openaiApiKeyCacheAt = 0
const NAGA_API_KEY_CACHE_TTL_MS = 60_000
const REPLICATE_API_KEY_CACHE_TTL_MS = 60_000
const ATLAS_API_KEY_CACHE_TTL_MS = 60_000
const GOOGLE_API_KEY_CACHE_TTL_MS = 60_000
const WISDOM_API_KEY_CACHE_TTL_MS = 60_000
const OPENAI_API_KEY_CACHE_TTL_MS = 60_000
let textCallSequence = 0

function nextTextCallId(): string {
    textCallSequence += 1
    return `txt-${String(textCallSequence).padStart(4, '0')}`
}

async function resolveSettingKey(settingKey: string): Promise<string> {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!convexUrl) return ''

    const convex = new ConvexHttpClient(convexUrl)
    const value = await convex.query(api.admin.getSetting, { key: settingKey })
    return typeof value === 'string' ? value.trim() : ''
}

async function resolveGoogleTextApiKey(): Promise<string> {
    const now = Date.now()
    if (googleTextApiKeyCache && (now - googleTextApiKeyCacheAt) < GOOGLE_API_KEY_CACHE_TTL_MS) {
        return googleTextApiKeyCache
    }
    const value = await resolveSettingKey(GOOGLE_TEXT_SETTING_KEY)
    if (value) {
        googleTextApiKeyCache = value
        googleTextApiKeyCacheAt = now
    }
    return value
}

async function resolveWisdomApiKey(): Promise<string> {
    const now = Date.now()
    if (wisdomApiKeyCache && (now - wisdomApiKeyCacheAt) < WISDOM_API_KEY_CACHE_TTL_MS) {
        return wisdomApiKeyCache
    }
    const value = await resolveSettingKey(WISDOM_SETTING_KEY)
    if (value) {
        wisdomApiKeyCache = value
        wisdomApiKeyCacheAt = now
    }
    return value
}

async function resolveOpenAIApiKey(): Promise<string> {
    const now = Date.now()
    if (openaiApiKeyCache && (now - openaiApiKeyCacheAt) < OPENAI_API_KEY_CACHE_TTL_MS) {
        return openaiApiKeyCache
    }
    const value = await resolveSettingKey(OPENAI_SETTING_KEY)
    if (value) {
        openaiApiKeyCache = value
        openaiApiKeyCacheAt = now
    }
    return value
}

export async function getGoogleTextGenerativeModel(model: string) {
    const key = await resolveGoogleTextApiKey()
    if (!key) {
        throw new Error('Google API key no configurada en Admin > Modelos y API Keys.')
    }
    return new GoogleGenerativeAI(key).getGenerativeModel({ model })
}

export async function getGoogleImageGenerativeModel(model: string) {
    const key = await resolveGoogleTextApiKey()
    if (!key) {
        throw new Error('Google API key no configurada en Admin > Modelos y API Keys.')
    }
    return new GoogleGenerativeAI(key).getGenerativeModel({ model })
}

async function resolveNagaApiKey(explicitKey?: string): Promise<string> {
    const explicit = (explicitKey || '').trim()
    if (explicit) return explicit

    const now = Date.now()
    if (nagaApiKeyCache && (now - nagaApiKeyCacheAt) < NAGA_API_KEY_CACHE_TTL_MS) {
        return nagaApiKeyCache
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!convexUrl) return ''

    try {
        const convex = new ConvexHttpClient(convexUrl)
        const value = await convex.query(api.admin.getSetting, { key: NAGA_SETTING_KEY })
        if (typeof value === 'string' && value.trim().length > 0) {
            nagaApiKeyCache = value.trim()
            nagaApiKeyCacheAt = now
            return nagaApiKeyCache
        }
    } catch (error) {
        log.warn('NAGA', 'No se pudo resolver API key desde app_settings', error)
    }

    return ''
}

async function resolveReplicateApiKey(explicitKey?: string): Promise<string> {
    const explicit = (explicitKey || '').trim()
    if (explicit) return explicit

    const now = Date.now()
    if (replicateApiKeyCache && (now - replicateApiKeyCacheAt) < REPLICATE_API_KEY_CACHE_TTL_MS) {
        return replicateApiKeyCache
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!convexUrl) return ''

    try {
        const convex = new ConvexHttpClient(convexUrl)
        const value = await convex.query(api.admin.getSetting, { key: REPLICATE_SETTING_KEY })
        if (typeof value === 'string' && value.trim().length > 0) {
            replicateApiKeyCache = value.trim()
            replicateApiKeyCacheAt = now
            return replicateApiKeyCache
        }
    } catch (error) {
        log.warn('REPLICATE', 'No se pudo resolver API key desde app_settings', error)
    }

    return ''
}

async function resolveAtlasApiKey(explicitKey?: string): Promise<string> {
    const explicit = (explicitKey || '').trim()
    if (explicit) return explicit

    const now = Date.now()
    if (atlasApiKeyCache && (now - atlasApiKeyCacheAt) < ATLAS_API_KEY_CACHE_TTL_MS) {
        return atlasApiKeyCache
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!convexUrl) return ''

    try {
        const convex = new ConvexHttpClient(convexUrl)
        const value = await convex.query(api.admin.getSetting, { key: ATLAS_SETTING_KEY })
        if (typeof value === 'string' && value.trim().length > 0) {
            atlasApiKeyCache = value.trim()
            atlasApiKeyCacheAt = now
            return atlasApiKeyCache
        }
    } catch (error) {
        log.warn('ATLAS', 'No se pudo resolver API key desde app_settings', error)
    }

    return ''
}

export const WISDOM_MODELS = {
    TEXT: {
        'gemini-3-pro-preview': 'Gemini 3 Pro (Wisdom)',
        'gemini-3-flash-preview': 'Gemini 3 Flash (Wisdom)',
        'gemini-3.1-flash-lite-preview': 'Gemini 3.1 Flash Lite Preview (Wisdom)',
        'gemini-2.5-flash': 'Gemini 2.5 Flash (Wisdom)',
    },
    IMAGE: {
        'gemini-3-pro-image-preview': 'Gemini 3 Image (Wisdom)',
        'gemini-3.1-flash-image-preview': 'Gemini 3.1 Flash Image (Wisdom)',
        'gpt-image-2': 'GPT Image 2 (Wisdom, legacy low)',
        'gpt-image-2-low': 'GPT Image 2 Low (Wisdom)',
        'gpt-image-2-medium': 'GPT Image 2 Medium (Wisdom)',
        'qwen-image': 'Qwen Image (Alibaba)',
        'kolors': 'Kolors (Kwai)',
        'wanx-v1': 'Wanx (Alibaba)',
        'seedream-4.0': 'SeeDream 4.0'
    }
}

// Helper to map aspect ratios to OpenAI-compatible sizes

async function generateWisdomChatImage(prompt: string, model: string): Promise<string> {
    try {
        const wisdomApiKey = await resolveWisdomApiKey()
        if (!wisdomApiKey) throw new Error('Wisdom API key no configurada en /admin.')
        log.info('IMAGE', `Chat image generation: ${model}`)
        const response = await fetch(`${WISDOM_BASE_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${wisdomApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages: [{ role: "user", content: prompt }], // Just prompt, or "Draw: " + prompt
                stream: false
            })
        })

        if (!response.ok) {
            const err = await response.text()
            throw new Error(`Wisdom Chat API Error: ${err}`)
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content

        if (!content) throw new Error('No content in chat response')

        // Try to parse JSON content (common for some Chinese models like Seedream/Qwen)
        try {
            if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
                const parsed = JSON.parse(content)
                const url = Array.isArray(parsed) ? parsed[0]?.url : parsed?.url
                if (url) {
                    log.success('IMAGE', 'Extracted image URL from JSON', { url })
                    return url
                }
            }
        } catch (e) {
            console.warn('Failed to parse chat content as JSON, falling back to regex', e)
        }

        // Try to find Markdown image URL ![alt](url) or just (url)
        log.debug('IMAGE', 'Chat response content (truncated)', content.substring(0, 200))

        const urlMatch = content.match(/\((https?:\/\/[^\s\)"']+)\)/) || content.match(/(https?:\/\/[^\s\)"']+)/)

        if (urlMatch) {
            log.success('IMAGE', 'Extracted image URL from chat', { url: urlMatch[1] })
            return urlMatch[1]
        }

        throw new Error('No image URL found in chat response. Response was text only.')

    } catch (error) {
        log.error('IMAGE', 'Chat image generation error', error)
        throw error
    }
}

async function generateWisdomOpenAIImage(
    prompt: string,
    model: string,
    aspectRatio?: string,
    referenceUrls: string[] = []
): Promise<string> {
    try {
        const wisdomApiKey = await resolveWisdomApiKey()
        if (!wisdomApiKey) throw new Error('Wisdom API key no configurada en /admin.')
        // SPECIAL ROUTING FOR CHAT-BASED IMAGE MODELS (Qwen, Wanx, Kolors, Seedream)
        // These models often use the Chat Completion endpoint or return JSON in chat
        if (model.includes('qwen-image') || model.includes('wanx') || model.includes('kolors') || model.includes('seedream')) {
            return await generateWisdomChatImage(prompt, model)
        }

        const resolvedModel = resolveOpenAICompatibleImageModel(model)
        log.info('IMAGE', `OpenAI-compatible image model: ${resolvedModel.providerModel} quality=${resolvedModel.quality}`)
        const hasReferences = resolvedModel.providerModel.toLowerCase() === 'gpt-image-2' && referenceUrls.length > 0
        const endpointPath = hasReferences ? '/v1/images/edits' : '/v1/images/generations'
        log.debug('IMAGE', `Endpoint: ${WISDOM_BASE_URL}${endpointPath}`)

        const size = getOpenAISize(aspectRatio)

        const requestBody = {
            model: resolvedModel.providerModel,
            prompt: prompt,
            n: 1,
            size: size,
            quality: resolvedModel.quality,
            response_format: "b64_json"
        }

        // Wisdom Gate OpenAI-compatible endpoint
        const endpoint = `${WISDOM_BASE_URL}${endpointPath}`
        const maxRetries = 3
        const retryDelays = [1000, 2000, 4000]
        let lastError: Error | null = null

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                log.info('IMAGE', `[${attempt + 1}/${maxRetries + 1}] Attempting Wisdom OpenAI image API call | quality=${resolvedModel.quality} aspect=${aspectRatio || 'default'} size=${size} refs=${referenceUrls.length}`)

                let response: Response
                if (hasReferences) {
                    const formData = new FormData()
                    formData.append('model', resolvedModel.providerModel)
                    formData.append('prompt', prompt)
                    formData.append('n', '1')
                    formData.append('size', size)
                    formData.append('quality', resolvedModel.quality)
                    formData.append('response_format', 'b64_json')

                    let appendedImages = 0
                    for (const [index, url] of referenceUrls.entries()) {
                        const blob = await imageUrlToBlob(url)
                        if (!blob) continue
                        const extension = blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'jpg' : 'png'
                        formData.append('image[]', blob, `reference-${index + 1}.${extension}`)
                        appendedImages += 1
                    }

                    if (appendedImages === 0) {
                        log.error('IMAGE', `Wisdom GPT Image 2: ninguna de las ${referenceUrls.length} referencia(s) se pudo descargar`, referenceUrls.map(describeImageRef))
                        throw new Error(`No se pudo preparar ninguna imagen de referencia para Wisdom GPT Image 2 (${referenceUrls.length} referencia(s) fallaron al descargar).`)
                    }

                    response = await fetchWithTimeout(endpoint, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${wisdomApiKey}`
                        },
                        body: formData
                    }, IMAGE_PROVIDER_TIMEOUT_MS, `Wisdom OpenAI image edit request (${resolvedModel.providerModel})`)
                } else {
                    response = await fetchWithTimeout(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${wisdomApiKey}`
                        },
                        body: JSON.stringify(requestBody)
                    }, IMAGE_PROVIDER_TIMEOUT_MS, `Wisdom OpenAI image request (${resolvedModel.providerModel})`)
                }

                if (!response.ok) {
                    const errorText = await response.text()
                    const errorMessage = extractProviderErrorMessage(errorText)
                    const isRetryable = isTransientProviderError(errorMessage, response.status)

                    if (isRetryable && attempt < maxRetries) {
                        const delay = retryDelays[attempt]
                        log.warn('IMAGE', `[${attempt + 1}/${maxRetries + 1}] Wisdom OpenAI image endpoint busy, retrying in ${delay}ms`)
                        lastError = new Error(`Wisdom Gate Error: ${errorMessage}`)
                        await new Promise(resolve => setTimeout(resolve, delay))
                        continue
                    }

                    log.error('IMAGE', 'OpenAI image API failed', errorText)
                    throw new Error(`Wisdom Gate Error: ${errorText}`)
                }

                const data = await response.json()

                const imageResult = extractOpenAIImageResult(data)
                if (imageResult) {
                    log.success('IMAGE', `[${attempt + 1}/${maxRetries + 1}] Wisdom OpenAI image API call succeeded | source=${imageResult.source}`)
                    return imageResult.value
                }

                log.error('IMAGE', 'Wisdom image response did not contain a recognized image payload', summarizeOpenAIImageResponseShape(data))
                throw new Error('No image data found in Wisdom response')
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error)
                const isRetryable = isTransientProviderError(errorMessage)
                if (!isRetryable || attempt === maxRetries) {
                    throw error
                }

                const delay = retryDelays[attempt]
                log.warn('IMAGE', `[${attempt + 1}/${maxRetries + 1}] Wisdom OpenAI image request failed transiently, retrying in ${delay}ms`, error)
                lastError = error instanceof Error ? error : new Error(errorMessage)
                await new Promise(resolve => setTimeout(resolve, delay))
            }
        }

        throw lastError || new Error('No image data found in Wisdom response')

    } catch (error) {
        log.error('IMAGE', 'OpenAI image error', error)
        throw error
    }
}

async function generateOpenAIImage(
    prompt: string,
    model: string,
    aspectRatio?: string,
    referenceUrls: string[] = []
): Promise<string> {
    const openaiApiKey = await resolveOpenAIApiKey()
    if (!openaiApiKey) throw new Error('OpenAI API key no configurada en Admin > Modelos y API Keys.')

    const resolvedModel = resolveOpenAICompatibleImageModel(model)
    const size = getOpenAIImageSizeForAspectRatio(aspectRatio)
    const endpoint = referenceUrls.length > 0
        ? `${OPENAI_BASE_URL}/images/edits`
        : `${OPENAI_BASE_URL}/images/generations`
    const maxRetries = 2
    const retryDelays = [1000, 2500]
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            log.info('OPENAI', `[${attempt + 1}/${maxRetries + 1}] Image request | model=${resolvedModel.providerModel} quality=${resolvedModel.quality} aspect=${aspectRatio || 'default'} size=${size} refs=${referenceUrls.length}`)

            let response: Response
            if (referenceUrls.length > 0) {
                const formData = new FormData()
                formData.append('model', resolvedModel.providerModel)
                formData.append('prompt', prompt)
                formData.append('quality', resolvedModel.quality)
                formData.append('size', size)

                let appendedImages = 0
                for (const [index, url] of referenceUrls.entries()) {
                    const blob = await imageUrlToBlob(url)
                    if (!blob) continue
                    const extension = blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'jpg' : 'png'
                    formData.append('image[]', blob, `reference-${index + 1}.${extension}`)
                    appendedImages += 1
                }

                if (appendedImages === 0) {
                    log.error('OPENAI', `Ninguna de las ${referenceUrls.length} referencia(s) se pudo descargar`, referenceUrls.map(describeImageRef))
                    throw new Error(`No se pudo preparar ninguna imagen de referencia para OpenAI (${referenceUrls.length} referencia(s) fallaron al descargar).`)
                }

                response = await fetchWithTimeout(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openaiApiKey}`,
                    },
                    body: formData,
                }, IMAGE_PROVIDER_TIMEOUT_MS, `OpenAI image edit request (${resolvedModel.providerModel})`)
            } else {
                response = await fetchWithTimeout(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openaiApiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: resolvedModel.providerModel,
                        prompt,
                        quality: resolvedModel.quality,
                        size,
                    }),
                }, IMAGE_PROVIDER_TIMEOUT_MS, `OpenAI image generation request (${resolvedModel.providerModel})`)
            }

            if (!response.ok) {
                const errorText = await response.text()
                const errorMessage = extractProviderErrorMessage(errorText)
                if (isTransientProviderError(errorMessage, response.status) && attempt < maxRetries) {
                    const delay = retryDelays[attempt]
                    log.warn('OPENAI', `[${attempt + 1}/${maxRetries + 1}] OpenAI image endpoint transient error, retrying in ${delay}ms`, errorText)
                    lastError = new Error(`OpenAI Error: ${errorMessage}`)
                    await new Promise(resolve => setTimeout(resolve, delay))
                    continue
                }

                log.error('OPENAI', 'OpenAI image API failed', errorText)
                throw new Error(`OpenAI Error: ${errorText}`)
            }

            const data = await response.json()
            const imageResult = extractOpenAIImageResult(data)
            if (imageResult) {
                log.success('OPENAI', `[${attempt + 1}/${maxRetries + 1}] Image request succeeded | source=${imageResult.source}`)
                return imageResult.value
            }

            log.error('OPENAI', 'OpenAI image response did not contain a recognized image payload', summarizeOpenAIImageResponseShape(data))
            throw new Error('No image data found in OpenAI response')
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            if (!isTransientProviderError(errorMessage) || attempt === maxRetries) {
                throw error
            }

            const delay = retryDelays[attempt]
            log.warn('OPENAI', `[${attempt + 1}/${maxRetries + 1}] OpenAI image request failed transiently, retrying in ${delay}ms`, error)
            lastError = error instanceof Error ? error : new Error(errorMessage)
            await new Promise(resolve => setTimeout(resolve, delay))
        }
    }

    throw lastError || new Error('No image data found in OpenAI response')
}

async function generateNagaImage(
    prompt: string,
    model: string,
    aspectRatio?: string,
    explicitApiKey?: string
): Promise<string> {
    const nagaApiKey = await resolveNagaApiKey(explicitApiKey)
    if (!nagaApiKey) {
        throw new Error('NagaAI API key no configurada. Configúrala en /admin o en NAGA_API_KEY.')
    }

    const rawModel = String(model || '').trim()
    const normalizedModel = rawModel.toLowerCase()
    if (NAGA_UNSUPPORTED_MODELS.has(normalizedModel)) {
        throw new Error(
            'El modelo naga/gemini-3-pro-image-preview no está disponible en Naga. ' +
            'Selecciona un modelo Naga soportado (ej: naga/gpt-image-1.5-2025-12-16 o naga/seedream-5-lite).'
        )
    }
    const resolvedModel = NAGA_MODEL_ALIASES[normalizedModel] ?? rawModel
    const normalizedResolvedModel = resolvedModel.toLowerCase()
    if (resolvedModel !== rawModel) {
        log.info('IMAGE', `Naga model alias applied: ${rawModel} -> ${resolvedModel}`)
    }

    const limit = NAGA_MODEL_PROMPT_LIMITS[normalizedResolvedModel] ?? NAGA_DEFAULT_PROMPT_LIMIT
    const promptForNaga = fitPromptForProviderLimit(prompt, limit)
    if (promptForNaga.length !== prompt.length) {
        log.warn('IMAGE', `Naga prompt trimmed (${normalizedResolvedModel}) ${prompt.length} -> ${promptForNaga.length} chars`)
    }

    const response = await fetchWithTimeout(`${NAGA_BASE_URL}/images/generations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${nagaApiKey}`
        },
        body: JSON.stringify({
            model: resolvedModel,
            prompt: promptForNaga,
            n: 1,
            size: getNagaImageSize(resolvedModel, aspectRatio),
            response_format: 'url'
        })
    }, IMAGE_PROVIDER_TIMEOUT_MS, `Naga image request (${resolvedModel})`)

    if (!response.ok) {
        const errorText = await response.text()
        const contentType = response.headers.get('content-type') || 'unknown'
        const compact = errorText.replace(/\s+/g, ' ').slice(0, 500)
        throw new Error(`NagaAI image error (${response.status}, ${contentType}): ${compact}`)
    }

    const data = await response.json()
    if (data?.data?.[0]?.b64_json) {
        return `data:image/png;base64,${data.data[0].b64_json}`
    }
    if (data?.data?.[0]?.url) {
        const rawUrl = String(data.data[0].url).trim()
        try {
            return await resolveImageUrlToDataUrl(rawUrl)
        } catch (error) {
            log.warn('IMAGE', `Naga URL fallback to remote URL (${rawUrl})`, error)
            return rawUrl
        }
    }

    throw new Error('No image data found in NagaAI response')
}


function collectReplicateImageInputs(options: ImageGenerationOptions): string[] {
    const urls: string[] = []

    const maybePush = (value?: string) => {
        const trimmed = String(value || '').trim()
        if (!trimmed) return
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            urls.push(trimmed)
        }
    }

    if (options.context && options.context.length > 0) {
        options.context.forEach((item) => {
            if (item.type === 'image' || item.type === 'logo' || item.type === 'aux_logo') {
                maybePush(item.value)
            }
        })
    }

    if (options.layoutReference) {
        maybePush(options.layoutReference)
    }

    return Array.from(new Set(urls)).slice(0, 14)
}

type ReplicatePredictionResponse = {
    id?: string
    status?: string
    error?: string
    output?: string | string[] | null
    urls?: {
        get?: string
    }
}

function extractReplicateOutputUrl(payload: ReplicatePredictionResponse): string {
    if (typeof payload.output === 'string' && payload.output.trim()) {
        return payload.output.trim()
    }
    if (Array.isArray(payload.output)) {
        const firstUrl = payload.output.find((item) => typeof item === 'string' && item.trim().length > 0)
        if (firstUrl) return firstUrl.trim()
    }
    throw new Error('Replicate no devolvió URL de imagen en output')
}

async function pollReplicatePrediction(
    getUrl: string,
    token: string,
    maxAttempts = 60
): Promise<ReplicatePredictionResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const response = await fetch(getUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Replicate polling error (${response.status}): ${errorText}`)
        }

        const data = (await response.json()) as ReplicatePredictionResponse

        if (data.status === 'succeeded') return data
        if (data.status === 'failed' || data.status === 'canceled') {
            throw new Error(data.error || `Replicate prediction finalizó con estado ${data.status}`)
        }

        await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    throw new Error('Replicate timeout esperando la predicción')
}

async function generateReplicateImage(
    prompt: string,
    model: string,
    options: ImageGenerationOptions = {}
): Promise<string> {
    const replicateApiKey = await resolveReplicateApiKey(options.replicateApiKey)
    if (!replicateApiKey) {
        throw new Error('Replicate API key no configurada. Configúrala en /admin o en REPLICATE_API_TOKEN.')
    }

    const normalizedModel = String(model || '').trim().toLowerCase()
    const isSupportedModel =
        normalizedModel === REPLICATE_MODEL_NANO_BANANA_2 ||
        normalizedModel === REPLICATE_MODEL_NANO_BANANA_PRO

    if (!isSupportedModel) {
        throw new Error(`Modelo Replicate no soportado: ${model}`)
    }

    const input: Record<string, unknown> = {
        prompt,
        aspect_ratio: toReplicateAspectRatioForModel(normalizedModel, options.aspectRatio),
        output_format: 'jpg',
    }

    if (normalizedModel === REPLICATE_MODEL_NANO_BANANA_PRO) {
        input.resolution = '2K'
        input.allow_fallback_model = false
    }

    log.info('REPLICATE', `Image input | aspect_ratio=${String(input.aspect_ratio)} model=${normalizedModel}`)

    const imageInput = collectReplicateImageInputs(options)
    if (imageInput.length > 0) {
        input.image_input = imageInput
    }

    const response = await fetch(`${REPLICATE_BASE_URL}/models/${normalizedModel}/predictions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${replicateApiKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'wait=60',
        },
        body: JSON.stringify({ input }),
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Replicate image error (${response.status}): ${errorText}`)
    }

    let data = (await response.json()) as ReplicatePredictionResponse

    if (data.status !== 'succeeded') {
        const getUrl = data.urls?.get
        if (!getUrl) {
            throw new Error(data.error || `Replicate prediction en estado ${data.status || 'unknown'} sin URL de seguimiento`)
        }
        data = await pollReplicatePrediction(getUrl, replicateApiKey)
    }

    const outputUrl = extractReplicateOutputUrl(data)
    try {
        return await resolveImageUrlToDataUrl(outputUrl)
    } catch (error) {
        log.warn('IMAGE', `Replicate URL fallback to remote URL (${outputUrl})`, error)
        return outputUrl
    }
}

async function generateReplicateText(
    prompt: string,
    model: string,
    systemPrompt?: string,
    images?: string[],
    options?: TextGenerationOptions
): Promise<string> {
    const startedAt = Date.now()
    const replicateApiKey = await resolveReplicateApiKey()
    if (!replicateApiKey) {
        throw new Error('Replicate API key no configurada en Admin > Modelos y API Keys.')
    }

    const normalizedModel = String(model || '').trim().toLowerCase()
    if (normalizedModel !== REPLICATE_TEXT_MODEL_GEMINI_3_FLASH) {
        throw new Error(`Modelo Replicate de inteligencia no soportado: ${model}`)
    }
    log.info('REPLICATE', `Text prediction start | model=${normalizedModel} images=${images?.length || 0}`)

    const input: Record<string, unknown> = {
        prompt,
    }

    if (systemPrompt && systemPrompt.trim().length > 0) {
        input.system_instruction = systemPrompt.trim()
    }
    if (typeof options?.temperature === 'number') {
        input.temperature = options.temperature
    }
    if (typeof options?.topP === 'number') {
        input.top_p = options.topP
    }
    if (images && images.length > 0) {
        const imageUrls = images
            .map((img) => String(img || '').trim())
            .filter((img) => img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:'))
            .slice(0, 10)
        if (imageUrls.length > 0) {
            input.images = imageUrls
        }
    }

    const response = await fetch(`${REPLICATE_BASE_URL}/models/${normalizedModel}/predictions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${replicateApiKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'wait=60',
        },
        body: JSON.stringify({ input }),
    })

    if (!response.ok) {
        const errorText = await response.text()
        log.error('REPLICATE', `Text prediction failed | model=${normalizedModel} status=${response.status}`, errorText)
        throw new Error(`Replicate text error (${response.status}): ${errorText}`)
    }

    let data = (await response.json()) as ReplicatePredictionResponse
    if (data.status !== 'succeeded') {
        const getUrl = data.urls?.get
        if (!getUrl) {
            throw new Error(data.error || `Replicate prediction en estado ${data.status || 'unknown'} sin URL de seguimiento`)
        }
        data = await pollReplicatePrediction(getUrl, replicateApiKey)
    }

    if (Array.isArray(data.output)) {
        log.success('REPLICATE', `Text prediction done | model=${normalizedModel} ${Date.now() - startedAt}ms`)
        return data.output.map((part) => String(part || '')).join('')
    }
    if (typeof data.output === 'string' && data.output.trim().length > 0) {
        log.success('REPLICATE', `Text prediction done | model=${normalizedModel} ${Date.now() - startedAt}ms`)
        return data.output
    }

    throw new Error('Replicate text error: salida vacía')
}


function extractAtlasImageUrl(payload: any): string {
    const direct = [
        payload?.url,
        payload?.image_url,
        payload?.result?.url,
        payload?.result?.image_url,
        payload?.output?.url,
        payload?.output?.image_url,
        payload?.data?.[0]?.url,
        payload?.data?.[0]?.image_url,
        payload?.data?.output?.url,
        payload?.data?.output?.image_url,
    ].find((value) => typeof value === 'string' && value.trim().length > 0)

    if (typeof direct === 'string' && direct.trim()) return direct.trim()

    const arrayLike = [payload?.outputs, payload?.images, payload?.result?.images, payload?.data?.outputs, payload?.data?.images]
    for (const candidate of arrayLike) {
        if (Array.isArray(candidate)) {
            const match = candidate.find((item: any) =>
                typeof item === 'string'
                    ? item.trim().length > 0
                    : (typeof item?.url === 'string' && item.url.trim().length > 0)
            )
            if (typeof match === 'string') return match.trim()
            if (match?.url) return String(match.url).trim()
        }
    }

    throw new Error('Atlas no devolvió URL de imagen')
}

async function generateAtlasImage(
    prompt: string,
    model: string,
    options: ImageGenerationOptions = {}
): Promise<string> {
    const atlasApiKey = await resolveAtlasApiKey(options.atlasApiKey)
    if (!atlasApiKey) {
        throw new Error('Atlas API key no configurada. Configúrala en /admin o en ATLAS_API_KEY.')
    }

    const atlasModel = resolveAtlasModel(model)
    const body: Record<string, unknown> = {
        model: atlasModel,
        prompt,
        aspect_ratio: toAtlasAspectRatio(options.aspectRatio),
        enable_base64_output: false,
        enable_sync_mode: false,
        output_format: 'png',
        resolution: '2k',
    }

    let lastError = ''
    let data: any = null
    let ok = false
    const maxGenerateAttempts = 3

    for (let attempt = 0; attempt < maxGenerateAttempts; attempt++) {
        for (const path of ATLAS_IMAGE_ENDPOINTS) {
            const response = await fetch(`${ATLAS_BASE_URL}${path}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${atlasApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            })

            if (response.ok) {
                data = await response.json()
                ok = true
                break
            }

            const errorText = await response.text()
            lastError = `Atlas image error (${response.status}) [${path}]: ${errorText}`

            const lower = `${response.status} ${errorText}`.toLowerCase()
            const isUpstreamBusy =
                lower.includes('no available channel') ||
                lower.includes('429 received from upstream') ||
                (response.status === 429)

            if (isUpstreamBusy && attempt < maxGenerateAttempts - 1) {
                const waitMs = 1200 * (attempt + 1)
                log.warn('ATLAS', `Canal saturado, reintentando intento ${attempt + 2}/${maxGenerateAttempts} en ${waitMs}ms`)
                await new Promise((resolve) => setTimeout(resolve, waitMs))
                break
            }

            if (response.status !== 404) {
                throw new Error(lastError)
            }
        }

        if (ok) {
            break
        }
    }

    if (!ok) {
        throw new Error(lastError || 'Atlas image error: endpoint not found')
    }

    // Sync response shortcut: some deployments can return outputs directly.
    try {
        const syncUrl = extractAtlasImageUrl(data)
        if (syncUrl) {
            try {
                return await resolveImageUrlToDataUrl(syncUrl)
            } catch (error) {
                log.warn('IMAGE', `Atlas URL fallback to remote URL (${syncUrl})`, error)
                return syncUrl
            }
        }
    } catch {
        // continue with async polling flow
    }

    const predictionId = data?.data?.id || data?.id
    if (!predictionId) {
        throw new Error('Atlas no devolvió prediction id ni imagen directa')
    }

    let predictionPayload: any = null
    const maxAttempts = 90
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const pollResponse = await fetch(`${ATLAS_BASE_URL}${ATLAS_PREDICTION_PATH}/${predictionId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${atlasApiKey}`,
            },
        })

        if (!pollResponse.ok) {
            const errorText = await pollResponse.text()
            throw new Error(`Atlas polling error (${pollResponse.status}): ${errorText}`)
        }

        predictionPayload = await pollResponse.json()
        const status = String(predictionPayload?.data?.status || predictionPayload?.status || '').toLowerCase()

        if (status === 'completed' || status === 'succeeded') {
            break
        }
        if (status === 'failed' || status === 'canceled' || status === 'cancelled') {
            const err = predictionPayload?.data?.error || predictionPayload?.error || 'Generation failed'
            throw new Error(`Atlas prediction failed: ${err}`)
        }

        await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    if (!predictionPayload) {
        throw new Error('Atlas polling no devolvió resultado')
    }

    const outputUrl = extractAtlasImageUrl(predictionPayload)
    try {
        return await resolveImageUrlToDataUrl(outputUrl)
    } catch (error) {
        log.warn('IMAGE', `Atlas URL fallback to remote URL (${outputUrl})`, error)
        return outputUrl
    }
}

function fitPromptForProviderLimit(prompt: string, maxChars: number): string {
    const normalized = prompt
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

    if (normalized.length <= maxChars) {
        return normalized
    }

    const marker = '\n\n[...prompt recortado automáticamente por límite del proveedor...]\n\n'
    const budget = Math.max(0, maxChars - marker.length)
    const headLen = Math.floor(budget * 0.4)
    const tailLen = budget - headLen

    const merged = `${normalized.slice(0, headLen)}${marker}${normalized.slice(-tailLen)}`
    return merged.length <= maxChars ? merged : merged.slice(0, maxChars)
}

async function resolveImageUrlToDataUrl(url: string): Promise<string> {
    const maxAttempts = 3
    const retryMs = [500, 1000, 1500]
    let lastError: unknown = null

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }
            const mimeType = response.headers.get('content-type') || 'image/png'
            const arrayBuffer = await response.arrayBuffer()
            const base64 = Buffer.from(arrayBuffer).toString('base64')
            return `data:${mimeType};base64,${base64}`
        } catch (error) {
            lastError = error
            if (attempt < maxAttempts - 1) {
                await new Promise((resolve) => setTimeout(resolve, retryMs[attempt]))
            }
        }
    }

    throw lastError instanceof Error ? lastError : new Error('No se pudo resolver la URL de imagen')
}

async function fetchWithTimeout(
    input: string,
    init: RequestInit,
    timeoutMs: number,
    label: string
): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
        return await fetch(input, {
            ...init,
            signal: controller.signal,
        })
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`${label} timeout after ${timeoutMs}ms`)
        }
        throw error
    } finally {
        clearTimeout(timeoutId)
    }
}

// Describe una URL de referencia para logs sin exponer query strings ni secretos
// (tokens de firma de storage, claves en query, etc.). Devuelve scheme://host/path.
function describeImageRef(url: string): string {
    if (!url) return '(vacía)'
    if (url.startsWith('data:')) {
        const semi = url.indexOf(';')
        const mime = url.slice(5, semi > 0 ? semi : 16)
        return `data:${mime}… (${url.length} chars)`
    }
    try {
        const u = new URL(url)
        return `${u.protocol}//${u.host}${u.pathname}`
    } catch {
        return `${url.slice(0, 64)} (no es URL absoluta)`
    }
}

async function imageUrlToBlob(url: string): Promise<Blob | null> {
    try {
        if (!url) {
            log.warn('OPENAI', 'Referencia de imagen vacía, se omite')
            return null
        }

        if (url.startsWith('data:')) {
            const base64Index = url.indexOf(';base64,')
            if (base64Index === -1) {
                log.warn('OPENAI', `Referencia data: sin ';base64,' → ${describeImageRef(url)}`)
                return null
            }
            const mimeType = url.substring(5, base64Index) || 'image/png'
            const base64 = url.substring(base64Index + 8)
            const bytes = Buffer.from(base64, 'base64')
            return new Blob([bytes], { type: mimeType })
        }

        const response = await fetch(url)
        if (!response.ok) {
            log.warn('OPENAI', `No se pudo descargar referencia de imagen: HTTP ${response.status} ${response.statusText} → ${describeImageRef(url)}`)
            return null
        }

        const mimeType = response.headers.get('content-type') || 'image/png'
        const arrayBuffer = await response.arrayBuffer()
        return new Blob([arrayBuffer], { type: mimeType })
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        log.warn('OPENAI', `No se pudo preparar una referencia de imagen para OpenAI: ${reason} → ${describeImageRef(url)}`)
        return null
    }
}

function extractProviderErrorMessage(errorText: string): string {
    try {
        const json = JSON.parse(errorText)
        if (typeof json.error?.message === 'string') return json.error.message
        if (typeof json.message === 'string') return json.message
    } catch {
        // Keep raw provider body when it is not JSON.
    }
    return errorText
}

function isTransientProviderError(errorMessage: string, status?: number): boolean {
    const normalized = errorMessage.toLowerCase()
    return Boolean(
        status === 429 ||
        (typeof status === 'number' && status >= 500) ||
        normalized.includes('system busy') ||
        normalized.includes('system overloaded') ||
        normalized.includes('overloaded') ||
        normalized.includes('please try again') ||
        normalized.includes('no available channel') ||
        normalized.includes('get_channel_failed') ||
        normalized.includes('429 received from upstream')
    )
}

export interface TextGenerationOptions {
    temperature?: number
    topP?: number
    nagaApiKey?: string
    atlasApiKey?: string
}

async function generateWisdomText(
    prompt: string,
    model: string,
    systemPrompt?: string,
    images?: string[],
    options?: TextGenerationOptions
): Promise<string> {
    try {
        const wisdomApiKey = await resolveWisdomApiKey()
        if (!wisdomApiKey) throw new Error('Wisdom API key no configurada en /admin.')
        log.info('TEXT', `Generating with model: ${model}`)

        // Construct Gemini-native payload
        const parts: any[] = []

        // Add text prompt
        // Note: For Gemini, system instructions are usually passed in a separate field 'systemInstruction' 
        // or prepended to the user prompt if the model doesn't support it strictly.
        // For simplicity and broad compatibility, we'll prepend system prompt or use the config if strictly supported.
        // However, the unified flow often combines them. Let's prepend for now to ensure context.
        const finalPrompt = prompt

        // Build contents array
        // Gemini expects: { role: 'user', parts: [...] }
        const promptParts: any[] = []

        if (images && images.length > 0) {
            log.info('TEXT', `Processing ${images.length} images for text generation`)
            for (const img of images) {
                const part = await urlToPart(img)
                if (part) promptParts.push(part)
            }
        }

        // Add text part
        promptParts.push({ text: finalPrompt })

        const contents = [{
            role: 'user',
            parts: promptParts
        }]

        // Retry logic with exponential backoff
        const maxRetries = 3
        const retryDelays = [1000, 2000, 4000]
        let lastError: Error | null = null

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                log.info('TEXT', `[${attempt + 1}/${maxRetries + 1}] Attempting Wisdom Gate API call (Native)`)

                const requestBody: any = {
                    contents,
                    generationConfig: {
                        temperature: options?.temperature ?? 0.7,
                        ...(typeof options?.topP === 'number' ? { topP: options.topP } : {}),
                    }
                }

                // Add system instruction if provided (Gemini 1.5+ supports this)
                if (systemPrompt) {
                    requestBody.systemInstruction = {
                        parts: [{ text: systemPrompt }]
                    }
                }

                // Use the correct base URL with /v1beta as per docs
                const endpoint = `${WISDOM_BASE_URL}/v1beta/models/${model}:generateContent`

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': wisdomApiKey
                    },
                    body: JSON.stringify(requestBody)
                })

                if (!response.ok) {
                    const errorText = await response.text()
                    let errorMessage = errorText
                    try {
                        const json = JSON.parse(errorText)
                        if (json.error?.message) errorMessage = json.error.message
                    } catch (e) { }

                    const isSystemBusy = errorMessage.toLowerCase().includes('system busy') ||
                        errorMessage.toLowerCase().includes('please try again') ||
                        errorMessage.includes('503') ||
                        errorMessage.includes('429')

                    if (isSystemBusy && attempt < maxRetries) {
                        const delay = retryDelays[attempt]
                        log.warn('TEXT', `[Attempt ${attempt + 1}] Wisdom Gate busy, retrying in ${delay}ms`)
                        lastError = new Error(errorMessage)
                        await new Promise(resolve => setTimeout(resolve, delay))
                        continue
                    }

                    log.error('TEXT', 'Text API failed', errorMessage)
                    throw new Error(errorMessage)
                }

                // Success
                log.success('TEXT', `[Attempt ${attempt + 1}] Wisdom Gate API call succeeded`)
                const data = await response.json()

                // Extract text from Gemini response candidates
                // data.candidates[0].content.parts[0].text
                const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || ''
                return text

            } catch (error) {
                if (attempt === maxRetries) throw error
                lastError = error as Error
            }
        }

        throw lastError || new Error('Unknown error during Wisdom Gate text API call')

    } catch (error) {
        log.error('TEXT', 'Text generation error', error)
        throw error
    }
}

async function generateWisdomImage(parts: any[], model: string, aspectRatio?: string): Promise<string> {
    try {
        const wisdomApiKey = await resolveWisdomApiKey()
        if (!wisdomApiKey) throw new Error('Wisdom API key no configurada en /admin.')
        log.info('IMAGE', `Generating with model: ${model}`)
        log.debug('IMAGE', `Payload parts: ${parts.length}`)

        // UNIFIED LOGIC: ALWAYS Use Wisdom/Google Native Endpoint for ALL models
        // This ensures context images (logos, references) are passed correctly.
        const targetRatio = mapGeminiAspectRatio(model, aspectRatio)
        if (aspectRatio && aspectRatio !== targetRatio) {
            log.warn('IMAGE', `Mapping aspect ratio ${aspectRatio} to ${targetRatio} for model ${model}`)
        }

        // Retry logic with exponential backoff for "System busy" errors
        const maxRetries = 3
        const retryDelays = [1000, 2000, 4000] // 1s, 2s, 4s
        let lastError: Error | null = null

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                log.info('IMAGE', `[${attempt + 1}/${maxRetries + 1}] Attempting Wisdom Gate API call`)

                const response = await fetchWithTimeout(`${WISDOM_BASE_URL}/v1beta/models/${model}:generateContent`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': wisdomApiKey
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: parts
                        }],
                        generationConfig: {
                            responseModalities: ["IMAGE"],
                            imageConfig: {
                                aspectRatio: targetRatio,
                                imageSize: "1K"
                            }
                        }
                    })
                }, IMAGE_PROVIDER_TIMEOUT_MS, `Wisdom native image request (${model})`)

                if (!response.ok) {
                    const errorText = await response.text()
                    let errorMessage = errorText
                    try {
                        const json = JSON.parse(errorText)
                        if (json.error?.message) errorMessage = json.error.message
                    } catch (e) { }

                    // Check if it's a "System busy" error that we should retry
                    const isSystemBusy = errorMessage.toLowerCase().includes('system busy') ||
                        errorMessage.toLowerCase().includes('please try again')

                    if (isSystemBusy && attempt < maxRetries) {
                        const delay = retryDelays[attempt]
                        log.warn('IMAGE', `[${attempt + 1}/${maxRetries + 1}] Wisdom Gate busy, retrying in ${delay}ms`)
                        lastError = new Error(errorMessage)
                        await new Promise(resolve => setTimeout(resolve, delay))
                        continue // Retry
                    }

                    // Non-retryable error or max retries reached
                    log.error('IMAGE', 'Image API failed', errorMessage)
                    throw new Error(errorMessage)
                }

                // Success - return the response data
                log.success('IMAGE', `[${attempt + 1}/${maxRetries + 1}] Wisdom Gate API call succeeded`)
                const data = await response.json()

                // Extract image from Google-style response
                const candidate = data.candidates?.[0]
                if (candidate) {
                    for (const part of candidate.content?.parts || []) {
                        if (part.inlineData && part.inlineData.data) {
                            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`
                        }
                    }
                }

                // No image found in response
                throw new Error('No image found in Wisdom response')

            } catch (error) {
                if (attempt === maxRetries) {
                    // All retries exhausted
                    throw error
                }
                // Store error and continue to next retry
                lastError = error as Error
            }
        }

        throw lastError || new Error('Unknown error during Wisdom Gate API call')

    } catch (error) {
        log.error('IMAGE', 'Image generation error', error)
        throw error
    }
}

async function generateNagaText(
    prompt: string,
    model: string,
    systemPrompt?: string,
    images?: string[],
    options?: TextGenerationOptions
): Promise<string> {
    const nagaApiKey = await resolveNagaApiKey(options?.nagaApiKey)
    if (!nagaApiKey) {
        throw new Error('NagaAI API key no configurada. Configúrala en /admin o en NAGA_API_KEY.')
    }

    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [{ type: 'text', text: prompt }]
    if (images && images.length > 0) {
        images.forEach((img) => {
            content.push({ type: 'image_url', image_url: { url: img } })
        })
    }

    const messages: Array<{ role: 'system' | 'user'; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = []
    if (systemPrompt?.trim()) {
        messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: content.length > 1 ? content : prompt })

    const response = await fetch(`${NAGA_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${nagaApiKey}`
        },
        body: JSON.stringify({
            model,
            messages,
            ...(typeof options?.temperature === 'number' ? { temperature: options.temperature } : {}),
            ...(typeof options?.topP === 'number' ? { top_p: options.topP } : {})
        })
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`NagaAI text error: ${errorText}`)
    }

    const data = await response.json()
    const rawContent = data?.choices?.[0]?.message?.content
    if (typeof rawContent === 'string') {
        return rawContent
    }
    if (Array.isArray(rawContent)) {
        return rawContent
            .map((part: { text?: string }) => part?.text || '')
            .join('')
    }

    throw new Error('No text content found in NagaAI response')
}

async function generateGoogleImage(parts: any[], model: string, aspectRatio?: string): Promise<string> {
    try {
        // Keep backward compatibility for legacy admin values.
        const normalizedModel = model === 'gemini-3-pro' ? 'gemini-3-pro-image-preview' : model
        const targetRatio = mapGeminiAspectRatio(normalizedModel, aspectRatio)
        if (aspectRatio && aspectRatio !== targetRatio) {
            log.warn('IMAGE', `Mapping aspect ratio ${aspectRatio} to ${targetRatio} for model ${normalizedModel}`)
        }
        const imageModel = await getGoogleImageGenerativeModel(normalizedModel)

        const response = await imageModel.generateContent({
            contents: [{ role: 'user', parts }],
            generationConfig: {
                responseModalities: ['IMAGE'],
                imageConfig: {
                    aspectRatio: targetRatio,
                    imageSize: '1K'
                }
            }
        } as any)

        const candidate = response?.response?.candidates?.[0]
        if (candidate) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) {
                    return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`
                }
            }
        }

        throw new Error('No image found in Google image response')
    } catch (error) {
        console.error('Google Image Generation Error:', error)
        throw error
    }
}

// Unified Generator Function
export async function generateTextUnified(
    brand: { name: string; brand_dna: BrandDNA },
    prompt: string,
    model: string = 'gemini-3-flash-preview', // Default to native Google
    images?: string[],
    systemPromptOverride?: string, // NEW: Allow specialized tasks to set their own persona
    options?: TextGenerationOptions
): Promise<string> {
    const startedAt = Date.now()
    const callId = nextTextCallId()
    const systemPrompt = typeof systemPromptOverride === 'string' ? systemPromptOverride : buildBrandSystemPrompt(brand)
    const modelName = String(model || '').trim()
    const modelNameLower = modelName.toLowerCase()
    log.info('TEXT', 'Llamada de texto iniciada', {
        call_id: callId,
        modelo_solicitado: modelName || 'NO_CONFIG',
        imagenes_contexto: images?.length || 0,
    })

    if (modelNameLower.startsWith('wisdom/')) {
        const wisdomModel = modelName.replace(/^wisdom\//i, '')
        const result = await generateWisdomText(prompt, wisdomModel, systemPrompt, images, options)
        log.success('TEXT', 'Llamada de texto completada', {
            call_id: callId,
            proveedor: 'Wisdom',
            modelo_efectivo: wisdomModel,
            fallback: false,
            duracion_ms: Date.now() - startedAt,
        })
        return result
    }

    if (modelNameLower.startsWith('naga/')) {
        const nagaModel = modelName.replace(/^naga\//i, '')
        const result = await generateNagaText(prompt, nagaModel, systemPrompt, images, options)
        log.success('TEXT', 'Llamada de texto completada', {
            call_id: callId,
            proveedor: 'Naga',
            modelo_efectivo: nagaModel,
            fallback: false,
            duracion_ms: Date.now() - startedAt,
        })
        return result
    }

    if (modelNameLower.startsWith('replicate/')) {
        const replicateModel = modelName.replace(/^replicate\//i, '')
        const fullPrompt = `${systemPrompt}\n\nSOLICITUD DEL USUARIO:\n${prompt}`
        const result = await generateReplicateText(fullPrompt, replicateModel, undefined, images, options)
        log.success('TEXT', 'Llamada de texto completada', {
            call_id: callId,
            proveedor: 'Replicate',
            modelo_efectivo: replicateModel,
            fallback: false,
            duracion_ms: Date.now() - startedAt,
        })
        return result
    }

    if (modelNameLower.startsWith('google/')) {
        const googleModel = modelName.replace(/^google\//i, '')
        const selectedModel = await getGoogleTextGenerativeModel(googleModel)
        const parts: any[] = [{ text: `${systemPrompt}\n\nSOLICITUD DEL USUARIO:\n${prompt}` }]

        if (images && images.length > 0) {
            for (const img of images) {
                const part = await urlToPart(img)
                if (part) parts.push(part)
            }
        }

        const result = await selectedModel.generateContent({
            contents: [
                {
                    role: 'user',
                    parts
                }
            ],
            generationConfig: {
                responseMimeType: "application/json",
                ...(typeof options?.temperature === 'number' ? { temperature: options.temperature } : {}),
                ...(typeof options?.topP === 'number' ? { topP: options.topP } : {}),
            }
        })
        log.success('TEXT', 'Llamada de texto completada', {
            call_id: callId,
            proveedor: 'Google Oficial',
            modelo_efectivo: googleModel,
            fallback: false,
            duracion_ms: Date.now() - startedAt,
        })
        return result.response.text()
    }

    // Default to Google
    const selectedModel = await getGoogleTextGenerativeModel(modelName)
    const parts: any[] = [{ text: `${systemPrompt}\n\nSOLICITUD DEL USUARIO:\n${prompt}` }]

    if (images && images.length > 0) {
        const imageParts = await Promise.all(images.map((img) => urlToPart(img)))
        imageParts.forEach((part) => {
            if (part) parts.push(part)
        })
    }

    const result = await selectedModel.generateContent({
        contents: [
            {
                role: 'user',
                parts
            }
        ],
        generationConfig: {
            responseMimeType: "application/json",
            ...(typeof options?.temperature === 'number' ? { temperature: options.temperature } : {}),
            ...(typeof options?.topP === 'number' ? { topP: options.topP } : {}),
        }
    })
    log.success('TEXT', 'Llamada de texto completada', {
        call_id: callId,
        proveedor: 'Google Oficial',
        modelo_efectivo: modelName || 'gemini-flash-latest',
        fallback: false,
        ruta: 'default_google',
        duracion_ms: Date.now() - startedAt,
    })
    return result.response.text()
}

// Exposed wrapper for Image Generation
export async function generateContentImageUnified(
    brand: { name: string; brand_dna: BrandDNA },
    prompt: string,
    options: ImageGenerationOptions = {}
): Promise<string> {
    const generationStart = Date.now()
    const rawModelName = options.model || DEFAULT_IMAGE_MODEL
    const modelName = String(rawModelName).trim()
    const modelNameLower = modelName.toLowerCase()
    log.info('IMAGE', `Router | Requested=${modelName || 'NO_CONFIG'}`)

    if (modelNameLower.startsWith('wisdom/')) {
        log.info('IMAGE', `Provider route: wisdom (${modelName})`)
        let wisdomModel = modelName.replace('wisdom/', '')

        // Failsafe: Map known incorrect model names to valid ones
        if (wisdomModel === 'gemini-3.0-pro-image-01-preview') {
            log.warn('IMAGE', 'Correcting invalid model name: gemini-3.0-pro-image-01-preview -> gemini-3-pro-image-preview')
            wisdomModel = 'gemini-3-pro-image-preview'
        }
        const enhancedPrompt = options.promptAlreadyBuilt
            ? prompt
            : buildImagePrompt(brand, prompt, options)

        // Prepare parts similar to generateBrandImage to ensure parity
        const promptParts: any[] = [{ text: enhancedPrompt }]
        const referenceUrls: string[] = []

        // Process Context Images/Logos (Fetch & convert to Base64)
        if (options.context && options.context.length > 0) {
            const imageItems = options.context.filter(
                c => c.type === 'image' || c.type === 'logo' || c.type === 'aux_logo'
            )

            if (imageItems.length > 0) {
                log.info('IMAGE', `Context images: ${imageItems.length}`)
                const imagePartsPromises = imageItems.map(async (item) => {
                    if (!item.value) return null
                    referenceUrls.push(item.value)
                    // Use existing urlToPart helper
                    return await urlToPart(item.value)
                })

                const imageParts = await Promise.all(imagePartsPromises)
                imageParts.forEach(part => {
                    if (part) promptParts.push(part)
                })
            }
        }

        // Process Layout Reference
        if (options.layoutReference) {
            // Handle relative paths for local templates
            let layoutUrl = options.layoutReference
            if (layoutUrl.startsWith('/')) {
                const baseUrl = typeof window !== 'undefined'
                    ? window.location.origin
                    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
                layoutUrl = `${baseUrl}${layoutUrl}`
            }

            const layoutPart = await urlToPart(layoutUrl)
            if (layoutPart) {
                log.info('IMAGE', 'Layout reference added')
                promptParts.push(layoutPart)
                referenceUrls.push(layoutUrl)
            }
        }

        if (wisdomModel === 'gemini-3-pro-image-preview' || wisdomModel.includes('gemini')) {
            const result = await generateWisdomImage(promptParts, wisdomModel, options.aspectRatio)
            log.success('IMAGE', `Generation done in ${Date.now() - generationStart}ms`)
            return result
        } else {
            const result = await generateWisdomOpenAIImage(enhancedPrompt, wisdomModel, options.aspectRatio, referenceUrls)
            log.success('IMAGE', `Generation done in ${Date.now() - generationStart}ms`)
            return result
        }
    }

    if (modelNameLower.startsWith('naga/')) {
        log.info('IMAGE', `Provider route: naga (${modelName})`)
        const nagaModel = modelName.replace('naga/', '')
        const enhancedPrompt = options.promptAlreadyBuilt
            ? prompt
            : buildImagePrompt(brand, prompt, options)
        const result = await generateNagaImage(enhancedPrompt, nagaModel, options.aspectRatio, options.nagaApiKey)
        log.success('IMAGE', `Generation done in ${Date.now() - generationStart}ms`)
        return result
    }

    if (modelNameLower.startsWith('replicate/')) {
        log.info('IMAGE', `Provider route: replicate (${modelName})`)
        const replicateModel = modelName.replace(/^replicate\//i, '')
        const enhancedPrompt = options.promptAlreadyBuilt
            ? prompt
            : buildImagePrompt(brand, prompt, options)
        const result = await generateReplicateImage(enhancedPrompt, replicateModel, options)
        log.success('IMAGE', `Generation done in ${Date.now() - generationStart}ms`)
        return result
    }

    if (modelNameLower.startsWith('atlas/')) {
        log.info('IMAGE', `Provider route: atlas (${modelName})`)
        const atlasModel = modelName.replace(/^atlas\//i, '')
        const enhancedPrompt = options.promptAlreadyBuilt
            ? prompt
            : buildImagePrompt(brand, prompt, options)
        const result = await generateAtlasImage(enhancedPrompt, atlasModel, options)
        log.success('IMAGE', `Generation done in ${Date.now() - generationStart}ms`)
        return result
    }

    if (modelNameLower.startsWith('openai/')) {
        log.info('IMAGE', `Provider route: openai (${modelName})`)
        const openaiModel = modelName.replace(/^openai\//i, '')
        const enhancedPrompt = options.promptAlreadyBuilt
            ? prompt
            : buildImagePrompt(brand, prompt, options)
        const referenceUrls = (options.context || [])
            .filter((item) => item.type === 'image' || item.type === 'logo' || item.type === 'aux_logo')
            .map((item) => item.value)
            .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)

        if (options.layoutReference) {
            let layoutUrl = options.layoutReference
            if (layoutUrl.startsWith('/')) {
                const baseUrl = typeof window !== 'undefined'
                    ? window.location.origin
                    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
                layoutUrl = `${baseUrl}${layoutUrl}`
            }
            referenceUrls.push(layoutUrl)
        }

        const result = await generateOpenAIImage(enhancedPrompt, openaiModel, options.aspectRatio, referenceUrls)
        log.success('IMAGE', `Generation done in ${Date.now() - generationStart}ms`)
        return result
    }

    if (modelNameLower.startsWith('google/')) {
        log.info('IMAGE', `Provider route: google (${modelName})`)
        const googleModelRaw = modelName.replace('google/', '')
        const enhancedPrompt = options.promptAlreadyBuilt
            ? prompt
            : buildImagePrompt(brand, prompt, options)
        const promptParts: any[] = [{ text: enhancedPrompt }]

        if (options.context && options.context.length > 0) {
            const imageItems = options.context.filter(
                c => c.type === 'image' || c.type === 'logo' || c.type === 'aux_logo'
            )
            if (imageItems.length > 0) {
                const imagePartsPromises = imageItems.map(async (item) => {
                    if (!item.value) return null
                    return await urlToPart(item.value)
                })
                const imageParts = await Promise.all(imagePartsPromises)
                imageParts.forEach(part => {
                    if (part) promptParts.push(part)
                })
            }
        }

        if (options.layoutReference) {
            let layoutUrl = options.layoutReference
            if (layoutUrl.startsWith('/')) {
                const baseUrl = typeof window !== 'undefined'
                    ? window.location.origin
                    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
                layoutUrl = `${baseUrl}${layoutUrl}`
            }
            const layoutPart = await urlToPart(layoutUrl)
            if (layoutPart) promptParts.push(layoutPart)
        }

        const result = await generateGoogleImage(promptParts, googleModelRaw, options.aspectRatio)
        log.success('IMAGE', `Generation done in ${Date.now() - generationStart}ms`)
        return result
    }

    throw new Error(`Image model provider no soportado o inválido: "${modelName}"`)
}

// Raw prompt image generation without brand prompt injection
export async function generateImageFromPromptRaw(
    prompt: string,
    model: string,
    aspectRatio?: string
): Promise<string> {
    if (!model) {
        throw new Error('Missing image model')
    }

    const modelName = model.trim()
    const modelNameLower = modelName.toLowerCase()

    if (modelNameLower.startsWith('naga/')) {
        return await generateNagaImage(prompt, modelName.replace(/^naga\//i, ''), aspectRatio)
    }

    if (modelNameLower.startsWith('replicate/')) {
        return await generateReplicateImage(prompt, modelName.replace(/^replicate\//i, ''), { aspectRatio })
    }

    if (modelNameLower.startsWith('atlas/')) {
        return await generateAtlasImage(prompt, modelName.replace(/^atlas\//i, ''), { aspectRatio })
    }

    if (modelNameLower.startsWith('openai/')) {
        return await generateOpenAIImage(prompt, modelName.replace(/^openai\//i, ''), aspectRatio)
    }

    if (modelNameLower.startsWith('google/')) {
        return await generateGoogleImage([{ text: prompt }], modelName.replace(/^google\//i, ''), aspectRatio)
    }

    const normalized = modelNameLower.startsWith('wisdom/') ? modelName.replace(/^wisdom\//i, '') : modelName
    if (!normalized.toLowerCase().includes('gemini')) {
        return await generateWisdomOpenAIImage(prompt, normalized, aspectRatio)
    }

    const parts: any[] = [{ text: prompt }]
    return await generateWisdomImage(parts, normalized, aspectRatio)
}

// =============================================================================
// VIDEO GENERATION (Veo 3.1 via Wisdom Gate)
// =============================================================================

export interface VideoGenerationOptions {
    prompt: string
    negativePrompt?: string
    startFrame?: string // Base64 or URL
    endFrame?: string   // Base64 or URL
    aspectRatio?: '16:9' | '9:16'
    resolution?: '720p' | '1080p'
    durationSeconds?: 4 | 6 | 8
    personGeneration?: 'allow_all' | 'allow_adult' | 'dont_allow'
}

export interface VideoGenerationResult {
    videoUrl: string
    operationName?: string
}

/**
 * Generate video using Veo 3.1 via Wisdom Gate
 * Supports text-to-video and image-to-video (start/end frames)
 */
export async function generateVideoUnified(
    options: VideoGenerationOptions
): Promise<VideoGenerationResult> {
    const wisdomApiKey = await resolveWisdomApiKey()
    if (!wisdomApiKey) throw new Error('Wisdom API key no configurada en /admin.')
    const model = 'veo-3.1'

    console.log('\n--- 🎬 GENERATING VIDEO WITH VEO 3.1 ---')
    console.log('Prompt:', options.prompt.substring(0, 100) + '...')
    console.log('Aspect Ratio:', options.aspectRatio || '16:9')
    console.log('Resolution:', options.resolution || '720p')
    console.log('Duration:', options.durationSeconds || 4, 'seconds')

    // Build request payload
    const instances: any = [{
        prompt: options.prompt
    }]

    // Add negative prompt if provided
    if (options.negativePrompt) {
        instances[0].negativePrompt = options.negativePrompt
    }

    // Add start frame (first frame) if provided
    if (options.startFrame) {
        const startPart = await urlToPart(options.startFrame)
        if (startPart) {
            instances[0].image = {
                inlineData: startPart.inlineData
            }
        }
    }

    // Add end frame (last frame) if provided
    if (options.endFrame) {
        const endPart = await urlToPart(options.endFrame)
        if (endPart) {
            instances[0].lastFrame = {
                image: {
                    inlineData: endPart.inlineData
                }
            }
        }
    }

    // Build parameters
    const parameters: any = {
        aspectRatio: options.aspectRatio || '16:9',
        resolution: options.resolution || '720p',
        durationSeconds: String(options.durationSeconds || 4),
    }

    if (options.personGeneration) {
        parameters.personGeneration = options.personGeneration
    }

    const requestBody = {
        instances,
        parameters
    }

    try {
        // Start the video generation (async operation)
        console.log('🚀 Starting video generation...')
        const startResponse = await fetch(`${WISDOM_BASE_URL}/v1beta/models/${model}:predictLongRunning`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': wisdomApiKey
            },
            body: JSON.stringify(requestBody)
        })

        if (!startResponse.ok) {
            const errorText = await startResponse.text()
            console.error('Video generation start failed:', errorText)
            throw new Error(`Video generation failed: ${errorText}`)
        }

        const startData = await startResponse.json()
        const operationName = startData.name

        if (!operationName) {
            throw new Error('No operation name returned from video generation')
        }

        console.log('⏳ Operation started:', operationName)

        // Poll for completion
        const maxPolls = 60 // 10 minutes max (10s * 60)
        let pollCount = 0

        while (pollCount < maxPolls) {
            await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds
            pollCount++

            console.log(`📊 Polling status (${pollCount}/${maxPolls})...`)

            const statusResponse = await fetch(`${WISDOM_BASE_URL}/v1beta/${operationName}`, {
                method: 'GET',
                headers: {
                    'x-goog-api-key': wisdomApiKey
                }
            })

            if (!statusResponse.ok) {
                console.warn('Status check failed, retrying...')
                continue
            }

            const statusData = await statusResponse.json()

            if (statusData.done) {
                console.log('✅ Video generation complete!')

                // Extract video URL from response
                const videoUri = statusData.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
                    || statusData.response?.generatedVideos?.[0]?.video?.uri

                if (!videoUri) {
                    console.error('Response structure:', JSON.stringify(statusData, null, 2))
                    throw new Error('No video URI in completed response')
                }

                return {
                    videoUrl: videoUri,
                    operationName
                }
            }

            // Check for error
            if (statusData.error) {
                throw new Error(`Video generation error: ${statusData.error.message || JSON.stringify(statusData.error)}`)
            }
        }

        throw new Error('Video generation timed out after 10 minutes')

    } catch (error) {
        console.error('Video Generation Error:', error)
        throw error
    }
}

/**
 * Check the status of a video generation operation
 */
export async function checkVideoOperationStatus(operationName: string): Promise<{
    done: boolean
    videoUrl?: string
    error?: string
    progress?: number
}> {
    try {
        const wisdomApiKey = await resolveWisdomApiKey()
        if (!wisdomApiKey) return { done: false, error: 'Wisdom API key no configurada en /admin.' }
        const response = await fetch(`${WISDOM_BASE_URL}/v1beta/${operationName}`, {
            method: 'GET',
            headers: {
                'x-goog-api-key': wisdomApiKey
            }
        })

        if (!response.ok) {
            const errorText = await response.text()
            return { done: false, error: errorText }
        }

        const data = await response.json()

        if (data.done) {
            const videoUri = data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
                || data.response?.generatedVideos?.[0]?.video?.uri

            return {
                done: true,
                videoUrl: videoUri
            }
        }

        if (data.error) {
            return {
                done: true,
                error: data.error.message || 'Unknown error'
            }
        }

        // Still processing
        return {
            done: false,
            progress: data.metadata?.progress || undefined
        }

    } catch (error) {
        return {
            done: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

