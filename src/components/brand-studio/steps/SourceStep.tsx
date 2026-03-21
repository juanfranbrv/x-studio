'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Globe, Instagram, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { SourceType, WizardAction } from '../hooks/useWizardState'

interface SourceStepProps {
  sourceType: SourceType | null
  sourceValue: string
  dispatch: React.Dispatch<WizardAction>
  onNext: () => void
}

const SOURCE_OPTIONS: { type: SourceType; icon: typeof Globe; colorClass: string }[] = [
  { type: 'web', icon: Globe, colorClass: 'text-blue-500' },
  { type: 'instagram', icon: Instagram, colorClass: 'text-pink-500' },
  { type: 'scratch', icon: Sparkles, colorClass: 'text-amber-500' },
]

export function SourceStep({ sourceType, sourceValue, dispatch, onNext }: SourceStepProps) {
  const { t } = useTranslation('brandStudio')
  const [selected, setSelected] = useState<SourceType | null>(sourceType)
  const [inputValue, setInputValue] = useState(sourceValue)

  const handleSelect = (type: SourceType) => {
    setSelected(type)
    if (type === 'scratch') {
      dispatch({ type: 'SET_SOURCE', sourceType: type, value: '' })
    }
  }

  const handleInputChange = (value: string) => {
    setInputValue(value)
    if (selected) {
      dispatch({ type: 'SET_SOURCE', sourceType: selected, value })
    }
  }

  const canProceed =
    selected === 'scratch' ||
    (selected === 'web' && inputValue.length > 5) ||
    (selected === 'instagram' && inputValue.length > 1)

  const handleSubmit = () => {
    if (canProceed) onNext()
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl space-y-8 text-center"
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('source.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('source.subtitle')}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {SOURCE_OPTIONS.map(({ type, icon: Icon, colorClass }, i) => (
            <motion.button
              key={type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (i + 1), duration: 0.4 }}
              onClick={() => handleSelect(type)}
              className={`
                group relative flex flex-col items-center gap-4 rounded-2xl border-2 p-6 sm:p-8
                transition-all duration-200
                ${selected === type
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/40 hover:shadow-sm'
                }
              `}
            >
              <div className={`rounded-xl bg-muted p-4 transition-colors group-hover:bg-muted/80 ${selected === type ? 'bg-primary/10' : ''}`}>
                <Icon className={`h-8 w-8 ${colorClass}`} />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">{t(`source.${type}.title`)}</p>
                <p className="text-sm text-muted-foreground">{t(`source.${type}.subtitle`)}</p>
              </div>

              {selected === type && type !== 'scratch' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Input
                    autoFocus
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder={t(`source.${type}.placeholder`)}
                    className="mt-2 text-center"
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  />
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
