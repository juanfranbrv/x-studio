'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { BrandDNA } from '@/lib/brand-types'
import { CAMPAIGN_IMAGE_FORMATS, getCampaignPostsPerDay, normalizeCampaignChannels, toggleCampaignStyleValue, validateCampaignAssistantBrief, type CampaignAssistantBrief, type CampaignDecision, type CampaignDecisionMode } from '@/lib/campaigns/assistant'
import type { GuideCatalog } from '@/lib/campaigns/guide'
import { getBrandSlug, getCanonicalBrandId } from '@/lib/brand-kit-identity'
import { ChoiceList } from './CampaignAssistantControls'

type Props = {
    brand: BrandDNA | null
    initialBrief?: CampaignAssistantBrief
    onGenerated: (prompt: string, summary: string, brief: CampaignAssistantBrief) => void
    onCancel: () => void
}

const STEPS = ['Objetivo', 'Audiencia', 'Canales', 'Estilo y restricciones', 'Revisión']

function splitLines(value: string): string[] {
    return value
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
}

function joinLines(values?: string[]): string {
    return values?.join('\n') ?? ''
}

function createDecision(mode: CampaignDecisionMode, values: string[] = []): CampaignDecision {
    return { mode, values }
}

export function CampaignAssistantWizard({ brand, initialBrief, onGenerated, onCancel }: Props) {
    const [step, setStep] = useState(0)
    const [brief, setBrief] = useState<CampaignAssistantBrief>(() => ({
        objective: '',
        pillars: [],
        callsToAction: [],
        keywords: [],
        metrics: [],
        formats: createDecision('locked'),
        style: createDecision('allowed'),
        ...initialBrief,
        period: { ...initialBrief?.period },
        channels: normalizeCampaignChannels(initialBrief?.channels),
    }))
    const [catalog, setCatalog] = useState<GuideCatalog | null>(null)
    const [loadingCatalog, setLoadingCatalog] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        const loadCatalog = async () => {
            try {
                const response = await fetch('/api/v1/campaign-guide')
                const data = await response.json()
                if (!response.ok || !data.ok) throw new Error(data.error?.message || 'No se pudo cargar el catálogo.')
                if (!cancelled) setCatalog(data.catalog as GuideCatalog)
            } catch (loadError) {
                if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el catálogo.')
            } finally {
                if (!cancelled) setLoadingCatalog(false)
            }
        }

        void loadCatalog()
        return () => {
            cancelled = true
        }
    }, [])

    const updateBrief = (patch: Partial<CampaignAssistantBrief>) => {
        setBrief((current) => ({ ...current, ...patch }))
        setError(null)
    }

    const toggleChannel = (platform: string) => {
        const current = brief.channels ?? []
        const existing = current.find((channel) => channel.platform === platform)
        const next = existing
            ? current.filter((channel) => channel.platform !== platform)
            : [...current, { platform, postsPerDay: 1 }]
        updateBrief({ channels: next })
    }

    const setChannelFrequency = (platform: string, value: string) => {
        const postsPerDay = Math.max(1, Number(value) || 1)
        updateBrief({
            channels: (brief.channels ?? []).map((channel) => (
                channel.platform === platform ? { platform: channel.platform, postsPerDay } : channel
            )),
        })
    }

    const canContinue = step === 0 ? Boolean(brief.objective.trim()) : true

    const siguiente = () => {
        if (!canContinue) {
            setError('El objetivo principal es necesario para continuar.')
            return
        }
        setError(null)
        setStep((current) => Math.min(current + 1, STEPS.length - 1))
    }

    const anterior = () => {
        setError(null)
        setStep((current) => Math.max(current - 1, 0))
    }

    const generar = async () => {
        const brandId = getCanonicalBrandId(brand)
        const brandSlug = getBrandSlug(brand)
        if (!brandId && !brandSlug) {
            setError('No hay un kit de marca activo.')
            return
        }
        const briefError = validateCampaignAssistantBrief(brief)
        if (briefError) {
            setStep(brief.objective.trim() ? 3 : 0)
            setError(briefError)
            return
        }

        setSubmitting(true)
        setError(null)
        try {
            const response = await fetch('/api/v1/campaign-guide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brand_id: brandId, brand_slug: brandSlug, brief }),
            })
            const data = await response.json()
            if (!response.ok || !data.ok) throw new Error(data.error?.message || 'No se pudo generar el mega prompt.')
            onGenerated(data.prompt as string, data.summary as string, brief)
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'No se pudo generar el mega prompt.')
        } finally {
            setSubmitting(false)
        }
    }

    const selectedChannels = brief.channels ?? []
    const selectedStyles = brief.style?.values ?? []
    const selectedFormat = brief.formats?.values?.[0] ?? ''
    const availableFormats = (catalog?.formats ?? []).filter((format) => Object.prototype.hasOwnProperty.call(CAMPAIGN_IMAGE_FORMATS, format.id) && format.platform === 'instagram')

    return (
        <section className="space-y-5 rounded-[1.45rem] border border-border/60 bg-background/86 p-4 md:p-5">
            <header className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <p className="text-xs text-muted-foreground">Asistente de campaña</p>
                        <h2 className="text-lg font-semibold tracking-tight">Construye el mega prompt</h2>
                    </div>
                    <span className="text-sm text-muted-foreground">Paso {step + 1} de {STEPS.length}</span>
                </div>
                <div className="flex gap-1" aria-label="Progreso del asistente">
                    {STEPS.map((label, index) => (
                        <div key={label} className={`h-1 flex-1 rounded-full ${index <= step ? 'bg-primary' : 'bg-muted'}`} title={label} />
                    ))}
                </div>
                <p className="text-sm text-muted-foreground">Kit aplicado: {brand?.brand_name || 'Sin kit seleccionado'}</p>
            </header>

            {step === 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="campaign-objective">Objetivo principal</Label>
                        <Textarea
                            id="campaign-objective"
                            value={brief.objective}
                            onChange={(event) => updateBrief({ objective: event.target.value })}
                            placeholder="Qué debe conseguir la campaña y para qué sirve"
                            className="min-h-24"
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="campaign-offer">Producto, servicio u oferta</Label>
                        <Input id="campaign-offer" value={brief.offer ?? ''} onChange={(event) => updateBrief({ offer: event.target.value })} placeholder="Qué se promociona" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="campaign-metrics">Métricas de éxito</Label>
                        <Textarea id="campaign-metrics" value={joinLines(brief.metrics)} onChange={(event) => updateBrief({ metrics: splitLines(event.target.value) })} placeholder="Una métrica por línea" />
                    </div>
                </div>
            ) : null}

            {step === 1 ? (
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                        <p className="text-sm text-muted-foreground">
                            El asistente reutiliza el público y el tono del kit. Solo necesitas concretar si esta campaña se dirige a un segmento distinto.
                        </p>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="campaign-audience">Público específico</Label>
                        <Textarea id="campaign-audience" value={brief.audience ?? ''} onChange={(event) => updateBrief({ audience: event.target.value })} placeholder="A quién nos dirigimos en esta campaña" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="campaign-tone">Tono específico de la campaña</Label>
                        <Input id="campaign-tone" value={brief.tone ?? ''} onChange={(event) => updateBrief({ tone: event.target.value })} placeholder="Déjalo vacío para usar el tono del kit" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="campaign-start">Fecha de inicio</Label>
                        <Input id="campaign-start" type="date" value={brief.period?.start ?? ''} onChange={(event) => updateBrief({ period: { ...brief.period, start: event.target.value } })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="campaign-end">Fecha de finalización</Label>
                        <Input id="campaign-end" type="date" value={brief.period?.end ?? ''} onChange={(event) => updateBrief({ period: { ...brief.period, end: event.target.value } })} />
                    </div>
                </div>
            ) : null}

            {step === 2 ? (
                <div className="space-y-5">
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label>Canales y frecuencia</Label>
                            <p className="text-sm text-muted-foreground">Indica cuántas publicaciones se harán por día en cada canal.</p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            {(catalog?.platforms ?? []).map((platform) => {
                                const selected = selectedChannels.find((channel) => channel.platform === platform)
                                return (
                                    <div key={platform} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                                        <Checkbox checked={Boolean(selected)} onCheckedChange={() => toggleChannel(platform)} id={`channel-${platform}`} />
                                        <Label htmlFor={`channel-${platform}`} className="flex-1 capitalize">{platform}</Label>
                                        {selected ? (
                                            <div className="flex items-center gap-2">
                                                <Input aria-label={`Publicaciones por día en ${platform}`} type="number" min={1} value={getCampaignPostsPerDay(selected) ?? 1} onChange={(event) => setChannelFrequency(platform, event.target.value)} className="w-20" />
                                                <span className="text-sm text-muted-foreground">por día</span>
                                            </div>
                                        ) : null}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="campaign-pillars">Pilares de contenido</Label>
                        <Textarea id="campaign-pillars" value={joinLines(brief.pillars)} onChange={(event) => updateBrief({ pillars: splitLines(event.target.value) })} placeholder="Resultados\nMétodo\nHistorias de clientes" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>CTA</Label>
                            <p className="text-sm text-muted-foreground">La redactará el agente externo y debe incluir la URL oficial del kit.</p>
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="campaign-keywords">Palabras clave de campaña</Label>
                            <Textarea id="campaign-keywords" value={joinLines(brief.keywords)} onChange={(event) => updateBrief({ keywords: splitLines(event.target.value) })} placeholder="Un término por línea" />
                        </div>
                    </div>
                </div>
            ) : null}

            {step === 3 ? (
                <div className="space-y-5">
                    <ChoiceList
                        title="Formato de imagen"
                        values={availableFormats.map((format) => ({ id: format.id, label: `${format.aspect_ratio} · ${format.name}` }))}
                        selected={selectedFormat ? [selectedFormat] : []}
                        onToggle={(value) => updateBrief({ formats: createDecision('locked', [value]) })}
                        loading={loadingCatalog}
                    />
                    <p className="text-sm text-muted-foreground">El formato elegido se repetirá en cada publicación del JSON y en cada prompt Markdown.</p>
                    <p className="text-sm text-muted-foreground">Selecciona uno o varios estilos visuales. El agente externo elegirá únicamente entre los estilos seleccionados.</p>
                    <ChoiceList title="Estilos visuales" values={catalog?.styles.map((style) => ({ id: style.slug, label: style.name })) ?? []} selected={selectedStyles} onToggle={(value) => updateBrief({ style: createDecision('allowed', toggleCampaignStyleValue(selectedStyles, value)) })} loading={loadingCatalog} />
                    <div className="space-y-2">
                        <Label htmlFor="campaign-notes">Notas y restricciones</Label>
                        <Textarea id="campaign-notes" value={brief.notes ?? ''} onChange={(event) => updateBrief({ notes: event.target.value })} placeholder="Condiciones que el agente externo debe respetar" />
                    </div>
                </div>
            ) : null}

            {step === 4 ? (
                <div className="space-y-4">
                    <div className="rounded-lg border border-border/60 p-4 text-sm">
                        <p><strong>Objetivo:</strong> {brief.objective || 'No especificado'}</p>
                        <p><strong>Periodo:</strong> {brief.period?.start || '—'} → {brief.period?.end || '—'}</p>
                        <p><strong>Canales:</strong> {selectedChannels.map((channel) => `${channel.platform} (${getCampaignPostsPerDay(channel) ?? 1}/día)`).join(', ') || 'Delegado al agente'}</p>
                        <p><strong>Pilares:</strong> {brief.pillars?.join(', ') || 'Delegados al agente'}</p>
                        <p><strong>Formato:</strong> {availableFormats.find((format) => format.id === selectedFormat)?.aspect_ratio || 'Pendiente'}</p>
                        <p><strong>Estilo:</strong> {brief.style?.mode === 'delegated' ? 'Pendiente' : selectedStyles.join(', ') || 'Pendiente'}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">El resultado será un mega prompt para el agente externo. Todavía no se generarán publicaciones ni se gastarán créditos.</p>
                </div>
            ) : null}

            {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}

            <footer className="flex flex-wrap items-center justify-between gap-2">
                <Button type="button" variant="outline" onClick={step === 0 ? onCancel : anterior}>
                    {step === 0 ? 'Cancelar' : 'Atrás'}
                </Button>
                {step < STEPS.length - 1 ? (
                    <Button type="button" onClick={siguiente} disabled={loadingCatalog && step === 3}>Continuar</Button>
                ) : (
                    <Button type="button" onClick={generar} disabled={submitting || loadingCatalog}>
                        {submitting ? 'Generando…' : 'Generar mega prompt'}
                    </Button>
                )}
            </footer>
        </section>
    )
}
