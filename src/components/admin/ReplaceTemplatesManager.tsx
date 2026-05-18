'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'

import { api } from '@/../convex/_generated/api'
import type { Id } from '@/../convex/_generated/dataModel'
import { uploadBrandImage } from '@/app/actions/upload-image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { IconDelete, IconImage, IconPlus, IconUpload } from '@/components/ui/icons'
import { useToast } from '@/hooks/use-toast'

type ReplaceTemplateRow = {
  _id: Id<'replace_templates'>
  title: string
  image_url: string
  full_image_url?: string
  thumbnail_url?: string
  sort_order: number
}

interface ReplaceTemplatesManagerProps {
  adminEmail: string
}

export function ReplaceTemplatesManager({ adminEmail }: ReplaceTemplatesManagerProps) {
  const { toast } = useToast()
  const templatesResult = useQuery(api.replaceTemplates.listAllForAdmin, { admin_email: adminEmail })
  const createTemplate = useMutation(api.replaceTemplates.create)
  const removeTemplate = useMutation(api.replaceTemplates.remove)

  const templates = useMemo(
    () => (templatesResult || []) as ReplaceTemplateRow[],
    [templatesResult]
  )

  const [newTitle, setNewTitle] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!selectedFile) {
      toast({
        title: 'Falta la imagen',
        description: 'Sube la imagen de la plantilla antes de guardarla.',
        variant: 'destructive',
      })
      return
    }

    const title = newTitle.trim()
    if (!title) {
      toast({
        title: 'Falta el título',
        description: 'Añade un título breve para identificar la plantilla.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('assetKind', 'image')
      formData.append('generateThumbnail', 'true')

      const uploaded = await uploadBrandImage(formData)
      if (!uploaded.success || !uploaded.url) {
        throw new Error(uploaded.error || 'No se pudo subir la imagen.')
      }

      await createTemplate({
        admin_email: adminEmail,
        title,
        image_url: uploaded.url,
        thumbnail_url: uploaded.thumbnailUrl || uploaded.url,
      })

      setNewTitle('')
      setSelectedFile(null)
      toast({
        title: 'Plantilla creada',
        description: 'La plantilla ya está disponible en el módulo Replace.',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear la plantilla.'
      toast({
        title: 'Error al crear plantilla',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemove = async (template: ReplaceTemplateRow) => {
    setDeletingId(String(template._id))
    try {
      await removeTemplate({
        admin_email: adminEmail,
        id: template._id,
      })
      toast({
        title: 'Plantilla eliminada',
        description: `"${template.title}" ya no aparecerá en Replace.`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar la plantilla.'
      toast({
        title: 'Error al eliminar',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Crear plantilla</CardTitle>
          <CardDescription>
            Sube una imagen y un título. Estas plantillas se mostrarán en el panel derecho del módulo Replace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="replace-template-title">Título</Label>
            <Input
              id="replace-template-title"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="Ej. Editorial card"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="replace-template-file">Imagen</Label>
            <Input
              id="replace-template-file"
              type="file"
              accept="image/*"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground">
              Se optimiza automáticamente para panel derecho y vista previa.
            </p>
          </div>

          <Button type="button" onClick={() => void handleCreate()} disabled={isSubmitting} className="gap-2">
            {isSubmitting ? <IconUpload className="h-4 w-4" /> : <IconPlus className="h-4 w-4" />}
            {isSubmitting ? 'Guardando plantilla...' : 'Añadir plantilla'}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Plantillas existentes</h2>
          <p className="text-sm text-muted-foreground">
            Gestión básica de altas y bajas para el módulo Replace.
          </p>
        </div>

        {templates.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <Card key={template._id}>
                <CardContent className="space-y-3 p-4">
                  <div className="aspect-[16/10] overflow-hidden rounded-xl border border-border/60 bg-muted/20">
                    {template.image_url ? (
                      <img
                        src={template.image_url}
                        alt={template.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <IconImage className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{template.title}</p>
                    <p className="text-xs text-muted-foreground">Orden actual: {template.sort_order}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    disabled={deletingId === String(template._id)}
                    onClick={() => void handleRemove(template)}
                  >
                    <IconDelete className="h-4 w-4" />
                    {deletingId === String(template._id) ? 'Eliminando...' : 'Eliminar'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex min-h-[180px] flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="rounded-full border border-border/60 bg-muted/20 p-3">
                <IconImage className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">Todavía no hay plantillas Replace</p>
                <p className="text-sm text-muted-foreground">
                  Añade la primera desde el formulario superior y aparecerá en el estudio.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
