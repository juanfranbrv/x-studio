'use client'

import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WizardStep } from './hooks/useWizardState'

interface StudioProgressProps {
  currentIndex: number
  totalSteps: number
  /** When provided, renders vertical stepper instead of top bar */
  visibleSteps?: WizardStep[]
  onStepClick?: (step: WizardStep) => void
}

export function StudioProgress({
  currentIndex,
  totalSteps,
  visibleSteps,
  onStepClick,
}: StudioProgressProps) {
  const { t } = useTranslation('brandStudio')

  // ── Vertical stepper (sidebar) ────────────────────────────
  if (visibleSteps) {
    return (
      <nav className="flex flex-col gap-0.5">
        {visibleSteps.map((step, i) => {
          const isCompleted = i < currentIndex
          const isCurrent = i === currentIndex
          const isFuture = i > currentIndex
          const canClick = isCompleted && onStepClick

          return (
            <div key={step} className="flex items-start gap-3">
              {/* Dot column */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  disabled={!canClick}
                  onClick={() => canClick && onStepClick(step)}
                  className={cn(
                    'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300',
                    isCompleted && 'border-primary bg-primary text-primary-foreground cursor-pointer hover:scale-110',
                    isCurrent && 'border-primary bg-primary/10 text-primary',
                    isFuture && 'border-muted-foreground/20 bg-transparent text-muted-foreground/40',
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <span className="text-[0.7rem] font-semibold leading-none">{i + 1}</span>
                  )}
                  {isCurrent && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-primary"
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                    />
                  )}
                </button>

                {/* Connector line */}
                {i < visibleSteps.length - 1 && (
                  <div
                    className={cn(
                      'w-0.5 transition-colors duration-300',
                      i < currentIndex ? 'bg-primary' : 'bg-muted-foreground/15',
                    )}
                    style={{ height: '1.25rem' }}
                  />
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  'pt-0.5 text-sm font-medium transition-colors duration-200',
                  isCurrent && 'text-foreground',
                  isCompleted && 'text-muted-foreground',
                  isFuture && 'text-muted-foreground/40',
                )}
              >
                {t(`progress.steps.${step}`, step)}
              </span>
            </div>
          )
        })}
      </nav>
    )
  }

  // ── Horizontal bar (mobile / fallback) ────────────────────
  const progress = totalSteps > 0 ? ((currentIndex + 1) / totalSteps) * 100 : 0

  return (
    <div className="fixed top-0 left-0 right-0 z-50 lg:hidden">
      <div className="h-1 w-full bg-muted/60">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        />
      </div>
      <div className="absolute top-2.5 right-4">
        <span className="text-[clamp(0.68rem,0.66rem+0.06vw,0.75rem)] font-medium text-muted-foreground/60 tracking-wide">
          {t('progress.step', { current: currentIndex + 1, total: totalSteps })}
        </span>
      </div>
    </div>
  )
}
