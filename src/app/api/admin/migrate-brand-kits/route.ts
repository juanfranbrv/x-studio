import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * One-time migration: assigns clerk_user_id to brand_dna docs that were
 * saved without a valid owner (undefined / 'anonymous' fallback bug).
 *
 * GET  /api/admin/migrate-brand-kits  → diagnose (shows orphaned count)
 * POST /api/admin/migrate-brand-kits  → run migration (assigns current user)
 */
export async function GET() {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [orphans, stats] = await Promise.all([
        convex.query(api.brands.listOrphanedBrandKits, {}),
        convex.query(api.brands.debugBrandDNAStats, {}),
    ])

    return NextResponse.json({
        current_user_id: userId,
        orphans_count: orphans.length,
        orphans,
        db_stats: stats,
    })
}

export async function POST() {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const result = await convex.mutation(api.brands.claimOrphanedBrandKits, {
        clerk_user_id: userId,
    })

    return NextResponse.json({ success: true, ...result })
}
