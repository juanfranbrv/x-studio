'use client'

import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import type { BrandDNA } from '@/lib/brand-types'
import type { WizardAction } from '../hooks/useWizardState'
import { ColorPalette } from '@/components/brand-dna/ColorPalette'
import {
  WIZARD_STEP_CONTAINER,
  WIZARD_STEP_CONTENT,
  WIZARD_TITLE,
  WIZARD_SUBTITLE,
} from '../brandStudioStyles'

interface PaletteStepProps {
  draft: Partial<BrandDNA>
  dispatch: React.Dispatch<WizardAction>
}

export function PaletteStep({ draft, dispatch }: PaletteStepProps) {
  const { t } = useTranslation('brandStudio')

  const colors = draft.colors ?? []
  const originalColorsRef = useRef(colors)
  // Keep a mutable ref so rapid sequential calls (swap) always see latest state
  const colorsRef = useRef(colors)
  colorsRef.current = colors

  const isEdited = JSON.stringify(colors) !== JSON.stringify(originalColorsRef.current)

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

        {/* Reuse existing ColorPalette component — pl-2 gives room for the X button and hover scale */}
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
      </div>
    </div>
  )
}
