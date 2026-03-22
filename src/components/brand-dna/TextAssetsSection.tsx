'use client'

import { Loader2 } from '@/components/ui/spinner'
;

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TextAssets } from '@/lib/brand-types';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

import { IconMegaphone, IconMouseClick, IconFileText, IconInfo, IconClose, IconPlus, IconUpload } from '@/components/ui/icons';
import { analyzeBrandFile } from '@/app/actions/analyze-brand-file';
import { ExtractionPreviewModal } from './ExtractionPreviewModal';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import {
    BRAND_KIT_INLINE_REMOVE_BUTTON_CLASS,
    BRAND_KIT_OUTLINE_DASHED_BUTTON_CLASS,
    BRAND_KIT_PANEL_CLASS,
    BRAND_KIT_PANEL_DESCRIPTION_CLASS,
    BRAND_KIT_PANEL_HEADER_CLASS,
    BRAND_KIT_PANEL_TITLE_CLASS,
    BRAND_KIT_SECONDARY_BUTTON_CLASS,
    BRAND_KIT_SECTION_LABEL_CLASS,
    BRAND_KIT_TEXTAREA_CLASS,
} from './brandKitStyles';

interface TextAssetsSectionProps {
    data?: TextAssets;
    onChange?: (data: TextAssets) => void;
    onAppendData?: (extractedData: any) => void;
}

type TooltipKey = 'marketing_hooks' | 'visual_keywords' | 'ctas' | 'brand_context';

export function TextAssetsSection({ data, onChange, onAppendData }: TextAssetsSectionProps) {
    const { t } = useTranslation('brandKit');
    const defaultData: TextAssets = {
        marketing_hooks: [
            t('textAssets.defaultData.marketingHook1', { defaultValue: 'Escapada romántica en Teruel' }),
            t('textAssets.defaultData.marketingHook2', { defaultValue: 'Desconecta para reconectar' }),
            t('textAssets.defaultData.marketingHook3', { defaultValue: 'Lujo rural accesible' }),
        ],
        visual_keywords: [
            t('textAssets.defaultData.keyword1', { defaultValue: 'Jacuzzi' }),
            t('textAssets.defaultData.keyword2', { defaultValue: 'Chimenea de leña' }),
            t('textAssets.defaultData.keyword3', { defaultValue: 'Muros de piedra' }),
            t('textAssets.defaultData.keyword4', { defaultValue: 'Vistas a la montaña' }),
        ],
        ctas: [
            t('textAssets.defaultData.cta1', { defaultValue: 'Reservar ahora' }),
            t('textAssets.defaultData.cta2', { defaultValue: 'Ver disponibilidad' }),
            t('textAssets.defaultData.cta3', { defaultValue: 'Contactar' }),
        ],
        brand_context: t('textAssets.defaultData.brandContext', {
            defaultValue: 'Casa rural de alquiler completo situada en Rubielos de Mora, pueblo medieval. Ambiente relajado y exclusivo.',
        }),
    };
    const mergeWithDefaults = (incoming?: TextAssets): TextAssets => ({
        marketing_hooks: incoming?.marketing_hooks ?? defaultData.marketing_hooks,
        visual_keywords: incoming?.visual_keywords ?? defaultData.visual_keywords,
        ctas: incoming?.ctas ?? defaultData.ctas,
        brand_context: incoming?.brand_context ?? defaultData.brand_context,
    });

    const [assets, setAssets] = useState<TextAssets>(mergeWithDefaults(data));
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showExtractionModal, setShowExtractionModal] = useState(false);
    const [extractedData, setExtractedData] = useState<any>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (data) setAssets(mergeWithDefaults(data));
    }, [data]);

    const updateAssets = (newAssets: TextAssets) => {
        setAssets(newAssets);
        onChange?.(newAssets);
    };

    const updateItem = (section: 'marketing_hooks' | 'ctas' | 'visual_keywords', index: number, value: string) => {
        const next = [...assets[section]];
        next[index] = value;
        updateAssets({ ...assets, [section]: next });
    };

    const handleDelete = (section: 'marketing_hooks' | 'visual_keywords' | 'ctas', index: number) => {
        const newArray = assets[section].filter((_, i) => i !== index);
        updateAssets({ ...assets, [section]: newArray });
    };

    const handleAdd = (section: 'marketing_hooks' | 'visual_keywords' | 'ctas') => {
        const newItem = section === 'marketing_hooks'
            ? t('textAssets.newHeadline', { defaultValue: 'New headline' })
            : section === 'visual_keywords'
                ? t('textAssets.newKeyword', { defaultValue: 'New keyword' })
                : t('textAssets.newCta', { defaultValue: 'New CTA' });
        updateAssets({ ...assets, [section]: [...assets[section], newItem] });
    };

    const SectionTitle = ({
        icon: Icon,
        title,
        tooltipKey,
    }: {
        icon: any;
        title: string;
        tooltipKey: TooltipKey;
    }) => (
        <div className="flex items-center gap-2 mb-1.5">
            <Icon className="w-[1.125rem] h-[1.125rem] text-primary/80" />
            <span className={BRAND_KIT_SECTION_LABEL_CLASS}>{title}</span>
            <TooltipProvider delayDuration={200}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button className="p-0.5 rounded-full hover:bg-[var(--surface-hover)] transition-colors" type="button">
                            <IconInfo className="w-3.5 h-3.5 text-[var(--text-secondary)] opacity-60" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs bg-popover border-border text-popover-foreground">
                        <p>{t(`textAssets.tooltips.${tooltipKey}`, { defaultValue: String(tooltipKey) })}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );

    const DirectEditableCard = ({
        value,
        onChange,
        onDelete,
        sectionType,
    }: {
        value: string;
        onChange: (val: string) => void;
        onDelete: () => void;
        sectionType: 'marketing_hooks' | 'ctas' | 'visual_keywords';
    }) => (
        <div className="group relative flex items-start gap-2 py-1.5">
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                    BRAND_KIT_TEXTAREA_CLASS,
                    sectionType === 'marketing_hooks' ? 'min-h-[118px]' : 'min-h-[88px]'
                )}
                rows={sectionType === 'marketing_hooks' ? 4 : 3}
            />
            <button
                className={BRAND_KIT_INLINE_REMOVE_BUTTON_CLASS}
                onClick={onDelete}
                type="button"
                aria-label={t('contact.deleteAria', { defaultValue: 'Delete' })}
            >
                <IconClose className="w-3.5 h-3.5" />
            </button>
        </div>
    );

    return (
        <Card className={cn(BRAND_KIT_PANEL_CLASS, "relative overflow-visible")}>
            <CardHeader className={cn(BRAND_KIT_PANEL_HEADER_CLASS, "relative flex-row items-start justify-between pb-4")}>
                <div>
                    <CardTitle className={BRAND_KIT_PANEL_TITLE_CLASS}>
                        <IconFileText className="w-[1.125rem] h-[1.125rem] text-primary" />
                        {t('textAssets.title', { defaultValue: 'Text assets' })}
                    </CardTitle>
                    <p className={cn(BRAND_KIT_PANEL_DESCRIPTION_CLASS, "mt-1")}>{t('textAssets.description', { defaultValue: 'Textos editables para campañas y generación de contenido' })}</p>
                </div>

                <div className="flex gap-2">
                    <input
                        type="file"
                        id="brand-file-upload"
                        className="hidden"
                        accept=".pdf,.txt,.md"
                        onChange={async (e) => {
                            const inputEl = e.currentTarget;
                            const file = inputEl.files?.[0];
                            if (!file) return;

                            setIsAnalyzing(true);
                            const formData = new FormData();
                            formData.append('file', file);

                            try {
                                const result = await analyzeBrandFile(formData);
                                if (result.success && result.data) {
                                    setExtractedData(result.data);
                                    setShowExtractionModal(true);
                                } else {
                                    toast({
                                        title: t('textAssets.analyzeErrorTitle', { defaultValue: 'Analysis error' }),
                                        description: result.error || t('textAssets.analyzeErrorDescription', { defaultValue: 'The file could not be processed.' }),
                                        variant: 'destructive',
                                    });
                                }
                            } catch (err) {
                                console.error(err);
                            } finally {
                                setIsAnalyzing(false);
                                if (inputEl) inputEl.value = '';
                            }
                        }}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(BRAND_KIT_SECONDARY_BUTTON_CLASS, "gap-2 border-primary/20 bg-primary/5 text-primary cursor-pointer hover:bg-primary/10")}
                        disabled={isAnalyzing}
                        asChild
                    >
                        <label htmlFor="brand-file-upload">
                            {isAnalyzing ? <Loader2 className="w-3.5 h-3.5" /> : <IconUpload className="w-3.5 h-3.5" />}
                            {t('textAssets.importFromFile', { defaultValue: 'Import from file' })}
                        </label>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="relative space-y-4 px-6 pb-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <SectionTitle icon={IconMegaphone} title={t('textAssets.marketingHooksTitle', { defaultValue: 'Marketing headlines' })} tooltipKey="marketing_hooks" />
                        <div className="space-y-1">
                            {assets.marketing_hooks.map((hook, idx) => (
                                <DirectEditableCard
                                    key={`hook-${idx}`}
                                    value={hook}
                                    onChange={(val) => updateItem('marketing_hooks', idx, val)}
                                    onDelete={() => handleDelete('marketing_hooks', idx)}
                                    sectionType="marketing_hooks"
                                />
                            ))}
                            <Button
                                variant="outline"
                                size="sm"
                                className={BRAND_KIT_OUTLINE_DASHED_BUTTON_CLASS}
                                onClick={() => handleAdd('marketing_hooks')}
                                type="button"
                            >
                                <IconPlus className="w-4 h-4 mr-1" />
                                {t('textAssets.addHeadline', { defaultValue: 'Add headline' })}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <SectionTitle icon={IconMouseClick} title={t('textAssets.ctasTitle', { defaultValue: 'Calls to action' })} tooltipKey="ctas" />
                        <div className="space-y-1">
                            {assets.ctas.map((cta, idx) => (
                                <DirectEditableCard
                                    key={`cta-${idx}`}
                                    value={cta}
                                    onChange={(val) => updateItem('ctas', idx, val)}
                                    onDelete={() => handleDelete('ctas', idx)}
                                    sectionType="ctas"
                                />
                            ))}
                            <Button
                                variant="outline"
                                size="sm"
                                className={BRAND_KIT_OUTLINE_DASHED_BUTTON_CLASS}
                                onClick={() => handleAdd('ctas')}
                                type="button"
                            >
                                <IconPlus className="w-4 h-4 mr-1" />
                                {t('textAssets.addCta', { defaultValue: 'Add CTA' })}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>

            <ExtractionPreviewModal
                open={showExtractionModal}
                onOpenChange={setShowExtractionModal}
                data={extractedData}
                onConfirm={(selectedData) => {
                    onAppendData?.(selectedData);
                    toast({
                        title: t('textAssets.updatedTitle', { defaultValue: 'Kit updated' }),
                        description: t('textAssets.updatedDescription', { defaultValue: 'The selected assets were added to your Brand Kit.' }),
                    });
                }}
            />
        </Card>
    );
}


