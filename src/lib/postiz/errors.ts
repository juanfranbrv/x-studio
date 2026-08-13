/** Errores del cliente de Postiz, distinguibles para que la interfaz sepa que decir. */

export class PostizAuthError extends Error {
    constructor() {
        super('Postiz rechazo la clave de API.')
        this.name = 'PostizAuthError'
    }
}

export class PostizUnreachableError extends Error {
    constructor(cause?: unknown) {
        super('No se pudo contactar con Postiz.')
        this.name = 'PostizUnreachableError'
        this.cause = cause
    }
}

export class PostizRateLimitError extends Error {
    constructor() {
        super('Postiz esta limitando las peticiones. Prueba en unos minutos.')
        this.name = 'PostizRateLimitError'
    }
}

export class PostizResponseError extends Error {
    readonly status: number
    constructor(status: number, detail?: string) {
        super(detail ? `Postiz respondio ${status}: ${detail}` : `Postiz respondio ${status}.`)
        this.name = 'PostizResponseError'
        this.status = status
    }
}
