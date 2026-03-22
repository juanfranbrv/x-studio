'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { IconTextFont } from '@/components/ui/icons';
import { useTranslation } from 'react-i18next';
import {
    BRAND_KIT_PANEL_CLASS,
    BRAND_KIT_PANEL_DESCRIPTION_CLASS,
    BRAND_KIT_PANEL_HEADER_CLASS,
    BRAND_KIT_PANEL_TITLE_CLASS,
    BRAND_KIT_TEXTAREA_CLASS,
} from './brandKitStyles';

interface BrandContextCardProps {
    context: string;
    onUpdate: (value: string) => void;
    minHeightClassName?: string;
}

export function BrandContextCard({ context, onUpdate, minHeightClassName = 'min-h-[120px]' }: BrandContextCardProps) {
    const { t } = useTranslation('brandKit');
    return (
        <Card className={cn(BRAND_KIT_PANEL_CLASS, "overflow-hidden")}>
            <CardHeader className={cn(BRAND_KIT_PANEL_HEADER_CLASS, "pb-4")}>
                <CardTitle className={BRAND_KIT_PANEL_TITLE_CLASS}>
                    <IconTextFont />
                    {t('context.title', { defaultValue: 'Visión y contexto de marca' })}
                </CardTitle>
                <p className={BRAND_KIT_PANEL_DESCRIPTION_CLASS}>
                    {t('context.description', { defaultValue: 'Resumen editorial y estratégico que debe guiar todo el contenido generado.' })}
                </p>
            </CardHeader>
            <div className="px-6 pb-6 pt-0">
                <textarea
                    value={context}
                    onChange={(e) => onUpdate(e.target.value)}
                    className={cn(
                        BRAND_KIT_TEXTAREA_CLASS,
                        'resize-y',
                        minHeightClassName,
                    )}
                    placeholder={t('context.placeholder', { defaultValue: 'Describe your brand vision and context...' })}
                />
            </div>
        </Card>
    );
}
