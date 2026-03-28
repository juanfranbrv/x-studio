'use client'

import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BrandDNA } from '@/lib/brand-types'
import type { BrandProposals } from '@/app/actions/generate-brand-proposals'
import type { WizardAction } from '../hooks/useWizardState'
import { ColorPalette } from '@/components/brand-dna/ColorPalette'
import {
  WIZARD_STEP_CONTAINER,
  WIZARD_STEP_CONTENT,
  WIZARD_TITLE,
  WIZARD_SUBTITLE,
  WIZARD_CARD,
  WIZARD_CARD_ACTIVE,
  WIZARD_DIVIDER_WITH_TEXT,
  WIZARD_GHOST_BUTTON,
} from '../brandStudioStyles'

interface PaletteStepProps {
  draft: Partial<BrandDNA>
  dispatch: React.Dispatch<WizardAction>
  proposals?: BrandProposals | null
  isRegenerating?: boolean
  onRegenerate?: () => void
}

export function PaletteStep({ draft, dispatch, proposals, isRegenerating, onRegenerate }: PaletteStepProps) {
  const { t } = useTranslation('brandStudio')

  const colors = draft.colors ?? []
  const originalColorsRef = useRef(colors)
  const colorsRef = useRef(colors)
  colorsRef.current = colors

  const isEdited = JSON.stringify(colors) !== JSON.stringify(originalColorsRef.current)

  const palettes = proposals?.palettes ?? []

  const handleUpdateColor = useCallback(
    (index: number, newColor: string) => {
      const current = [...colorsRef.current]
      if (current[index]) {
        current[index] = { ...current[index], color: newColor }
        colorsRef.current = current
        dispatch({ type: 'UPDATE_DRAFT', data: { colors: current } })
      }
    },
    [dispatch]
  )

  const handleUpdateRole = useCallback(
    (index: number, newRole: string) => {
      const current = [...colorsRef.current]
      if (current[index]) {
        current[index] = { ...current[index], role: newRole }
        colorsRef.current = current
        dispatch({ type: 'UPDATE_DRAFT', data: { colors: current } })
      }
    },
    [dispatch]
  )

  const handleRemoveColor = useCallback(
    (index: number) => {
      const current = colorsRef.current.filter((_, i) => i !== index)
      colorsRef.current = current
      dispatch({ type: 'UPDATE_DRAFT', data: { colors: current } })
    },
    [dispatch]
  )

  const handleAddColor = useCallback(() => {
    const current = [
      ...colorsRef.current,
      { color: '#808080', sources: ['manual'], score: 1, role: 'Acento', selected: true },
    ]
    colorsRef.current = current
    dispatch({ type: 'UPDATE_DRAFT', data: { colors: current } })
  }, [dispatch])

  const handleSwapRoles = useCallback(
    (indexA: number, indexB: number) => {
      const current = [...colorsRef.current]
      if (current[indexA] && current[indexB]) {
        const roleA = current[indexA].role || 'Acento'
        const roleB = current[indexB].role || 'Acento'
        current[indexA] = { ...current[indexA], role: roleB }
        current[indexB] = { ...current[indexB], role: roleA }
        colorsRef.current = current
        dispatch({ type: 'UPDATE_DRAFT', data: { colors: current } })
      }
    },
    [dispatch]
  )

  const handleSwapPositions = useCallback(
    (indexA: number, indexB: number) => {
      const current = [...colorsRef.current]
      if (current[indexA] && current[indexB]) {
        const temp = current[indexA]
        current[indexA] = current[indexB]
        current[indexB] = temp
        colorsRef.current = current
        dispatch({ type: 'UPDATE_DRAFT', data: { colors: current } })
      }
    },
    [dispatch]
  )

  const handleReset = useCallback(() => {
    colorsRef.current = originalColorsRef.current
    dispatch({ type: 'UPDATE_DRAFT', data: { colors: originalColorsRef.current } })
  }, [dispatch])

  const handleSelectProposal = useCallback(
    (palette: BrandProposals['palettes'][number]) => {
      const roleMap: Record<string, string> = {
        background: 'Fondo',
        text: 'Texto',
        primary: 'Texto',
        secondary: 'Acento',
        accent: 'Acento',
        neutral: 'Acento',
        surface: 'Acento',
      }
      const newColors = palette.colors.map((c, i) => ({
        color: c.hex,
        sources: ['proposal'],
        score: 1 - i * 0.1,
        role: roleMap[c.role?.toLowerCase()] ?? 'Acento',
        selected: true,
      }))
      colorsRef.current = newColors
      dispatch({ type: 'UPDATE_DRAFT', data: { colors: newColors } })
    },
    [dispatch]
  )

  // Check if current colors match a proposal
  const activeProposalIndex = palettes.findIndex((p) =>
    p.colors.length === colors.length &&
    p.colors.every((c, i) => colors[i]?.color?.toLowerCase() === c.hex?.toLowerCase())
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
          <h1 className={WIZARD_TITLE}>{t('palette.title')}</h1>
          <p className={WIZARD_SUBTITLE}>{t('palette.subtitle')}</p>
        </motion.div>

        {/* Current palette — editable */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="px-4 pt-2"
        >
          <ColorPalette
            colors={colors}
            isEdited={isEdited}
            onUpdateColor={handleUpdateColor}
            onUpdateRole={handleUpdateRole}
            onSwapRoles={handleSwapRoles}
            onSwapPositions={handleSwapPositions}
            onRemoveColor={handleRemoveColor}
            onAddColor={handleAddColor}
            onReset={handleReset}
            hideHeader
            maxColors={7}
          />
        </motion.div>

        {/* Palette proposals — same pattern as TypographyStep combos */}
        {palettes.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={WIZARD_DIVIDER_WITH_TEXT}
            >
              {t('palette.orChooseProposal', 'O elige una propuesta')}
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-3">
              {palettes.map((palette, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={
                    activeProposalIndex === i
                      ? { opacity: 1, y: 0, scale: [1, 1.03, 1] }
                      : { opacity: 1, y: 0 }
                  }
                  transition={{ delay: 0.35 + 0.1 * i, duration: 0.4 }}
                  onClick={() => handleSelectProposal(palette)}
                  className={`text-left ${activeProposalIndex === i ? WIZARD_CARD_ACTIVE : WIZARD_CARD}`}
                >
                  {/* Color swatches */}
                  <div className="flex gap-1.5 mb-4">
                    {palette.colors.map((c, j) => (
                      <div
                        key={j}
                        className="flex-1 rounded-lg"
                        style={{ backgroundColor: c.hex, aspectRatio: '1/1' }}
                      />
                    ))}
                  </div>

                  {/* Name + description */}
                  <div className="space-y-1">
                    <p className="text-base font-semibold leading-tight">{palette.name}</p>
                    <p className="text-sm text-muted-foreground leading-snug">{palette.description}</p>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Regenerate */}
            {onRegenerate && (
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
                  {t('palette.regenerate', 'Regenerar propuestas')}
                </Button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
