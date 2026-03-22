import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ARTISTIC_STYLE_CATALOG, ARTISTIC_STYLE_GROUPS } from '@/lib/creation-flow-types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
    BRAND_KIT_FIELD_CLASS,
    BRAND_KIT_OUTLINE_DASHED_BUTTON_CLASS,
    BRAND_KIT_PANEL_CLASS,
    BRAND_KIT_PANEL_DESCRIPTION_CLASS,
    BRAND_KIT_PANEL_HEADER_CLASS,
    BRAND_KIT_PANEL_TITLE_CLASS,
    BRAND_KIT_SECONDARY_BUTTON_CLASS,
} from './brandKitStyles';

import { IconDelete, IconPlus, IconSparkles, IconTextFont, IconMessage, IconQuote, IconLanguages } from '@/components/ui/icons';

const LANGUAGE_OPTIONS = [
    { value: 'es', label: '🇪🇸 Español' },
    { value: 'en', label: '🇬🇧 English' },
    { value: 'fr', label: '🇫🇷 Français' },
    { value: 'de', label: '🇩🇪 Deutsch' },
    { value: 'pt', label: '🇵🇹 Português' },
    { value: 'it', label: '🇮🇹 Italiano' },
    { value: 'ca', label: 'Català' },
];

interface BrandAssetsProps {
    tagline: string;
    values: string[];
    aesthetic: string[];
    tone: string[];
    preferredLanguage?: string;
    onUpdateTagline: (val: string) => void;
    onUpdateValue: (index: number, val: string) => void;
    onAddValue: () => void;
    onRemoveValue: (index: number) => void;
    onUpdateAesthetic: (index: number, val: string) => void;
    onAddAesthetic: () => void;
    onRemoveAesthetic: (index: number) => void;
    onUpdateTone: (index: number, val: string) => void;
    onAddTone: () => void;
    onRemoveTone: (index: number) => void;
    onUpdateLanguage?: (val: string) => void;
}

export function BrandAssets({
    tagline,
    values,
    aesthetic,
    tone,
    preferredLanguage,
    onUpdateTagline,
    onUpdateValue,
    onAddValue,
    onRemoveValue,
    onUpdateAesthetic,
    onAddAesthetic,
    onRemoveAesthetic,
    onUpdateTone,
    onAddTone,
    onRemoveTone,
    onUpdateLanguage,
}: BrandAssetsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TaglineCard tagline={tagline} onUpdateTagline={onUpdateTagline} />
            <LanguageCard preferredLanguage={preferredLanguage} onUpdateLanguage={onUpdateLanguage} />
            <BrandValuesCard values={values} onUpdateValue={onUpdateValue} onAddValue={onAddValue} onRemoveValue={onRemoveValue} />
            <VisualAestheticCard aesthetic={aesthetic} onUpdateAesthetic={onUpdateAesthetic} onAddAesthetic={onAddAesthetic} onRemoveAesthetic={onRemoveAesthetic} />
            <ToneOfVoiceCard tone={tone} onUpdateTone={onUpdateTone} onAddTone={onAddTone} onRemoveTone={onRemoveTone} />
        </div>
    );
}

export function TaglineCard({ tagline, onUpdateTagline }: { tagline: string; onUpdateTagline: (val: string) => void }) {
    const { t } = useTranslation('brandKit');
    return (
        <Card className={cn(BRAND_KIT_PANEL_CLASS)}>
            <CardHeader className={cn(BRAND_KIT_PANEL_HEADER_CLASS, "pb-4")}>
                <CardTitle className={BRAND_KIT_PANEL_TITLE_CLASS}>
                    <IconQuote />
                    {t('assets.taglineTitle', { defaultValue: 'Tagline' })}
                </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
                <Input
                    value={tagline}
                    onChange={(e) => onUpdateTagline(e.target.value)}
                    className={BRAND_KIT_FIELD_CLASS}
                    placeholder={t('assets.taglinePlaceholder', { defaultValue: 'Write the brand tagline' })}
                />
            </CardContent>
        </Card>
    );
}

export function LanguageCard({ preferredLanguage, onUpdateLanguage }: { preferredLanguage?: string; onUpdateLanguage?: (val: string) => void }) {
    const { t } = useTranslation('brandKit');
    return (
        <Card className={cn(BRAND_KIT_PANEL_CLASS)}>
            <CardHeader className={cn(BRAND_KIT_PANEL_HEADER_CLASS, "pb-4")}>
                <CardTitle className={BRAND_KIT_PANEL_TITLE_CLASS}>
                    <IconLanguages />
                    {t('assets.preferredLanguageTitle', { defaultValue: 'Idioma preferido' })}
                </CardTitle>
                <p className={BRAND_KIT_PANEL_DESCRIPTION_CLASS}>{t('assets.preferredLanguageDescription', { defaultValue: 'Idioma que usará la IA al generar contenido para esta marca.' })}</p>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
                <Select
                    value={preferredLanguage || 'es'}
                    onValueChange={(val) => onUpdateLanguage?.(val)}
                >
                    <SelectTrigger className={cn(BRAND_KIT_FIELD_CLASS, "w-full max-w-xs")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {LANGUAGE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardContent>
        </Card>
    );
}

export function BrandValuesCard({ values, onUpdateValue, onAddValue, onRemoveValue }: { 
    values: string[]; 
    onUpdateValue: (index: number, val: string) => void; 
    onAddValue: () => void; 
    onRemoveValue: (index: number) => void;
}) {
    const { t } = useTranslation('brandKit');
    return (
        <Card className={BRAND_KIT_PANEL_CLASS}>
            <CardHeader className={cn(BRAND_KIT_PANEL_HEADER_CLASS, "pb-4")}>
                <CardTitle className={BRAND_KIT_PANEL_TITLE_CLASS}>
                    <IconSparkles />
                    {t('assets.valuesTitle', { defaultValue: 'Values' })}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 px-6 pb-6 pt-0">
                {values.map((v, i) => (
                    <DirectRowInternal
                        key={`value-${i}`}
                        value={v}
                        onChange={(val) => onUpdateValue(i, val)}
                        onDelete={() => onRemoveValue(i)}
                        placeholder={t('assets.valuePlaceholder', { defaultValue: 'Brand value' })}
                    />
                ))}
                <Button variant="outline" size="sm" className={BRAND_KIT_OUTLINE_DASHED_BUTTON_CLASS} onClick={onAddValue} type="button">
                    <IconPlus className="w-4 h-4 mr-1" />
                    {t('assets.addValue', { defaultValue: 'Add value' })}
                </Button>
            </CardContent>
        </Card>
    );
}

export function VisualAestheticCard({ aesthetic, onUpdateAesthetic, onAddAesthetic, onRemoveAesthetic }: {
    aesthetic: string[];
    onUpdateAesthetic: (index: number, val: string) => void;
    onAddAesthetic: () => void;
    onRemoveAesthetic: (index: number) => void;
}) {
    const { t } = useTranslation('brandKit');
    const [openSuggestionIndex, setOpenSuggestionIndex] = useState<number | null>(null);

    const groupedSuggestions = useMemo(() => {
        return ARTISTIC_STYLE_GROUPS.reduce((acc, group) => {
            const stylesInGroup = ARTISTIC_STYLE_CATALOG.filter((s) => s.category === group.id);
            if (stylesInGroup.length > 0) {
                acc[group.id] = {
                    label: group.label,
                    styles: stylesInGroup,
                };
            }
            return acc;
        }, {} as Record<string, { label: string; styles: typeof ARTISTIC_STYLE_CATALOG }>);
    }, []);

    return (
        <Card className={BRAND_KIT_PANEL_CLASS}>
            <CardHeader className={cn(BRAND_KIT_PANEL_HEADER_CLASS, "pb-4")}>
                <CardTitle className={BRAND_KIT_PANEL_TITLE_CLASS}>
                    <IconTextFont />
                    {t('assets.visualStylesTitle', { defaultValue: 'Visual styles' })}
                </CardTitle>
                <p className={BRAND_KIT_PANEL_DESCRIPTION_CLASS}>{t('assets.visualStylesDescription', { defaultValue: 'Se usan para generar imágenes en el módulo Imagen.' })}</p>
            </CardHeader>
            <CardContent className="space-y-1 px-6 pb-6 pt-0">
                {aesthetic.map((v, i) => (
                    <DirectRowInternal
                        key={`aesthetic-${i}`}
                        value={v}
                        onChange={(val) => onUpdateAesthetic(i, val)}
                        onDelete={() => onRemoveAesthetic(i)}
                        placeholder={t('assets.visualStylePlaceholder', { defaultValue: 'Visual style' })}
                        right={
                            <Popover open={openSuggestionIndex === i} onOpenChange={(open) => setOpenSuggestionIndex(open ? i : null)}>
                                <PopoverTrigger asChild>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className={cn(BRAND_KIT_SECONDARY_BUTTON_CLASS, "h-10 w-10 px-0")}
                                        type="button"
                                        title={t('assets.styleSuggestionsTitle', { defaultValue: 'Style suggestions' })}
                                    >
                                        <IconSparkles className="h-[14px] w-[14px]" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="flex max-h-[320px] w-[350px] flex-col overflow-hidden rounded-[1.25rem] border-border/70 bg-card p-0 shadow-[0_26px_72px_-44px_rgba(15,23,42,0.35)]" align="start" sideOffset={5}>
                                    <div className="overflow-y-auto flex-1">
                                        {Object.entries(groupedSuggestions).map(([groupId, group]) => (
                                            <div key={groupId}>
                                                <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider bg-muted/50 text-muted-foreground sticky top-0 backdrop-blur-sm z-10">
                                                    {group.label}
                                                </div>
                                                {group.styles.map((style) => (
                                                    <button
                                                        key={style.id}
                                                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-3 transition-colors border-b border-border/40 last:border-0"
                                                        onClick={() => {
                                                            onUpdateAesthetic(i, style.label);
                                                            setOpenSuggestionIndex(null);
                                                        }}
                                                        type="button"
                                                    >
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-medium text-foreground">{style.label}</span>
                                                            <span className="text-xs text-muted-foreground line-clamp-1">{style.keywords.slice(0, 3).join(', ')}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        }
                    />
                ))}
                <Button variant="outline" size="sm" className={BRAND_KIT_OUTLINE_DASHED_BUTTON_CLASS} onClick={onAddAesthetic} type="button">
                    <IconPlus className="w-4 h-4 mr-1" />
                    {t('assets.addStyle', { defaultValue: 'Add style' })}
                </Button>
            </CardContent>
        </Card>
    );
}

export function ToneOfVoiceCard({ tone, onUpdateTone, onAddTone, onRemoveTone }: {
    tone: string[];
    onUpdateTone: (index: number, val: string) => void;
    onAddTone: () => void;
    onRemoveTone: (index: number) => void;
}) {
    const { t } = useTranslation('brandKit');
    return (
        <Card className={BRAND_KIT_PANEL_CLASS}>
            <CardHeader className={cn(BRAND_KIT_PANEL_HEADER_CLASS, "pb-4")}>
                <CardTitle className={BRAND_KIT_PANEL_TITLE_CLASS}>
                    <IconMessage />
                    {t('assets.toneTitle', { defaultValue: 'Tone of voice' })}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 px-6 pb-6 pt-0">
                {tone.map((v, i) => (
                    <DirectRowInternal
                        key={`tone-${i}`}
                        value={v}
                        onChange={(val) => onUpdateTone(i, val)}
                        onDelete={() => onRemoveTone(i)}
                        placeholder={t('assets.tonePlaceholder', { defaultValue: 'Tone of voice' })}
                    />
                ))}
                <Button variant="outline" size="sm" className={BRAND_KIT_OUTLINE_DASHED_BUTTON_CLASS} onClick={onAddTone} type="button">
                    <IconPlus className="w-4 h-4 mr-1" />
                    {t('assets.addTone', { defaultValue: 'Add tone' })}
                </Button>
            </CardContent>
        </Card>
    );
}

function DirectRowInternal({
    value,
    onChange,
    onDelete,
    placeholder,
    right,
}: {
    value: string;
    onChange: (v: string) => void;
    onDelete: () => void;
    placeholder: string;
    right?: React.ReactNode;
}) {
    const { t } = useTranslation('brandKit');
    return (
        <div className="group relative flex items-center gap-2 py-1.5">
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={BRAND_KIT_FIELD_CLASS}
            />
            {right}
            <button
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500 md:h-8 md:w-8 md:opacity-0 md:group-hover:opacity-100"
                onClick={onDelete}
                type="button"
                aria-label={t('assets.deleteAria', { defaultValue: 'Delete' })}
            >
                <IconDelete className="h-[14px] w-[14px]" />
            </button>
        </div>
    );
}
