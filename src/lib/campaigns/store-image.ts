import { api } from '@/../convex/_generated/api'
import { authedFetchQuery, authedFetchMutation } from '@/lib/convex-server'

/**
 * Persiste la imagen generada en Convex Storage y devuelve su URL definitiva.
 *
 * El generador devuelve la imagen como data URL en base64 (~1,5-2 MB). Guardar
 * eso en un campo de documento no es viable: Convex rechaza cualquier valor de
 * mas de 1 MiB. Ademas, una data URL de ese tamano viajando en cada consulta
 * del lote seria un desperdicio. Se sube al almacenamiento y se guarda la URL.
 */

type ParsedDataUrl = { mimeType: string; bytes: ArrayBuffer }

function parseDataUrl(value: string): ParsedDataUrl | null {
    const match = value.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return null

    const buffer = Buffer.from(match[2] || '', 'base64')
    // Se copia a un ArrayBuffer propio: el de Buffer puede ser un pool
    // compartido y arrastraria bytes de otras lecturas.
    const bytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer

    return {
        mimeType: match[1] || 'image/png',
        bytes,
    }
}

/**
 * Devuelve una URL servible para la imagen. Si ya era una URL remota se
 * respeta tal cual; si es una data URL, se sube y se devuelve la de Storage.
 */
export async function persistGeneratedImage(imageUrl: string): Promise<string> {
    const value = (imageUrl || '').trim()
    if (!value) throw new Error('El generador no devolvio ninguna imagen.')

    if (!value.startsWith('data:')) return value

    const parsed = parseDataUrl(value)
    if (!parsed) throw new Error('La imagen generada no tiene un formato de data URL reconocible.')

    const uploadUrl = await authedFetchMutation(api.assets.generateUploadUrl, {})

    const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': parsed.mimeType },
        body: new Blob([parsed.bytes], { type: parsed.mimeType }),
    })

    if (!response.ok) {
        throw new Error(`No se pudo subir la imagen generada (${response.status}).`)
    }

    const { storageId } = await response.json()
    const finalUrl = await authedFetchQuery(api.assets.getImageUrl, { storageId })

    if (!finalUrl) throw new Error('No se pudo resolver la URL de la imagen subida.')

    return finalUrl
}
