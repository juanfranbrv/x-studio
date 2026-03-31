import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import { auth } from '@clerk/nextjs/server';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { clerk_user_id, brand_name, source_url } = body;
        const { userId } = await auth();

        if (!clerk_user_id) {
            return NextResponse.json(
                { success: false, error: 'clerk_user_id is required' },
                { status: 400 }
            );
        }

        if (!userId || userId !== clerk_user_id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (typeof brand_name !== 'string') {
            return NextResponse.json(
                { success: false, error: 'brand_name is required' },
                { status: 400 }
            );
        }

        // Create empty brand kit via Convex mutation
        const brandId = await convex.mutation(api.brands.createEmptyBrandKit, {
            clerk_user_id,
            brand_name,
            source_url,
        });

        return NextResponse.json({
            success: true,
            data: { id: brandId },
        });
    } catch (error) {
        console.error('Error creating empty brand kit:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create brand kit' },
            { status: 500 }
        );
    }
}
