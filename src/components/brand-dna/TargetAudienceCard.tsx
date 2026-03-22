'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconUsers, IconCrosshair, IconTarget } from '@/components/ui/icons';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
    BRAND_KIT_PANEL_CLASS,
    BRAND_KIT_PANEL_DESCRIPTION_CLASS,
    BRAND_KIT_PANEL_HEADER_CLASS,
    BRAND_KIT_PANEL_TITLE_CLASS,
} from './brandKitStyles';

interface TargetAudienceCardProps {
    audience?: string[];
}

export function TargetAudienceCard({ audience = [] }: TargetAudienceCardProps) {
    const { t } = useTranslation('brandKit');

    if (audience.length === 0) return null;

    return (
        <Card className={cn(BRAND_KIT_PANEL_CLASS, "overflow-hidden")}>
            <CardHeader className={cn(BRAND_KIT_PANEL_HEADER_CLASS, "pb-4")}>
                <CardTitle className={BRAND_KIT_PANEL_TITLE_CLASS}>
                    <IconTarget className="h-[1.125rem] w-[1.125rem] text-primary" />
                    {t('audience.title', { defaultValue: 'Target audience' })}
                </CardTitle>
                <p className={BRAND_KIT_PANEL_DESCRIPTION_CLASS}>
                    {t('audience.description', { defaultValue: 'Profiles inferred from the brand language, offer and positioning detected on the site.' })}
                </p>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {audience.map((profile, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-2 rounded-[1rem] border border-primary/20 bg-[hsl(var(--surface))] px-3.5 py-2.5 text-[0.95rem] font-medium text-foreground transition-colors hover:border-primary/30"
                            >
                                <IconUsers className="h-4 w-4 text-primary" />
                                {profile}
                            </div>
                        ))}
                    </div>

                    <p className="flex items-start gap-1.5 px-1 text-sm text-muted-foreground">
                        <IconCrosshair className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {t('audience.helper', { defaultValue: 'These profiles were identified by AI after analyzing the brand language, offer, and positioning on the website.' })}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
