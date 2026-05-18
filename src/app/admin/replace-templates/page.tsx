'use client'

import { useUser } from '@clerk/nextjs'
import Link from 'next/link'

import { ReplaceTemplatesManager } from '@/components/admin/ReplaceTemplatesManager'

const ADMIN_EMAILS = ['juanfranbrv@gmail.com']

export default function AdminReplaceTemplatesPage() {
  const { user, isLoaded } = useUser()
  const userEmail = user?.emailAddresses?.[0]?.emailAddress || ''
  const isAdmin = isLoaded && ADMIN_EMAILS.includes(userEmail.toLowerCase())

  if (!isLoaded) {
    return <div className="p-8">Cargando...</div>
  }

  if (!isAdmin) {
    return (
      <div className="space-y-3 p-8">
        <p>No tienes permisos para esta sección.</p>
        <Link href="/admin" className="text-sm underline">Volver a Admin</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Plantillas Replace</h1>
          <p className="text-sm text-muted-foreground">
            Gestor de imágenes de plantilla para el panel derecho del módulo Replace.
          </p>
        </div>
        <Link href="/admin" className="text-sm underline">Volver a Admin</Link>
      </div>

      <ReplaceTemplatesManager adminEmail={userEmail} />
    </div>
  )
}
