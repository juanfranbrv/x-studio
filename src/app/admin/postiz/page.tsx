'use client'

import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { isAdminEmail } from '@/lib/auth-config'
import { Loader2 } from '@/components/ui/spinner'
import { IconArrowLeft } from '@/components/ui/icons'
import { PostizConnectionManager } from '@/components/admin/PostizConnectionManager'

export default function AdminPostizPage() {
    const { user, isLoaded } = useUser()
    const email = user?.primaryEmailAddress?.emailAddress
    const isAdmin = isAdminEmail(email)

    if (!isLoaded) {
        return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6" /></div>
    }

    if (!isAdmin || !user) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-muted-foreground">No autorizado.</p>
                <Link href="/" className="text-sm text-primary underline">Volver al inicio</Link>
            </div>
        )
    }

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <Link href="/admin" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                        <IconArrowLeft className="h-4 w-4" /> Admin
                    </Link>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Postiz</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Guarda la direccion y la clave de API de tu instancia de Postiz para poder programar publicaciones desde el lienzo.
                    </p>
                </div>
            </div>

            <PostizConnectionManager clerkUserId={user.id} />
        </div>
    )
}
