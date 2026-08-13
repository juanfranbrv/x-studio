'use client'

import { useEffect, useState } from 'react'
import { useAction, useQuery } from 'convex/react'
import { useUser } from '@clerk/nextjs'
import { CheckCircle2 } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from '@/components/ui/spinner'
import { useToast } from '@/hooks/use-toast'
import { ScheduleChannelPicker } from './ScheduleChannelPicker'
import { api } from '../../../convex/_generated/api'
import type { PostizIntegration } from '../../../convex/lib/postiz/types'

interface ScheduleToPostizDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** `image:{sessionId}:{generationId}`, el mismo formato de convex/contentLibrary.shared.ts */
    assetKey: string
    imageUrl: string
    initialContent: string
}

function defaultScheduleDate(): string {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yyyy = tomorrow.getFullYear()
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0')
    const dd = String(tomorrow.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

/** Convierte fecha y hora locales en ISO con desplazamiento explicito (+02:00). */
const componerFecha = (dia: string, hora: string) => {
    const local = new Date(`${dia}T${hora}:00`)
    const desfaseMin = -local.getTimezoneOffset()
    const signo = desfaseMin >= 0 ? '+' : '-'
    const abs = Math.abs(desfaseMin)
    const hh = String(Math.floor(abs / 60)).padStart(2, '0')
    const mm = String(abs % 60).padStart(2, '0')
    return `${dia}T${hora}:00${signo}${hh}:${mm}`
}

export function ScheduleToPostizDialog({
    open,
    onOpenChange,
    assetKey,
    imageUrl,
    initialContent,
}: ScheduleToPostizDialogProps) {
    const { user } = useUser()
    const { toast } = useToast()
    const listChannelsAction = useAction(api.postiz.listChannels)
    const scheduleImageAction = useAction(api.postiz.scheduleImage)

    // undefined mientras carga o esta en 'skip', null si no hay anotacion previa.
    const annotation = useQuery(
        api.contentLibrary.getAnnotation,
        open && user?.id ? { user_id: user.id, asset_key: assetKey } : 'skip',
    )
    const annotationLoading = open && Boolean(user?.id) && annotation === undefined

    const [channels, setChannels] = useState<PostizIntegration[] | null>(null)
    const [channelsLoading, setChannelsLoading] = useState(false)
    const [channelsError, setChannelsError] = useState<string | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [content, setContent] = useState('')
    const [date, setDate] = useState(defaultScheduleDate)
    const [time, setTime] = useState('09:30')
    const [confirmReschedule, setConfirmReschedule] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // Reinicia el formulario cada vez que el dialogo se abre (el componente
    // sigue montado entre aperturas, solo cambia `open`).
    useEffect(() => {
        if (!open) return
        setContent(initialContent)
        setSelectedIds(new Set())
        setDate(defaultScheduleDate())
        setTime('09:30')
        setConfirmReschedule(false)
        setSubmitError(null)
        setSuccess(false)
    }, [open, initialContent])

    useEffect(() => {
        if (!open) return
        let cancelled = false
        setChannelsLoading(true)
        setChannelsError(null)
        listChannelsAction({})
            .then((result) => {
                if (cancelled) return
                if (result.ok) {
                    setChannels(result.channels)
                } else {
                    setChannels([])
                    setChannelsError(result.error)
                }
            })
            .catch(() => {
                if (cancelled) return
                setChannels([])
                setChannelsError('No se pudieron cargar los canales de Postiz.')
            })
            .finally(() => {
                if (!cancelled) setChannelsLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [open, listChannelsAction])

    const toggleChannel = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const alreadyScheduled = Boolean(annotation?.postiz_group_id)
    const needsRescheduleConfirm = alreadyScheduled && !confirmReschedule

    const handleConfirm = async () => {
        setSubmitError(null)

        if (selectedIds.size === 0) {
            setSubmitError('Selecciona al menos un canal antes de programar.')
            return
        }
        if (!content.trim()) {
            setSubmitError('Escribe el texto de la publicación.')
            return
        }
        if (needsRescheduleConfirm) {
            setSubmitError('Marca la casilla para confirmar que quieres reprogramarla.')
            return
        }

        const composedDate = componerFecha(date, time)
        if (new Date(composedDate).getTime() <= Date.now()) {
            setSubmitError('La fecha tiene que ser futura.')
            return
        }

        const targets = (channels || [])
            .filter((channel) => selectedIds.has(channel.id))
            .map((channel) => ({ integrationId: channel.id, identifier: channel.identifier }))

        setSubmitting(true)
        try {
            const result = await scheduleImageAction({
                asset_key: assetKey,
                image_url: imageUrl,
                content: content.trim(),
                date: composedDate,
                targets,
            })
            if (result.ok) {
                toast({ title: 'Publicación programada en Postiz.' })
                setSuccess(true)
                setTimeout(() => onOpenChange(false), 1400)
            } else {
                setSubmitError(result.error)
            }
        } catch {
            setSubmitError('No se pudo completar la operación con Postiz.')
        } finally {
            setSubmitting(false)
        }
    }

    const confirmDisabled =
        submitting ||
        success ||
        channelsLoading ||
        Boolean(channelsError) ||
        needsRescheduleConfirm ||
        annotationLoading

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (submitting) return
                onOpenChange(next)
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Programar en Postiz</DialogTitle>
                    <DialogDescription>
                        Elige los canales, revisa el texto y la fecha de publicación.
                    </DialogDescription>
                </DialogHeader>

                {success ? (
                    <div className="flex flex-col items-center gap-2 py-6 text-center">
                        <CheckCircle2 className="h-8 w-8 text-primary" />
                        <p className="text-sm font-medium">Publicación programada correctamente.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {alreadyScheduled && (
                            <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm">
                                <p className="font-medium">Esta pieza ya está programada</p>
                                {annotation?.planned_at && (
                                    <p className="text-muted-foreground">
                                        Fecha actual: {new Date(annotation.planned_at).toLocaleString('es-ES')}
                                    </p>
                                )}
                                <Label className="mt-2 cursor-pointer font-normal">
                                    <Checkbox
                                        checked={confirmReschedule}
                                        onCheckedChange={(checked) => setConfirmReschedule(checked === true)}
                                    />
                                    Confirmo que quiero volver a programarla
                                </Label>
                            </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="postiz-content">Texto de la publicación</Label>
                            <Textarea
                                id="postiz-content"
                                value={content}
                                onChange={(event) => setContent(event.target.value)}
                                rows={5}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Canales</Label>
                            <ScheduleChannelPicker
                                channels={channels}
                                selectedIds={selectedIds}
                                onToggle={toggleChannel}
                                isLoading={channelsLoading}
                                error={channelsError}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="postiz-date">Fecha</Label>
                                <Input
                                    id="postiz-date"
                                    type="date"
                                    value={date}
                                    onChange={(event) => setDate(event.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="postiz-time">Hora</Label>
                                <Input
                                    id="postiz-time"
                                    type="time"
                                    value={time}
                                    onChange={(event) => setTime(event.target.value)}
                                />
                            </div>
                        </div>

                        {submitError && <p className="text-sm text-destructive">{submitError}</p>}
                    </div>
                )}

                {!success && (
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={submitting}
                        >
                            Cancelar
                        </Button>
                        <Button type="button" onClick={handleConfirm} disabled={confirmDisabled}>
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5" />
                                    Programando...
                                </>
                            ) : (
                                'Programar'
                            )}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}
