import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Brand Studio | Post laboratory',
  description: 'Crea el kit de marca perfecto para tu negocio con asistencia de IA.',
}

export default function BrandStudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
