'use client';

import { Button } from '@/components/ui/button';
import {
    IconSparkles,
    IconSave,
    IconLink,
    IconImageDownload,
    IconDelete,
} from '@/components/ui/icons';
import {
    STUDIO_CANVAS_FLOATING_TOOLBAR_CLASS,
    STUDIO_CANVAS_TOOL_BUTTON_CLASS,
} from '@/components/studio/shared/canvasStyles';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Loader2 } from '@/components/ui/spinner';

interface BrandKitFloatingPaletteProps {
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

const TOOL_ICON_CLASS = '!h-8 !w-8';

export function BrandKitFloatingPalette({
    onSave,
    onImport,
    onExport,
    onDelete,
    onOpenAssistant,
    isSaving,
    isExporting,
    hasUnsavedChanges,
    className,
}: BrandKitFloatingPaletteProps) {
    const { t } = useTranslation('brandKit');

    return (
        <div className={cn(
            STUDIO_CANVAS_FLOATING_TOOLBAR_CLASS, 
            "fixed right-6 top-24 z-[60]", // Fixed to the viewport, above the content
            "flex flex-col gap-2", // Vertical stack using flex instead of grid for simpler control
            "!hidden md:!flex", // Follow studio pattern of hidden on small mobile
            className
        )}>
            {onOpenAssistant && (
                <Button
                    variant="ghost"
                    size="icon"
                    className={STUDIO_CANVAS_TOOL_BUTTON_CLASS}
                    onClick={onOpenAssistant}
                    title={t('board.openAssistant', { defaultValue: 'Abrir asistente' })}
                >
                    <IconSparkles className={cn(TOOL_ICON_CLASS, "text-primary")} />
                </Button>
            )}
            
            <Button
                variant="ghost"
                size="icon"
                className={STUDIO_CANVAS_TOOL_BUTTON_CLASS}
                onClick={onSave}
                disabled={!hasUnsavedChanges || isSaving}
                title={t('board.saveNow', { defaultValue: 'Guardar' })}
            >
                {isSaving ? (
                    <Loader2 className={TOOL_ICON_CLASS} />
                ) : (
                    <IconSave className={cn(TOOL_ICON_CLASS, hasUnsavedChanges && "text-primary animate-pulse")} />
                )}
            </Button>

            <Button
                variant="ghost"
                size="icon"
                className={STUDIO_CANVAS_TOOL_BUTTON_CLASS}
                onClick={onImport}
                title={t('board.import', { defaultValue: 'Importar de URL' })}
            >
                <IconLink className={TOOL_ICON_CLASS} />
            </Button>

            <Button
                variant="ghost"
                size="icon"
                className={STUDIO_CANVAS_TOOL_BUTTON_CLASS}
                onClick={onExport}
                disabled={isExporting}
                title={t('board.export', { defaultValue: 'Exportar Kit' })}
            >
                {isExporting ? (
                    <Loader2 className={cn(TOOL_ICON_CLASS, "animate-spin")} />
                ) : (
                    <IconImageDownload className={TOOL_ICON_CLASS} />
                )}
            </Button>

            {onDelete && (
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(STUDIO_CANVAS_TOOL_BUTTON_CLASS, "hover:text-destructive hover:bg-destructive/5")}
                    onClick={onDelete}
                    title={t('board.delete', { defaultValue: 'Borrar' })}
                >
                    <IconDelete className={TOOL_ICON_CLASS} />
                </Button>
            )}
        </div>
    );
}
