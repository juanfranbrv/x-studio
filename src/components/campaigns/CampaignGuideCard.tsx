'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import type { BrandDNA } from '@/lib/brand-types'
import type { CampaignAssistantBrief } from '@/lib/campaigns/assistant'
import { getCopyPromptButtonPresentation } from '@/lib/campaigns/copy-feedback'
import { CampaignAssistantWizard } from './CampaignAssistantWizard'

type Props = {
    activeBrandKit: BrandDNA | null
}

export function CampaignGuideCard({ activeBrandKit }: Props) {
    const { toast } = useToast()
    const [assistantOpen, setAssistantOpen] = useState(false)
    const [prompt, setPrompt] = useState<string | null>(null)
    const [summary, setSummary] = useState<string | null>(null)
    const [brief, setBrief] = useState<CampaignAssistantBrief | undefined>()
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)
    const copyFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        setBrief(undefined)
    }, [activeBrandKit?.id])

    useEffect(() => () => {
        if (copyFeedbackTimer.current) clearTimeout(copyFeedbackTimer.current)
    }, [])

    const copyPrompt = async () => {
        if (!prompt) return
        try {
            await navigator.clipboard.writeText(prompt)
            setCopied(true)
            if (copyFeedbackTimer.current) clearTimeout(copyFeedbackTimer.current)
            copyFeedbackTimer.current = setTimeout(() => {
                setCopied(false)
                copyFeedbackTimer.current = null
            }, 2000)
            toast({ title: 'Mega prompt copiado' })
        } catch {
            toast({ title: 'No se pudo copiar', variant: 'destructive' })
        }
    }

    const copyButton = getCopyPromptButtonPresentation(copied)

    const downloadPrompt = () => {
        if (!prompt) return
        const blob = new Blob([prompt], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'instrucciones-campana.md'
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
    }

    const loadTechnicalGuide = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/v1/campaign-guide')
            const data = await response.json()
            if (!response.ok || !data.ok) throw new Error(data.error?.message || 'No se pudo generar la guía técnica.')
            setPrompt(data.prompt as string)
            setSummary(data.summary as string)
            toast({ title: 'Guía técnica preparada' })
        } catch (error) {
            toast({ title: error instanceof Error ? error.message : 'No se pudo generar la guía', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    if (assistantOpen) {
        return (
            <CampaignAssistantWizard
                brand={activeBrandKit}
                initialBrief={brief}
                onCancel={() => setAssistantOpen(false)}
                onGenerated={(generatedPrompt, generatedSummary, generatedBrief) => {
                    setBrief(generatedBrief)
                    setPrompt(generatedPrompt)
                    setSummary(generatedSummary)
                    setAssistantOpen(false)
                }}
            />
        )
    }

    return (
        <section className="rounded-[1.45rem] border border-border/60 bg-background/86 p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Kit aplicado: {activeBrandKit?.brand_name || 'Sin kit seleccionado'}</p>
                    <h2 className="text-base font-semibold">Diseñar la campaña con un asistente</h2>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                        Responde al briefing y obtén las instrucciones para que un agente externo prepare y ofrezca dos ficheros descargables con nombres significativos: uno Markdown para uso manual y otro JSON para PostLaboratory.
                    </p>
                    {summary ? <p className="text-xs text-muted-foreground">Catálogo incluido: {summary}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" onClick={() => setAssistantOpen(true)} disabled={!activeBrandKit?.id}>
                        Crear campaña
                    </Button>
                    <Button type="button" variant="outline" onClick={loadTechnicalGuide} disabled={loading}>
                        {loading ? 'Preparando…' : 'Guía técnica'}
                    </Button>
                </div>
            </div>

            {prompt ? (
                <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">Instrucciones listas para el agente externo</p>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={downloadPrompt}>Descargar Markdown</Button>
                            <Button type="button" size="sm" onClick={copyPrompt} disabled={copyButton.disabled} aria-live="polite">
                                {copyButton.label}
                            </Button>
                        </div>
                    </div>
                    <textarea readOnly value={prompt} className="min-h-[220px] w-full resize-y rounded-lg border border-border bg-background p-3 font-mono text-xs text-foreground outline-none" aria-label="Mega prompt generado" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => setAssistantOpen(true)}>Editar briefing</Button>
                </div>
            ) : null}
        </section>
    )
}
