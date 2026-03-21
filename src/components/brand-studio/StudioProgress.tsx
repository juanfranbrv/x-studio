'use client'

import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

interface StudioProgressProps {
  currentIndex: number
  totalSteps: number
}

export function StudioProgress({ currentIndex, totalSteps }: StudioProgressProps) {
  const { t } = useTranslation('brandStudio')
  const progress = totalSteps > 0 ? ((currentIndex + 1) / totalSteps) * 100 : 0

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="h-1 w-full bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        />
      </div>
      <div className="absolute top-2 right-4">
        <span className="text-xs text-muted-foreground">
          {t('progress.step', { current: currentIndex + 1, total: totalSteps })}
        </span>
      </div>
    </div>
  )
}
