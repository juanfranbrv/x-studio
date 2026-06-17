'use client'

import { Loader2 } from '@/components/ui/spinner'
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { IconCheck, IconPlus, IconPalette, IconColorPicker, IconClose, IconTextFont, IconSparkles, IconFingerprint } from '@/components/ui/icons'
import { HexColorPicker } from 'react-colorful'
import Link from 'next/link'
import { useBrandKit } from '@/contexts/BrandKitContext'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslation } from 'react-i18next'
import { log } from '@/lib/logger'

import { type LayoutOption, type SelectedColor, type TextAsset } from '@/lib/creation-flow-types'

type ColorLike = string | { color?: unknown; hex?: unknown; role?: unknown }
type LogoLike = string | { url?: unknown }

const extractHex = (c: unknown): string => {
    if (!c) return ''
    let hex = ''
    if (typeof c === 'string') {
        hex = c.trim().toLowerCase()
    } else if (typeof c === 'object') {
        const color = c as Exclude<ColorLike, string>
        const value = color.color || color.hex || ''
        hex = typeof value === 'string' ? value.trim().toLowerCase() : ''
    }
    if (!hex || hex === '#') return ''
    return hex.startsWith('#') ? hex : `#${hex}`
}

const getContrastColor = (hex: string) => {
    const cleanHex = hex.startsWith('#') ? hex : `#${hex}`
    if (!cleanHex || cleanHex.length < 7) return 'text-white'
    const r = parseInt(cleanHex.slice(1, 3), 16)
    const g = parseInt(cleanHex.slice(3, 5), 16)
    const b = parseInt(cleanHex.slice(5, 7), 16)
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
    return yiq >= 128 ? 'text-black' : 'text-white'
}

interface BrandingConfiguratorProps {
    selectedLayout: LayoutOption | null
    selectedLogoId: string | null
    selectedBrandColors: SelectedColor[]
    onSelectLogo: (logoId: string | null) => void
    onToggleBrandColor: (color: string) => void
    onRemoveBrandColor?: (color: string) => void
    onAddCustomColor: (color: string) => void
    showLogo?: boolean
    showColors?: boolean
    showTypography?: boolean
    showBrandTexts?: boolean
    // Text Assets
    textAssets?: TextAsset[]
    onAddTextAsset?: (asset: TextAsset) => void
    onRemoveTextAsset?: (id: string) => void
    onUpdateTextAsset?: (id: string, value: string) => void
    // Fonts
    fonts?: Array<{ family: string; role?: 'heading' | 'body' }>
    // AI Generation
    rawMessage?: string
    onGenerateText?: (fieldType: string) => Promise<string>
    debugLabel?: string
    onlyShowSelectedColors?: boolean
}

function CustomColorPicker({
    onAdd,
    presetColors = []
}: {
    onAdd: (color: string) => void
    presetColors?: string[]
}) {
    const { t } = useTranslation('common')
    const [value, setValue] = useState('#')
    const [isOpen, setIsOpen] = useState(false)

    const handleSubmit = () => {
        log.debug('BRAND', 'Custom color picker submit', { value })
        if (/^#[0-9A-F]{6}$/i.test(value)) {
            log.debug('BRAND', 'Adding custom brand color', { color: value })
            onAdd(value)
            setValue('#')
            setIsOpen(false)
        } else {
            log.debug('BRAND', 'Rejected custom color with invalid hex', { value })
        }
    }

    const handleEyedropper = async () => {
        if ('EyeDropper' in window) {
            try {
                const eyeDropper = new window.EyeDropper()
                const result = await eyeDropper.open()
                if (result?.sRGBHex) {
                    setValue(result.sRGBHex.toUpperCase())
                }
            } catch (error) {
                log.debug('BRAND', 'Eyedropper cancelled or failed', error)
            }
        }
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    className="aspect-square rounded-full border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center text-muted-foreground hover:text-primary group"
                    title={t('brandingConfigurator.addCustomColor', { defaultValue: 'Add custom color' })}
                >
                    <IconPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4 shadow-xl border-border/50 bg-white backdrop-blur-sm z-[100]" align="start" sideOffset={8}>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('brandingConfigurator.customColor', { defaultValue: 'Custom color' })}</p>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <IconClose className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="custom-picker-wrapper space-y-4">
                        {presetColors.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('brandingConfigurator.brandColors', { defaultValue: 'Brand colors' })}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {Array.from(new Set(presetColors.map((c) => {
                                        const hex = extractHex(c)
                                        return hex ? hex.toUpperCase() : ''
                                    }).filter(Boolean))).map((hex) => (
                                        <button
                                            key={hex}
                                            onClick={() => {
                                                setValue(hex)
                                                onAdd(hex)
                                                setIsOpen(false)
                                            }}
                                            className="w-6 h-6 rounded-full border border-border/60 hover:border-primary/60 transition-colors"
                                            style={{ backgroundColor: hex }}
                                            title={`${t('actions.add', { defaultValue: 'Add' })} ${hex}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="relative rounded-lg overflow-hidden border border-border/50">
                            <HexColorPicker
                                color={value.startsWith('#') && value.length === 7 ? value : '#000000'}
                                onChange={(color) => setValue(color.toUpperCase())}
                                className="!w-full !h-32"
                            />
                        </div>

                        <Button
                            variant="outline"
                            onClick={handleEyedropper}
                            className="w-full h-9 gap-2 text-xs font-semibold bg-background hover:bg-accent border-border/50 shadow-sm"
                        >
                            <IconColorPicker className="w-3.5 h-3.5 text-primary" />
                            {t('brandingConfigurator.capture', { defaultValue: 'Capture' })}
                        </Button>

                        <div className="flex gap-2 pt-1">
                            <div
                                className="w-9 h-9 rounded-lg border border-border/50 shadow-inner shrink-0"
                                style={{ backgroundColor: value.startsWith('#') && value.length === 7 ? value : 'transparent' }}
                            />
                            <Input
                                value={value}
                                onChange={(e) => setValue(e.target.value.toUpperCase())}
                                placeholder="#000000"

                                className="h-9 text-xs font-mono bg-muted/30 border-border/40 focus:border-primary/50"
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            />
                            <Button
                                className="h-9 w-12 p-0 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                                onClick={handleSubmit}
                                disabled={!/^#[0-9A-F]{6}$/i.test(value)}
                            >
                                <IconCheck className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}

// Separate component for text asset row to properly use hooks
interface TextAssetRowProps {
    asset: { id: string; type: string; label: string; value: string }
    textResources: { label: string; value: string }[]
    rawMessage: string
    onUpdate: (id: string, value: string) => void
    onRemove: (id: string) => void
    onGenerateText?: (fieldType: string) => Promise<string>
    headingFont?: string
    bodyFont?: string
}

function TextAssetRow({ asset, textResources, rawMessage, onUpdate, onRemove, onGenerateText, headingFont, bodyFont }: TextAssetRowProps) {
    const { t } = useTranslation('common')
    const [isGenerating, setIsGenerating] = useState(false)

    const assetFont = asset.type === 'headline' || asset.type === 'cta' || asset.label.toLowerCase().includes('titulo')
        ? headingFont
        : bodyFont

    const handleGenerate = async () => {
        if (!onGenerateText || isGenerating) return
        setIsGenerating(true)
        try {
            const generated = await onGenerateText(asset.type)
            if (generated) {
                onUpdate(asset.id, generated)
            }
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="flex items-center gap-1.5 group">
            <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-5 shrink-0 min-w-[50px] justify-center">
                {asset.label}
            </Badge>

            {/* Input with Fingerprint dropdown inside */}
            <div className="relative flex-1">
                <Input
                    value={asset.value}
                    onChange={(e) => onUpdate(asset.id, e.target.value)}
                    className="h-7 text-xs pr-7 transition-all focus:ring-1 focus:ring-primary/30"
                    placeholder={`{t('textLayerEditor.assetPlaceholder', { defaultValue: 'Value for {{label}}...', label: asset.label })}${asset.label}...`}
                    style={{ fontFamily: assetFont ? `"${assetFont}", sans-serif` : undefined }}
                />
                {/* Fingerprint - Brand Kit Presets */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 hover:text-primary transition-colors text-muted-foreground/50 hover:text-muted-foreground"
                            title={t('preview.useBrandText', { defaultValue: 'Use Brand Kit text' })}
                        >
                            <IconFingerprint className="w-4 h-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 max-h-60 overflow-y-auto">
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {t('preview.brandTexts', { defaultValue: 'Brand Kit texts' })}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {textResources.length === 0 ? (
                            <DropdownMenuItem disabled className="text-xs text-muted-foreground italic">
                                {t('preview.noBrandTexts', { defaultValue: 'No texts available' })}
                            </DropdownMenuItem>
                        ) : (
                            textResources.map((resource, idx) => (
                                <DropdownMenuItem
                                    key={idx}
                                    onClick={() => onUpdate(asset.id, resource.value)}
                                    className="text-xs"
                                >
                                    <span className="text-muted-foreground mr-2">[{resource.label}]</span>
                                    <span className="truncate">{resource.value}</span>
                                </DropdownMenuItem>
                            ))
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Sparkles - AI Generation */}
            <button
                onClick={handleGenerate}
                disabled={isGenerating || !rawMessage}
                className={cn(
                    "p-1 rounded transition-all",
                    rawMessage
                        ? "hover:text-primary hover:bg-primary/10 text-muted-foreground"
                        : "text-muted-foreground/30 cursor-not-allowed"
                )}
                title={rawMessage ? t('brandingConfigurator.generateWithAi', { defaultValue: 'Generate with AI' }) : t('brandingConfigurator.enterIntentFirst', { defaultValue: 'Enter your intent first' })}
            >
                {isGenerating ? (
                    <Loader2 className="w-4 h-4" />
                ) : (
                    <IconSparkles className="w-4 h-4" />
                )}
            </button>

            {/* Delete button */}
            <button
                onClick={() => onRemove(asset.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-destructive"
                title={t('actions.delete', { defaultValue: 'Delete' })}
            >
                <IconClose className="w-3.5 h-3.5" />
            </button>

            {/* Font Preview Indicator */}
            {assetFont && asset.value && (
                <div
                    className="absolute -bottom-4 right-10 text-[10px] text-primary/60 font-medium italic pointer-events-none"
                    style={{ fontFamily: `"${assetFont}", sans-serif` }}
                >
                    {t('brandingConfigurator.preview', { defaultValue: 'Preview:' })} {asset.value.length > 25 ? asset.value.substring(0, 25) + '...' : asset.value}
                </div>
            )}
        </div>
    )
}



export function BrandingConfigurator({
    selectedLayout,
    selectedLogoId,
    selectedBrandColors,
    onSelectLogo,
    onToggleBrandColor,
    onRemoveBrandColor,
    onAddCustomColor,
    showLogo = true,
    showColors = true,
    showTypography = true,
    showBrandTexts = true,
    textAssets = [],
    onAddTextAsset,
    onRemoveTextAsset,
    onUpdateTextAsset,
    rawMessage = '',
    onGenerateText,
    fonts: propFonts,
    debugLabel = 'Unknown',
    onlyShowSelectedColors = false
}: BrandingConfiguratorProps) {
    const { t } = useTranslation('common')
    const { activeBrandKit } = useBrandKit()

    const logos = activeBrandKit?.logos || []
    const primaryLogoId = useMemo(() => {
        if (!logos.length) return null

        const explicitPrimaryUrl = (activeBrandKit?.logo_url || '').trim()
        if (explicitPrimaryUrl) {
            const explicitMatchIndex = logos.findIndex((logo) => {
                const url = typeof logo === 'string' ? logo : logo?.url
                return url === explicitPrimaryUrl
            })
            if (explicitMatchIndex >= 0) return `logo-${explicitMatchIndex}`
        }

        const selectedMatchIndex = logos.findIndex((logo) => typeof logo !== 'string' && logo?.selected !== false)
        if (selectedMatchIndex >= 0) return `logo-${selectedMatchIndex}`

        return 'logo-0'
    }, [activeBrandKit?.logo_url, logos])
    const fonts = propFonts || activeBrandKit?.fonts || []

    // Dynamically load Google Fonts if they are specified in the Brand Kit
    useEffect(() => {
        if (fonts.length === 0) return;

        const familiesToLoad = fonts
            .map(f => f.family)
            .filter(f => f && f.toLowerCase() !== 'system' && f.toLowerCase() !== 'sans-serif');

        if (familiesToLoad.length === 0) return;
        const uniqueFamilies = Array.from(new Set(familiesToLoad));

        // Create individual links for each font to be more resilient
        // (if one font is not on Google Fonts, the others will still load)
        const linkTags: HTMLLinkElement[] = [];

        uniqueFamilies.forEach(family => {
            const familyNormalized = family.replace(/\s+/g, '+');
            const linkId = `font-${family.replace(/\s+/g, '-').toLowerCase()}`;
            if (document.getElementById(linkId)) return;

            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.className = 'dynamic-brand-font';

            // Hubot Sans is usually not on Google Fonts API directly under that name
            // If it's Hubot Sans, we might need a different CDN or just pray it's local
            // For others, use Google Fonts v2 with a flexible weight range
            if (family.toLowerCase().includes('hubot')) {
                link.href = `https://cdn.jsdelivr.net/npm/hubot-sans@1.0.1/dist/hubot-sans.min.css`;
            } else {
                // Simplest possible Google Fonts URL for maximum compatibility
                link.href = `https://fonts.googleapis.com/css2?family=${familyNormalized}&display=swap`;
            }

            document.head.appendChild(link);
            linkTags.push(link);
        });

        return () => {
            // Optional: cleanup could go here, but keeping fonts loaded is usually fine for the session
        };
    }, [fonts]);

    const headingFonts = fonts.filter(f => f.role === 'heading')
    const bodyFonts = fonts.filter(f => f.role === 'body')
    const unassignedFonts = fonts.filter(f => !f.role || (f.role !== 'heading' && f.role !== 'body'))

    // Base colors for the grid: All colors from Brand Kit + any custom colors added in session
    const brandKitColors = activeBrandKit?.colors || []
    const brandKitColorHexes = brandKitColors
        .map((c: unknown) => extractHex(c))
        .filter(Boolean)
    let colors = [
        ...brandKitColors,
        ...selectedBrandColors
            .filter((sc: SelectedColor) => !brandKitColors.some(bc => extractHex(bc) === extractHex(sc.color)))
            .map((sc: SelectedColor) => ({ color: sc.color, role: sc.role }))
    ]

    // If requested, only show colors that are actually selected
    if (onlyShowSelectedColors) {
        const initialCount = colors.length
        colors = colors.filter(c => {
            const h = extractHex(c)
            const isMatch = selectedBrandColors.some(sc => extractHex(sc.color) === h)
            return isMatch
        })
    }

    if (debugLabel.includes('Colors')) {
        log.debug('BRAND', `BrandingConfigurator render: ${debugLabel}`, {
            selected: selectedBrandColors.length,
            totalGrid: colors.length,
        })
    }

    // Ensure first logo is selected by default if none is selected and logos exist
    const hasAutoSelected = useRef(false)
    useEffect(() => {
        if (!hasAutoSelected.current && logos.length > 0 && !selectedLogoId) {
            onSelectLogo(primaryLogoId)
            hasAutoSelected.current = true
        }
    }, [logos, onSelectLogo, primaryLogoId, selectedLogoId])

    const logoOptionClassName =
        "group relative flex h-[62px] w-[62px] items-center justify-center overflow-hidden rounded-[1rem] border bg-background/80 p-2 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.28)] transition-all duration-200"
    return (
        <div className="space-y-4">
            {/* Logo Selector */}
            {showLogo && logos.length > 0 && (
                <div className="space-y-3">
                    <div className="flex flex-wrap gap-2.5">
                        {/* Logo options */}
                        {logos.map((logo, idx) => {
                            const logoId = `logo-${idx}`
                            const isSelected = selectedLogoId === logoId
                            const logoRecord = logo as LogoLike
                            const logoUrl = typeof logoRecord === 'string'
                                ? logoRecord
                                : typeof logoRecord.url === 'string'
                                    ? logoRecord.url
                                    : ''

                            return (
                                <button
                                    key={logoId}
                                    onClick={() => onSelectLogo(logoId)}
                                    aria-label={t('brandingConfigurator.selectLogo', {
                                        defaultValue: 'Seleccionar logo {{index}}',
                                        index: idx + 1,
                                    })}
                                    className={cn(
                                        logoOptionClassName,
                                        isSelected
                                            ? "border-primary/36 bg-primary/[0.07] shadow-[0_18px_38px_-28px_rgba(120,142,84,0.42)]"
                                            : "border-border/65 hover:border-border/90 hover:bg-background"
                                    )}
                                >
                                    <img
                                        src={logoUrl}
                                        alt={`Logo ${idx + 1}`}
                                        className="h-full w-full object-contain"
                                    />
                                </button>
                            )
                        })}

                        {/* No logo option */}
                        <button
                            onClick={() => onSelectLogo(null)}
                            aria-label={t('brandingConfigurator.selectNoLogo', { defaultValue: 'No usar logo' })}
                            className={cn(
                                logoOptionClassName,
                                "text-[0.78rem] font-medium text-muted-foreground leading-tight",
                                selectedLogoId === null
                                    ? "border-primary/36 bg-primary/[0.07] text-foreground shadow-[0_18px_38px_-28px_rgba(120,142,84,0.42)]"
                                    : "border-border/65 hover:border-border/90 hover:bg-background"
                            )}
                        >
                            <span className="max-w-[46px] text-center">
                                {t('brandingConfigurator.noLogo', { defaultValue: 'Sin logo' })}
                            </span>
                        </button>
                    </div>
                </div>
            )}

            {/* Brand Colors */}
            {showColors && (
                <div className="space-y-3">
                    <div className="grid grid-cols-5 gap-3">
                        {colors.slice(0, 10).map((colorObj, idx) => {
                            const color = extractHex(colorObj)
                            if (!color) return null

                            const selection = selectedBrandColors.find(s => extractHex(s.color) === color)
                            const isSelected = !!selection

                            // Only show role if selected OR it's a fixed brand kit color (to guide the user)
                            const rawRole = selection?.role || (typeof colorObj === 'object' && colorObj !== null ? (colorObj as { role?: unknown }).role : undefined)
                            const role = typeof rawRole === 'string' ? rawRole : ''
                            const showRole = !!role

                            return (
                                <div
                                    key={`${color}-${idx}`}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => {
                                        log.debug('BRAND', 'Toggling brand color', { color })
                                        onToggleBrandColor(color)
                                    }}
                                    className={cn(
                                        "group/swatch relative aspect-square rounded-[1rem] border transition-all shadow-[0_18px_34px_-28px_rgba(15,23,42,0.28)] flex items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                                        isSelected
                                            ? "border-primary/30 ring-1 ring-primary/20"
                                            : "border-border/65 hover:border-border/90 hover:scale-[1.03]"
                                    )}
                                    style={{
                                        backgroundColor: color,
                                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)'
                                    }}
                                    title={`${color}${role ? ` - ${role}` : ''}`}
                                >
                                    {/* Light color visibility assurance */}
                                    <div className="absolute inset-0 rounded-full border border-black/5 pointer-events-none" />

                                    {/* role label - show always if role exists */}
                                    {showRole && (
                                        <div className={cn(
                                            "z-10 font-black text-[9px] leading-none tracking-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)] select-none pointer-events-none uppercase text-center px-1 transition-opacity",
                                            getContrastColor(color)
                                        )}>
                                            {role.replace(/\d+$/, '').replace(/Color\s*/i, '').trim() || 'Acento'}
                                        </div>
                                    )}

                                    {/* Quick Remove Button */}
                                    {isSelected && onRemoveBrandColor && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                log.debug('BRAND', 'Removing brand color', { color })
                                                onRemoveBrandColor(color)
                                            }}
                                            className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-lg opacity-0 transition-all duration-200 group-hover/swatch:opacity-100 hover:bg-black/70 z-20"
                                            title={`${t('actions.delete', { defaultValue: 'Delete' })} color`}
                                        >
                                            <IconClose className="w-2.5 h-2.5" />
                                        </button>
                                    )}
                                </div>
                            )
                        })}

                        {/* Custom Color Adder - only show if less than 10 colors */}
                        {colors.length < 10 && <CustomColorPicker onAdd={onAddCustomColor} presetColors={brandKitColorHexes} />}
                    </div>
                </div>
            )}

            {/* Typography Section */}
            {showTypography && fonts.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-border/10">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <IconTextFont className="w-3 h-3 text-primary" />
                            {t('brandingConfigurator.typography', { defaultValue: 'Typography' })}
                        </label>
                        <Link
                            href="/brand-kit"
                            className="text-[9px] text-primary hover:underline font-medium bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10 transition-colors"
                        >
                            {t('brandingConfigurator.editInKit', { defaultValue: 'Edit in Kit' })}
                        </Link>
                    </div>

                    <div className="space-y-3 bg-muted/5 p-2 rounded-lg border border-border/20">
                        {/* Heading Fonts */}
                        {headingFonts.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-[8px] uppercase font-bold text-muted-foreground/40 px-0.5">{t('brandingConfigurator.headings', { defaultValue: 'Headings' })}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {headingFonts.map((font, idx) => (
                                        <Badge
                                            key={idx}
                                            variant="outline"
                                            className="text-[10px] font-medium bg-muted/50 border-border/50 py-1 flex items-center gap-1.5"
                                            style={{ fontFamily: `"${font.family}", sans-serif` }}
                                        >
                                            <span className="opacity-60 text-[8px] font-normal border-r border-border/50 pr-1.5">Aa</span>
                                            {font.family}
                                        </Badge>
                                    ))}
                                </div>
                                {headingFonts[0] && (
                                    <p
                                        className="text-2xl md:text-3xl font-bold tracking-tighter text-foreground mt-4 px-0.5 leading-[1.05]"
                                        style={{ fontFamily: `"${headingFonts[0].family}", sans-serif` }}
                                    >
                                        {t('brandingConfigurator.headingSample', { defaultValue: 'Explore new visual worlds.' })}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Body Fonts */}
                        {bodyFonts.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-[8px] uppercase font-bold text-muted-foreground/40 px-0.5">{t('brandingConfigurator.paragraphs', { defaultValue: 'Paragraphs' })}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {bodyFonts.map((font, idx) => (
                                        <Badge
                                            key={idx}
                                            variant="outline"
                                            className="text-[10px] font-medium bg-muted/50 border-border/50 py-1 flex items-center gap-1.5"
                                            style={{ fontFamily: `"${font.family}", sans-serif` }}
                                        >
                                            <span className="opacity-60 text-[8px] font-normal border-r border-border/50 pr-1.5">Aa</span>
                                            {font.family}
                                        </Badge>
                                    ))}
                                </div>
                                {bodyFonts[0] && (
                                    <p
                                        className="text-base opacity-90 mt-3 px-0.5 leading-normal"
                                        style={{ fontFamily: `"${bodyFonts[0].family}", sans-serif` }}
                                    >
                                        {t('brandingConfigurator.bodySample', { defaultValue: 'Intelligent design for brands with purpose and future vision.' })}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Other Fonts */}
                        {unassignedFonts.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-[8px] uppercase font-bold text-muted-foreground/40 px-0.5">Otras fuentes</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {unassignedFonts.map((font, idx) => (
                                        <Badge
                                            key={idx}
                                            variant="outline"
                                            className="text-[10px] font-medium bg-muted/50 border-border/50 py-1 flex items-center gap-1.5"
                                            style={{ fontFamily: `"${font.family}", sans-serif` }}
                                        >
                                            <span className="opacity-60 text-[8px] font-normal border-r border-border/50 pr-1.5">Aa</span>
                                            {font.family}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Brand Texts Section */}
            {showBrandTexts && textAssets.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-border/10">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                        <IconFingerprint className="w-3 h-3 text-primary" />
                        {t('preview.brandTexts', { defaultValue: 'Brand Kit texts' })}
                    </label>

                    <div className="space-y-6">
                        {textAssets.map((asset) => (
                            <TextAssetRow
                                key={asset.id}
                                asset={asset}
                                textResources={[]} // Optional: could pass actual brand kit resources here if needed
                                rawMessage={rawMessage}
                                onUpdate={onUpdateTextAsset || (() => { })}
                                onRemove={onRemoveTextAsset || (() => { })}
                                onGenerateText={onGenerateText}
                                headingFont={headingFonts[0]?.family}
                                bodyFont={bodyFonts[0]?.family}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}


