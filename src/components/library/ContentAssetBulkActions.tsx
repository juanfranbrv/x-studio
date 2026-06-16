'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { IconCheckSimple, IconDelete, IconXCircle } from '@/components/ui/icons'
import type { ContentAssetStatus } from './contentLibraryTypes'

interface ContentAssetBulkActionsProps {
    selectedCount: number
    visibleCount: number
    status: ContentAssetStatus
    campaignValue: string
    campaigns: string[]
    busy: boolean
    onStatusChange: (status: ContentAssetStatus) => void
    onApplyStatus: () => void
    onCampaignValueChange: (value: string) => void
    onApplyCampaign: () => void
    onDelete: () => void
    onSelectVisible: () => void
    onClearSelection: () => void
    labels: {
        selected: (count: number) => string
        selectVisible: (count: number) => string
        clear: string
        status: string
        applyStatus: string
        campaignInput: string
        applyCampaign: string
        delete: string
        busy: string
        statuses: Record<ContentAssetStatus, string>
    }
}

export function ContentAssetBulkActions({
    selectedCount,
    visibleCount,
    status,
    campaignValue,
    campaigns,
    busy,
    onStatusChange,
    onApplyStatus,
    onCampaignValueChange,
    onApplyCampaign,
    onDelete,
    onSelectVisible,
    onClearSelection,
    labels,
}: ContentAssetBulkActionsProps) {
    return (
        <div className="flex flex-col gap-3 rounded-[1.1rem] border border-border/60 bg-background/86 p-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                    {labels.selected(selectedCount)}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={onSelectVisible} disabled={visibleCount === 0 || busy}>
                    <IconCheckSimple className="mr-1 h-4 w-4" />
                    {labels.selectVisible(visibleCount)}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={onClearSelection} disabled={selectedCount === 0 || busy}>
                    <IconXCircle className="mr-1 h-4 w-4" />
                    {labels.clear}
                </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                    <Select value={status} onValueChange={(value) => onStatusChange(value as ContentAssetStatus)} disabled={busy || selectedCount === 0}>
                        <SelectTrigger className="h-9 w-[150px] rounded-xl">
                            <SelectValue aria-label={labels.status} />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(labels.statuses).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button type="button" size="sm" onClick={onApplyStatus} disabled={selectedCount === 0 || busy}>
                        {busy ? labels.busy : labels.applyStatus}
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        value={campaignValue}
                        onChange={(event) => onCampaignValueChange(event.target.value)}
                        placeholder={labels.campaignInput}
                        aria-label={labels.campaignInput}
                        disabled={busy || selectedCount === 0}
                        list="bulk-campaign-options"
                        className="h-9 w-[180px] rounded-xl"
                    />
                    <datalist id="bulk-campaign-options">
                        {campaigns.map((campaign) => (
                            <option key={campaign} value={campaign} />
                        ))}
                    </datalist>
                    <Button type="button" size="sm" variant="secondary" onClick={onApplyCampaign} disabled={selectedCount === 0 || busy}>
                        {labels.applyCampaign}
                    </Button>
                </div>
                <Button type="button" variant="destructive" size="sm" onClick={onDelete} disabled={selectedCount === 0 || busy}>
                    <IconDelete className="mr-1 h-4 w-4" />
                    {labels.delete}
                </Button>
            </div>
        </div>
    )
}
