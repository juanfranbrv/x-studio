'use client'

import { ReactNode, useState, useEffect, useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { cn } from '@/lib/utils'
import { ProtectedRoute } from '@/components/providers/ProtectedRoute'
import { OnboardingModal } from '@/components/onboarding/OnboardingModal'
import { useBrandKit } from '@/contexts/BrandKitContext'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { IconAlertCircle } from '@/components/ui/icons'
import { calculateBrandKitCompleteness } from '@/lib/brand-kit-utils'
import { BrandKitSummary, BrandDNA } from '@/lib/brand-types'

const MIN_BRAND_KIT_COMPLETENESS = 70

interface DashboardLayoutProps {
    children: ReactNode
    brands?: BrandKitSummary[]
    currentBrand?: BrandDNA | BrandKitSummary | null
    onBrandChange?: (brandId: string) => void
    onBrandDelete?: (brandId: string) => void
    onNewBrandKit?: () => void
    isFixed?: boolean
    headerAfterBrandActions?: ReactNode
    contentContainerVariant?: 'card' | 'plain'
    headerVariant?: 'card' | 'bar'
}

export function DashboardLayout({
    children,
    brands = [],
    currentBrand,
    onBrandChange,
    onBrandDelete,
    onNewBrandKit,
    isFixed = false,
    headerAfterBrandActions,
    contentContainerVariant = 'card',
    headerVariant = 'bar',
}: DashboardLayoutProps) {
    const router = useRouter()
    const pathname = usePathname()
    const { user } = useUser()
    const { brandKits, activeBrandKit, loading: brandKitsLoading } = useBrandKit()
    const userRecord = useQuery(api.users.getUser, user?.id ? { clerk_id: user.id } : "skip")
    const completeOnboarding = useMutation(api.users.completeOnboarding)

    const [showOnboarding, setShowOnboarding] = useState(false)
    const [showCompletenessGate, setShowCompletenessGate] = useState(false)

    const completeness = useMemo(
        () => calculateBrandKitCompleteness(activeBrandKit),
        [activeBrandKit]
    )
    const hasAnyUnlockedBrandKit = useMemo(
        () => brandKits.some((kit) => (kit.completeness ?? 0) >= MIN_BRAND_KIT_COMPLETENESS),
        [brandKits]
    )

    const isBrandKitRoute = Boolean(pathname?.startsWith('/brand-kit'))
    const hasIncompleteActiveBrandKit =
        Boolean(activeBrandKit) && completeness.percentage < MIN_BRAND_KIT_COMPLETENESS
    const shouldBlockCurrentRoute =
        !brandKitsLoading &&
        !isBrandKitRoute &&
        hasIncompleteActiveBrandKit

    // Detectar si debemos mostrar el modal de onboarding
    useEffect(() => {
        const hasConvexUser = userRecord !== null && userRecord !== undefined
        const onboardingIncomplete = hasConvexUser && userRecord?.onboarding_completed === false
        if (
            user?.id &&
            userRecord !== undefined &&
            !brandKitsLoading &&
            // Solo mostramos onboarding si el usuario Convex existe
            // y explícitamente tiene onboarding incompleto.
            onboardingIncomplete &&
            // Usuario no tiene Brand Kits
            brandKits.length === 0
        ) {
            setShowOnboarding(true)
            return
        }
        setShowOnboarding(false)
    }, [user?.id, userRecord, brandKitsLoading, brandKits.length])

    useEffect(() => {
        if (!shouldBlockCurrentRoute) {
            setShowCompletenessGate(false)
            return
        }

        setShowCompletenessGate(true)
        router.replace('/brand-kit')
    }, [shouldBlockCurrentRoute, router])

    const handleOnboardingComplete = async () => {
        if (user?.id) {
            try {
                await completeOnboarding({ clerk_id: user.id })
            } catch (error) {
                console.error('Error completing onboarding:', error)
            }
        }
    }

    const handleCompletenessGateAccept = () => {
        setShowCompletenessGate(false)
        router.replace('/brand-kit')
    }

    return (
        <ProtectedRoute>
            <div className="fixed inset-x-0 bottom-0 top-[var(--environment-banner-height)] flex overflow-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_24%),radial-gradient(circle_at_top_right,hsl(var(--accent)/0.07),transparent_18%),linear-gradient(180deg,hsl(var(--surface-alt)),hsl(var(--surface)))] text-foreground md:relative md:inset-auto md:h-[calc(100dvh-var(--environment-banner-height))]">
                {headerVariant === 'bar' ? (
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                        <Header
                            brands={brands}
                            currentBrand={currentBrand}
                            onBrandChange={onBrandChange}
                            onBrandDelete={onBrandDelete}
                            onNewBrandKit={onNewBrandKit}
                            afterBrandActions={headerAfterBrandActions}
                            variant={headerVariant}
                        />

                        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
                            <Sidebar
                                className="hidden md:flex"
                                showLogo={false}
                                offsetTopClassName="md:h-[calc(100dvh-74px)]"
                            />

                            <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
                                <div
                                    className={cn(
                                        "scrollbar-hide flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden md:px-3 md:pb-3 md:pt-3",
                                        isFixed ? "overflow-hidden" : "overflow-y-auto",
                                        contentContainerVariant === 'plain' && "md:px-0 md:pb-0 md:pt-0"
                                    )}
                                >
                                    {contentContainerVariant === 'card' ? (
                                        <div
                                            className={cn(
                                                "rounded-[1.75rem] md:border md:border-border/60 md:bg-white/80 md:shadow-[0_24px_80px_-48px_rgba(15,23,42,0.35)] md:backdrop-blur-xl",
                                                isFixed ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "min-h-full"
                                            )}
                                        >
                                            {children}
                                        </div>
                                    ) : (
                                        children
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Lateral Navigation (Desktop Only) */}
                        <Sidebar className="hidden md:flex" />

                        {/* Main Content Area */}
                        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
                            {/* Top Bar (Fixed) */}
                            <Header
                                brands={brands}
                                currentBrand={currentBrand}
                                onBrandChange={onBrandChange}
                                onBrandDelete={onBrandDelete}
                                onNewBrandKit={onNewBrandKit}
                                afterBrandActions={headerAfterBrandActions}
                                variant={headerVariant}
                            />

                            {/* Scrollable Content Container */}
                            <div
                                className={cn(
                                    "scrollbar-hide flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden md:px-3 md:pb-3 md:pt-3",
                                    isFixed ? "overflow-hidden" : "overflow-y-auto",
                                    contentContainerVariant === 'plain' && "md:px-0 md:pb-0 md:pt-0"
                                )}
                            >
                                {contentContainerVariant === 'card' ? (
                                    <div
                                        className={cn(
                                            "rounded-[1.75rem] md:border md:border-border/60 md:bg-white/80 md:shadow-[0_24px_80px_-48px_rgba(15,23,42,0.35)] md:backdrop-blur-xl",
                                            isFixed ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "min-h-full"
                                        )}
                                    >
                                        {children}
                                    </div>
                                ) : (
                                    children
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Onboarding Modal */}
            <OnboardingModal
                isOpen={showOnboarding}
                onClose={() => setShowOnboarding(false)}
                onComplete={handleOnboardingComplete}
            />

            <Dialog
                open={showCompletenessGate}
                onOpenChange={(open) => {
                    if (!open && shouldBlockCurrentRoute) {
                        router.replace('/brand-kit')
                        return
                    }
                    setShowCompletenessGate(open)
                }}
            >
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <IconAlertCircle className="h-5 w-5 text-amber-500" />
                            Completa tu Kit de Marca primero
                        </DialogTitle>
                        <DialogDescription className="pt-2 space-y-2">
                            <span className="block">
                                Tu kit esta al {completeness.percentage}% y necesitas al menos un {MIN_BRAND_KIT_COMPLETENESS}% para usar este modulo.
                            </span>
                            <span className="block">
                                {!hasAnyUnlockedBrandKit
                                    ? 'Ahora mismo no tienes ningun kit por encima del minimo. Completa uno para desbloquear toda la app.'
                                    : 'Sin ese minimo no se desbloquean Imagen ni el resto de modulos.'}
                            </span>
                        </DialogDescription>
                    </DialogHeader>

                    {completeness.tips.length > 0 && (
                        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                            {completeness.tips[0]}
                        </div>
                    )}

                    <DialogFooter>
                        <Button onClick={handleCompletenessGateAccept}>
                            Ir a Kit de Marca
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ProtectedRoute>
    )
}
