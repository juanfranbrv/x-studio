'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from '@/components/ui/spinner'
import { IconRefresh, IconDelete, IconClose } from '@/components/ui/icons'
import { CampaignJobThumbnails } from '@/components/campaigns/CampaignJobThumbnails'

export type CampaignJob = {
    job_id: string
    name: string
    status: string
    total: number
    completed: number
    failed: number
    created_at: string
}

const ESTADOS: Record<string, { etiqueta: string; clase: string }> = {
    queued: { etiqueta: 'En cola', clase: 'bg-muted text-muted-foreground' },
    running: { etiqueta: 'Generando', clase: 'bg-primary/10 text-primary' },
    done: { etiqueta: 'Terminada', clase: 'bg-emerald-500/10 text-emerald-600' },
    failed: { etiqueta: 'Con fallos', clase: 'bg-destructive/10 text-destructive' },
    cancelled: { etiqueta: 'Cancelada', clase: 'bg-muted text-muted-foreground' },
}

export function CampaignJobList({ jobs, onRefresh }: { jobs: CampaignJob[]; onRefresh: () => void }) {
    const { toast } = useToast()
    const [ocupado, setOcupado] = useState<string | null>(null)
    const [deteniendo, setDeteniendo] = useState<string | null>(null)
    // Se procesa por tandas y se encadenan solas: asi ninguna peticion se
    // acerca al limite de tiempo del servidor con lotes largos.
    const enMarcha = useRef<Set<string>>(new Set())
    // Lotes cuya generacion ha pedido detenerse el usuario.
    const abortados = useRef<Set<string>>(new Set())
    // Cambia en cada refresco para que las miniaturas se recarguen solas
    // mientras el lote avanza.
    const [tick, setTick] = useState(0)

    useEffect(() => {
        setTick((valor) => valor + 1)
    }, [jobs])

    const procesarTanda = useCallback(async (jobId: string): Promise<number> => {
        const response = await fetch(`/api/v1/campaigns/${jobId}/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ max: 4 }),
        })
        const data = await response.json()
        if (!data.ok) throw new Error(data.error?.message || 'Error generando')
        return typeof data.remaining === 'number' ? data.remaining : 0
    }, [])

    const generar = async (job: CampaignJob) => {
        if (enMarcha.current.has(job.job_id)) return
        enMarcha.current.add(job.job_id)
        abortados.current.delete(job.job_id)
        setOcupado(job.job_id)

        try {
            let restantes = 1
            while (restantes > 0) {
                // Se comprueba entre tandas, no dentro: la tanda en curso se
                // deja terminar para no tirar imagenes ya pagadas.
                if (abortados.current.has(job.job_id)) {
                    toast({ title: 'Generación detenida', description: 'Lo ya generado se conserva.' })
                    return
                }
                restantes = await procesarTanda(job.job_id)
                onRefresh()
            }
            toast({ title: 'Campaña generada', description: job.name })
        } catch (error) {
            toast({
                title: 'Se detuvo la generación',
                description: error instanceof Error ? error.message : undefined,
                variant: 'destructive',
            })
        } finally {
            enMarcha.current.delete(job.job_id)
            abortados.current.delete(job.job_id)
            setOcupado(null)
            onRefresh()
        }
    }

    /**
     * Detener no es solo cancelar en el servidor: hay que cortar tambien el
     * bucle de tandas del navegador, o seguiria pidiendo la siguiente.
     */
    const detener = async (job: CampaignJob) => {
        abortados.current.add(job.job_id)
        setDeteniendo(job.job_id)
        try {
            await fetch(`/api/v1/campaigns/${job.job_id}/cancel`, { method: 'POST' })
            toast({
                title: 'Generación abortada',
                description: 'Las publicaciones ya generadas se conservan y puedes descargarlas.',
            })
            onRefresh()
        } finally {
            setDeteniendo(null)
        }
    }

    const descargar = (job: CampaignJob) => {
        // Se navega al endpoint: el navegador gestiona la descarga del ZIP.
        window.location.href = `/api/v1/campaigns/${job.job_id}/export`
    }

    if (jobs.length === 0) {
        return (
            <p className="rounded-[1.45rem] border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                Todavía no has encolado ninguna campaña.
            </p>
        )
    }

    return (
        <div className="space-y-2">
            {jobs.map((job) => {
                const estado = ESTADOS[job.status] ?? ESTADOS.queued
                const hechas = job.completed + job.failed
                const porcentaje = job.total > 0 ? Math.round((hechas / job.total) * 100) : 0
                const pendientes = job.total - hechas
                const trabajando = ocupado === job.job_id

                return (
                    <article key={job.job_id} className="rounded-[1.2rem] border border-border/60 bg-background/86 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="truncate text-sm font-semibold">{job.name}</h3>
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${estado.clase}`}>
                                        {estado.etiqueta}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {job.completed} de {job.total} generadas
                                    {job.failed > 0 ? ` · ${job.failed} con fallo` : ''}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {pendientes > 0 && job.status !== 'cancelled' ? (
                                    <Button type="button" size="sm" onClick={() => generar(job)} disabled={trabajando}>
                                        {trabajando ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                                        {trabajando ? 'Generando...' : `Generar ${pendientes}`}
                                    </Button>
                                ) : null}

                                {job.completed > 0 ? (
                                    <Button type="button" size="sm" variant="outline" onClick={() => descargar(job)}>
                                        Descargar ZIP
                                    </Button>
                                ) : null}

                                {job.failed > 0 ? (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={async () => {
                                            await fetch(`/api/v1/campaigns/${job.job_id}/retry`, { method: 'POST' })
                                            onRefresh()
                                        }}
                                        disabled={trabajando}
                                    >
                                        <IconRefresh className="mr-2 size-4" />
                                        Reintentar fallidas
                                    </Button>
                                ) : null}

                                {pendientes > 0 && job.status !== 'cancelled' ? (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={trabajando ? 'destructive' : 'ghost'}
                                        onClick={() => detener(job)}
                                        disabled={deteniendo === job.job_id}
                                        title={trabajando ? 'Detener la generación' : 'Cancelar las pendientes'}
                                    >
                                        {deteniendo === job.job_id ? (
                                            <Loader2 className="size-4 animate-spin" />
                                        ) : trabajando ? (
                                            <>
                                                <IconClose className="mr-2 size-4" />
                                                Detener
                                            </>
                                        ) : (
                                            <IconDelete className="size-4" />
                                        )}
                                    </Button>
                                ) : null}
                            </div>
                        </div>

                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-primary transition-all duration-500"
                                style={{ width: `${porcentaje}%` }}
                            />
                        </div>

                        {job.completed > 0 ? (
                            <CampaignJobThumbnails jobId={job.job_id} refreshKey={tick} />
                        ) : null}
                    </article>
                )
            })}
        </div>
    )
}

/** Recarga la lista de lotes mientras haya alguno en marcha. */
export function useCampaignJobs() {
    const [jobs, setJobs] = useState<CampaignJob[]>([])
    const [cargando, setCargando] = useState(true)

    const refrescar = useCallback(async () => {
        try {
            const data = await fetch('/api/v1/campaigns').then((r) => r.json())
            if (data.ok) setJobs(data.jobs as CampaignJob[])
        } finally {
            setCargando(false)
        }
    }, [])

    useEffect(() => {
        refrescar()
    }, [refrescar])

    return { jobs, cargando, refrescar }
}
