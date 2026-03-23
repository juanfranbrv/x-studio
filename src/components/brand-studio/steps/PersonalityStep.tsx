'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { RotateCcw, Plus, X } from 'lucide-react'
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
  WIZARD_CHIP,
  WIZARD_CHIP_ACTIVE,
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

  const [selected, setSelected] = useState<Record<Category, string[]>>(() => ({
    toneOfVoice: draft.tone_of_voice ?? [],
    values: draft.brand_values ?? [],
  }))

  const [customInputs, setCustomInputs] = useState<Record<Category, string>>({
    toneOfVoice: '',
    values: '',
  })

  // Items explicitly removed by user — skipped on "Nuevas opciones" until pool exhausts
  const [dismissed, setDismissed] = useState<Record<Category, string[]>>({
    toneOfVoice: [],
    values: [],
  })

  // Replace selections whenever proposals change (covers initial load + language change regeneration)
  useEffect(() => {
    if (!personality) return
    setSelected({
      toneOfVoice: personality.toneOfVoice.slice(0, MAX_CHIPS),
      values: personality.values.slice(0, MAX_CHIPS),
    })
    setDismissed({ toneOfVoice: [], values: [] })
  }, [personality])

  // Sync to draft
  useEffect(() => {
    dispatch({
      type: 'UPDATE_DRAFT',
      data: {
        tone_of_voice: selected.toneOfVoice,
        brand_values: selected.values,
      },
    })
  }, [selected, dispatch])

  const removeChip = useCallback((category: Category, chip: string) => {
    setSelected((prev) => ({ ...prev, [category]: prev[category].filter((c) => c !== chip) }))
    setDismissed((prev) => ({ ...prev, [category]: [...prev[category], chip] }))
  }, [])

  const addCustomChip = useCallback((category: Category) => {
    const value = customInputs[category].trim()
    if (!value) return
    setSelected((prev) => {
      if (prev[category].includes(value) || prev[category].length >= MAX_CHIPS) return prev
      return { ...prev, [category]: [...prev[category], value] }
    })
    setCustomInputs((prev) => ({ ...prev, [category]: '' }))
  }, [customInputs])

  /** Fill empty slots skipping dismissed items — never calls AI */
  const handleFillCategory = useCallback((category: Category) => {
    if (!personality) return
    const pool = category === 'toneOfVoice' ? personality.toneOfVoice : personality.values
    if (pool.length === 0) return
    const current = selected[category]
    const dis = dismissed[category]
    const emptySlots = MAX_CHIPS - current.length
    if (emptySlots <= 0) return

    let available = pool.filter((item) => !current.includes(item) && !dis.includes(item))

    if (available.length < emptySlots) {
      // Pool exhausted — reset dismissed and retry
      setDismissed((prev) => ({ ...prev, [category]: [] }))
      available = pool.filter((item) => !current.includes(item))
    }

    const toAdd = available.slice(0, emptySlots)
    if (toAdd.length > 0) {
      setSelected((prev) => ({ ...prev, [category]: [...prev[category], ...toAdd] }))
    }
  }, [personality, selected, dismissed])

  // Loading / empty state — show skeleton while regenerating so stale-language chips never flash
  if (!personality || isRegenerating) {
    return (
      <div className={WIZARD_STEP_CONTAINER}>
        <div className={WIZARD_STEP_CONTENT}>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground/70">{t('personality.generating')}</p>
            <p className="text-xs text-muted-foreground">{t('personality.generatingHint')}</p>
          </div>
          <div className="space-y-2">
            <div className="h-9 w-64 rounded-xl bg-foreground/10 animate-pulse" />
            <div className="h-5 w-48 rounded-lg bg-foreground/7 animate-pulse" />
          </div>
          {[0, 1].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-4 w-32 rounded bg-foreground/7 animate-pulse" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: MAX_CHIPS }).map((_, j) => (
                  <div key={j} className="h-9 w-24 rounded-full bg-foreground/10 animate-pulse" style={{ animationDelay: `${j * 80}ms` }} />
                ))}
              </div>
            </div>
          ))}
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
            const chips = selected[key]
            const emptySlots = MAX_CHIPS - chips.length
            const allFilled = emptySlots === 0
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (catIdx + 1), duration: 0.4 }}
                className="space-y-3"
              >
                {/* Row header */}
                <div className="flex items-center justify-between">
                  <h2 className={WIZARD_SECTION_LABEL}>
                    {t(`personality.${key}`)}
                    <span className="ml-2 text-xs font-normal normal-case tracking-normal text-muted-foreground/60">
                      {chips.length}/{MAX_CHIPS}
                    </span>
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFillCategory(key)}
                    disabled={allFilled}
                    className="h-7 gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                  >
                    <RotateCcw className="h-3 w-3" />
                    {t('personality.newOptions')}
                  </Button>
                </div>

                {/* Chips row */}
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence mode="popLayout">
                    {/* Selected chips — X to remove, no click-toggle */}
                    {chips.map((chip, i) => (
                      <motion.div
                        key={chip}
                        layout
                        initial={{ opacity: 0, scale: 0.88 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.82 }}
                        transition={{ delay: 0.03 * i, duration: 0.22 }}
                        className="group flex items-center gap-1.5 rounded-full border border-primary/40 bg-[linear-gradient(180deg,hsl(var(--primary)/0.1),hsl(var(--primary)/0.04))] pl-5 pr-2 py-2 text-base font-medium text-primary shadow-[0_8px_24px_-16px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.6)] transition-all duration-200"
                      >
                        <span>{chip}</span>
                        <button
                          type="button"
                          onClick={() => removeChip(key, chip)}
                          className="flex h-5 w-5 items-center justify-center rounded-full text-primary/40 transition-colors hover:bg-primary/10 hover:text-primary"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </motion.div>
                    ))}

                    {/* Empty slot placeholders */}
                    {Array.from({ length: emptySlots }).map((_, i) => (
                      <motion.div
                        key={`slot-${i}`}
                        layout
                        initial={{ opacity: 0, scale: 0.88 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.03 * (chips.length + i), duration: 0.22 }}
                        className="h-9 w-20 rounded-full border-2 border-dashed border-border/40 bg-transparent"
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {/* Custom input — always below, not in the chip row */}
                {!allFilled && (
                  <div className="flex items-center gap-2">
                    <Input
                      value={customInputs[key]}
                      onChange={(e) => setCustomInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={t('personality.placeholder')}
                      className="h-9 w-[180px] rounded-full border-dashed bg-transparent px-4 text-sm focus-visible:ring-primary/30"
                      onKeyDown={(e) => { if (e.key === 'Enter') addCustomChip(key) }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => addCustomChip(key)}
                      className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
