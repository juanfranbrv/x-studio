import type { Metadata } from 'next'

import { BrandKitGuard } from '@/components/brand-kit/BrandKitGuard'

export const metadata: Metadata = {
  title: 'Post laboratory Replace | Experimental',
  description: 'Modulo experimental Replace con panel derecho y control de visibilidad desde admin.',
}

export default function ReplaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <BrandKitGuard>{children}</BrandKitGuard>
}
