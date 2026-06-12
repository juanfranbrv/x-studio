'use server';

import { fetchMutation } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import { authedFetchQuery, authedFetchMutation } from '@/lib/convex-server';
import { Id } from '../../../convex/_generated/dataModel';
import { BrandDNA } from '@/lib/brand-types';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';

export async function updateUserBrandKit(brandKitId: string, brandData: BrandDNA) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return { success: false, error: 'No autorizado' };
        }

        await authedFetchMutation(api.brands.updateBrandDNADoc, {
            id: brandKitId as Id<'brand_dna'>,
            clerk_user_id: userId,
            updates: {
                brand_name: brandData.brand_name,
                url: brandData.url,
                tagline: brandData.tagline,
                business_overview: brandData.business_overview,
                cta_url_enabled: brandData.cta_url_enabled,
                brand_values: brandData.brand_values,
                tone_of_voice: brandData.tone_of_voice,
                visual_aesthetic: brandData.visual_aesthetic,
                colors: brandData.colors,
                fonts: brandData.fonts,
                logo_url: brandData.logo_url,
                logos: brandData.logos,
                favicon_url: brandData.favicon_url,
                screenshot_url: brandData.screenshot_url,
                images: brandData.images,
                target_audience: brandData.target_audience,
                social_links: brandData.social_links,
                emails: brandData.emails,
                phones: brandData.phones,
                addresses: brandData.addresses,
                text_assets: brandData.text_assets,
                preferred_language: brandData.preferred_language,
                updated_at: new Date().toISOString(),
            }
        });

        revalidatePath('/dashboard');
        revalidatePath('/brand-kit');
        return { success: true };
    } catch (error: unknown) {
        console.error('Error inesperado al actualizar brand kit:', error);
        const message = error instanceof Error ? error.message : 'Error desconocido';
        return { success: false, error: message };
    }
}
