/** Tipos del contrato de la API publica v1 de Postiz. */

export type PostizCredentials = {
    /** Origen de la instancia, sin barra final. Ej.: https://postiz.postlaboratory.com */
    baseUrl: string
    /** Clave de organizacion. Viaja en la cabecera Authorization EN CRUDO, sin 'Bearer'. */
    apiKey: string
}

export type PostizIntegration = {
    id: string
    name: string
    /** Plataforma: 'instagram', 'facebook', ... Debe coincidir con settings.__type */
    identifier: string
    picture?: string
    disabled?: boolean
}

export type PostizMedia = {
    id: string
    path: string
}

export type ScheduleTarget = {
    integrationId: string
    identifier: string
}

export type CreatePostInput = {
    /** ISO con desplazamiento explicito. Ej.: 2026-08-21T09:30:00+02:00 */
    date: string
    content: string
    media: PostizMedia
    targets: ScheduleTarget[]
}
