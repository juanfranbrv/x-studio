'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
    IconCheck,
    IconXCircle,
    IconFileText,
    IconMegaphone,
    IconGlobe,
    IconUsers,
    IconHeart,
    IconMessage,
    IconPalette,
    IconMail,
} from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface ExtractionPreviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: any | null;
    onConfirm: (selectedData: any) => void;
}

export function ExtractionPreviewModal({ open, onOpenChange, data, onConfirm }: ExtractionPreviewModalProps) {
    const { t } = useTranslation('brandKit');
    const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!data) return;

        const initial: Record<string, boolean> = {};
        Object.keys(data).forEach((key) => {
            const value = (data as any)[key];
            if (Array.isArray(value)) {
                value.forEach((_: unknown, idx: number) => {
                    initial[`${key}-${idx}`] = true;
                });
                return;
            }

            if (typeof value === 'object' && value !== null) {
                if (key === 'text_assets') {
                    Object.keys(value).forEach((subKey) => {
                        const subValue = value[subKey];
                        if (Array.isArray(subValue)) {
                            subValue.forEach((_: unknown, idx: number) => {
                                initial[`text_assets-${subKey}-${idx}`] = true;
                            });
                        } else if (typeof subValue === 'string' && subValue) {
                            initial[`text_assets-${subKey}`] = true;
                        }
                    });
                } else if (key === 'social_links') {
                    (value as any[]).forEach((_: unknown, idx: number) => {
                        initial[`social_links-${idx}`] = true;
                    });
                }
                return;
            }

            if (value) initial[key] = true;
        });

        setSelectedItems(initial);
    }, [data]);

    if (!data) return null;

    const toggleItem = (id: string) => {
        setSelectedItems((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleConfirm = () => {
        const result: any = {};

        if (selectedItems.brand_name) result.brand_name = data.brand_name;
        if (selectedItems.tagline) result.tagline = data.tagline;
        if (selectedItems.business_overview) result.business_overview = data.business_overview;
        if (selectedItems.preferred_language) result.preferred_language = data.preferred_language;

        const filterArray = (key: string) =>
            (data[key] || []).filter((_: any, idx: number) => selectedItems[`${key}-${idx}`]);

        result.brand_values = filterArray('brand_values');
        result.tone_of_voice = filterArray('tone_of_voice');
        result.visual_aesthetic = filterArray('visual_aesthetic');
        result.target_audience = filterArray('target_audience');
        result.emails = filterArray('emails');
        result.phones = filterArray('phones');
        result.addresses = filterArray('addresses');
        result.social_links = (data.social_links || []).filter((_: any, idx: number) => selectedItems[`social_links-${idx}`]);

        if (data.text_assets) {
            result.text_assets = {
                marketing_hooks: (data.text_assets.marketing_hooks || []).filter((_: any, idx: number) => selectedItems[`text_assets-marketing_hooks-${idx}`]),
                ctas: (data.text_assets.ctas || []).filter((_: any, idx: number) => selectedItems[`text_assets-ctas-${idx}`]),
                brand_context: selectedItems['text_assets-brand_context'] ? data.text_assets.brand_context : undefined,
            };
        }

        onConfirm(result);
        onOpenChange(false);
    };

    const Section = ({ title, icon: Icon, children, className }: any) => (
        <div className={cn('space-y-3 rounded-xl border border-border/50 bg-muted/5 p-4 shadow-sm', className)}>
            <div className="mb-2 flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                    <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">{title}</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">{children}</div>
        </div>
    );

    const Item = ({ id, label, value, sublabel }: any) => (
        <label
            className={cn(
                'group flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all hover:shadow-md',
                selectedItems[id] ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/10' : 'border-border bg-background opacity-60 hover:opacity-100'
            )}
        >
            <Checkbox checked={selectedItems[id]} onCheckedChange={() => toggleItem(id)} className="mt-1" />
            <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    {sublabel ? <Badge variant="secondary" className="h-4 text-[10px]">{sublabel}</Badge> : null}
                </div>
                <p className="line-clamp-2 text-xs italic leading-relaxed text-muted-foreground">&quot;{value}&quot;</p>
            </div>
        </label>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-panel flex h-[92vh] w-[95vw] max-w-7xl flex-col overflow-hidden border-0 p-0 sm:max-w-none">
                <DialogHeader className="border-b border-border/50 p-6 pb-2">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                            <IconFileText className="h-6 w-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-bold text-foreground">
                                {t('extraction.title', { defaultValue: 'Assets extracted from file' })}
                            </DialogTitle>
                            <DialogDescription>
                                {t('extraction.description', { defaultValue: 'AI analyzed your document. Select which elements you want to add to your Brand Kit.' })}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-4">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
                            <Section title={t('extraction.identityTitle', { defaultValue: 'Basic identity' })} icon={IconCheck}>
                                {data.brand_name ? <Item id="brand_name" label={t('extraction.brandName', { defaultValue: 'Brand name' })} value={data.brand_name} /> : null}
                                {data.tagline ? <Item id="tagline" label={t('assets.taglineTitle', { defaultValue: 'Tagline' })} value={data.tagline} /> : null}
                                {data.preferred_language ? (
                                    <Item
                                        id="preferred_language"
                                        label={t('extraction.language', { defaultValue: 'Language' })}
                                        value={data.preferred_language === 'es' ? t('language.options.es', { defaultValue: 'Spanish' }) : data.preferred_language === 'en' ? t('language.options.en', { defaultValue: 'English' }) : data.preferred_language}
                                    />
                                ) : null}
                            </Section>

                            <Section title={t('extraction.visionTitle', { defaultValue: 'Vision and overview' })} icon={IconGlobe}>
                                {data.business_overview ? <Item id="business_overview" label={t('extraction.businessOverview', { defaultValue: 'Business overview' })} value={data.business_overview} /> : null}
                                {data.text_assets?.brand_context ? <Item id="text_assets-brand_context" label={t('extraction.brandContext', { defaultValue: 'Brand context' })} value={data.text_assets.brand_context} /> : null}
                            </Section>
                        </div>

                        <Section title={t('extraction.marketingAssets', { defaultValue: 'Marketing assets' })} icon={IconMegaphone} className="border-primary/20 bg-primary/2">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {data.text_assets?.marketing_hooks?.map((hook: string, i: number) => (
                                    <Item key={i} id={`text_assets-marketing_hooks-${i}`} label={t('extraction.headlineLabel', { defaultValue: 'Headline {{index}}', index: i + 1 })} value={hook} sublabel="HOOK" />
                                ))}
                                {data.text_assets?.ctas?.map((cta: string, i: number) => (
                                    <Item key={i} id={`text_assets-ctas-${i}`} label={t('extraction.actionLabel', { defaultValue: 'Action {{index}}', index: i + 1 })} value={cta} sublabel="CTA" />
                                ))}
                            </div>
                        </Section>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-3">
                            <Section title={t('assets.valuesTitle', { defaultValue: 'Values' })} icon={IconHeart}>
                                {data.brand_values?.map((v: string, i: number) => (
                                    <Item key={i} id={`brand_values-${i}`} label={t('extraction.valueLabel', { defaultValue: 'Value {{index}}', index: i + 1 })} value={v} />
                                ))}
                            </Section>
                            <Section title={t('assets.toneTitle', { defaultValue: 'Tone of voice' })} icon={IconMessage}>
                                {data.tone_of_voice?.map((v: string, i: number) => (
                                    <Item key={i} id={`tone_of_voice-${i}`} label={t('extraction.toneLabel', { defaultValue: 'Tone {{index}}', index: i + 1 })} value={v} />
                                ))}
                            </Section>
                            <Section title={t('assets.visualStylesTitle', { defaultValue: 'Visual styles' })} icon={IconPalette}>
                                {data.visual_aesthetic?.map((v: string, i: number) => (
                                    <Item key={i} id={`visual_aesthetic-${i}`} label={t('extraction.styleLabel', { defaultValue: 'Style {{index}}', index: i + 1 })} value={v} />
                                ))}
                            </Section>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
                            <Section title={t('extraction.audienceTitle', { defaultValue: 'Target audience' })} icon={IconUsers}>
                                {data.target_audience?.map((v: string, i: number) => (
                                    <Item key={i} id={`target_audience-${i}`} label={t('extraction.profileLabel', { defaultValue: 'Profile {{index}}', index: i + 1 })} value={v} />
                                ))}
                            </Section>
                            <Section title={t('extraction.contactTitle', { defaultValue: 'Contact and social' })} icon={IconMail}>
                                {data.emails?.map((v: string, i: number) => <Item key={i} id={`emails-${i}`} label={t('contact.emailsTitle', { defaultValue: 'Email addresses' })} value={v} />)}
                                {data.phones?.map((v: string, i: number) => <Item key={i} id={`phones-${i}`} label={t('extraction.phone', { defaultValue: 'Phone' })} value={v} />)}
                                {data.addresses?.map((v: string, i: number) => <Item key={i} id={`addresses-${i}`} label={t('extraction.address', { defaultValue: 'Address' })} value={v} />)}
                                {data.social_links?.map((v: any, i: number) => <Item key={i} id={`social_links-${i}`} label={v.platform} value={v.url} />)}
                            </Section>
                        </div>
                    </div>
                </div>

                <DialogFooter className="bg-muted/20 p-6 border-t border-border/50">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="gap-2">
                        <IconXCircle className="h-4 w-4" />
                        {t('extraction.discardAll', { defaultValue: 'Discard all' })}
                    </Button>
                    <Button onClick={handleConfirm} className="gap-2 border-0 bg-primary px-8 text-primary-foreground hover:bg-primary/90">
                        <IconCheck className="h-4 w-4" />
                        {t('extraction.addSelected', { defaultValue: 'Add selected to kit' })}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
