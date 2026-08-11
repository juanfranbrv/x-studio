'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { IconSparkles, IconRefresh } from '@/components/ui/icons'
import { Loader2 } from '@/components/ui/spinner'

/**
 * Entrega el prompt con el que disenar una campana.
 *
 * El texto se pide al servidor en lugar de estar escrito aqui: incrusta los
 * catalogos reales (marcas, estilos, formatos, layouts) y esos cambian. Una
 * guia escrita a mano quedaria desfasada en cuanto se anadiera un estilo.
 */
export function CampaignGuideCard() {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [summary, setSummary] = useState<string | null>(null)

    const obtenerGuia = async (): Promise<string | null> => {
        const response = await fetch('/api/v1/campaign-guide')
        const data = await response.json()
        if (!data.ok) {
            toast({
                title: 'No se pudo generar la guía',
                description: data.error?.message || 'Inténtalo de nuevo.',
                variant: 'destructive',
            })
            return null
        }
        setSummary(data.summary)
        return data.prompt as string
    }

    const copiar = async () => {
        setLoading(true)
        try {
            const prompt = await obtenerGuia()
            if (!prompt) return
            await navigator.clipboard.writeText(prompt)
            toast({
                title: 'Guía copiada',
                description: 'Pégala en tu IA y descríbele la campaña que quieres.',
            })
        } catch {
            toast({ title: 'No se pudo copiar', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    const descargar = async () => {
        setLoading(true)
        try {
            const prompt = await obtenerGuia()
            if (!prompt) return
            const blob = new Blob([prompt], { type: 'text/plain;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const enlace = document.createElement('a')
            enlace.href = url
            enlace.download = 'guia-campana.txt'
            document.body.appendChild(enlace)
            enlace.click()
            enlace.remove()
            URL.revokeObjectURL(url)
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="rounded-[1.45rem] border border-border/60 bg-background/86 p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <h2 className="flex items-center gap-2 text-base font-semibold">
                        <IconSparkles className="size-4 text-primary" />
                        Guía para diseñar la campaña
                    </h2>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                        Copia este texto, pégalo en tu IA de confianza y descríbele la campaña. Te devolverá
                        el fichero que puedes soltar aquí abajo. Incluye tus marcas, estilos y formatos
                        actuales, así que siempre está al día.
                    </p>
                    {summary ? (
                        <p className="text-xs text-muted-foreground">Catálogo incluido: {summary}</p>
                    ) : null}
                </div>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={descargar} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <IconRefresh className="mr-2 size-4" />}
                        Descargar
                    </Button>
                    <Button type="button" onClick={copiar} disabled={loading}>
                        Copiar guía
                    </Button>
                </div>
            </div>
        </section>
    )
}
