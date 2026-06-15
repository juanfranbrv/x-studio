import { describe, expect, it } from 'vitest'

import { filterContentLibraryAssets } from '../contentLibraryFilters'
import { CAMPAIGN_NONE, type ContentLibraryAsset, type ContentLibraryFilters } from '../contentLibraryTypes'

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

const baseFilters: ContentLibraryFilters = {
    module: 'all',
    status: 'all',
    platform: 'all',
    campaign: 'all',
    planning: 'all',
    query: '',
}

describe('filterContentLibraryAssets', () => {
    it('filtra por modulo, estado, plataforma y planificacion', () => {
        const assets: ContentLibraryAsset[] = [
            { ...baseAsset, asset_key: 'image-1', module: 'image', type: 'image', platform: 'instagram', status: 'ready', planned_at: '2026-06-20' },
            { ...baseAsset, asset_key: 'carousel-1', module: 'carousel', type: 'carousel', platform: 'linkedin', status: 'draft' },
            { ...baseAsset, asset_key: 'image-2', module: 'image', type: 'image', platform: 'instagram', status: 'draft' },
        ]

        expect(filterContentLibraryAssets(assets, {
            ...baseFilters,
            module: 'image',
            status: 'ready',
            platform: 'instagram',
            planning: 'planned',
        })).toEqual([assets[0]])
    })

    it('busca por titulo de sesion y copy sin distinguir mayusculas', () => {
        const assets: ContentLibraryAsset[] = [
            { ...baseAsset, asset_key: 'a', session_title: 'Campaña Black Friday', copy: 'Texto comercial' },
            { ...baseAsset, asset_key: 'b', session_title: 'Oferta marzo', copy: 'Copy sobre fidelización' },
        ]

        expect(filterContentLibraryAssets(assets, {
            ...baseFilters,
            query: 'fidelizacion',
        })).toEqual([assets[1]])
    })

    it('filtra por una campaña concreta', () => {
        const assets: ContentLibraryAsset[] = [
            { ...baseAsset, asset_key: 'a', campaign: 'Verano 2026' },
            { ...baseAsset, asset_key: 'b', campaign: 'Black Friday' },
            { ...baseAsset, asset_key: 'c' },
        ]

        expect(filterContentLibraryAssets(assets, { ...baseFilters, campaign: 'Verano 2026' }))
            .toEqual([assets[0]])
    })

    it('filtra los activos sin campaña con el sentinel CAMPAIGN_NONE', () => {
        const assets: ContentLibraryAsset[] = [
            { ...baseAsset, asset_key: 'a', campaign: 'Verano 2026' },
            { ...baseAsset, asset_key: 'b' },
        ]

        expect(filterContentLibraryAssets(assets, { ...baseFilters, campaign: CAMPAIGN_NONE }))
            .toEqual([assets[1]])
    })

    it('busca tambien por nombre de campaña', () => {
        const assets: ContentLibraryAsset[] = [
            { ...baseAsset, asset_key: 'a', campaign: 'Lanzamiento otoño' },
            { ...baseAsset, asset_key: 'b', campaign: 'Black Friday' },
        ]

        expect(filterContentLibraryAssets(assets, { ...baseFilters, query: 'black friday' }))
            .toEqual([assets[1]])
    })
})
