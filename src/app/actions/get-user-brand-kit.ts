'use server';

import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import { authedFetchQuery, authedFetchMutation } from '@/lib/convex-server';
import type { BrandDNA, BrandKitSummary } from '@/lib/brand-types';
import { auth } from '@clerk/nextjs/server';
import type { Id } from '../../../convex/_generated/dataModel';

function calculateCompletenessFromRawBrand(brand: any): number {
    let score = 0;

    if ((brand.brand_name || '').trim().length > 0) score += 10;
    if ((brand.tagline || '').trim().length > 0) score += 10;
    const businessOverviewLen =
        typeof brand.business_overview_length === 'number'
            ? brand.business_overview_length
            : (brand.business_overview || '').trim().length;
    const colorsCount =
        typeof brand.colors_count === 'number'
            ? brand.colors_count
            : (Array.isArray(brand.colors) ? brand.colors.length : 0);
    const logosCount =
        typeof brand.logos_count === 'number'
            ? brand.logos_count
            : (Array.isArray(brand.logos) ? brand.logos.length : (brand.logo_url ? 1 : 0));
    const fontsCount =
        typeof brand.fonts_count === 'number'
            ? brand.fonts_count
            : (Array.isArray(brand.fonts) ? brand.fonts.length : 0);
    const imagesCount =
        typeof brand.images_count === 'number'
            ? brand.images_count
            : (Array.isArray(brand.images) ? brand.images.length : 0);
    const brandValuesCount =
        typeof brand.brand_values_count === 'number'
            ? brand.brand_values_count
            : (Array.isArray(brand.brand_values) ? brand.brand_values.length : 0);
    const toneCount =
        typeof brand.tone_of_voice_count === 'number'
            ? brand.tone_of_voice_count
            : (Array.isArray(brand.tone_of_voice) ? brand.tone_of_voice.length : 0);

    if (businessOverviewLen > 20) score += 10;
    if (colorsCount >= 3) score += 15;
    if (logosCount >= 1 || Boolean(brand.logo_url)) score += 15;
    if (fontsCount >= 1) score += 10;
    if (imagesCount >= 1) score += 10;
    if (brandValuesCount >= 1) score += 5;
    if (toneCount >= 1) score += 5;

    const textAssets = brand.text_assets;
    const hasTextAssets =
        Boolean(brand.has_text_assets) ||
        (Boolean(textAssets) &&
        (
            (Array.isArray(textAssets?.marketing_hooks) && textAssets.marketing_hooks.length > 0) ||
            (Array.isArray(textAssets?.ctas) && textAssets.ctas.length > 0) ||
            ((textAssets?.brand_context || '').trim().length > 0)
        ));
    if (hasTextAssets) score += 10;

    return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Normaliza el array de imágenes para asegurar que siempre sea un array de objetos con url y selected.
 */
function normalizeImages(images: any[]): { url: string; selected?: boolean }[] {
    if (!images) return [];

    const extractUrl = (item: any): { url: string; selected: boolean } => {
        if (!item) return { url: '', selected: true };

        // If it's a string, try to parse it (it might be double-stringified JSON)
        if (typeof item === 'string') {
            if (item.trim().startsWith('{')) {
                try {
                    const parsed = JSON.parse(item);
                    return extractUrl(parsed);
                } catch (e) {
                    return { url: item, selected: true };
                }
            }
            return { url: item, selected: true };
        }

        // If it's an object
        if (typeof item === 'object') {
            // Recursively extract URL from the 'url' property in case it's also stringified JSON
            const nested = extractUrl(item.url);
            return {
                url: nested.url,
                selected: item.selected !== undefined ? !!item.selected : nested.selected
            };
        }

        return { url: String(item), selected: true };
    };

    return images.map(img => extractUrl(img));
}

/**
 * Obtiene TODOS los Brand Kits de un usuario (resumidos para el switcher)
 */
export async function getAllUserBrandKits(clerkUserId: string): Promise<{
    success: boolean;
    data?: BrandKitSummary[];
    error?: string;
}> {
    try {
        const { userId } = await auth();
        if (!userId || userId !== clerkUserId) {
            return { success: false, error: 'No autorizado' };
        }

        const brands = await authedFetchQuery(api.brands.listSummariesByClerkId, { clerk_user_id: userId });

        // Client-side sort by updated_at desc since we can't easily index sort in Convex yet
        const sortedBrands = (brands || []).sort((a: any, b: any) => {
            const dateA = new Date(a.updated_at).getTime();
            const dateB = new Date(b.updated_at).getTime();
            return dateB - dateA;
        });

        // Map to summary
        const summaryData: BrandKitSummary[] = sortedBrands.map((b: any) => ({
            id: b._id,
            brand_name: b.brand_name,
            url: b.url,
            logo_url: b.logo_url || null,
            favicon_url: b.favicon_url || null,
            screenshot_url: b.screenshot_url || null,
            completeness: calculateCompletenessFromRawBrand(b),
            updated_at: b.updated_at
        }));

        return { success: true, data: summaryData };
    } catch (err) {
        console.error('Unexpected error in getAllUserBrandKits:', err);
        return { success: false, error: 'Error inesperado' };
    }
}

/**
 * Obtiene un Brand Kit específico por su ID
 */
export async function getUserBrandKitById(brandKitId: string): Promise<{
    success: boolean;
    data?: BrandDNA;
    error?: string;
}> {
    try {
        const { userId } = await auth();
        if (!userId) {
            return { success: false, error: 'No autorizado' };
        }

        // Robust path: resolve from the current user's own list to avoid
        // stale/legacy IDs and keep strict user isolation.
        const data = await authedFetchQuery(api.brands.getBrandDNAById, {
            id: brandKitId as Id<'brand_dna'>,
            clerk_user_id: userId,
        });

        if (!data || String(data._id) !== String(brandKitId)) {
            return { success: false, error: 'Brand Kit no encontrado' };
        }

        const brandDNA: BrandDNA = {
            id: data._id,
            url: data.url || '',
            brand_name: data.brand_name || '',
            cta_url_enabled: typeof data.cta_url_enabled === 'boolean' ? data.cta_url_enabled : false,
            tagline: data.tagline || '',
            business_overview: data.business_overview || '',
            brand_values: data.brand_values || [],
            tone_of_voice: data.tone_of_voice || [],
            visual_aesthetic: data.visual_aesthetic || [],
            colors: data.colors || [],
            fonts: data.fonts || [],
            logo_url: data.logo_url || '',
            logos: normalizeImages(data.logos),
            favicon_url: data.favicon_url || '',
            screenshot_url: data.screenshot_url || '',
            images: normalizeImages(data.images),
            social_links: data.social_links || [],
            emails: data.emails || [],
            phones: data.phones || [],
            addresses: data.addresses || [],
            preferred_language: data.preferred_language || undefined,
            api_trace: data.api_trace || [],
            text_assets: data.text_assets || undefined,
            debug: data.debug || undefined,
            created_at: data.updated_at || new Date().toISOString(), // Using updated_at as created_at doesn't exist
        };

        return { success: true, data: brandDNA };
    } catch (err) {
        console.error('Unexpected error in getUserBrandKitById:', err);
        return { success: false, error: 'Error inesperado' };
    }
}

/**
 * Obtiene el Brand Kit más reciente del usuario (mantiene compatibilidad)
 */
export async function getUserBrandKit(clerkUserId: string): Promise<{
    success: boolean;
    data?: BrandDNA;
    exists: boolean;
    error?: string;
}> {
    try {
        const { userId } = await auth();
        if (!userId || userId !== clerkUserId) {
            return { success: false, exists: false, error: 'No autorizado' };
        }

        const brands = await authedFetchQuery(api.brands.listSummariesByClerkId, { clerk_user_id: userId });

        if (!brands || brands.length === 0) {
            return { success: true, exists: false };
        }

        // Sort desc
        brands.sort((a: any, b: any) => {
            const dateA = new Date(a.updated_at).getTime();
            const dateB = new Date(b.updated_at).getTime();
            return dateB - dateA;
        });

        const record = brands[0];
        const fullRecord = await authedFetchQuery(api.brands.getBrandDNAById, {
            id: record._id as Id<'brand_dna'>,
            clerk_user_id: userId,
        });
        if (!fullRecord) {
            return { success: false, exists: false, error: 'Brand Kit no encontrado' };
        }

        const brandDNA: BrandDNA = {
            id: fullRecord._id,
            url: fullRecord.url || '',
            brand_name: fullRecord.brand_name || '',
            cta_url_enabled: typeof fullRecord.cta_url_enabled === 'boolean' ? fullRecord.cta_url_enabled : false,
            tagline: fullRecord.tagline || '',
            business_overview: fullRecord.business_overview || '',
            brand_values: fullRecord.brand_values || [],
            tone_of_voice: fullRecord.tone_of_voice || [],
            visual_aesthetic: fullRecord.visual_aesthetic || [],
            colors: fullRecord.colors || [],
            fonts: fullRecord.fonts || [],
            logo_url: fullRecord.logo_url || '',
            logos: normalizeImages(fullRecord.logos),
            favicon_url: fullRecord.favicon_url || '',
            screenshot_url: fullRecord.screenshot_url || '',
            images: normalizeImages(fullRecord.images),
            social_links: fullRecord.social_links || [],
            emails: fullRecord.emails || [],
            phones: fullRecord.phones || [],
            addresses: fullRecord.addresses || [],
            preferred_language: fullRecord.preferred_language || undefined,
            api_trace: fullRecord.api_trace || [],
            text_assets: fullRecord.text_assets || undefined,
            debug: fullRecord.debug || undefined,
            created_at: fullRecord.updated_at || new Date().toISOString(), // Using updated_at as created_at doesn't exist
        };

        return { success: true, data: brandDNA, exists: true };
    } catch (err) {
        console.error('Unexpected error in getUserBrandKit:', err);
        return { success: false, exists: false, error: 'Error inesperado' };
    }
}
