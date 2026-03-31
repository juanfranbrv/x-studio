'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import type { Id } from '@/../convex/_generated/dataModel'
import { api } from '@/../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from '@/components/ui/spinner'
import { useToast } from '@/hooks/use-toast'

type AdminAudioTracksCardProps = {
    adminEmail: string
}

type AdminAudioTrackRow = {
    _id: Id<'admin_audio_tracks'>
    name: string
    mime_type?: string
    size_bytes?: number
    is_active: boolean
    url?: string | null
}

type LegacyAudioTrackRow = {
    name: string
    label: string
    url: string
}

function normalizeTrackName(fileName: string) {
    return fileName
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

export function AdminAudioTracksCard({ adminEmail }: AdminAudioTracksCardProps) {
    const { toast } = useToast()
    const tracks = useQuery(api.adminAudio.listAllForAdmin, adminEmail ? { admin_email: adminEmail } : 'skip') as AdminAudioTrackRow[] | undefined
    const generateUploadUrl = useMutation(api.assets.generateUploadUrl)
    const createTrack = useMutation(api.adminAudio.createTrack)
    const setTrackActive = useMutation(api.adminAudio.setTrackActive)
    const deleteTrack = useMutation(api.adminAudio.deleteTrack)
    const inputRef = useRef<HTMLInputElement | null>(null)
    const [uploading, setUploading] = useState(false)
    const [draftName, setDraftName] = useState('')
    const [legacyTracks, setLegacyTracks] = useState<LegacyAudioTrackRow[]>([])

    useEffect(() => {
        let cancelled = false

        const loadLegacyTracks = async () => {
            try {
                const response = await fetch('/api/experimental-songs', { cache: 'no-store' })
                if (!response.ok) return
                const payload = await response.json()
                const nextTracks = Array.isArray(payload?.songs) ? payload.songs : []
                if (!cancelled) {
                    setLegacyTracks(nextTracks)
                }
            } catch {
                if (!cancelled) {
                    setLegacyTracks([])
                }
            }
        }

        void loadLegacyTracks()

        return () => {
            cancelled = true
        }
    }, [])

    const handleUpload = async (file: File | null) => {
        if (!file) return
        setUploading(true)
        try {
            const uploadUrl = await generateUploadUrl({})
            const response = await fetch(uploadUrl, {
                method: 'POST',
                body: file,
                headers: {
                    'Content-Type': file.type || 'application/octet-stream',
                },
            })

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`)
            }

            const { storageId } = await response.json()
            await createTrack({
                admin_email: adminEmail,
                name: draftName.trim() || normalizeTrackName(file.name),
                storage_id: storageId,
                mime_type: file.type || undefined,
                size_bytes: file.size || undefined,
            })

            setDraftName('')
            if (inputRef.current) inputRef.current.value = ''
            toast({ title: 'Pista subida', description: 'La pista ya está disponible para el carrusel.' })
        } catch (error: unknown) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'No se pudo subir la pista.',
                variant: 'destructive'
            })
        } finally {
            setUploading(false)
        }
    }

    const handleToggle = async (trackId: Id<'admin_audio_tracks'>, isActive: boolean) => {
        try {
            await setTrackActive({ admin_email: adminEmail, track_id: trackId, is_active: isActive })
        } catch (error: unknown) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'No se pudo actualizar la pista.',
                variant: 'destructive'
            })
        }
    }

    const handleDelete = async (trackId: Id<'admin_audio_tracks'>) => {
        try {
            await deleteTrack({ admin_email: adminEmail, track_id: trackId })
            toast({ title: 'Pista eliminada' })
        } catch (error: unknown) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'No se pudo eliminar la pista.',
                variant: 'destructive'
            })
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pistas de audio</CardTitle>
                <CardDescription>Biblioteca global de música del carrusel. La exportación elige una pista activa al azar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                    <Input
                        placeholder="Nombre opcional de la pista..."
                        value={draftName}
                        onChange={(event) => setDraftName(event.target.value)}
                    />
                    <Input
                        ref={inputRef}
                        type="file"
                        accept=".mp3,.wav,.m4a,.aac,.ogg,audio/*"
                        onChange={(event) => void handleUpload(event.target.files?.[0] || null)}
                        disabled={uploading}
                    />
                    <div className="flex items-center text-sm text-muted-foreground">
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aleatoria entre activas'}
                    </div>
                </div>

                <div className="space-y-3">
                    {tracks?.map((track) => (
                        <div key={String(track._id)} className="rounded-xl border border-border/70 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="font-medium">{track.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {track.mime_type || 'audio'}{typeof track.size_bytes === 'number' ? ` · ${(track.size_bytes / (1024 * 1024)).toFixed(2)} MB` : ''}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={track.is_active ? 'default' : 'secondary'}>
                                        {track.is_active ? 'Activa' : 'Inactiva'}
                                    </Badge>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => void handleToggle(track._id, !track.is_active)}
                                    >
                                        {track.is_active ? 'Desactivar' : 'Activar'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => void handleDelete(track._id)}
                                    >
                                        Borrar
                                    </Button>
                                </div>
                            </div>
                            {track.url ? (
                                <audio className="mt-3 w-full" controls preload="none" src={track.url} />
                            ) : null}
                        </div>
                    ))}

                    {tracks && tracks.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
                            No hay pistas todavía. Sube la primera para activar la exportación aleatoria con música.
                        </div>
                    ) : null}

                    {legacyTracks.length > 0 ? (
                        <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <div className="font-medium">Pistas legacy detectadas</div>
                                    <div className="text-sm text-muted-foreground">
                                        Estas pistas siguen existiendo en la carpeta local `songs/` y se muestran aqui para visibilidad de migracion.
                                    </div>
                                </div>
                                <Badge variant="secondary">Local</Badge>
                            </div>
                            <div className="space-y-3">
                                {legacyTracks.map((track) => (
                                    <div key={track.name} className="rounded-lg border border-border/60 bg-background p-3">
                                        <div className="font-medium">{track.label}</div>
                                        <audio className="mt-2 w-full" controls preload="none" src={track.url} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    )
}
