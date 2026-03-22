'use client'

import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, MessageCircle, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { loadGoogleFont } from '@/lib/load-google-font'
import { WIZARD_PREVIEW_SHELL } from './brandStudioStyles'
import type { BrandDNA } from '@/lib/brand-types'

// ─── Props ──────────────────────────────────────────────────────

interface BrandPreviewCardProps {
  draft: Partial<BrandDNA>
  className?: string
}

// ─── Animation variants ─────────────────────────────────────────

const fadeSlide = {
  initial: { opacity: 0, y: 5 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -5 },
}

const springIn = {
  initial: { opacity: 0, y: 8, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.97 },
  transition: { type: 'spring', stiffness: 400, damping: 26 } as const,
}

// ─── Component ──────────────────────────────────────────────────

export function BrandPreviewCard({ draft, className }: BrandPreviewCardProps) {
  const { t } = useTranslation('brandStudio')

  // ── Color helpers ───────────────────────────────────────────

  const getColor = (role: string) =>
    draft.colors?.find((c) => c.role?.toLowerCase() === role.toLowerCase())?.color

  const textColor = getColor('Texto')
  const bgColor = getColor('Fondo') || '#f8fafc'
  const accents = draft.colors?.filter((c) => c.role === 'Acento').map((c) => c.color) ?? []
  const primary = textColor || accents[0] || draft.colors?.[0]?.color
  const accent = accents[0] || draft.colors?.[1]?.color

  // ── Font helpers ────────────────────────────────────────────

  const headingFont = draft.fonts?.find((f) => f.role === 'heading')?.family
  const bodyFont = draft.fonts?.find((f) => f.role === 'body')?.family

  const fontFamilies = useMemo(() => {
    const families: string[] = []
    if (headingFont) families.push(headingFont)
    if (bodyFont && bodyFont !== headingFont) families.push(bodyFont)
    return families
  }, [headingFont, bodyFont])

  useEffect(() => {
    fontFamilies.forEach(loadGoogleFont)
  }, [fontFamilies])

  // ── Post background ────────────────────────────────────────

  const postBg = bgColor

  // ── Derived data ────────────────────────────────────────────

  const brandName = draft.brand_name
  const tagline = draft.tagline
  const firstCta = draft.text_assets?.ctas?.[0]
  // Prefer web favicon → logo → letter initial
  const webIcon = (draft as Record<string, unknown>).web_icon as string | undefined
  const logoUrl = webIcon || draft.logo_url
  const avatarLetter = brandName?.[0]?.toUpperCase()

  // ── Render ──────────────────────────────────────────────────

  return (
    <div
      className={cn(WIZARD_PREVIEW_SHELL, 'p-4', className)}
      style={{
        animation: 'shadow-pulse 4s ease-in-out infinite',
      }}
    >
      {/* Keyframe injection (once) */}
      <style>{`
        @keyframes shadow-pulse {
          0%, 100% { box-shadow: 0 22px 65px -42px rgba(15,23,42,0.36); }
          50% { box-shadow: 0 28px 75px -40px rgba(15,23,42,0.44); }
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 mb-3">
        {/* Avatar */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full overflow-hidden"
          style={{
            background: logoUrl
              ? undefined
              : primary
                ? `linear-gradient(135deg, ${primary}, ${accent || primary})`
                : 'linear-gradient(135deg, hsl(var(--muted)), hsl(var(--muted-foreground)/0.3))',
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs font-semibold text-white leading-none">
              {avatarLetter || '?'}
            </span>
          )}
        </div>

        {/* Brand name */}
        <AnimatePresence mode="wait">
          {brandName ? (
            <motion.span
              key={brandName}
              className="text-sm font-semibold text-foreground truncate"
              style={headingFont ? { fontFamily: headingFont } : undefined}
              {...fadeSlide}
              transition={{ duration: 0.3 }}
            >
              {brandName}
            </motion.span>
          ) : (
            <motion.span
              key="placeholder-name"
              className="h-3.5 w-24 rounded-md bg-muted/30"
              {...fadeSlide}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── Post visual area ───────────────────────────────── */}
      <div
        className="relative w-full rounded-xl transition-all duration-500 ease-out overflow-hidden flex flex-col items-center justify-center gap-2.5 px-5 py-6"
        style={{
          aspectRatio: '4 / 3',
          backgroundColor: postBg,
        }}
      >
        {/* Logo — centered and prominent */}
        <AnimatePresence>
          {logoUrl && (
            <motion.img
              key={logoUrl}
              src={logoUrl}
              alt=""
              className="h-32 w-32 rounded-lg object-contain z-10"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>

        {/* Accent corner shapes — each accent gets a unique positioned decoration */}
        <AnimatePresence>
          {accents.map((color, i) => {
            const shapes = [
              // 0: top-right — diagonal stripe
              <motion.div
                key={`accent-stripe-${color}`}
                className="absolute top-0 right-0 w-12 h-20 overflow-hidden"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 0.7, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.35 }}
              >
                <div
                  className="absolute -top-2 -right-2 w-20 h-5 rotate-[30deg] origin-top-right rounded-full"
                  style={{ backgroundColor: color }}
                />
              </motion.div>,
              // 1: bottom-left — arc / half-circle
              <motion.div
                key={`accent-arc-${color}`}
                className="absolute -bottom-3 -left-3 w-10 h-10 rounded-full"
                style={{ backgroundColor: color, opacity: 0.55 }}
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: 0.55, scale: 1 }}
                exit={{ opacity: 0, scale: 0.3 }}
                transition={{ duration: 0.35 }}
              />,
              // 2: bottom-right — diamond
              <motion.svg
                key={`accent-diamond-${color}`}
                className="absolute bottom-2.5 right-3"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                initial={{ opacity: 0, rotate: -45, scale: 0.5 }}
                animate={{ opacity: 0.75, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 45, scale: 0.5 }}
                transition={{ duration: 0.35 }}
              >
                <rect x="3" y="3" width="10" height="10" rx="2" fill={color} transform="rotate(45 8 8)" />
              </motion.svg>,
              // 3: top-left (behind logo) — thin vertical bar
              <motion.div
                key={`accent-vbar-${color}`}
                className="absolute top-2 right-2 w-1.5 h-8 rounded-full"
                style={{ backgroundColor: color, opacity: 0.6 }}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 0.6, scaleY: 1 }}
                exit={{ opacity: 0, scaleY: 0 }}
                transition={{ duration: 0.3 }}
              />,
              // 4: center-bottom — wavy underline dots
              <motion.div
                key={`accent-dots-${color}`}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 0.7, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.3 }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              </motion.div>,
            ]
            return shapes[i % shapes.length]
          })}
        </AnimatePresence>

        {/* Accent underline bar below title area */}
        <AnimatePresence>
          {accents.length > 0 && (
            <motion.div
              key={`accent-bar-${accents.join('-')}`}
              className="flex items-center gap-1.5 z-10"
              initial={{ opacity: 0, scaleX: 0.5 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0.5 }}
              transition={{ duration: 0.3 }}
            >
              {accents.slice(0, 5).map((a, i) => (
                <motion.div
                  key={`seg-${a}-${i}`}
                  className="rounded-full"
                  style={{
                    backgroundColor: a,
                    width: i === 0 ? 32 : 12,
                    height: 4,
                  }}
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: i === 0 ? 32 : 12 }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Title */}
        <motion.span
          key={`title-${textColor || 'default'}-${brandName || 'ph'}`}
          className="text-lg font-extrabold tracking-[0.02em] text-center leading-none z-10"
          style={{
            color: textColor || 'hsl(var(--foreground))',
            fontFamily: headingFont || undefined,
          }}
          {...fadeSlide}
          transition={{ duration: 0.35 }}
        >
          {brandName || t('preview.sampleTitle')}
        </motion.span>

        {/* Caption text */}
        <motion.span
          key={`cap-${textColor || 'default'}-${tagline || 'ph'}`}
          className="text-sm font-medium text-center leading-snug max-w-[90%] opacity-80 z-10"
          style={{
            color: textColor || 'hsl(var(--foreground))',
            fontFamily: bodyFont || undefined,
          }}
          {...fadeSlide}
          transition={{ duration: 0.35, delay: 0.08 }}
        >
          {tagline || t('preview.sampleCaption')}
        </motion.span>
      </div>

      {/* ── Tagline ────────────────────────────────────────── */}
      <div className="mt-3 min-h-[1.5rem]">
        <AnimatePresence mode="wait">
          {tagline ? (
            <motion.p
              key={tagline}
              className="text-base text-foreground/85 leading-snug"
              style={bodyFont ? { fontFamily: bodyFont } : undefined}
              {...fadeSlide}
              transition={{ duration: 0.35 }}
            >
              &ldquo;{tagline}&rdquo;
            </motion.p>
          ) : (
            <motion.div
              key="placeholder-tagline"
              className="flex flex-col gap-1.5"
              {...fadeSlide}
              transition={{ duration: 0.25 }}
            >
              <div className="h-3 w-4/5 rounded-md border border-dashed border-muted-foreground/15 bg-muted/20" />
              <div className="h-3 w-3/5 rounded-md border border-dashed border-muted-foreground/15 bg-muted/20" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── CTA Button ─────────────────────────────────────── */}
      <div className="mt-3 min-h-[2rem]">
        <AnimatePresence mode="wait">
          {firstCta ? (
            <motion.button
              key={firstCta}
              className="rounded-full px-4 py-1.5 text-xs font-medium transition-colors"
              style={{
                backgroundColor: accents[0] || primary || 'hsl(var(--primary))',
                color: bgColor !== '#f8fafc' ? bgColor : '#ffffff',
              }}
              {...springIn}
            >
              {firstCta}
            </motion.button>
          ) : (
            <motion.div
              key="placeholder-cta"
              className="h-7 w-28 rounded-full border border-dashed border-muted-foreground/15 bg-muted/20"
              {...fadeSlide}
              transition={{ duration: 0.25 }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── Engagement bar ─────────────────────────────────── */}
      <div className="mt-3.5 flex items-center gap-4 text-muted-foreground/60">
        <span className="flex items-center gap-1 text-xs">
          <Heart className="h-3.5 w-3.5" />
          {t('preview.engagement.likes')}
        </span>
        <span className="flex items-center gap-1 text-xs">
          <MessageCircle className="h-3.5 w-3.5" />
          {t('preview.engagement.comments')}
        </span>
        <span className="flex items-center gap-1 text-xs">
          <Share2 className="h-3.5 w-3.5" />
          {t('preview.engagement.shares')}
        </span>
      </div>
    </div>
  )
}
