'use client'

import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Globe } from 'lucide-react'
import type { WizardAction } from '../hooks/useWizardState'
import {
  WIZARD_STEP_CONTAINER,
  WIZARD_STEP_CONTENT,
  WIZARD_TITLE,
  WIZARD_SUBTITLE,
  WIZARD_CARD_COMPACT,
  WIZARD_CARD_COMPACT_ACTIVE,
} from '../brandStudioStyles'

interface LanguageStepProps {
  brandLanguage: string
  dispatch: React.Dispatch<WizardAction>
}

const LANGUAGES = ['es', 'en', 'fr', 'de', 'pt', 'it', 'ca'] as const

const FLAG_EMOJI: Record<string, string> = {
  es: '🇪🇸',
  en: '🇬🇧',
  fr: '🇫🇷',
  de: '🇩🇪',
  pt: '🇵🇹',
  it: '🇮🇹',
  ca: '🏴',
}

export function LanguageStep({ brandLanguage, dispatch }: LanguageStepProps) {
  const { t } = useTranslation('brandStudio')

  const handleSelect = (lang: string) => {
    dispatch({ type: 'SET_BRAND_LANGUAGE', language: lang })
  }

  return (
    <div className={WIZARD_STEP_CONTAINER}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`${WIZARD_STEP_CONTENT} text-center`}
      >
        <div className="space-y-2">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"
          >
            <Globe className="h-8 w-8 text-primary" />
          </motion.div>
          <h1 className={WIZARD_TITLE}>{t('language.title')}</h1>
          <p className={WIZARD_SUBTITLE}>{t('language.subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 pt-4">
          {LANGUAGES.map((lang, i) => (
            <motion.button
              key={lang}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelect(lang)}
              className={brandLanguage === lang ? WIZARD_CARD_COMPACT_ACTIVE : WIZARD_CARD_COMPACT}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{FLAG_EMOJI[lang]}</span>
                <span className="text-sm font-medium">
                  {t(`language.languages.${lang}`)}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
