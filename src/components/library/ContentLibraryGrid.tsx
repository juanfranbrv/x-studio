'use client'

import type { ContentAssetStatus, ContentLibraryAsset } from './contentLibraryTypes'
import { ContentAssetCard } from './ContentAssetCard'

interface ContentLibraryGridProps {
    assets: ContentLibraryAsset[]
    selectedAssetKey?: string
    selectedAssetKeys: Set<string>
    compact?: boolean
    onSelectAsset: (asset: ContentLibraryAsset) => void
    onToggleAssetSelection: (asset: ContentLibraryAsset) => void
    labels: {
        image: string
        carousel: string
        noCopy: string
        emptyTitle: string
        emptyDescription: string
        slides: (count: number) => string
        plannedFor: (date: string) => string
        statuses: Record<ContentAssetStatus, string>
    }
}

export function ContentLibraryGrid({
    assets,
    selectedAssetKey,
    selectedAssetKeys = new Set(),
    compact = false,
    onSelectAsset,
    onToggleAssetSelection,
    labels,
}: ContentLibraryGridProps) {
    if (assets.length === 0) {
        return (
            <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-[1.4rem] border border-dashed border-border/70 bg-background/72 p-8 text-center">
                <h2 className="text-lg font-semibold text-foreground">{labels.emptyTitle}</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{labels.emptyDescription}</p>
            </div>
        )
    }

    return (
        <div className={
            compact
                ? 'grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8'
                : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
        }>
            {assets.map((asset) => (
                <ContentAssetCard
                    key={asset.asset_key}
                    asset={asset}
                    selected={asset.asset_key === selectedAssetKey}
                    checked={selectedAssetKeys.has(asset.asset_key)}
                    compact={compact}
                    onSelect={onSelectAsset}
                    onToggleSelection={onToggleAssetSelection}
                    labels={labels}
                />
            ))}
        </div>
    )
}
