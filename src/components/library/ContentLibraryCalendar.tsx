'use client'

import { useMemo, useState, type DragEvent } from 'react'
import { Button } from '@/components/ui/button'
import { buildMonthMatrix, dateKey, groupAssetsByDateKey } from './calendar-utils'
import type { ContentLibraryAsset } from './contentLibraryTypes'

interface ContentLibraryCalendarProps {
    assets: ContentLibraryAsset[]
    selectedAssetKey?: string
    onSelectAsset: (asset: ContentLibraryAsset) => void
    onSchedule: (assetKey: string, plannedAt: string | null) => void
    locale: string
    labels: {
        today: string
        unplannedTitle: string
        unplannedEmpty: string
        more: (count: number) => string
    }
}

const DRAG_TYPE = 'text/plain'

function AssetChip({
    asset,
    selected,
    onSelect,
}: {
    asset: ContentLibraryAsset
    selected: boolean
    onSelect: () => void
}) {
    return (
        <button
            type="button"
            draggable
            onDragStart={(event) => {
                event.dataTransfer.setData(DRAG_TYPE, asset.asset_key)
                event.dataTransfer.effectAllowed = 'move'
            }}
            onClick={onSelect}
            title={asset.session_title}
            className={`flex w-full items-center gap-2 rounded-md border px-1.5 py-1 text-left transition-colors ${
                selected ? 'border-primary ring-1 ring-primary' : 'border-border/60 hover:bg-[hsl(var(--surface-alt))]'
            }`}
        >
            <span className="h-9 w-9 shrink-0 overflow-hidden rounded bg-muted">
                {asset.preview_url ? (
                    <img src={asset.preview_url} alt="" className="h-full w-full object-cover" />
                ) : null}
            </span>
            <span className="truncate text-xs leading-4 text-foreground">{asset.session_title}</span>
        </button>
    )
}

export function ContentLibraryCalendar({ assets, selectedAssetKey, onSelectAsset, onSchedule, locale, labels }: ContentLibraryCalendarProps) {
    const today = new Date()
    const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
    const [dragOverKey, setDragOverKey] = useState<string | null>(null)
    const [unplannedDragOver, setUnplannedDragOver] = useState(false)

    const weeks = useMemo(() => buildMonthMatrix(cursor.year, cursor.month), [cursor.year, cursor.month])
    const byDate = useMemo(() => groupAssetsByDateKey(assets), [assets])
    const unplanned = useMemo(() => assets.filter((asset) => !asset.planned_at), [assets])

    const weekdayNames = useMemo(() => {
        const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' })
        return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2024, 0, 1 + i)))
    }, [locale])

    const monthLabel = useMemo(
        () => new Date(cursor.year, cursor.month, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
        [cursor.year, cursor.month, locale]
    )

    const todayKey = dateKey(today)

    const goPrev = () => setCursor((c) => {
        const d = new Date(c.year, c.month - 1, 1)
        return { year: d.getFullYear(), month: d.getMonth() }
    })
    const goNext = () => setCursor((c) => {
        const d = new Date(c.year, c.month + 1, 1)
        return { year: d.getFullYear(), month: d.getMonth() }
    })
    const goToday = () => setCursor({ year: today.getFullYear(), month: today.getMonth() })

    const readDraggedKey = (event: DragEvent) => event.dataTransfer.getData(DRAG_TYPE)

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
            {/* Tira de no planificados: tambien sirve para "quitar fecha" arrastrando aqui */}
            <section
                onDragOver={(event) => { event.preventDefault(); setUnplannedDragOver(true) }}
                onDragLeave={() => setUnplannedDragOver(false)}
                onDrop={(event) => {
                    event.preventDefault()
                    setUnplannedDragOver(false)
                    const key = readDraggedKey(event)
                    if (key) onSchedule(key, null)
                }}
                className={`rounded-[1.2rem] border p-3 transition-colors ${
                    unplannedDragOver ? 'border-primary bg-primary/5' : 'border-border/60 bg-background/86'
                }`}
            >
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{labels.unplannedTitle}</h3>
                {unplanned.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{labels.unplannedEmpty}</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {unplanned.map((asset) => (
                            <div key={asset.asset_key} className="w-44">
                                <AssetChip
                                    asset={asset}
                                    selected={asset.asset_key === selectedAssetKey}
                                    onSelect={() => onSelectAsset(asset)}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="flex min-h-0 flex-1 flex-col rounded-[1.2rem] border border-border/60 bg-background/86 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold capitalize text-foreground">{monthLabel}</h2>
                    <div className="flex items-center gap-1.5">
                        <Button type="button" size="sm" variant="ghost" onClick={goPrev} aria-label="prev">‹</Button>
                        <Button type="button" size="sm" variant="outline" onClick={goToday}>{labels.today}</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={goNext} aria-label="next">›</Button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                    {weekdayNames.map((name) => (
                        <div key={name} className="pb-1 text-[11px] font-medium uppercase text-muted-foreground">{name}</div>
                    ))}
                </div>

                <div className="grid flex-1 grid-cols-7 gap-1">
                    {weeks.flat().map((day) => {
                        const key = dateKey(day)
                        const inMonth = day.getMonth() === cursor.month
                        const dayAssets = byDate.get(key) || []
                        const isToday = key === todayKey
                        const isDragOver = dragOverKey === key
                        return (
                            <div
                                key={key}
                                onDragOver={(event) => { event.preventDefault(); setDragOverKey(key) }}
                                onDragLeave={() => setDragOverKey((current) => (current === key ? null : current))}
                                onDrop={(event) => {
                                    event.preventDefault()
                                    setDragOverKey(null)
                                    const dragged = readDraggedKey(event)
                                    if (dragged) onSchedule(dragged, key)
                                }}
                                className={`flex min-h-[7rem] flex-col gap-1 rounded-lg border p-1 transition-colors ${
                                    isDragOver
                                        ? 'border-primary bg-primary/5'
                                        : inMonth ? 'border-border/60 bg-background' : 'border-transparent bg-[hsl(var(--surface-alt))]/40'
                                }`}
                            >
                                <span className={`text-[11px] font-medium ${
                                    isToday
                                        ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground'
                                        : inMonth ? 'text-foreground' : 'text-muted-foreground'
                                }`}>
                                    {day.getDate()}
                                </span>
                                <div className="flex flex-col gap-1 overflow-hidden">
                                    {dayAssets.slice(0, 3).map((asset) => (
                                        <AssetChip
                                            key={asset.asset_key}
                                            asset={asset}
                                            selected={asset.asset_key === selectedAssetKey}
                                            onSelect={() => onSelectAsset(asset)}
                                        />
                                    ))}
                                    {dayAssets.length > 3 ? (
                                        <span className="px-1 text-[10px] text-muted-foreground">{labels.more(dayAssets.length - 3)}</span>
                                    ) : null}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>
        </div>
    )
}
