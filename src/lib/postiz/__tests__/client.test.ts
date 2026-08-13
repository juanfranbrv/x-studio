import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPost, listIntegrations, uploadFromUrl } from '../client'
import { PostizAuthError, PostizRateLimitError, PostizUnreachableError } from '../errors'

const credenciales = { baseUrl: 'https://postiz.ejemplo.com', apiKey: 'clave-secreta' }

const respuesta = (body: unknown, status = 200) =>
    Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
    } as Response)

describe('cliente de Postiz', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it('manda la clave en crudo, sin Bearer', async () => {
        const fetchMock = vi.fn().mockReturnValue(respuesta([]))
        vi.stubGlobal('fetch', fetchMock)

        await listIntegrations(credenciales)

        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe('https://postiz.ejemplo.com/api/public/v1/integrations')
        expect((init.headers as Record<string, string>).Authorization).toBe('clave-secreta')
    })

    it('traduce un 401 a PostizAuthError', async () => {
        vi.stubGlobal('fetch', vi.fn().mockReturnValue(respuesta({ msg: 'No API Key found' }, 401)))
        await expect(listIntegrations(credenciales)).rejects.toBeInstanceOf(PostizAuthError)
    })

    it('traduce un 429 a PostizRateLimitError', async () => {
        vi.stubGlobal('fetch', vi.fn().mockReturnValue(respuesta({}, 429)))
        await expect(listIntegrations(credenciales)).rejects.toBeInstanceOf(PostizRateLimitError)
    })

    it('traduce un fallo de red a PostizUnreachableError', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
        await expect(listIntegrations(credenciales)).rejects.toBeInstanceOf(PostizUnreachableError)
    })

    it('sube la imagen pasando la URL', async () => {
        const fetchMock = vi.fn().mockReturnValue(respuesta({ id: 'm1', path: 'https://cdn/x.png' }))
        vi.stubGlobal('fetch', fetchMock)

        const media = await uploadFromUrl(credenciales, 'https://convex/imagen.png')

        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe('https://postiz.ejemplo.com/api/public/v1/upload-from-url')
        expect(JSON.parse(init.body as string)).toEqual({ url: 'https://convex/imagen.png' })
        expect(media).toEqual({ id: 'm1', path: 'https://cdn/x.png' })
    })

    it('construye el cuerpo de creacion con la forma que exige Postiz', async () => {
        const fetchMock = vi.fn().mockReturnValue(respuesta([{ group: 'g-123' }]))
        vi.stubGlobal('fetch', fetchMock)

        await createPost(credenciales, {
            date: '2026-08-21T09:30:00+02:00',
            content: 'Hola',
            media: { id: 'm1', path: 'https://cdn/x.png' },
            targets: [
                { integrationId: 'i-ig', identifier: 'instagram' },
                { integrationId: 'i-fb', identifier: 'facebook' },
            ],
        })

        const cuerpo = JSON.parse(fetchMock.mock.calls[0][1].body as string)
        expect(cuerpo.type).toBe('schedule')
        expect(cuerpo.shortLink).toBe(false)
        expect(cuerpo.date).toBe('2026-08-21T09:30:00+02:00')
        expect(cuerpo.tags).toEqual([])
        expect(cuerpo.posts).toHaveLength(2)
        expect(cuerpo.posts[0].integration).toEqual({ id: 'i-ig' })
        expect(cuerpo.posts[0].value[0].content).toBe('Hola')
        expect(cuerpo.posts[0].value[0].image).toEqual([{ id: 'm1', path: 'https://cdn/x.png' }])
        // El discriminador debe coincidir con la plataforma, y Facebook TAMBIEN lleva post_type
        expect(cuerpo.posts[0].settings).toEqual({ __type: 'instagram', post_type: 'post' })
        expect(cuerpo.posts[1].settings).toEqual({ __type: 'facebook', post_type: 'post' })
    })

    it('quita la barra final del origen para no generar rutas dobles', async () => {
        const fetchMock = vi.fn().mockReturnValue(respuesta([]))
        vi.stubGlobal('fetch', fetchMock)

        await listIntegrations({ baseUrl: 'https://postiz.ejemplo.com/', apiKey: 'k' })

        expect(fetchMock.mock.calls[0][0]).toBe('https://postiz.ejemplo.com/api/public/v1/integrations')
    })
})
