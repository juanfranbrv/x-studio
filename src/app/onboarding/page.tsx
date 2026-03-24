'use client'

import { Loader2 } from '@/components/ui/spinner'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLogo } from '@/components/ui/AppLogo'
import { useUser } from '@clerk/nextjs'
import { I18nProvider } from '@/components/providers/I18nProvider'
import { useBrandKit } from '@/contexts/BrandKitContext'
import { getLastVisitedModuleAction } from '@/app/actions/get-last-visited-module'

const LAST_SESSION_TIMEOUT_MS = 2500
const ONBOARDING_ESCAPE_TIMEOUT_MS = 4500

export default function OnboardingPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const {
    brandKits,
    activeBrandKit,
    loading: brandKitsLoading,
    reloadBrandKits,
    setActiveBrandKit,
  } = useBrandKit()
  const hasRetriedBrandKitLoadRef = useRef(false)
  const hasCompletedRedirectRef = useRef(false)
  const hasResolvedLastSessionRef = useRef(false)
  const onboardingEscapeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [lastVisitedModule, setLastVisitedModule] = useState<{
    module: 'image' | 'carousel' | 'brand-kit'
    session_id: string
    brand_id?: string | null
    updated_at: string
  } | null | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (onboardingEscapeTimeoutRef.current) {
        clearTimeout(onboardingEscapeTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    hasResolvedLastSessionRef.current = false

    if (!isLoaded || !user?.id) return

    let cancelled = false
    void (async () => {
      const result = await Promise.race([
        getLastVisitedModuleAction(user.id),
        new Promise<{ success: false; error: string }>((resolve) => {
          setTimeout(() => resolve({ success: false, error: 'timeout' }), LAST_SESSION_TIMEOUT_MS)
        }),
      ])
      if (cancelled) return
      hasResolvedLastSessionRef.current = true
      setLastVisitedModule(result.success ? (result.data ?? null) : null)
    })()

    return () => {
      cancelled = true
    }
  }, [isLoaded, user?.id])

  useEffect(() => {
    if (!isLoaded) return

    if (!user?.id) {
      if (onboardingEscapeTimeoutRef.current) {
        clearTimeout(onboardingEscapeTimeoutRef.current)
      }
      router.replace('/sign-in')
      return
    }

    if (hasCompletedRedirectRef.current) return

    if (!onboardingEscapeTimeoutRef.current) {
      onboardingEscapeTimeoutRef.current = setTimeout(() => {
        if (hasCompletedRedirectRef.current) return
        hasCompletedRedirectRef.current = true
        const fallbackPath = Array.isArray(brandKits) && brandKits.length > 0 ? '/brand-kit' : '/image'
        router.replace(fallbackPath)
      }, ONBOARDING_ESCAPE_TIMEOUT_MS)
    }

    const completeRedirect = (path: string) => {
      if (hasCompletedRedirectRef.current) return
      hasCompletedRedirectRef.current = true
      if (onboardingEscapeTimeoutRef.current) {
        clearTimeout(onboardingEscapeTimeoutRef.current)
        onboardingEscapeTimeoutRef.current = null
      }
      router.replace(path)
    }

    const redirectToLastModule = async () => {
      if (!lastVisitedModule?.module) return false

      const targetPath = lastVisitedModule.module === 'brand-kit'
        ? '/brand-kit'
        : lastVisitedModule.module === 'carousel'
          ? '/carousel'
          : '/image'

      completeRedirect(targetPath)
      return true
    }

    if (lastVisitedModule) {
      void redirectToLastModule()
      return
    }

    if (brandKitsLoading) return

    if (lastVisitedModule === undefined || !hasResolvedLastSessionRef.current) return

    if (!Array.isArray(brandKits) || brandKits.length === 0) {
      // Reintento defensivo para evitar falsos "sin kits" por carrera de carga.
      if (!hasRetriedBrandKitLoadRef.current) {
        hasRetriedBrandKitLoadRef.current = true
        void reloadBrandKits(true)
        return
      }

      completeRedirect('/brand-kit')
      return
    }

    if (!activeBrandKit?.id && brandKits[0]?.id) {
      void setActiveBrandKit(brandKits[0].id, true, true).finally(() => {
        completeRedirect('/brand-kit')
      })
      return
    }

    completeRedirect('/brand-kit')
  }, [
    isLoaded,
    user?.id,
    brandKitsLoading,
    brandKits,
    activeBrandKit?.id,
    lastVisitedModule,
    reloadBrandKits,
    setActiveBrandKit,
    router,
  ])

  return (
    <I18nProvider>
      <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
        <div className="pointer-events-none absolute left-1/2 top-12 h-64 w-[20rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[96px] sm:h-72 sm:w-[42rem] sm:blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-16 right-0 h-64 w-64 rounded-full bg-secondary/15 blur-[96px] sm:h-80 sm:w-80 sm:blur-[120px]" />

        <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 sm:px-6">
          <div className="bg-white rounded-2xl w-full max-w-xl border border-border p-6 text-center shadow-lg sm:p-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <AppLogo className="h-8 w-10" />
            </div>
            <h1 className="text-2xl font-heading font-bold tracking-tight sm:text-3xl">Preparando tu Kit de Marca</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              Te estamos llevando al flujo correcto según tu última sesión.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3 text-primary">
              <Loader2 className="h-5 w-5" />
              <span className="text-sm font-medium">Redirigiendo...</span>
            </div>
          </div>
        </main>
      </div>
    </I18nProvider>
  )
}


