'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export type JobItem = {
    ref: string
    status: string
    asset_key?: string | null
    scheduled_at?: string | null
    error?: string | null
}

/**
 * Miniaturas de lo que lleva generado un lote, ampliables al pulsarlas.
 *
 * Se cargan aparte del listado de lotes porque el resumen no trae las
 * imagenes, y pedirlas para todos los lotes a la vez seria gastar ancho de
 * banda en campanas que quiza no se estan mirando.
 */
export function CampaignJobThumbnails({ jobId, refreshKey }: { jobId: string; refreshKey: number }) {
    const [items, setItems] = useState<JobItem[]>([])
    const [ampliada, setAmpliada] = useState<JobItem | null>(null)

    useEffect(() => {
        // El guard evita actualizar el estado si el lote deja de mostrarse
        // mientras la peticion estaba en vuelo.
        let vigente = true

        const cargar = async () => {
            try {
                const data = await fetch(`/api/v1/campaigns/${jobId}`).then((r) => r.json())
                if (vigente && data.ok) {
                    setItems((data.items as JobItem[]).filter((item) => item.asset_key))
                }
            } catch {
                // Silencioso: las miniaturas son un extra y no deben romper la lista.
            }
        }

        void cargar()
        return () => {
            vigente = false
        }
    }, [jobId, refreshKey])

    if (items.length === 0) return null

    return (
        <>
            <div className="mt-3 flex flex-wrap gap-2">
                {items.map((item) => (
                    <button
                        key={item.ref}
                        type="button"
                        onClick={() => setAmpliada(item)}
                        title={`${item.ref} — pulsa para ampliar`}
                        className="group relative size-16 overflow-hidden rounded-lg border border-border/60 transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={item.asset_key as string}
                            alt={item.ref}
                            loading="lazy"
                            className="size-full object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-[9px] font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            {item.ref}
                        </span>
                    </button>
                ))}
            </div>

            <Dialog open={Boolean(ampliada)} onOpenChange={(open) => !open && setAmpliada(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-baseline gap-3">
                            {ampliada?.ref}
                            {ampliada?.scheduled_at ? (
                                <span className="text-xs font-normal text-muted-foreground">
                                    {new Date(ampliada.scheduled_at).toLocaleString('es-ES', {
                                        day: 'numeric',
                                        month: 'long',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </span>
                            ) : null}
                        </DialogTitle>
                    </DialogHeader>
                    {ampliada?.asset_key ? (
                        <div className="space-y-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={ampliada.asset_key}
                                alt={ampliada.ref}
                                className="max-h-[70vh] w-full rounded-xl object-contain"
                            />
                            <a
                                href={ampliada.asset_key}
                                download={`${ampliada.ref}.png`}
                                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                            >
                                Descargar solo esta imagen
                            </a>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </>
    )
}
