'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import type { WizardAction, BrandStudioState } from '../hooks/useWizardState'

interface NameStepProps {
  draft: BrandStudioState['draft']
  dispatch: React.Dispatch<WizardAction>
}

export function NameStep({ draft, dispatch }: NameStepProps) {
  const { t } = useTranslation('brandStudio')
  const [name, setName] = useState(draft.brand_name ?? '')
  const [description, setDescription] = useState(draft.business_overview ?? '')

  const handleNameChange = (value: string) => {
    setName(value)
    dispatch({ type: 'SET_NAME', name: value, description })
  }

  const handleDescriptionChange = (value: string) => {
    setDescription(value)
    dispatch({ type: 'SET_NAME', name, description: value })
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg space-y-8 text-center"
      >
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t('name.title')}
        </h1>

        <div className="space-y-6">
          <Input
            autoFocus
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={t('name.placeholder')}
            className="text-center text-2xl font-semibold h-14 border-2"
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: name.length > 0 ? 1 : 0.3 }}
            transition={{ duration: 0.3 }}
            className="space-y-2"
          >
            <label className="text-sm font-medium text-muted-foreground">
              {t('name.descriptionLabel')}
            </label>
            <textarea
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder={t('name.descriptionPlaceholder')}
              rows={3}
              className="w-full resize-none rounded-xl border-2 border-border bg-background px-4 py-3 text-sm transition-colors focus:border-primary focus:outline-none"
            />
            <p className="text-xs text-muted-foreground">
              {t('name.descriptionHint')}
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
