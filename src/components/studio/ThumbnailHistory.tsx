'use client'

import { useMemo, useState } from 'react'
import { IconChevronLeft, IconChevronRight } from '@/components/ui/icons'
import { useTranslation } from 'react-i18next'

interface Generation {
    id: string
    image_url: string
    preview_image_url?: string
    original_image_url?: string
    image_storage_id?: string
    created_at: string
    prompt_used?: string
    request_payload?: Record<string, unknown>
    error_title?: string
    error_fallback?: string
}

interface ThumbnailHistoryProps {
    generations: Generation[]
    currentImageUrl?: string | null
    onSelectGeneration: (gen: Generation) => void
}

const ITEMS_PER_PAGE = 20

export function ThumbnailHistory({
    generations,
    currentImageUrl,
    onSelectGeneration,
}: ThumbnailHistoryProps) {
    const { t } = useTranslation('common')
    const [page, setPage] = useState(1)

    const totalPages = Math.max(1, Math.ceil(generations.length / ITEMS_PER_PAGE))
    const safePage = Math.max(1, Math.min(page, totalPages))

    const paginatedGenerations = useMemo(() => {
        const start = (safePage - 1) * ITEMS_PER_PAGE
        return generations.slice(start, start + ITEMS_PER_PAGE)
    }, [generations, safePage])

    if (generations.length === 0) return null

    const getSkillLabel = (gen: Generation) => {
        const payload = gen.request_payload || {}
        const skill = payload.compositionSkill as
            | { name?: string; version?: string }
            | undefined
        if (skill?.version) {
            return `${skill.name || 'skill'} v${skill.version}`
        }
        const layoutSkillVersion = payload.layoutSkillVersion as string | undefined
        if (layoutSkillVersion) {
            return t('thumbnailHistory.layoutsVersion', {
                defaultValue: 'Layouts v{{version}}',
                version: layoutSkillVersion,
            })
        }
        return null
    }

    return (
        <div className="px-1">
            <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {t('preview.sessionVariations')}
                </p>
                {totalPages > 1 ? (
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground transition hover:border-primary/25 hover:bg-[hsl(var(--surface))] hover:text-foreground disabled:opacity-40"
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            disabled={safePage <= 1}
                            aria-label={t('preview.previousPage')}
                        >
                            <IconChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <span className="px-1 text-[10px] text-muted-foreground">
                            {safePage}/{totalPages}
                        </span>
                        <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground transition hover:border-primary/25 hover:bg-[hsl(var(--surface))] hover:text-foreground disabled:opacity-40"
                            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={safePage >= totalPages}
                            aria-label={t('preview.nextPage')}
                        >
                            <IconChevronRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                ) : null}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {paginatedGenerations.map((gen) => {
                    const selectedCandidates = [gen.image_url, gen.preview_image_url, gen.original_image_url].filter(Boolean)
                    const isSelected = selectedCandidates.includes(currentImageUrl || '')
                    const skillLabel = getSkillLabel(gen)
                    const imageUrl = (typeof gen.preview_image_url === 'string' && gen.preview_image_url.trim())
                        || (typeof gen.image_url === 'string' ? gen.image_url.trim() : '')
                    return (
                        <button
                            key={gen.id}
                            onClick={() => onSelectGeneration(gen)}
                            aria-label={t('preview.selectVariation', {
                                defaultValue: 'Seleccionar variación {{index}}',
                                index: (safePage - 1) * ITEMS_PER_PAGE + paginatedGenerations.indexOf(gen) + 1,
                            })}
                            className={`relative flex-shrink-0 overflow-hidden rounded-[1.1rem] border transition-all duration-200 ${isSelected
                                ? 'border-primary/35 bg-primary/5 scale-[1.02] shadow-[0_14px_28px_-22px_rgba(59,130,246,0.32)]'
                                : 'border-border/50 bg-background/78 opacity-88 hover:-translate-y-0.5 hover:border-primary/20 hover:opacity-100'
                                }`}
                        >
                            <div className="h-[4.25rem] w-[4.25rem] bg-[hsl(var(--surface))]">
                                {imageUrl ? (
                                    <img
                                        src={imageUrl}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="h-full w-full bg-muted" />
                                )}
                            </div>
                            {skillLabel ? (
                                <span className="absolute inset-x-1 bottom-1 truncate rounded-full bg-foreground/82 px-1.5 py-0.5 text-[8px] font-medium leading-none text-background">
                                    {skillLabel}
                                </span>
                            ) : null}
                            {isSelected && (
                                <div className="absolute inset-0 bg-primary/10" />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
