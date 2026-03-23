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
type PillSection = 'ctas' | 'hooks'

export function VoiceStep({ draft, proposals, dispatch, onRegenerate, isRegenerating = false }: VoiceStepProps) {
  const { t } = useTranslation('brandStudio')
  const voice = proposals?.voice

  // ── Taglines: card checkbox UI ──
  const [selectedTaglines, setSelectedTaglines] = useState<Set<string>>(() => {
    if (draft.tagline) return new Set([draft.tagline])
    return new Set<string>()
  })

  // ── CTAs + Hooks: pill model (all shown = active, X removes, cursor rotates) ──
  const [pillSelected, setPillSelected] = useState<Record<PillSection, string[]>>(() => ({
    ctas: draft.text_assets?.ctas?.slice(0, MAX_SELECTED) ?? [],
    hooks: draft.text_assets?.marketing_hooks?.slice(0, MAX_SELECTED) ?? [],
  }))

  const [pillDismissed, setPillDismissed] = useState<Record<PillSection, string[]>>({
    ctas: [],
    hooks: [],
  })

  const [customInputs, setCustomInputs] = useState<Record<'taglines' | PillSection, string>>({
    taglines: '',
    ctas: '',
    hooks: '',
  })

  // Replace all selections when proposals change (initial load + language regeneration)
  useEffect(() => {
    if (!voice) return
    setSelectedTaglines(new Set(voice.taglines.slice(0, MAX_SELECTED)))
    setPillSelected({
      ctas: voice.ctas.slice(0, MAX_SELECTED),
      hooks: voice.marketingHooks.slice(0, MAX_SELECTED),
    })
    setPillDismissed({ ctas: [], hooks: [] })
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
          ctas: pillSelected.ctas,
          marketing_hooks: pillSelected.hooks,
          visual_keywords: draft.text_assets?.visual_keywords ?? [],
          brand_context: draft.text_assets?.brand_context ?? '',
        },
      },
    })
  }, [selectedTaglines, pillSelected, dispatch])

  // ── Tagline helpers ──
  const toggleTagline = (item: string) => {
    setSelectedTaglines((prev) => {
      const next = new Set(prev)
      if (next.has(item)) { next.delete(item) }
      else if (next.size < MAX_SELECTED) { next.add(item) }
      return next
    })
  }

  const addCustomTagline = () => {
    const value = customInputs.taglines.trim()
    if (!value) return
    setSelectedTaglines((prev) => {
      if (prev.has(value) || prev.size >= MAX_SELECTED) return prev
      return new Set([...prev, value])
    })
    setCustomInputs((prev) => ({ ...prev, taglines: '' }))
  }

  // ── Pill helpers ──
  const removePill = useCallback((section: PillSection, item: string) => {
    setPillSelected((prev) => ({ ...prev, [section]: prev[section].filter((c) => c !== item) }))
    setPillDismissed((prev) => ({ ...prev, [section]: [...prev[section], item] }))
  }, [])

  const addCustomPill = useCallback((section: PillSection) => {
    const value = customInputs[section].trim()
    if (!value) return
    setPillSelected((prev) => {
      if (prev[section].includes(value) || prev[section].length >= MAX_SELECTED) return prev
      return { ...prev, [section]: [...prev[section], value] }
    })
    setCustomInputs((prev) => ({ ...prev, [section]: '' }))
  }, [customInputs])

  /** Fill empty slots skipping dismissed items — never calls AI */
  const handleFillPill = useCallback((section: PillSection) => {
    if (!voice) return
    const pool = section === 'ctas' ? voice.ctas : voice.marketingHooks
    if (pool.length === 0) return
    const current = pillSelected[section]
    const dis = pillDismissed[section]
    const emptySlots = MAX_SELECTED - current.length
    if (emptySlots <= 0) return

    let available = pool.filter((item) => !current.includes(item) && !dis.includes(item))

    if (available.length < emptySlots) {
      // Pool exhausted — reset dismissed and retry
      setPillDismissed((prev) => ({ ...prev, [section]: [] }))
      available = pool.filter((item) => !current.includes(item))
    }

    const toAdd = available.slice(0, emptySlots)
    if (toAdd.length > 0) {
      setPillSelected((prev) => ({ ...prev, [section]: [...prev[section], ...toAdd] }))
    }
  }, [voice, pillSelected, pillDismissed])

  // Build ordered tagline items: selected first, then fill from proposals
  const getTaglineItems = () => {
    if (!voice) return []
    const sel = Array.from(selectedTaglines)
    const freeSlots = MAX_SELECTED - sel.length
    const unselected = voice.taglines.filter((t) => !selectedTaglines.has(t)).slice(0, freeSlots)
    return [
      ...sel.map((item) => ({ item, isSelected: true })),
      ...unselected.map((item) => ({ item, isSelected: false })),
    ]
  }

  // Loading / empty state — skeleton while regenerating so stale-language content never flashes
  if (!voice || isRegenerating) {
    return (
      <div className={WIZARD_STEP_CONTAINER}>
        <div className={WIZARD_STEP_CONTENT}>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground/70">{t('voice.generating')}</p>
            <p className="text-xs text-muted-foreground">{t('voice.generatingHint')}</p>
          </div>
          <div className="space-y-2">
            <div className="h-9 w-56 rounded-xl bg-foreground/10 animate-pulse" />
            <div className="h-5 w-44 rounded-lg bg-foreground/7 animate-pulse" />
          </div>
          {/* Taglines skeleton */}
          <div className="space-y-3">
            <div className="h-4 w-28 rounded bg-foreground/7 animate-pulse" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-2xl bg-foreground/10 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
          {/* Pills skeleton */}
          {[0, 1].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-4 w-36 rounded bg-foreground/7 animate-pulse" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="h-9 w-28 rounded-full bg-foreground/10 animate-pulse" style={{ animationDelay: `${j * 80}ms` }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const taglineItems = getTaglineItems()

  const renderPillSection = (
    section: PillSection,
    labelKey: string,
    delay: number,
  ) => {
    const chips = pillSelected[section]
    const allFilled = chips.length >= MAX_SELECTED
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.4 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className={WIZARD_SECTION_LABEL}>
            {t(labelKey)}
            <span className="ml-2 text-xs font-normal normal-case tracking-normal text-muted-foreground/60">
              {chips.length}/{MAX_SELECTED}
            </span>
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFillPill(section)}
            disabled={allFilled}
            className="h-7 gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <RotateCcw className="h-3 w-3" />
            {t('voice.newOptions')}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <AnimatePresence mode="popLayout">
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
                  onClick={() => removePill(section, chip)}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-primary/40 transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
            ))}
            {/* Empty slot placeholders */}
            {Array.from({ length: MAX_SELECTED - chips.length }).map((_, i) => (
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
        {!allFilled && (
          <div className="flex items-center gap-2">
            <Input
              value={customInputs[section]}
              onChange={(e) => setCustomInputs((prev) => ({ ...prev, [section]: e.target.value }))}
              placeholder={t('voice.placeholder')}
              className="h-9 w-[220px] rounded-full border-dashed bg-transparent px-4 text-sm focus-visible:ring-primary/30"
              onKeyDown={(e) => { if (e.key === 'Enter') addCustomPill(section) }}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => addCustomPill(section)}
              className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </motion.div>
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
          <h1 className={WIZARD_TITLE}>{t('voice.title')}</h1>
          <p className={WIZARD_SUBTITLE}>{t('voice.subtitle')}</p>
        </motion.div>

        {/* Tagline section — card checkbox UI */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className={WIZARD_SECTION_LABEL}>
              {t('voice.taglineSection')}
              <span className="ml-2 text-xs font-normal normal-case tracking-normal text-muted-foreground/60">
                {selectedTaglines.size}/{MAX_SELECTED}
              </span>
            </h2>
          </div>
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
                  <div className="flex flex-1 items-center gap-4 cursor-pointer py-4 pl-4" onClick={() => toggleTagline(item)}>
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${
                      isSelected ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border/60 bg-transparent text-transparent'
                    }`}>
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                    <p className="text-lg font-semibold leading-snug xl:text-xl 2xl:text-2xl">{item}</p>
                  </div>
                  {isSelected && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); setSelectedTaglines((prev) => { const n = new Set(prev); n.delete(item); return n }) }}
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
                    onKeyDown={(e) => { if (e.key === 'Enter') addCustomTagline() }}
                  />
                  <Button
                    variant="outline"
                    className="h-14 w-14 rounded-2xl border-dashed hover:bg-primary/10 hover:text-primary"
                    onClick={addCustomTagline}
                  >
                    <Plus className="h-6 w-6" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* CTAs — pill model */}
        {renderPillSection('ctas', 'voice.ctaSection', 0.3)}

        {/* Marketing hooks — pill model */}
        {renderPillSection('hooks', 'voice.hooksSection', 0.5)}
      </div>
    </div>
  )
}
