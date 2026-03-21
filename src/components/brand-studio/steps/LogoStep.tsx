'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Download, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LogoCard } from '@/components/brand-dna/VisualAssetComponents'
import { uploadBrandImage } from '@/app/actions/upload-image'
import {
  generateLogoVariations,
  downloadDataUrl,
  type LogoVariation,
} from '@/lib/logo-variations'
import type { BrandDNA } from '@/lib/brand-types'
import type { WizardAction } from '../hooks/useWizardState'
import {
  WIZARD_STEP_CONTAINER,
  WIZARD_STEP_CONTENT,
  WIZARD_TITLE,
  WIZARD_SUBTITLE,
  WIZARD_SECTION_LABEL,
} from '../brandStudioStyles'

interface LogoStepProps {
  draft: Partial<BrandDNA>
  dispatch: React.Dispatch<WizardAction>
  userId: string
}

export function LogoStep({ draft, dispatch, userId }: LogoStepProps) {
  const { t } = useTranslation('brandStudio')
  const [isUploading, setIsUploading] = useState(false)
  const [variations, setVariations] = useState<LogoVariation[]>([])
  const [variationsLoading, setVariationsLoading] = useState(false)
  const prevLogoRef = useRef<string | null>(null)

  // Build effective logos array from draft
  const logos: { url: string; selected?: boolean }[] = draft.logos?.length
    ? draft.logos
    : draft.logo_url
      ? [{ url: draft.logo_url, selected: true }]
      : []

  // Generate variations when primary logo changes
  const primaryLogoUrl = logos[0]?.url
  useEffect(() => {
    if (!primaryLogoUrl || primaryLogoUrl === prevLogoRef.current) return
    prevLogoRef.current = primaryLogoUrl
    setVariationsLoading(true)
    generateLogoVariations(primaryLogoUrl).then((vars) => {
      setVariations(vars)
      setVariationsLoading(false)
    })
  }, [primaryLogoUrl])

  const updateLogos = useCallback(
    (newLogos: { url: string; selected?: boolean }[]) => {
      dispatch({
        type: 'UPDATE_DRAFT',
        data: {
          logos: newLogos,
          logo_url: newLogos[0]?.url || undefined,
        },
      })
    },
    [dispatch]
  )

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      setIsUploading(true)
      try {
        const fileArray = Array.from(files)
        for (const file of fileArray) {
          if (logos.length >= 6) break
          const formData = new FormData()
          formData.append('file', file)
          formData.append('assetKind', 'logo')
          const result = await uploadBrandImage(formData)
          if (result.url) {
            const newLogos = [...logos, { url: result.url, selected: true }]
            updateLogos(newLogos)
          }
        }
      } catch (err) {
        console.error('Logo upload failed:', err)
      } finally {
        setIsUploading(false)
      }
    },
    [logos, updateLogos]
  )

  const handleRemove = useCallback(
    (index: number) => {
      const newLogos = logos.filter((_, i) => i !== index)
      updateLogos(newLogos)
    },
    [logos, updateLogos]
  )

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newLogos = [...logos]
      const [moved] = newLogos.splice(fromIndex, 1)
      newLogos.splice(toIndex, 0, moved)
      updateLogos(newLogos)
    },
    [logos, updateLogos]
  )

  const handleToggle = useCallback(
    (index: number) => {
      const newLogos = logos.map((l, i) => ({
        ...l,
        selected: i === index ? !(l.selected ?? true) : l.selected,
      }))
      updateLogos(newLogos)
    },
    [logos, updateLogos]
  )

  const handleAddVariation = useCallback(
    (variation: LogoVariation) => {
      if (logos.length >= 6) return
      // Convert data URL to blob and upload
      fetch(variation.dataUrl)
        .then((r) => r.blob())
        .then((blob) => {
          const file = new File([blob], `logo-${variation.type}.png`, { type: 'image/png' })
          return handleUpload([file])
        })
    },
    [logos, handleUpload]
  )

  const handleDownloadVariation = useCallback((variation: LogoVariation) => {
    const brandName = (draft.brand_name || 'brand').replace(/\s+/g, '-').toLowerCase()
    downloadDataUrl(variation.dataUrl, `${brandName}-logo-${variation.type}.png`)
  }, [draft.brand_name])

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
          <h1 className={WIZARD_TITLE}>{t('logo.title')}</h1>
          <p className={WIZARD_SUBTITLE}>{t('logo.subtitle')}</p>
        </motion.div>

        {/* Logos — reuse existing LogoCard component */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <LogoCard
            logos={logos}
            onUpload={handleUpload}
            onRemove={handleRemove}
            onReorder={handleReorder}
            onToggle={handleToggle}
            isUploading={isUploading}
            compactGrid
          />
        </motion.div>

        {/* ── Variations section ──────────────────────────── */}
        {primaryLogoUrl && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <p className={WIZARD_SECTION_LABEL}>{t('logo.variationsTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('logo.variationsSubtitle')}</p>
            </div>

            {variationsLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="aspect-[4/3] rounded-[1.35rem] border border-border/50 bg-muted/20"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            ) : variations.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {variations.map((variation) => {
                  const bgClass =
                    variation.type === 'transparent' || variation.type === 'grayscale'
                      ? 'transparency-grid'
                      : variation.type === 'mono'
                        ? 'bg-white'
                        : 'transparency-grid'
                  return (
                  <div
                    key={variation.type}
                    className="group relative overflow-hidden rounded-[1.35rem] border border-border/65 bg-[linear-gradient(180deg,hsl(var(--surface-alt))/0.74,white)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_18px_42px_-36px_rgba(15,23,42,0.14)] transition-all"
                  >
                    {/* Preview */}
                    <div
                      className={`flex items-center justify-center p-5 min-h-[120px] ${bgClass}`}
                    >
                      <img
                        src={variation.dataUrl}
                        alt={variation.label}
                        className="max-h-[80px] w-auto object-contain"
                      />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-border/40 px-3 py-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {variation.label}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
                          onClick={() => handleAddVariation(variation)}
                          disabled={logos.length >= 6}
                          title={t('logo.addToKit')}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
                          onClick={() => handleDownloadVariation(variation)}
                          title={t('logo.download')}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            ) : null}
          </motion.div>
        )}
      </div>
    </div>
  )
}
