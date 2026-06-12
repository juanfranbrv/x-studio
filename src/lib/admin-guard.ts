import 'server-only'

import { auth, currentUser } from '@clerk/nextjs/server'
import { isAdminEmail } from '@/lib/auth-config'

/**
 * Guard de rutas API admin: exige sesión Y rol de admin (email verificado
 * contra la sesión de Clerk, nunca contra parámetros de la petición).
 * Devuelve el userId si es admin, o null si no lo es.
 */
export async function getAdminUserIdOrNull(): Promise<string | null> {
    const { userId } = await auth()
    if (!userId) return null

    const user = await currentUser()
    const email = user?.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress
        ?? user?.emailAddresses?.[0]?.emailAddress
    return isAdminEmail(email) ? userId : null
}
