export type ContentAssetStatus = 'draft' | 'selected' | 'ready' | 'scheduled' | 'published_manual' | 'discarded'
export type ContentAssetModule = 'image' | 'carousel'

export interface ContentLibrarySlide {
    index: number
    title?: string
    description?: string
    preview_url?: string
    original_url?: string
}

export interface ContentLibraryAsset {
    asset_key: string
    type: ContentAssetModule
    module: ContentAssetModule
    user_id: string
    session_id: string
    session_title: string
    brand_id?: string
    created_at: string
    updated_at: string
    preview_url?: string
    original_url?: string
    copy?: string
    prompt?: string
    platform?: string
    format?: string
    status: ContentAssetStatus
    planned_at?: string
    campaign?: string
    notes?: string
    slide_count?: number
    slides?: ContentLibrarySlide[]
}

// Sentinel para filtrar activos sin campaña asignada.
export const CAMPAIGN_NONE = '__none__'

export type LibraryView = 'grid' | 'campaigns' | 'calendar'

export interface ContentCampaign {
    id: string
    name: string
    color?: string
}

export interface ContentLibraryFilters {
    module: 'all' | ContentAssetModule
    status: 'all' | ContentAssetStatus
    platform: 'all' | string
    campaign: 'all' | typeof CAMPAIGN_NONE | string
    planning: 'all' | 'planned' | 'unplanned'
    query: string
}
