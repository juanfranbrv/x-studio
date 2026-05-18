'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { IconArrowDown, IconArrowUp, IconCheckCircle, IconFingerprint, IconImage, IconUpload, IconClose } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { ReferenceImageRole } from '@/lib/creation-flow-types'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

const MAX_REFERENCE_IMAGES = 10
const MAX_AUX_LOGOS = 4
const AUX_ACTION_BUTTON_CLASS = 'min-h-[42px] h-auto justify-center rounded-[1rem] px-4 py-2 text-center text-[clamp(0.93rem,0.89rem+0.12vw,1rem)] font-medium leading-tight whitespace-normal'
const AUX_MODAL_CLASS = 'h-[min(88vh,860px)] w-[min(92vw,1120px)] !max-w-[min(92vw,1120px)] overflow-hidden rounded-[1.9rem] border border-border/70 bg-background/98 p-0 shadow-[0_38px_100px_-56px_rgba(15,23,42,0.42)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-[0.985] data-[state=closed]:zoom-out-[0.985] data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-2 duration-200 flex flex-col'
const AUX_REMOVE_BUTTON_CLASS = 'absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-black/70'

interface AuxiliaryLogosCardProps {
  uploadedImages: string[]
  onUpload: (file: File, roleHint?: ReferenceImageRole) => void
  onRemoveUploadedImage?: (url: string) => void
  brandKitImages?: Array<{ id: string; url: string; name?: string }>
  brandKitLogos?: Array<{ id: string; url: string; name?: string }>
  onRefreshBrandKitContent?: () => Promise<void> | void
  selectedBrandKitImageIds?: string[]
  onToggleBrandKitImage?: (imageId: string) => void
  referenceImageRoles?: Record<string, ReferenceImageRole>
  onReferenceRoleChange?: (imageId: string, role: ReferenceImageRole) => void
}

const isAuxLogoRole = (role?: ReferenceImageRole) => role === 'logo'

export function AuxiliaryLogosCard({
  uploadedImages = [],
  onUpload,
  onRemoveUploadedImage,
  brandKitImages = [],
  brandKitLogos = [],
  onRefreshBrandKitContent,
  selectedBrandKitImageIds = [],
  onToggleBrandKitImage,
  referenceImageRoles = {},
  onReferenceRoleChange,
}: AuxiliaryLogosCardProps) {
  const { t } = useTranslation('common')
  const tt = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...options })

  const [collapsed, setCollapsed] = useState(true)
  const [isBrandKitModalOpen, setIsBrandKitModalOpen] = useState(false)
  const [isRefreshingBrandKit, setIsRefreshingBrandKit] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const previousUploadedRef = useRef<string[]>(uploadedImages)
  const waitingForUploadedAuxRef = useRef(false)

  const globalReferenceCount = uploadedImages.length + selectedBrandKitImageIds.length

  const auxUploadedIds = useMemo(
    () => uploadedImages.filter((id) => isAuxLogoRole(referenceImageRoles[id])),
    [uploadedImages, referenceImageRoles]
  )

  const auxBrandKitIds = useMemo(
    () => selectedBrandKitImageIds.filter((id) => isAuxLogoRole(referenceImageRoles[id])),
    [selectedBrandKitImageIds, referenceImageRoles]
  )

  const auxTotalCount = auxUploadedIds.length + auxBrandKitIds.length
  const canAddMoreAux = auxTotalCount < MAX_AUX_LOGOS && globalReferenceCount < MAX_REFERENCE_IMAGES

  const brandKitSources = useMemo(
    () => (brandKitImages.length > 0 ? brandKitImages : brandKitLogos),
    [brandKitImages, brandKitLogos]
  )

  const brandKitAssetMap = useMemo(() => {
    const map = new Map<string, { id: string; url: string; name?: string }>()
    brandKitSources.forEach((item) => map.set(item.id, item))
    return map
  }, [brandKitSources])

  useEffect(() => {
    if (!waitingForUploadedAuxRef.current) {
      previousUploadedRef.current = uploadedImages
      return
    }

    const added = uploadedImages.filter((id) => !previousUploadedRef.current.includes(id))
    if (added.length === 0) return

    added.forEach((id) => onReferenceRoleChange?.(id, 'logo'))
    waitingForUploadedAuxRef.current = false
    previousUploadedRef.current = uploadedImages
  }, [uploadedImages, onReferenceRoleChange])

  const handleUploadFiles = useCallback((files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'))
    if (imageFiles.length === 0) return

    const availableGlobal = Math.max(0, MAX_REFERENCE_IMAGES - globalReferenceCount)
    const availableAux = Math.max(0, MAX_AUX_LOGOS - auxTotalCount)
    const available = Math.min(availableGlobal, availableAux)
    if (available <= 0) return

    waitingForUploadedAuxRef.current = true
    imageFiles.slice(0, available).forEach((file) => onUpload(file, 'logo'))
  }, [auxTotalCount, globalReferenceCount, onUpload])

  const removeAuxLogo = useCallback((id: string) => {
    if (uploadedImages.includes(id)) {
      onRemoveUploadedImage?.(id)
      return
    }
    if (selectedBrandKitImageIds.includes(id)) {
      onToggleBrandKitImage?.(id)
    }
  }, [onRemoveUploadedImage, onToggleBrandKitImage, selectedBrandKitImageIds, uploadedImages])

  const toggleAuxFromKit = useCallback((logo: { id: string; url: string; name?: string }) => {
    const isSelectedAsAux = auxBrandKitIds.includes(logo.id)
    if (isSelectedAsAux) {
      onToggleBrandKitImage?.(logo.id)
      return
    }

    if (!selectedBrandKitImageIds.includes(logo.id)) {
      if (globalReferenceCount >= MAX_REFERENCE_IMAGES) return
      if (auxTotalCount >= MAX_AUX_LOGOS) return
      onToggleBrandKitImage?.(logo.id)
    }

    onReferenceRoleChange?.(logo.id, 'logo')
  }, [auxBrandKitIds, auxTotalCount, globalReferenceCount, onReferenceRoleChange, onToggleBrandKitImage, selectedBrandKitImageIds])

  const selectedBrandKitAssets = useMemo(
    () => auxBrandKitIds
      .map((id) => brandKitAssetMap.get(id) || { id, url: id, name: tt('auxLogos.auxResource', 'Auxiliary asset') })
      .filter((item) => Boolean(item?.url)),
    [auxBrandKitIds, brandKitAssetMap]
  )

  const hasAuxLogos = auxUploadedIds.length > 0 || selectedBrandKitAssets.length > 0

  useEffect(() => {
    if (hasAuxLogos) {
      setCollapsed(false)
    }
  }, [hasAuxLogos])

  const refreshBrandKitContent = useCallback(async () => {
    if (!onRefreshBrandKitContent) return
    try {
      setIsRefreshingBrandKit(true)
      await onRefreshBrandKitContent()
    } finally {
      setIsRefreshingBrandKit(false)
    }
  }, [onRefreshBrandKitContent])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center text-foreground/72">
            <IconFingerprint className="h-[18px] w-[18px]" />
          </div>
          <h3 className="text-[0.94rem] font-bold uppercase tracking-[0.14em] text-foreground/92">{tt('auxLogos.title', 'Auxiliary logos')}</h3>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => {
            if (hasAuxLogos) {
              setCollapsed(false)
              return
            }
            setCollapsed((prev) => !prev)
          }}
          aria-label={collapsed
            ? tt('auxLogos.expandAria', 'Expand auxiliary logos')
            : tt('auxLogos.collapseAria', 'Collapse auxiliary logos')}
        >
          {collapsed ? <IconArrowDown className="h-[18px] w-[18px]" /> : <IconArrowUp className="h-[18px] w-[18px]" />}
        </Button>
      </div>

      {!collapsed ? (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className={cn(AUX_ACTION_BUTTON_CLASS, 'gap-2')}
              onClick={() => inputRef.current?.click()}
              disabled={!canAddMoreAux}
            >
              <IconUpload className="h-3.5 w-3.5" />
              {tt('auxLogos.upload', 'Upload logos')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={cn(AUX_ACTION_BUTTON_CLASS, 'gap-2')}
              onClick={() => setIsBrandKitModalOpen(true)}
            >
              <IconFingerprint className="h-3.5 w-3.5" />
              {tt('auxLogos.fromBrandKit', 'Desde Kit de marca')}
            </Button>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleUploadFiles(Array.from(e.target.files || []))
              if (inputRef.current) inputRef.current.value = ''
            }}
          />

          {hasAuxLogos ? (
            <div className="grid grid-cols-3 gap-2.5">
              {auxUploadedIds.map((url, index) => (
                <div key={url} className="group relative aspect-square overflow-hidden rounded-[1.15rem] border border-border/65 bg-background shadow-[0_18px_38px_-30px_rgba(15,23,42,0.28)]">
                  <img src={url} alt={tt('auxLogos.uploadedAlt', 'Uploaded auxiliary logo {{index}}', { index: index + 1 })} className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded-full border border-sky-500/20 bg-sky-500/90 px-2 py-1 text-[0.7rem] font-semibold text-white shadow-sm">
                    {tt('auxLogos.uploadedBadge', 'Uploaded')}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAuxLogo(url)}
                    className={AUX_REMOVE_BUTTON_CLASS}
                    aria-label={tt('auxLogos.removeAria', 'Remove auxiliary logo')}
                  >
                    <IconClose className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {selectedBrandKitAssets.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => removeAuxLogo(item.id)}
                  className="group relative aspect-square overflow-hidden rounded-[1.15rem] border border-border/65 bg-background shadow-[0_18px_38px_-30px_rgba(15,23,42,0.28)]"
                  title={tt('auxLogos.removeTitle', 'Remove auxiliary logo')}
                >
                  <img src={item.url} alt={item.name || tt('auxLogos.brandKitAssetAlt', 'Recurso auxiliar de Kit de marca')} className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded-full border border-emerald-500/20 bg-emerald-500/90 px-2 py-1 text-[0.7rem] font-semibold text-white shadow-sm">
                    {tt('auxLogos.brandKitBadge', 'Kit')}
                  </span>
                  <span className={AUX_REMOVE_BUTTON_CLASS}>
                    <IconClose className="h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div
              onClick={() => inputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[1.4rem] border border-dashed border-border/80 bg-background/72 px-5 py-6 text-center transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] hover:border-primary/35 hover:bg-background hover:shadow-[0_16px_38px_-30px_rgba(15,23,42,0.2)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] border border-border/70 bg-background transition-colors">
                <IconImage className="h-4.5 w-4.5 text-muted-foreground" />
              </div>
              <p className="text-[clamp(0.96rem,0.92rem+0.1vw,1.02rem)] font-semibold text-foreground/92">
                {tt('auxLogos.emptyTitle', 'Añade logos auxiliares')}
              </p>
              <p className="text-[clamp(0.84rem,0.8rem+0.08vw,0.9rem)] text-muted-foreground">
                {tt('auxLogos.emptyHint', 'Add one or more auxiliary logos to use them as secondary brand support.')}
              </p>
            </div>
          )}
        </div>
      ) : null}

      <Dialog open={isBrandKitModalOpen} onOpenChange={setIsBrandKitModalOpen}>
        <DialogContent className={AUX_MODAL_CLASS}>
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.972 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogHeader className="px-7 pb-2 pt-7 pr-20">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <DialogTitle className="text-[clamp(1.08rem,1.02rem+0.14vw,1.18rem)] font-semibold tracking-[-0.01em]">
                    {tt('auxLogos.selectFromBrandKitTitle', 'Selecciona logos auxiliares desde Kit de marca')}
                  </DialogTitle>
                  <DialogDescription className="text-[0.94rem] leading-relaxed text-muted-foreground">
                    {tt('auxLogos.selectFromBrandKitDescription', 'Aquí se muestran las imágenes del Kit de marca para que puedas elegir logos auxiliares o recursos visuales secundarios.')}
                  </DialogDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(AUX_ACTION_BUTTON_CLASS, 'min-w-[152px]')}
                  onClick={() => void refreshBrandKitContent()}
                  disabled={isRefreshingBrandKit}
                >
                  {isRefreshingBrandKit
                    ? tt('auxLogos.refreshing', 'Refreshing...')
                    : tt('auxLogos.refresh', 'Refresh Kit')}
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto px-7 py-6">
              {brandKitSources.length > 0 ? (
                <div className="grid content-start [grid-template-columns:repeat(auto-fill,minmax(120px,1fr))] gap-4 sm:[grid-template-columns:repeat(auto-fill,minmax(132px,1fr))]">
                  {brandKitSources.map((item, index) => {
                    const isSelected = auxBrandKitIds.includes(item.id)
                    const canSelect = isSelected || (
                      (globalReferenceCount < MAX_REFERENCE_IMAGES || selectedBrandKitImageIds.includes(item.id)) &&
                      (auxTotalCount < MAX_AUX_LOGOS || auxBrandKitIds.includes(item.id))
                    )

                    return (
                      <motion.button
                        key={item.id}
                        type="button"
                        initial={{ opacity: 0, y: 10, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.18, delay: Math.min(0.012 * (index + 1), 0.14), ease: 'easeOut' }}
                        onClick={() => {
                          if (!canSelect) return
                          toggleAuxFromKit(item)
                        }}
                        className={cn(
                          'group relative w-full overflow-hidden rounded-[1.15rem] border aspect-square transition-all text-left',
                          isSelected
                            ? 'border-primary/30 bg-primary/[0.07] shadow-[0_18px_38px_-28px_rgba(120,142,84,0.42)]'
                            : canSelect
                              ? 'border-border/65 bg-background hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-30px_rgba(15,23,42,0.24)]'
                              : 'cursor-not-allowed border-border/50 bg-muted/30 opacity-50'
                        )}
                      >
                        <img src={item.url} alt={item.name || tt('auxLogos.brandKitImageAlt', 'Imagen de Kit de marca')} className="h-full w-full object-cover" />
                        {isSelected ? (
                          <IconCheckCircle className="absolute right-2.5 top-2.5 h-9 w-9 text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.62)]" />
                        ) : null}
                      </motion.button>
                    )
                  })}
                </div>
              ) : (
                <div className="mt-1 rounded-[1.15rem] border border-dashed border-border/70 bg-background/72 p-8 text-center text-[0.94rem] text-muted-foreground">
                  {tt('auxLogos.noBrandKitImages', 'Este Kit de marca todavía no tiene imágenes.')}
                </div>
              )}
            </div>

            <div className="flex justify-end px-7 pb-6 pt-2">
              <Button type="button" size="sm" className={AUX_ACTION_BUTTON_CLASS} onClick={() => setIsBrandKitModalOpen(false)}>
                {tt('actions.continue', 'Continue')}
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
