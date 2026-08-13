'use client'

import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useBrandKit } from '@/contexts/BrandKitContext'
import { CampaignGuideCard } from '@/components/campaigns/CampaignGuideCard'
import { CampaignManifestForm } from '@/components/campaigns/CampaignManifestForm'
import { CampaignJobList, useCampaignJobs } from '@/components/campaigns/CampaignJobList'
import { Loader2 } from '@/components/ui/spinner'
import { IconClose } from '@/components/ui/icons'
import { isAdminEmail } from '@/lib/auth-config'
import { Button } from '@/components/ui/button'

/**
 * Generacion por lotes: de un plan de campana a todas las imagenes.
 *
 * La pantalla consume la MISMA API que usaria un cliente externo
 * (`/api/v1/campaigns`), de modo que el contrato queda probado por el propio
 * producto antes de abrirlo a nadie.
 */
export default function CampaignsPage() {
    const router = useRouter()
    const { user, isLoaded } = useUser()
    const { activeBrandKit, brandKits, setActiveBrandKit, deleteBrandKitById } = useBrandKit()
    const userEmail = user?.primaryEmailAddress?.emailAddress || ''
    const isAdmin = isLoaded && isAdminEmail(userEmail)
    const { jobs, cargando, refrescar } = useCampaignJobs(isAdmin)

    if (!isLoaded) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-6">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
                <IconClose className="size-16 text-destructive" />
                <h1 className="text-2xl font-bold">Acceso denegado</h1>
                <p className="text-muted-foreground">No tienes permisos para esta sección.</p>
                <Button type="button" variant="outline" onClick={() => router.replace('/image')}>
                    Volver al estudio
                </Button>
            </div>
        )
    }

    return (
        <DashboardLayout
            brands={brandKits}
            currentBrand={activeBrandKit}
            onBrandChange={setActiveBrandKit}
            onBrandDelete={deleteBrandKitById}
            onNewBrandKit={() => router.push('/brand-kit')}
            contentContainerVariant="plain"
            headerVariant="bar"
        >
            <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4 md:px-4">
                <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4">
                    <header className="rounded-[1.45rem] border border-border/60 bg-background/86 p-4 md:p-5">
                        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Campañas por lotes</h1>
                        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                            Genera de una vez todas las imágenes de una campaña. Describe la campaña con ayuda
                            de la guía, súbela y descarga el paquete con las imágenes ya nombradas y sus
                            fechas, listo para programar.
                        </p>
                    </header>

                    <CampaignGuideCard activeBrandKit={activeBrandKit} />

                    <CampaignManifestForm onEnqueued={refrescar} />

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold">Tus campañas</h2>
                        {cargando ? (
                            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" />
                                Cargando...
                            </p>
                        ) : (
                            <CampaignJobList jobs={jobs} onRefresh={refrescar} />
                        )}
                    </section>
                </div>
            </main>
        </DashboardLayout>
    )
}
