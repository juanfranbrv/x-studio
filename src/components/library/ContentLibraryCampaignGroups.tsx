'use client'

import { useMemo } from 'react'
import { ContentLibraryGrid } from './ContentLibraryGrid'
import type { ContentAssetStatus, ContentCampaign, ContentLibraryAsset } from './contentLibraryTypes'

interface GridLabels {
    image: string
    carousel: string
    noCopy: string
    emptyTitle: string
    emptyDescription: string
    slides: (count: number) => string
    plannedFor: (date: string) => string
    statuses: Record<ContentAssetStatus, string>
}

interface ContentLibraryCampaignGroupsProps {
    assets: ContentLibraryAsset[]
    campaigns: ContentCampaign[]
    selectedAssetKey?: string
    selectedAssetKeys: Set<string>
    onSelectAsset: (asset: ContentLibraryAsset) => void
    onToggleAssetSelection: (asset: ContentLibraryAsset) => void
    gridLabels: GridLabels
    labels: {
        noCampaign: string
        count: (count: number) => string
        empty: string
    }
}

export function ContentLibraryCampaignGroups({
    assets,
    campaigns,
    selectedAssetKey,
    selectedAssetKeys,
    onSelectAsset,
    onToggleAssetSelection,
    gridLabels,
    labels,
}: ContentLibraryCampaignGroupsProps) {
    const groups = useMemo(() => {
        const byName = new Map<string, ContentLibraryAsset[]>()
        for (const asset of assets) {
            const key = asset.campaign || ''
            const list = byName.get(key) || []
            list.push(asset)
            byName.set(key, list)
        }

        const names = new Set<string>()
        campaigns.forEach((campaign) => names.add(campaign.name))
        assets.forEach((asset) => { if (asset.campaign) names.add(asset.campaign) })

        const named = [...names]
            .filter((name) => (byName.get(name)?.length || 0) > 0)
            .sort((a, b) => a.localeCompare(b))
            .map((name) => ({ key: name, name, items: byName.get(name) as ContentLibraryAsset[] }))

        const none = byName.get('') || []
        return none.length > 0
            ? [...named, { key: '__none__', name: labels.noCampaign, items: none }]
            : named
    }, [assets, campaigns, labels.noCampaign])

    if (groups.length === 0) {
        return (
            <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-[1.4rem] border border-dashed border-border/70 bg-background/72 p-8 text-center">
                <p className="max-w-md text-sm leading-6 text-muted-foreground">{labels.empty}</p>
            </div>
        )
    }

    return (
        <div className="space-y-7">
            {groups.map((group) => (
                <section key={group.key}>
                    <div className="mb-3 flex items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground">{group.name}</h3>
                        <span className="rounded-full bg-[hsl(var(--surface-alt))] px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {labels.count(group.items.length)}
                        </span>
                    </div>
                    <ContentLibraryGrid
                        assets={group.items}
                        selectedAssetKey={selectedAssetKey}
                        selectedAssetKeys={selectedAssetKeys}
                        compact
                        onSelectAsset={onSelectAsset}
                        onToggleAssetSelection={onToggleAssetSelection}
                        labels={gridLabels}
                    />
                </section>
            ))}
        </div>
    )
}
