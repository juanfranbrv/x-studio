import { describe, expect, it } from 'vitest'
import { canScheduleAsset, scheduleAssetImageUrl } from '../canScheduleAsset'
import type { ContentLibraryAsset } from '../contentLibraryTypes'

/**
 * La regla vive en un solo sitio porque la consultan la tarjeta y el panel de
 * detalle. Si discreparan, el boton aparecería en uno y no en el otro para la
 * misma pieza.
 */

function asset(overrides: Partial<ContentLibraryAsset> = {}): ContentLibraryAsset {
    return {
        asset_key: 'image:sesion-1:gen-1',
        type: 'image',
        module: 'image',
        user_id: 'clerk-admin',
        session_id: 'sesion-1',
        session_title: 'Arduino curso',
        created_at: '2026-08-14T09:00:00.000Z',
        updated_at: '2026-08-14T09:00:00.000Z',
        original_url: 'https://cdn.convex.dev/api/storage/abc',
        preview_url: 'https://cdn.convex.dev/api/storage/abc-preview',
        status: 'ready',
        ...overrides,
    }
}

describe('canScheduleAsset', () => {
    it('una imagen con URL se puede programar', () => {
        expect(canScheduleAsset(asset())).toBe(true)
    })

    it('un carrusel NO se puede programar todavia', () => {
        // Publicar un carrusel implica subir N diapositivas: queda fuera de esta
        // fase. Si algun dia se soporta, este test debe cambiarse a proposito.
        expect(canScheduleAsset(asset({ type: 'carousel', slide_count: 5 }))).toBe(false)
    })

    it('sin ninguna URL no hay nada que publicar', () => {
        expect(canScheduleAsset(asset({ original_url: undefined, preview_url: undefined }))).toBe(false)
    })

    it('basta con el preview si falta el original', () => {
        expect(canScheduleAsset(asset({ original_url: undefined }))).toBe(true)
    })

    it('una cadena vacia cuenta como ausencia de URL', () => {
        expect(canScheduleAsset(asset({ original_url: '', preview_url: '' }))).toBe(false)
    })
})

describe('scheduleAssetImageUrl', () => {
    it('prefiere el original: el preview puede estar recomprimido y esto se publica en redes', () => {
        expect(scheduleAssetImageUrl(asset())).toBe('https://cdn.convex.dev/api/storage/abc')
    })

    it('cae al preview cuando no hay original', () => {
        expect(scheduleAssetImageUrl(asset({ original_url: undefined }))).toBe(
            'https://cdn.convex.dev/api/storage/abc-preview',
        )
    })

    it('devuelve cadena vacia si no hay ninguna, coherente con canScheduleAsset', () => {
        const sinImagen = asset({ original_url: undefined, preview_url: undefined })
        expect(scheduleAssetImageUrl(sinImagen)).toBe('')
        expect(canScheduleAsset(sinImagen)).toBe(false)
    })
})
