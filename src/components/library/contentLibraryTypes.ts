export type ContentAssetStatus = 'draft' | 'selected' | 'ready' | 'published_manual' | 'discarded'
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
    notes?: string
    slide_count?: number
    slides?: ContentLibrarySlide[]
}

export interface ContentLibraryFilters {
    module: 'all' | ContentAssetModule
    status: 'all' | ContentAssetStatus
    platform: 'all' | string
    planning: 'all' | 'planned' | 'unplanned'
    query: string
}
