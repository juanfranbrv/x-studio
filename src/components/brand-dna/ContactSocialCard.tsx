'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconMail, IconFacebook, IconInstagram, IconTwitter, IconLinkedin, IconYoutube, IconLink, IconPhone, IconPlus, IconGlobe, IconClose, IconMapPin, IconMusic } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
    BRAND_KIT_FIELD_CLASS,
    BRAND_KIT_OUTLINE_DASHED_BUTTON_CLASS,
    BRAND_KIT_PANEL_CLASS,
    BRAND_KIT_PANEL_DESCRIPTION_CLASS,
    BRAND_KIT_PANEL_HEADER_CLASS,
    BRAND_KIT_REMOVE_BUTTON_CLASS,
    BRAND_KIT_PANEL_TITLE_CLASS,
} from './brandKitStyles';

interface ContactSocialCardProps {
    socialLinks?: { platform: string; url: string; username?: string }[];
    emails?: string[];
    phones?: string[];
    addresses?: string[];
    onUpdate?: (data: { socialLinks: { platform: string; url: string; username?: string }[]; emails: string[]; phones: string[]; addresses: string[] }) => void;
}

const platformIcons: Record<string, any> = {
    facebook: IconFacebook,
    instagram: IconInstagram,
    tiktok: IconMusic,
    twitter: IconTwitter,
    linkedin: IconLinkedin,
    youtube: IconYoutube,
    other: IconLink,
};

export function ContactSocialCard({ socialLinks = [], emails = [], phones = [], addresses = [], onUpdate }: ContactSocialCardProps) {
    const { t } = useTranslation('brandKit');
    const [localSocials, setLocalSocials] = useState(socialLinks);
    const [localEmails, setLocalEmails] = useState(emails);
    const [localPhones, setLocalPhones] = useState(phones);
    const [localAddresses, setLocalAddresses] = useState(addresses || []);

    useEffect(() => setLocalSocials(socialLinks || []), [socialLinks]);
    useEffect(() => setLocalEmails(emails || []), [emails]);
    useEffect(() => setLocalPhones(phones || []), [phones]);
    useEffect(() => setLocalAddresses(addresses || []), [addresses]);

    const pushUpdate = (
        newSocials = localSocials,
        newEmails = localEmails,
        newPhones = localPhones,
        newAddresses = localAddresses,
    ) => {
        onUpdate?.({ socialLinks: newSocials, emails: newEmails, phones: newPhones, addresses: newAddresses });
    };

    const updateEmailAt = (index: number, value: string) => {
        const next = [...localEmails];
        next[index] = value;
        setLocalEmails(next);
        pushUpdate(localSocials, next, localPhones, localAddresses);
    };

    const updatePhoneAt = (index: number, value: string) => {
        const next = [...localPhones];
        next[index] = value;
        setLocalPhones(next);
        pushUpdate(localSocials, localEmails, next, localAddresses);
    };

    const updateAddressAt = (index: number, value: string) => {
        const next = [...localAddresses];
        next[index] = value;
        setLocalAddresses(next);
        pushUpdate(localSocials, localEmails, localPhones, next);
    };

    const updateSocialAt = (index: number, patch: Partial<{ platform: string; url: string; username?: string }>) => {
        const next = [...localSocials];
        next[index] = { ...next[index], ...patch };
        setLocalSocials(next);
        pushUpdate(next, localEmails, localPhones, localAddresses);
    };

    const handleDelete = (type: 'email' | 'phone' | 'social' | 'address', index: number) => {
        if (type === 'email') {
            const updated = localEmails.filter((_, i) => i !== index);
            setLocalEmails(updated);
            pushUpdate(localSocials, updated, localPhones, localAddresses);
            return;
        }
        if (type === 'phone') {
            const updated = localPhones.filter((_, i) => i !== index);
            setLocalPhones(updated);
            pushUpdate(localSocials, localEmails, updated, localAddresses);
            return;
        }
        if (type === 'social') {
            const updated = localSocials.filter((_, i) => i !== index);
            setLocalSocials(updated);
            pushUpdate(updated, localEmails, localPhones, localAddresses);
            return;
        }
        const updated = localAddresses.filter((_, i) => i !== index);
        setLocalAddresses(updated);
        pushUpdate(localSocials, localEmails, localPhones, updated);
    };

    const handleAdd = (type: 'email' | 'phone' | 'social' | 'address') => {
        if (type === 'email') {
            const updated = [...localEmails, ''];
            setLocalEmails(updated);
            pushUpdate(localSocials, updated, localPhones, localAddresses);
            return;
        }
        if (type === 'phone') {
            const updated = [...localPhones, ''];
            setLocalPhones(updated);
            pushUpdate(localSocials, localEmails, updated, localAddresses);
            return;
        }
        if (type === 'social') {
            const updated = [...localSocials, { platform: 'instagram', url: '', username: '' }];
            setLocalSocials(updated);
            pushUpdate(updated, localEmails, localPhones, localAddresses);
            return;
        }
        const updated = [...localAddresses, ''];
        setLocalAddresses(updated);
        pushUpdate(localSocials, localEmails, localPhones, updated);
    };

    const SectionTitle = ({ icon: Icon, title }: { icon: any; title: string }) => (
        <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
        </div>
    );

    const FieldRow = ({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) => (
        <div className="group relative flex items-center gap-2 py-1.5">
            <div className="flex-1">{children}</div>
            <button
                className={cn(BRAND_KIT_REMOVE_BUTTON_CLASS, "static shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100")}
                onClick={onDelete}
                aria-label={t('contact.deleteAria', { defaultValue: 'Delete' })}
                type="button"
            >
                <IconClose className="h-3 w-3" />
            </button>
        </div>
    );

    return (
        <Card className={cn(BRAND_KIT_PANEL_CLASS, "relative overflow-hidden")}>
            <CardHeader className={cn(BRAND_KIT_PANEL_HEADER_CLASS, "pb-4")}>
                <CardTitle className={BRAND_KIT_PANEL_TITLE_CLASS}>
                    <IconLink />
                    {t('contact.title', { defaultValue: 'Channels and direct contact' })}
                </CardTitle>
                <p className={BRAND_KIT_PANEL_DESCRIPTION_CLASS}>{t('contact.subtitle', { defaultValue: 'Información de contacto oficial detectada en la web' })}</p>
            </CardHeader>
            <CardContent className="space-y-6 px-6 pb-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <SectionTitle icon={IconMail} title={t('contact.emailsTitle', { defaultValue: 'Email addresses' })} />
                        <div className="space-y-1">
                            {localEmails.map((email, idx) => (
                                <FieldRow key={`email-${idx}`} onDelete={() => handleDelete('email', idx)}>
                                    <Input
                                        value={email}
                                        onChange={(e) => updateEmailAt(idx, e.target.value)}
                                        placeholder={t('contact.emailPlaceholder', { defaultValue: 'email@company.com' })}
                                        className={BRAND_KIT_FIELD_CLASS}
                                    />
                                </FieldRow>
                            ))}
                            <Button
                                variant="outline"
                                size="sm"
                                className={BRAND_KIT_OUTLINE_DASHED_BUTTON_CLASS}
                                onClick={() => handleAdd('email')}
                                type="button"
                            >
                                <IconPlus className="w-3.5 h-3.5 mr-1.5" />
                                {t('contact.addEmail', { defaultValue: 'Add email' })}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <SectionTitle icon={IconPhone} title={t('contact.phonesTitle', { defaultValue: 'Contact phone numbers' })} />
                        <div className="space-y-1">
                            {localPhones.map((phone, idx) => (
                                <FieldRow key={`phone-${idx}`} onDelete={() => handleDelete('phone', idx)}>
                                    <Input
                                        value={phone}
                                        onChange={(e) => updatePhoneAt(idx, e.target.value)}
                                        placeholder="+34 600 000 000"
                                        className={BRAND_KIT_FIELD_CLASS}
                                    />
                                </FieldRow>
                            ))}
                            <Button
                                variant="outline"
                                size="sm"
                                className={BRAND_KIT_OUTLINE_DASHED_BUTTON_CLASS}
                                onClick={() => handleAdd('phone')}
                                type="button"
                            >
                                <IconPlus className="w-3.5 h-3.5 mr-1.5" />
                                {t('contact.addPhone', { defaultValue: 'Add phone' })}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-2">
                    <SectionTitle icon={IconMapPin} title={t('contact.addressesTitle', { defaultValue: 'Physical addresses' })} />
                    <div className="space-y-1">
                        {localAddresses.map((address, idx) => (
                            <FieldRow key={`address-${idx}`} onDelete={() => handleDelete('address', idx)}>
                                <Input
                                    value={address}
                                    onChange={(e) => updateAddressAt(idx, e.target.value)}
                                    placeholder={t('contact.addressPlaceholder', { defaultValue: 'Street, number, city, postal code' })}
                                    className={BRAND_KIT_FIELD_CLASS}
                                />
                            </FieldRow>
                        ))}
                        <Button
                            variant="outline"
                            size="sm"
                            className={BRAND_KIT_OUTLINE_DASHED_BUTTON_CLASS}
                            onClick={() => handleAdd('address')}
                            type="button"
                        >
                            <IconPlus className="w-3.5 h-3.5 mr-1.5" />
                            {t('contact.addAddress', { defaultValue: 'Add address' })}
                        </Button>
                    </div>
                </div>

                <div className="space-y-4 pt-2">
                    <SectionTitle icon={IconGlobe} title={t('contact.socialTitle', { defaultValue: 'Social media presence' })} />
                    <div className="flex flex-col gap-1">
                        {localSocials.map((social, idx) => {
                            const Icon = platformIcons[(social.platform || 'other').toLowerCase()] || IconLink;
                            return (
                                <FieldRow key={`social-${idx}`} onDelete={() => handleDelete('social', idx)}>
                                    <div className="grid grid-cols-1 md:grid-cols-[130px_1fr_1fr] gap-2 items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-[hsl(var(--surface-alt))] shrink-0">
                                                <Icon className="w-3.5 h-3.5 text-primary opacity-80" />
                                            </div>
                                            <Select
                                                value={social.platform || 'instagram'}
                                                onValueChange={(value) => updateSocialAt(idx, { platform: value })}
                                            >
                                                <SelectTrigger className={BRAND_KIT_FIELD_CLASS}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="instagram">Instagram</SelectItem>
                                                    <SelectItem value="facebook">Facebook</SelectItem>
                                                    <SelectItem value="twitter">X / Twitter</SelectItem>
                                                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                                                    <SelectItem value="youtube">YouTube</SelectItem>
                                                    <SelectItem value="tiktok">TikTok</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Input
                                            value={social.url || ''}
                                            onChange={(e) => updateSocialAt(idx, { url: e.target.value })}
                                            placeholder="https://..."
                                            className={BRAND_KIT_FIELD_CLASS}
                                        />
                                        <Input
                                            value={social.username || ''}
                                            onChange={(e) => updateSocialAt(idx, { username: e.target.value })}
                                            placeholder={t('contact.usernamePlaceholder', { defaultValue: '@username' })}
                                            className={BRAND_KIT_FIELD_CLASS}
                                        />
                                    </div>
                                </FieldRow>
                            );
                        })}
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(BRAND_KIT_OUTLINE_DASHED_BUTTON_CLASS, "mt-2")}
                            onClick={() => handleAdd('social')}
                            type="button"
                        >
                            <IconPlus className="w-3.5 h-3.5 mr-1.5" />
                            {t('contact.addSocial', { defaultValue: 'Add social profile' })}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
