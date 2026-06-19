'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useBrandKit } from '@/contexts/BrandKitContext'
import { Loader2 } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'

export function BrandKitGuard({ children }: { children: React.ReactNode }) {
  const { brandKits, loading, isRecovering, loadError, confirmedEmpty, reloadBrandKits } = useBrandKit()
  const router = useRouter()
  const pathname = usePathname()
  const hasKits = brandKits.length > 0

  // Debug: log every state change.
  useEffect(() => {
    console.log(
      '%c[BrandKitGuard]',
      'color:#6366f1;font-weight:bold',
      `loading=${loading} isRecovering=${isRecovering} loadError=${loadError} confirmedEmpty=${confirmedEmpty} kits=${brandKits.length}`
    )
  })

  // Redirección al hub SOLO ante vacío confirmado (el usuario realmente no tiene
  // kits). Un vacío transitorio (token/identidad no lista en producción) NO
  // dispara redirección: nos quedamos en el módulo reintentando en silencio.
  useEffect(() => {
    if (!confirmedEmpty || hasKits) return
    console.warn(
      '%c[BrandKitGuard] -> REDIRECT /brand-kit',
      'color:#ef4444;font-weight:bold',
      '(confirmed empty: user has no brand kits; handing off to Brand Kit hub to create one)'
    )
    const next = pathname && pathname !== '/brand-kit'
      ? `?next=${encodeURIComponent(pathname)}`
      : ''
    router.replace(`/brand-kit${next}`)
  }, [confirmedEmpty, hasKits, router, pathname])

  // Si ya tenemos kits, renderizamos el módulo aunque haya una recarga en curso.
  if (hasKits) {
    return <>{children}</>
  }

  // Vacío confirmado: estamos redirigiendo; mostramos loader mientras tanto.
  if (confirmedEmpty) {
    return (
      <BrandKitLoadingState
        title="Preparando tu espacio de trabajo"
        description="Te llevamos a tu Kit de Marca."
      />
    )
  }

  // Error persistente (no transitorio) y sin kits: ofrecemos reintento manual,
  // pero NUNCA redirigimos ni abandonamos el módulo por timing.
  if (loadError && !isRecovering) {
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

  // Caso restante: sin kits todavía y sin error terminal (carga inicial o
  // reintento transitorio en curso). Esperamos pacientemente sin abandonar el
  // módulo; el contexto sigue reintentando en segundo plano.
  return (
    <BrandKitLoadingState
      title={isRecovering ? 'Recuperando Kit de Marca' : 'Preparando tu espacio de trabajo'}
      description={isRecovering
        ? 'Reintentando la lectura de tus kits guardados.'
        : 'Buscando kits de marca disponibles antes de continuar.'}
    />
  )
}

function BrandKitLoadingState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm rounded-[1.45rem] border border-border/60 bg-background/90 p-5 text-center shadow-lg">
        <Loader2 className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
