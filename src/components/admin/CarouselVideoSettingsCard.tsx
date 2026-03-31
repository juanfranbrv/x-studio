'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

type CarouselVideoSettingsCardProps = {
    adminEmail: string
    slideDurationKey: string
    lastSlideDurationKey: string
}

type AppSettingRow = {
    key: string
    value: unknown
}

function msToSecondsLabel(value: number) {
    const seconds = value / 1000
    return Number.isInteger(seconds) ? String(seconds) : seconds.toFixed(1)
}

function secondsToMs(value: string, fallback: number) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return fallback
    return Math.max(1000, Math.round(parsed * 1000))
}

export function CarouselVideoSettingsCard({
    adminEmail,
    slideDurationKey,
    lastSlideDurationKey,
}: CarouselVideoSettingsCardProps) {
    const { toast } = useToast()
    const settings = useQuery(api.admin.getSettings, adminEmail ? { admin_email: adminEmail } : 'skip') as AppSettingRow[] | undefined
    const updateSetting = useMutation(api.admin.updateSetting)
    const [slideDurationSeconds, setSlideDurationSeconds] = useState('4')
    const [lastSlideDurationSeconds, setLastSlideDurationSeconds] = useState('6')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!settings) return
        const slideDuration = settings.find((item) => item.key === slideDurationKey)?.value
        const lastSlideDuration = settings.find((item) => item.key === lastSlideDurationKey)?.value
        setSlideDurationSeconds(msToSecondsLabel(typeof slideDuration === 'number' ? slideDuration : 4000))
        setLastSlideDurationSeconds(msToSecondsLabel(typeof lastSlideDuration === 'number' ? lastSlideDuration : 6000))
    }, [lastSlideDurationKey, settings, slideDurationKey])

    const handleSave = async () => {
        setSaving(true)
        try {
            await Promise.all([
                updateSetting({
                    admin_email: adminEmail,
                    key: slideDurationKey,
                    value: secondsToMs(slideDurationSeconds, 4000),
                    description: 'Duracion base en milisegundos para cada slide del video del carrusel',
                }),
                updateSetting({
                    admin_email: adminEmail,
                    key: lastSlideDurationKey,
                    value: secondsToMs(lastSlideDurationSeconds, 6000),
                    description: 'Duracion en milisegundos para la ultima slide del video del carrusel',
                }),
            ])
            toast({ title: 'Video de carrusel guardado', description: 'Las nuevas duraciones globales ya aplican a todos los usuarios.' })
        } catch (error: unknown) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'No se pudieron guardar las duraciones.',
                variant: 'destructive'
            })
        } finally {
            setSaving(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Video del carrusel</CardTitle>
                <CardDescription>Control global de duración para la exportación MP4 del carrusel.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="carousel-video-slide-duration">Duración base por slide</Label>
                        <Input
                            id="carousel-video-slide-duration"
                            type="number"
                            min="1"
                            step="0.5"
                            value={slideDurationSeconds}
                            onChange={(event) => setSlideDurationSeconds(event.target.value)}
                        />
                        <p className="text-sm text-muted-foreground">Se aplica a todas las slides salvo la última.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="carousel-video-last-slide-duration">Duración de la última slide</Label>
                        <Input
                            id="carousel-video-last-slide-duration"
                            type="number"
                            min="1"
                            step="0.5"
                            value={lastSlideDurationSeconds}
                            onChange={(event) => setLastSlideDurationSeconds(event.target.value)}
                        />
                        <p className="text-sm text-muted-foreground">Permite dar más cierre al CTA final sin tocar el resto.</p>
                    </div>
                </div>
                <Button onClick={() => void handleSave()} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar duraciones'}
                </Button>
            </CardContent>
        </Card>
    )
}
