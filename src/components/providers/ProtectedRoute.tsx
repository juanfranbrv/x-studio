'use client'

import { Loader2 } from '@/components/ui/spinner'
import { ReactNode, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import { IconShield, IconClock } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ProtectedRouteProps {
    children: ReactNode
}

/**
 * Wrapper component that protects routes requiring beta access.
 * Shows appropriate screens for unauthenticated, pending, rejected, or no-access users.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isSignedIn, isLoaded, signOut } = useAuth()
    const { user } = useUser()
    const userEmail = user?.emailAddresses[0]?.emailAddress || ''

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            window.location.href = '/sign-in'
        }
    }, [isLoaded, isSignedIn])

    // Check beta access
    const betaAccess = useQuery(
        api.admin.checkBetaAccess,
        isLoaded && isSignedIn && userEmail ? { email: userEmail } : 'skip'
    )

    // Loading state
    if (!isLoaded) {
        return (
            <AccessLoadingScreen
                title="Comprobando sesión"
                description="Validando tu identidad antes de abrir el espacio de trabajo."
            />
        )
    }

    if (isSignedIn && betaAccess === undefined) {
        return (
            <AccessLoadingScreen
                title="Verificando acceso"
                description="Confirmando permisos beta y preparando tu espacio de trabajo."
            />
        )
    }

    // Not signed in - redirect to sign-in
    if (!isSignedIn) {
        return (
            <AccessLoadingScreen
                title="Abriendo inicio de sesión"
                description="Redirigiendo para autenticar la sesión."
            />
        )
    }

    // Check access
    if (betaAccess && !betaAccess.hasAccess) {
        return <AccessDeniedScreen status={betaAccess.status} email={userEmail} onSignOut={() => signOut()} />
    }

    // Has access - render children
    return <>{children}</>
}

function AccessLoadingScreen({ title, description }: { title: string; description: string }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
            <div className="w-full max-w-sm rounded-[1.45rem] border border-border/60 bg-background/90 p-5 text-center shadow-lg">
                <Loader2 className="mx-auto h-8 w-8 text-primary" />
                <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
        </div>
    )
}

function AccessDeniedScreen({ status, email, onSignOut }: { status: string; email: string; onSignOut: () => void }) {
    const handleGoHome = () => {
        window.location.href = '/'
    }

    if (status === 'pending') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-8">
                <Card className="max-w-md w-full text-center">
                    <CardHeader>
                        <div className="mx-auto w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
                            <IconClock className="w-8 h-8 text-yellow-500" />
                        </div>
                        <CardTitle className="text-2xl">Solicitud Pendiente</CardTitle>
                        <CardDescription className="text-base">
                            Tu solicitud de acceso está siendo revisada
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">
                            Recibirás un email en <strong>{email}</strong> cuando tu acceso sea aprobado.
                        </p>
                        <Button variant="outline" onClick={handleGoHome}>
                            Volver a la página principal
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // rejected or none
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8">
            <Card className="max-w-md w-full text-center">
                <CardHeader>
                    <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                        <IconShield className="w-8 h-8 text-destructive" />
                    </div>
                    <CardTitle className="text-2xl">
                        {status === 'rejected' ? 'Acceso Denegado' : 'Sin Acceso Beta'}
                    </CardTitle>
                    <CardDescription>
                        {status === 'rejected'
                            ? 'Tu solicitud no fue aprobada en esta ocasión.'
                            : `El email ${email} no tiene acceso a la beta.`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground text-sm">
                        Contacta con el administrador para solicitar acceso.
                    </p>
                    <Button variant="outline" onClick={handleGoHome}>
                        Volver a la página principal
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}


