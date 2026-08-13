'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { IconCopy, IconDownload, IconExternalLink } from '@/components/ui/icons'
import { CalendarClock } from 'lucide-react'
import { canScheduleAsset } from './canScheduleAsset'
import type { ContentAssetStatus, ContentLibraryAsset } from './contentLibraryTypes'

interface DraftState {
    status: ContentAssetStatus
    planned_at: string
    platform: string
    format: string
    campaign: string
    notes: string
}

interface ContentAssetDetailPanelProps {
    asset: ContentLibraryAsset | null
    saving: boolean
    saveState?: 'saved' | 'error'
    onSave: (asset: ContentLibraryAsset, draft: DraftState) => Promise<void>
    /** Sin ella no se ofrece programar (p. ej. si no eres administrador). */
    onSchedule?: (asset: ContentLibraryAsset) => void
    labels: {
        schedule: string
        title: string
        copy: string
        metadata: string
        session: string
        createdAt: string
        plannedAt: string
        platform: string
        format: string
        campaign: string
        campaignPlaceholder: string
        notes: string
        notesPlaceholder: string
        status: string
        copyButton: string
        copied: string
        download: string
        openSource: string
        save: string
        saving: string
        saved: string
        saveError: string
        image: string
        carousel: string
        statuses: Record<ContentAssetStatus, string>
    }
}

function toDateInputValue(value?: string) {
    if (!value) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toISOString().slice(0, 10)
}

function formatDateTime(value?: string) {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString()
}

export function ContentAssetDetailPanel({ asset, saving, saveState, onSave, onSchedule, labels }: ContentAssetDetailPanelProps) {
    const [draft, setDraft] = useState<DraftState>({
        status: asset?.status || 'draft',
        planned_at: toDateInputValue(asset?.planned_at),
        platform: asset?.platform || '',
        format: asset?.format || '',
        campaign: asset?.campaign || '',
        notes: asset?.notes || '',
    })
    const [copied, setCopied] = useState(false)

    if (!asset) return null

    const sourceHref = asset.module === 'carousel' ? '/carousel' : '/image'
    const downloadUrl = asset.original_url || asset.preview_url
    const typeLabel = asset.type === 'carousel' ? labels.carousel : labels.image

    const handleCopy = async () => {
        const text = asset.copy?.trim()
        if (!text) return
        await navigator.clipboard.writeText(text)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
    }

    return (
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-[1.45rem] border border-border/60 bg-background shadow-[0_24px_70px_-46px_rgba(15,23,42,0.34)]">
            <div className="border-b border-border/60 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{labels.title}</p>
                        <h2 className="mt-1 line-clamp-2 text-lg font-semibold leading-tight text-foreground">{asset.session_title}</h2>
                    </div>
                    <Badge variant={asset.type === 'carousel' ? 'secondary' : 'default'}>{typeLabel}</Badge>
                </div>
            </div>

            <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
                <div className="overflow-hidden rounded-[1.2rem] border border-border/60 bg-[hsl(var(--surface-alt))]">
                    <div className="aspect-[4/5] w-full">
                        {asset.preview_url ? (
                            <img src={asset.preview_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full bg-muted" />
                        )}
                    </div>
                </div>

                <section className="mt-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{labels.copy}</h3>
                        <Button type="button" variant="outline" size="sm" onClick={handleCopy} disabled={!asset.copy}>
                            <IconCopy className="mr-1 h-4 w-4" />
                            {copied ? labels.copied : labels.copyButton}
                        </Button>
                    </div>
                    <p className="whitespace-pre-wrap rounded-xl border border-border/60 bg-[hsl(var(--surface-alt))] p-3 text-sm leading-6 text-muted-foreground">
                        {asset.copy || '-'}
                    </p>
                </section>

                <section className="mt-5 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">{labels.metadata}</h3>
                    <div className="grid gap-3">
                        <label className="grid gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground">{labels.status}</span>
                            <Select value={draft.status} onValueChange={(value) => setDraft((prev) => ({ ...prev, status: value as ContentAssetStatus }))}>
                                <SelectTrigger className="h-10 w-full rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(labels.statuses).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </label>

                        <label className="grid gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground">{labels.plannedAt}</span>
                            <Input
                                type="date"
                                value={draft.planned_at}
                                onChange={(event) => setDraft((prev) => ({ ...prev, planned_at: event.target.value }))}
                                className="h-10 rounded-xl"
                            />
                        </label>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-1.5">
                                <span className="text-xs font-medium text-muted-foreground">{labels.platform}</span>
                                <Input
                                    value={draft.platform}
                                    onChange={(event) => setDraft((prev) => ({ ...prev, platform: event.target.value }))}
                                    className="h-10 rounded-xl"
                                />
                            </label>
                            <label className="grid gap-1.5">
                                <span className="text-xs font-medium text-muted-foreground">{labels.format}</span>
                                <Input
                                    value={draft.format}
                                    onChange={(event) => setDraft((prev) => ({ ...prev, format: event.target.value }))}
                                    className="h-10 rounded-xl"
                                />
                            </label>
                        </div>

                        <label className="grid gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground">{labels.campaign}</span>
                            <Input
                                value={draft.campaign}
                                onChange={(event) => setDraft((prev) => ({ ...prev, campaign: event.target.value }))}
                                placeholder={labels.campaignPlaceholder}
                                className="h-10 rounded-xl"
                            />
                        </label>

                        <label className="grid gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground">{labels.notes}</span>
                            <Textarea
                                value={draft.notes}
                                onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
                                placeholder={labels.notesPlaceholder}
                                className="min-h-24 rounded-xl"
                            />
                        </label>
                    </div>
                </section>

                <section className="mt-5 grid gap-2 rounded-xl border border-border/60 bg-[hsl(var(--surface-alt))] p-3 text-sm text-muted-foreground">
                    <div className="flex justify-between gap-3">
                        <span>{labels.session}</span>
                        <span className="truncate text-foreground">{asset.session_title}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                        <span>{labels.createdAt}</span>
                        <span className="text-foreground">{formatDateTime(asset.created_at)}</span>
                    </div>
                </section>
            </div>

            <div className="grid gap-2 border-t border-border/60 p-4">
                {onSchedule && canScheduleAsset(asset) && (
                    <Button type="button" variant="secondary" onClick={() => onSchedule(asset)}>
                        <CalendarClock className="mr-1 h-4 w-4" />
                        {labels.schedule}
                    </Button>
                )}
                <Button type="button" onClick={() => void onSave(asset, draft)} disabled={saving}>
                    {saving ? labels.saving : labels.save}
                </Button>
                {saveState ? (
                    <p
                        className={
                            saveState === 'saved'
                                ? 'text-center text-xs font-medium text-emerald-600'
                                : 'text-center text-xs font-medium text-destructive'
                        }
                    >
                        {saveState === 'saved' ? labels.saved : labels.saveError}
                    </p>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" asChild disabled={!downloadUrl}>
                        <a href={downloadUrl || '#'} download target="_blank" rel="noreferrer">
                            <IconDownload className="mr-1 h-4 w-4" />
                            {labels.download}
                        </a>
                    </Button>
                    <Button type="button" variant="outline" asChild>
                        <Link href={sourceHref}>
                            <IconExternalLink className="mr-1 h-4 w-4" />
                            {labels.openSource}
                        </Link>
                    </Button>
                </div>
            </div>
        </aside>
    )
}
