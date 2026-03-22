'use client'

import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, ImagePlus, Loader2 } from 'lucide-react'
import { IconGlobe, IconInstagram, IconSparkles } from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { uploadBrandImage } from '@/app/actions/upload-image'
import { cn } from '@/lib/utils'
import type { SourceType, WizardAction } from '../hooks/useWizardState'
import {
  WIZARD_STEP_CONTAINER,
  WIZARD_STEP_CONTENT,
  WIZARD_TITLE,
  WIZARD_SUBTITLE,
  WIZARD_CARD,
  WIZARD_CARD_ACTIVE,
  WIZARD_INPUT,
  WIZARD_DIVIDER_WITH_TEXT,
  WIZARD_UPLOAD_ZONE,
  WIZARD_GHOST_BUTTON,
} from '../brandStudioStyles'

// ── URL sanitization ────────────────────────────────────────
function sanitizeWebUrl(raw: string): string {
  let url = raw.trim()
  if (!url) return url

  // Strip any protocol the user may have pasted
  url = url.replace(/^https?:\/\//i, '')
  // Strip leftover protocol fragments (htp://, htps://, ://, etc.)
  url = url.replace(/^[a-z]*:?\/*\s*/i, (m) => {
    // Keep the match if it looks like a domain start (e.g. "www")
    return /^[a-z0-9]/i.test(m) && !m.includes(':') ? m : ''
  })
  // Remove trailing slashes
  url = url.replace(/\/+$/, '')

  return url ? `https://${url}` : ''
}

function sanitizeInstagramHandle(raw: string): string {
  let handle = raw.trim()
  if (!handle) return handle

  // Strip full Instagram URL to just the handle
  const urlMatch = handle.match(/(?:instagram\.com|instagr\.am)\/([A-Za-z0-9_.]+)/i)
  if (urlMatch) {
    handle = urlMatch[1]
  }

  // Remove leading @ for normalization, then re-add
  handle = handle.replace(/^@+/, '')

  // Keep only valid characters
  handle = handle.replace(/[^A-Za-z0-9_.]/g, '')

  return handle ? `@${handle}` : ''
}

interface SourceStepProps {
  sourceType: SourceType | null
  webUrl: string
  instagramHandle: string
  uploadedImages: string[]
  dispatch: React.Dispatch<WizardAction>
  onNext: () => void
}

const springTransition = { type: 'spring' as const, stiffness: 400, damping: 25 }

export function SourceStep({
  sourceType,
  webUrl,
  instagramHandle,
  uploadedImages,
  dispatch,
  onNext,
}: SourceStepProps) {
  const { t } = useTranslation('brandStudio')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const webActive =
    sourceType === 'web' || sourceType === 'both'
  const instagramActive =
    sourceType === 'instagram' || sourceType === 'both'
  const scratchActive = sourceType === 'scratch'

  const canProceed = (() => {
    if (scratchActive) return true
    if (sourceType === 'both') return webUrl.length > 5 && instagramHandle.length > 1
    if (sourceType === 'web') return webUrl.length > 5
    if (sourceType === 'instagram') return instagramHandle.length > 1
    return false
  })()

  const handleSubmit = () => {
    if (!canProceed) return
    // Sanitize before advancing
    if (webActive && webUrl) {
      const sanitized = sanitizeWebUrl(webUrl)
      if (sanitized !== webUrl) dispatch({ type: 'SET_WEB_URL', url: sanitized })
    }
    if (instagramActive && instagramHandle) {
      const sanitized = sanitizeInstagramHandle(instagramHandle)
      if (sanitized !== instagramHandle) dispatch({ type: 'SET_INSTAGRAM_HANDLE', handle: sanitized })
    }
    onNext()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  const handleWebBlur = () => {
    if (webUrl) {
      const sanitized = sanitizeWebUrl(webUrl)
      if (sanitized !== webUrl) {
        dispatch({ type: 'SET_WEB_URL', url: sanitized })
      }
    }
  }

  const handleInstagramBlur = () => {
    if (instagramHandle) {
      const sanitized = sanitizeInstagramHandle(instagramHandle)
      if (sanitized !== instagramHandle) {
        dispatch({ type: 'SET_INSTAGRAM_HANDLE', handle: sanitized })
      }
    }
  }

  const handleUpload = async (files: FileList | File[]) => {
    if (files.length === 0) return
    setIsUploading(true)
    setError(null)

    const newUploadedImages: string[] = []
    let hasError = false

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('assetKind', 'image')
        
        const result = await uploadBrandImage(formData)
        if (result.success && result.url) {
          newUploadedImages.push(result.url)
        } else {
          setError(result.error || t('images.uploadError'))
          hasError = true
          break
        }
      }

      if (newUploadedImages.length > 0) {
        dispatch({ type: 'ADD_UPLOADED_IMAGES', urls: newUploadedImages })
      }
    } catch (err) {
      setError(t('images.uploadError'))
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleUpload(e.target.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) handleUpload(e.dataTransfer.files)
  }

  return (
    <div className={WIZARD_STEP_CONTAINER}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`${WIZARD_STEP_CONTENT} text-center`}
      >
        {/* ── Title ────────────────────────────────────────── */}
        <div className="space-y-2">
          <h1 className={WIZARD_TITLE}>{t('source.title')}</h1>
          <p className={WIZARD_SUBTITLE}>{t('source.subtitle')}</p>
        </div>

        {/* ── Analysis Cards (multi-select) ────────────────── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Web Card */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, ...springTransition }}
            onClick={() => dispatch({ type: 'TOGGLE_SOURCE', source: 'web' })}
            className={`${webActive ? WIZARD_CARD_ACTIVE : WIZARD_CARD} cursor-pointer`}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox indicator (multi-select) */}
              <div className={cn(
                'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200',
                webActive ? 'border-primary bg-primary' : 'border-border/80'
              )}>
                <AnimatePresence>
                  {webActive && (
                    <motion.svg
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={springTransition}
                      className="h-3 w-3 text-primary-foreground"
                      viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
                    >
                      <path d="M2.5 6L5 8.5L9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
                    </motion.svg>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <IconGlobe className="h-7 w-7 text-muted-foreground" />
                  <span className="text-xl font-semibold">{t('source.web.title')}</span>
                </div>
                <p className="text-lg leading-snug text-muted-foreground">
                  {t('source.web.subtitle')}
                </p>
              </div>
            </div>

            {/* Input field (animated) */}
            <AnimatePresence>
              {webActive && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={`${WIZARD_INPUT} mt-3 w-full flex items-center gap-0 !px-0 overflow-hidden`}>
                    <span className="shrink-0 pl-5 !text-xl text-muted-foreground/50 select-none">https://</span>
                    <input
                      autoFocus
                      value={webUrl.replace(/^https?:\/\//i, '')}
                      onChange={(e) =>
                        dispatch({ type: 'SET_WEB_URL', url: `https://${e.target.value.replace(/^https?:\/\//i, '')}` })
                      }
                      onBlur={handleWebBlur}
                      placeholder="tu-web.com"
                      className="flex-1 bg-transparent px-1 pr-5 !text-xl outline-none placeholder:text-muted-foreground/40"
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Instagram Card */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, ...springTransition }}
            onClick={() => dispatch({ type: 'TOGGLE_SOURCE', source: 'instagram' })}
            className={`${instagramActive ? WIZARD_CARD_ACTIVE : WIZARD_CARD} cursor-pointer`}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox indicator (multi-select) */}
              <div className={cn(
                'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200',
                instagramActive ? 'border-primary bg-primary' : 'border-border/80'
              )}>
                <AnimatePresence>
                  {instagramActive && (
                    <motion.svg
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={springTransition}
                      className="h-3 w-3 text-primary-foreground"
                      viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
                    >
                      <path d="M2.5 6L5 8.5L9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
                    </motion.svg>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <IconInstagram className="h-7 w-7 text-muted-foreground" />
                  <span className="text-xl font-semibold">{t('source.instagram.title')}</span>
                </div>
                <p className="text-lg leading-snug text-muted-foreground">
                  {t('source.instagram.subtitle')}
                </p>
              </div>
            </div>

            {/* Input field (animated) */}
            <AnimatePresence>
              {instagramActive && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Input
                    autoFocus
                    value={instagramHandle}
                    onChange={(e) =>
                      dispatch({ type: 'SET_INSTAGRAM_HANDLE', handle: e.target.value })
                    }
                    onBlur={handleInstagramBlur}
                    placeholder={t('source.instagram.placeholder')}
                    className={`${WIZARD_INPUT} mt-3 w-full`}
                    onKeyDown={handleKeyDown}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* ── Divider ──────────────────────────────────────── */}
        <div className={WIZARD_DIVIDER_WITH_TEXT}>{t('source.or')}</div>

        {/* ── Scratch Card (exclusive) ─────────────────────── */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, ...springTransition }}
          onClick={() => dispatch({ type: 'SET_SCRATCH' })}
          className={`${scratchActive ? WIZARD_CARD_ACTIVE : WIZARD_CARD} w-full cursor-pointer`}
        >
          <div className="flex items-start gap-3">
            {/* Radio indicator (exclusive) */}
            <div className={cn(
              'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
              scratchActive ? 'border-primary' : 'border-border/80'
            )}>
              <AnimatePresence>
                {scratchActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={springTransition}
                    className="h-2.5 w-2.5 rounded-full bg-primary"
                  />
                )}
              </AnimatePresence>
            </div>

            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <IconSparkles className="h-7 w-7 text-muted-foreground" />
                <span className="text-xl font-semibold">{t('source.scratch.title')}</span>
              </div>
              <p className="text-lg leading-snug text-muted-foreground">
                {t('source.scratch.subtitle')}
              </p>
            </div>
          </div>
        </motion.button>

        {/* ── Upload Section (subtle) ──────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="space-y-2 pt-2"
        >
          <p className="text-[0.8rem] font-medium text-muted-foreground/70">
            {t('source.upload.title')}
          </p>
          <p className="text-[0.75rem] text-muted-foreground/50">
            {t('source.upload.subtitle')}
          </p>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`${WIZARD_UPLOAD_ZONE} mx-auto flex min-h-[140px] w-full max-w-sm cursor-pointer flex-col items-center justify-center gap-2 py-5 transition-all ${
              isDragging ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : ''
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <ImagePlus className="h-6 w-6" />
              )}
            </div>
            
            <div className="text-center">
              <span className={`${WIZARD_GHOST_BUTTON} inline-flex items-center gap-1.5`}>
                <Upload className="h-3.5 w-3.5" />
                {isUploading ? t('images.uploading') : t('source.upload.button')}
              </span>
              {!isUploading && (
                <p className="mt-1 text-[0.7rem] text-muted-foreground/40">
                  {t('images.uploadZone')}
                </p>
              )}
            </div>

            {error && (
              <p className="mt-2 text-[0.7rem] font-medium text-destructive">{error}</p>
            )}
          </div>

          {/* Uploaded images preview */}
          {uploadedImages.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {uploadedImages.map((url) => (
                <div key={url} className="group relative h-14 w-14 overflow-hidden rounded-lg border border-border/50">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'REMOVE_UPLOADED_IMAGE', url })}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <span className="text-xs font-bold text-white">x</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </motion.div>
      </motion.div>
    </div>
  )
}
