import { NextResponse } from 'next/server'
import { api } from '@/../convex/_generated/api'
import { authedFetchQuery, authedFetchMutation } from '@/lib/convex-server';
import { getAdminUserIdOrNull } from '@/lib/admin-guard'

/**
 * One-time migration: assigns clerk_user_id to brand_dna docs that were
 * saved without a valid owner (undefined / 'anonymous' fallback bug).
 *
 * GET  /api/admin/migrate-brand-kits  → diagnose (shows orphaned count)
 * POST /api/admin/migrate-brand-kits  → run migration (assigns current user)
 */
export async function GET() {
    const userId = await getAdminUserIdOrNull()
    if (!userId) return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })

    const [orphans, stats] = await Promise.all([
        authedFetchQuery(api.brands.listOrphanedBrandKits, {}),
        authedFetchQuery(api.brands.debugBrandDNAStats, {}),
    ])

    return NextResponse.json({
        current_user_id: userId,
        orphans_count: orphans.length,
        orphans,
        db_stats: stats,
    })
}

export async function POST() {
    const userId = await getAdminUserIdOrNull()
    if (!userId) return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })

    const result = await authedFetchMutation(api.brands.claimOrphanedBrandKits, {
        clerk_user_id: userId,
    })

    return NextResponse.json({ success: true, ...result })
}
