'use client'

import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { CAMPAIGN_NONE, type ContentAssetStatus, type ContentLibraryFilters } from './contentLibraryTypes'

interface ContentAssetFiltersProps {
    filters: ContentLibraryFilters
    platforms: string[]
    campaigns: string[]
    onChange: (filters: ContentLibraryFilters) => void
    labels: {
        search: string
        module: string
        status: string
        platform: string
        campaign: string
        planning: string
        all: string
        allPlatforms: string
        allCampaigns: string
        noCampaign: string
        planned: string
        unplanned: string
        image: string
        carousel: string
        statuses: Record<ContentAssetStatus, string>
    }
}

export function ContentAssetFilters({ filters, platforms, campaigns, onChange, labels }: ContentAssetFiltersProps) {
    const update = (patch: Partial<ContentLibraryFilters>) => onChange({ ...filters, ...patch })

    return (
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1.2fr)_repeat(5,minmax(150px,0.8fr))]">
            <Input
                value={filters.query}
                onChange={(event) => update({ query: event.target.value })}
                placeholder={labels.search}
                aria-label={labels.search}
                className="h-10 rounded-xl"
            />

            <Select value={filters.module} onValueChange={(value) => update({ module: value as ContentLibraryFilters['module'] })}>
                <SelectTrigger className="h-10 w-full rounded-xl">
                    <SelectValue aria-label={labels.module} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{labels.all}</SelectItem>
                    <SelectItem value="image">{labels.image}</SelectItem>
                    <SelectItem value="carousel">{labels.carousel}</SelectItem>
                </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(value) => update({ status: value as ContentLibraryFilters['status'] })}>
                <SelectTrigger className="h-10 w-full rounded-xl">
                    <SelectValue aria-label={labels.status} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{labels.all}</SelectItem>
                    {Object.entries(labels.statuses).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={filters.platform} onValueChange={(value) => update({ platform: value })}>
                <SelectTrigger className="h-10 w-full rounded-xl">
                    <SelectValue aria-label={labels.platform} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{labels.allPlatforms}</SelectItem>
                    {platforms.map((platform) => (
                        <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={filters.campaign} onValueChange={(value) => update({ campaign: value })}>
                <SelectTrigger className="h-10 w-full rounded-xl">
                    <SelectValue aria-label={labels.campaign} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{labels.allCampaigns}</SelectItem>
                    <SelectItem value={CAMPAIGN_NONE}>{labels.noCampaign}</SelectItem>
                    {campaigns.map((campaign) => (
                        <SelectItem key={campaign} value={campaign}>{campaign}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={filters.planning} onValueChange={(value) => update({ planning: value as ContentLibraryFilters['planning'] })}>
                <SelectTrigger className="h-10 w-full rounded-xl">
                    <SelectValue aria-label={labels.planning} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{labels.all}</SelectItem>
                    <SelectItem value="planned">{labels.planned}</SelectItem>
                    <SelectItem value="unplanned">{labels.unplanned}</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}
