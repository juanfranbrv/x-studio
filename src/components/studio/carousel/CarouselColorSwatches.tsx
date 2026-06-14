'use client'

import { useState, useEffect, type DragEvent } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HexColorPicker } from 'react-colorful'
import { IconPlus } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { normalizeHexColor } from './CarouselControlsPanel.helpers'

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
                    className={cn(sizeClass, "border border-border/70 shadow-sm")}
                    style={{ backgroundColor: initial }}
                    title={initial}
                    draggable={draggable}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                />
            </PopoverTrigger>
            <PopoverContent className="z-[140] w-56 space-y-3 border border-border/80 bg-card p-3 shadow-xl" align="start">
                <HexColorPicker
                    color={draft}
                    onChange={(next) => setDraft(normalizeHexColor(next))}
                    className="!h-28 !w-full"
                />
                <Input
                    value={draft.toUpperCase()}
                    onChange={(e) => setDraft(normalizeHexColor(e.target.value))}
                    className="h-8 font-mono text-xs"
                />
                <Button
                    type="button"
                    size="sm"
                    className="h-8 w-full text-xs"
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
                        "flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-border/80 text-muted-foreground transition-colors",
                        "hover:border-primary/60 hover:text-primary",
                        disabled && "cursor-not-allowed opacity-40"
                    )}
                    title={label}
                >
                    <IconPlus className="h-5 w-5" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="z-[140] w-56 space-y-3 border border-border/80 bg-card p-3 shadow-xl" align="start">
                <HexColorPicker
                    color={draft}
                    onChange={(next) => setDraft(normalizeHexColor(next))}
                    className="!h-28 !w-full"
                />
                <Input
                    value={draft.toUpperCase()}
                    onChange={(e) => setDraft(normalizeHexColor(e.target.value))}
                    className="h-8 font-mono text-xs"
                />
                <Button
                    type="button"
                    size="sm"
                    className="h-8 w-full text-xs"
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
