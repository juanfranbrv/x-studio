'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useMutation, useQuery } from 'convex/react'
import { useTranslation } from 'react-i18next'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useBrandKit } from '@/contexts/BrandKitContext'
import { useToast } from '@/hooks/use-toast'
import { ContentAssetDetailPanel } from '@/components/library/ContentAssetDetailPanel'
import { ContentAssetBulkActions } from '@/components/library/ContentAssetBulkActions'
import { ContentAssetFilters } from '@/components/library/ContentAssetFilters'
import { ContentLibraryGrid } from '@/components/library/ContentLibraryGrid'
import { ContentLibraryCampaignGroups } from '@/components/library/ContentLibraryCampaignGroups'
import { ContentLibraryCalendar } from '@/components/library/ContentLibraryCalendar'
import { CampaignManager } from '@/components/library/CampaignManager'
import { filterContentLibraryAssets } from '@/components/library/contentLibraryFilters'
import type { ContentAssetStatus, ContentCampaign, ContentLibraryAsset, ContentLibraryFilters, LibraryView } from '@/components/library/contentLibraryTypes'
import { Button } from '@/components/ui/button'
import { IconCalendar, IconFolderKanban, IconGrid, IconPlus } from '@/components/ui/icons'

const STATUS_KEYS: ContentAssetStatus[] = ['draft', 'selected', 'ready', 'scheduled', 'published_manual', 'discarded']

function normalizeAssets(value: unknown): ContentLibraryAsset[] {
    return Array.isArray(value) ? value as ContentLibraryAsset[] : []
}

export default function LibraryPage() {
    const { t, i18n } = useTranslation('library')
    const router = useRouter()
    const { user } = useUser()
    const { toast } = useToast()
    const { activeBrandKit, brandKits, setActiveBrandKit, deleteBrandKitById } = useBrandKit()
    const rawAssets = useQuery(
        api.contentLibrary.listAssets,
        user?.id && activeBrandKit?.id
            ? { user_id: user.id, brand_id: activeBrandKit.id as Id<'brand_dna'>, limit: 240 }
            : 'skip'
    )
    const rawCampaigns = useQuery(api.contentLibrary.listCampaigns, user?.id ? { user_id: user.id } : 'skip')
    const updateAnnotation = useMutation(api.contentLibrary.updateAnnotation)
    const bulkUpdateAnnotations = useMutation(api.contentLibrary.bulkUpdateAnnotations)
    const bulkSetCampaign = useMutation(api.contentLibrary.bulkSetCampaign)
    const bulkDeleteAssets = useMutation(api.contentLibrary.bulkDeleteAssets)
    const createCampaign = useMutation(api.contentLibrary.createCampaign)
    const renameCampaign = useMutation(api.contentLibrary.renameCampaign)
    const deleteCampaign = useMutation(api.contentLibrary.deleteCampaign)
    const setPlannedAt = useMutation(api.contentLibrary.setPlannedAt)
    const [selectedAssetKey, setSelectedAssetKey] = useState<string | undefined>()
    const [selectedAssetKeys, setSelectedAssetKeys] = useState<Set<string>>(() => new Set())
    const [savingAssetKey, setSavingAssetKey] = useState<string | null>(null)
    const [bulkStatus, setBulkStatus] = useState<ContentAssetStatus>('ready')
    const [bulkCampaign, setBulkCampaign] = useState('')
    const [bulkBusy, setBulkBusy] = useState(false)
    const [view, setView] = useState<LibraryView>('grid')
    const [managerOpen, setManagerOpen] = useState(false)
    const [campaignBusy, setCampaignBusy] = useState(false)
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
    const hasActiveLibraryFilters = Boolean(
        filters.query.trim() ||
        filters.module !== 'all' ||
        filters.status !== 'all' ||
        filters.platform !== 'all' ||
        filters.campaign !== 'all' ||
        filters.planning !== 'all'
    )
    const gridPublicationCountLabel = hasActiveLibraryFilters
        ? t(
            filteredAssets.length === 1 ? 'view.gridCountFilteredOne' : 'view.gridCountFilteredMany',
            { count: filteredAssets.length, total: assets.length }
        )
        : t(
            filteredAssets.length === 1 ? 'view.gridCountOne' : 'view.gridCountMany',
            { count: filteredAssets.length }
        )
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

    const campaignEntities = useMemo<ContentCampaign[]>(
        () => (Array.isArray(rawCampaigns) ? rawCampaigns as ContentCampaign[] : []),
        [rawCampaigns]
    )

    const campaignCounts = useMemo(() => {
        return assets.reduce<Record<string, number>>((acc, asset) => {
            if (asset.campaign) acc[asset.campaign] = (acc[asset.campaign] || 0) + 1
            return acc
        }, {})
    }, [assets])

    const campaigns = useMemo(() => {
        const names = new Set<string>()
        campaignEntities.forEach((campaign) => names.add(campaign.name))
        assets.forEach((asset) => { if (asset.campaign) names.add(asset.campaign) })
        return Array.from(names).sort((a, b) => a.localeCompare(b))
    }, [campaignEntities, assets])

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

    const handleCreateCampaign = async (name: string) => {
        if (!user?.id) return
        setCampaignBusy(true)
        try {
            await createCampaign({ user_id: user.id, name })
        } finally {
            setCampaignBusy(false)
        }
    }

    const handleRenameCampaign = async (id: string, name: string) => {
        if (!user?.id) return
        setCampaignBusy(true)
        try {
            await renameCampaign({ user_id: user.id, campaign_id: id as Id<'content_campaigns'>, name })
        } finally {
            setCampaignBusy(false)
        }
    }

    const handleDeleteCampaign = async (campaign: ContentCampaign) => {
        if (!user?.id) return
        if (!window.confirm(t('campaigns.deleteConfirm', { name: campaign.name }))) return
        setCampaignBusy(true)
        try {
            await deleteCampaign({ user_id: user.id, campaign_id: campaign.id as Id<'content_campaigns'> })
        } finally {
            setCampaignBusy(false)
        }
    }

    const handleSchedule = async (assetKey: string, plannedAt: string | null) => {
        if (!user?.id) return
        await setPlannedAt({ user_id: user.id, asset_key: assetKey, planned_at: plannedAt || undefined })
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

    const detailPanel = (
        <div className="min-h-0 overflow-y-auto">
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
    )

    const controlsBar = (
        <div className="grid shrink-0 gap-3">
            <section className="rounded-[1.45rem] border border-border/60 bg-background/86 p-4 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.32)] backdrop-blur-xl">
                <div className="grid gap-3">
                    <ContentAssetFilters
                        filters={filters}
                        platforms={platforms}
                        campaigns={campaigns}
                        onChange={setFilters}
                        responsive
                        visibleCount={filteredAssets.length}
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
                            filtersToggle: t('filters.toggle'),
                            visibleCount: (count) => t('filters.visibleCount', { count }),
                            statuses: statusLabels,
                        }}
                    />
                    {selectedBulkKeys.length > 0 && (
                        <ContentAssetBulkActions
                            selectedCount={selectedBulkKeys.length}
                            visibleCount={filteredAssets.length}
                            status={bulkStatus}
                            campaignValue={bulkCampaign}
                            campaigns={campaigns}
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
                    )}
                </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <div className="inline-flex rounded-xl border border-border/60 bg-background/86 p-1 backdrop-blur-xl">
                        <Button type="button" size="sm" variant={view === 'grid' ? 'default' : 'ghost'} onClick={() => setView('grid')}>
                            <IconGrid className="mr-1 h-4 w-4" />
                            {t('view.grid')}
                        </Button>
                        <Button type="button" size="sm" variant={view === 'campaigns' ? 'default' : 'ghost'} onClick={() => setView('campaigns')}>
                            <IconFolderKanban className="mr-1 h-4 w-4" />
                            {t('view.campaigns')}
                        </Button>
                        <Button type="button" size="sm" variant={view === 'calendar' ? 'default' : 'ghost'} onClick={() => setView('calendar')}>
                            <IconCalendar className="mr-1 h-4 w-4" />
                            {t('view.calendar')}
                        </Button>
                    </div>
                    {view === 'grid' && (
                        <p className="rounded-xl border border-border/60 bg-background/86 px-3 py-2 text-sm font-medium text-muted-foreground backdrop-blur-xl">
                            {gridPublicationCountLabel}
                        </p>
                    )}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setManagerOpen(true)}>
                    <IconPlus className="mr-1 h-4 w-4" />
                    {t('campaigns.manage')}
                </Button>
            </div>
        </div>
    )

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
            <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4 md:px-4 xl:overflow-hidden">
                <div className="mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col gap-4">
                    <header className="rounded-[1.45rem] border border-border/60 bg-background/86 p-4 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.32)] md:p-5">
                        <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">{t('header.title')}</h1>
                        <p className="mt-2 hidden max-w-3xl text-sm leading-6 text-muted-foreground md:block">{t('header.description')}</p>
                    </header>

                    {controlsBar}

                    {rawAssets === undefined ? (
                        <div className="flex min-h-0 flex-1 items-center justify-center rounded-[1.45rem] border border-border/60 bg-background/86 text-sm text-muted-foreground">
                            {t('loading')}
                        </div>
                    ) : view === 'campaigns' ? (
                        <div className="min-h-0 flex-1 pr-1 xl:overflow-y-auto">
                            <ContentLibraryCampaignGroups
                                assets={filteredAssets}
                                campaigns={campaignEntities}
                                selectedAssetKey={selectedAsset?.asset_key}
                                selectedAssetKeys={selectedAssetKeys}
                                onSelectAsset={(asset) => setSelectedAssetKey(asset.asset_key)}
                                onToggleAssetSelection={handleToggleAssetSelection}
                                gridLabels={gridLabels}
                                labels={{
                                    noCampaign: t('filters.noCampaign'),
                                    count: (count) => t('campaigns.count', { count }),
                                    empty: t('campaigns.empty'),
                                }}
                            />
                        </div>
                    ) : view === 'calendar' ? (
                        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
                            <div className="min-h-0 pr-1 xl:overflow-y-auto">
                                <ContentLibraryCalendar
                                    assets={filteredAssets}
                                    selectedAssetKey={selectedAsset?.asset_key}
                                    onSelectAsset={(asset) => setSelectedAssetKey(asset.asset_key)}
                                    onSchedule={handleSchedule}
                                    locale={i18n.language || 'es-ES'}
                                    labels={{
                                        today: t('calendar.today'),
                                        unplannedTitle: t('calendar.unplannedTitle'),
                                        unplannedEmpty: t('calendar.unplannedEmpty'),
                                        more: (count) => t('calendar.more', { count }),
                                    }}
                                />
                            </div>
                            {detailPanel}
                        </div>
                    ) : (
                        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
                            <div className="min-h-0 pr-1 xl:overflow-y-auto">
                                <ContentLibraryGrid
                                    assets={filteredAssets}
                                    selectedAssetKey={selectedAsset?.asset_key}
                                    selectedAssetKeys={selectedAssetKeys}
                                    onSelectAsset={(asset) => setSelectedAssetKey(asset.asset_key)}
                                    onToggleAssetSelection={handleToggleAssetSelection}
                                    labels={gridLabels}
                                />
                            </div>
                            {detailPanel}
                        </div>
                    )}

                    <CampaignManager
                        open={managerOpen}
                        onOpenChange={setManagerOpen}
                        campaigns={campaignEntities}
                        counts={campaignCounts}
                        busy={campaignBusy}
                        onCreate={handleCreateCampaign}
                        onRename={handleRenameCampaign}
                        onDelete={handleDeleteCampaign}
                        labels={{
                            title: t('campaigns.title'),
                            description: t('campaigns.description'),
                            createPlaceholder: t('campaigns.createPlaceholder'),
                            create: t('campaigns.create'),
                            assetsCount: (count) => t('campaigns.assetsCount', { count }),
                            empty: t('campaigns.managerEmpty'),
                        }}
                    />
                </div>
            </main>
        </DashboardLayout>
    )
}
