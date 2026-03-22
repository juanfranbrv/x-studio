'use client';

import { useState, useEffect, useRef } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type ContextElement } from "@/app/image/page";
import { cn } from '@/lib/utils';
import {
    BRAND_KIT_GHOST_BUTTON_CLASS,
    BRAND_KIT_PANEL_CLASS,
    BRAND_KIT_PANEL_DESCRIPTION_CLASS,
    BRAND_KIT_PANEL_HEADER_CLASS,
    BRAND_KIT_PANEL_TITLE_CLASS,
    BRAND_KIT_REMOVE_BUTTON_CLASS,
    BRAND_KIT_SECTION_LABEL_CLASS,
} from './brandKitStyles';

import { IconInfo, IconPalette, IconRotate, IconClose, IconColorPicker, IconCheck, IconPlus, IconCopy } from '@/components/ui/icons';
import { useTheme } from 'next-themes';
import { hexToRgb, rgbToLab } from '@/lib/color-utils';
import { useTranslation } from 'react-i18next';

interface ColorPaletteProps {
    colors: { color: string; sources: string[]; score: number; role?: string; selected?: boolean }[];
    isEdited: boolean;
    onUpdateColor: (index: number, newColor: string) => void;
    onUpdateRole: (index: number, newRole: string) => void;
    onToggleSelection?: (index: number) => void;
    onRemoveColor: (index: number) => void;
    onAddColor: () => void;
    onReset: () => void;
    hideHeader?: boolean;
    maxColors?: number;
    selectedColorIds?: string[];
    onSwapRoles?: (indexA: number, indexB: number) => void;
    onSwapPositions?: (indexA: number, indexB: number) => void;
    onDragStart?: (e: React.DragEvent, element: ContextElement) => void;
    onDragEnd?: () => void;
}

export function ColorPalette({
    colors,
    isEdited,
    onUpdateColor,
    onUpdateRole,
    onToggleSelection,
    onRemoveColor,
    onAddColor,
    onReset,
    hideHeader = false,
    maxColors = 10,
    onSwapRoles,
    onSwapPositions,
    selectedColorIds = [],
    onDragStart,
    onDragEnd
}: ColorPaletteProps) {
    const { t } = useTranslation('brandKit');
    const [colorPickerOpen, setColorPickerOpen] = useState<number | null>(null);
    const [localColor, setLocalColor] = useState<{ index: number, color: string } | null>(null);
    const [draggedColorIndex, setDraggedColorIndex] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const { theme } = useTheme();

    // Sincronizar con el padre cuando el color local cambia (debounced)
    useEffect(() => {
        if (localColor) {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                onUpdateColor(localColor.index, localColor.color);
            }, 100);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [localColor, onUpdateColor]);
    const isDark = theme === 'dark';

    const getContrastColor = (hex: string) => {
        try {
            const rgb = hexToRgb(hex);
            if (!rgb) return 'text-white';
            const lab = rgbToLab(rgb);
            return lab.l > 60 ? (isDark ? 'text-zinc-900' : 'text-primary') : 'text-white';
        } catch (e) {
            return 'text-white';
        }
    };

    const normalizeRole = (role?: string): 'Texto' | 'Fondo' | 'Acento' => {
        const raw = (role || '').toLowerCase();
        if (raw.includes('text') || raw.includes('texto')) return 'Texto';
        if (raw.includes('fondo') || raw.includes('background')) return 'Fondo';
        return 'Acento';
    };

    const textIndex = colors.findIndex((c) => normalizeRole(c.role) === 'Texto');
    const backgroundIndex = colors.findIndex((c) => normalizeRole(c.role) === 'Fondo');
    const accentIndexes = colors
        .map((item, index) => ({ item, index }))
        .filter(({ item, index }) =>
            normalizeRole(item.role) === 'Acento'
            && index !== textIndex
            && index !== backgroundIndex
        )
        .map(({ index }) => index);
    const orderedIndexes = [
        ...(textIndex >= 0 ? [textIndex] : []),
        ...(backgroundIndex >= 0 && backgroundIndex !== textIndex ? [backgroundIndex] : []),
        ...accentIndexes
    ];

    const handleEyedropper = async (index: number) => {
        if ('EyeDropper' in window) {
            try {
                // Keep track of current state
                const wasOpen = colorPickerOpen === index;

                // @ts-ignore
                const eyeDropper = new window.EyeDropper();
                const result = await eyeDropper.open();

                if (result?.sRGBHex) {
                    onUpdateColor(index, result.sRGBHex);
                }

                // Re-open the popover if it was open before
                // Use setTimeout to ensure the DOM has updated
                if (wasOpen) {
                    setTimeout(() => setColorPickerOpen(index), 50);
                }
            } catch (error) {
                console.log('Eyedropper cancelled or failed', error);
                // Re-open popover even if cancelled
                setTimeout(() => setColorPickerOpen(index), 50);
            }
        }
    };

    const handleDragDrop = (sourceIndex: number, targetIndex: number) => {
        if (sourceIndex === targetIndex) return;
        const sourceRole = normalizeRole(colors[sourceIndex]?.role);
        const targetRole = normalizeRole(colors[targetIndex]?.role);

        if (sourceRole === targetRole && onSwapPositions) {
            // Same role (e.g. both Accents) → swap positions in array
            onSwapPositions(sourceIndex, targetIndex);
        } else if (onSwapRoles) {
            // Different roles → swap roles (Texto ↔ Acento, etc.)
            onSwapRoles(sourceIndex, targetIndex);
        } else {
            // Legacy fallback — two separate calls
            onUpdateRole(sourceIndex, targetRole);
            onUpdateRole(targetIndex, sourceRole);
        }
    };

    return (
        <TooltipProvider delayDuration={400}>
            <Card className={cn(
                "relative overflow-visible z-40",
                BRAND_KIT_PANEL_CLASS,
                hideHeader && "bg-transparent backdrop-blur-0 border-none shadow-none"
            )}>
                {!hideHeader && (
                    <>
                        <CardHeader className={cn(BRAND_KIT_PANEL_HEADER_CLASS, "flex-row items-start justify-between pb-4")}>
                            <div className="space-y-1.5">
                            <CardTitle className={BRAND_KIT_PANEL_TITLE_CLASS}>
                                <IconPalette className="w-[1.125rem] h-[1.125rem] text-primary" />
                                {t('palette.title', { defaultValue: 'Color palette' })}
                            </CardTitle>
                                <p className={BRAND_KIT_PANEL_DESCRIPTION_CLASS}>
                                    {t('palette.description', { defaultValue: 'Tonos principales que definen la identidad de marca y alimentan el resto de módulos.' })}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className={cn(BRAND_KIT_GHOST_BUTTON_CLASS, "h-9 w-9 cursor-help px-0 text-muted-foreground/70")}>
                                            <IconInfo className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs text-xs bg-popover border-border text-popover-foreground">
                                        <p>{t('palette.tooltip', { defaultValue: 'Primary and secondary brand colors.' })}</p>
                                    </TooltipContent>
                                </Tooltip>
                                {isEdited && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onReset}
                                        className={cn(BRAND_KIT_GHOST_BUTTON_CLASS, "gap-1.5")}
                                    >
                                        <IconRotate className="w-3.5 h-3.5" />
                                        {t('palette.reset', { defaultValue: 'Reset' })}
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                    </>
                )}
                <CardContent className={cn("relative overflow-visible px-6 pb-6 pt-0", hideHeader && "p-0")}>
                    <div className="flex items-start gap-3 flex-wrap">
                        {orderedIndexes.map((idx, visualIdx) => {
                            const item = colors[idx];
                            const role = normalizeRole(item.role);
                            const isAccent = role === 'Acento';
                            const firstAccentVisualIndex = orderedIndexes.findIndex((id) => normalizeRole(colors[id]?.role) === 'Acento');
                            const addLeftSpacingForAccents = isAccent && visualIdx === firstAccentVisualIndex;
                            return (
                            <div key={idx} className="group relative">
                                <Tooltip>
                                    <Popover
                                        open={colorPickerOpen === idx}
                                        onOpenChange={(open) => {
                                            setColorPickerOpen(open ? idx : null);
                                            if (!open) setLocalColor(null);
                                        }}
                                    >
                                        <TooltipTrigger asChild>
                                            <PopoverTrigger asChild>
                                                <div
                                                    draggable
                                                    onDragStart={(e) => {
                                                        setDraggedColorIndex(idx);
                                                        onDragStart?.(e, {
                                                            id: `color-${idx}`,
                                                            type: 'color',
                                                            value: item.color,
                                                            label: item.role || `Color ${idx + 1}`
                                                        });
                                                    }}
                                                    onDragEnd={(e) => {
                                                        setDraggedColorIndex(null);
                                                        onDragEnd?.();
                                                    }}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        if (draggedColorIndex === null) return;
                                                        handleDragDrop(draggedColorIndex, idx);
                                                        setDraggedColorIndex(null);
                                                    }}
                                                    className={cn(
                                                        "aspect-square rounded-2xl cursor-grab active:cursor-grabbing transition-all duration-300",
                                                        "hover:scale-110 hover:shadow-xl border-2",
                                                        "relative overflow-visible flex items-center justify-center w-14 h-14",
                                                        addLeftSpacingForAccents && "ml-1.5",
                                                        colorPickerOpen === idx ? 'border-primary ring-2 ring-primary/20' : 'shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]',
                                                        draggedColorIndex !== null && draggedColorIndex !== idx && 'ring-2 ring-primary/20',
                                                        selectedColorIds.includes(`color-${idx}`)
                                                            ? "border-primary shadow-md"
                                                            : "border-white/30 hover:border-primary/50"
                                                    )}
                                                    style={{ backgroundColor: item.color }}
                                                >
                                                    {/* Toggle Selection Checkmark Overlay */}
                                                    {onToggleSelection && selectedColorIds.includes(`color-${idx}`) && (
                                                        <div
                                                            className={cn(
                                                                "absolute -bottom-1 -right-1 flex items-center justify-center z-30 w-5 h-5 rounded-full bg-primary border-2 border-background shadow-md",
                                                                "text-primary-foreground"
                                                            )}
                                                        >
                                                            <IconCheck className="w-3 h-3 stroke-[3px]" />
                                                        </div>
                                                    )}

                                                    {/* Remove Button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onRemoveColor(idx);
                                                        }}
                                                        className={cn(BRAND_KIT_REMOVE_BUTTON_CLASS, "right-0 top-0 -translate-y-1/4 translate-x-1/4 z-50")}
                                                    >
                                                        <IconClose className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </PopoverTrigger>
                                        </TooltipTrigger>
                                        <PopoverContent className="z-[100] w-[260px] rounded-[1.2rem] border-border/70 bg-popover p-3 shadow-[0_26px_74px_-40px_rgba(15,23,42,0.36)]" side="right" align="start">
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-muted-foreground/60 mb-2 px-1">{t('palette.brandColor', { defaultValue: 'Brand color' })}</p>
                                                    <HexColorPicker
                                                        color={localColor?.index === idx ? localColor.color : item.color}
                                                        onChange={(newColor) => {
                                                            setLocalColor({ index: idx, color: newColor });
                                                        }}
                                                        style={{ width: '100%' }}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <p className={BRAND_KIT_SECTION_LABEL_CLASS}>{t('palette.colorRole', { defaultValue: 'Color role' })}</p>
                                                    <div className="flex gap-1 rounded-xl border border-border/70 bg-[hsl(var(--surface-alt))]/70 p-1">
                                                        {(['Texto', 'Fondo', 'Acento'] as const).map(role => (
                                                            <Button
                                                                key={role}
                                                                variant={item.role === role ? "secondary" : "ghost"}
                                                                size="sm"
                                                                className={cn(
                                                                    "flex-1 h-8 rounded-lg px-0 text-[0.72rem] font-medium transition-all",
                                                                    item.role === role
                                                                        ? "bg-background shadow-sm text-primary"
                                                                        : "text-muted-foreground hover:bg-background/75"
                                                                )}
                                                                onClick={() => onUpdateRole(idx, role)}
                                                            >
                                                                {t(`palette.roles.${role}`, { defaultValue: role })}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 border-t border-border/40 pt-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEyedropper(idx)}
                                                        className="h-9 flex-1 gap-1 rounded-[0.9rem] text-[0.86rem] font-medium"
                                                    >
                                                        <IconColorPicker className="w-4 h-4" />
                                                        {t('palette.capture', { defaultValue: 'Capture' })}
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-[0.9rem] text-muted-foreground" onClick={() => setColorPickerOpen(null)}>
                                                        <IconClose className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                    <TooltipContent side="bottom" className="z-[110] flex flex-col gap-1 rounded-[1rem] border-border/70 bg-popover p-2 shadow-md">
                                        <p className="text-xs font-bold text-foreground">{t(`palette.roles.${role}`, { defaultValue: role })}</p>
                                        <p className="text-[9px] text-muted-foreground/60">{t('palette.dragHint', { defaultValue: 'Drag onto another color to swap roles' })}</p>
                                    </TooltipContent>
                                </Tooltip>
                                <div className={cn("mt-2 text-center", addLeftSpacingForAccents && "ml-2")}>
                                    <span className={BRAND_KIT_SECTION_LABEL_CLASS}>{t(`palette.roles.${role}`, { defaultValue: role })}</span>
                                </div>
                            </div>
                        )})}
                        {colors.length < maxColors && (
                            <div
                                onClick={onAddColor}
                                className="h-14 w-14 cursor-pointer rounded-2xl border-2 border-dashed border-border bg-[hsl(var(--surface-alt))]/55 flex items-center justify-center transition-colors group hover:border-primary/25 hover:bg-[hsl(var(--surface))]"
                            >
                                <IconPlus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                        )}
                    </div>
                    {hideHeader && isEdited && (
                        <div className="mt-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onReset}
                                className={cn(BRAND_KIT_GHOST_BUTTON_CLASS, "gap-1.5 text-muted-foreground")}
                            >
                                <IconRotate className="w-3.5 h-3.5" />
                                {t('palette.reset', { defaultValue: 'Reset' })}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TooltipProvider>
    );
}
