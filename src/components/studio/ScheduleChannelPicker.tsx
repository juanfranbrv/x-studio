'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Loader2 } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import type { SocialPlatform } from '@/lib/creation-flow-types'
import { PLATFORM_CONFIG, type PlatformConfig } from './creation-flow/SocialFormatSelector'
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
            {channels.map((channel) => {
                // El avatar del canal no basta para saber la red: dos cuentas de
                // la misma marca comparten logo y solo se distinguen por una
                // chapita diminuta. Por eso la red se nombra tambien en texto,
                // con el icono de la app (PLATFORM_CONFIG, el mismo mapa que usa
                // el selector de formatos). Si Postiz devuelve una red que no
                // esta en el mapa, se cae al identificador en crudo.
                const plataforma: PlatformConfig | undefined =
                    PLATFORM_CONFIG[channel.identifier as SocialPlatform]
                const IconoPlataforma = plataforma?.icon

                return (
                    <Label
                        key={channel.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 font-normal"
                    >
                        <Checkbox
                            checked={selectedIds.has(channel.id)}
                            onCheckedChange={() => onToggle(channel.id)}
                        />
                        {channel.picture && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={channel.picture}
                                alt=""
                                className="h-10 w-10 shrink-0 rounded-full object-cover"
                            />
                        )}
                        <span className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-medium">{channel.name}</span>
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {IconoPlataforma && (
                                    <IconoPlataforma
                                        className={cn('h-4 w-4 shrink-0', plataforma?.color)}
                                    />
                                )}
                                {plataforma?.label ?? channel.identifier}
                            </span>
                        </span>
                    </Label>
                )
            })}
        </div>
    )
}
