'use client';

import { Loader2 } from '@/components/ui/spinner'
import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { BrandDNA } from '@/lib/brand-types';
import { cn } from '@/lib/utils';
import { TextAssetsSection } from './TextAssetsSection';
import { ColorPalette } from './ColorPalette';
import { LogoCard, ScreenshotCard, ImageGallery } from './VisualAssetComponents';
import { TaglineCard, LanguageCard, BrandValuesCard, VisualAestheticCard, ToneOfVoiceCard } from './BrandAssets';
import { TypographySection } from './TypographySection';
import { BrandContextCard } from './BrandContextCard';
import { TechnicalAudit } from './TechnicalAudit';
import { ContactSocialCard } from './ContactSocialCard';
import { TargetAudienceCard } from './TargetAudienceCard';
import { BrandKitFloatingPalette } from './BrandKitFloatingPalette';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBrandKit } from '@/contexts/BrandKitContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { uploadBrandImage } from '@/app/actions/upload-image';
import { updateUserBrandKit } from '@/app/actions/update-user-brand-kit';
import { hexToRgb } from '@/lib/color-utils';
import { calculateBrandKitCompleteness } from '@/lib/brand-kit-utils';
import { useTranslation } from 'react-i18next';

import { IconGlobe, IconSave, IconCheck, IconRotate, IconAlertCircle, IconClose, IconBug, IconUpload, IconDownload, IconDelete } from '@/components/ui/icons';
import {
    BRAND_KIT_CALLOUT_CLASS,
    BRAND_KIT_FIELD_CLASS,
    BRAND_KIT_MODAL_CLASS,
    BRAND_KIT_MODAL_DESCRIPTION_CLASS,
    BRAND_KIT_MODAL_FOOTER_CLASS,
    BRAND_KIT_MODAL_HEADER_CLASS,
    BRAND_KIT_MODAL_TITLE_CLASS,
    BRAND_KIT_PAGE_SHELL_CLASS,
    BRAND_KIT_PANEL_CLASS,
    BRAND_KIT_PANEL_DESCRIPTION_CLASS,
    BRAND_KIT_PANEL_HEADER_CLASS,
    BRAND_KIT_PANEL_TITLE_CLASS,
    BRAND_KIT_SECONDARY_BUTTON_CLASS,
    BRAND_KIT_SECTION_LABEL_CLASS,
} from './brandKitStyles';

interface BrandDNABoardProps {
    data: BrandDNA;
    isDebug?: boolean;
    allowAssistantExit?: boolean;
    assistantCreationMode?: boolean;
    assistantLaunchNonce?: number;
    importLaunchNonce?: number;
    exportLaunchNonce?: number;
    importLaunchBrandId?: string | null;
    exportLaunchBrandId?: string | null;
    onConsumeImportLaunch?: () => void;
    onConsumeExportLaunch?: () => void;
    onAbortAssistantCreation?: () => Promise<void> | void;
    onCompleteAssistantCreation?: () => void;
    onRegenerate?: (urlOverride?: string) => void;
    onAnalyzeUrlFromAssistant?: (urlOverride?: string) => void;
    onStopAnalyzeUrlFromAssistant?: () => void;
    onPreviewUrlFromAssistant?: (url: string) => Promise<{
        success: boolean;
        url: string;
        title?: string;
        screenshotUrl?: string;
        error?: string;
    }>;
    onNewBrandKit?: () => void;
    onSaveSuccess?: () => void;
    onOpenAssistant?: () => void;
    onDuplicateCurrent?: () => void;
    onDeleteCurrent?: () => void;
    isDuplicatingCurrent?: boolean;
}

interface PortableEmbeddedAsset {
    originalUrl: string;
    dataUrl: string;
    fileName: string;
}

interface PortableBrandKitPayload {
    format: 'xstudio-brand-kit';
    version: 1;
    exportedAt: string;
    brand: BrandDNA;
    embeddedAssets: PortableEmbeddedAsset[];
}

function colorLuminance(hex?: string): number {
    if (!hex) return 1;
    const rgb = hexToRgb(hex);
    if (!rgb) return 1;
    return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
}

function normalizeStudioColorRoles(payload: BrandDNA): BrandDNA {
    const colors = Array.isArray(payload.colors) ? [...payload.colors] : [];
    if (colors.length === 0) return payload;

    const roleNormalized = colors.map((c) => {
        const role = (c.role || '').toString().trim().toLowerCase();
        let normalizedRole: 'Fondo' | 'Texto' | 'Acento' = 'Acento';
        if (role.includes('fondo') || role.includes('background')) normalizedRole = 'Fondo';
        else if (role.includes('texto') || role.includes('text')) normalizedRole = 'Texto';
        return { ...c, role: normalizedRole };
    });

    const hasFondo = roleNormalized.some((c) => c.role === 'Fondo');
    const hasTexto = roleNormalized.some((c) => c.role === 'Texto');

    // Si la paleta no cumple contrato, la reescribimos con la regla de producto.
    if (!hasFondo || !hasTexto) {
        // Fondo = primer color
        roleNormalized[0] = { ...roleNormalized[0], role: 'Fondo' };

        // Texto = color mas oscuro entre el resto
        if (roleNormalized.length > 1) {
            let darkestIdx = 1;
            let darkestLum = colorLuminance(roleNormalized[1].color);
            for (let i = 2; i < roleNormalized.length; i++) {
                const lum = colorLuminance(roleNormalized[i].color);
                if (lum < darkestLum) {
                    darkestLum = lum;
                    darkestIdx = i;
                }
            }
            roleNormalized.forEach((c, i) => {
                if (i === 0) return;
                roleNormalized[i] = { ...c, role: i === darkestIdx ? 'Texto' : 'Acento' };
            });
        }
    }

    return {
        ...payload,
        colors: roleNormalized,
    };
}

export function BrandDNABoard({
    data: initialData,
    isDebug = false,
    allowAssistantExit = false,
    assistantCreationMode = false,
    assistantLaunchNonce = 0,
    importLaunchNonce = 0,
    exportLaunchNonce = 0,
    importLaunchBrandId = null,
    exportLaunchBrandId = null,
    onConsumeImportLaunch,
    onConsumeExportLaunch,
    onAbortAssistantCreation,
    onCompleteAssistantCreation,
    onRegenerate,
    onAnalyzeUrlFromAssistant,
    onStopAnalyzeUrlFromAssistant,
    onPreviewUrlFromAssistant,
    onNewBrandKit,
    onSaveSuccess,
    onOpenAssistant,
    onDuplicateCurrent,
    onDeleteCurrent,
    isDuplicatingCurrent = false
}: BrandDNABoardProps) {
    const ASSISTANT_LOCK_KEY = 'brand-kit-assistant-lock';
    const { t } = useTranslation('brandKit');
    const { user } = useUser();
    const { syncActiveBrandKit, reloadBrandKits, setActiveBrandKit } = useBrandKit();
    const [data, setData] = useState<BrandDNA>(() => normalizeStudioColorRoles(initialData));
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isExportingPortable, setIsExportingPortable] = useState(false);
    const [importProgressModal, setImportProgressModal] = useState<{
        open: boolean;
        progress: number;
        message: string;
        completed: boolean;
    }>({
        open: false,
        progress: 0,
        message: '',
        completed: false,
    });
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const importFileInputRef = useRef<HTMLInputElement | null>(null);
    const handledImportLaunchNonceRef = useRef(0);
    const handledExportLaunchNonceRef = useRef(0);
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({
        open: false,
        title: '',
        message: ''
    });
    const [showDebug, setShowDebug] = useState(isDebug);
    const router = useRouter();
    const canUseDebugAudit = isDebug;
    const rawBrandUrl = (data.url || '').trim();
    const isManualPlaceholderUrl = rawBrandUrl.toLowerCase().startsWith('manual-');
    const normalizedAnalysisUrl = (() => {
        if (!rawBrandUrl || isManualPlaceholderUrl) return null;
        try {
            const withProtocol = rawBrandUrl.startsWith('http://') || rawBrandUrl.startsWith('https://')
                ? rawBrandUrl
                : `https://${rawBrandUrl}`;
            return new URL(withProtocol).toString();
        } catch {
            return null;
        }
    })();
    const completeness = calculateBrandKitCompleteness(data);
    const assistantPriorityMode = completeness.percentage < 70;
    const isDraftAssistantKit = assistantCreationMode && isManualPlaceholderUrl;
    const shouldLockAssistant = assistantPriorityMode && !allowAssistantExit;

    useEffect(() => {
        setData(normalizeStudioColorRoles(initialData));
    }, [initialData]);


    const handleSave = async (isAuto = false) => {
        if (!user || !hasUnsavedChanges) return;
        if (!data.id) {
            console.error('Cannot save: Brand Kit ID is missing.', data);
            setErrorModal({
                open: true,
                title: t('toasts.identifierErrorTitle', { defaultValue: 'Identifier error' }),
                message: t('toasts.identifierErrorDescription', { defaultValue: 'The Brand Kit cannot be saved because its ID is missing. Try reloading the page or regenerating it.' })
            });
            return;
        }

        setIsSaving(true);
        try {
            const result = await updateUserBrandKit(data.id || '', data);
            if (result.success) {
                setHasUnsavedChanges(false);
                setLastSaved(new Date());
                // Importante: sincronizar con el contexto sin recargar todo
                syncActiveBrandKit?.(data);

                // Solo llamar a onSaveSuccess si NO es autoguardado para evitar re-refrescos silenciosos en la UI global
                if (onSaveSuccess && !isAuto) onSaveSuccess();
            } else {
                throw new Error(result.error || t('board.saveError', { defaultValue: 'Error saving' }));
            }
        } catch (error: any) {
            console.error('Error saving brand kit:', error);
            setErrorModal({
                open: true,
                title: t('board.saveErrorTitle', { defaultValue: 'Error saving' }),
                message: error.message || t('board.saveErrorDescription', { defaultValue: 'The changes could not be synchronized with the database.' })
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-save logic
    useEffect(() => {
        if (hasUnsavedChanges && !isSaving) {
            const timer = setTimeout(() => {
                handleSave(true); // Is auto-save
            }, 10000); // 10 seconds debounce for auto-save
            return () => clearTimeout(timer);
        }
    }, [data, hasUnsavedChanges, isSaving]);

    const updateData = useCallback((updater: (prev: BrandDNA) => BrandDNA) => {
        setData(prev => {
            const newData = updater(prev);
            setHasUnsavedChanges(true);
            return newData;
        });
    }, []);



    // Handlers
    const handleAddColor = () => {
        updateData(prev => ({
            ...prev,
            colors: [...(prev.colors || []), { color: '#cccccc', sources: ['user'], score: 1, role: 'Neutral' }]
        }));
    };

    const handleRemoveColor = (index: number) => {
        updateData(prev => ({
            ...prev,
            colors: prev.colors?.filter((_, i) => i !== index)
        }));
    };

    const handleUpdateColor = (index: number, newColor: string) => {
        updateData(prev => ({
            ...prev,
            colors: prev.colors?.map((c, i) => i === index ? { ...c, color: newColor } : c)
        }));
    };

    const handleUpdateColorRole = (index: number, newRole: string) => {
        updateData(prev => ({
            ...prev,
            colors: prev.colors?.map((c, i) => i === index ? { ...c, role: newRole } : c)
        }));
    };

    const handleSwapColorPositions = (indexA: number, indexB: number) => {
        updateData(prev => {
            const newColors = [...(prev.colors || [])];
            if (newColors[indexA] && newColors[indexB]) {
                const temp = newColors[indexA];
                newColors[indexA] = newColors[indexB];
                newColors[indexB] = temp;
            }
            return { ...prev, colors: newColors };
        });
    };

    const handleResetColors = () => {
        updateData(prev => ({
            ...prev,
            colors: initialData.colors
        }));
    };



    const handleUploadFiles = async (files: FileList | File[]) => {
        if (!user) return;
        setIsUploading(true);
        try {
            const fileArray = Array.from(files);
            for (const file of fileArray) {
                if (file.size > 12 * 1024 * 1024) {
                    throw new Error(`La imagen ${file.name} supera los 12MB permitidos.`);
                }
                const formData = new FormData();
                formData.append('file', file);
                formData.append('assetKind', 'image');
                const result = await uploadBrandImage(formData);
                if (result.success && result.url) {
                    updateData(prev => ({
                        ...prev,
                        images: [...(prev.images || []), { url: result.url! }]
                    }));
                } else {
                    throw new Error(result.error || t('toasts.uploadImageError', { defaultValue: 'Error uploading image' }));
                }
            }
        } catch (error: any) {
            setErrorModal({ open: true, title: t('toasts.uploadErrorTitle', { defaultValue: 'Upload error' }), message: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    // LOGO HANDLERS
    const handleToggleLogoSelection = (index: number) => {
        updateData(prev => {
            const currentLogos = prev.logos || (prev.logo_url ? [{ url: prev.logo_url, selected: true }] : []);
            const newLogos = currentLogos.map((logo, i) =>
                i === index ? { ...logo, selected: !logo.selected } : logo
            );

            // Find the first selected logo to be the primary logo_url
            const firstSelected = newLogos.find(l => l.selected !== false);

            return {
                ...prev,
                logos: newLogos,
                logo_url: firstSelected ? firstSelected.url : undefined
            };
        });
    };

    const handleRemoveLogo = (index: number) => {
        updateData(prev => {
            const currentLogos = prev.logos || (prev.logo_url ? [{ url: prev.logo_url, selected: true }] : []);
            const newLogos = currentLogos.filter((_, i) => i !== index);

            // Find the first selected logo to be the primary logo_url
            const firstSelected = newLogos.find(l => l.selected !== false);

            return {
                ...prev,
                logos: newLogos,
                logo_url: firstSelected ? firstSelected.url : undefined
            };
        });
    };

    const handleReorderLogos = (fromIndex: number, toIndex: number) => {
        updateData(prev => {
            const currentLogos = prev.logos || (prev.logo_url ? [{ url: prev.logo_url, selected: true }] : []);
            if (
                fromIndex < 0
                || toIndex < 0
                || fromIndex >= currentLogos.length
                || toIndex >= currentLogos.length
                || fromIndex === toIndex
            ) {
                return prev;
            }

            const reordered = [...currentLogos];
            const [moved] = reordered.splice(fromIndex, 1);
            reordered.splice(toIndex, 0, moved);

            const firstSelected = reordered.find(l => l.selected !== false);

            return {
                ...prev,
                logos: reordered,
                logo_url: firstSelected ? firstSelected.url : undefined
            };
        });
    };

    const handleUploadLogos = async (files: FileList | File[]) => {
        if (!user) return;

        // Check limit
        const currentCount = (data.logos?.length || (data.logo_url ? 1 : 0));
        if (currentCount + files.length > 6) {
            setErrorModal({
                open: true,
                title: t('toasts.limitExceededTitle', { defaultValue: 'Limit exceeded' }),
                message: t('toasts.logoLimitDescription', { defaultValue: 'You can only have up to 6 logos.' })
            });
            return;
        }

        setIsUploading(true);
        try {
            const fileArray = Array.from(files);
            const newLogos: { url: string; selected: boolean }[] = [];

            for (const file of fileArray) {
                if (file.size > 12 * 1024 * 1024) {
                    throw new Error(`El archivo ${file.name} supera los 12MB permitidos.`);
                }
                const formData = new FormData();
                formData.append('file', file);
                formData.append('assetKind', 'logo');
                const result = await uploadBrandImage(formData);
                if (result.success && result.url) {
                    newLogos.push({ url: result.url!, selected: true });
                } else {
                    throw new Error(result.error || t('visualAssets.uploadError', { defaultValue: 'Error uploading logo' }));
                }
            }

            if (newLogos.length > 0) {
                updateData(prev => {
                    const currentLogos = prev.logos || (prev.logo_url ? [{ url: prev.logo_url, selected: true }] : []);
                    const updatedLogos = [...currentLogos, ...newLogos];

                    // If we didn't have a logo_url, set it to the first new one
                    const newLogoUrl = prev.logo_url || newLogos[0].url;

                    return {
                        ...prev,
                        logos: updatedLogos,
                        logo_url: newLogoUrl
                    };
                });
            }

        } catch (error: any) {
            setErrorModal({ open: true, title: t('toasts.uploadErrorTitle', { defaultValue: 'Upload error' }), message: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    const handleUpdateContact = (contactData: { socialLinks: { platform: string; url: string; username?: string }[], emails: string[], phones: string[], addresses: string[] }) => {
        updateData(prev => ({
            ...prev,
            social_links: contactData.socialLinks,
            emails: contactData.emails,
            phones: contactData.phones,
            addresses: contactData.addresses
        }));
    };

    const handleAddFont = (font: string) => {
        updateData(prev => ({ ...prev, fonts: [...(prev.fonts || []), { family: font }] }));
    };

    const handleRemoveFont = (idx: number) => {
        updateData(prev => ({ ...prev, fonts: prev.fonts?.filter((_, i) => i !== idx) }));
    };

    const handleUpdateFontRole = (idx: number, role?: 'heading' | 'body') => {
        updateData(prev => ({
            ...prev,
            fonts: (prev.fonts || []).map((f, i) => {
                const fontObj = typeof f === 'string' ? { family: f } : f;
                return i === idx ? { ...fontObj, role } : f;
            })
        }));
    };

    const handleSelectFontForRole = (family: string, role: 'heading' | 'body') => {
        updateData(prev => {
            const normalizedFonts = (prev.fonts || []).map((f) => typeof f === 'string' ? { family: f } : f);
            const updatedForRole = normalizedFonts
                .filter((f) => f.role !== role)
                .filter((f) => !(f.family === family && f.role === role));

            const selectedFont = { family, role } as { family: string; role: 'heading' | 'body' };
            const withSelection = [...updatedForRole, selectedFont];

            const heading = withSelection.find((f) => f.role === 'heading');
            const body = withSelection.find((f) => f.role === 'body');
            const ordered = [
                ...(heading ? [heading] : []),
                ...(body ? [body] : []),
            ];

            return {
                ...prev,
                fonts: ordered
            };
        });
    };

    const handleUpdateTagline = (val: string) => {
        updateData(prev => ({ ...prev, tagline: val }));
    };

    const handleUpdatePreferredLanguage = (val: string) => {
        updateData(prev => ({ ...prev, preferred_language: val }));
    };

    const handleUpdateBrandValue = (index: number, val: string) => {
        updateData(prev => ({
            ...prev,
            brand_values: (prev.brand_values || []).map((v, i) => i === index ? val : v)
        }));
    };

    const handleAddBrandValue = () => {
        updateData(prev => ({ ...prev, brand_values: [...(prev.brand_values || []), 'Nuevo Valor'] }));
    };

    const handleRemoveBrandValue = (idx: number) => {
        updateData(prev => ({ ...prev, brand_values: prev.brand_values?.filter((_, i) => i !== idx) }));
    };

    const handleUpdateAesthetic = (idx: number, val: string) => {
        updateData(prev => ({ ...prev, visual_aesthetic: prev.visual_aesthetic?.map((v, i) => i === idx ? val : v) }));
    };

    const handleAddAesthetic = () => {
        updateData(prev => ({ ...prev, visual_aesthetic: [...(prev.visual_aesthetic || []), ''] }));
    };

    const handleRemoveAesthetic = (idx: number) => {
        updateData(prev => ({ ...prev, visual_aesthetic: prev.visual_aesthetic?.filter((_, i) => i !== idx) }));
    };

    const handleUpdateTone = (idx: number, val: string) => {
        updateData(prev => ({ ...prev, tone_of_voice: prev.tone_of_voice?.map((v, i) => i === idx ? val : v) }));
    };

    const handleAddTone = () => {
        updateData(prev => ({ ...prev, tone_of_voice: [...(prev.tone_of_voice || []), 'Nuevo Tono'] }));
    };

    const handleRemoveTone = (idx: number) => {
        updateData(prev => ({ ...prev, tone_of_voice: prev.tone_of_voice?.filter((_, i) => i !== idx) }));
    };

    const handleTextAssetsChange = (newTextAssets: any) => {
        updateData(prev => ({
            ...prev,
            text_assets: newTextAssets,
            business_overview: newTextAssets.brand_context || prev.business_overview
        }));
    };

    const handleUpdateBrandContext = (value: string) => {
        updateData(prev => ({
            ...prev,
            business_overview: value,
            text_assets: prev.text_assets ? { ...prev.text_assets, brand_context: value } : {
                marketing_hooks: [],
                visual_keywords: [],
                ctas: [],
                brand_context: value
            }
        }));
    };

    const handleRemoveImage = (idx: number) => {
        updateData(prev => ({ ...prev, images: prev.images?.filter((_, i) => i !== idx) }));
    };

    const extractAssetUrls = (kit: BrandDNA): string[] => {
        const urls = new Set<string>();

        const push = (value?: string) => {
            const clean = (value || '').trim();
            if (!clean) return;
            urls.add(clean);
        };

        push(kit.logo_url);
        push(kit.favicon_url);
        push(kit.screenshot_url);
        (kit.logos || []).forEach((logo) => push(logo?.url));
        (kit.images || []).forEach((img) => push(img?.url));

        return Array.from(urls);
    };

    const guessExtensionFromMime = (mimeType: string) => {
        if (mimeType.includes('png')) return 'png';
        if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
        if (mimeType.includes('webp')) return 'webp';
        if (mimeType.includes('gif')) return 'gif';
        if (mimeType.includes('svg')) return 'svg';
        return 'bin';
    };

    const readBlobAsDataUrl = (blob: Blob): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error(t('board.readImageExportError', { defaultValue: 'The image could not be read for export.' })));
            reader.readAsDataURL(blob);
        });

    const buildPortablePayload = async (kit: BrandDNA): Promise<PortableBrandKitPayload> => {
        const brandForExport: BrandDNA = {
            ...kit,
            id: undefined,
            created_at: undefined,
            updated_at: undefined,
            api_trace: undefined,
            debug: undefined,
        };

        const embeddedAssets: PortableEmbeddedAsset[] = [];
        const urls = extractAssetUrls(brandForExport);

        for (const url of urls) {
            try {
                const response = await fetch(url);
                if (!response.ok) continue;
                const blob = await response.blob();
                const dataUrl = await readBlobAsDataUrl(blob);
                const mimeType = blob.type || 'application/octet-stream';
                const ext = guessExtensionFromMime(mimeType);
                const fileName = `asset-${embeddedAssets.length + 1}.${ext}`;
                embeddedAssets.push({ originalUrl: url, dataUrl, fileName });
            } catch {
                // Si algun asset no se puede leer, el export sigue sin bloquear al usuario.
            }
        }

        return {
            format: 'xstudio-brand-kit',
            version: 1,
            exportedAt: new Date().toISOString(),
            brand: brandForExport,
            embeddedAssets,
        };
    };

    const sanitizeImportedBrand = (raw: BrandDNA): BrandDNA => ({
        ...raw,
        id: undefined,
        url: raw.url || '',
        brand_name: raw.brand_name || 'Mi Marca',
        tagline: raw.tagline || '',
        business_overview: raw.business_overview || '',
        brand_values: Array.isArray(raw.brand_values) ? raw.brand_values : [],
        tone_of_voice: Array.isArray(raw.tone_of_voice) ? raw.tone_of_voice : [],
        visual_aesthetic: Array.isArray(raw.visual_aesthetic) ? raw.visual_aesthetic : [],
        colors: Array.isArray(raw.colors) ? raw.colors : [],
        fonts: Array.isArray(raw.fonts) ? raw.fonts : [],
        logos: Array.isArray(raw.logos) ? raw.logos : [],
        images: Array.isArray(raw.images) ? raw.images : [],
        social_links: Array.isArray(raw.social_links) ? raw.social_links : [],
        emails: Array.isArray(raw.emails) ? raw.emails : [],
        phones: Array.isArray(raw.phones) ? raw.phones : [],
        addresses: Array.isArray(raw.addresses) ? raw.addresses : [],
        target_audience: Array.isArray(raw.target_audience) ? raw.target_audience : [],
        created_at: undefined,
        updated_at: undefined,
        api_trace: undefined,
        debug: undefined,
    });

    const dataUrlToFile = async (dataUrl: string, fileName: string): Promise<File> => {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const mime = blob.type || 'image/webp';
        return new File([blob], fileName, { type: mime });
    };

    const handleExportJSON = async () => {
        setIsExportingPortable(true);
        try {
            const portablePayload = await buildPortablePayload(data);
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(portablePayload, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `brand-kit-${data.brand_name?.toLowerCase().replace(/\s+/g, '-') || 'export'}.json`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        } catch (error) {
            setErrorModal({
                open: true,
                title: t('board.exportErrorTitle', { defaultValue: 'Export error' }),
                message: error instanceof Error
                    ? error.message
                    : t('board.exportErrorDescription', { defaultValue: 'The kit could not be exported in portable format.' }),
            });
        } finally {
            setIsExportingPortable(false);
        }
    };

    const handleImportKitClick = () => {
        importFileInputRef.current?.click();
    };

    useEffect(() => {
        if (importLaunchNonce <= 0) return;
        if (importLaunchBrandId && data.id && importLaunchBrandId !== data.id) return;
        if (handledImportLaunchNonceRef.current === importLaunchNonce) return;
        handledImportLaunchNonceRef.current = importLaunchNonce;
        onConsumeImportLaunch?.();
        handleImportKitClick();
    }, [importLaunchNonce, importLaunchBrandId, data.id, onConsumeImportLaunch]);

    useEffect(() => {
        if (exportLaunchNonce <= 0) return;
        if (exportLaunchBrandId && data.id && exportLaunchBrandId !== data.id) return;
        if (handledExportLaunchNonceRef.current === exportLaunchNonce) return;
        handledExportLaunchNonceRef.current = exportLaunchNonce;
        onConsumeExportLaunch?.();
        void handleExportJSON();
    }, [exportLaunchNonce, exportLaunchBrandId, data.id, onConsumeExportLaunch]);

    const handleImportKitFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!user?.id) {
            setErrorModal({
                open: true,
                title: 'Sesion requerida',
                message: 'Necesitas iniciar sesion para importar un kit de marca.',
            });
            event.target.value = '';
            return;
        }

        setIsImporting(true);
        setImportProgressModal({
            open: true,
            progress: 5,
            message: 'Preparando importacion del kit de marca...',
            completed: false,
        });
        try {
            const text = await file.text();
            setImportProgressModal((prev) => ({
                ...prev,
                progress: 15,
                message: 'Leyendo archivo y validando contenido...',
            }));
            const parsed = JSON.parse(text) as Partial<PortableBrandKitPayload> | BrandDNA;

            const isPortable = (parsed as PortableBrandKitPayload)?.format === 'xstudio-brand-kit';
            const rawBrand = (isPortable ? (parsed as PortableBrandKitPayload).brand : parsed) as BrandDNA;
            const importedBrand = sanitizeImportedBrand(rawBrand);
            setImportProgressModal((prev) => ({
                ...prev,
                progress: 25,
                message: t('toasts.normalizingImportedKit', { defaultValue: 'Normalizing imported kit data...' }),
            }));

            const replacementMap = new Map<string, string>();
            const portableAssets = isPortable ? ((parsed as PortableBrandKitPayload).embeddedAssets || []) : [];

            for (const asset of portableAssets) {
                if (!asset?.dataUrl || !asset?.originalUrl) continue;
                try {
                    const uploadFile = await dataUrlToFile(asset.dataUrl, asset.fileName || 'brand-kit-asset.webp');
                    const formData = new FormData();
                    formData.append('file', uploadFile);
                    formData.append('assetKind', 'image');
                    const uploaded = await uploadBrandImage(formData);
                    if (uploaded.success && uploaded.url) {
                        replacementMap.set(asset.originalUrl, uploaded.url);
                    }
                    const assetProgress = 25 + Math.round((replacementMap.size / Math.max(portableAssets.length, 1)) * 40);
                    setImportProgressModal((prev) => ({
                        ...prev,
                        progress: Math.min(assetProgress, 65),
                        message: 'Subiendo imagenes del kit...',
                    }));
                } catch {
                    // No bloqueamos toda la importacion por una imagen concreta.
                }
            }

            const mapUrl = (url?: string) => {
                const clean = (url || '').trim();
                if (!clean) return clean;
                return replacementMap.get(clean) || clean;
            };

            importedBrand.logo_url = mapUrl(importedBrand.logo_url);
            importedBrand.favicon_url = mapUrl(importedBrand.favicon_url);
            importedBrand.screenshot_url = mapUrl(importedBrand.screenshot_url);
            importedBrand.logos = (importedBrand.logos || []).map((logo) => ({ ...logo, url: mapUrl(logo.url) }));
            importedBrand.images = (importedBrand.images || []).map((img) => ({ ...img, url: mapUrl(img.url) }));

            const normalized = normalizeStudioColorRoles(importedBrand);
            setImportProgressModal((prev) => ({
                ...prev,
                progress: 72,
                message: 'Creando nuevo kit en tu cuenta...',
            }));

            const createResponse = await fetch('/api/brand-kit/create-empty', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clerk_user_id: user.id,
                    brand_name: normalized.brand_name?.trim() || 'Kit importado',
                }),
            });
            const createResult = await createResponse.json();
            const createdId = createResult?.data?.id as string | undefined;
            if (!createResult?.success || !createdId) {
                throw new Error(createResult?.error || t('board.importCreateError', { defaultValue: 'The kit could not be created for import.' }));
            }
            setImportProgressModal((prev) => ({
                ...prev,
                progress: 82,
                message: 'Guardando contenido del kit importado...',
            }));

            const payloadToSave: BrandDNA = {
                ...normalized,
                id: createdId,
            };
            const saveResult = await updateUserBrandKit(createdId, payloadToSave);
            if (!saveResult.success) {
                throw new Error(saveResult.error || t('board.importSaveError', { defaultValue: 'The imported kit could not be saved.' }));
            }

            setImportProgressModal((prev) => ({
                ...prev,
                progress: 92,
                message: 'Sincronizando lista y activando kit...',
            }));
            await reloadBrandKits(false);
            await setActiveBrandKit(createdId, true, false);
            setData(payloadToSave);
            setHasUnsavedChanges(false);
            setImportProgressModal({
                open: true,
                progress: 100,
                message: 'pues he importado kit de marca',
                completed: true,
            });
        } catch (error) {
            setImportProgressModal((prev) => ({ ...prev, open: false }));
            setErrorModal({
                open: true,
                title: 'Error al importar',
                message: error instanceof Error
                    ? error.message
                    : t('board.importFileError', { defaultValue: 'The Brand Kit file could not be imported.' }),
            });
        } finally {
            setIsImporting(false);
            event.target.value = '';
        }
    };

    const handleAppendExtractedData = (extracted: any) => {
        updateData(prev => {
            const newState = { ...prev };

            // Merge arrays by appending and de-duplicating strings
            const mergeArray = (key: string, items: string[]) => {
                if (!items || items.length === 0) return (prev as any)[key];
                const current = (prev as any)[key] || [];
                const combined = [...current, ...items];
                return [...new Set(combined)];
            };

            if (extracted.brand_values) newState.brand_values = mergeArray('brand_values', extracted.brand_values);
            if (extracted.tone_of_voice) newState.tone_of_voice = mergeArray('tone_of_voice', extracted.tone_of_voice);
            if (extracted.visual_aesthetic) newState.visual_aesthetic = mergeArray('visual_aesthetic', extracted.visual_aesthetic);
            if (extracted.target_audience) newState.target_audience = mergeArray('target_audience', extracted.target_audience);
            if (extracted.emails) newState.emails = mergeArray('emails', extracted.emails);
            if (extracted.phones) newState.phones = mergeArray('phones', extracted.phones);


            // For brand_name and tagline, only update if they were empty or very short
            if (extracted.brand_name && (!prev.brand_name || prev.brand_name.length < 3)) {
                newState.brand_name = extracted.brand_name;
            }
            if (extracted.tagline && (!prev.tagline || prev.tagline.length < 3)) {
                newState.tagline = extracted.tagline;
            }

            // Text assets merging
            if (extracted.text_assets) {
                const currentText = prev.text_assets || { marketing_hooks: [], visual_keywords: [], ctas: [], brand_context: '' };
                newState.text_assets = {
                    marketing_hooks: [...new Set([...(currentText.marketing_hooks || []), ...(extracted.text_assets.marketing_hooks || [])])],
                    visual_keywords: currentText.visual_keywords, // No extracted by this schema
                    ctas: [...new Set([...(currentText.ctas || []), ...(extracted.text_assets.ctas || [])])],
                    brand_context: extracted.text_assets.brand_context || currentText.brand_context
                };

                if (extracted.text_assets.brand_context) {
                    newState.business_overview = extracted.text_assets.brand_context;
                }
            }

            // Social links merging
            if (extracted.social_links) {
                const currentLinks = prev.social_links || [];
                const newLinks = [...currentLinks];
                extracted.social_links.forEach((link: any) => {
                    if (!currentLinks.some(l => l.url === link.url)) {
                        newLinks.push(link);
                    }
                });
                newState.social_links = newLinks;
            }

            return newState;
        });
    };

    return (
        <div className="space-y-8 pb-12">
            {!assistantPriorityMode && (
            <div className={cn(BRAND_KIT_PAGE_SHELL_CLASS, "mb-6 p-5 transition-all duration-200 md:p-6")}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1 space-y-4">
                        <div className={cn(BRAND_KIT_CALLOUT_CLASS, "p-4")}>
                            <p className="mb-1 text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('board.howToCompleteTitle', { defaultValue: 'How to complete this section' })}</p>
                            <p className={BRAND_KIT_PANEL_DESCRIPTION_CLASS}>{t('board.howToCompleteDescription', { defaultValue: 'Step 1: give your kit a name. Step 2 (optional): paste a URL and click Analyze URL to autofill content.' })}</p>
                        </div>

                        <div className="flex items-stretch gap-3">
                            <div className={cn(BRAND_KIT_CALLOUT_CLASS, "min-h-[132px] w-20 shrink-0 self-stretch flex items-center justify-center text-accent-foreground md:w-24")}>
                                {data.logo_url ? (
                                      <img src={data.logo_url} className="w-14 h-14 md:w-16 md:h-16 object-contain" alt="Logo" />
                                  ) : (
                                    <span className="text-2xl md:text-3xl font-bold">{data.brand_name?.[0] || 'M'}</span>
                                )}
                            </div>

                            <div className="flex-1 space-y-3">
                                <div>
                                    <p className={BRAND_KIT_SECTION_LABEL_CLASS}>{t('board.stepName', { defaultValue: 'Step 1 · Kit name' })}</p>
                                    <Input
                                        value={data.brand_name || ''}
                                        onChange={(e) => {
                                            setData((prev) => ({ ...prev, brand_name: e.target.value }));
                                            setHasUnsavedChanges(true);
                                        }}
                                        className={cn(BRAND_KIT_FIELD_CLASS, "h-[42px] font-semibold")}
                                        placeholder={t('board.namePlaceholder', { defaultValue: 'Ex: My Brand' })}
                                    />
                                </div>

                                <div>
                                    <p className={cn(BRAND_KIT_SECTION_LABEL_CLASS, "flex items-center gap-1.5")}>
                                        <IconGlobe className="w-[1.125rem] h-[1.125rem]" />
                                        {t('board.stepUrl', { defaultValue: 'Step 2 (optional) · Website URL to analyze' })}
                                    </p>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <Input
                                            value={data.url || ''}
                                            onChange={(e) => {
                                                setData((prev) => ({ ...prev, url: e.target.value }));
                                                setHasUnsavedChanges(true);
                                            }}
                                            placeholder={t('board.urlPlaceholder', { defaultValue: 'https://your-site.com' })}
                                            className={cn(BRAND_KIT_FIELD_CLASS, "h-[42px] text-[0.96rem] sm:max-w-[360px]")}
                                        />
                                        {onRegenerate && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={cn(BRAND_KIT_SECONDARY_BUTTON_CLASS, "w-full sm:w-auto")}
                                                disabled={!normalizedAnalysisUrl}
                                                onClick={() => onRegenerate(normalizedAnalysisUrl || rawBrandUrl)}
                                            >
                                                {t('board.analyzeUrl', { defaultValue: 'Analyze URL' })}
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground/80 mt-1">
                                        {isManualPlaceholderUrl
                                            ? t('board.manualUrlHint', { defaultValue: 'Your kit was created manually. Add a valid URL to complete it automatically.' })
                                            : normalizedAnalysisUrl
                                                ? t('board.validUrlHint', { defaultValue: 'Valid URL. Click "Analyze URL" to update this kit with website data.' })
                                                : t('board.emptyUrlHint', { defaultValue: 'If you add a valid URL, you can analyze it to complete this kit faster.' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 lg:pt-1">
                        {isSaving ? (
                            <div className={cn(BRAND_KIT_CALLOUT_CLASS, "flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground animate-pulse")}>
                                <Loader2 className="w-[1.125rem] h-[1.125rem] mr-2" />
                                {t('board.saving', { defaultValue: 'Saving...' })}
                            </div>
                        ) : hasUnsavedChanges ? (
                            <div className={cn(BRAND_KIT_CALLOUT_CLASS, "flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground")}>
                                <IconSave className="w-[1.125rem] h-[1.125rem] mr-2" />
                                {t('board.pendingChanges', { defaultValue: 'Pending changes' })}
                            </div>
                        ) : (
                            <div className={cn(BRAND_KIT_CALLOUT_CLASS, "flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground")}>
                                <IconCheck className="w-[1.125rem] h-[1.125rem] mr-2" />
                                {t('board.synced', { defaultValue: 'Synced' })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/50 pt-4">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <input
                            ref={importFileInputRef}
                            type="file"
                            accept="application/json,.json"
                            className="hidden"
                            onChange={handleImportKitFile}
                        />



                        </div>
                    </div>
                </div>
            )}
            {assistantPriorityMode && !allowAssistantExit ? (
                <div className={cn(BRAND_KIT_CALLOUT_CLASS, "p-6")}>
                    <p className="text-base font-medium text-foreground mb-1">{t('board.completeAssistantTitle', { defaultValue: 'Complete the guided assistant first' })}</p>
                    <p className="text-sm text-muted-foreground mb-4">
                        {t('board.completeAssistantDescription', { defaultValue: 'When you finish these steps, the full editor will unlock.' })}
                    </p>
                    <Button onClick={() => router.push(`/brand-kit/new?id=${data.id}`)}>{t('board.openAssistant', { defaultValue: 'Open assistant' })}</Button>
                </div>
            ) : (
                <>
                    {/* NEW LAYOUT IMPLEMENTATION */}

                    {/* Main content layout: editable content on the left, visual references on the right */}
                    {/* REFINED THREE-COLUMN LAYOUT */}
                    <div className="space-y-8">
                        {/* ROW 1: Brand Context & Website Reference */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <BrandContextCard
                                    context={data.business_overview || ''}
                                    minHeightClassName="min-h-[160px]"
                                    onUpdate={(val) => updateData(prev => ({
                                        ...prev,
                                        business_overview: val,
                                        text_assets: prev.text_assets ? { ...prev.text_assets, brand_context: val } : {
                                            marketing_hooks: [],
                                            visual_keywords: [],
                                            ctas: [],
                                            brand_context: val
                                        }
                                    }))}
                                />
                            </div>
                            <div className="lg:col-span-1">
                                <ScreenshotCard 
                                    screenshotUrl={data.screenshot_url} 
                                    faviconUrl={data.favicon_url} 
                                />
                            </div>
                        </div>

                        {/* ROW 2: Main Brand Components (3 Columns) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start gap-8">
                            {/* Column 1: Identity */}
                            <div className="space-y-8">
                                <LogoCard
                                    logoUrl={data.logo_url}
                                    logos={data.logos}
                                    onUpload={handleUploadLogos}
                                    onRemove={handleRemoveLogo}
                                    onToggle={handleToggleLogoSelection}
                                    onReorder={handleReorderLogos}
                                    isUploading={isUploading}
                                />
                                <TaglineCard
                                    tagline={data.tagline || ''}
                                    onUpdateTagline={handleUpdateTagline}
                                />
                                <LanguageCard
                                    preferredLanguage={data.preferred_language}
                                    onUpdateLanguage={handleUpdatePreferredLanguage}
                                />
                                <TargetAudienceCard audience={data.target_audience} />
                            </div>

                            {/* Column 2: Visual System */}
                            <div className="space-y-8">
                                <ColorPalette
                                    colors={data.colors || []}
                                    isEdited={JSON.stringify(data.colors) !== JSON.stringify(initialData.colors)}
                                    onUpdateColor={handleUpdateColor}
                                    onUpdateRole={handleUpdateColorRole}
                                    onSwapPositions={handleSwapColorPositions}
                                    onRemoveColor={handleRemoveColor}
                                    onAddColor={handleAddColor}
                                    onReset={handleResetColors}
                                />
                                <TypographySection
                                    fonts={(data.fonts || []).map(f => typeof f === 'string' ? { family: f } : f)}
                                    tagline={data.tagline || ''}
                                    onAddFont={handleAddFont}
                                    onSelectFontForRole={handleSelectFontForRole}
                                    onRemoveFont={handleRemoveFont}
                                    onUpdateRole={handleUpdateFontRole}
                                />
                                <VisualAestheticCard
                                    aesthetic={data.visual_aesthetic || []}
                                    onUpdateAesthetic={handleUpdateAesthetic}
                                    onAddAesthetic={handleAddAesthetic}
                                    onRemoveAesthetic={handleRemoveAesthetic}
                                />
                            </div>

                            {/* Column 3: Narrative & Contact */}
                            <div className="space-y-8">
                                <BrandValuesCard
                                    values={data.brand_values || []}
                                    onUpdateValue={handleUpdateBrandValue}
                                    onAddValue={handleAddBrandValue}
                                    onRemoveValue={handleRemoveBrandValue}
                                />
                                <ContactSocialCard
                                    socialLinks={data.social_links}
                                    emails={data.emails}
                                    phones={data.phones}
                                    addresses={data.addresses}
                                    onUpdate={handleUpdateContact}
                                />
                                <ToneOfVoiceCard
                                    tone={data.tone_of_voice || []}
                                    onUpdateTone={handleUpdateTone}
                                    onAddTone={handleAddTone}
                                    onRemoveTone={handleRemoveTone}
                                />
                                <TextAssetsSection
                                    data={data.text_assets}
                                    onChange={handleTextAssetsChange}
                                    onAppendData={handleAppendExtractedData}
                                />
                            </div>
                        </div>

                        {/* ROW 3: Secondary Visual Assets (Full Width) */}
                        <div className="w-full">
                            <ImageGallery
                                images={data.images || []}
                                isUploading={isUploading}
                                onUpload={handleUploadFiles}
                                onRemoveImage={handleRemoveImage}
                                onOpenLightbox={setLightboxImage}
                            />
                        </div>
                    </div>

                    {canUseDebugAudit && showDebug && <TechnicalAudit trace={data.api_trace} isVisible={showDebug} debugData={data.debug} />}
                </>
            )}

            {/* Lightbox */}
            {
                lightboxImage && (
                    <div
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                        onClick={() => setLightboxImage(null)}
                    >
                        <div className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center">
                            <img src={lightboxImage} alt="Full size" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                            <button className="absolute -top-12 right-0 p-2 text-white hover:text-accent transition-colors" onClick={() => setLightboxImage(null)}>
                                <IconClose className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Error Dialog */}
            <Dialog open={errorModal.open} onOpenChange={(open) => setErrorModal(prev => ({ ...prev, open }))}>
                <DialogContent className={BRAND_KIT_MODAL_CLASS}>
                    <DialogHeader className={BRAND_KIT_MODAL_HEADER_CLASS}>
                        <DialogTitle className={cn(BRAND_KIT_MODAL_TITLE_CLASS, "flex items-center gap-2 text-destructive")}>
                            <IconAlertCircle className="w-5 h-5" />
                            {errorModal.title}
                        </DialogTitle>
                        <DialogDescription className={BRAND_KIT_MODAL_DESCRIPTION_CLASS}>
                            {errorModal.message}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className={BRAND_KIT_MODAL_FOOTER_CLASS}>
                        <Button className={BRAND_KIT_SECONDARY_BUTTON_CLASS} onClick={() => setErrorModal(prev => ({ ...prev, open: false }))}>
                            Entendido
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={importProgressModal.open}
                onOpenChange={(open) => {
                    if (!open && !importProgressModal.completed) return;
                    setImportProgressModal((prev) => ({ ...prev, open }));
                }}
            >
                <DialogContent className={cn(BRAND_KIT_MODAL_CLASS, "sm:max-w-md")}>
                    <DialogHeader className={BRAND_KIT_MODAL_HEADER_CLASS}>
                        <DialogTitle className={BRAND_KIT_MODAL_TITLE_CLASS}>
                            {importProgressModal.completed ? 'Importacion completada' : 'Importando kit de marca'}
                        </DialogTitle>
                        <DialogDescription className={BRAND_KIT_MODAL_DESCRIPTION_CLASS}>
                            {importProgressModal.message}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 px-6">
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[hsl(var(--surface-alt))]">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500 ease-out"
                                style={{ width: `${Math.max(0, Math.min(100, importProgressModal.progress))}%` }}
                            />
                        </div>
                        <div className="text-right text-xs text-muted-foreground font-medium">
                            {Math.round(importProgressModal.progress)}%
                        </div>
                    </div>

                    <DialogFooter className={BRAND_KIT_MODAL_FOOTER_CLASS}>
                        {!importProgressModal.completed ? (
                            <div className="w-full text-sm text-muted-foreground flex items-center justify-end gap-2">
                                <Loader2 className="w-4 h-4" />
                                Procesando...
                            </div>
                        ) : (
                            <Button
                                className={BRAND_KIT_SECONDARY_BUTTON_CLASS}
                                onClick={() => setImportProgressModal((prev) => ({ ...prev, open: false }))}
                            >
                                Aceptar
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <BrandKitFloatingPalette
                onSave={() => handleSave(false)}
                onImport={handleImportKitClick}
                onExport={handleExportJSON}
                onDelete={onDeleteCurrent}
                onOpenAssistant={onOpenAssistant}
                isSaving={isSaving}
                isExporting={isExportingPortable}
                hasUnsavedChanges={hasUnsavedChanges}
            />
        </div>
    );
}

