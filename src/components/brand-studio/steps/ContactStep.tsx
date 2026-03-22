'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Phone, MapPin, Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { BrandDNA } from '@/lib/brand-types'
import type { WizardAction } from '../hooks/useWizardState'
import {
  WIZARD_STEP_CONTAINER,
  WIZARD_STEP_CONTENT,
  WIZARD_TITLE,
  WIZARD_SUBTITLE,
  WIZARD_INPUT,
  WIZARD_SECTION_LABEL,
  WIZARD_CARD_COMPACT,
  WIZARD_GHOST_BUTTON,
} from '../brandStudioStyles'

interface ContactStepProps {
  draft: Partial<BrandDNA>
  dispatch: React.Dispatch<WizardAction>
}

const SOCIAL_PLATFORMS = [
  'instagram', 'twitter', 'linkedin', 'facebook', 'youtube', 'tiktok', 'pinterest',
] as const

type SocialPlatform = typeof SOCIAL_PLATFORMS[number]

interface SocialEntry {
  platform: SocialPlatform
  handle: string
}

export function ContactStep({ draft, dispatch }: ContactStepProps) {
  const { t } = useTranslation('brandStudio')

  const [emails, setEmails] = useState<string[]>(draft.emails ?? [''])
  const [phones, setPhones] = useState<string[]>(draft.phones ?? [''])
  const [addresses, setAddresses] = useState<string[]>(draft.addresses ?? [''])
  const [socialLinks, setSocialLinks] = useState<{ platform: SocialPlatform; url: string; username?: string }[]>(
    (draft.social_links as any) ?? []
  )
  const [showAddSocial, setShowAddSocial] = useState(false)

  // Sync to draft - Top level arrays according to BrandDNA schema
  useEffect(() => {
    dispatch({
      type: 'UPDATE_DRAFT',
      data: {
        emails: emails.filter(e => e.trim() !== ''),
        phones: phones.filter(p => p.trim() !== ''),
        addresses: addresses.filter(a => a.trim() !== ''),
        social_links: socialLinks,
        // Nettoyage de l'ancienne structure si elle existe
        contact_info: undefined
      } as Partial<BrandDNA>,
    })
  }, [emails, phones, addresses, socialLinks, dispatch])

  // Helpers for Emails
  const addEmail = () => setEmails(prev => [...prev, ''])
  const updateEmail = (i: number, val: string) => setEmails(prev => prev.map((e, idx) => idx === i ? val : e))
  const removeEmail = (i: number) => setEmails(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : [''])

  // Helpers for Phones
  const addPhone = () => setPhones(prev => [...prev, ''])
  const updatePhone = (i: number, val: string) => setPhones(prev => prev.map((p, idx) => idx === i ? val : p))
  const removePhone = (i: number) => setPhones(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : [''])

  // Helpers for Addresses
  const addAddress = () => setAddresses(prev => [...prev, ''])
  const updateAddress = (i: number, val: string) => setAddresses(prev => prev.map((a, idx) => idx === i ? val : a))
  const removeAddress = (i: number) => setAddresses(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : [''])

  // Helpers for Socials
  const addSocial = (platform: SocialPlatform) => {
    setSocialLinks((prev) => [...prev, { platform, url: '', username: '' }])
    setShowAddSocial(false)
  }

  const updateSocialHandle = (index: number, username: string) => {
    setSocialLinks((prev) => prev.map((s, i) => i === index ? { ...s, username } : s))
  }

  const removeSocial = (index: number) => {
    setSocialLinks((prev) => prev.filter((_, i) => i !== index))
  }

  const availablePlatforms = SOCIAL_PLATFORMS.filter(
    (p) => !socialLinks.some((s) => s.platform === p)
  )

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
          <h1 className={WIZARD_TITLE}>{t('contact.title')}</h1>
          <p className={WIZARD_SUBTITLE}>{t('contact.subtitle')}</p>
        </motion.div>

        {/* Contact fields */}
        <div className="space-y-8">
          {/* Emails Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="space-y-3"
          >
            <h2 className={WIZARD_SECTION_LABEL}>{t('brandBoard.contact.addEmail')}</h2>
            <div className="space-y-3">
              {emails.map((email, i) => (
                <div key={`email-${i}`} className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateEmail(i, e.target.value)}
                    placeholder={t('contact.emailPlaceholder')}
                    className={`${WIZARD_INPUT} flex-1 !h-12 !text-base`}
                  />
                  {(emails.length > 1 || email !== '') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEmail(i)}
                      className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                onClick={addEmail}
                className={`${WIZARD_GHOST_BUTTON} gap-2`}
              >
                <Plus className="h-4 w-4" />
                {t('contact.addEmail')}
              </Button>
            </div>
          </motion.div>

          {/* Phones Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="space-y-3"
          >
            <h2 className={WIZARD_SECTION_LABEL}>{t('brandBoard.contact.addPhone')}</h2>
            <div className="space-y-3">
              {phones.map((phone, i) => (
                <div key={`phone-${i}`} className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => updatePhone(i, e.target.value)}
                    placeholder={t('contact.phonePlaceholder')}
                    className={`${WIZARD_INPUT} flex-1 !h-12 !text-base`}
                  />
                  {(phones.length > 1 || phone !== '') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePhone(i)}
                      className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                onClick={addPhone}
                className={`${WIZARD_GHOST_BUTTON} gap-2`}
              >
                <Plus className="h-4 w-4" />
                {t('contact.addPhone')}
              </Button>
            </div>
          </motion.div>

          {/* Addresses Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="space-y-3"
          >
            <h2 className={WIZARD_SECTION_LABEL}>{t('brandBoard.contact.addAddress')}</h2>
            <div className="space-y-3">
              {addresses.map((address, i) => (
                <div key={`address-${i}`} className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <input
                    value={address}
                    onChange={(e) => updateAddress(i, e.target.value)}
                    placeholder={t('contact.addressPlaceholder')}
                    className={`${WIZARD_INPUT} flex-1 !h-12 !text-base`}
                  />
                  {(addresses.length > 1 || address !== '') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAddress(i)}
                      className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                onClick={addAddress}
                className={`${WIZARD_GHOST_BUTTON} gap-2`}
              >
                <Plus className="h-4 w-4" />
                {t('contact.addAddress')}
              </Button>
            </div>
          </motion.div>

          {/* Social networks */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="space-y-3"
          >
            <h2 className={WIZARD_SECTION_LABEL}>{t('contact.socialLabel')}</h2>

            <AnimatePresence mode="popLayout">
              {socialLinks.map((social, i) => (
                <motion.div
                  key={`${social.platform}-${i}`}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3"
                >
                  <div className={`${WIZARD_CARD_COMPACT} !p-3 shrink-0 min-w-[120px] text-center`}>
                    <span className="text-xs font-medium">
                      {t(`contact.platforms.${social.platform}`)}
                    </span>
                  </div>
                  <input
                    value={social.username}
                    onChange={(e) => updateSocialHandle(i, e.target.value)}
                    placeholder={t('contact.socialPlaceholder')}
                    className={`${WIZARD_INPUT} flex-1 !h-12 !text-base`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSocial(i)}
                    className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add new social */}
            {availablePlatforms.length > 0 && (
              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={() => setShowAddSocial(!showAddSocial)}
                  className={`${WIZARD_GHOST_BUTTON} gap-2`}
                >
                  <Plus className="h-4 w-4" />
                  {t('contact.addSocial')}
                </Button>

                <AnimatePresence>
                  {showAddSocial && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.2 }}
                      className="mt-2 flex flex-wrap gap-2"
                    >
                      {availablePlatforms.map((p) => (
                        <Button
                          key={p}
                          variant="outline"
                          size="sm"
                          onClick={() => addSocial(p)}
                          className="rounded-full text-xs"
                        >
                          {t(`contact.platforms.${p}`)}
                        </Button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
