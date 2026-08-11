'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from '@/components/ui/spinner'
import { IconPlus } from '@/components/ui/icons'

type Issue = { path: string; message: string; ref?: string }

type Props = {
    onEnqueued: () => void
}

/**
 * Entrada del lote: se pega o se suelta el manifiesto, se comprueba y se
 * encola.
 *
 * La comprobacion previa (`dry_run`) no es un adorno: valida el lote entero
 * sin generar ni gastar creditos, y con 60 publicaciones enterarse antes de
 * empezar es la diferencia entre corregir una linea y tirar una campana.
 */
export function CampaignManifestForm({ onEnqueued }: Props) {
    const { toast } = useToast()
    const inputFichero = useRef<HTMLInputElement>(null)
    const [texto, setTexto] = useState('')
    const [ocupado, setOcupado] = useState(false)
    const [issues, setIssues] = useState<Issue[]>([])
    const [resumen, setResumen] = useState<string | null>(null)

    const parsear = (): unknown | null => {
        try {
            return JSON.parse(texto)
        } catch (error) {
            setIssues([{ path: '', message: `El fichero no es JSON válido: ${(error as Error).message}` }])
            setResumen(null)
            return null
        }
    }

    const enviar = async (dryRun: boolean) => {
        const manifest = parsear()
        if (!manifest) return

        setOcupado(true)
        setIssues([])
        setResumen(null)

        try {
            const response = await fetch('/api/v1/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ manifest, dry_run: dryRun }),
            })
            const data = await response.json()

            if (!data.ok) {
                setIssues(data.error?.issues ?? [{ path: '', message: data.error?.message || 'Error desconocido.' }])
                toast({
                    title: dryRun ? 'La campaña tiene errores' : 'No se pudo encolar',
                    description: data.error?.message,
                    variant: 'destructive',
                })
                return
            }

            if (dryRun) {
                setResumen(`${data.total} publicaciones · marca ${data.brand?.name ?? '—'}`)
                toast({
                    title: 'Campaña correcta',
                    description: `${data.total} publicaciones listas para generar.`,
                })
                return
            }

            toast({ title: 'Campaña encolada', description: `${data.total} publicaciones en cola.` })
            setTexto('')
            onEnqueued()
        } catch (error) {
            toast({
                title: 'Error de red',
                description: error instanceof Error ? error.message : undefined,
                variant: 'destructive',
            })
        } finally {
            setOcupado(false)
        }
    }

    const leerFichero = async (file: File | undefined) => {
        if (!file) return
        setTexto(await file.text())
        setIssues([])
        setResumen(null)
    }

    return (
        <section className="space-y-3 rounded-[1.45rem] border border-border/60 bg-background/86 p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold">La campaña</h2>
                <input
                    ref={inputFichero}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => leerFichero(e.target.files?.[0])}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => inputFichero.current?.click()}>
                    Abrir fichero
                </Button>
            </div>

            <Textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onDrop={async (e) => {
                    e.preventDefault()
                    await leerFichero(e.dataTransfer.files?.[0])
                }}
                placeholder='Pega aquí el manifiesto de la campaña, o suelta el fichero .json'
                className="min-h-[220px] font-mono text-xs"
            />

            {resumen ? (
                <p className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
                    Comprobada: {resumen}. Nada generado todavía.
                </p>
            ) : null}

            {issues.length > 0 ? (
                <div className="space-y-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                    <p className="text-sm font-medium text-destructive">
                        {issues.length} problema{issues.length > 1 ? 's' : ''} que impiden empezar:
                    </p>
                    <ul className="max-h-52 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                        {issues.map((issue, index) => (
                            <li key={`${issue.path}-${index}`}>
                                {issue.ref ? <span className="font-mono font-medium">{issue.ref}</span> : null}
                                {issue.ref ? ' · ' : null}
                                {issue.message}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={() => enviar(true)} disabled={ocupado || !texto.trim()}>
                    {ocupado ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Comprobar sin generar
                </Button>
                <Button type="button" onClick={() => enviar(false)} disabled={ocupado || !texto.trim()}>
                    <IconPlus className="mr-2 size-4" />
                    Encolar campaña
                </Button>
                <span className="text-xs text-muted-foreground">
                    Encolar no genera nada todavía: las imágenes se lanzan desde la lista de abajo.
                </span>
            </div>
        </section>
    )
}
