'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, RotateCcw, Plus, X } from 'lucide-react'
import { Loader2 } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { BrandDNA } from '@/lib/brand-types'
import type { BrandProposals } from '@/app/actions/generate-brand-proposals'
import type { WizardAction } from '../hooks/useWizardState'
import {
  WIZARD_STEP_CONTAINER,
  WIZARD_STEP_CONTENT,
  WIZARD_TITLE,
  WIZARD_SUBTITLE,
  WIZARD_SECTION_LABEL,
  WIZARD_CARD,
  WIZARD_CARD_ACTIVE,
  WIZARD_CHIP,
  WIZARD_CHIP_ACTIVE,
} from '../brandStudioStyles'

interface VoiceStepProps {
  draft: Partial<BrandDNA>
  proposals: BrandProposals | null
  dispatch: React.Dispatch<WizardAction>
  onRegenerate?: () => void
  isRegenerating?: boolean
}

const MAX_SELECTED = 5
type Section = 'taglines' | 'ctas' | 'hooks'

export function VoiceStep({ draft, proposals, dispatch, onRegenerate, isRegenerating = false }: VoiceStepProps) {
  const { t } = useTranslation('brandStudio')
  const voice = proposals?.voice

  const [regeneratingSection, setRegeneratingSection] = useState<Section | null>(null)

  // ── Taglines: multi-select (up to MAX_SELECTED) ──
  const [selectedTaglines, setSelectedTaglines] = useState<Set<string>>(() => {
    if (draft.tagline) return new Set([draft.tagline])
    return new Set<string>()
  })

  // ── CTAs: multi-select (up to MAX_SELECTED) ──
  const [selectedCtas, setSelectedCtas] = useState<Set<string>>(() => {
    return new Set(draft.text_assets?.ctas ?? [])
  })

  // ── Marketing hooks: multi-select (up to MAX_SELECTED) ──
  const [selectedHooks, setSelectedHooks] = useState<Set<string>>(() => {
    return new Set(draft.text_assets?.marketing_hooks ?? [])
  })

  const [customInputs, setCustomInputs] = useState<Record<Section, string>>({
    taglines: '',
    ctas: '',
    hooks: '',
  })

  // Re-init when proposals arrive
  useEffect(() => {
    if (!voice) return
    setSelectedTaglines((prev) => (prev.size > 0 ? prev : new Set(voice.taglines)))
    setSelectedCtas((prev) => (prev.size > 0 ? prev : new Set(voice.ctas)))
    setSelectedHooks((prev) => (prev.size > 0 ? prev : new Set(voice.marketingHooks)))
    setRegeneratingSection(null)
  }, [voice])

  // Sync to draft
  useEffect(() => {
    const taglineArray = Array.from(selectedTaglines)
    dispatch({
      type: 'UPDATE_DRAFT',
      data: {
        tagline: taglineArray[0] ?? '',
        text_assets: {
          ...draft.text_assets,
          marketing_hooks: Array.from(selectedHooks),
          visual_keywords: draft.text_assets?.visual_keywords ?? [],
          brand_context: draft.text_assets?.brand_context ?? '',
          ctas: Array.from(selectedCtas),
        },
      },
    })
  }, [selectedTaglines, selectedCtas, selectedHooks, dispatch])

  const toggleItem = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, item: string) => {
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(item)) {
        next.delete(item)
      } else if (next.size < MAX_SELECTED) {
        next.add(item)
      }
      return next
    })
  }

  const addCustomItem = (section: Section, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    const value = customInputs[section].trim()
    if (!value) return
    
    setter((prev) => {
      const next = new Set(prev)
      if (!next.has(value) && next.size < MAX_SELECTED) {
        next.add(value)
      }
      return next
    })
    
    setCustomInputs(prev => ({ ...prev, [section]: '' }))
  }

  const removeItem = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, item: string) => {
    setter((prev) => {
      const next = new Set(prev)
      next.delete(item)
      return next
    })
  }

  // Build ordered items: always returns exactly MAX_SELECTED items.
  // Selected first, then fill remaining slots with unselected proposals.
  const getOrderedItems = (allProposals: string[], selected: Set<string>) => {
    const selectedItems = Array.from(selected)
    const freeSlots = MAX_SELECTED - selectedItems.length
    const unselected = allProposals.filter((item) => !selected.has(item)).slice(0, freeSlots)
    return [
      ...selectedItems.map((item) => ({ item, isSelected: true })),
      ...unselected.map((item) => ({ item, isSelected: false })),
    ].slice(0, MAX_SELECTED)
  }

  const handleRegenerateSection = useCallback(
    (section: Section) => {
      if (!onRegenerate) return
      setRegeneratingSection(section)
      onRegenerate()
    },
    [onRegenerate],
  )

  // Empty state
  if (!voice) {
    return (
      <div className={WIZARD_STEP_CONTAINER}>
        <div className={WIZARD_STEP_CONTENT}>
          <div className="space-y-4 text-center">
            <p className={WIZARD_SUBTITLE}>{t('voice.noProposals')}</p>
            {onRegenerate && (
              <Button variant="outline" onClick={onRegenerate} disabled={isRegenerating}>
                {isRegenerating ? (
                  <Loader2 className="mr-2 h-4 w-4" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                {t('voice.regenerate')}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const taglineItems = getOrderedItems(voice.taglines, selectedTaglines)
  const ctaItems = getOrderedItems(voice.ctas, selectedCtas)
  const hookItems = getOrderedItems(voice.marketingHooks, selectedHooks)

  const renderSectionHeader = (
    label: string,
    count: number,
    section: Section,
    isFull: boolean,
  ) => (
    <div className="flex items-center justify-between">
      <h2 className={WIZARD_SECTION_LABEL}>
        {label}
        <span className="ml-2 text-xs font-normal normal-case tracking-normal text-muted-foreground/60">
          {count}/{MAX_SELECTED}
        </span>
      </h2>
      {onRegenerate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleRegenerateSection(section)}
          disabled={isFull || isRegenerating}
          className="h-7 gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {isRegenerating && regeneratingSection === section ? (
            <Loader2 className="h-3 w-3" />
          ) : (
            <RotateCcw className="h-3 w-3" />
          )}
          {isRegenerating && regeneratingSection === section
            ? t('voice.regenerating')
            : t('voice.newOptions')}
        </Button>
      )}
    </div>
  )

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
          <h1 className={WIZARD_TITLE}>{t('voice.title')}</h1>
          <p className={WIZARD_SUBTITLE}>{t('voice.subtitle')}</p>
        </motion.div>

        {/* Tagline section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="space-y-3"
        >
          {renderSectionHeader(
            t('voice.taglineSection'),
            selectedTaglines.size,
            'taglines',
            selectedTaglines.size >= MAX_SELECTED,
          )}
          <div className="grid gap-3">
            <AnimatePresence mode="popLayout">
              {taglineItems.map(({ item, isSelected }, i) => (
                <motion.div
                  key={item}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: 0.05 * i, duration: 0.3 }}
                  className={isSelected ? `${WIZARD_CARD_ACTIVE} group relative pr-12` : `${WIZARD_CARD} group relative pr-12`}
                >
                  <div className="flex flex-1 items-center gap-4 cursor-pointer py-4 pl-4" onClick={() => toggleItem(setSelectedTaglines, item)}>
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${
                        isSelected
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border/60 bg-transparent text-transparent'
                      }`}
                    >
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                    <p className="text-lg font-semibold leading-snug xl:text-xl 2xl:text-2xl">{item}</p>
                  </div>
                  {isSelected && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeItem(setSelectedTaglines, item)
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground/40 hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </motion.div>
              ))}
              {selectedTaglines.size < MAX_SELECTED && (
                <motion.div layout className="flex gap-2">
                  <Input
                    value={customInputs.taglines}
                    onChange={(e) => setCustomInputs(prev => ({ ...prev, taglines: e.target.value }))}
                    placeholder={t('voice.placeholder')}
                    className="h-14 rounded-2xl border-dashed bg-transparent px-6 text-lg focus-visible:ring-primary/30"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addCustomItem('taglines', setSelectedTaglines)
                    }}
                  />
                  <Button
                    variant="outline"
                    className="h-14 w-14 rounded-2xl border-dashed hover:bg-primary/10 hover:text-primary"
                    onClick={() => addCustomItem('taglines', setSelectedTaglines)}
                  >
                    <Plus className="h-6 w-6" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* CTAs section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="space-y-3"
        >
          {renderSectionHeader(
            t('voice.ctaSection'),
            selectedCtas.size,
            'ctas',
            selectedCtas.size >= MAX_SELECTED,
          )}
          <div className="flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {ctaItems.map(({ item, isSelected }, i) => (
                <motion.button
                  key={item}
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ delay: 0.03 * i, duration: 0.25 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => toggleItem(setSelectedCtas, item)}
                  className={`${isSelected ? WIZARD_CHIP_ACTIVE : WIZARD_CHIP} group relative pr-7`}
                >
                  {item}
                  {isSelected && (
                    <span 
                      onClick={(e) => {
                        e.stopPropagation()
                        removeItem(setSelectedCtas, item)
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-primary-foreground/40 hover:text-primary-foreground"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  )}
                </motion.button>
              ))}
              {selectedCtas.size < MAX_SELECTED && (
                <div className="flex items-center gap-2">
                  <Input
                    value={customInputs.ctas}
                    onChange={(e) => setCustomInputs(prev => ({ ...prev, ctas: e.target.value }))}
                    placeholder={t('voice.addCustom')}
                    className="h-9 w-[180px] rounded-full border-dashed bg-transparent px-4 text-sm focus-visible:ring-primary/30"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addCustomItem('ctas', setSelectedCtas)
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => addCustomItem('ctas', setSelectedCtas)}
                    className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Marketing hooks section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="space-y-3"
        >
          {renderSectionHeader(
            t('voice.hooksSection'),
            selectedHooks.size,
            'hooks',
            selectedHooks.size >= MAX_SELECTED,
          )}
          <div className="flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {hookItems.map(({ item, isSelected }, i) => (
                <motion.button
                  key={item}
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ delay: 0.03 * i, duration: 0.25 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => toggleItem(setSelectedHooks, item)}
                  className={`${isSelected ? WIZARD_CHIP_ACTIVE : WIZARD_CHIP} group relative pr-7`}
                >
                  {item}
                  {isSelected && (
                    <span 
                      onClick={(e) => {
                        e.stopPropagation()
                        removeItem(setSelectedHooks, item)
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-primary-foreground/40 hover:text-primary-foreground"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  )}
                </motion.button>
              ))}
              {selectedHooks.size < MAX_SELECTED && (
                <div className="flex items-center gap-2">
                  <Input
                    value={customInputs.hooks}
                    onChange={(e) => setCustomInputs(prev => ({ ...prev, hooks: e.target.value }))}
                    placeholder={t('voice.addCustom')}
                    className="h-9 w-[180px] rounded-full border-dashed bg-transparent px-4 text-sm focus-visible:ring-primary/30"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addCustomItem('hooks', setSelectedHooks)
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => addCustomItem('hooks', setSelectedHooks)}
                    className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
