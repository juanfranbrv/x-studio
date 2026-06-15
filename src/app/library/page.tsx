'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useMutation, useQuery } from 'convex/react'
import { useTranslation } from 'react-i18next'
import { api } from '../../../convex/_generated/api'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useBrandKit } from '@/contexts/BrandKitContext'
import { useToast } from '@/hooks/use-toast'
import { ContentAssetDetailPanel } from '@/components/library/ContentAssetDetailPanel'
import { ContentAssetBulkActions } from '@/components/library/ContentAssetBulkActions'
import { ContentAssetFilters } from '@/components/library/ContentAssetFilters'
import { ContentLibraryGrid } from '@/components/library/ContentLibraryGrid'
import { filterContentLibraryAssets } from '@/components/library/contentLibraryFilters'
import type { ContentAssetStatus, ContentLibraryAsset, ContentLibraryFilters } from '@/components/library/contentLibraryTypes'

const STATUS_KEYS: ContentAssetStatus[] = ['draft', 'selected', 'ready', 'published_manual', 'discarded']

function normalizeAssets(value: unknown): ContentLibraryAsset[] {
    return Array.isArray(value) ? value as ContentLibraryAsset[] : []
}

export default function LibraryPage() {
    const { t } = useTranslation('library')
    const router = useRouter()
    const { user } = useUser()
    const { toast } = useToast()
    const { activeBrandKit, brandKits, setActiveBrandKit, deleteBrandKitById } = useBrandKit()
    const rawAssets = useQuery(api.contentLibrary.listAssets, user?.id ? { user_id: user.id, limit: 240 } : 'skip')
    const updateAnnotation = useMutation(api.contentLibrary.updateAnnotation)
    const bulkUpdateAnnotations = useMutation(api.contentLibrary.bulkUpdateAnnotations)
    const bulkSetCampaign = useMutation(api.contentLibrary.bulkSetCampaign)
    const bulkDeleteAssets = useMutation(api.contentLibrary.bulkDeleteAssets)
    const [selectedAssetKey, setSelectedAssetKey] = useState<string | undefined>()
    const [selectedAssetKeys, setSelectedAssetKeys] = useState<Set<string>>(() => new Set())
    const [savingAssetKey, setSavingAssetKey] = useState<string | null>(null)
    const [bulkStatus, setBulkStatus] = useState<ContentAssetStatus>('ready')
    const [bulkCampaign, setBulkCampaign] = useState('')
    const [bulkBusy, setBulkBusy] = useState(false)
    const [saveStateByAssetKey, setSaveStateByAssetKey] = useState<Record<string, 'saved' | 'error'>>({})
    const [filters, setFilters] = useState<ContentLibraryFilters>({
        module: 'all',
        status: 'all',
        platform: 'all',
        campaign: 'all',
        planning: 'all',
        query: '',
    })

    useEffect(() => {
        document.title = t('meta.title')
    }, [t])

    const assets = useMemo(() => normalizeAssets(rawAssets), [rawAssets])
    const filteredAssets = useMemo(() => filterContentLibraryAssets(assets, filters), [assets, filters])
    const selectedAsset = useMemo(
        () => filteredAssets.find((asset) => asset.asset_key === selectedAssetKey) || filteredAssets[0] || null,
        [filteredAssets, selectedAssetKey]
    )
    const selectedBulkKeys = useMemo(() => {
        const available = new Set(assets.map((asset) => asset.asset_key))
        return Array.from(selectedAssetKeys).filter((assetKey) => available.has(assetKey))
    }, [assets, selectedAssetKeys])

    useEffect(() => {
        if (!filteredAssets.length) {
            setSelectedAssetKey(undefined)
            return
        }
        if (!selectedAssetKey || !filteredAssets.some((asset) => asset.asset_key === selectedAssetKey)) {
            setSelectedAssetKey(filteredAssets[0].asset_key)
        }
    }, [filteredAssets, selectedAssetKey])

    useEffect(() => {
        const available = new Set(assets.map((asset) => asset.asset_key))
        setSelectedAssetKeys((prev) => {
            const next = new Set(Array.from(prev).filter((assetKey) => available.has(assetKey)))
            return next.size === prev.size ? prev : next
        })
    }, [assets])

    const platforms = useMemo(() => {
        return Array.from(new Set(assets.map((asset) => asset.platform).filter((value): value is string => Boolean(value)))).sort()
    }, [assets])

    const campaigns = useMemo(() => {
        return Array.from(new Set(assets.map((asset) => asset.campaign).filter((value): value is string => Boolean(value)))).sort()
    }, [assets])

    const statusLabels = useMemo(() => {
        return STATUS_KEYS.reduce<Record<ContentAssetStatus, string>>((acc, status) => {
            acc[status] = t(`status.${status}`)
            return acc
        }, {} as Record<ContentAssetStatus, string>)
    }, [t])

    const handleNewBrandKit = () => {
        router.push('/brand-kit/new')
    }

    const handleSave = async (
        asset: ContentLibraryAsset,
        draft: {
            status: ContentAssetStatus
            planned_at: string
            platform: string
            format: string
            campaign: string
            notes: string
        }
    ) => {
        if (!user?.id) return
        setSavingAssetKey(asset.asset_key)
        setSaveStateByAssetKey((prev) => {
            const next = { ...prev }
            delete next[asset.asset_key]
            return next
        })
        try {
            await updateAnnotation({
                user_id: user.id,
                asset_key: asset.asset_key,
                status: draft.status,
                planned_at: draft.planned_at || undefined,
                platform: draft.platform || undefined,
                format: draft.format || undefined,
                campaign: draft.campaign || undefined,
                notes: draft.notes || undefined,
            })
            setSaveStateByAssetKey((prev) => ({ ...prev, [asset.asset_key]: 'saved' }))
            toast({ title: t('detail.saved') })
        } catch (error) {
            console.error('[library] Failed to save annotation', error)
            setSaveStateByAssetKey((prev) => ({ ...prev, [asset.asset_key]: 'error' }))
            toast({
                title: t('detail.saveError'),
                variant: 'destructive',
            })
        } finally {
            setSavingAssetKey(null)
        }
    }

    const handleToggleAssetSelection = (asset: ContentLibraryAsset) => {
        setSelectedAssetKeys((prev) => {
            const next = new Set(prev)
            if (next.has(asset.asset_key)) {
                next.delete(asset.asset_key)
            } else {
                next.add(asset.asset_key)
            }
            return next
        })
    }

    const handleSelectVisible = () => {
        setSelectedAssetKeys((prev) => {
            const next = new Set(prev)
            filteredAssets.forEach((asset) => next.add(asset.asset_key))
            return next
        })
    }

    const handleClearSelection = () => {
        setSelectedAssetKeys(new Set())
    }

    const handleBulkStatus = async () => {
        if (!user?.id || selectedBulkKeys.length === 0) return
        setBulkBusy(true)
        try {
            await bulkUpdateAnnotations({
                user_id: user.id,
                asset_keys: selectedBulkKeys,
                status: bulkStatus,
            })
            setSelectedAssetKeys(new Set())
        } finally {
            setBulkBusy(false)
        }
    }

    const handleBulkCampaign = async () => {
        if (!user?.id || selectedBulkKeys.length === 0) return
        setBulkBusy(true)
        try {
            await bulkSetCampaign({
                user_id: user.id,
                asset_keys: selectedBulkKeys,
                campaign: bulkCampaign.trim() || undefined,
            })
            setBulkCampaign('')
            setSelectedAssetKeys(new Set())
        } finally {
            setBulkBusy(false)
        }
    }

    const handleBulkDelete = async () => {
        if (!user?.id || selectedBulkKeys.length === 0) return
        if (!window.confirm(selectedBulkKeys.length === 1 ? t('bulk.deleteConfirmOne') : t('bulk.deleteConfirmMany', { count: selectedBulkKeys.length }))) return
        setBulkBusy(true)
        try {
            await bulkDeleteAssets({
                user_id: user.id,
                asset_keys: selectedBulkKeys,
            })
            setSelectedAssetKeys(new Set())
        } finally {
            setBulkBusy(false)
        }
    }

    const gridLabels = {
        image: t('modules.image'),
        carousel: t('modules.carousel'),
        noCopy: t('card.noCopy'),
        emptyTitle: t('empty.title'),
        emptyDescription: t('empty.description'),
        slides: (count: number) => t('card.slides', { count }),
        plannedFor: (date: string) => t('card.plannedFor', { date }),
        statuses: statusLabels,
    }

    return (
        <DashboardLayout
            brands={brandKits}
            currentBrand={activeBrandKit}
            onBrandChange={setActiveBrandKit}
            onBrandDelete={deleteBrandKitById}
            onNewBrandKit={handleNewBrandKit}
            contentContainerVariant="plain"
            headerVariant="bar"
        >
            <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4 md:px-4">
                <div className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col gap-4">
                    <header className="rounded-[1.45rem] border border-border/60 bg-background/86 p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.32)]">
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('header.title')}</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('header.description')}</p>
                    </header>

                    <section className="rounded-[1.45rem] border border-border/60 bg-background/86 p-4 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.32)]">
                        <div className="grid gap-3">
                            <ContentAssetFilters
                                filters={filters}
                                platforms={platforms}
                                campaigns={campaigns}
                                onChange={setFilters}
                                labels={{
                                    search: t('filters.search'),
                                    module: t('filters.module'),
                                    status: t('filters.status'),
                                    platform: t('filters.platform'),
                                    campaign: t('filters.campaign'),
                                    planning: t('filters.planning'),
                                    all: t('filters.all'),
                                    allPlatforms: t('filters.allPlatforms'),
                                    allCampaigns: t('filters.allCampaigns'),
                                    noCampaign: t('filters.noCampaign'),
                                    planned: t('filters.planned'),
                                    unplanned: t('filters.unplanned'),
                                    image: t('modules.image'),
                                    carousel: t('modules.carousel'),
                                    statuses: statusLabels,
                                }}
                            />
                            <ContentAssetBulkActions
                                selectedCount={selectedBulkKeys.length}
                                visibleCount={filteredAssets.length}
                                status={bulkStatus}
                                campaignValue={bulkCampaign}
                                busy={bulkBusy}
                                onStatusChange={setBulkStatus}
                                onApplyStatus={handleBulkStatus}
                                onCampaignValueChange={setBulkCampaign}
                                onApplyCampaign={handleBulkCampaign}
                                onDelete={handleBulkDelete}
                                onSelectVisible={handleSelectVisible}
                                onClearSelection={handleClearSelection}
                                labels={{
                                    selected: (count) => count === 1 ? t('bulk.selectedOne') : t('bulk.selectedMany', { count }),
                                    selectVisible: (count) => t('bulk.selectVisible', { count }),
                                    clear: t('bulk.clear'),
                                    status: t('bulk.status'),
                                    applyStatus: t('bulk.applyStatus'),
                                    campaignInput: t('bulk.campaignInput'),
                                    applyCampaign: t('bulk.applyCampaign'),
                                    delete: t('bulk.delete'),
                                    busy: t('bulk.busy'),
                                    statuses: statusLabels,
                                }}
                            />
                        </div>
                    </section>

                    {rawAssets === undefined ? (
                        <div className="flex min-h-[18rem] items-center justify-center rounded-[1.45rem] border border-border/60 bg-background/86 text-sm text-muted-foreground">
                            {t('loading')}
                        </div>
                    ) : (
                        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
                            <ContentLibraryGrid
                                assets={filteredAssets}
                                selectedAssetKey={selectedAsset?.asset_key}
                                selectedAssetKeys={selectedAssetKeys}
                                onSelectAsset={(asset) => setSelectedAssetKey(asset.asset_key)}
                                onToggleAssetSelection={handleToggleAssetSelection}
                                labels={gridLabels}
                            />
                            <div className="xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
                            <ContentAssetDetailPanel
                                key={selectedAsset?.asset_key || 'empty'}
                                asset={selectedAsset}
                                saving={savingAssetKey === selectedAsset?.asset_key}
                                saveState={selectedAsset ? saveStateByAssetKey[selectedAsset.asset_key] : undefined}
                                onSave={handleSave}
                                labels={{
                                    title: t('detail.title'),
                                    copy: t('detail.copy'),
                                    metadata: t('detail.metadata'),
                                    session: t('detail.session'),
                                    createdAt: t('detail.createdAt'),
                                    plannedAt: t('detail.plannedAt'),
                                    platform: t('detail.platform'),
                                    format: t('detail.format'),
                                    campaign: t('detail.campaign'),
                                    campaignPlaceholder: t('detail.campaignPlaceholder'),
                                    notes: t('detail.notes'),
                                    notesPlaceholder: t('detail.notesPlaceholder'),
                                    status: t('detail.status'),
                                    copyButton: t('detail.copyButton'),
                                    copied: t('detail.copied'),
                                    download: t('detail.download'),
                                    openSource: t('detail.openSource'),
                                    save: t('detail.save'),
                                    saving: t('detail.saving'),
                                    saved: t('detail.saved'),
                                    saveError: t('detail.saveError'),
                                    image: t('modules.image'),
                                    carousel: t('modules.carousel'),
                                    statuses: statusLabels,
                                }}
                            />
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </DashboardLayout>
    )
}
