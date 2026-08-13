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

/**
 * Cuerpo de la peticion: o JSON, o multipart, o nada.
 *
 * Son excluyentes a proposito. El multipart no puede viajar como `body`
 * normal porque su Content-Type lleva un `boundary` que solo sabe generar
 * el propio `fetch` al recibir un FormData.
 */
type CuerpoPeticion = { json: unknown } | { form: FormData } | undefined

async function pedir<T>(
    credenciales: PostizCredentials,
    camino: string,
    init?: { method?: string; cuerpo?: CuerpoPeticion },
): Promise<T> {
    const cuerpo = init?.cuerpo
    const esJson = cuerpo !== undefined && 'json' in cuerpo
    // Se serializa FUERA del try para que este solo cubra lo que promete el
    // comentario de abajo: los fallos de red de fetch, no los de JSON.stringify.
    const bodyHttp = cuerpo === undefined ? undefined : esJson ? JSON.stringify(cuerpo.json) : cuerpo.form

    let respuesta: Response
    try {
        respuesta = await fetch(ruta(credenciales.baseUrl, camino), {
            method: init?.method ?? 'GET',
            headers: {
                // En crudo: Postiz NO espera el prefijo 'Bearer'.
                Authorization: credenciales.apiKey,
                // Solo cuando hay cuerpo JSON. En un GET sin cuerpo sobra, y
                // en multipart fijarlo a mano ROMPE la peticion: se perderia
                // el 'boundary' que fetch calcula a partir del FormData.
                ...(esJson ? { 'Content-Type': 'application/json' } : {}),
            },
            ...(bodyHttp === undefined ? {} : { body: bodyHttp }),
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

/**
 * Sube la imagen a Postiz como multipart, con el nombre de fichero que le
 * demos nosotros.
 *
 * NO se usa /upload-from-url, que seria mas corto: el `path` que devuelve esa
 * ruta no termina en extension, y despues /posts rechaza el medio con
 * "File must have a valid extension: .png, .jpg, .jpeg, .gif, .webp, or .mp4".
 * Por /upload el nombre lo ponemos nosotros y la extension sobrevive hasta el
 * `path`, que es lo que /posts mira. De paso deja de hacer falta que la imagen
 * este publicada en una URL alcanzable desde el servidor de Postiz.
 */
export async function uploadFile(
    credenciales: PostizCredentials,
    archivo: { blob: Blob; fileName: string },
): Promise<PostizMedia> {
    const form = new FormData()
    form.append('file', archivo.blob, archivo.fileName)

    const medio = await pedir<PostizMedia>(credenciales, '/upload', {
        method: 'POST',
        cuerpo: { form },
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

    const creado = await pedir<Array<{ group?: string; postId?: string }>>(credenciales, '/posts', {
        method: 'POST',
        cuerpo: { json: cuerpo },
    })

    // La forma de la respuesta cambia entre versiones de Postiz: la 2.23.0
    // (la que corre en postiz.postlaboratory.com) devuelve
    // [{ postId, integration }], SIN 'group'; otras si traen 'group'.
    // Exigir 'group' hacia fallar la programacion DESPUES de haber creado el
    // post, que es el peor momento posible. Como este identificador solo se
    // guarda para marcar la pieza como programada y poder localizarla luego,
    // sirve cualquiera de los dos; se prefiere 'group' cuando esta porque
    // agrupa todos los canales de un mismo envio.
    const primero = Array.isArray(creado) ? creado[0] : undefined
    const referencia = primero?.group || primero?.postId
    if (!referencia) {
        throw new PostizShapeError('Postiz respondio 200 pero no devolvio identificador de la publicacion.')
    }
    return { groupId: referencia }
}
