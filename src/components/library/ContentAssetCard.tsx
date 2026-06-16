'use client'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { ContentAssetStatus, ContentLibraryAsset } from './contentLibraryTypes'

interface ContentAssetCardProps {
    asset: ContentLibraryAsset
    selected: boolean
    checked: boolean
    compact?: boolean
    onSelect: (asset: ContentLibraryAsset) => void
    onToggleSelection: (asset: ContentLibraryAsset) => void
    labels: {
        image: string
        carousel: string
        noCopy: string
        slides: (count: number) => string
        plannedFor: (date: string) => string
        statuses: Record<ContentAssetStatus, string>
    }
}

function formatShortDate(value?: string) {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString()
}

export function ContentAssetCard({ asset, selected, checked, compact = false, onSelect, onToggleSelection, labels }: ContentAssetCardProps) {
    const typeLabel = asset.type === 'carousel' ? labels.carousel : labels.image
    const copy = asset.copy?.trim() || labels.noCopy
    const created = formatShortDate(asset.created_at)
    const planned = formatShortDate(asset.planned_at)

    return (
        <article
            role="button"
            tabIndex={0}
            data-asset-key={asset.asset_key}
            onClick={() => onSelect(asset)}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(asset)
                }
            }}
            className={cn(
                'group flex min-w-0 cursor-pointer flex-col overflow-hidden border bg-background text-left shadow-[0_18px_48px_-38px_rgba(15,23,42,0.38)] outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 focus-visible:ring-2 focus-visible:ring-primary/35',
                compact ? 'rounded-xl' : 'rounded-[1.35rem]',
                selected ? 'border-primary/35 ring-2 ring-primary/18' : 'border-border/60',
                checked && 'border-primary/45 ring-2 ring-primary/25'
            )}
        >
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-[hsl(var(--surface-alt))]">
                {asset.preview_url ? (
                    <img
                        src={asset.preview_url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.015]"
                    />
                ) : (
                    <div className="h-full w-full bg-muted" />
                )}
                <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    <Badge variant={asset.type === 'carousel' ? 'secondary' : 'default'}>{typeLabel}</Badge>
                    {asset.slide_count ? <Badge variant="outline">{labels.slides(asset.slide_count)}</Badge> : null}
                </div>
                <div className="absolute right-3 top-3">
                    <Checkbox
                        checked={checked}
                        aria-label={asset.session_title}
                        onClick={(event) => event.stopPropagation()}
                        onCheckedChange={() => onToggleSelection(asset)}
                        className="h-5 w-5 rounded-md border-white/85 bg-white/80 shadow-sm"
                    />
                </div>
            </div>
            {compact ? (
                <div className="flex flex-col gap-0.5 p-2">
                    <p className="line-clamp-1 text-xs font-medium leading-tight text-foreground">{asset.session_title}</p>
                    {planned ? <span className="text-[10px] leading-3 text-muted-foreground">{labels.plannedFor(planned)}</span> : null}
                </div>
            ) : (
                <div className="flex min-h-[10.5rem] flex-col gap-2 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                            {asset.session_title}
                        </p>
                        <Badge variant="outline">{labels.statuses[asset.status]}</Badge>
                    </div>
                    <p className="line-clamp-3 text-sm leading-5 text-muted-foreground">{copy}</p>
                    <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {created ? <span>{created}</span> : null}
                        {asset.platform ? <span>{asset.platform}</span> : null}
                        {planned ? <span>{labels.plannedFor(planned)}</span> : null}
                    </div>
                </div>
            )}
        </article>
    )
}
