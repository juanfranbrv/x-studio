'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, RotateCcw } from 'lucide-react'
import { Loader2 } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
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

  // Build ordered items: selected first, then up to MAX_SELECTED unselected
  const getOrderedItems = (allProposals: string[], selected: Set<string>) => {
    const selectedItems = Array.from(selected)
    const unselected = allProposals.filter((item) => !selected.has(item)).slice(0, MAX_SELECTED)
    return [
      ...selectedItems.map((item) => ({ item, isSelected: true })),
      ...unselected.map((item) => ({ item, isSelected: false })),
    ]
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
            <Loader2 className="h-3 w-3 animate-spin" />
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
                <motion.button
                  key={item}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: 0.05 * i, duration: 0.3 }}
                  onClick={() => toggleItem(setSelectedTaglines, item)}
                  className={isSelected ? WIZARD_CARD_ACTIVE : WIZARD_CARD}
                >
                  <div className="flex items-center gap-4">
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
                </motion.button>
              ))}
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
                  className={isSelected ? WIZARD_CHIP_ACTIVE : WIZARD_CHIP}
                >
                  {item}
                </motion.button>
              ))}
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
                  className={isSelected ? WIZARD_CHIP_ACTIVE : WIZARD_CHIP}
                >
                  {item}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
