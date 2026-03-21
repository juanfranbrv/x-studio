'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
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
  WIZARD_CHIP,
  WIZARD_CHIP_ACTIVE,
  WIZARD_GHOST_BUTTON,
} from '../brandStudioStyles'

interface PersonalityStepProps {
  draft: Partial<BrandDNA>
  proposals: BrandProposals | null
  dispatch: React.Dispatch<WizardAction>
  onRegenerate?: () => void
  isRegenerating?: boolean
}

type Category = 'toneOfVoice' | 'values'

const MAX_CHIPS = 5

const CATEGORIES: {
  key: Category
  draftField: keyof Pick<BrandDNA, 'tone_of_voice' | 'brand_values'>
}[] = [
  { key: 'toneOfVoice', draftField: 'tone_of_voice' },
  { key: 'values', draftField: 'brand_values' },
]

export function PersonalityStep({ draft, proposals, dispatch, onRegenerate, isRegenerating = false }: PersonalityStepProps) {
  const { t } = useTranslation('brandStudio')
  const personality = proposals?.personality

  // Track which categories are currently regenerating individually
  const [regeneratingCats, setRegeneratingCats] = useState<Set<Category>>(new Set())

  // Initialize selected state from draft or pre-select all AI suggestions
  const [selected, setSelected] = useState<Record<Category, Set<string>>>(() => {
    const initial: Record<Category, Set<string>> = {
      toneOfVoice: new Set(draft.tone_of_voice ?? []),
      values: new Set(draft.brand_values ?? []),
    }
    if (personality) {
      if (initial.toneOfVoice.size === 0) initial.toneOfVoice = new Set(personality.toneOfVoice)
      if (initial.values.size === 0) initial.values = new Set(personality.values)
    }
    return initial
  })

  // Re-init if proposals arrive after mount
  useEffect(() => {
    if (!personality) return
    setSelected((prev) => ({
      toneOfVoice: prev.toneOfVoice.size > 0 ? prev.toneOfVoice : new Set(personality.toneOfVoice),
      values: prev.values.size > 0 ? prev.values : new Set(personality.values),
    }))
    // Clear regenerating state when new proposals arrive
    setRegeneratingCats(new Set())
  }, [personality])

  // Sync to draft on selection change
  useEffect(() => {
    dispatch({
      type: 'UPDATE_DRAFT',
      data: {
        tone_of_voice: Array.from(selected.toneOfVoice),
        brand_values: Array.from(selected.values),
      },
    })
  }, [selected, dispatch])

  const toggleChip = (category: Category, chip: string) => {
    setSelected((prev) => {
      const next = new Set(prev[category])
      if (next.has(chip)) {
        next.delete(chip)
      } else if (next.size < MAX_CHIPS) {
        next.add(chip)
      }
      return { ...prev, [category]: next }
    })
  }

  // Build ordered chips: selected first, then up to MAX_CHIPS unselected proposals
  const getOrderedChips = (category: Category): { chip: string; isSelected: boolean }[] => {
    if (!personality) return []
    const allProposals = personality[category] ?? []
    const sel = selected[category]
    const selectedChips = Array.from(sel)
    const unselectedChips = allProposals
      .filter((c) => !sel.has(c))
      .slice(0, MAX_CHIPS)
    return [
      ...selectedChips.map((chip) => ({ chip, isSelected: true })),
      ...unselectedChips.map((chip) => ({ chip, isSelected: false })),
    ]
  }

  const handleRegenerateCategory = useCallback((category: Category) => {
    if (!onRegenerate) return
    setRegeneratingCats((prev) => new Set(prev).add(category))
    onRegenerate()
  }, [onRegenerate])

  // Empty state when no proposals at all
  if (!personality) {
    return (
      <div className={WIZARD_STEP_CONTAINER}>
        <div className={WIZARD_STEP_CONTENT}>
          <div className="space-y-4 text-center">
            <p className={WIZARD_SUBTITLE}>{t('personality.noProposals')}</p>
            {onRegenerate && (
              <Button variant="outline" onClick={onRegenerate} disabled={isRegenerating}>
                {isRegenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                {t('personality.regenerate')}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
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
          <h1 className={WIZARD_TITLE}>{t('personality.title')}</h1>
          <p className={WIZARD_SUBTITLE}>{t('personality.subtitle')}</p>
        </motion.div>

        {/* Categories */}
        <div className="space-y-[clamp(1.25rem,3vh,2rem)]">
          {CATEGORIES.map(({ key }, catIdx) => {
            const chips = getOrderedChips(key)
            const selectedCount = selected[key].size
            const allSlotsFilled = selectedCount >= MAX_CHIPS
            const isCatRegenerating = isRegenerating && regeneratingCats.has(key)

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (catIdx + 1), duration: 0.4 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h2 className={WIZARD_SECTION_LABEL}>
                    {t(`personality.${key}`)}
                    <span className="ml-2 text-xs font-normal normal-case tracking-normal text-muted-foreground/60">
                      {selectedCount}/{MAX_CHIPS}
                    </span>
                  </h2>
                  {onRegenerate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRegenerateCategory(key)}
                      disabled={allSlotsFilled || isRegenerating}
                      className="h-7 gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {isCatRegenerating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                      {isCatRegenerating ? t('personality.regenerating') : t('personality.newOptions')}
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence mode="popLayout">
                    {chips.map(({ chip, isSelected }, i) => (
                      <motion.button
                        key={chip}
                        layout
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ delay: 0.03 * i, duration: 0.25 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => toggleChip(key, chip)}
                        className={isSelected ? WIZARD_CHIP_ACTIVE : WIZARD_CHIP}
                      >
                        {chip}
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
