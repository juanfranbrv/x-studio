'use client'

import { Loader2 } from '@/components/ui/spinner'
;

import { useState, useEffect, Suspense, useRef, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSearchParams, useRouter } from 'next/navigation';
import { analyzeBrandDNA } from '@/app/actions/analyze-brand-dna';
import { previewBrandUrl } from '@/app/actions/preview-brand-url';
import { getAllUserBrandKits } from '@/app/actions/get-user-brand-kit';
import { updateUserBrandKit } from '@/app/actions/update-user-brand-kit';
import { useBrandKit } from '@/contexts/BrandKitContext';
import type { BrandDNA } from '@/lib/brand-types';
import { cn } from '@/lib/utils';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { IconGlobe, IconSparkles, IconArrowRight, IconPackage, IconRefresh, IconPlus, IconTriangleAlert, IconCheckSimple, IconClose, IconEdit, IconListChecks, IconDelete, IconCopy, IconUpload, IconDownload } from '@/components/ui/icons';
import { BrandDNABoard } from '@/components/brand-dna/BrandDNABoard';
import { BrandKitProgress } from '@/components/brand-dna/BrandKitProgress';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import {
    BRAND_KIT_MODAL_CLASS,
    BRAND_KIT_MODAL_DESCRIPTION_CLASS,
    BRAND_KIT_MODAL_FOOTER_CLASS,
    BRAND_KIT_MODAL_HEADER_CLASS,
    BRAND_KIT_MODAL_TITLE_CLASS,
    BRAND_KIT_SECONDARY_BUTTON_CLASS,
} from '@/components/brand-dna/brandKitStyles';

function BrandKitPageContent() {
    const { t } = useTranslation('brandKit');
    const loadingMessages = useMemo(() => ([
        t('loadingStages.starting', { defaultValue: 'Starting analysis engines...' }),
        t('loadingStages.connectingMicrolink', { defaultValue: 'Connecting to Microlink API...' }),
        t('loadingStages.capturingVisualEssence', { defaultValue: 'Capturing the visual essence of the website...' }),
        t('loadingStages.extractingTechnicalPalette', { defaultValue: 'Extracting the technical palette (DOM)...' }),
        t('loadingStages.analyzingLogos', { defaultValue: 'Analyzing logo candidates...' }),
        t('loadingStages.discoveringTypography', { defaultValue: 'Discovering typography in CSS...' }),
        t('loadingStages.extractingDna', { defaultValue: 'Extracting brand DNA with AI...' }),
        t('loadingStages.generatingAssets', { defaultValue: 'Generating final assets and palettes...' }),
        t('loadingStages.polishing', { defaultValue: 'Polishing the final details...' }),
    ]), [t]);
    const technicalLogs = useMemo(() => ([
        '[INFO] Initializing analyze-engine v2.4...',
        '[NETWORK] Connecting to headfull browser cluster...',
        '[DOM] Analyzing 428 nodes for color frequency...',
        '[IMAGE] Processing full-page screenshot (1920x1080)...',
        '[AI] Injecting multimodal payload into vision-core pipeline...',
        '[STYLE] Extracting computed CSS variables...',
        '[LOGO] Scoring candidates based on prominence...',
        '[CONSENSUS] Running Delta-E clustering algorithm...',
        '[DONE] Brand DNA architecture complete.'
    ]), []);
    const ASSISTANT_PREVIOUS_KIT_KEY = 'brand-kit-assistant-previous-id';
    const { user, isLoaded } = useUser();
    const searchParams = useSearchParams();
    const router = useRouter();
    const {
        activeBrandKit,
        brandKits,
        loading: contextLoading,
        setActiveBrandKit,
        syncActiveBrandKit,
        deleteBrandKitById,
        updateActiveBrandKit,
        reloadBrandKits
    } = useBrandKit();

    const { toast } = useToast();
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [isCancelingAnalysis, setIsCancelingAnalysis] = useState(false);
    const [error, setError] = useState('');
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [loadingScreenshot, setLoadingScreenshot] = useState<string | null>(null);
    const [isSocialUrl, setIsSocialUrl] = useState(false);
    const cancelAnalysisRef = useRef(false);

    const isValidBrandId = (value: unknown): value is string => {
        if (typeof value !== 'string') return false;
        const normalized = value.trim().toLowerCase();
        return normalized.length > 0 && normalized !== 'undefined' && normalized !== 'null';
    };

    // Multi-profile state
    const [showNewKitForm, setShowNewKitForm] = useState(false);
    const [creatingAssistantKit, setCreatingAssistantKit] = useState(false);
    const autoCreateTriggeredRef = useRef(false);
    const emptyStateRepairUserRef = useRef<string | null>(null);
    const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
    const [pendingRegenerateUrl, setPendingRegenerateUrl] = useState('');
    const [assistantLaunchNonce, setAssistantLaunchNonce] = useState(0);
    const [importLaunchNonce, setImportLaunchNonce] = useState(0);
    const [importLaunchBrandId, setImportLaunchBrandId] = useState<string | null>(null);
    const [exportLaunchNonce, setExportLaunchNonce] = useState(0);
    const [exportLaunchBrandId, setExportLaunchBrandId] = useState<string | null>(null);
    const [showDeleteCurrentConfirm, setShowDeleteCurrentConfirm] = useState(false);
    const [isDuplicatingCurrent, setIsDuplicatingCurrent] = useState(false);

    // Brand name editing
    const [isEditingBrandName, setIsEditingBrandName] = useState(false);
    const [brandNameEdit, setBrandNameEdit] = useState('');

    const normalizeUrlForAnalysis = (raw: string): string | null => {
        const value = raw.trim();
        if (!value) return null;
        if (value.toLowerCase().startsWith('manual-')) return null;

        try {
            const withProtocol = value.startsWith('http://') || value.startsWith('https://')
                ? value
                : `https://${value}`;
            return new URL(withProtocol).toString();
        } catch {
            return null;
        }
    };

    // Social media domains that we cannot scan
    const SOCIAL_DOMAINS = [
        'instagram.com', 'facebook.com', 'twitter.com', 'x.com',
        'tiktok.com', 'linkedin.com', 'pinterest.com', 'youtube.com',
        'snapchat.com', 'threads.net', 'wa.me', 'whatsapp.com'
    ];

    // Check if URL is a social media URL
    const checkSocialUrl = (inputUrl: string): boolean => {
        try {
            const urlLower = inputUrl.toLowerCase().trim();
            return SOCIAL_DOMAINS.some(domain =>
                urlLower.includes(domain) || urlLower.includes(domain.replace('.com', ''))
            );
        } catch {
            return false;
        }
    };

    // Handle URL change with social detection
    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newUrl = e.target.value;
        setUrl(newUrl);
        setIsSocialUrl(checkSocialUrl(newUrl));
    };

    // Navigate to manual brand kit creation - creates an empty brand kit
    const handleManualCreation = async () => {
        if (!user?.id) return;

        setLoading(true);
        setError('');

        try {
            // Extract brand name from social URL if available
            let brandName = t('board.namePlaceholder', { defaultValue: 'My Brand' });
            if (url && isSocialUrl) {
                try {
                    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
                    const pathParts = urlObj.pathname.split('/').filter(Boolean);
                    if (pathParts.length > 0) {
                        brandName = pathParts[0].replace(/[_-]/g, ' ');
                        // Capitalize first letter of each word
                        brandName = brandName.split(' ').map(word =>
                            word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ');
                    }
                } catch {
                    // Keep default name
                }
            }

            // Create empty brand kit via API
            const response = await fetch('/api/brand-kit/create-empty', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clerk_user_id: user.id,
                    brand_name: brandName,
                    source_url: isSocialUrl ? url : undefined,
                }),
            });

            const result = await response.json();

            const createdId = result?.data?.id;
            if (result.success && isValidBrandId(createdId)) {
                setShowNewKitForm(false);

                // Wait for Convex propagation
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Navigate to the new brand kit
                window.location.href = `/brand-kit?id=${createdId}`;
            } else {
                setError(result.error || t('toasts.manualCreateError', { defaultValue: 'The manual Brand Kit could not be created.' }));
            }
        } catch (err) {
            console.error('Error creating manual brand kit:', err);
            setError(t('toasts.createError', { defaultValue: 'The Brand Kit could not be created.' }));
        } finally {
            setLoading(false);
        }
    };


    // Efecto para animar progreso y mensajes
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (loading) {
            setProgress(0);
            setLoadingMessageIndex(0);

            interval = setInterval(() => {
                setProgress(prev => {
                    if (prev < 90) return prev + Math.random() * 5;
                    return prev + 0.1;
                });

                setLoadingMessageIndex(prev => {
                    const next = prev + 1;
                    return next < loadingMessages.length ? next : prev;
                });
            }, 2500);
        }
        return () => clearInterval(interval);
    }, [loading, loadingMessages.length]);


    const createAssistantKitAndOpen = useCallback(async (options?: { draft?: boolean }) => {
        if (!user?.id || creatingAssistantKit) return;
        setCreatingAssistantKit(true);
        setError('');
        try {
            const response = await fetch('/api/brand-kit/create-empty', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clerk_user_id: user.id,
                    brand_name: '',
                }),
            });

            const result = await response.json();
            const createdId = result?.data?.id;
            if (result.success && isValidBrandId(createdId)) {
                if (options?.draft && typeof window !== 'undefined' && activeBrandKit?.id) {
                    window.sessionStorage.setItem(ASSISTANT_PREVIOUS_KIT_KEY, activeBrandKit.id);
                }
                const debugParam = searchParams.get('debug') === 'true' ? '&debug=true' : '';
                const draftParam = options?.draft ? '&creation=draft' : '';
                window.location.href = `/brand-kit?id=${createdId}${draftParam}${debugParam}`;
                return;
            }

            setError(result.error || t('toasts.createError', { defaultValue: 'The Brand Kit could not be created.' }));
            setCreatingAssistantKit(false);
        } catch (err) {
            console.error('Error creating assistant brand kit:', err);
            setError(t('toasts.createError', { defaultValue: 'The Brand Kit could not be created.' }));
            setCreatingAssistantKit(false);
        }
    }, [user?.id, creatingAssistantKit, searchParams, activeBrandKit?.id]);

    useEffect(() => {
        emptyStateRepairUserRef.current = null;
        autoCreateTriggeredRef.current = false;
    }, [user?.id]);

    // Handle initial state and query params
    useEffect(() => {
        if (!contextLoading) {
            const action = searchParams.get('action');
            if (action === 'new') {
                void (async () => {
                    let shouldCreateDraft = brandKits.length === 0 && !activeBrandKit;

                    // Verificacion defensiva contra falsos "0 kits" al entrar en produccion.
                    if (user?.id) {
                        try {
                            const serverKits = await getAllUserBrandKits(user.id);
                            const realCount = serverKits.success ? (serverKits.data?.length || 0) : -1;
                            if (realCount > 0) {
                                shouldCreateDraft = false;
                                await reloadBrandKits(true);
                            } else if (realCount === 0) {
                                shouldCreateDraft = true;
                            }
                        } catch (error) {
                            console.error('[ACTION=NEW] Error verificando kits reales, se evita creacion automatica:', error);
                            shouldCreateDraft = false;
                        }
                    }

                    if (shouldCreateDraft) {
                        await createAssistantKitAndOpen({ draft: true });
                    }

                    // Clear the param without refreshing to avoid re-triggering on reload
                    const newParams = new URLSearchParams(searchParams.toString());
                    newParams.delete('action');
                    router.replace(`/brand-kit${newParams.toString() ? `?${newParams.toString()}` : ''}`);
                })();
            } else if (
                brandKits.length === 0 &&
                !activeBrandKit &&
                user?.id &&
                !autoCreateTriggeredRef.current &&
                emptyStateRepairUserRef.current !== user.id
            ) {
                autoCreateTriggeredRef.current = true;
                emptyStateRepairUserRef.current = user.id;
                void (async () => {
                    try {
                        const serverKits = await getAllUserBrandKits(user.id);
                        const realCount = serverKits.success ? (serverKits.data?.length || 0) : -1;

                        // Nunca crear kits automáticamente al entrar.
                        // Si hay kits reales, rehidratamos contexto.
                        if (realCount > 0) {
                            await reloadBrandKits(true);
                        }
                    } catch (error) {
                        console.error('[AUTO-CREATE] Error verificando kits reales:', error);
                    } finally {
                        autoCreateTriggeredRef.current = false;
                    }
                })();
            }
        }
    }, [contextLoading, brandKits, activeBrandKit, user?.id, searchParams, router, createAssistantKitAndOpen, reloadBrandKits]);

    // Si llega un id por query param (ej. tras crear un kit), forzamos seleccion de ese kit.
    useEffect(() => {
        if (contextLoading) return;

        const requestedBrandId = searchParams.get('id');
        if (!isValidBrandId(requestedBrandId)) return;

        if (activeBrandKit?.id === requestedBrandId) {
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('id');
            router.replace(`/brand-kit${newParams.toString() ? `?${newParams.toString()}` : ''}`);
            setShowNewKitForm(false);
            return;
        }

        let cancelled = false;
        const trySelectRequestedBrand = async () => {
            // More attempts + longer window to allow Convex to sync a newly created kit
            const attempts = 20;
            for (let i = 0; i < attempts; i++) {
                if (cancelled) return;
                const ok = await setActiveBrandKit(requestedBrandId, true, false);
                if (ok) return;
                await new Promise(resolve => setTimeout(resolve, 400));
            }
            // Only after exhausting retries: treat as truly orphaned and clean the URL
            if (!cancelled) {
                const newParams = new URLSearchParams(searchParams.toString());
                newParams.delete('id');
                newParams.delete('creation');
                router.replace(`/brand-kit${newParams.toString() ? `?${newParams.toString()}` : ''}`);
            }
        };

        void trySelectRequestedBrand();

        return () => {
            cancelled = true;
        };
    }, [contextLoading, brandKits, activeBrandKit?.id, searchParams, router, setActiveBrandKit]);

    // Fallback cuando analyzeBrandDNA no devuelve id: seleccionar por URL creada.
    useEffect(() => {
        if (contextLoading) return;

        const requestedUrl = searchParams.get('selectUrl');
        if (!requestedUrl) return;

        const decodedUrl = decodeURIComponent(requestedUrl);
        if (activeBrandKit?.url === decodedUrl) {
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('selectUrl');
            router.replace(`/brand-kit${newParams.toString() ? `?${newParams.toString()}` : ''}`);
            setShowNewKitForm(false);
            return;
        }

        const byUrl = brandKits.find((b) => b.url === decodedUrl);
        if (!byUrl?.id) return;

        let cancelled = false;
        const trySelectByUrl = async () => {
            const attempts = 8;
            for (let i = 0; i < attempts; i++) {
                if (cancelled) return;
                const ok = await setActiveBrandKit(byUrl.id, true, false);
                if (ok) return;
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            console.error('Could not select newly created kit de marca by url:', decodedUrl);
        };

        void trySelectByUrl();
        return () => { cancelled = true; };
    }, [contextLoading, brandKits, activeBrandKit?.url, searchParams, router, setActiveBrandKit]);

    // Handle case where active brand kit changes
    useEffect(() => {
        if (activeBrandKit && !searchParams.get('action')) {
            setShowNewKitForm(false);
        }
    }, [activeBrandKit]);

    const hasOtherUnlockedBrandKits = Boolean(
        activeBrandKit?.id && brandKits.some((kit) =>
            kit.id !== activeBrandKit.id && (kit.completeness ?? 0) >= 70
        )
    );

    const handleBrandDelete = async (brandId: string) => {
        try {
            await deleteBrandKitById(brandId);
        } catch (err: any) {
            console.error('Error al eliminar kit de marca:', err);
        }
    };

    const handleBrandNameUpdate = async (newName: string) => {
        if (!activeBrandKit || !newName.trim()) return;

        try {
            const success = await updateActiveBrandKit({ brand_name: newName.trim() });

            if (success) {
                toast({
                    title: t('toasts.nameUpdatedTitle'),
                    description: t('toasts.nameUpdatedDescription'),
                });
            } else {
                toast({
                    title: t('toasts.nameUpdateErrorTitle'),
                    description: t('toasts.nameUpdateErrorDescription'),
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error updating brand name:', error);
            toast({
                title: t('toasts.genericErrorTitle'),
                description: t('toasts.genericErrorDescription'),
                variant: "destructive",
            });
        }
    };

    // Handler para crear nuevo kit
    const handleNewProfile = () => {
        router.push('/brand-kit/new');
    };

    const assistantCreationMode = searchParams.get('creation') === 'draft';

    const handleAbortAssistantCreation = async () => {
        const createdKitIdFromQuery = searchParams.get('id');
        const createdKitId = activeBrandKit?.id || (isValidBrandId(createdKitIdFromQuery) ? createdKitIdFromQuery : null);
        if (createdKitId) {
            await deleteBrandKitById(createdKitId);
        }

        let previousId: string | null = null;
        if (typeof window !== 'undefined') {
            previousId = window.sessionStorage.getItem(ASSISTANT_PREVIOUS_KIT_KEY);
            window.sessionStorage.removeItem(ASSISTANT_PREVIOUS_KIT_KEY);
        }

        if (previousId) {
            const restored = await setActiveBrandKit(previousId, true, true);
            if (!restored) {
                await reloadBrandKits(false);
            }
        }

        const params = new URLSearchParams(searchParams.toString());
        params.delete('creation');
        params.delete('id');
        router.replace(`/brand-kit${params.toString() ? `?${params.toString()}` : ''}`);
    };

    const handleStopAnalysis = useCallback(() => {
        cancelAnalysisRef.current = true;
        setLoading(false);
        setIsCancelingAnalysis(true);
        toast({
            title: t('loading.stopTitle', { defaultValue: 'Analysis stopped' }),
            description: t('loading.stopDescription', { defaultValue: 'The Brand Kit analysis was canceled.' }),
        });
        window.setTimeout(() => setIsCancelingAnalysis(false), 900);
    }, [t, toast]);

    const handleCompleteAssistantCreation = () => {
        if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem(ASSISTANT_PREVIOUS_KIT_KEY);
        }
        const params = new URLSearchParams(searchParams.toString());
        if (params.get('creation') !== 'draft') return;
        params.delete('creation');
        router.replace(`/brand-kit${params.toString() ? `?${params.toString()}` : ''}`);
    };

    const handleOpenAssistant = () => {
        if (!activeBrandKit) return;
        setAssistantLaunchNonce((prev) => prev + 1);
    };

    const handleOpenImport = () => {
        if (!activeBrandKit?.id) return;
        setImportLaunchBrandId(activeBrandKit.id);
        setImportLaunchNonce((prev) => prev + 1);
    };

    const handleOpenExport = () => {
        if (!activeBrandKit?.id) return;
        setExportLaunchBrandId(activeBrandKit.id);
        setExportLaunchNonce((prev) => prev + 1);
    };

    const handleDeleteCurrentBrandKit = async () => {
        if (!activeBrandKit?.id) return;
        await handleBrandDelete(activeBrandKit.id);
        setShowDeleteCurrentConfirm(false);
    };

    const handleDuplicateCurrentBrandKit = async () => {
        if (!activeBrandKit || !user?.id || isDuplicatingCurrent) return;

        setIsDuplicatingCurrent(true);
        try {
            const duplicateNameBase = (activeBrandKit.brand_name || t('board.namePlaceholder', { defaultValue: 'My Brand' })).trim();
            const duplicateName = duplicateNameBase.toLowerCase().includes('copia')
                ? duplicateNameBase
                : `${duplicateNameBase} (copia)`;

            const createResponse = await fetch('/api/brand-kit/create-empty', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clerk_user_id: user.id,
                    brand_name: duplicateName,
                    source_url: activeBrandKit.url || undefined,
                }),
            });

            const createResult = await createResponse.json();
            const createdId = createResult?.data?.id as string | undefined;
            if (!createResult?.success || !isValidBrandId(createdId)) {
                throw new Error(createResult?.error || t('toasts.duplicateCreateError', { defaultValue: 'The kit copy could not be created.' }));
            }

            const duplicatedPayload: BrandDNA = {
                ...activeBrandKit,
                id: createdId,
                brand_name: duplicateName,
            };

            const saveResult = await updateUserBrandKit(createdId, duplicatedPayload);
            if (!saveResult.success) {
                throw new Error(saveResult.error || t('toasts.duplicateSaveError', { defaultValue: 'The kit copy could not be saved.' }));
            }

            await reloadBrandKits(false);
            await setActiveBrandKit(createdId, true, false);

            toast({
                title: t('toasts.duplicatedTitle'),
                    description: t('toasts.duplicateCreatedDescription', { name: duplicateName, defaultValue: '"{{name}}" was created.' }),
            });
        } catch (error) {
            console.error('Error duplicating brand kit:', error);
            toast({
                title: t('toasts.duplicateErrorTitle'),
                description: error instanceof Error ? error.message : t('toasts.duplicateErrorDescription'),
                variant: "destructive",
            });
        } finally {
            setIsDuplicatingCurrent(false);
        }
    };

    const assistantHeaderAction = activeBrandKit ? (
        <div className="flex flex-wrap items-center gap-2.5">
            <Button
                variant="outline"
                size="sm"
                className={cn(BRAND_KIT_SECONDARY_BUTTON_CLASS, "gap-2")}
                onClick={handleOpenAssistant}
            >
                <IconListChecks className="w-4 h-4" />
                Abrir asistente
            </Button>
            <Button
                variant="outline"
                size="sm"
                className={cn(BRAND_KIT_SECONDARY_BUTTON_CLASS, "gap-2")}
                onClick={() => void handleDuplicateCurrentBrandKit()}
                disabled={isDuplicatingCurrent}
            >
                {isDuplicatingCurrent ? <Loader2 className="w-4 h-4" /> : <IconCopy className="w-4 h-4" />}
                Duplicar kit actual
            </Button>
            <Button
                variant="outline"
                size="sm"
                className={cn(BRAND_KIT_SECONDARY_BUTTON_CLASS, "gap-2")}
                onClick={handleOpenImport}
            >
                <IconUpload className="w-4 h-4" />
                Importar
            </Button>
            <Button
                variant="outline"
                size="sm"
                className={cn(BRAND_KIT_SECONDARY_BUTTON_CLASS, "gap-2")}
                onClick={handleOpenExport}
            >
                <IconDownload className="w-4 h-4" />
                Exportar
            </Button>
            <Button
                variant="outline"
                size="sm"
                className={cn(BRAND_KIT_SECONDARY_BUTTON_CLASS, "gap-2 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive")}
                onClick={() => setShowDeleteCurrentConfirm(true)}
            >
                <IconDelete className="w-4 h-4" />
                Borrar kit actual
            </Button>
        </div>
    ) : null;

    const runRegenerateAnalysis = async (
        urlOverride?: string,
        options?: { useGlobalLoading?: boolean; showSuccessToast?: boolean }
    ): Promise<{ success: boolean; error?: string }> => {
        const useGlobalLoading = options?.useGlobalLoading !== false;
        const showSuccessToast = options?.showSuccessToast !== false;
        const targetUrl =
            normalizeUrlForAnalysis(urlOverride || '')
            || normalizeUrlForAnalysis(pendingRegenerateUrl)
            || normalizeUrlForAnalysis(url)
            || normalizeUrlForAnalysis(activeBrandKit?.url || '');

        if (!targetUrl || !user?.id) {
            console.warn('Cannot regenerate: no URL found', {
                pendingRegenerateUrl,
                url,
                activeBrandKitUrl: activeBrandKit?.url
            });
            const message = t('hero.validUrlRequired', { defaultValue: 'Enter a valid URL in the Brand Kit website field to analyze it.' });
            setError(message);
            toast({
                title: t('toasts.invalidUrlTitle'),
                description: message,
                variant: "destructive",
            });
            return { success: false, error: message };
        }

        if (useGlobalLoading) setLoading(true);
        cancelAnalysisRef.current = false;
        setIsCancelingAnalysis(false);
        setError('');
        if (useGlobalLoading) setLoadingScreenshot(null);

        try {
            const response = await analyzeBrandDNA(targetUrl, true, user.id);

            if (cancelAnalysisRef.current) {
                return { success: false, error: t('loading.stopDescription', { defaultValue: 'The Brand Kit analysis was canceled.' }) };
            }

            if (response.success && response.data) {
                setShowNewKitForm(false);
                const analyzedBrandId = response.data?.id;
                // Actualizacion inmediata en memoria para que el asistente vea logos/colores
                // sin depender de la latencia de recarga.
                syncActiveBrandKit(response.data as BrandDNA);

                // CRITICAL: Force reload to show updated data
                await new Promise(resolve => setTimeout(resolve, 500));
                await reloadBrandKits();

                // Re-set active brand with priority:
                // 1) Brand returned by analysis
                // 2) Previously active brand
                const nextActiveId = isValidBrandId(analyzedBrandId)
                    ? analyzedBrandId
                    : activeBrandKit?.id;

                if (nextActiveId) {
                    await setActiveBrandKit(nextActiveId, true, false);
                }

                if (showSuccessToast) {
                    toast({
                        title: t('toasts.regeneratedTitle'),
                        description: t('toasts.regeneratedDescription'),
                    });
                }
                return { success: true };
            } else {
                const message = response.error || t('toasts.regenerateErrorDescription', { defaultValue: 'The Brand Kit could not be regenerated.' });
                setError(message);
                return { success: false, error: message };
            }
        } catch (err) {
            console.error('Unexpected error during regenerate:', err);
                const message = t('toasts.regenerateUnexpectedError', { defaultValue: 'An unexpected error occurred while regenerating.' });
            setError(message);
            return { success: false, error: message };
        } finally {
            if (useGlobalLoading) {
                setLoading(false);
                setLoadingScreenshot(null);
            }
        }
    };

    const handleRegenerate = async () => {
        setShowRegenerateConfirm(false);
        await runRegenerateAnalysis(undefined, { useGlobalLoading: true, showSuccessToast: true });
    };

    const handleAnalyzeFromAssistant = async (urlOverride?: string) => {
        const result = await runRegenerateAnalysis(urlOverride, { useGlobalLoading: false, showSuccessToast: false });
        if (!result.success) {
            throw new Error(result.error || t('wizard.errors.analyzeUrl', { defaultValue: 'We could not analyze the website. Check the URL and try again.' }));
        }
    };

    const handlePreviewFromAssistant = async (inputUrl: string) => {
        const response = await previewBrandUrl(inputUrl);
        if (!response.success) {
            return {
                success: false,
                url: inputUrl,
                error: response.error,
            };
        }

        return {
            success: true,
            url: response.data.url,
            title: response.data.title,
            screenshotUrl: response.data.screenshotUrl,
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url || !user?.id) return;

        setLoading(true);
        cancelAnalysisRef.current = false;
        setIsCancelingAnalysis(false);
        setError('');
        setLoadingScreenshot(null);

        try {
            const response = await analyzeBrandDNA(url, true, user.id);
            if (cancelAnalysisRef.current) {
                return;
            }
            const createdId = response?.data?.id;

            if (response.success && response.data) {
                console.log('[NEW BRAND KIT] Analysis completed:', { id: createdId, url: response.data.url });

                // Hide form immediately
                setShowNewKitForm(false);

                // CRITICAL: Wait for Convex to propagate
                console.log('[NEW BRAND KIT] Waiting 2 seconds for Convex propagation...');
                await new Promise(resolve => setTimeout(resolve, 2000));

                // FORCE NAVIGATION to the new brand kit using URL parameter
                if (!isValidBrandId(createdId) && !response.data.url) {
                    setError(t('toasts.identifyCreatedError', { defaultValue: 'The newly created Brand Kit could not be identified.' }));
                    return;
                }
                const targetParam = isValidBrandId(createdId)
                    ? `id=${createdId}`
                    : `selectUrl=${encodeURIComponent(response.data.url)}`;
                console.log('[NEW BRAND KIT] Forcing navigation param:', targetParam);
                const debugParam = searchParams.get('debug') === 'true' ? '&debug=true' : '';
                window.location.href = `/brand-kit?${targetParam}${debugParam}`;

                toast({
                    title: t('toasts.createdTitle'),
                    description: t('loading.creatingDescription'),
                });
            } else {
                setError(response.error || t('toasts.createError', { defaultValue: 'The Brand Kit could not be created.' }));
            }
        } catch (err) {
            console.error('Unexpected error during submit:', err);
            setError(t('toasts.unexpectedError', { defaultValue: 'An unexpected error occurred.' }));
        } finally {
            setLoading(false);
        }
    };

    if (!isLoaded || contextLoading) {
        return (
            <DashboardLayout
                brands={brandKits}
                currentBrand={activeBrandKit}
                onBrandChange={setActiveBrandKit}
                onBrandDelete={deleteBrandKitById}
                onNewBrandKit={handleNewProfile}
            >
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center animate-in fade-in zoom-in duration-500">
                        <Loader2 className="w-8 h-8 text-[var(--accent)] mx-auto" />
                        <p className="text-[var(--text-secondary)] mt-4 text-sm font-medium">{t('loading.kits')}</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            brands={brandKits}
            currentBrand={activeBrandKit}
            onBrandChange={setActiveBrandKit}
            onBrandDelete={deleteBrandKitById}
            onNewBrandKit={handleNewProfile}
            isFixed={false}
            contentContainerVariant="plain"
            headerVariant="bar"
        >
            <main className="w-full max-w-[1400px] mx-auto relative pt-0 sm:pt-4 md:pt-[24px] px-4 sm:px-6 lg:px-10 pb-32">

                {creatingAssistantKit && (
                    <div className="max-w-2xl mx-auto py-20 text-center">
                        <div className="bg-white border border-border shadow-sm rounded-3xl p-10 space-y-4">
                            <Loader2 className="w-8 h-8 text-primary mx-auto" />
                            <h2 className="text-2xl font-bold">{t('loading.preparingTitle')}</h2>
                            <p className="text-muted-foreground">
                                {t('loading.preparingDescription')}
                            </p>
                        </div>
                    </div>
                )}

                {/* Si no tiene Brand Kits o está creando uno nuevo */}
                {false && ((brandKits.length === 0 || showNewKitForm) && !loading) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="max-w-3xl mx-auto text-center py-12"
                    >
                        <div className="bg-white border border-border shadow-sm p-10 mb-8 rounded-3xl relative overflow-hidden">
                            {/* Decorative elements */}
                            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -z-10" />
                            <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-accent/10 to-transparent rounded-full blur-3xl -z-10" />

                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className="mb-6"
                            >
                                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg">
                                    <IconSparkles className="w-10 h-10 text-primary-foreground" />
                                </div>
                            </motion.div>

                            <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                                {brandKits.length === 0
                                    ? t('hero.welcomeTitle', { defaultValue: 'Welcome to X Imagen' })
                                    : t('hero.createTitle', { defaultValue: 'Create a new brand kit' })}
                            </h2>
                            <p className="text-muted-foreground mb-8 max-w-lg mx-auto text-lg">
                                {brandKits.length === 0
                                    ? t('hero.welcomeDescription', { defaultValue: 'Your brand kit is the foundation for getting consistent results in Image, Carousel, and Video.' })
                                    : t('hero.createDescription', { defaultValue: 'Before generating content, spend a few minutes building a complete and coherent brand kit.' })}
                            </p>
                            <p className="text-muted-foreground/90 mb-8 max-w-2xl mx-auto text-sm leading-relaxed">
                                {t('hero.helper', { defaultValue: 'The better defined your brand kit is, the better every creation module will perform.' })}
                            </p>

                            {/* URL Input */}
                            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
                                <div className={cn(
                                    "flex items-center gap-3 bg-white rounded-2xl border-2 p-2 shadow-lg transition-all focus-within:shadow-xl hover:shadow-lg group",
                                    isSocialUrl ? "border-amber-500/50" : "border-border/50 focus-within:border-primary/50"
                                )}>
                                    <div className="pl-4">
                                        <IconGlobe className={cn(
                                            "w-6 h-6 transition-colors",
                                            isSocialUrl ? "text-amber-500" : "text-muted-foreground group-focus-within:text-primary"
                                        )} />
                                    </div>
                                    <Input
                                        placeholder={t('hero.urlPlaceholder', { defaultValue: 'example.com or https://example.com' })}
                                        className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-lg h-14 placeholder:text-muted-foreground/40 font-medium"
                                        value={url}
                                        onChange={handleUrlChange}
                                        disabled={loading}
                                        autoFocus
                                    />
                                    <Button
                                        type="submit"
                                        disabled={loading || !url || isSocialUrl}
                                        size="lg"
                                        className="btn-gradient rounded-xl px-8 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mr-1"
                                    >
                                {loading ? (
                                            <Loader2 className="w-5 h-5" />
                                        ) : (
                                            <>
                                                <IconSparkles className="w-5 h-5 mr-2" />
                                                {t('hero.analyze', { defaultValue: 'Analyze' })}
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {/* Social URL Warning */}
                                {isSocialUrl && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-600"
                                    >
                                        <p className="text-sm font-medium mb-2">
                                            {t('hero.socialWarningTitle', { defaultValue: 'Social media URLs cannot be analyzed automatically' })}
                                        </p>
                                        <p className="text-xs text-amber-600/80 mb-3">
                                            {t('hero.socialWarningDescription', { defaultValue: 'Instagram, Facebook, TikTok and other social URLs do not allow automatic style extraction.' })}
                                        </p>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleManualCreation}
                                            className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                                        >
                                            <IconEdit className="w-4 h-4 mr-2" />
                                            {t('hero.buildManually', { defaultValue: 'Build the Brand Kit manually' })}
                                        </Button>
                                    </motion.div>
                                )}
                            </form>

                            {/* Manual creation link */}
                            <p className="text-center text-sm text-muted-foreground mt-6">
                                <button
                                    type="button"
                                    onClick={handleManualCreation}
                                    className="underline underline-offset-4 hover:text-foreground transition-colors"
                                >
                                    {t('hero.noWebsite', { defaultValue: 'I do not have a website, I will build my brand kit manually' })}
                                </button>
                            </p>

                            {/* Cancel button when creating new (and has existing profiles) */}
                            {brandKits.length > 0 && showNewKitForm && (
                                <Button
                                    variant="ghost"
                                    size="lg"
                                    className="mt-4 text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() => {
                                        setShowNewKitForm(false);
                                        setUrl('');
                                    }}
                                >
                                    <IconClose className="w-4 h-4 mr-2" />
                                    {t('common:actions.cancel', { defaultValue: 'Cancel' })}
                                </Button>
                            )}
                        </div>

                        {error && (
                            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm flex items-center justify-center gap-2 animate-in slide-in-from-bottom-2">
                                <IconTriangleAlert className="w-4 h-4" />
                                {error}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* TECH-FOCUSED Full-Screen Loading Animation */}
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-hidden"
                    >
                        {/* Animated Background Gradient Orbs - MUCH BRIGHTER */}
                        <motion.div
                            className="absolute w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/50 via-accent/40 to-transparent blur-3xl"
                            animate={{
                                x: [-200, 200, -200],
                                y: [-100, 100, -100],
                                scale: [1, 1.3, 1],
                            }}
                            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                            style={{ top: '5%', left: '5%' }}
                        />
                        <motion.div
                            className="absolute w-[700px] h-[700px] rounded-full bg-gradient-to-br from-accent/50 via-primary/40 to-transparent blur-3xl"
                            animate={{
                                x: [200, -200, 200],
                                y: [100, -100, 100],
                                scale: [1.3, 1, 1.3],
                            }}
                            transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
                            style={{ bottom: '5%', right: '5%' }}
                        />

                        {/* Floating Particles Grid - MUCH BIGGER AND BRIGHTER */}
                        <div className="absolute inset-0">
                            {[...Array(30)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-4 h-4 rounded-full shadow-lg"
                                    style={{
                                        left: `${(i % 6) * 20}%`,
                                        top: `${Math.floor(i / 6) * 20}%`,
                                        background: i % 2 === 0 ? 'var(--primary)' : 'var(--accent)',
                                        boxShadow: i % 2 === 0 ? '0 0 20px var(--primary)' : '0 0 20px var(--accent)',
                                    }}
                                    animate={{
                                        y: [0, -40, 0],
                                        opacity: [0.4, 1, 0.4],
                                        scale: [1, 2, 1],
                                    }}
                                    transition={{
                                        duration: 2 + (i % 2),
                                        repeat: Infinity,
                                        delay: i * 0.08,
                                        ease: "easeInOut"
                                    }}
                                />
                            ))}
                        </div>

                        {/* Animated Waves - MUCH BRIGHTER */}
                        {[...Array(5)].map((_, i) => (
                            <motion.div
                                key={`wave-${i}`}
                                className="absolute inset-x-0 h-1"
                                style={{
                                    top: `${20 + i * 15}%`,
                                    background: `linear-gradient(90deg, transparent, var(--accent), transparent)`,
                                    boxShadow: '0 0 20px var(--accent)',
                                }}
                                animate={{
                                    opacity: [0, 0.8, 0],
                                    scaleX: [0, 1, 0],
                                }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    delay: i * 0.6,
                                    ease: "easeInOut"
                                }}
                            />
                        ))}

                        {/* Vertical Scan Lines */}
                        {[...Array(4)].map((_, i) => (
                            <motion.div
                                key={`vscan-${i}`}
                                className="absolute inset-y-0 w-px"
                                style={{
                                    left: `${25 * (i + 1)}%`,
                                    background: 'var(--primary)',
                                    boxShadow: '0 0 10px var(--primary)',
                                }}
                                animate={{
                                    opacity: [0.2, 0.6, 0.2],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    delay: i * 0.5,
                                }}
                            />
                        ))}

                        {/* Central Content */}
                        <div className="relative z-10 max-w-2xl w-full mx-auto px-6 text-center">
                            {/* Main Progress Circle */}
                            <div className="relative mb-16">
                                {/* Outer rotating ring - BRIGHTER */}
                                <motion.div
                                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full border-4 border-primary/40"
                                    style={{ boxShadow: '0 0 30px var(--primary)' }}
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                                />

                                {/* Inner rotating ring (opposite direction) - BRIGHTER */}
                                <motion.div
                                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full border-4 border-accent/40"
                                    style={{ boxShadow: '0 0 25px var(--accent)' }}
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                />

                                {/* Progress SVG */}
                                <div className="relative mx-auto w-36 h-36">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                        <circle
                                            className="text-muted/10 stroke-current"
                                            strokeWidth="6"
                                            fill="transparent"
                                            r="44"
                                            cx="50"
                                            cy="50"
                                        />
                                        <motion.circle
                                            className="text-primary stroke-current"
                                            strokeWidth="6"
                                            strokeLinecap="round"
                                            fill="transparent"
                                            r="44"
                                            cx="50"
                                            cy="50"
                                            initial={{ strokeDasharray: "276", strokeDashoffset: "276" }}
                                            animate={{ strokeDashoffset: 276 - (progress / 100) * 276 }}
                                            transition={{ duration: 0.5, ease: "easeOut" }}
                                            style={{ filter: "drop-shadow(0 0 12px var(--primary))" }}
                                        />
                                    </svg>

                                    {/* Percentage */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <motion.span
                                            key={Math.floor(progress / 10)}
                                            initial={{ y: 10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            className="text-4xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent"
                                        >
                                            {Math.round(progress)}%
                                        </motion.span>
                                    </div>
                                </div>

                                {/* Orbiting dots */}
                                {[...Array(8)].map((_, i) => (
                                    <motion.div
                                        key={`orbit-${i}`}
                                        className="absolute w-3 h-3 rounded-full"
                                        style={{
                                            background: i % 2 === 0 ? 'var(--primary)' : 'var(--accent)',
                                            left: '50%',
                                            top: '50%',
                                            marginLeft: '-6px',
                                            marginTop: '-6px',
                                        }}
                                        animate={{
                                            x: [
                                                Math.cos(i * 45 * (Math.PI / 180)) * 100,
                                                Math.cos((i * 45 + 360) * (Math.PI / 180)) * 100
                                            ],
                                            y: [
                                                Math.sin(i * 45 * (Math.PI / 180)) * 100,
                                                Math.sin((i * 45 + 360) * (Math.PI / 180)) * 100
                                            ],
                                            opacity: [0.3, 1, 0.3],
                                            scale: [0.8, 1.2, 0.8],
                                        }}
                                        transition={{
                                            duration: 4,
                                            repeat: Infinity,
                                            delay: i * 0.5,
                                            ease: "linear"
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Status Text */}
                            <motion.div
                                className="space-y-6"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <motion.h3
                                    key={Math.floor(progress / 20)}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-3xl font-bold text-foreground"
                                >
                                    {progress < 20 && t('loadingStages.analyzingStructure', { defaultValue: 'Analyzing site structure...' })}
                                    {progress >= 20 && progress < 40 && t('loadingStages.connectingEngine', { defaultValue: 'Connecting to the visual engine...' })}
                                    {progress >= 40 && progress < 60 && t('loadingStages.extractingDna', { defaultValue: 'Extracting brand DNA...' })}
                                    {progress >= 60 && progress < 80 && t('loadingStages.processingAssets', { defaultValue: 'Processing visual assets...' })}
                                    {progress >= 80 && progress < 95 && t('loadingStages.generatingPalettes', { defaultValue: 'Generating design palettes...' })}
                                    {progress >= 95 && t('loadingStages.finishing', { defaultValue: 'Finalizing the Brand Kit...' })}
                                </motion.h3>

                                {/* Technical Log */}
                                <div className="max-w-lg mx-auto h-40 overflow-hidden relative">
                                    <motion.div
                                        animate={{ y: [0, -250] }}
                                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                        className="space-y-2"
                                    >
                                        {[...technicalLogs, ...technicalLogs, ...technicalLogs].map((log, i) => (
                                            <div key={i} className="flex items-center gap-2 text-muted-foreground/40 text-sm font-mono">
                                                <span className="text-primary/40">▸</span>
                                                <span className="truncate">{log}</span>
                                            </div>
                                        ))}
                                    </motion.div>
                                </div>

                                {/* Animated dots */}
                                <div className="flex justify-center gap-2">
                                    {[0, 1, 2].map((i) => (
                                        <motion.div
                                            key={i}
                                            className="w-2 h-2 rounded-full bg-primary"
                                            animate={{
                                                opacity: [0.3, 1, 0.3],
                                                scale: [1, 1.3, 1]
                                            }}
                                            transition={{
                                                duration: 1.5,
                                                repeat: Infinity,
                                                delay: i * 0.2
                                            }}
                                        />
                                    ))}
                                </div>

                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="h-10 w-10 text-primary" />
                                    <button
                                        type="button"
                                        onClick={handleStopAnalysis}
                                        className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        {isCancelingAnalysis
                                            ? t('loading.canceling', { defaultValue: 'Canceling...' })
                                            : t('loading.stop', { defaultValue: 'Stop' })}
                                    </button>
                                </div>

                                {/* Engine info */}
                                <motion.p
                                    className="text-sm text-muted-foreground/40 font-medium"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                >
                                    FIRE-SC Engine v4.0 · Vision-Core Runtime · Headless-Chromium
                                </motion.p>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
                {/* Result State */}
                {!loading && activeBrandKit && !showNewKitForm && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
                        {/* Brand Kit Progress */}
                        <BrandKitProgress brandKit={activeBrandKit} subtle className="mb-8" />

                        <BrandDNABoard
                            key={activeBrandKit.id || 'new'}
                            data={activeBrandKit}
                            allowAssistantExit={hasOtherUnlockedBrandKits}
                            assistantCreationMode={assistantCreationMode}
                            assistantLaunchNonce={assistantLaunchNonce}
                            importLaunchNonce={importLaunchNonce}
                            importLaunchBrandId={importLaunchBrandId}
                            exportLaunchNonce={exportLaunchNonce}
                            exportLaunchBrandId={exportLaunchBrandId}
                            onConsumeImportLaunch={() => {
                                setImportLaunchNonce(0);
                                setImportLaunchBrandId(null);
                            }}
                            onConsumeExportLaunch={() => {
                                setExportLaunchNonce(0);
                                setExportLaunchBrandId(null);
                            }}
                            onAbortAssistantCreation={handleAbortAssistantCreation}
                            onCompleteAssistantCreation={handleCompleteAssistantCreation}
                            isDebug={searchParams.get('debug') === 'true'}
                            onRegenerate={(urlOverride) => {
                                setPendingRegenerateUrl(urlOverride || '');
                                setShowRegenerateConfirm(true);
                            }}
                            onAnalyzeUrlFromAssistant={handleAnalyzeFromAssistant}
                            onStopAnalyzeUrlFromAssistant={handleStopAnalysis}
                            onPreviewUrlFromAssistant={handlePreviewFromAssistant}
                            onNewBrandKit={handleNewProfile}
                            onSaveSuccess={reloadBrandKits}
                            onDeleteCurrent={() => setShowDeleteCurrentConfirm(true)}
                        />
                    </div>
                )}

                {/* AlertDialog de Confirmación de Regeneración - REDESIGNED */}
                <AlertDialog
                    open={showRegenerateConfirm}
                    onOpenChange={(open) => {
                        setShowRegenerateConfirm(open);
                        if (!open) setPendingRegenerateUrl('');
                    }}
                >
                    <AlertDialogContent className={cn(BRAND_KIT_MODAL_CLASS, "max-w-md gap-0 overflow-hidden")}>
                        <div className="p-6 pb-2">
                            <AlertDialogHeader className={BRAND_KIT_MODAL_HEADER_CLASS}>
                                <AlertDialogTitle className={cn(BRAND_KIT_MODAL_TITLE_CLASS, "flex items-center gap-3 text-foreground")}>
                                    <div className="p-2.5 rounded-full bg-amber-500/10 text-amber-500">
                                        <IconTriangleAlert className="w-6 h-6 animate-pulse" />
                                    </div>
                                    {t('dialogs.regenerateTitle', { defaultValue: 'Regenerate brand kit' })}
                                </AlertDialogTitle>
                                <AlertDialogDescription className={cn(BRAND_KIT_MODAL_DESCRIPTION_CLASS, "pt-4")}>
                                    {t('dialogs.regenerateDescriptionBefore', { defaultValue: 'This action will analyze the website ' })}
                                    <span className='font-semibold text-foreground'>{normalizeUrlForAnalysis(pendingRegenerateUrl) || normalizeUrlForAnalysis(activeBrandKit?.url || '') || t('dialogs.invalidUrl', { defaultValue: 'without a valid URL' })}</span>
                                    {t('dialogs.regenerateDescriptionAfter', { defaultValue: ' again from scratch.' })}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                        </div>

                        <div className="px-6 py-4">
                            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 flex gap-3">
                                <IconTriangleAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-500/90 font-medium">
                                    {t('dialogs.regenerateWarning', { defaultValue: 'Warning: all the manual changes you made in this profile will be permanently lost.' })}
                                </p>
                            </div>
                        </div>

                        <AlertDialogFooter className={cn(BRAND_KIT_MODAL_FOOTER_CLASS, "border-t border-border flex-row gap-3 sm:space-x-0")}>
                            <AlertDialogCancel className={cn(BRAND_KIT_SECONDARY_BUTTON_CLASS, "mt-0 border-border hover:bg-accent hover:text-accent-foreground text-foreground transition-all active:scale-95")}>
                                {t('common:actions.cancel', { defaultValue: 'Cancel' })}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleRegenerate}
                                className={cn(BRAND_KIT_SECONDARY_BUTTON_CLASS, "shadow-lg transition-all active:scale-95")}
                            >
                                <IconRefresh className="w-4 h-4 mr-2" />
                                {t('dialogs.regenerateConfirm', { defaultValue: 'Yes, regenerate now' })}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={showDeleteCurrentConfirm} onOpenChange={setShowDeleteCurrentConfirm}>
                    <AlertDialogContent className={cn(BRAND_KIT_MODAL_CLASS, "!w-[min(92vw,40rem)] !max-w-[40rem] sm:!max-w-[40rem] gap-0 overflow-hidden rounded-[1.9rem] p-0")}>
                        <div className="px-8 pb-4 pt-8">
                        <AlertDialogHeader className={cn(BRAND_KIT_MODAL_HEADER_CLASS, "px-0 pb-0 pt-0 text-left")}>
                            <AlertDialogTitle className={cn(BRAND_KIT_MODAL_TITLE_CLASS, "flex items-center gap-3 text-destructive text-[clamp(1.2rem,1.1rem+0.2vw,1.34rem)]")}>
                                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                                    <IconDelete className="w-5 h-5" />
                                </span>
                                {t('dialogs.deleteCurrentTitle', { defaultValue: 'Delete current brand kit' })}
                            </AlertDialogTitle>
                            <AlertDialogDescription className={cn(BRAND_KIT_MODAL_DESCRIPTION_CLASS, "pt-4 text-[1rem] leading-relaxed")}>
                                {t('dialogs.deleteCurrentBefore', { defaultValue: 'The following will be deleted: ' })}
                                <span className="font-semibold text-foreground">{activeBrandKit?.brand_name || t('dialogs.thisKit', { defaultValue: 'this kit' })}</span>
                                {t('dialogs.deleteCurrentAfter', { defaultValue: ' and this action cannot be undone.' })}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        </div>
                        <div className="px-8 pb-5">
                            <div className="rounded-[1.15rem] border border-destructive/15 bg-destructive/[0.04] px-4 py-3 text-sm text-muted-foreground">
                                {t('dialogs.deleteCurrentWarning', { defaultValue: 'Esta acción eliminará también sus activos asociados dentro del kit actual.' })}
                            </div>
                        </div>
                        <AlertDialogFooter className={cn(BRAND_KIT_MODAL_FOOTER_CLASS, "mx-0 mb-0 rounded-none border-0 bg-transparent px-8 pb-8 pt-1")}>
                            <AlertDialogCancel className={cn(BRAND_KIT_SECONDARY_BUTTON_CLASS, "mt-0")}>{t('common:actions.cancel', { defaultValue: 'Cancel' })}</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteCurrentBrandKit}
                                className={cn(BRAND_KIT_SECONDARY_BUTTON_CLASS, "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-none")}
                            >
                                {t('dialogs.deleteCurrentConfirm', { defaultValue: 'Delete kit' })}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </main>
        </DashboardLayout >
    );
}

export default function BrandKitPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 text-primary" />
            </div>
        }>
            <BrandKitPageContent />
        </Suspense>
    );
}




