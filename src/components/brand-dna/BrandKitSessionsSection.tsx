'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    IconImage,
    IconCarousel,
    IconClose,
    IconHistory,
} from '@/components/ui/icons'
import { Loader2 } from '@/components/ui/spinner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    BRAND_KIT_PAGE_SHELL_CLASS,
    BRAND_KIT_PANEL_HEADER_CLASS,
    BRAND_KIT_PANEL_TITLE_CLASS,
    BRAND_KIT_PANEL_HEADER_ICON_CLASS,
} from './brandKitStyles'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionItem {
    _id: string
    title?: string
    title_customized?: boolean
    root_prompt?: string
    active: boolean
    created_at: string
    updated_at: string
    preview_image_url?: string
    module: string
}

interface BrandKitSessionsSectionProps {
    brandId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'justo ahora'
    if (mins < 60) return `hace ${mins} min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `hace ${hrs} h`
    const days = Math.floor(hrs / 24)
    if (days < 30) return `hace ${days} d`
    return new Date(iso).toLocaleDateString('es', { month: 'short', day: 'numeric' })
}

// ─── SessionCard ──────────────────────────────────────────────────────────────

function SessionCard({
    session,
    isOpening,
    isDeleting,
    onOpen,
    onDelete,
}: {
    session: SessionItem
    isOpening: boolean
    isDeleting: boolean
    onOpen: () => void
    onDelete: () => void
}) {
    return (
        <div
            className={cn(
                'group relative rounded-[1.1rem] border bg-background overflow-hidden cursor-pointer',
                'transition-all duration-150 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]',
                session.active
                    ? 'border-primary/40 ring-1 ring-primary/20'
                    : 'border-border/60 hover:border-primary/30',
                (isOpening || isDeleting) && 'pointer-events-none opacity-60',
            )}
            onClick={onOpen}
        >
            {/* Thumbnail */}
            <div className="aspect-square bg-[hsl(var(--surface-alt))] overflow-hidden relative">
                {session.preview_image_url ? (
                    <img
                        src={session.preview_image_url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <IconImage className="w-6 h-6 text-muted-foreground/25" />
                    </div>
                )}
                {/* Opening overlay */}
                {isOpening && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[2px]">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="px-2.5 py-2 space-y-0.5">
                <p className="text-[0.75rem] font-medium text-foreground/80 truncate leading-snug">
                    {session.title || session.root_prompt || 'Sin título'}
                </p>
                <p className="text-[0.68rem] text-muted-foreground/55 tabular-nums">
                    {relativeTime(session.updated_at)}
                </p>
            </div>

            {/* Active badge */}
            {session.active && (
                <div className="absolute top-1.5 left-1.5 bg-primary/90 backdrop-blur-sm text-primary-foreground text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full leading-tight shadow-sm">
                    ✓ Activa
                </div>
            )}

            {/* Delete button — visible on hover */}
            <button
                type="button"
                className={cn(
                    'absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full',
                    'bg-background/90 shadow-sm text-muted-foreground',
                    'opacity-0 group-hover:opacity-100 transition-opacity',
                    'hover:text-destructive hover:bg-destructive/8',
                )}
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                disabled={isDeleting}
                title="Eliminar sesión"
            >
                {isDeleting
                    ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    : <IconClose className="w-2.5 h-2.5" />
                }
            </button>
        </div>
    )
}

// ─── ModuleRow ─────────────────────────────────────────────────────────────────

function ModuleRow({
    label,
    icon,
    module,
    sessions,
    openingId,
    deletingIds,
    isClearing,
    onOpen,
    onDelete,
    onClear,
}: {
    label: string
    icon: React.ReactNode
    module: string
    sessions: SessionItem[]
    openingId: string | null
    deletingIds: Set<string>
    isClearing: boolean
    onOpen: (id: string, module: string) => void
    onDelete: (id: string) => void
    onClear: (module: string) => void
}) {
    const [confirmOpen, setConfirmOpen] = useState(false)

    if (sessions.length === 0) return null

    return (
        <div className="space-y-3">
            {/* Row header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-foreground/60">
                    {icon}
                    <span>{label}</span>
                    <span className="font-normal normal-case tracking-normal text-muted-foreground/45 ml-0.5">
                        ({sessions.length})
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[0.73rem] text-muted-foreground/50 hover:text-destructive hover:bg-destructive/5"
                    onClick={() => setConfirmOpen(true)}
                    disabled={isClearing}
                >
                    {isClearing && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                    Limpiar todo
                </Button>
            </div>

            {/* Cards grid — responsive cols */}
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-2.5">
                {sessions.map((s) => (
                    <SessionCard
                        key={s._id}
                        session={s}
                        isOpening={openingId === s._id}
                        isDeleting={deletingIds.has(s._id)}
                        onOpen={() => onOpen(s._id, module)}
                        onDelete={() => onDelete(s._id)}
                    />
                ))}
            </div>

            {/* Confirm clear dialog */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="max-w-[min(92vw,22rem)] rounded-[1.5rem] border border-border/70 p-0 shadow-[0_40px_100px_-58px_rgba(15,23,42,0.42)]">
                    <DialogHeader className="gap-2 px-6 pb-3 pt-5 text-left">
                        <DialogTitle className="text-[1rem] font-semibold">
                            Limpiar sesiones de {label.toLowerCase()}
                        </DialogTitle>
                        <DialogDescription className="text-[0.88rem] leading-relaxed text-muted-foreground">
                            Se eliminarán las {sessions.length} sesiones de este módulo para este kit. Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 px-6 pb-5 pt-0 sm:justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => { onClear(module); setConfirmOpen(false) }}
                        >
                            Eliminar todas
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ─── BrandKitSessionsSection ──────────────────────────────────────────────────

export function BrandKitSessionsSection({ brandId }: BrandKitSessionsSectionProps) {
    const { user } = useUser()
    const router = useRouter()

    const [openingId, setOpeningId] = useState<string | null>(null)
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
    const [clearingModule, setClearingModule] = useState<string | null>(null)

    const convexBrandId = brandId as Id<'brand_dna'>
    const queryArgs = user?.id && brandId
        ? { user_id: user.id, brand_id: convexBrandId, limit: 40 }
        : 'skip' as const

    const imageSessions = useQuery(
        api.work_sessions.listSessions,
        queryArgs !== 'skip' ? { ...queryArgs, module: 'image' } : 'skip',
    ) as SessionItem[] | undefined

    const carouselSessions = useQuery(
        api.work_sessions.listSessions,
        queryArgs !== 'skip' ? { ...queryArgs, module: 'carousel' } : 'skip',
    ) as SessionItem[] | undefined

    const activateSession = useMutation(api.work_sessions.activateSession)
    const deleteSession = useMutation(api.work_sessions.deleteSession)
    const clearSessions = useMutation(api.work_sessions.clearSessions)

    const handleOpen = async (sessionId: string, module: string) => {
        if (!user?.id || openingId) return
        setOpeningId(sessionId)
        try {
            await activateSession({
                user_id: user.id,
                session_id: sessionId as Id<'work_sessions'>,
            })
            router.push(module === 'image' ? '/image' : '/carousel')
        } finally {
            setOpeningId(null)
        }
    }

    const handleDelete = async (sessionId: string) => {
        if (!user?.id || deletingIds.has(sessionId)) return
        setDeletingIds((prev) => new Set([...prev, sessionId]))
        try {
            await deleteSession({
                user_id: user.id,
                session_id: sessionId as Id<'work_sessions'>,
            })
        } finally {
            setDeletingIds((prev) => {
                const next = new Set(prev)
                next.delete(sessionId)
                return next
            })
        }
    }

    const handleClear = async (module: string) => {
        if (!user?.id || !brandId || clearingModule) return
        setClearingModule(module)
        try {
            await clearSessions({
                user_id: user.id,
                module,
                brand_id: convexBrandId,
            })
        } finally {
            setClearingModule(null)
        }
    }

    const isLoading = imageSessions === undefined || carouselSessions === undefined
    const hasImage = (imageSessions?.length ?? 0) > 0
    const hasCarousel = (carouselSessions?.length ?? 0) > 0
    const isEmpty = !isLoading && !hasImage && !hasCarousel

    return (
        <div className={cn(BRAND_KIT_PAGE_SHELL_CLASS, 'p-5 space-y-6')}>
            {/* Section title */}
            <div className={cn(BRAND_KIT_PANEL_HEADER_CLASS, 'px-0 pt-0 pb-0')}>
                <div className={BRAND_KIT_PANEL_TITLE_CLASS}>
                    <IconHistory className={BRAND_KIT_PANEL_HEADER_ICON_CLASS} />
                    Sesiones de trabajo
                </div>
            </div>

            {/* Empty state */}
            {isEmpty && (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                    <div className="flex items-center gap-3 text-muted-foreground/40">
                        <IconImage className="h-6 w-6" />
                        <IconCarousel className="h-6 w-6" />
                    </div>
                    <p className="text-[0.84rem] text-muted-foreground/55">
                        Aún no hay sesiones vinculadas a este kit
                    </p>
                    <p className="text-[0.76rem] text-muted-foreground/40">
                        Las sesiones de imagen y carrusel que crees con este kit aparecerán aquí
                    </p>
                </div>
            )}

            {/* Loading shimmer */}
            {isLoading && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="aspect-square rounded-[1.1rem] bg-[hsl(var(--surface-alt))] animate-pulse" />
                    ))}
                </div>
            )}

            {!isLoading && (
                <>
                    <ModuleRow
                        label="Imagen"
                        icon={<IconImage className="h-3.5 w-3.5" />}
                        module="image"
                        sessions={imageSessions ?? []}
                        openingId={openingId}
                        deletingIds={deletingIds}
                        isClearing={clearingModule === 'image'}
                        onOpen={handleOpen}
                        onDelete={handleDelete}
                        onClear={handleClear}
                    />

                    <ModuleRow
                        label="Carrusel"
                        icon={<IconCarousel className="h-3.5 w-3.5" />}
                        module="carousel"
                        sessions={carouselSessions ?? []}
                        openingId={openingId}
                        deletingIds={deletingIds}
                        isClearing={clearingModule === 'carousel'}
                        onOpen={handleOpen}
                        onDelete={handleDelete}
                        onClear={handleClear}
                    />
                </>
            )}
        </div>
    )
}
