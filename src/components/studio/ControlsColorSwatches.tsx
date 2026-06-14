'use client'

import { useState, useEffect, type DragEvent } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HexColorPicker } from 'react-colorful'
import { IconPlus } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { normalizeHexColor } from './ControlsPanel.helpers'

export function RoleColorSwatch({
    color,
    onCommit,
    applyLabel,
    draggable = false,
    onDragStart,
    onDragEnd,
    sizeClass = "w-14 h-14 rounded-2xl",
}: {
    color: string
    onCommit: (nextColor: string) => void
    applyLabel: string
    draggable?: boolean
    onDragStart?: (event: DragEvent<HTMLButtonElement>) => void
    onDragEnd?: (event: DragEvent<HTMLButtonElement>) => void
    sizeClass?: string
}) {
    const initial = normalizeHexColor(color)
    const [draft, setDraft] = useState(initial)
    const [open, setOpen] = useState(false)

    useEffect(() => {
        setDraft(initial)
    }, [initial])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(sizeClass, "border border-border/70 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.28)] transition-transform duration-200 hover:scale-[1.03]")}
                    style={{ backgroundColor: initial }}
                    title={initial}
                    draggable={draggable}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                />
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3 space-y-3 bg-card border border-border/80 shadow-xl z-[140]" align="start">
                <HexColorPicker
                    color={draft}
                    onChange={(next) => setDraft(normalizeHexColor(next))}
                    className="!w-full !h-28"
                />
                <Input
                    value={draft.toUpperCase()}
                    onChange={(e) => setDraft(normalizeHexColor(e.target.value))}
                    className="h-8 text-xs font-mono"
                />
                <Button
                    type="button"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => {
                        onCommit(draft)
                        setOpen(false)
                    }}
                >
                    {applyLabel}
                </Button>
            </PopoverContent>
        </Popover>
    )
}

export function AddAccentSwatch({
    disabled,
    onAdd,
    label,
}: {
    disabled?: boolean
    onAdd: (nextColor: string) => void
    label: string
}) {
    const [open, setOpen] = useState(false)
    const [draft, setDraft] = useState('#4f46e5')
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                        "w-14 h-14 rounded-2xl border border-dashed border-border/80 flex items-center justify-center text-muted-foreground shadow-[0_14px_28px_-24px_rgba(15,23,42,0.2)]",
                        "hover:text-primary hover:border-primary/60 transition-colors",
                        disabled && "opacity-40 cursor-not-allowed"
                    )}
                    title={label}
                >
                    <IconPlus className="w-5 h-5" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3 space-y-3 bg-card border border-border/80 shadow-xl z-[140]" align="start">
                <HexColorPicker
                    color={draft}
                    onChange={(next) => setDraft(normalizeHexColor(next))}
                    className="!w-full !h-28"
                />
                <Input
                    value={draft.toUpperCase()}
                    onChange={(e) => setDraft(normalizeHexColor(e.target.value))}
                    className="h-8 text-xs font-mono"
                />
                <Button
                    type="button"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => {
                        onAdd(draft)
                        setOpen(false)
                    }}
                >
                    {label}
                </Button>
            </PopoverContent>
        </Popover>
    )
}
