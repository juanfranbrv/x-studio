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
  { key: 'images', step: 'images' },
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

  // Tone, Values, and Text Assets
  const [toneOfVoice, setToneOfVoice] = useState<string[]>(draft.tone_of_voice ?? [])
  const [brandValues, setBrandValues] = useState<string[]>(draft.brand_values ?? [])
  const [marketingHooks, setMarketingHooks] = useState<string[]>(draft.text_assets?.marketing_hooks ?? [])
  const [visualKeywords, setVisualKeywords] = useState<string[]>(draft.text_assets?.visual_keywords ?? [])
  const [ctas, setCtas] = useState<string[]>(draft.text_assets?.ctas ?? [])
  const [slogans, setSlogans] = useState<string[]>(draft.text_assets?.slogans ?? [])
  const [headlines, setHeadlines] = useState<string[]>(draft.text_assets?.headlines ?? [])

  const syncDraft = (updates: Partial<typeof draft>) => {
    dispatch({ type: 'UPDATE_DRAFT', data: updates })
  }

  const handleBrandContextChange = (value: string) => {
    setBrandContext(value)
    syncDraft({
      text_assets: {
        ...draft.text_assets,
        marketing_hooks: marketingHooks,
        visual_keywords: visualKeywords,
        ctas: ctas,
        slogans: slogans,
        headlines: headlines,
        brand_context: value,
      },
    })
  }

  // ── Generic helpers for string arrays ──
  const addItem = (list: string[], set: React.Dispatch<React.SetStateAction<string[]>>, field: keyof typeof draft | 'marketing_hooks' | 'visual_keywords' | 'ctas' | 'slogans' | 'headlines', defaultValue: string = '') => {
    const next = [...list, defaultValue]
    set(next)
    if (['marketing_hooks', 'visual_keywords', 'ctas', 'slogans', 'headlines'].includes(field as string)) {
      syncDraft({
        text_assets: {
          ...draft.text_assets,
          marketing_hooks: field === 'marketing_hooks' ? next : (draft.text_assets?.marketing_hooks ?? []),
          visual_keywords: field === 'visual_keywords' ? next : (draft.text_assets?.visual_keywords ?? []),
          ctas: field === 'ctas' ? next : (draft.text_assets?.ctas ?? []),
          slogans: field === 'slogans' ? next : (draft.text_assets?.slogans ?? []),
          headlines: field === 'headlines' ? next : (draft.text_assets?.headlines ?? []),
          brand_context: brandContext,
        }
      })
    } else {
      syncDraft({ [field as any]: next })
    }
  }

  const removeItem = (i: number, list: string[], set: React.Dispatch<React.SetStateAction<string[]>>, field: keyof typeof draft | 'marketing_hooks' | 'visual_keywords' | 'ctas' | 'slogans' | 'headlines') => {
    const next = list.filter((_, idx) => idx !== i)
    set(next)
    if (['marketing_hooks', 'visual_keywords', 'ctas', 'slogans', 'headlines'].includes(field as string)) {
      syncDraft({
        text_assets: {
          ...draft.text_assets,
          marketing_hooks: field === 'marketing_hooks' ? next : (draft.text_assets?.marketing_hooks ?? []),
          visual_keywords: field === 'visual_keywords' ? next : (draft.text_assets?.visual_keywords ?? []),
          ctas: field === 'ctas' ? next : (draft.text_assets?.ctas ?? []),
          slogans: field === 'slogans' ? next : (draft.text_assets?.slogans ?? []),
          headlines: field === 'headlines' ? next : (draft.text_assets?.headlines ?? []),
          brand_context: brandContext,
        }
      })
    } else {
      syncDraft({ [field as any]: next })
    }
  }

  const updateItem = (i: number, value: string, list: string[], set: React.Dispatch<React.SetStateAction<string[]>>, field: keyof typeof draft | 'marketing_hooks' | 'visual_keywords' | 'ctas' | 'slogans' | 'headlines') => {
    const next = [...list]
    next[i] = value
    set(next)
    if (['marketing_hooks', 'visual_keywords', 'ctas', 'slogans', 'headlines'].includes(field as string)) {
      syncDraft({
        text_assets: {
          ...draft.text_assets,
          marketing_hooks: field === 'marketing_hooks' ? next : (draft.text_assets?.marketing_hooks ?? []),
          visual_keywords: field === 'visual_keywords' ? next : (draft.text_assets?.visual_keywords ?? []),
          ctas: field === 'ctas' ? next : (draft.text_assets?.ctas ?? []),
          slogans: field === 'slogans' ? next : (draft.text_assets?.slogans ?? []),
          headlines: field === 'headlines' ? next : (draft.text_assets?.headlines ?? []),
          brand_context: brandContext,
        }
      })
    } else {
      syncDraft({ [field as any]: next })
    }
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
    <div className="flex min-h-dvh flex-col items-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-7xl space-y-12"
      >
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            {t('brandBoard.title')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('brandBoard.subtitle')}
          </p>
        </div>

        {/* Brand Hero section */}
        <div className="bg-card border-2 border-border/60 rounded-[2rem] p-8 md:p-12 shadow-xl shadow-primary/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12 text-center md:text-left">
            <div className="shrink-0 w-32 h-32 md:w-40 md:h-40 bg-white rounded-3xl border-2 border-border/40 p-4 flex items-center justify-center shadow-inner">
              {draft.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.logo_url} alt="Logo" className="max-h-full w-auto object-contain" />
              ) : (
                <Rocket className="w-16 h-16 text-primary/20" />
              )}
            </div>
            <div className="flex-1 space-y-4">
              <div className="space-y-1">
                <h2 className="text-3xl md:text-4xl font-bold">{draft.brand_name || t('brandBoard.sections.brand_name')}</h2>
                <p className="text-xl text-primary font-medium italic opacity-80">"{draft.tagline || t('brandBoard.empty.tagline')}"</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {[...brandValues, ...toneOfVoice].map((v, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                    {v}
                  </span>
                ))}
              </div>
              
                  {/* Secondary Logos Gallery if multiple */}
                  {draft.logos && draft.logos.length > 1 && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/20">
                      <p className="w-full text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1">{t('brandBoard.sections.logoVariations')}</p>
                      {draft.logos.filter(l => l.url !== draft.logo_url).map((l, i) => (
                        <div key={i} className="w-12 h-12 rounded-xl bg-white border border-border/40 p-1 flex items-center justify-center overflow-hidden shadow-sm">
                          <img src={l.url} alt={`Logo variation ${i}`} className="max-h-full w-auto object-contain" />
                        </div>
                      ))}
                    </div>
                  )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditStep('logo')}
              className="md:self-start rounded-full border-primary/20 hover:bg-primary/5"
            >
              {t('brandBoard.editStep')}
            </Button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Visual Identity Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Colors */}
              <div className="bg-card border border-border/60 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {t('brandBoard.sections.colors')}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => onEditStep('palette')} className="h-8 text-xs text-primary">
                    {t('brandBoard.editStep')}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {draft.colors?.filter(c => c.selected !== false).map((c, i) => (
                    <div key={i} className="group relative">
                      <div
                        className="h-14 w-14 rounded-2xl border-2 border-border/40 shadow-sm transition-transform hover:scale-110"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        {c.color}
                      </span>
                    </div>
                  ))}
                  {(!draft.colors || draft.colors.length === 0) && (
                    <p className="text-sm italic text-muted-foreground">{t('brandBoard.empty.colors')}</p>
                  )}
                </div>
              </div>

              {/* Typography */}
              <div className="bg-card border border-border/60 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {t('brandBoard.sections.typography')}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => onEditStep('typography')} className="h-8 text-xs text-primary">
                    {t('brandBoard.editStep')}
                  </Button>
                </div>
                <div className="space-y-4">
                  {draft.fonts?.map((f, i) => (
                    <div key={i} className="border-l-2 border-primary/20 pl-4 py-1">
                      <p className="text-[10px] uppercase tracking-tighter text-muted-foreground mb-1">
                        {f.role === 'heading' ? t('typography.roles.heading') : t('typography.roles.body')}
                      </p>
                      <p className="text-lg font-medium leading-tight" style={{ fontFamily: f.family }}>
                        {f.family}
                      </p>
                    </div>
                  ))}
                  {(!draft.fonts || draft.fonts.length === 0) && (
                    <p className="text-sm italic text-muted-foreground">{t('brandBoard.empty.typography')}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Images Gallery */}
            <div className="bg-card border border-border/60 rounded-3xl p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  {t('brandBoard.sections.images')}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => onEditStep('images')} className="h-8 text-xs text-primary">
                  {t('brandBoard.editStep')}
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {draft.images?.map((img, i) => (
                  <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border border-border/40 shadow-sm transition-all hover:ring-2 hover:ring-primary/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                  </div>
                ))}
                {(!draft.images || draft.images.length === 0) && (
                  <div className="col-span-full py-8 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-border/40">
                    <p className="text-sm italic text-muted-foreground">{t('brandBoard.empty.images')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Brand DNA (Values & Tone) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Values */}
              <div className="bg-card border border-border/60 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {t('brandBoard.sections.brandValues')}
                  </h3>
                  <button onClick={() => addItem(brandValues, setBrandValues, 'brand_values')} className="text-[10px] font-bold text-primary hover:opacity-70">
                    + {t('personality.addCustom').toUpperCase()}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {brandValues.map((v, i) => (
                    <div key={i} className="group relative">
                      <input
                        value={v}
                        onChange={(e) => updateItem(i, e.target.value, brandValues, setBrandValues, 'brand_values')}
                        className="bg-primary/5 border border-primary/10 rounded-full px-3 py-1 text-xs font-medium text-primary focus:ring-1 focus:ring-primary/20 focus:outline-none w-24 sm:w-auto"
                      />
                      <button
                        onClick={() => removeItem(i, brandValues, setBrandValues, 'brand_values')}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="h-2 w-2" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tone of Voice */}
              <div className="bg-card border border-border/60 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {t('brandBoard.sections.toneOfVoice')}
                  </h3>
                  <button onClick={() => addItem(toneOfVoice, setToneOfVoice, 'tone_of_voice')} className="text-[10px] font-bold text-primary hover:opacity-70">
                    + {t('personality.addCustom').toUpperCase()}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {toneOfVoice.map((v, i) => (
                    <div key={i} className="group relative">
                      <input
                        value={v}
                        onChange={(e) => updateItem(i, e.target.value, toneOfVoice, setToneOfVoice, 'tone_of_voice')}
                        className="bg-secondary/5 border border-secondary/10 rounded-full px-3 py-1 text-xs font-medium text-secondary-foreground focus:ring-1 focus:ring-secondary/20 focus:outline-none w-24 sm:w-auto"
                      />
                      <button
                        onClick={() => removeItem(i, toneOfVoice, setToneOfVoice, 'tone_of_voice')}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="h-2 w-2" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Marketing Assets */}
            <div className="bg-card border border-border/60 rounded-3xl p-8 space-y-8">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {t('brandBoard.sections.marketing')}
              </h3>
              
              <div className="space-y-6">
                {/* Hooks / Slogans */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-muted-foreground/60">{t('brandBoard.marketing.slogans').toUpperCase()}</p>
                    <button onClick={() => addItem(marketingHooks, setMarketingHooks, 'marketing_hooks')} className="text-[10px] font-bold text-primary hover:opacity-70">
                      + {t('personality.addCustom').toUpperCase()}
                    </button>
                  </div>
                  {marketingHooks.map((h, i) => (
                    <div key={i} className="group relative">
                      <input
                        value={h}
                        onChange={(e) => updateItem(i, e.target.value, marketingHooks, setMarketingHooks, 'marketing_hooks')}
                        className="w-full bg-muted/30 border border-border/40 rounded-xl px-4 py-3 text-sm focus:border-primary/40 focus:ring-0 transition-all"
                      />
                      <button
                        onClick={() => removeItem(i, marketingHooks, setMarketingHooks, 'marketing_hooks')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* CTAs */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-muted-foreground/60">{t('brandBoard.marketing.ctas').toUpperCase()}</p>
                    <button onClick={() => addItem(ctas, setCtas, 'ctas')} className="text-[10px] font-bold text-primary hover:opacity-70">
                      + {t('personality.addCustom').toUpperCase()}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {ctas.map((c, i) => (
                      <div key={i} className="group relative">
                        <input
                          value={c}
                          onChange={(e) => updateItem(i, e.target.value, ctas, setCtas, 'ctas')}
                          className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-bold shadow-md focus:ring-2 focus:ring-primary/40 focus:outline-none"
                        />
                        <button
                          onClick={() => removeItem(i, ctas, setCtas, 'ctas')}
                          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visual Keywords */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-muted-foreground/60">{t('brandBoard.marketing.headlines').toUpperCase()}</p>
                    <button onClick={() => addItem(visualKeywords, setVisualKeywords, 'visual_keywords')} className="text-[10px] font-bold text-primary hover:opacity-70">
                      + {t('personality.addCustom').toUpperCase()}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {visualKeywords.map((k, i) => (
                      <div key={i} className="group relative">
                        <input
                          value={k}
                          onChange={(e) => updateItem(i, e.target.value, visualKeywords, setVisualKeywords, 'visual_keywords')}
                          className="bg-muted text-muted-foreground rounded-lg px-3 py-1.5 text-xs font-medium border border-border/40 focus:ring-1 focus:ring-primary/20 focus:outline-none"
                        />
                        <button
                          onClick={() => removeItem(i, visualKeywords, setVisualKeywords, 'visual_keywords')}
                          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                        >
                          <X className="h-2 w-2" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Slogans */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-muted-foreground/60">{t('brandBoard.marketing.slogans').toUpperCase()}</p>
                    <button onClick={() => addItem(slogans, setSlogans, 'slogans')} className="text-[10px] font-bold text-primary hover:opacity-70">
                      + {t('personality.addCustom').toUpperCase()}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {slogans.map((s, i) => (
                      <div key={i} className="group relative">
                        <input
                          value={s}
                          onChange={(e) => updateItem(i, e.target.value, slogans, setSlogans, 'slogans')}
                          className="w-full bg-muted/10 border border-border/20 rounded-xl px-4 py-2.5 text-sm focus:border-primary/40 focus:ring-0 transition-all font-medium"
                        />
                        <button
                          onClick={() => removeItem(i, slogans, setSlogans, 'slogans')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Headlines */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-muted-foreground/60">{t('brandBoard.marketing.headlines').toUpperCase()}</p>
                    <button onClick={() => addItem(headlines, setHeadlines, 'headlines')} className="text-[10px] font-bold text-primary hover:opacity-70">
                      + {t('personality.addCustom').toUpperCase()}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {headlines.map((h, i) => (
                      <div key={i} className="group relative">
                        <input
                          value={h}
                          onChange={(e) => updateItem(i, e.target.value, headlines, setHeadlines, 'headlines')}
                          className="w-full bg-muted/10 border border-border/20 rounded-xl px-4 py-2.5 text-sm focus:border-primary/40 focus:ring-0 transition-all font-semibold italic"
                        />
                        <button
                          onClick={() => removeItem(i, headlines, setHeadlines, 'headlines')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Brand Context */}
            <div className="bg-card border border-border/60 rounded-3xl p-8 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {t('brandBoard.brandContext.label')}
              </h3>
              <textarea
                value={brandContext}
                onChange={(e) => handleBrandContextChange(e.target.value)}
                placeholder={t('brandBoard.brandContext.placeholder')}
                rows={4}
                className="w-full bg-transparent border-none focus:ring-0 text-lg leading-relaxed resize-none p-0 placeholder:text-muted-foreground/30"
              />
              <div className="h-0.5 w-12 bg-primary/20 rounded-full" />
              <p className="text-xs text-muted-foreground/60 italic">
                {t('brandBoard.brandContext.hint')}
              </p>
            </div>
          </div>

          {/* Sidebar / Contact Info */}
          <div className="space-y-8">
            <div className="bg-card border border-border/60 rounded-3xl p-8 space-y-8 sticky top-24">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {t('brandBoard.contact.label')}
              </h3>

              <div className="space-y-6">
                {/* Emails Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-muted-foreground/60 flex items-center gap-2">
                       <Mail className="h-3 w-3" /> {t('brandBoard.contact.email').toUpperCase()}
                    </p>
                    <button onClick={addEmail} className="text-[10px] font-bold text-primary hover:opacity-70">
                      + {t('personality.addCustom').toUpperCase()}
                    </button>
                  </div>
                  {emails.map((email, i) => (
                    <div key={`email-${i}`} className="group relative">
                      <input
                        value={email}
                        onChange={(e) => updateEmail(i, e.target.value)}
                        placeholder="hola@marca.com"
                        className="w-full bg-muted/30 border border-border/40 rounded-xl px-4 py-2.5 text-sm focus:border-primary/40 focus:ring-0 transition-all"
                      />
                      <button
                        onClick={() => removeEmail(i)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Phones Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-muted-foreground/60 flex items-center gap-2">
                       <Phone className="h-3 w-3" /> {t('brandBoard.contact.phone').toUpperCase()}
                    </p>
                    <button onClick={addPhone} className="text-[10px] font-bold text-primary hover:opacity-70">
                      + {t('personality.addCustom').toUpperCase()}
                    </button>
                  </div>
                  {phones.map((phone, i) => (
                    <div key={`phone-${i}`} className="group relative">
                      <input
                        value={phone}
                        onChange={(e) => updatePhone(i, e.target.value)}
                        placeholder="+34 000 000 000"
                        className="w-full bg-muted/30 border border-border/40 rounded-xl px-4 py-2.5 text-sm focus:border-primary/40 focus:ring-0 transition-all"
                      />
                      <button
                        onClick={() => removePhone(i)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Addresses Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-muted-foreground/60 flex items-center gap-2">
                       <MapPin className="h-3 w-3" /> {t('brandBoard.contact.address').toUpperCase()}
                    </p>
                    <button onClick={addAddress} className="text-[10px] font-bold text-primary hover:opacity-70">
                      + {t('personality.addCustom').toUpperCase()}
                    </button>
                  </div>
                  {addresses.map((addr, i) => (
                    <div key={`addr-${i}`} className="group relative">
                      <textarea
                        value={addr}
                        onChange={(e) => updateAddress(i, e.target.value)}
                        placeholder="Calle Ejemplo 123..."
                        rows={2}
                        className="w-full bg-muted/30 border border-border/40 rounded-xl px-4 py-2.5 text-sm focus:border-primary/40 focus:ring-0 transition-all resize-none"
                      />
                      <button
                        onClick={() => removeAddress(i)}
                        className="absolute right-2 top-2 p-1.5 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Social Links */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-muted-foreground/60 flex items-center gap-2">
                     {t('brandBoard.contact.social').toUpperCase()}
                  </p>
                  <div className="space-y-2">
                    {socialLinks.map((link, i) => (
                      <div key={`social-${i}`} className="flex gap-2">
                        <select
                          value={link.platform}
                          onChange={(e) => updateSocial(i, 'platform', e.target.value)}
                          className="w-1/3 bg-muted/30 border border-border/40 rounded-xl px-2 py-2 text-xs focus:border-primary/40 focus:ring-0 transition-all"
                        >
                          {SOCIAL_PLATFORMS.map((p) => (
                            <option key={p} value={p}>
                              {p.charAt(0).toUpperCase() + p.slice(1)}
                            </option>
                          ))}
                        </select>
                        <div className="relative flex-1 group">
                          <input
                            value={link.username ?? ''}
                            onChange={(e) => updateSocial(i, 'username', e.target.value)}
                            placeholder="@usuario"
                            className="w-full bg-muted/30 border border-border/40 rounded-xl px-4 py-2 text-xs focus:border-primary/40 focus:ring-0 transition-all"
                          />
                          <button
                            onClick={() => removeSocial(i)}
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {socialLinks.length < SOCIAL_PLATFORMS.length && (
                      <Button variant="ghost" size="sm" onClick={addSocial} className="w-full text-[10px] font-bold text-primary">
                        + {t('brandBoard.contact.addSocial').toUpperCase()}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Final CTA in Sidebar removed (now in StudioNav) */}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
