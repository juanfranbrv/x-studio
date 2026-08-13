import {
    PostizAuthError,
    PostizRateLimitError,
    PostizResponseError,
    PostizShapeError,
    PostizUnreachableError,
} from './errors'
import type {
    CreatePostInput,
    PostizCredentials,
    PostizIntegration,
    PostizMedia,
} from './types'

/**
 * Cliente de la API publica v1 de Postiz.
 *
 * Modulo puro a proposito: no importa nada de Next, Convex ni Clerk. Asi se
 * prueba sin levantar nada, y exponerlo manana como ruta /api/v1 es envolverlo.
 */

const ruta = (baseUrl: string, camino: string) =>
    `${baseUrl.replace(/\/+$/, '')}/api/public/v1${camino}`

async function pedir<T>(
    credenciales: PostizCredentials,
    camino: string,
    init?: { method?: string; body?: unknown },
): Promise<T> {
    let respuesta: Response
    try {
        respuesta = await fetch(ruta(credenciales.baseUrl, camino), {
            method: init?.method ?? 'GET',
            headers: {
                // En crudo: Postiz NO espera el prefijo 'Bearer'.
                Authorization: credenciales.apiKey,
                'Content-Type': 'application/json',
            },
            ...(init?.body === undefined ? {} : { body: JSON.stringify(init.body) }),
        })
    } catch (error) {
        // fetch solo rechaza por fallo de red: DNS, conexion rechazada, timeout.
        throw new PostizUnreachableError(error)
    }

    if (respuesta.status === 401 || respuesta.status === 403) throw new PostizAuthError()
    if (respuesta.status === 429) throw new PostizRateLimitError()

    if (!respuesta.ok) {
        let detalle = ''
        try {
            detalle = await respuesta.text()
        } catch {
            // Un cuerpo ilegible no debe tapar el codigo de estado, que ya informa.
        }
        // La clave se redacta ANTES de truncar: si se hiciera despues, un
        // corte a mitad de la clave dejaria su trozo superviviente sin tapar.
        const detalleRedactado = detalle.split(credenciales.apiKey).join('***')
        throw new PostizResponseError(respuesta.status, detalleRedactado.slice(0, 200))
    }

    try {
        return (await respuesta.json()) as T
    } catch {
        // 200 con cuerpo vacio o no-JSON (proxy delante, 204, etc.): no es un fallo HTTP.
        throw new PostizShapeError('Postiz respondio 200 pero el cuerpo no es JSON valido.')
    }
}

export async function listIntegrations(
    credenciales: PostizCredentials,
): Promise<PostizIntegration[]> {
    // pedir() solo castea el JSON, no valida su forma: si Postiz (o un proxy
    // delante) añade un campo extra a un elemento, reenviar el objeto tal
    // cual lo dejaria llegar hasta el navegador. Por eso se mapea explicita-
    // mente al contrato (id, name, identifier, picture, disabled) en vez de
    // hacer spread: cualquier campo que no este en esta lista se descarta.
    const lista = await pedir<PostizIntegration[]>(credenciales, '/integrations')
    if (!Array.isArray(lista)) return []
    return lista.map((item) => {
        const integracion: PostizIntegration = {
            id: item.id,
            name: item.name,
            identifier: item.identifier,
        }
        if (item.picture !== undefined) integracion.picture = item.picture
        if (item.disabled !== undefined) integracion.disabled = item.disabled
        return integracion
    })
}

export async function uploadFromUrl(
    credenciales: PostizCredentials,
    url: string,
): Promise<PostizMedia> {
    const medio = await pedir<PostizMedia>(credenciales, '/upload-from-url', {
        method: 'POST',
        body: { url },
    })
    if (!medio?.id || !medio?.path) {
        throw new PostizShapeError('Postiz respondio 200 pero la subida no devolvio un medio utilizable.')
    }
    return { id: medio.id, path: medio.path }
}

export async function createPost(
    credenciales: PostizCredentials,
    entrada: CreatePostInput,
): Promise<{ groupId: string }> {
    const cuerpo = {
        type: 'schedule' as const,
        // false conserva el texto literal: Postiz no reescribe los enlaces.
        shortLink: false,
        date: entrada.date,
        tags: [],
        posts: entrada.targets.map((destino) => ({
            integration: { id: destino.integrationId },
            value: [
                {
                    content: entrada.content,
                    image: [{ id: entrada.media.id, path: entrada.media.path }],
                },
            ],
            // __type es el discriminador y tiene que coincidir con la plataforma.
            settings: { __type: destino.identifier, post_type: 'post' },
        })),
    }

    const creado = await pedir<Array<{ group?: string }>>(credenciales, '/posts', {
        method: 'POST',
        body: cuerpo,
    })

    const groupId = Array.isArray(creado) ? creado[0]?.group : undefined
    if (!groupId) throw new PostizShapeError('Postiz respondio 200 pero no devolvio identificador de grupo.')
    return { groupId }
}
