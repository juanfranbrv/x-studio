'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import type { BrandDNA } from '@/lib/brand-types'
import { ColorPalette } from '@/components/brand-dna/ColorPalette'
import { useBrandKit } from '@/contexts/BrandKitContext'
import { IconPalette, IconImage, IconCheck, IconPlus, IconClose, IconZoomIn, IconChevronDown, IconTextFont, IconLink, IconAtSign, IconPhone, IconMapPin, IconMail, IconDelete } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import { uploadBrandImage } from '@/app/actions/upload-image'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ARTISTIC_STYLE_CATALOG } from '@/lib/creation-flow-types'

import { ContextElement, ContextType } from '@/app/image/page'

// Extracted DraggableChip component to avoid re-creation on parent re-renders
interface DraggableChipProps {
    id: string
    type: ContextType
    value: string
    label: string
    icon?: React.ComponentType<{ className?: string }>
    isSelected: boolean
    onDragStart: (e: React.DragEvent, element: ContextElement) => void
    onDragEnd: () => void
    onToggle: () => void
}

function DraggableChip({ id, type, value, label, icon: Icon, isSelected, onDragStart, onDragEnd, onToggle }: DraggableChipProps) {
    return (
        <div
            draggable={true}
            onDragStart={(e) => {
                e.stopPropagation()
                onDragStart(e, { id, type, value, label })
            }}
            onDragEnd={onDragEnd}
            onClick={(e) => {
                e.stopPropagation()
                onToggle()
            }}
            className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium cursor-grab active:cursor-grabbing transition-all border select-none",
                isSelected
                    ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                    : "bg-muted/30 text-muted-foreground border-transparent hover:border-border hover:bg-muted/50"
            )}
        >
            {Icon && <Icon className="w-3 h-3 opacity-60 pointer-events-none" />}
            <span className="truncate max-w-[180px] pointer-events-none">{label}</span>
            {isSelected && <IconCheck className="w-3 h-3 ml-0.5 pointer-events-none" />}
        </div>
    )
}

interface BrandDNAPanelProps {
    brandDNA: BrandDNA
    logoInclusion?: boolean
    onLogoInclusionChange?: (enabled: boolean) => void
    onAddContext?: (element: ContextElement) => void
    onRemoveContext?: (id: string) => void
    onSetDraggedElement?: (element: ContextElement | null) => void
    selectedContext?: ContextElement[]
    onImageClick?: (url: string) => void
    // Text Assets
    textAssets?: { id: string; type: 'cta' | 'tagline' | 'url' | 'custom'; label: string; value: string }[]
    onAddTextAsset?: (asset: { id: string; type: 'cta' | 'tagline' | 'url' | 'custom'; label: string; value: string }) => void
    onRemoveTextAsset?: (id: string) => void
    onUpdateTextAsset?: (id: string, value: string) => void
}

export function BrandDNAPanel({
    brandDNA: initialData,
    logoInclusion = true,
    onLogoInclusionChange,
    onAddContext,
    onRemoveContext,
    onSetDraggedElement,
    selectedContext = [],
    onImageClick,
    textAssets = [],
    onAddTextAsset,
    onRemoveTextAsset,
    onUpdateTextAsset,
}: BrandDNAPanelProps) {
    const { t } = useTranslation()
    const { updateActiveBrandKit } = useBrandKit()
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const [data, setData] = useState<BrandDNA>(initialData)
    const [isSaving, setIsSaving] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [viewerImage, setViewerImage] = useState<string | null>(null)

    // Accordion state - sections open by default
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        textPrompts: true,
        colors: true,
        logos: true,
        images: true,
        typography: false,
        textAssets: false,
        links: false,
    })
    const [newAesthetic, setNewAesthetic] = useState('')

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))
    }

    // Sync with initialData when brand ID changes or there are no unsaved changes
    useEffect(() => {
        const isSameBrand = initialData.id && data.id && initialData.id === data.id;

        // If brand ID changed, always sync and reset unsaved changes
        if (!isSameBrand) {
            setData(initialData);
            setHasUnsavedChanges(false);
            return;
        }

        // If same brand, only sync if there are no unsaved changes
        if (!hasUnsavedChanges) {
            setData(initialData);
        }
    }, [initialData, hasUnsavedChanges]);

    // Auto-save logic
    useEffect(() => {
        if (hasUnsavedChanges && !isSaving) {
            const timer = setTimeout(() => {
                handleSave()
            }, 2000)
            return () => clearTimeout(timer)
        }
    }, [data, hasUnsavedChanges, isSaving])

    const handleSave = async () => {
        if (!hasUnsavedChanges) return
        setIsSaving(true)
        try {
            await updateActiveBrandKit(data)
            setHasUnsavedChanges(false)
        } catch (error) {
            console.error('Error auto-saving from Imagen:', error)
        } finally {
            setIsSaving(false)
        }
    }

    const updateData = useCallback((updater: (prev: BrandDNA) => BrandDNA) => {
        setData(prev => {
            const newData = updater(prev)
            setHasUnsavedChanges(true)
            return newData
        })
    }, [])

    const { colors = [], fonts = [], brand_name, logo_url, logos = [], tone_of_voice = [], tagline, brand_values = [], visual_aesthetic = [], url, social_links = [], emails = [], phones = [], addresses = [] } = data

    // Group fonts by role
    const headingFonts = fonts.filter((f: any) => typeof f === 'object' && f.role === 'heading')
    const bodyFonts = fonts.filter((f: any) => typeof f === 'object' && f.role === 'body')
    const unassignedFonts = fonts.filter((f: any) => typeof f === 'string' || (typeof f === 'object' && f.role !== 'heading' && f.role !== 'body'))

    // Handlers for ColorPalette
    const handleAddColor = () => {
        updateData(prev => ({
            ...prev,
            colors: [...(prev.colors || []), { color: '#cccccc', sources: ['user'], score: 1, role: 'Acento', selected: true }]
        }))
    }

    const handleRemoveColor = (index: number) => {
        updateData(prev => ({
            ...prev,
            colors: prev.colors?.filter((_, i) => i !== index)
        }))
    }

    const handleUpdateColor = (index: number, newColor: string) => {
        updateData(prev => ({
            ...prev,
            colors: prev.colors?.map((c, i) => i === index ? { ...c, color: newColor } : c)
        }))
    }

    const handleUpdateColorRole = (index: number, newRole: string) => {
        updateData(prev => ({
            ...prev,
            colors: prev.colors?.map((c, i) => i === index ? { ...c, role: newRole } : c)
        }))
    }

    const handleSwapColorPositions = (indexA: number, indexB: number) => {
        updateData(prev => {
            const newColors = [...(prev.colors || [])]
            if (newColors[indexA] && newColors[indexB]) {
                const temp = newColors[indexA]
                newColors[indexA] = newColors[indexB]
                newColors[indexB] = temp
            }
            return { ...prev, colors: newColors }
        })
    }

    const handleToggleColorSelection = (index: number) => {
        const colorObj = colors[index]
        const isCurrentlySelected = selectedContext.some(c => c.id === `color-${index}`)

        if (isCurrentlySelected) {
            onRemoveContext?.(`color-${index}`)
        } else {
            onAddContext?.({
                id: `color-${index}`,
                type: 'color',
                value: colorObj.color,
                label: colorObj.role || colorObj.color
            })
        }

        updateData(prev => ({
            ...prev,
            colors: prev.colors?.map((c, i) => i === index ? { ...c, selected: !c.selected } : c)
        }))
    }

    const handleResetColors = () => {
        setData(initialData)
        setHasUnsavedChanges(false)
    }

    const handleToggleImageSelection = (idx: number) => {
        const image = allImages[idx]
        const isCurrentlySelected = selectedContext.some(c => c.id === `image-${idx}`)

        if (isCurrentlySelected) {
            onRemoveContext?.(`image-${idx}`)
        } else {
            onAddContext?.({
                id: `image-${idx}`,
                type: 'image',
                value: image.url,
                label: t('brandDnaPanel.imageLabel', { index: idx + 1, defaultValue: 'Image {{index}}' })
            })
        }

        updateData(prev => {
            const newImages = [...(prev.images || [])]
            const current = newImages[idx]

            if (typeof current === 'string') {
                newImages[idx] = { url: current, selected: !isCurrentlySelected }
            } else if (current && typeof current === 'object') {
                newImages[idx] = {
                    ...current,
                    url: (current as any).url || '',
                    selected: !isCurrentlySelected
                }
            }
            return { ...prev, images: newImages }
        })
    }

    const handleRemoveImage = (index: number) => {
        updateData(prev => ({
            ...prev,
            images: prev.images?.filter((_, i) => i !== index)
        }))
    }

    const handleToggleLogoSelection = (idx: number) => {
        const logo = logos[idx]
        const isCurrentlySelected = selectedContext.some(c => c.id === `logo-${idx}`)

        if (isCurrentlySelected) {
            onRemoveContext?.(`logo-${idx}`)
        } else {
            onAddContext?.({
                id: `logo-${idx}`,
                type: 'logo',
                value: logo.url,
                label: t('brandDnaPanel.logoBadge', { defaultValue: 'Logo' })
            })
        }

        updateData(prev => {
            const newLogos = [...(prev.logos || [])]
            newLogos.forEach((l, i) => {
                if (i !== idx) l.selected = false
                else l.selected = !l.selected
            })
            return {
                ...prev,
                logos: newLogos,
                logo_url: newLogos.find(l => l.selected)?.url || ''
            }
        })
    }

    const handleRemoveLogo = (idx: number) => {
        updateData(prev => {
            const newLogos = prev.logos?.filter((_, i) => i !== idx) || []
            const hasSelected = newLogos.some(l => l.selected)
            if (!hasSelected && newLogos.length > 0) {
                newLogos[0].selected = true
            }
            return {
                ...prev,
                logos: newLogos,
                logo_url: newLogos.find(l => l.selected)?.url || ''
            }
        })
    }

    const handleUploadLogos = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return
        const files = Array.from(e.target.files)
        const currentCount = logos.length
        const remaining = 6 - currentCount
        if (remaining <= 0) return

        const toUpload = files.slice(0, remaining)
        setIsSaving(true)

        try {
            const uploadedUrls: string[] = []
            for (const file of toUpload) {
                const formData = new FormData()
                formData.append('file', file)
                formData.append('assetKind', 'logo')
                const result = await uploadBrandImage(formData)
                if (result.success && result.url) {
                    uploadedUrls.push(result.url)
                }
            }

            if (uploadedUrls.length > 0) {
                updateData(prev => {
                    const newLogos = [...(prev.logos || [])]
                    uploadedUrls.forEach(url => {
                        const isFirst = newLogos.length === 0
                        newLogos.push({ url, selected: isFirst })
                    })
                    return {
                        ...prev,
                        logos: newLogos,
                        logo_url: newLogos.find(l => l.selected)?.url || prev.logo_url
                    }
                })
            }
        } catch (error) {
            console.error('Error uploading logos:', error)
        } finally {
            setIsSaving(false)
        }
    }

    const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return
        const files = Array.from(e.target.files)
        const currentImagesCount = data.images?.length || 0

        if (currentImagesCount + files.length > 20) {
            alert(t('brandDnaPanel.maxImagesAlert', { defaultValue: 'You can have up to 20 images in your brand library.' }))
            return
        }

        setIsSaving(true)
        try {
            const uploadedImages: { url: string; selected: boolean }[] = []
            for (const file of files) {
                const formData = new FormData()
                formData.append('file', file)
                formData.append('assetKind', 'image')
                const result = await uploadBrandImage(formData)
                if (result.success && result.url) {
                    uploadedImages.push({ url: result.url, selected: true })
                }
            }

            if (uploadedImages.length > 0) {
                updateData(prev => ({
                    ...prev,
                    images: [...(prev.images || []), ...uploadedImages]
                }))
            }
        } catch (error) {
            console.error('Error uploading images to kit:', error)
        } finally {
            setIsSaving(false)
        }
    }

    const normalizeImg = (img: any) => {
        if (typeof img === 'string') return { url: img, selected: true };
        return {
            url: img?.url || '',
            selected: img?.selected !== false
        };
    };

    const allImages = (data.images || []).map(img => normalizeImg(img))
    const selectedCount = allImages.filter(img => img.selected !== false).length
    const totalCount = allImages.length

    const handleDeselectAll = () => {
        updateData(prev => ({
            ...prev,
            images: prev.images?.map(img => ({ ...img, selected: false })) || []
        }))
    }

    const selectedImages = allImages.filter(img => img.selected !== false);


    // Social Links Handlers
    const handleUpdateSocialLink = (index: number, field: 'username' | 'url', value: string) => {
        updateData(prev => {
            const newLinks = [...(prev.social_links || [])]
            if (newLinks[index]) {
                newLinks[index] = { ...newLinks[index], [field]: value }
            }
            return { ...prev, social_links: newLinks }
        })
    }

    const handleRemoveSocialLink = (index: number) => {
        updateData(prev => ({
            ...prev,
            social_links: prev.social_links?.filter((_, i) => i !== index)
        }))
    }

    const handleAddSocialLink = () => {
        updateData(prev => ({
            ...prev,
            social_links: [...(prev.social_links || []), { platform: 'Social', url: '', username: '' }]
        }))
    }

    // Visual Aesthetic Handlers
    const handleAddAesthetic = (value: string) => {
        if (!value.trim()) return
        updateData(prev => {
            // Avoid duplicates
            if (prev.visual_aesthetic?.includes(value)) return prev;
            return {
                ...prev,
                visual_aesthetic: [...(prev.visual_aesthetic || []), value]
            }
        })
        setNewAesthetic('')
    }

    const handleRemoveAesthetic = (index: number) => {
        updateData(prev => ({
            ...prev,
            visual_aesthetic: prev.visual_aesthetic?.filter((_, i) => i !== index)
        }))
    }

    const handleKeyPressAesthetic = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleAddAesthetic(newAesthetic)
        }
    }

    const handleDragStart = (e: React.DragEvent, element: ContextElement) => {
        const jsonData = JSON.stringify(element)
        e.dataTransfer.setData('application/x-image-context', jsonData)
        e.dataTransfer.setData('text/plain', element.label || element.value)
        e.dataTransfer.effectAllowed = 'copy'
        onSetDraggedElement?.(element)
    }

    const handleDragEnd = () => {
        onSetDraggedElement?.(null)
    }

    // Helper to generate common chip props
    const chipProps = (id: string, type: ContextType, value: string, label: string) => ({
        id,
        type,
        value,
        label,
        isSelected: selectedContext.some(c => c.id === id),
        onDragStart: handleDragStart,
        onDragEnd: handleDragEnd,
        onToggle: () => {
            const isSelected = selectedContext.some(c => c.id === id)
            if (isSelected) {
                onRemoveContext?.(id)
            } else {
                onAddContext?.({ id, type, value, label })
            }
        }
    })

    // Helper component for section headers
    const SectionHeader = ({ icon: Icon, title, count, maxCount, isOpen, extra }: {
        icon: any, title: string, count?: number, maxCount?: number, isOpen: boolean, extra?: React.ReactNode
    }) => (
        <div className="flex items-center justify-between w-full px-1 py-1">
            <CollapsibleTrigger className="flex-1 flex items-center justify-between hover:bg-white/40 rounded-xl transition-colors group pr-2 py-1">
                <div className="flex items-center gap-2 text-foreground">
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-brand-gradient text-white shadow-aero">
                        <Icon className="w-3 h-3" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest">
                        {title}
                        {count !== undefined && maxCount !== undefined && (
                            <span className="text-[10px] opacity-50 ml-1">({count}/{maxCount})</span>
                        )}
                    </span>
                </div>
                <IconChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground/40 transition-transform duration-300",
                    isOpen && "rotate-180"
                )} />
            </CollapsibleTrigger>
            {extra && (
                <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                    {extra}
                </div>
            )}
        </div>
    )


    return (
        <div className="w-full h-full bg-background border-l border-white/20 flex flex-col gap-2 overflow-hidden relative">
            {/* Lightbox Viewer */}
            {viewerImage && (
                <div
                    className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-10 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setViewerImage(null)}
                >
                    <button
                        onClick={() => setViewerImage(null)}
                        className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors"
                    >
                        <IconClose className="w-8 h-8" />
                    </button>
                    <img
                        src={viewerImage}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
                        alt={t('preview.title', { defaultValue: 'Preview' })}
                    />
                </div>
            )}

            <div className="p-4 flex flex-col gap-3 overflow-y-auto scrollbar-thin flex-1">
                {/* TEXT PROMPTS SECTION - REMOVED: Moved to TextLayersEditor (Canvas Preview Overlay) */}

                <hr className="border-t-2 border-border/50 my-1 -mx-2" />

                {/* COLORS SECTION */}
                <Collapsible open={openSections.colors} onOpenChange={() => toggleSection('colors')}>
                    <div className="space-y-0.5">
                        <SectionHeader
                            icon={IconPalette}
                            title={t('brandDNA.colorPalette')}
                            isOpen={openSections.colors}
                            extra={isSaving && (
                                <Badge variant="outline" className="animate-pulse bg-primary/10 text-[8px] py-0 px-1 h-3.5 text-primary border-primary/20">
                                    {t('brandDnaPanel.syncBadge', { defaultValue: 'SYNC' })}
                                </Badge>
                            )}
                        />
                        <CollapsibleContent>
                            <div className="bg-white/40 rounded-2xl p-3 border border-white/30">
                                <ColorPalette
                                    colors={colors}
                                    isEdited={hasUnsavedChanges}
                                    onUpdateColor={handleUpdateColor}
                                    onUpdateRole={handleUpdateColorRole}
                                    onToggleSelection={handleToggleColorSelection}
                                    onSwapPositions={handleSwapColorPositions}
                                    onRemoveColor={handleRemoveColor}
                                    onAddColor={handleAddColor}
                                    onReset={handleResetColors}
                                    hideHeader={true}
                                    selectedColorIds={selectedContext.filter(c => c.type === 'color').map(c => c.id)}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                />
                            </div>
                        </CollapsibleContent>
                    </div>
                </Collapsible>

                <hr className="border-t-2 border-border/50 my-1 -mx-2" />

                {/* LOGOS SECTION */}
                <Collapsible open={openSections.logos} onOpenChange={() => toggleSection('logos')}>
                    <div className="space-y-1">
                        <SectionHeader
                            icon={IconImage}
                            title={t('brandDnaPanel.brandLogos', { defaultValue: 'Brand logos' })}
                            count={logos.length}
                            maxCount={6}
                            isOpen={openSections.logos}
                            extra={
                                <label className={cn(
                                    "cursor-pointer hover:text-primary transition-colors p-0.5",
                                    logos.length >= 6 && "opacity-20 cursor-not-allowed pointer-events-none"
                                )} onClick={(e) => e.stopPropagation()}>
                                    <IconPlus className="w-3 h-3 text-muted-foreground/60" />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleUploadLogos} disabled={logos.length >= 6} />
                                </label>
                            }
                        />
                        <CollapsibleContent>
                            <p className="text-[8px] uppercase font-bold text-muted-foreground/50 px-0.5 mb-1">{t('brandDnaPanel.logoList', { defaultValue: 'Logos' })}</p>
                            <div className="grid grid-cols-3 gap-1.5 p-1">
                                {logos.map((logo, idx) => (
                                    <div
                                        key={`logo-${idx}`}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, {
                                            id: `logo-${idx}`,
                                            type: 'logo',
                                            value: logo.url,
                                            label: t('brandDnaPanel.logoBadge', { defaultValue: 'Logo' })
                                        })}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => handleToggleLogoSelection(idx)}
                                        className={cn(
                                            "group relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing flex items-center justify-center p-1.5 transparency-grid",
                                            selectedContext.some(c => c.id === `logo-${idx}`)
                                                ? "border-primary shadow-sm ring-1 ring-primary/20"
                                                : "border-transparent opacity-60 hover:opacity-100 hover:border-border"
                                        )}
                                    >
                                        <Badge className={cn(
                                            "absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 text-[8px] h-4 px-1 pointer-events-none",
                                            isDark ? "bg-white/90 text-black" : "bg-black/90 text-white"
                                        )}>
                                            {t('brandDnaPanel.logoBadge', { defaultValue: 'Logo' })}
                                        </Badge>
                                        <img
                                            src={logo.url}
                                            draggable={false}
                                            className="max-h-full max-w-full object-contain transition-transform group-hover:scale-110 pointer-events-none select-none"
                                            alt={t('brandDnaPanel.logoAlt', { defaultValue: 'Logo' })}
                                        />
                                        {selectedContext.some(c => c.id === `logo-${idx}`) && (
                                            <div className={cn(
                                                "absolute top-1 left-1 flex items-center justify-center transition-all duration-200 z-30 pointer-events-none",
                                                isDark
                                                    ? "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                                                    : "text-primary drop-shadow-[0_0_8px_rgba(255,255,255,1)]"
                                            )}>
                                                <IconCheck className="w-3.5 h-3.5 stroke-[3px]" />
                                            </div>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRemoveLogo(idx); }}
                                            className="absolute top-0.5 right-0.5 p-0.5 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                                        >
                                            <IconClose className="w-2 h-2" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setViewerImage(logo.url); }}
                                            className="absolute bottom-0.5 right-0.5 p-0.5 bg-white/90 text-black rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                                        >
                                            <IconZoomIn className="w-2 h-2" />
                                        </button>
                                    </div>
                                ))}
                                {Array.from({ length: Math.max(0, 6 - logos.length) }).map((_, i) => (
                                    <label
                                        key={`placeholder-${i}`}
                                        className="border border-dashed border-muted-foreground/20 rounded-lg flex flex-col items-center justify-center bg-muted/5 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer aspect-square group"
                                    >
                                        <IconPlus className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary/50" />
                                        <input type="file" className="hidden" accept="image/*" onChange={handleUploadLogos} />
                                    </label>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </div>
                </Collapsible>

                <hr className="border-t-2 border-border/50 my-1 -mx-2" />

                {/* IMAGES SECTION */}
                <Collapsible open={openSections.images} onOpenChange={() => toggleSection('images')}>
                    <div className="space-y-1">
                        <SectionHeader
                            icon={IconImage}
                            title={t('brandDnaPanel.images', { defaultValue: 'Images' })}
                            count={selectedCount}
                            maxCount={totalCount}
                            isOpen={openSections.images}
                            extra={
                                <label className={cn(
                                    "cursor-pointer hover:text-primary transition-colors p-0.5",
                                    totalCount >= 20 && "opacity-20 cursor-not-allowed pointer-events-none"
                                )} onClick={(e) => e.stopPropagation()}>
                                    <IconPlus className="w-3 h-3 text-muted-foreground/60" />
                                    <input type="file" multiple className="hidden" accept="image/*" onChange={handleUploadImages} disabled={totalCount >= 20} />
                                </label>
                            }
                        />
                        <CollapsibleContent>
                            <Tabs defaultValue="selected" className="w-full">
                                <TabsList className="bg-muted/50 h-6 p-0.5 w-full">
                                    <TabsTrigger value="selected" className="text-[9px] px-2 h-5 uppercase font-bold tracking-tight flex-1">
                                        {t('brandDnaPanel.used', { defaultValue: 'Used' })} <Badge className="ml-1 h-3 min-w-[12px] px-0.5 text-[7px] flex items-center justify-center bg-primary/20 text-primary border-none">{selectedCount}</Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="library" className="text-[9px] px-2 h-5 uppercase font-bold tracking-tight flex-1">{t('brandDnaPanel.library', { defaultValue: 'Library' })}</TabsTrigger>
                                </TabsList>

                                <TabsContent value="selected" className="mt-1">
                                    <div className="grid grid-cols-3 gap-1 max-h-[200px] overflow-y-auto pr-0.5 scrollbar-thin">
                                        {selectedImages.map((img, i) => {
                                            const originalIdx = (data.images || []).findIndex(orig => (orig as any).url === img.url || orig === img.url);
                                            const elementId = `image-${originalIdx}`;
                                            const isSelected = selectedContext.some(c => c.id === elementId);

                                            return (
                                                <div
                                                    key={`sel-${i}`}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, {
                                                        id: elementId,
                                                        type: 'image',
                                                        value: img.url,
                                                        label: t('brandDnaPanel.imageLabel', { index: originalIdx + 1, defaultValue: 'Image {{index}}' })
                                                    })}
                                                    onDragEnd={handleDragEnd}
                                                    onClick={() => {
                                                        if (onImageClick) {
                                                            onImageClick(img.url)
                                                        } else {
                                                            handleToggleImageSelection(originalIdx)
                                                        }
                                                    }}
                                                    className={cn(
                                                        "group relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing transparency-grid",
                                                        isSelected
                                                            ? "border-primary shadow-sm"
                                                            : "border-transparent opacity-60 hover:opacity-100 hover:border-border"
                                                    )}
                                                >
                                                    <img
                                                        src={img.url}
                                                        draggable={false}
                                                        className="w-full h-full object-cover pointer-events-none select-none"
                                                        alt={t('brandDnaPanel.imageLabel', { index: originalIdx + 1, defaultValue: 'Image {{index}}' })}
                                                    />
                                                    {isSelected && (
                                                        <div className={cn(
                                                            "absolute top-1 left-1 z-30 pointer-events-none",
                                                            isDark ? "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" : "text-primary drop-shadow-[0_0_8px_rgba(255,255,255,1)]"
                                                        )}>
                                                            <IconCheck className="w-3.5 h-3.5 stroke-[3px]" />
                                                        </div>
                                                    )}
                                                    <div className="absolute bottom-0.5 right-0.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setViewerImage(img.url); }}
                                                            className="w-4 h-4 bg-white/90 text-black rounded-full flex items-center justify-center hover:scale-110"
                                                        >
                                                            <IconZoomIn className="w-2 h-2" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleRemoveImage(originalIdx); }}
                                                            className="w-4 h-4 bg-destructive text-white rounded-full flex items-center justify-center hover:scale-110"
                                                        >
                                                            <IconClose className="w-2 h-2" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {selectedImages.length === 0 && (
                                            <div className="col-span-3 py-6 text-center border border-dashed border-muted/50 rounded-lg">
                                                <p className="text-[9px] text-muted-foreground opacity-50">{t('brandDnaPanel.nothingSelected', { defaultValue: 'Nothing selected' })}</p>
                                            </div>
                                        )}
                                    </div>
                                    {selectedImages.length > 0 && (
                                        <button
                                            onClick={handleDeselectAll}
                                            className="w-full mt-1.5 text-[8px] text-muted-foreground hover:text-primary font-bold uppercase tracking-wider transition-colors"
                                        >
                                            {t('brandDnaPanel.clearSelection', { defaultValue: 'Clear selection' })}
                                        </button>
                                    )}
                                </TabsContent>

                                <TabsContent value="library" className="mt-1">
                                    <div className="grid grid-cols-3 gap-1 max-h-[200px] overflow-y-auto pr-0.5 scrollbar-thin">
                                        {allImages.map((img, idx) => {
                                            const elementId = `image-${idx}`;
                                            const isSelected = selectedContext.some(c => c.id === elementId);

                                            return (
                                                <div
                                                    key={`lib-${idx}`}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, {
                                                        id: elementId,
                                                        type: 'image',
                                                        value: img.url,
                                                        label: t('brandDnaPanel.imageLabel', { index: idx + 1, defaultValue: 'Image {{index}}' })
                                                    })}
                                                    onDragEnd={handleDragEnd}
                                                    onClick={() => {
                                                        if (onImageClick) {
                                                            onImageClick(img.url)
                                                        } else {
                                                            handleToggleImageSelection(idx)
                                                        }
                                                    }}
                                                    className={cn(
                                                        "group relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing transparency-grid",
                                                        isSelected
                                                            ? "border-primary shadow-sm"
                                                            : "border-transparent opacity-60 hover:opacity-100 hover:border-border"
                                                    )}
                                                >
                                                    <img
                                                        src={img.url}
                                                        draggable={false}
                                                        className="w-full h-full object-cover pointer-events-none select-none"
                                                        alt={`Asset ${idx}`}
                                                    />
                                                    {isSelected && (
                                                        <div className={cn(
                                                            "absolute top-1 left-1 z-30 pointer-events-none",
                                                            isDark ? "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" : "text-primary drop-shadow-[0_0_8px_rgba(255,255,255,1)]"
                                                        )}>
                                                            <IconCheck className="w-3.5 h-3.5 stroke-[3px]" />
                                                        </div>
                                                    )}
                                                    <div className="absolute bottom-0.5 right-0.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setViewerImage(img.url); }}
                                                            className="w-4 h-4 bg-white/90 text-black rounded-full flex items-center justify-center hover:scale-110"
                                                        >
                                                            <IconZoomIn className="w-2 h-2" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                                                            className="w-4 h-4 bg-destructive text-white rounded-full flex items-center justify-center hover:scale-110"
                                                        >
                                                            <IconClose className="w-2 h-2" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {totalCount < 20 && (
                                            <label className="border border-dashed border-muted-foreground/20 rounded-lg flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer aspect-square group">
                                                <IconPlus className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary/50" />
                                                <input type="file" multiple className="hidden" accept="image/*" onChange={handleUploadImages} />
                                            </label>
                                        )}
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CollapsibleContent>
                    </div>
                </Collapsible>

                <hr className="border-t-2 border-border/50 my-1 -mx-2" />

                {/* TYPOGRAPHY SECTION */}
                <Collapsible open={openSections.typography} onOpenChange={() => toggleSection('typography')}>
                    <div className="space-y-1">
                        <SectionHeader
                            icon={IconTextFont}
                            title={t('brandDnaPanel.typography', { defaultValue: 'Typography' })}
                            isOpen={openSections.typography}
                            extra={
                                <Link href="/brand-kit" className="text-[9px] text-primary hover:underline flex items-center gap-1 font-medium bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                                    {t('brandingConfigurator.editInKit', { defaultValue: 'Edit in Kit' })}
                                </Link>
                            }
                        />
                        <CollapsibleContent>
                            <div className="space-y-3 p-2 bg-muted/10 rounded-xl border border-border/30">
                                {/* Headlines */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between px-0.5">
                                        <p className="text-[8px] uppercase font-bold text-muted-foreground/50">{t('brandingConfigurator.headings', { defaultValue: 'Headings' })}</p>
                                        {headingFonts.length === 0 && <span className="text-[8px] text-muted-foreground/30 italic">{t('brandDnaPanel.unassigned', { defaultValue: 'Unassigned' })}</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {headingFonts.map((font, idx) => (
                                            <DraggableChip
                                                key={`heading-font-${idx}`}
                                                {...chipProps(`font-heading-${idx}`, 'font', font.family, font.family)}
                                                icon={IconTextFont}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Body / Paragraphs */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between px-0.5">
                                        <p className="text-[8px] uppercase font-bold text-muted-foreground/50">{t('brandingConfigurator.paragraphs', { defaultValue: 'Paragraphs' })}</p>
                                        {bodyFonts.length === 0 && <span className="text-[8px] text-muted-foreground/30 italic">{t('brandDnaPanel.unassigned', { defaultValue: 'Unassigned' })}</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {bodyFonts.map((font, idx) => (
                                            <DraggableChip
                                                key={`body-font-${idx}`}
                                                {...chipProps(`font-body-${idx}`, 'font', font.family, font.family)}
                                                icon={IconTextFont}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Other unassigned fonts if any (legacy or just not assigned roles) */}
                                {unassignedFonts.length > 0 && (
                                    <div className="space-y-1 pt-1 border-t border-border/20">
                                        <p className="text-[8px] uppercase font-bold text-muted-foreground/50 px-0.5">{t('brandDnaPanel.otherFonts', { defaultValue: 'Other fonts' })}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {unassignedFonts.map((font, idx) => {
                                                const family = typeof font === 'string' ? font : font.family
                                                return (
                                                    <DraggableChip
                                                        key={`other-font-${idx}`}
                                                        {...chipProps(`font-other-${idx}`, 'font', family, family)}
                                                        icon={IconTextFont}
                                                    />
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {fonts.length === 0 && (
                                    <p className="text-[9px] text-muted-foreground/50 italic p-1 text-center">{t('brandDnaPanel.noFontsDetected', { defaultValue: 'No fonts detected' })}</p>
                                )}
                            </div>
                        </CollapsibleContent>
                    </div>
                </Collapsible>

                <hr className="border-t-2 border-border/50 my-1 -mx-2" />

                {/* TEXT ASSETS SECTION */}
                <Collapsible open={openSections.textAssets} onOpenChange={() => toggleSection('textAssets')}>
                    <div className="space-y-1">
                        <SectionHeader
                            icon={IconTextFont}
                            title={t('preview.brandTexts', { defaultValue: 'Brand Kit texts' })}
                            isOpen={openSections.textAssets}
                        />
                        <CollapsibleContent>
                            <div className="space-y-2 p-1.5 bg-muted/10 rounded-lg">
                                {/* Tagline */}
                                {tagline && (
                                    <div className="space-y-0.5">
                                        <p className="text-[8px] uppercase font-bold text-muted-foreground/50 px-0.5">{t('brandDnaPanel.tagline', { defaultValue: 'Tagline' })}</p>
                                        <DraggableChip
                                            {...chipProps('tagline', 'text', tagline, tagline)}
                                        />
                                    </div>
                                )}

                                {/* Brand Values */}
                                {brand_values.length > 0 && (
                                    <div className="space-y-0.5">
                                        <p className="text-[8px] uppercase font-bold text-muted-foreground/50 px-0.5">{t('brandDnaPanel.values', { defaultValue: 'Values' })}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {brand_values.map((val, idx) => (
                                                <DraggableChip
                                                    key={`value-${idx}`}
                                                    {...chipProps(`value-${idx}`, 'text', val, val)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Tone of Voice */}
                                {tone_of_voice.length > 0 && (
                                    <div className="space-y-0.5">
                                        <p className="text-[8px] uppercase font-bold text-muted-foreground/50 px-0.5">{t('brandDnaPanel.tone', { defaultValue: 'Tone of voice' })}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {tone_of_voice.map((tone, idx) => (
                                                <DraggableChip
                                                    key={`tone-${idx}`}
                                                    {...chipProps(`tone-${idx}`, 'text', tone, tone)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Visual Aesthetic */}
                                <div className="space-y-2">
                                    <p className="text-[8px] uppercase font-bold text-muted-foreground/50 px-0.5">{t('brandDnaPanel.visualAesthetic', { defaultValue: 'Visual aesthetic' })}</p>

                                    {/* Add New Style */}
                                    <div className="flex gap-1.5">
                                        <Input
                                            value={newAesthetic}
                                            onChange={(e) => setNewAesthetic(e.target.value)}
                                            onKeyDown={handleKeyPressAesthetic}
                                            placeholder={t('brandDnaPanel.addVisualStyle', { defaultValue: 'Add visual style...' })}
                                            className="h-7 text-xs bg-muted/20 border-border/50"
                                        />
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="h-7 w-7 shrink-0"
                                            onClick={() => handleAddAesthetic(newAesthetic)}
                                            disabled={!newAesthetic.trim()}
                                        >
                                            <IconPlus className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>

                                    {/* Edit Existing Styles / Chips */}
                                    {visual_aesthetic.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {visual_aesthetic.map((ae, idx) => (
                                                <div key={`aesthetic-${idx}`} className="group relative">
                                                    <DraggableChip
                                                        id={`aesthetic-${idx}`}
                                                        type="text"
                                                        value={ae}
                                                        label={ae}
                                                        isSelected={selectedContext.some(c => c.id === `aesthetic-${idx}`)}
                                                        onDragStart={handleDragStart}
                                                        onDragEnd={() => onSetDraggedElement?.(null)}
                                                        onToggle={() => {
                                                            const id = `aesthetic-${idx}`
                                                            const exists = selectedContext.some(c => c.id === id)
                                                            if (exists) onRemoveContext?.(id)
                                                            else onAddContext?.({ id, type: 'text', value: ae, label: ae })
                                                        }}
                                                    />
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleRemoveAesthetic(idx)
                                                        }}
                                                        className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                                    >
                                                        <IconClose className="w-2.5 h-2.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {!tagline && brand_values.length === 0 && tone_of_voice.length === 0 && visual_aesthetic.length === 0 && (
                                    <p className="text-[9px] text-muted-foreground/50 italic p-1">{t('preview.noBrandTexts', { defaultValue: 'No texts available' })}</p>
                                )}
                            </div>
                        </CollapsibleContent>
                    </div>
                </Collapsible>

                <hr className="border-t-2 border-border/50 my-1 -mx-2" />

                {/* LINKS & CONTACT SECTION */}
                <Collapsible open={openSections.links} onOpenChange={() => toggleSection('links')}>
                    <div className="space-y-1">
                        <SectionHeader
                            icon={IconLink}
                            title={t('brandDnaPanel.linksAndContact', { defaultValue: 'Links and contact' })}
                            isOpen={openSections.links}
                        />
                        <CollapsibleContent>
                            <div className="space-y-2 p-1.5 bg-muted/10 rounded-lg">
                                {/* URL */}
                                {url && (
                                    <DraggableChip
                                        {...chipProps('url', 'link', url, url.replace(/^https?:\/\//, '').replace(/\/$/, ''))}
                                        icon={IconLink}
                                    />
                                )}

                                {/* Social Links */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-0.5">
                                        <p className="text-[8px] uppercase font-bold text-muted-foreground/50">{t('brandDnaPanel.socialNetworks', { defaultValue: 'Social networks' })}</p>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 text-[10px] text-muted-foreground hover:text-primary px-1"
                                            onClick={handleAddSocialLink}
                                        >
                                            <IconPlus className="w-3 h-3 mr-1" /> {t('brandDnaPanel.addSocial', { defaultValue: 'Add social' })}
                                        </Button>
                                    </div>

                                    {social_links.length > 0 ? (
                                        <div className="space-y-2">
                                            {social_links.map((link, idx) => (
                                                <div key={`social-${idx}`} className="flex gap-2 items-center bg-muted/20 p-1.5 rounded-lg border border-border/30 group">
                                                    <div className="grid grid-cols-2 gap-2 flex-1">
                                                        <Input
                                                            value={link.username || ''}
                                                            onChange={(e) => handleUpdateSocialLink(idx, 'username', e.target.value)}
                                                            placeholder={t('brandDnaPanel.socialUsernamePlaceholder', { defaultValue: '@username' })}
                                                            className="h-7 text-xs bg-white border-border/50"
                                                        />
                                                        <Input
                                                            value={link.url}
                                                            onChange={(e) => handleUpdateSocialLink(idx, 'url', e.target.value)}
                                                            placeholder="https://..."
                                                            className="h-7 text-xs bg-white border-border/50"
                                                        />
                                                    </div>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => handleRemoveSocialLink(idx)}
                                                    >
                                                        <IconDelete className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 border border-dashed border-border/50 rounded-lg">
                                            <p className="text-[10px] text-muted-foreground/60 mb-2">{t('brandDnaPanel.noSocials', { defaultValue: 'You have not added social profiles yet' })}</p>
                                            <Button variant="outline" size="sm" onClick={handleAddSocialLink} className="h-7 text-xs">
                                                <IconPlus className="w-3 h-3 mr-1" /> {t('brandDnaPanel.addFirstSocial', { defaultValue: 'Add first social' })}
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Emails */}
                                {emails.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {emails.map((email, idx) => (
                                            <DraggableChip
                                                key={`email-${idx}`}
                                                {...chipProps(`email-${idx}`, 'contact', email, email)}
                                                icon={IconMail}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Phones */}
                                {phones.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {phones.map((phone, idx) => (
                                            <DraggableChip
                                                key={`phone-${idx}`}
                                                {...chipProps(`phone-${idx}`, 'contact', phone, phone)}
                                                icon={IconPhone}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Addresses */}
                                {addresses.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {addresses.map((addr, idx) => (
                                            <DraggableChip
                                                key={`address-${idx}`}
                                                {...chipProps(`address-${idx}`, 'contact', addr, addr.length > 30 ? addr.substring(0, 30) + '...' : addr)}
                                                icon={IconMapPin}
                                            />
                                        ))}
                                    </div>
                                )}

                                {!url && social_links.length === 0 && emails.length === 0 && phones.length === 0 && addresses.length === 0 && (
                                    <p className="text-[9px] text-muted-foreground/50 italic p-1">{t('brandDnaPanel.noLinksOrContact', { defaultValue: 'No links or contact details' })}</p>
                                )}
                            </div>
                        </CollapsibleContent>
                    </div>
                </Collapsible>
            </div>

            {/* Brand Identity Footer */}
            <div className="p-3 pt-2 border-t-2 border-border bg-muted/20">
                <div className="h-[50px] flex items-center gap-2 overflow-hidden px-1">
                    {logo_url ? (
                        <img src={logo_url} alt={t('brandDnaPanel.logoAlt', { defaultValue: 'Logo' })} className="w-8 h-8 object-contain opacity-60" />
                    ) : (
                        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-[10px]">
                            🖼️
                        </div>
                    )}
                    <span className="text-xs font-medium truncate text-muted-foreground/80">{brand_name}</span>
                </div>
            </div>
        </div>
    )
}
