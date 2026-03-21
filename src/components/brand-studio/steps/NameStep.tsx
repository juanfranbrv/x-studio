'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Globe } from 'lucide-react'
import type { WizardAction, BrandStudioState } from '../hooks/useWizardState'
import {
  WIZARD_STEP_CONTAINER,
  WIZARD_STEP_CONTENT_NARROW,
  WIZARD_TITLE,
  WIZARD_INPUT_LARGE,
  WIZARD_TEXTAREA,
} from '../brandStudioStyles'

interface NameStepProps {
  draft: BrandStudioState['draft']
  dispatch: React.Dispatch<WizardAction>
}

const LANGUAGES = ['es', 'en', 'fr', 'de', 'pt', 'it', 'ca'] as const

export function NameStep({ draft, dispatch }: NameStepProps) {
  const { t } = useTranslation('brandStudio')
  const [name, setName] = useState(draft.brand_name ?? '')
  const [description, setDescription] = useState(draft.business_overview ?? '')
  const [language, setLanguage] = useState(draft.preferred_language ?? 'es')

  const handleNameChange = (value: string) => {
    setName(value)
    dispatch({ type: 'SET_NAME', name: value, description })
  }

  const handleDescriptionChange = (value: string) => {
    setDescription(value)
    dispatch({ type: 'SET_NAME', name, description: value })
  }

  const handleLanguageChange = (value: string) => {
    setLanguage(value)
    dispatch({ type: 'UPDATE_DRAFT', data: { preferred_language: value } })
  }

  return (
    <div className={WIZARD_STEP_CONTAINER}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`${WIZARD_STEP_CONTENT_NARROW} text-center`}
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

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: name.length > 0 ? 1 : 0.3 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="space-y-2 text-left"
          >
            <label className="flex items-center gap-1.5 text-[clamp(0.82rem,0.78rem+0.1vw,0.9rem)] font-medium text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              {t('name.languageLabel')}
            </label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    language === lang
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border/65 bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  }`}
                >
                  {t(`name.languages.${lang}`)}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
