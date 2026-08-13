import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPost, listIntegrations, uploadFromUrl } from '../client'
import {
    PostizAuthError,
    PostizRateLimitError,
    PostizResponseError,
    PostizShapeError,
    PostizUnreachableError,
} from '../errors'

const credenciales = { baseUrl: 'https://postiz.ejemplo.com', apiKey: 'clave-secreta' }

const respuesta = (body: unknown, status = 200) =>
    Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
    } as Response)

// Simula un 200 cuyo cuerpo no es JSON valido (texto plano, cuerpo vacio, etc.)
const respuestaJsonInvalido = () =>
    Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
        text: () => Promise.resolve(''),
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

    it('listIntegrations no reenvia campos extra aunque contengan la clave', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockReturnValue(
                respuesta([
                    {
                        id: 'i-ig',
                        name: 'Instagram',
                        identifier: 'instagram',
                        picture: 'https://cdn/foto.png',
                        disabled: false,
                        // Campo que Postiz (o un proxy delante) no deberia mandar nunca,
                        // pero si lo manda no debe sobrevivir al mapeo del cliente.
                        debug_echo: { Authorization: credenciales.apiKey },
                    },
                ]),
            ),
        )

        const integraciones = await listIntegrations(credenciales)

        expect(integraciones).toEqual([
            {
                id: 'i-ig',
                name: 'Instagram',
                identifier: 'instagram',
                picture: 'https://cdn/foto.png',
                disabled: false,
            },
        ])
        expect(JSON.stringify(integraciones)).not.toContain(credenciales.apiKey)
        expect(JSON.stringify(integraciones)).not.toContain('debug_echo')
    })

    it('redacta la clave antes de truncar, aunque el corte caiga a mitad de la clave', async () => {
        // 190 caracteres de relleno + la clave (13) hace que slice(0, 200) se
        // detenga a los 10 caracteres de la clave si la redaccion se aplicara
        // despues de truncar, dejando ese prefijo suelto en el mensaje.
        const relleno = 'x'.repeat(190)
        const cuerpo = relleno + credenciales.apiKey + ' resto que se recorta'
        vi.stubGlobal(
            'fetch',
            vi.fn().mockReturnValue(
                Promise.resolve({
                    ok: false,
                    status: 500,
                    text: () => Promise.resolve(cuerpo),
                } as Response),
            ),
        )

        await expect(listIntegrations(credenciales)).rejects.toBeInstanceOf(PostizResponseError)
        try {
            await listIntegrations(credenciales)
            throw new Error('deberia haber lanzado')
        } catch (error) {
            const mensaje = (error as Error).message
            expect(mensaje).not.toContain(credenciales.apiKey)
            expect(mensaje).not.toContain(credenciales.apiKey.slice(0, 10))
        }
    })

    it('quita la barra final del origen para no generar rutas dobles', async () => {
        const fetchMock = vi.fn().mockReturnValue(respuesta([]))
        vi.stubGlobal('fetch', fetchMock)

        await listIntegrations({ baseUrl: 'https://postiz.ejemplo.com/', apiKey: 'k' })

        expect(fetchMock.mock.calls[0][0]).toBe('https://postiz.ejemplo.com/api/public/v1/integrations')
    })

    it('traduce un 200 con cuerpo no-JSON a PostizShapeError', async () => {
        vi.stubGlobal('fetch', vi.fn().mockReturnValue(respuestaJsonInvalido()))
        await expect(listIntegrations(credenciales)).rejects.toBeInstanceOf(PostizShapeError)
    })

    it('traduce un estado generico no mapeado (500) a PostizResponseError', async () => {
        vi.stubGlobal('fetch', vi.fn().mockReturnValue(respuesta({ msg: 'boom' }, 500)))
        await expect(listIntegrations(credenciales)).rejects.toBeInstanceOf(PostizResponseError)
    })

    it('uploadFromUrl lanza PostizShapeError si el medio no trae id', async () => {
        vi.stubGlobal('fetch', vi.fn().mockReturnValue(respuesta({ path: 'https://cdn/x.png' })))
        await expect(uploadFromUrl(credenciales, 'https://convex/imagen.png')).rejects.toBeInstanceOf(
            PostizShapeError,
        )
    })

    it('uploadFromUrl lanza PostizShapeError si el medio no trae path', async () => {
        vi.stubGlobal('fetch', vi.fn().mockReturnValue(respuesta({ id: 'm1' })))
        await expect(uploadFromUrl(credenciales, 'https://convex/imagen.png')).rejects.toBeInstanceOf(
            PostizShapeError,
        )
    })

    it('createPost lanza PostizShapeError si la respuesta no trae group', async () => {
        vi.stubGlobal('fetch', vi.fn().mockReturnValue(respuesta([{}])))

        await expect(
            createPost(credenciales, {
                date: '2026-08-21T09:30:00+02:00',
                content: 'Hola',
                media: { id: 'm1', path: 'https://cdn/x.png' },
                targets: [{ integrationId: 'i-ig', identifier: 'instagram' }],
            }),
        ).rejects.toBeInstanceOf(PostizShapeError)
    })
})
