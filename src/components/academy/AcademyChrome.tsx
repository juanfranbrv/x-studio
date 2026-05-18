'use client'

import { useAuth } from '@clerk/nextjs'
import { useBrandKit } from '@/contexts/BrandKitContext'
import { Header } from '@/components/layout/Header'
import { PublicLandingNav } from '@/components/layout/PublicLandingNav'
import { Sidebar } from '@/components/layout/Sidebar'
import { cn } from '@/lib/utils'
import { ACADEMY_SHELL_BACKGROUND_CLASS, ACADEMY_SURFACE_CLASS } from './academyStyles'

interface AcademyChromeProps {
    children: React.ReactNode
}

export function AcademyChrome({ children }: AcademyChromeProps) {
    const { isSignedIn } = useAuth()
    const { activeBrandKit, brandKits, setActiveBrandKit, deleteBrandKitById } = useBrandKit()

    if (isSignedIn) {
        return (
            <div className={cn('fixed inset-0 flex overflow-hidden text-foreground', ACADEMY_SHELL_BACKGROUND_CLASS)}>
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    <Header
                        brands={brandKits}
                        currentBrand={activeBrandKit}
                        onBrandChange={setActiveBrandKit}
                        onBrandDelete={deleteBrandKitById}
                        variant="bar"
                    />

                    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
                        <Sidebar
                            className="hidden md:flex"
                            showLogo={false}
                            offsetTopClassName="md:h-[calc(100dvh-74px)]"
                        />

                        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
                            <div className="min-h-[calc(100dvh-122px)]">{children}</div>
                        </main>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={cn('min-h-screen text-foreground', ACADEMY_SHELL_BACKGROUND_CLASS)}>
            <PublicLandingNav hasAccess={false} />

            <main className="mx-auto w-full max-w-[90rem] px-4 pb-4 pt-28 sm:px-6 sm:pt-32 lg:px-8 lg:pb-6 lg:pt-36">
                {children}
            </main>
        </div>
    )
}
