import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, X, Image as ImageIcon, Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploadBrandImage } from '@/app/actions/upload-image'
import type { BrandDNA } from '@/lib/brand-types'
import type { WizardAction } from '../hooks/useWizardState'
import {
  WIZARD_STEP_CONTAINER,
  WIZARD_STEP_CONTENT,
  WIZARD_TITLE,
  WIZARD_SUBTITLE,
  WIZARD_UPLOAD_ZONE,
} from '../brandStudioStyles'

interface ImagesStepProps {
  draft: Partial<BrandDNA>
  dispatch: React.Dispatch<WizardAction>
}

export function ImagesStep({ draft, dispatch }: ImagesStepProps) {
  const { t } = useTranslation('brandStudio')
  const images = draft.images ?? []
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (files: FileList | File[]) => {
    if (files.length === 0) return
    setIsUploading(true)
    setError(null)

    const newUploadedImages = [...images]
    let hasError = false

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('assetKind', 'image')
        
        const result = await uploadBrandImage(formData)
        if (result.success && result.url) {
          newUploadedImages.push({ url: result.url, selected: true })
        } else {
          setError(result.error || t('images.uploadError'))
          hasError = true
          break
        }
      }

      if (!hasError) {
        dispatch({
          type: 'UPDATE_DRAFT',
          data: { images: newUploadedImages },
        })
      }
    } catch (err) {
      setError(t('images.uploadError'))
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleUpload(e.target.files)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) handleUpload(e.dataTransfer.files)
  }

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    dispatch({
      type: 'UPDATE_DRAFT',
      data: { images: newImages },
    })
  }

  return (
    <div className={WIZARD_STEP_CONTAINER}>
      <div className={WIZARD_STEP_CONTENT}>
        {/* Header */}
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-2"
        >
          <h1 className={WIZARD_TITLE}>{t('images.title')}</h1>
          <p className={WIZARD_SUBTITLE}>{t('images.subtitle')}</p>
        </motion.div>

        {/* Upload Zone */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`${WIZARD_UPLOAD_ZONE} relative min-h-[220px] flex flex-col items-center justify-center cursor-pointer transition-all ${
            isDragging ? 'border-primary ring-4 ring-primary/10 bg-primary/5' : ''
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
          />
          
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <Upload className="h-8 w-8" />
            )}
          </div>
          
          <div className="space-y-1 text-center">
            <p className="text-xl font-bold tracking-tight">
              {isUploading ? t('images.uploading') : 'Arrastra tus imágenes aquí'}
            </p>
            <p className="text-sm text-muted-foreground font-medium">
              {isUploading ? t('images.pleaseWait') : 'o haz clic para seleccionar archivos'}
            </p>
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mt-2">
              JPG, PNG, WebP (Max. 12MB)
            </p>
          </div>

          {error && (
            <p className="mt-4 text-sm font-medium text-destructive">{error}</p>
          )}
        </motion.div>

        {/* Image Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          <AnimatePresence mode="popLayout">
            {images.map((img, index) => (
              <motion.div
                key={img.url + index}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.3 }}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-border/40 bg-muted/30 transition-all hover:border-primary/30"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = 'https://placehold.co/400x400/transparent/666?text=Image+Error'
                  }}
                />
                
                <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100" />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveImage(index)
                  }}
                  className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur-sm transition-transform hover:scale-110 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ))}

            {images.length === 0 && !isUploading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-12 text-center"
              >
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="text-sm text-muted-foreground">{t('images.empty')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
