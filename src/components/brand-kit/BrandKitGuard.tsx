'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useBrandKit } from '@/contexts/BrandKitContext'
import { Loader2 } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'

export function BrandKitGuard({ children }: { children: React.ReactNode }) {
  const { brandKits, loading, isRecovering, loadError, reloadBrandKits } = useBrandKit()
  const router = useRouter()
  const pathname = usePathname()

  // Debug: log every state change.
  useEffect(() => {
    console.log(
      '%c[BrandKitGuard]',
      'color:#6366f1;font-weight:bold',
      `loading=${loading} isRecovering=${isRecovering} loadError=${loadError} kits=${brandKits.length}`
    )
  })

  useEffect(() => {
    if (!loading && !isRecovering && brandKits.length === 0 && !loadError) {
      console.warn(
        '%c[BrandKitGuard] -> REDIRECT /brand-kit',
        'color:#ef4444;font-weight:bold',
        '(success=true but no kits found after all retries; handing off to Brand Kit hub for defensive rehydration)'
      )
      const next = pathname && pathname !== '/brand-kit'
        ? `?next=${encodeURIComponent(pathname)}`
        : ''
      router.replace(`/brand-kit${next}`)
    }
  }, [loading, isRecovering, brandKits.length, loadError, router, pathname])

  if (loading || isRecovering) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-muted-foreground" />
      </div>
    )
  }

  if (brandKits.length === 0 && loadError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 text-center"
        >
          <p className="text-sm text-muted-foreground">
            No pudimos cargar tus kits de marca. Comprueba tu conexion e intentalo de nuevo.
          </p>
          <Button variant="outline" size="sm" onClick={() => void reloadBrandKits(false)}>
            Reintentar
          </Button>
        </motion.div>
      </div>
    )
  }

  if (brandKits.length === 0) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-muted-foreground" />
      </div>
    )
  }

  return <>{children}</>
}
