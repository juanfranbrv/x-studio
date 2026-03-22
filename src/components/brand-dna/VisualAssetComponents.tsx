'use client'

import { Loader2 } from '@/components/ui/spinner'
;

import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
    BRAND_KIT_ASSET_SURFACE_CLASS,
    BRAND_KIT_ACTIVE_TOKEN_CARD_CLASS,
    BRAND_KIT_OUTLINE_DASHED_BUTTON_CLASS,
    BRAND_KIT_PANEL_CLASS,
    BRAND_KIT_PANEL_DESCRIPTION_CLASS,
    BRAND_KIT_PANEL_HEADER_CLASS,
    BRAND_KIT_REMOVE_BUTTON_CLASS,
    BRAND_KIT_PANEL_SUBTLE_CLASS,
    BRAND_KIT_PANEL_TITLE_CLASS,
    BRAND_KIT_UPLOAD_SURFACE_CLASS,
} from './brandKitStyles';


import { IconMonitor, IconBuilding, IconSparkles, IconImage, IconMaximize, IconClose, IconUpload, IconCheckSimple } from '@/components/ui/icons';
import { useTranslation } from 'react-i18next';

// --- Interfaces ---
interface LogoCardProps {
    logoUrl?: string; // Legacy support
    logos?: { url: string; selected?: boolean }[];
    onUpload?: (files: FileList | File[]) => void;
    onRemove?: (index: number) => void;
    onToggle?: (index: number) => void;
    onReorder?: (fromIndex: number, toIndex: number) => void;
    isUploading?: boolean;
    /** Prevents single-logo full-width expansion */
    compactGrid?: boolean;
}

interface FaviconCardProps {
    faviconUrl?: string;
}

interface ScreenshotCardProps {
    screenshotUrl?: string;
    faviconUrl?: string;
}

interface ImageGalleryProps {
    images: { url: string }[];
    isUploading: boolean;
    onUpload: (files: FileList | File[]) => void;
    onRemoveImage: (index: number) => void;
    onOpenLightbox: (url: string) => void;
}

// --- Components ---

export function LogoCard({ logoUrl, logos = [], onUpload, onRemove, onToggle, onReorder, isUploading, compactGrid }: LogoCardProps) {
    const { t } = useTranslation('brandKit');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const suppressNextClickRef = useRef(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

    // Si no hay array de logos pero hay logoUrl, lo tratamos como el único logo
    const effectiveLogos = logos.length > 0
        ? logos
        : (logoUrl ? [{ url: logoUrl, selected: true }] : []);
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <Card className={cn(BRAND_KIT_PANEL_CLASS, "flex flex-col")}>
            <CardHeader className={cn(BRAND_KIT_PANEL_HEADER_CLASS, "pb-4")}>
                <CardTitle className={cn(BRAND_KIT_PANEL_TITLE_CLASS, "justify-between")}>
                    <div className="flex items-center gap-2">
                        <IconBuilding />
                        {t('visualAssets.logoTitle', { defaultValue: 'Brand logo' })}
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                        {effectiveLogos.length}/6
                    </span>
                </CardTitle>
                <p className={BRAND_KIT_PANEL_DESCRIPTION_CLASS}>
                    {t('visualAssets.logoDescription', { defaultValue: 'Selecciona las versiones principales de la identidad para que el resto de la app las reutilice con criterio.' })}
                </p>
            </CardHeader>
            <CardContent className="flex-1 px-6 pb-6 pt-0">
                {effectiveLogos.length === 0 ? (
                    <div
                        className={cn(
                            BRAND_KIT_UPLOAD_SURFACE_CLASS,
                            "flex min-h-[220px] h-full cursor-pointer flex-col items-center justify-center border text-muted-foreground transition-all",
                            "hover:border-primary/40 hover:bg-primary/5"
                        )}
                        onClick={handleUploadClick}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (e.dataTransfer.files && onUpload) onUpload(e.dataTransfer.files);
                        }}
                    >
                        <IconBuilding className="mb-3 h-9 w-9 opacity-40" />
                        <p className="text-sm font-medium">{t('visualAssets.uploadLogos', { defaultValue: 'Arrastra tus logos aquí o haz clic' })}</p>
                        <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                                if (e.target.files && onUpload) onUpload(e.target.files);
                            }}
                        />
                    </div>
                ) : (
                    <div className="flex h-full flex-wrap content-start gap-4">
                        {effectiveLogos.map((logo, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "group relative min-h-[176px] min-w-0 max-w-full cursor-pointer overflow-hidden rounded-[1.35rem] border transition-all transparency-grid",
                                    effectiveLogos.length === 1 && !compactGrid
                                        ? "basis-full"
                                        : "basis-[min(100%,12rem)] flex-[0_1_12rem]",
                                    logo.selected !== false
                                        ? BRAND_KIT_ACTIVE_TOKEN_CARD_CLASS
                                        : BRAND_KIT_PANEL_SUBTLE_CLASS,
                                    logo.selected === false && "opacity-75 saturate-[0.82] hover:opacity-100 hover:saturate-100",
                                    dropTargetIndex === idx && draggedIndex !== null && draggedIndex !== idx && "ring-2 ring-primary/70 ring-offset-1 ring-offset-background"
                                )}
                                draggable={Boolean(onReorder)}
                                onDragStart={(event) => {
                                    if (!onReorder) return;
                                    setDraggedIndex(idx);
                                    event.dataTransfer.effectAllowed = 'move';
                                    event.dataTransfer.setData('text/plain', String(idx));
                                }}
                                onDragOver={(event) => {
                                    if (!onReorder || draggedIndex === null) return;
                                    event.preventDefault();
                                    setDropTargetIndex(idx);
                                }}
                                onDrop={(event) => {
                                    if (!onReorder || draggedIndex === null) return;
                                    event.preventDefault();
                                    if (draggedIndex !== idx) {
                                        onReorder(draggedIndex, idx);
                                        suppressNextClickRef.current = true;
                                        setTimeout(() => {
                                            suppressNextClickRef.current = false;
                                        }, 0);
                                    }
                                    setDraggedIndex(null);
                                    setDropTargetIndex(null);
                                }}
                                onDragEnd={() => {
                                    setDraggedIndex(null);
                                    setDropTargetIndex(null);
                                }}
                                onClick={() => {
                                    if (suppressNextClickRef.current) return;
                                    if (onToggle) onToggle(idx);
                                }}
                            >
                                <div className="flex h-full min-h-[176px] items-center justify-center p-5">
                                    <img
                                        src={logo.url} /* Safe access, transparency-grid handles bg */
                                        alt={`Logo ${idx + 1}`}
                                        className="max-h-full w-full min-w-0 object-contain"
                                    />
                                </div>
                                {onRemove && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemove(idx);
                                        }}
                                        className={BRAND_KIT_REMOVE_BUTTON_CLASS}
                                    >
                                        <IconClose className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        ))}

                        {/* Upload Button inside Grid */}
                        {effectiveLogos.length < 6 && (
                            <div
                                className={cn(
                                    BRAND_KIT_UPLOAD_SURFACE_CLASS,
                                    "min-h-[176px] min-w-0 max-w-full flex flex-col items-center justify-center cursor-pointer gap-2 text-muted-foreground hover:text-primary transition-all",
                                    effectiveLogos.length === 0 ? "basis-full" : "basis-[min(100%,15rem)] flex-[1_1_15rem]",
                                    isUploading && "opacity-50 pointer-events-none"
                                )}
                                onClick={handleUploadClick}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (e.dataTransfer.files && onUpload) onUpload(e.dataTransfer.files);
                                }}
                            >
                                <input
                                    type="file"
                                    className="hidden"
                                    ref={fileInputRef}
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => {
                                        if (e.target.files && onUpload) onUpload(e.target.files);
                                    }}
                                />
                                {isUploading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        <IconUpload className="h-5 w-5" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{t('visualAssets.addMoreLogos', { defaultValue: 'Añadir' })}</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function FaviconCard({ faviconUrl }: FaviconCardProps) {
    const { t } = useTranslation('brandKit');
    return (
        <Card className={BRAND_KIT_PANEL_CLASS}>
            <CardHeader className={cn(BRAND_KIT_PANEL_HEADER_CLASS, "pb-4")}>
                <CardTitle className={BRAND_KIT_PANEL_TITLE_CLASS}>
                    <IconSparkles />
                    {t('visualAssets.faviconTitle', { defaultValue: 'Favicon' })}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-[170px] items-center justify-center px-6 pb-6 pt-0 transparency-grid">
                {faviconUrl ? (
                    <img
                        src={faviconUrl}
                        alt="Favicon"
                        className="h-14 w-14 rounded-[1rem] object-contain border border-border/70 bg-background p-2"
                    />
                ) : (
                    <div className="text-center text-muted-foreground">
                        <IconSparkles className="mb-2 h-7 w-7 opacity-35" />
                        <p className="text-sm">{t('visualAssets.noFavicon', { defaultValue: 'No favicon' })}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function ScreenshotCard({ screenshotUrl, faviconUrl }: ScreenshotCardProps) {
    const { t } = useTranslation('brandKit');
    return (
        <Card className={cn(BRAND_KIT_PANEL_CLASS, "overflow-hidden flex flex-col")}>
            <CardHeader className={cn(BRAND_KIT_PANEL_HEADER_CLASS, "pb-4")}>
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                        <CardTitle className={BRAND_KIT_PANEL_TITLE_CLASS}>
                            <IconMonitor />
                            {t('visualAssets.screenshotTitle', { defaultValue: 'Website screenshot' })}
                        </CardTitle>
                        <p className={BRAND_KIT_PANEL_DESCRIPTION_CLASS}>
                            {t('visualAssets.screenshotDescription', { defaultValue: 'Captura de referencia usada para entender el lenguaje visual actual del sitio.' })}
                        </p>
                    </div>
                    {faviconUrl ? (
                        <div className="flex shrink-0 items-center gap-2 rounded-[1rem] border border-border/70 bg-[hsl(var(--surface-alt))]/72 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Favicon
                            </span>
                            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[0.85rem] border border-border/70 bg-background transparency-grid">
                                <img
                                    src={faviconUrl}
                                    alt="Favicon"
                                    className="h-[14px] w-[14px] object-contain"
                                />
                            </span>
                        </div>
                    ) : null}
                </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
                {screenshotUrl ? (
                    <div className={cn(BRAND_KIT_ASSET_SURFACE_CLASS, "overflow-hidden")}>
                        <div className="flex items-start justify-center p-4">
                        <img
                            src={screenshotUrl}
                            alt="Website Screenshot"
                            className="h-auto w-full object-contain object-top"
                        />
                        </div>
                    </div>
                ) : (
                    <div className={cn(BRAND_KIT_UPLOAD_SURFACE_CLASS, "flex min-h-[320px] flex-col items-center justify-center p-8 text-center text-[var(--text-secondary)]")}>
                        <IconMonitor className="mb-3 h-12 w-12 opacity-20" />
                        <p className="text-sm italic">{t('visualAssets.noScreenshot', { defaultValue: 'No screenshot available' })}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function ImageGallery({
    images,
    isUploading,
    onUpload,
    onRemoveImage,
    onOpenLightbox
}: ImageGalleryProps) {
    const { t } = useTranslation('brandKit');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onUpload(e.dataTransfer.files);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <Card className={BRAND_KIT_PANEL_CLASS}>
            <CardHeader className={cn(BRAND_KIT_PANEL_HEADER_CLASS, "pb-4")}>
                <CardTitle className={BRAND_KIT_PANEL_TITLE_CLASS}>
                    <IconImage />
                    {t('visualAssets.analyzedGallery', { defaultValue: 'Analyzed image gallery' })}
                </CardTitle>
                <p className={BRAND_KIT_PANEL_DESCRIPTION_CLASS}>
                    {t('visualAssets.galleryDescription', { defaultValue: 'Referencias secundarias extraidas de la web para enriquecer futuras generaciones.' })}
                </p>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
                <div className="columns-1 sm:columns-2 lg:columns-4 gap-4 [column-fill:_balance]">
                    {images.map((item, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "group relative mb-4 break-inside-avoid overflow-hidden cursor-pointer transition-all duration-300 transparency-grid hover:border-primary/25 hover:shadow-[0_22px_54px_-42px_rgba(15,23,42,0.24)]",
                                BRAND_KIT_ASSET_SURFACE_CLASS
                            )}
                            onClick={() => onOpenLightbox(item.url)}
                        >
                            <div className="flex min-h-[180px] items-center justify-center p-3">
                                <img
                                    src={item.url}
                                    alt={`Brand image ${idx + 1}`}
                                    className="h-auto max-h-[440px] w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                                />
                            </div>


                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-colors group-hover:bg-black/18 group-hover:opacity-100">
                                <IconMaximize className="w-8 h-8 text-white drop-shadow-lg" />
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveImage(idx);
                                }}
                                className={BRAND_KIT_REMOVE_BUTTON_CLASS}
                            >
                                <IconClose className="h-3 w-3" />
                            </button>
                        </div>
                    ))}

                    {/* Upload Card */}
                    {images.length < 50 && (
                        <div
                            className={cn(
                                BRAND_KIT_UPLOAD_SURFACE_CLASS,
                                "mb-4 break-inside-avoid cursor-pointer flex min-h-[220px] flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary",
                                isUploading && "opacity-50 pointer-events-none"
                            )}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                accept="image/*"
                                multiple
                                onChange={(e) => {
                                    if (e.target.files) onUpload(e.target.files);
                                }}
                            />
                            {isUploading ? (
                                <Loader2 className="w-8 h-8 text-primary" />
                            ) : (
                                <>
                                    <IconUpload className="w-8 h-8" />
                                    <span className="text-xs font-medium">{t('visualAssets.uploadImages', { defaultValue: 'Upload images' })}</span>
                                </>
                            )}
                        </div>
                    )}
                </div>
                {images.length === 0 && !isUploading && (
                    <div className="text-center py-12">
                        <IconImage className="mx-auto mb-4 h-16 w-16 text-muted-foreground opacity-20" />
                        <p className="text-sm italic text-muted-foreground opacity-70">
                            {t('visualAssets.noExtraImages', { defaultValue: 'No additional images were found on the site.' })}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


