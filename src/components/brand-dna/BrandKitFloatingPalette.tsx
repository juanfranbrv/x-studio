'use client';

import { Button } from '@/components/ui/button';
import {
    IconSave,
    IconPlus,
    IconEdit,
    IconUploadSquare,
    IconDownloadSquare,
    IconPropertyDelete,
} from '@/components/ui/icons';
import {
    STUDIO_CANVAS_FLOATING_TOOLBAR_CLASS,
    STUDIO_CANVAS_TOOL_BUTTON_CLASS,
} from '@/components/studio/shared/canvasStyles';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Loader2 } from '@/components/ui/spinner';

const TOOL_ICON_CLASS = '!h-8 !w-8';

interface BrandKitFloatingPaletteProps {
    onSave: () => void;
    onImport: () => void;
    onExport: () => void;
    onDelete?: () => void;
    onNew?: () => void;
    onRename?: () => void;
    isSaving?: boolean;
    isExporting?: boolean;
    hasUnsavedChanges?: boolean;
    className?: string;
}

export function BrandKitFloatingPalette({
    onSave,
    onImport,
    onExport,
    onDelete,
    onNew,
    onRename,
    isSaving,
    isExporting,
    hasUnsavedChanges,
    className,
}: BrandKitFloatingPaletteProps) {
    const { t } = useTranslation('brandKit');

    // Fila 1: Nuevo · Renombrar · Guardar
    // Fila 2: Importar · Exportar · Borrar
    return (
        <div className={cn(
            STUDIO_CANVAS_FLOATING_TOOLBAR_CLASS,
            '!fixed right-6 top-24 z-[60]',
            '!hidden md:!grid',
            className,
        )}>
            {/* Nuevo */}
            <Button
                variant="ghost"
                size="icon"
                className={STUDIO_CANVAS_TOOL_BUTTON_CLASS}
                onClick={onNew}
                disabled={!onNew}
                title={t('board.new', { defaultValue: 'Nuevo' })}
            >
                <IconPlus className={TOOL_ICON_CLASS} />
            </Button>

            {/* Renombrar */}
            <Button
                variant="ghost"
                size="icon"
                className={STUDIO_CANVAS_TOOL_BUTTON_CLASS}
                onClick={onRename}
                disabled={!onRename}
                title={t('board.rename', { defaultValue: 'Renombrar' })}
            >
                <IconEdit className={TOOL_ICON_CLASS} />
            </Button>

            {/* Guardar */}
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
                    <IconSave className={cn(TOOL_ICON_CLASS, hasUnsavedChanges && 'text-primary animate-pulse')} />
                )}
            </Button>

            {/* Exportar */}
            <Button
                variant="ghost"
                size="icon"
                className={STUDIO_CANVAS_TOOL_BUTTON_CLASS}
                onClick={onExport}
                disabled={isExporting}
                title={t('board.export', { defaultValue: 'Exportar Kit' })}
            >
                {isExporting
                    ? <Loader2 className={TOOL_ICON_CLASS} />
                    : <IconDownloadSquare className={TOOL_ICON_CLASS} />
                }
            </Button>

            {/* Importar */}
            <Button
                variant="ghost"
                size="icon"
                className={STUDIO_CANVAS_TOOL_BUTTON_CLASS}
                onClick={onImport}
                title={t('board.import', { defaultValue: 'Importar de URL' })}
            >
                <IconUploadSquare className={TOOL_ICON_CLASS} />
            </Button>

            {/* Borrar */}
            <Button
                variant="ghost"
                size="icon"
                className={cn(STUDIO_CANVAS_TOOL_BUTTON_CLASS, 'hover:text-destructive hover:bg-destructive/5')}
                onClick={onDelete}
                disabled={!onDelete}
                title={t('board.delete', { defaultValue: 'Borrar' })}
            >
                <IconPropertyDelete className={TOOL_ICON_CLASS} />
            </Button>
        </div>
    );
}
