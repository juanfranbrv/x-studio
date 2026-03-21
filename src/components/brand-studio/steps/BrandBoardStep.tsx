'use client'

import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Rocket } from 'lucide-react'
import type { BrandStudioState, WizardStep } from '../hooks/useWizardState'

interface BrandBoardStepProps {
  draft: BrandStudioState['draft']
  onSave: () => void
  onEditStep: (step: WizardStep) => void
}

const SECTIONS: { key: string; step: WizardStep }[] = [
  { key: 'logo', step: 'logo' },
  { key: 'colors', step: 'palette' },
  { key: 'typography', step: 'typography' },
  { key: 'personality', step: 'personality' },
  { key: 'voice', step: 'voice' },
]

export function BrandBoardStep({ draft, onSave, onEditStep }: BrandBoardStepProps) {
  const { t } = useTranslation('brandStudio')

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl space-y-8"
      >
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('brandBoard.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('brandBoard.subtitle')}
          </p>
        </div>

        {draft.brand_name && (
          <div className="text-center">
            <h2 className="text-2xl font-bold">{draft.brand_name}</h2>
            {draft.tagline && (
              <p className="text-muted-foreground mt-1">{draft.tagline}</p>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {SECTIONS.map(({ key, step }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.3 }}
              className="group relative rounded-2xl border-2 border-border p-6 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                  {t(`brandBoard.sections.${key}`)}
                </h3>
                <button
                  onClick={() => onEditStep(step)}
                  className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {t('brandBoard.editStep')}
                </button>
              </div>
              <div className="h-16 rounded-xl bg-muted/50 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">
                  {t(`brandBoard.empty.${key}`)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-center pt-4">
          <Button size="lg" onClick={onSave} className="gap-2 text-base px-8">
            <Rocket className="h-5 w-5" />
            {t('brandBoard.save')}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
