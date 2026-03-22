'use client';

import { IconDownload, IconSave, IconUpload, IconDelete, IconSparkles } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Loader2 } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface BrandKitActionBarProps {
    onSave: () => void;
    onImport: () => void;
    onExport: () => void;
    onDelete?: () => void;
    onOpenAssistant?: () => void;
    isSaving?: boolean;
    isExporting?: boolean;
    hasUnsavedChanges?: boolean;
    className?: string;
}

export function BrandKitActionBar({
    onSave,
    onImport,
    onExport,
    onDelete,
    onOpenAssistant,
    isSaving,
    isExporting,
    hasUnsavedChanges,
    className
}: BrandKitActionBarProps) {
    const { t } = useTranslation('brandKit');

    return (
        <div className={cn(
            "fixed bottom-8 left-1/2 -translate-x-1/2 z-50",
            "flex items-center gap-1 p-1.5 px-2 rounded-2xl",
            "bg-background/80 backdrop-blur-xl border border-border shadow-2xl shadow-primary/10",
            "animate-in fade-in slide-in-from-bottom-4 duration-500",
            className
        )}>
            {onOpenAssistant && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onOpenAssistant}
                    className="h-9 px-3 gap-2 text-primary hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                >
                    <IconSparkles className="w-4 h-4" />
                    <span className="hidden sm:inline font-medium text-[13px]">
                        {t('board.openAssistant', { defaultValue: 'Abrir asistente' })}
                    </span>
                </Button>
            )}

            {onOpenAssistant && <div className="w-px h-4 bg-border/60 mx-1" />}

            <Button
                variant="ghost"
                size="sm"
                onClick={onImport}
                className="h-9 px-3 gap-2 text-muted-foreground hover:text-foreground rounded-xl transition-all"
            >
                <IconUpload className="w-4 h-4 text-muted-foreground/70" />
                <span className="hidden sm:inline font-medium text-[13px]">
                    {t('board.import', { defaultValue: 'Importar' })}
                </span>
            </Button>

            <Button
                variant="ghost"
                size="sm"
                onClick={onExport}
                disabled={isExporting}
                className="h-9 px-3 gap-2 text-muted-foreground hover:text-foreground rounded-xl transition-all"
            >
                {isExporting ? <Loader2 className="w-4 h-4" /> : <IconDownload className="w-4 h-4 text-muted-foreground/70" />}
                <span className="hidden sm:inline font-medium text-[13px]">
                    {t('board.export', { defaultValue: 'Exportar' })}
                </span>
            </Button>

            {onDelete && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    className="h-9 px-3 gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                >
                    <IconDelete className="w-4 h-4 text-muted-foreground/70 group-hover:text-destructive" />
                    <span className="hidden sm:inline font-medium text-[13px]">
                        {t('board.delete', { defaultValue: 'Borrar' })}
                    </span>
                </Button>
            )}

            <div className="w-px h-4 bg-border/60 mx-1" />

            <Button
                size="sm"
                onClick={onSave}
                disabled={!hasUnsavedChanges || isSaving}
                className={cn(
                    "h-9 px-4 gap-2 rounded-xl transition-all font-semibold text-[13px]",
                    hasUnsavedChanges 
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90" 
                        : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                )}
            >
                {isSaving ? <Loader2 className="w-4 h-4" /> : <IconSave className="w-4 h-4" />}
                {t('board.saveNow', { defaultValue: 'Guardar' })}
            </Button>
        </div>
    );
}
