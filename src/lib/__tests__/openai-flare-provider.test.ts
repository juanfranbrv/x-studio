import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrandDNA } from '../brand-types'
import { DEFAULT_IMAGE_GENERATION_MODEL } from '../ai-model-defaults'
import { generateContentImageUnified, generateImageFromPromptRaw } from '../gemini'

vi.mock('convex/browser', () => ({
    ConvexHttpClient: class {
        async query() { return 'test-openai-key' }
    },
}))

const fetchMock = vi.fn()
const sampleBase64 = 'a'.repeat(260)
const reference = 'data:image/png;base64,aW1hZ2U='

beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_CONVEX_URL', 'https://example.convex.cloud')
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ data: [{ b64_json: sampleBase64 }] })))
})

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.clearAllMocks()
})

describe('GPT Image 2.5 Flare: peticiones al proveedor', () => {
    it('genera sin referencias con el ID oficial, Low y las dimensiones sociales', async () => {
        const result = await generateImageFromPromptRaw('Un cartel', DEFAULT_IMAGE_GENERATION_MODEL, '4:5')
        const [url, request] = fetchMock.mock.calls[0]

        expect(url).toBe('https://api.openai.com/v1/images/generations')
        expect(JSON.parse(request.body)).toEqual({
            model: 'gpt-image-2.5-flare', prompt: 'Un cartel', quality: 'low', size: '1024x1280',
        })
        expect(result).toBe(`data:image/png;base64,${sampleBase64}`)
    })

    it('conserva referencias, logos y plantilla en edits con calidad Medium', async () => {
        await generateContentImageUnified({ name: 'Marca', brand_dna: {} as BrandDNA }, 'Un cartel', {
            model: 'openai/gpt-image-2.5-flare-medium',
            promptAlreadyBuilt: true,
            aspectRatio: '9:16',
            context: ['image', 'logo', 'aux_logo'].map(type => ({ type, value: reference })),
            layoutReference: reference,
        })
        const [url, request] = fetchMock.mock.calls[0]
        const body = request.body as FormData

        expect(url).toBe('https://api.openai.com/v1/images/edits')
        expect(body.get('model')).toBe('gpt-image-2.5-flare')
        expect(body.get('quality')).toBe('medium')
        expect(body.get('size')).toBe('1024x1792')
        expect(body.getAll('image[]')).toHaveLength(4)
    })
})
