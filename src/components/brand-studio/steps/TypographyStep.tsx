'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { loadGoogleFont } from '@/lib/load-google-font'
import type { BrandDNA } from '@/lib/brand-types'
import type { BrandProposals } from '@/app/actions/generate-brand-proposals'
import type { WizardAction } from '../hooks/useWizardState'
import { TypographySection } from '@/components/brand-dna/TypographySection'
import {
  WIZARD_STEP_CONTAINER,
  WIZARD_STEP_CONTENT,
  WIZARD_TITLE,
  WIZARD_SUBTITLE,
  WIZARD_CARD,
  WIZARD_CARD_ACTIVE,
  WIZARD_GHOST_BUTTON,
  WIZARD_DIVIDER_WITH_TEXT,
} from '../brandStudioStyles'

interface TypographyStepProps {
  draft: Partial<BrandDNA>
  proposals: BrandProposals | null
  dispatch: React.Dispatch<WizardAction>
  onRegenerate?: () => void
}

export function TypographyStep({ draft, proposals, dispatch, onRegenerate }: TypographyStepProps) {
  const { t } = useTranslation('brandStudio')
  const [selected, setSelected] = useState<number | null>(null)

  const fonts = draft.fonts ?? []
  const combos = proposals?.fontCombos ?? []

  // Load all Google Fonts from proposals on mount
  useEffect(() => {
    combos.forEach((combo) => {
      loadGoogleFont(combo.heading)
      loadGoogleFont(combo.body)
    })
  }, [combos])

  const handleSelect = (index: number) => {
    setSelected(index)
    const combo = combos[index]
    if (!combo) return
    dispatch({
      type: 'UPDATE_DRAFT',
      data: {
        fonts: [
          { family: combo.heading, role: 'heading' },
          { family: combo.body, role: 'body' },
        ],
      },
    })
  }

  // ── Handlers for TypographySection (reuse existing component) ──

  const handleAddFont = useCallback((family: string) => {
    dispatch({
      type: 'UPDATE_DRAFT',
      data: { fonts: [...fonts, { family, role: undefined }] },
    })
  }, [dispatch, fonts])

  const handleRemoveFont = useCallback((index: number) => {
    const next = fonts.filter((_, i) => i !== index)
    dispatch({ type: 'UPDATE_DRAFT', data: { fonts: next } })
  }, [dispatch, fonts])

  const handleUpdateRole = useCallback((index: number, role?: 'heading' | 'body') => {
    const next = fonts.map((f, i) => (i === index ? { ...f, role } : f))
    dispatch({ type: 'UPDATE_DRAFT', data: { fonts: next } })
  }, [dispatch, fonts])

  const handleSelectFontForRole = useCallback((family: string, role: 'heading' | 'body') => {
    setSelected(null)
    const next = fonts.filter((f) => f.role !== role)
    next.push({ family, role })
    dispatch({ type: 'UPDATE_DRAFT', data: { fonts: next } })
  }, [dispatch, fonts])

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
          <h1 className={WIZARD_TITLE}>{t('typography.title')}</h1>
          <p className={WIZARD_SUBTITLE}>{t('typography.subtitle')}</p>
        </motion.div>

        {/* ── Font selector (reuse existing TypographySection in guided mode) ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <TypographySection
            fonts={fonts}
            tagline={draft.tagline}
            onAddFont={handleAddFont}
            onRemoveFont={handleRemoveFont}
            onUpdateRole={handleUpdateRole}
            guidedMode
            hideHeader
            onSelectFontForRole={handleSelectFontForRole}
          />
        </motion.div>

        {/* ── Divider ── */}
        {combos.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={WIZARD_DIVIDER_WITH_TEXT}
          >
            {t('typography.orChooseCombo')}
          </motion.div>
        )}

        {/* ── Quick proposals ── */}
        {combos.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {combos.map((combo, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={
                  selected === i
                    ? { opacity: 1, y: 0, scale: [1, 1.03, 1] }
                    : { opacity: 1, y: 0 }
                }
                transition={{ delay: 0.35 + 0.1 * i, duration: 0.4 }}
                onClick={() => handleSelect(i)}
                className={selected === i ? WIZARD_CARD_ACTIVE : WIZARD_CARD}
              >
                {/* Card header */}
                <div className="space-y-1">
                  <p className="text-base font-semibold xl:text-lg 2xl:text-xl">
                    {combo.name}
                  </p>
                  <p className="text-sm text-muted-foreground xl:text-base 2xl:text-lg">
                    {combo.description}
                  </p>
                </div>

                {/* Font preview */}
                <div className="mt-4 w-full space-y-3">
                  {/* Heading preview */}
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70 xl:text-xs 2xl:text-sm">
                      {t('typography.headingLabel')} -- {combo.heading}
                    </span>
                    <p
                      className="text-2xl font-bold leading-tight xl:text-3xl 2xl:text-4xl"
                      style={{ fontFamily: `'${combo.heading}', sans-serif` }}
                    >
                      {t('typography.sampleHeading')}
                    </p>
                  </div>

                  {/* Body preview */}
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70 xl:text-xs 2xl:text-sm">
                      {t('typography.bodyLabel')} -- {combo.body}
                    </span>
                    <p
                      className="text-sm leading-relaxed text-muted-foreground xl:text-base 2xl:text-lg"
                      style={{ fontFamily: `'${combo.body}', sans-serif` }}
                    >
                      {t('typography.sampleBody')}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {/* Regenerate button */}
        {combos.length > 0 && onRegenerate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex justify-center"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              className={WIZARD_GHOST_BUTTON}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('typography.regenerate')}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
