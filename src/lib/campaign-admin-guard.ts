import 'server-only'

import { NextResponse } from 'next/server'
import { getAdminUserIdOrNull } from '@/lib/admin-guard'

export async function requireCampaignAdmin() {
    const userId = await getAdminUserIdOrNull()
    if (!userId) {
        return {
            ok: false as const,
            response: NextResponse.json(
                { ok: false, error: { code: 'forbidden', message: 'Solo el administrador puede usar campañas.' } },
                { status: 403 },
            ),
        }
    }

    return { ok: true as const, userId }
}
