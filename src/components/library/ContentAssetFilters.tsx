'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { IconChevronDown, IconFilter } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
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
    responsive?: boolean
    visibleCount?: number
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
        filtersToggle?: string
        visibleCount?: (count: number) => string
        statuses: Record<ContentAssetStatus, string>
    }
}

export function ContentAssetFilters({ filters, platforms, campaigns, onChange, responsive = false, visibleCount = 0, labels }: ContentAssetFiltersProps) {
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
    const update = (patch: Partial<ContentLibraryFilters>) => onChange({ ...filters, ...patch })

    const searchInput = (
        <Input
            value={filters.query}
            onChange={(event) => update({ query: event.target.value })}
            placeholder={labels.search}
            aria-label={labels.search}
            className="h-10 rounded-xl"
        />
    )

    const secondaryFilters = (
        <>
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
        </>
    )

    if (responsive) {
        return (
            <Collapsible open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen} className="grid gap-3">
                <div className="grid gap-2 md:hidden">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                        {searchInput}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-expanded={mobileFiltersOpen}
                            onClick={() => setMobileFiltersOpen((open) => !open)}
                            className="h-10 rounded-xl px-3"
                        >
                            <IconFilter className="mr-1.5 h-4 w-4" />
                            {labels.filtersToggle || 'Filtros'}
                            <IconChevronDown className={cn('ml-1.5 h-4 w-4 transition-transform duration-200', mobileFiltersOpen && 'rotate-180')} />
                        </Button>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">
                        {labels.visibleCount?.(visibleCount) || String(visibleCount)}
                    </p>
                </div>

                <CollapsibleContent className="md:hidden">
                    <div className="grid gap-2 pt-1">
                        {secondaryFilters}
                    </div>
                </CollapsibleContent>

                <div className="hidden gap-3 md:grid md:grid-cols-[minmax(220px,1.2fr)_repeat(5,minmax(150px,0.8fr))]">
                    {searchInput}
                    {secondaryFilters}
                </div>
            </Collapsible>
        )
    }

    return (
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1.2fr)_repeat(5,minmax(150px,0.8fr))]">
            {searchInput}
            {secondaryFilters}
        </div>
    )
}
