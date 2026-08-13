'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { isAdminEmail } from '@/lib/auth-config'
import { Button } from '@/components/ui/button'
import { Loader2 } from '@/components/ui/spinner'
import { IconArrowLeft, IconUpload } from '@/components/ui/icons'
import { ContentLibraryGrid } from '@/components/library/ContentLibraryGrid'
import type { ContentAssetStatus, ContentLibraryAsset } from '@/components/library/contentLibraryTypes'

const STATUS_LABELS: Record<ContentAssetStatus, string> = {
    draft: 'Borrador',
    selected: 'Seleccionado',
    ready: 'Listo',
    scheduled: 'Programada',
    published_manual: 'Publicado manual',
    discarded: 'Descartado',
}

const GRID_LABELS = {
    image: 'Imagen',
    carousel: 'Carrusel',
    noCopy: 'Sin copy',
    emptyTitle: 'No hay activos en dev',
    emptyDescription: 'Genera imágenes o carruseles en dev y aparecerán aquí.',
    slides: (count: number) => `${count} slides`,
    plannedFor: (date: string) => `Previsto: ${date}`,
    statuses: STATUS_LABELS,
}

interface MigrateResult {
    migrated: number
    skipped?: number
    failed: number
    errors: Array<{ asset_key: string; error: string }>
    sourceConvexUrl?: string | null
    targetConvexUrl?: string | null
    sourceDeployment?: string | null
    targetDeployment?: string | null
    sourceUserId?: string
    targetUserId?: string
    sameDeployment?: boolean
    sameUser?: boolean
    blockedAsDuplicateTarget?: boolean
}

interface MigrationConfig {
    sourceConvexUrl: string | null
    targetConvexUrl: string | null
    sourceUserId: string
    targetUserId: string
    sourceDeployment: string | null
    targetDeployment: string | null
    sameDeployment: boolean
    sameUser: boolean
    blockedAsDuplicateTarget: boolean
    assets?: ContentLibraryAsset[]
}

function normalizeAssets(value: unknown): ContentLibraryAsset[] {
    return Array.isArray(value) ? value as ContentLibraryAsset[] : []
}

export default function AdminMigratePage() {
    const { user, isLoaded } = useUser()
    const email = user?.primaryEmailAddress?.emailAddress
    const isAdmin = isAdminEmail(email)

    const [selected, setSelected] = useState<Set<string>>(() => new Set())
    const [busy, setBusy] = useState(false)
    const [result, setResult] = useState<MigrateResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [config, setConfig] = useState<MigrationConfig | null>(null)
    const [rawAssets, setRawAssets] = useState<ContentLibraryAsset[] | undefined>(undefined)
    const assets = useMemo(() => normalizeAssets(rawAssets), [rawAssets])

    useEffect(() => {
        if (!isLoaded || !isAdmin) return
        let cancelled = false

        fetch('/api/admin/migrate-to-prod')
            .then((res) => res.ok ? res.json() : null)
            .then((data) => {
                if (!cancelled && data) {
                    setConfig(data as MigrationConfig)
                    setRawAssets(normalizeAssets((data as MigrationConfig).assets))
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setConfig(null)
                    setRawAssets([])
                }
            })

        return () => {
            cancelled = true
        }
    }, [isLoaded, isAdmin])

    const toggle = (asset: ContentLibraryAsset) => {
        setSelected((prev) => {
            const next = new Set(prev)
            if (next.has(asset.asset_key)) next.delete(asset.asset_key)
            else next.add(asset.asset_key)
            return next
        })
    }

    const selectAll = () => setSelected(new Set(assets.map((a) => a.asset_key)))
    const clear = () => setSelected(new Set())

    const migrate = async () => {
        const payload = assets.filter((a) => selected.has(a.asset_key))
        if (payload.length === 0) return
        setBusy(true)
        setResult(null)
        setError(null)
        try {
            const res = await fetch('/api/admin/migrate-to-prod', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assets: payload }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data?.error || 'Error desconocido')
            } else {
                setResult(data as MigrateResult)
                setSelected(new Set())
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setBusy(false)
        }
    }

    if (!isLoaded) {
        return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
    }

    if (!isAdmin) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-muted-foreground">No autorizado.</p>
                <Link href="/" className="text-sm text-primary underline">Volver al inicio</Link>
            </div>
        )
    }

    return (
        <main className="mx-auto w-full max-w-[1800px] px-4 py-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <Link href="/admin" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                        <IconArrowLeft className="h-4 w-4" /> Admin
                    </Link>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Migrar a producción</h1>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                        Marca las imágenes y carruseles del Convex de desarrollo que quieras copiar a producción.
                        Solo añade contenido nuevo en producción: no borra ni sobrescribe nada.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={busy || selected.size === 0}>Limpiar</Button>
                    <Button type="button" variant="outline" size="sm" onClick={selectAll} disabled={busy || assets.length === 0}>Seleccionar todo ({assets.length})</Button>
                    <Button
                        type="button"
                        onClick={migrate}
                        disabled={busy || selected.size === 0 || !config?.sourceConvexUrl || !config?.targetConvexUrl || config?.blockedAsDuplicateTarget}
                    >
                        {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <IconUpload className="mr-1 h-4 w-4" />}
                        {busy ? 'Migrando...' : `Llevar a producción (${selected.size})`}
                    </Button>
                </div>
            </div>

            <div className="mb-4 rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
                <p className="font-medium text-foreground">Configuración Convex de esta herramienta</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Origen de migración</p>
                        <p className="mt-0.5 break-all font-mono text-xs text-foreground">
                            {config?.sourceDeployment || 'No detectado'}
                        </p>
                        <p className="mt-0.5 break-all text-xs text-muted-foreground">
                            {config?.sourceConvexUrl || 'NEXT_PUBLIC_CONVEX_URL no configurada'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Destino configurado como producción</p>
                        <p className="mt-0.5 break-all font-mono text-xs text-foreground">
                            {config?.targetDeployment || 'No detectado'}
                        </p>
                        <p className="mt-0.5 break-all text-xs text-muted-foreground">
                            {config?.targetConvexUrl || 'CONVEX_PROD_URL no configurada'}
                        </p>
                    </div>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <p className="break-all text-xs text-muted-foreground">
                        Usuario origen dev: {config?.sourceUserId || 'user_37R8MiIJvgY7ZIQaMyDnQCqDl5t'}
                    </p>
                    <p className="break-all text-xs text-muted-foreground">
                        Usuario destino prod: {config?.targetUserId || 'user_3AB2BmaIPSkUvq1jIap4rKqRqdL'}
                    </p>
                </div>
                {config?.sameDeployment && !config.sameUser ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                        Origen y destino usan el mismo deployment, pero usuarios distintos. La migración copia de usuario dev a usuario prod dentro de la producción visible.
                    </p>
                ) : null}
                {config?.blockedAsDuplicateTarget ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                        Origen y destino son el mismo deployment. La migración queda bloqueada para evitar duplicados dentro de la misma base.
                    </p>
                ) : null}
            </div>

            {error ? (
                <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>
            ) : null}
            {result ? (
                <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm">
                    <p className="font-medium text-emerald-700">Migrados: {result.migrated} · Omitidos: {result.skipped ?? 0} · Fallidos: {result.failed}</p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                        Destino usado: {result.targetDeployment || 'No detectado'} ({result.targetConvexUrl || 'sin URL'})
                    </p>
                    {result.errors.length > 0 ? (
                        <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                            {result.errors.map((e) => <li key={e.asset_key}>{e.asset_key}: {e.error}</li>)}
                        </ul>
                    ) : null}
                </div>
            ) : null}

            {rawAssets === undefined ? (
                <div className="flex min-h-[18rem] items-center justify-center text-sm text-muted-foreground">Cargando activos de desarrollo...</div>
            ) : (
                <ContentLibraryGrid
                    assets={assets}
                    selectedAssetKeys={selected}
                    compact
                    onSelectAsset={toggle}
                    onToggleAssetSelection={toggle}
                    labels={GRID_LABELS}
                />
            )}
        </main>
    )
}
