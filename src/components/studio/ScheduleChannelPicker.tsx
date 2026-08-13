'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Loader2 } from '@/components/ui/spinner'
import type { PostizIntegration } from '../../../convex/lib/postiz/types'

interface ScheduleChannelPickerProps {
    channels: PostizIntegration[] | null
    selectedIds: Set<string>
    onToggle: (id: string) => void
    isLoading: boolean
    error: string | null
}

export function ScheduleChannelPicker({
    channels,
    selectedIds,
    onToggle,
    isLoading,
    error,
}: ScheduleChannelPickerProps) {
    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4" />
                Cargando canales...
            </div>
        )
    }

    if (error) {
        return <p className="text-sm text-destructive">{error}</p>
    }

    if (!channels || channels.length === 0) {
        return <p className="text-sm text-muted-foreground">No hay canales conectados en Postiz.</p>
    }

    return (
        <div className="flex flex-col gap-2">
            {channels.map((channel) => (
                <Label
                    key={channel.id}
                    className="cursor-pointer rounded-lg border border-border/60 px-3 py-2 font-normal"
                >
                    <Checkbox checked={selectedIds.has(channel.id)} onCheckedChange={() => onToggle(channel.id)} />
                    {channel.picture && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={channel.picture} alt="" className="h-5 w-5 rounded-full object-cover" />
                    )}
                    <span>{channel.name}</span>
                </Label>
            ))}
        </div>
    )
}
