import { describe, expect, it } from 'vitest'

import { filterContentLibraryAssets } from '../contentLibraryFilters'
import type { ContentLibraryAsset } from '../contentLibraryTypes'

const baseAsset: ContentLibraryAsset = {
    asset_key: 'asset-1',
    type: 'image',
    module: 'image',
    user_id: 'user-1',
    session_id: 'session-1',
    session_title: 'Oferta verano',
    created_at: '2026-06-10T10:00:00.000Z',
    updated_at: '2026-06-10T10:00:00.000Z',
    preview_url: 'https://cdn.test/image.webp',
    copy: 'Copy para Instagram',
    status: 'draft',
}

describe('filterContentLibraryAssets', () => {
    it('filtra por modulo, estado, plataforma y planificacion', () => {
        const assets: ContentLibraryAsset[] = [
            { ...baseAsset, asset_key: 'image-1', module: 'image', type: 'image', platform: 'instagram', status: 'ready', planned_at: '2026-06-20' },
            { ...baseAsset, asset_key: 'carousel-1', module: 'carousel', type: 'carousel', platform: 'linkedin', status: 'draft' },
            { ...baseAsset, asset_key: 'image-2', module: 'image', type: 'image', platform: 'instagram', status: 'draft' },
        ]

        expect(filterContentLibraryAssets(assets, {
            module: 'image',
            status: 'ready',
            platform: 'instagram',
            planning: 'planned',
            query: '',
        })).toEqual([assets[0]])
    })

    it('busca por titulo de sesion y copy sin distinguir mayusculas', () => {
        const assets: ContentLibraryAsset[] = [
            { ...baseAsset, asset_key: 'a', session_title: 'Campaña Black Friday', copy: 'Texto comercial' },
            { ...baseAsset, asset_key: 'b', session_title: 'Oferta marzo', copy: 'Copy sobre fidelización' },
        ]

        expect(filterContentLibraryAssets(assets, {
            module: 'all',
            status: 'all',
            platform: 'all',
            planning: 'all',
            query: 'fidelizacion',
        })).toEqual([assets[1]])
    })
})
