'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import type { WizardAction, BrandStudioState } from '../hooks/useWizardState'
import {
  WIZARD_STEP_CONTAINER,
  WIZARD_STEP_CONTENT,
  WIZARD_TITLE,
  WIZARD_INPUT_LARGE,
  WIZARD_TEXTAREA,
} from '../brandStudioStyles'

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
    <div className={WIZARD_STEP_CONTAINER}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`${WIZARD_STEP_CONTENT} text-center`}
      >
        <h1 className={WIZARD_TITLE}>{t('name.title')}</h1>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={t('name.placeholder')}
              className={WIZARD_INPUT_LARGE}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: name.length > 0 ? 1 : 0.3 }}
            transition={{ duration: 0.3 }}
            className="space-y-2 text-left"
          >
            <label className="text-[clamp(0.82rem,0.78rem+0.1vw,0.9rem)] font-medium text-muted-foreground">
              {t('name.descriptionLabel')}
            </label>
            <textarea
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder={t('name.descriptionPlaceholder')}
              rows={3}
              className={WIZARD_TEXTAREA}
            />
            <p className="text-[clamp(0.72rem,0.7rem+0.06vw,0.78rem)] text-muted-foreground/70">
              {t('name.descriptionHint')}
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
