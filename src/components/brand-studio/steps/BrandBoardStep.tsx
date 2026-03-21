'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Mail, MapPin, Phone, Plus, Rocket, Trash2, X } from 'lucide-react'
import type { BrandStudioState, WizardStep, WizardAction } from '../hooks/useWizardState'
import {
  WIZARD_SECTION_LABEL,
  WIZARD_TEXTAREA,
  WIZARD_INPUT,
} from '../brandStudioStyles'

interface BrandBoardStepProps {
  draft: BrandStudioState['draft']
  proposals: BrandStudioState['proposals']
  dispatch: React.Dispatch<WizardAction>
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

const SOCIAL_PLATFORMS = ['instagram', 'twitter', 'linkedin', 'facebook', 'youtube', 'tiktok', 'pinterest'] as const

export function BrandBoardStep({ draft, proposals, dispatch, onSave, onEditStep }: BrandBoardStepProps) {
  const { t } = useTranslation('brandStudio')

  // Brand context — init from proposals if draft is empty
  const [brandContext, setBrandContext] = useState(
    draft.text_assets?.brand_context || proposals?.brandContext || '',
  )

  // Contact info
  const [emails, setEmails] = useState<string[]>(draft.emails ?? [])
  const [phones, setPhones] = useState<string[]>(draft.phones ?? [])
  const [addresses, setAddresses] = useState<string[]>(draft.addresses ?? [])
  const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string; username?: string }[]>(
    draft.social_links ?? [],
  )

  const syncDraft = (updates: Partial<typeof draft>) => {
    dispatch({ type: 'UPDATE_DRAFT', data: updates })
  }

  const handleBrandContextChange = (value: string) => {
    setBrandContext(value)
    syncDraft({
      text_assets: {
        ...draft.text_assets,
        marketing_hooks: draft.text_assets?.marketing_hooks ?? [],
        visual_keywords: draft.text_assets?.visual_keywords ?? [],
        ctas: draft.text_assets?.ctas ?? [],
        brand_context: value,
      },
    })
  }

  // ── Email helpers ──
  const addEmail = () => {
    const next = [...emails, '']
    setEmails(next)
    syncDraft({ emails: next })
  }
  const updateEmail = (i: number, value: string) => {
    const next = [...emails]
    next[i] = value
    setEmails(next)
    syncDraft({ emails: next })
  }
  const removeEmail = (i: number) => {
    const next = emails.filter((_, idx) => idx !== i)
    setEmails(next)
    syncDraft({ emails: next })
  }

  // ── Phone helpers ──
  const addPhone = () => {
    const next = [...phones, '']
    setPhones(next)
    syncDraft({ phones: next })
  }
  const updatePhone = (i: number, value: string) => {
    const next = [...phones]
    next[i] = value
    setPhones(next)
    syncDraft({ phones: next })
  }
  const removePhone = (i: number) => {
    const next = phones.filter((_, idx) => idx !== i)
    setPhones(next)
    syncDraft({ phones: next })
  }

  // ── Address helpers ──
  const addAddress = () => {
    const next = [...addresses, '']
    setAddresses(next)
    syncDraft({ addresses: next })
  }
  const updateAddress = (i: number, value: string) => {
    const next = [...addresses]
    next[i] = value
    setAddresses(next)
    syncDraft({ addresses: next })
  }
  const removeAddress = (i: number) => {
    const next = addresses.filter((_, idx) => idx !== i)
    setAddresses(next)
    syncDraft({ addresses: next })
  }

  // ── Social helpers ──
  const addSocial = () => {
    const usedPlatforms = new Set(socialLinks.map((l) => l.platform))
    const available = SOCIAL_PLATFORMS.find((p) => !usedPlatforms.has(p))
    if (!available) return
    const next = [...socialLinks, { platform: available, url: '', username: '' }]
    setSocialLinks(next)
    syncDraft({ social_links: next })
  }
  const updateSocial = (i: number, field: 'platform' | 'url' | 'username', value: string) => {
    const next = [...socialLinks]
    next[i] = { ...next[i], [field]: value }
    setSocialLinks(next)
    syncDraft({ social_links: next })
  }
  const removeSocial = (i: number) => {
    const next = socialLinks.filter((_, idx) => idx !== i)
    setSocialLinks(next)
    syncDraft({ social_links: next })
  }

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

        {/* Summary cards */}
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

        {/* Brand context */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="space-y-3"
        >
          <h2 className={WIZARD_SECTION_LABEL}>{t('brandBoard.brandContext.label')}</h2>
          <textarea
            value={brandContext}
            onChange={(e) => handleBrandContextChange(e.target.value)}
            placeholder={t('brandBoard.brandContext.placeholder')}
            rows={4}
            className={WIZARD_TEXTAREA}
          />
          <p className="text-xs text-muted-foreground/70">
            {t('brandBoard.brandContext.hint')}
          </p>
        </motion.div>

        {/* Contact & channels */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="space-y-5"
        >
          <h2 className={WIZARD_SECTION_LABEL}>{t('brandBoard.contact.label')}</h2>

          {/* Emails */}
          <div className="space-y-2">
            {emails.map((email, i) => (
              <div key={`email-${i}`} className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  value={email}
                  onChange={(e) => updateEmail(i, e.target.value)}
                  placeholder={t('brandBoard.contact.emailPlaceholder')}
                  className="h-10 flex-1 rounded-xl border border-input/80 bg-background px-4 text-sm transition-all hover:border-primary/20 focus-visible:ring-0 focus-visible:border-primary"
                />
                <button onClick={() => removeEmail(i)} className="text-muted-foreground/60 hover:text-destructive transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button onClick={addEmail} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Plus className="h-3.5 w-3.5" />
              {t('brandBoard.contact.addEmail')}
            </button>
          </div>

          {/* Phones */}
          <div className="space-y-2">
            {phones.map((phone, i) => (
              <div key={`phone-${i}`} className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  value={phone}
                  onChange={(e) => updatePhone(i, e.target.value)}
                  placeholder={t('brandBoard.contact.phonePlaceholder')}
                  className="h-10 flex-1 rounded-xl border border-input/80 bg-background px-4 text-sm transition-all hover:border-primary/20 focus-visible:ring-0 focus-visible:border-primary"
                />
                <button onClick={() => removePhone(i)} className="text-muted-foreground/60 hover:text-destructive transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button onClick={addPhone} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Plus className="h-3.5 w-3.5" />
              {t('brandBoard.contact.addPhone')}
            </button>
          </div>

          {/* Addresses */}
          <div className="space-y-2">
            {addresses.map((addr, i) => (
              <div key={`addr-${i}`} className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  value={addr}
                  onChange={(e) => updateAddress(i, e.target.value)}
                  placeholder={t('brandBoard.contact.addressPlaceholder')}
                  className="h-10 flex-1 rounded-xl border border-input/80 bg-background px-4 text-sm transition-all hover:border-primary/20 focus-visible:ring-0 focus-visible:border-primary"
                />
                <button onClick={() => removeAddress(i)} className="text-muted-foreground/60 hover:text-destructive transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button onClick={addAddress} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Plus className="h-3.5 w-3.5" />
              {t('brandBoard.contact.addAddress')}
            </button>
          </div>

          {/* Social links */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">{t('brandBoard.contact.socialLabel')}</p>
            {socialLinks.map((link, i) => (
              <div key={`social-${i}`} className="flex items-center gap-2">
                <select
                  value={link.platform}
                  onChange={(e) => updateSocial(i, 'platform', e.target.value)}
                  className="h-10 rounded-xl border border-input/80 bg-background px-3 text-sm transition-all hover:border-primary/20 focus-visible:ring-0 focus-visible:border-primary"
                >
                  {SOCIAL_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {t(`brandBoard.contact.platforms.${p}`)}
                    </option>
                  ))}
                </select>
                <input
                  value={link.username ?? ''}
                  onChange={(e) => updateSocial(i, 'username', e.target.value)}
                  placeholder="@usuario"
                  className="h-10 flex-1 rounded-xl border border-input/80 bg-background px-4 text-sm transition-all hover:border-primary/20 focus-visible:ring-0 focus-visible:border-primary"
                />
                <button onClick={() => removeSocial(i)} className="text-muted-foreground/60 hover:text-destructive transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {socialLinks.length < SOCIAL_PLATFORMS.length && (
              <button onClick={addSocial} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Plus className="h-3.5 w-3.5" />
                {t('brandBoard.contact.addSocial')}
              </button>
            )}
          </div>
        </motion.div>

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
