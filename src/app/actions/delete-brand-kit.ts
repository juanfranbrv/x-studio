'use server';

import { fetchMutation } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import { authedFetchQuery, authedFetchMutation } from '@/lib/convex-server';
import { Id } from '../../../convex/_generated/dataModel';
import { auth } from '@clerk/nextjs/server';

/**
 * Elimina un Brand Kit por su ID
 */
export async function deleteBrandKit(brandKitId: string): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const { userId } = await auth();
        if (!userId) {
            return { success: false, error: 'No autorizado' };
        }

        await authedFetchMutation(api.brands.deleteBrandDNA, {
            id: brandKitId as Id<'brand_dna'>,
            clerk_user_id: userId,
        });

        return { success: true };
    } catch (err) {
        console.error('Unexpected error in deleteBrandKit:', err);
        return { success: false, error: 'Error inesperado al eliminar el Brand Kit' };
    }
}
