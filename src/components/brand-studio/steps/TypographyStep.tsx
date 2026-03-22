'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { RotateCcw, Search, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { loadGoogleFont } from '@/lib/load-google-font'
import { GoogleFontSelector } from '@/components/brand-dna/GoogleFontSelector'
import type { BrandDNA } from '@/lib/brand-types'
import type { BrandProposals } from '@/app/actions/generate-brand-proposals'
import type { WizardAction } from '../hooks/useWizardState'
import {
  WIZARD_STEP_CONTAINER,
  WIZARD_STEP_CONTENT,
  WIZARD_TITLE,
  WIZARD_SUBTITLE,
  WIZARD_CARD,
  WIZARD_CARD_ACTIVE,
  WIZARD_INPUT,
  WIZARD_GHOST_BUTTON,
  WIZARD_DIVIDER_WITH_TEXT,
  WIZARD_SECTION_LABEL,
} from '../brandStudioStyles'

interface TypographyStepProps {
  draft: Partial<BrandDNA>
  proposals: BrandProposals | null
  dispatch: React.Dispatch<WizardAction>
  onRegenerate?: () => void
  isRegenerating?: boolean
}

// Popular Google Fonts for quick search
const POPULAR_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Raleway',
  'Playfair Display', 'Merriweather', 'Source Sans 3', 'Nunito', 'Ubuntu',
  'Oswald', 'Rubik', 'Work Sans', 'DM Sans', 'Outfit', 'Space Grotesk',
  'Josefin Sans', 'Crimson Text', 'Libre Baskerville', 'Cormorant Garamond',
]

export function TypographyStep({ draft, proposals, dispatch, onRegenerate, isRegenerating }: TypographyStepProps) {
  const { t } = useTranslation('brandStudio')
  const [selectedCombo, setSelectedCombo] = useState<number | null>(null)

  const fonts = draft.fonts ?? []
  const combos = proposals?.fontCombos ?? []

  const headingFont = fonts.find((f) => f.role === 'heading')?.family ?? ''
  const bodyFont = fonts.find((f) => f.role === 'body')?.family ?? ''

  // Load all Google Fonts from proposals on mount
  useEffect(() => {
    combos.forEach((combo) => {
      loadGoogleFont(combo.heading)
      loadGoogleFont(combo.body)
    })
  }, [combos])

  // Load current fonts
  useEffect(() => {
    if (headingFont) loadGoogleFont(headingFont)
    if (bodyFont) loadGoogleFont(bodyFont)
  }, [headingFont, bodyFont])

  const handleSelectFontForRole = useCallback((family: string, role: 'heading' | 'body') => {
    loadGoogleFont(family)
    setSelectedCombo(null)
    const next = fonts.filter((f) => f.role !== role)
    next.push({ family, role })
    dispatch({ type: 'UPDATE_DRAFT', data: { fonts: next } })
  }, [dispatch, fonts])

  const handleSelectCombo = (index: number) => {
    setSelectedCombo(index)
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

        {/* ── Two font cards (Heading + Body) ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Heading font card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className={`${WIZARD_CARD} !p-5 space-y-4`}
          >
            <div className="space-y-1">
              <h3 className={WIZARD_SECTION_LABEL}>{t('typography.headingCard.title')}</h3>
              <p className="text-xs text-muted-foreground">{t('typography.headingCard.subtitle')}</p>
            </div>

            {/* Current heading preview */}
            {headingFont && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">
                  {t('typography.headingCard.current')}
                </span>
                <p
                  className="text-xl font-bold leading-tight mt-1"
                  style={{ fontFamily: `'${headingFont}', sans-serif` }}
                >
                  {headingFont}
                </p>
              </div>
            )}

            {/* Google Font Selector */}
            <GoogleFontSelector
              role="heading"
              selectedFamily={headingFont}
              onSelect={(font) => handleSelectFontForRole(font, 'heading')}
              variant="wizard"
              placeholder={t('typography.headingCard.placeholder')}
            />
          </motion.div>

          {/* Body font card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className={`${WIZARD_CARD} !p-5 space-y-4`}
          >
            <div className="space-y-1">
              <h3 className={WIZARD_SECTION_LABEL}>{t('typography.bodyCard.title')}</h3>
              <p className="text-xs text-muted-foreground">{t('typography.bodyCard.subtitle')}</p>
            </div>

            {/* Current body preview */}
            {bodyFont && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">
                  {t('typography.bodyCard.current')}
                </span>
                <p
                  className="text-base leading-relaxed mt-1"
                  style={{ fontFamily: `'${bodyFont}', sans-serif` }}
                >
                  {bodyFont}
                </p>
              </div>
            )}

            {/* Google Font Selector */}
            <GoogleFontSelector
              role="body"
              selectedFamily={bodyFont}
              onSelect={(font) => handleSelectFontForRole(font, 'body')}
              variant="wizard"
              placeholder={t('typography.bodyCard.placeholder')}
            />
          </motion.div>
        </div>

        {/* ── Quick combo proposals ── */}
        {combos.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={WIZARD_DIVIDER_WITH_TEXT}
            >
              {t('typography.orChooseCombo')}
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-2">
              {combos.map((combo, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={
                    selectedCombo === i
                      ? { opacity: 1, y: 0, scale: [1, 1.03, 1] }
                      : { opacity: 1, y: 0 }
                  }
                  transition={{ delay: 0.35 + 0.1 * i, duration: 0.4 }}
                  onClick={() => handleSelectCombo(i)}
                  className={selectedCombo === i ? WIZARD_CARD_ACTIVE : WIZARD_CARD}
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
                    <div className="space-y-1">
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70 xl:text-xs 2xl:text-sm">
                        {t('typography.headingLabel')} — {combo.heading}
                      </span>
                      <p
                        className="text-2xl font-bold leading-tight xl:text-3xl 2xl:text-4xl"
                        style={{ fontFamily: `'${combo.heading}', sans-serif` }}
                      >
                        {t('typography.sampleHeading')}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70 xl:text-xs 2xl:text-sm">
                        {t('typography.bodyLabel')} — {combo.body}
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
          </>
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
              disabled={isRegenerating}
              className={WIZARD_GHOST_BUTTON}
            >
              {isRegenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              {t('typography.regenerate')}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
