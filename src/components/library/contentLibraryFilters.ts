import type { ContentLibraryAsset, ContentLibraryFilters } from './contentLibraryTypes'

function normalizeSearch(value: string) {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
}

export function filterContentLibraryAssets(
    assets: ContentLibraryAsset[],
    filters: ContentLibraryFilters
) {
    const query = normalizeSearch(filters.query)

    return assets.filter((asset) => {
        if (filters.module !== 'all' && asset.module !== filters.module) return false
        if (filters.status !== 'all' && asset.status !== filters.status) return false
        if (filters.platform !== 'all' && asset.platform !== filters.platform) return false
        if (filters.planning === 'planned' && !asset.planned_at) return false
        if (filters.planning === 'unplanned' && asset.planned_at) return false

        if (!query) return true
        const haystack = normalizeSearch([
            asset.session_title,
            asset.copy,
            asset.prompt,
            asset.platform,
            asset.format,
            asset.notes,
        ].filter(Boolean).join(' '))

        return haystack.includes(query)
    })
}
