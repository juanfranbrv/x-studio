'use client'

import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { assignStudioColorRoles } from '@/lib/color-utils'
import type { BrandDNA } from '@/lib/brand-types'
import type { BrandProposals, PaletteProposal } from '@/app/actions/generate-brand-proposals'
import type { WizardAction } from '../hooks/useWizardState'
import { ColorPalette } from '@/components/brand-dna/ColorPalette'
import {
  WIZARD_STEP_CONTAINER,
  WIZARD_STEP_CONTENT,
  WIZARD_TITLE,
  WIZARD_SUBTITLE,
  WIZARD_SECTION_LABEL,
} from '../brandStudioStyles'

interface PaletteStepProps {
  draft: Partial<BrandDNA>
  dispatch: React.Dispatch<WizardAction>
  proposals: BrandProposals | null
  isRegenerating?: boolean
}

type StudioColor = BrandDNA['colors'][number]

/** Maps a PaletteProposal (AI roles) to studio palette (Fondo/Texto/Acento). */
function proposalToStudioColors(proposal: PaletteProposal): StudioColor[] {
  const raw = proposal.colors.map((c, i) => ({
    color: c.hex.startsWith('#') ? c.hex : `#${c.hex}`,
    sources: ['proposal'],
    score: proposal.colors.length - i,
    selected: true,
  }))
  return assignStudioColorRoles(raw)
}

// ── Palette proposal card ────────────────────────────────────
function ProposalCard({
  proposal,
  index,
  isSelected,
  onClick,
}: {
  proposal: PaletteProposal
  index: number
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={cn(
        'w-full rounded-2xl border p-3 text-left transition-all duration-200 hover:border-primary/40 hover:shadow-sm',
        isSelected
          ? 'border-primary/60 bg-primary/5 shadow-sm ring-1 ring-primary/20'
          : 'border-border/50 bg-background'
      )}
    >
      {/* Color swatches */}
      <div className="flex gap-1 mb-2.5">
        {proposal.colors.slice(0, 5).map((c, i) => (
          <div
            key={i}
            className="h-8 flex-1 rounded-lg first:rounded-l-xl last:rounded-r-xl"
            style={{ backgroundColor: c.hex.startsWith('#') ? c.hex : `#${c.hex}` }}
          />
        ))}
      </div>
      {/* Name */}
      <p className="text-xs font-medium text-foreground/80 truncate">{proposal.name}</p>
    </motion.button>
  )
}

export function PaletteStep({ draft, dispatch, proposals, isRegenerating }: PaletteStepProps) {
  const { t } = useTranslation('brandStudio')
  const [selectedProposal, setSelectedProposal] = useState<number | null>(null)

  const colors = draft.colors ?? []
  const originalColorsRef = useRef(colors)
  const colorsRef = useRef(colors)
  colorsRef.current = colors

  const isEdited = JSON.stringify(colors) !== JSON.stringify(originalColorsRef.current)

  const paletteProposals = proposals?.palettes ?? []

  const handleSelectProposal = useCallback(
    (index: number) => {
      setSelectedProposal(index)
      const proposal = paletteProposals[index]
      if (!proposal) return
      const studioColors = proposalToStudioColors(proposal)
      colorsRef.current = studioColors
      dispatch({ type: 'UPDATE_DRAFT', data: { colors: studioColors } })
    },
    [paletteProposals, dispatch]
  )

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
    setSelectedProposal(null)
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

        {/* Palette editor */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
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

        {/* Palette proposals */}
        {(paletteProposals.length > 0 || isRegenerating) && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <p className={WIZARD_SECTION_LABEL}>{t('palette.proposals')}</p>
              {isRegenerating && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>

            {isRegenerating && paletteProposals.length === 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-[76px] rounded-2xl border border-border/50 bg-muted/20"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {paletteProposals.map((proposal, i) => (
                  <ProposalCard
                    key={i}
                    proposal={proposal}
                    index={i}
                    isSelected={selectedProposal === i}
                    onClick={() => handleSelectProposal(i)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
