'use client'

import { Loader2 } from '@/components/ui/spinner'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useAuth, useClerk, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { useTranslation } from 'react-i18next'
import {
  IconArrowRight,
  IconBot,
  IconCheck,
  IconClock,
  IconMail,
  IconMegaphone,
  IconLogout,
  IconRocket,
  IconSettings,
  IconCalendarCheck,
  IconSparkles,
  IconUsers,
} from '@/components/ui/icons'
import { AppLogo } from '@/components/ui/AppLogo'
import { api } from '@/../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { brand } from '@/lib/brand'
import { cn } from '@/lib/utils'
import { getLastVisitedModuleAction } from '@/app/actions/get-last-visited-module'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  HEADER_DROPDOWN_CONTENT_CLASS,
  HEADER_DROPDOWN_ITEM_CLASS,
} from '@/components/layout/headerDropdownStyles'
import { PublicLandingNav } from '@/components/layout/PublicLandingNav'

// Font is now applied globally via CSS --font-sans

/* ─── Scroll-triggered reveal hook ─── */
function useScrollReveal<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return [ref, isVisible] as const
}

/* ─── Animated counter hook ─── */
function useCountUp(target: number, suffix: string, duration = 1800) {
  const [display, setDisplay] = useState(`0${suffix}`)
  const ref = useRef<HTMLParagraphElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          const start = performance.now()
          const animate = (now: number) => {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3)
            const current = Math.round(eased * target)
            setDisplay(`${current}${suffix}`)
            if (progress < 1) requestAnimationFrame(animate)
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, suffix, duration])

  return { ref, display }
}

/* ─── Curved section divider (SVG wave) ─── */
function SectionCurve({ position, className }: { position: 'top' | 'bottom'; className?: string }) {
  if (position === 'top') {
    return (
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className={cn('block w-full', className)} style={{ height: 'clamp(40px, 5vw, 80px)' }}>
        <path d="M0,80 C360,0 1080,0 1440,80 L1440,80 L0,80 Z" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className={cn('block w-full', className)} style={{ height: 'clamp(40px, 5vw, 80px)' }}>
      <path d="M0,0 C360,80 1080,80 1440,0 L1440,0 L0,0 Z" fill="currentColor" />
    </svg>
  )
}

function resolveLabPath(module?: 'image' | 'carousel' | 'brand-kit' | null) {
  if (module === 'brand-kit') return '/brand-kit'
  if (module === 'carousel') return '/carousel'
  return '/image'
}

function LabEntryButton({
  className,
  size,
  label,
  showArrow = true,
}: {
  className?: string
  size?: React.ComponentProps<typeof Button>['size']
  label: string
  showArrow?: boolean
}) {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const [isResolving, setIsResolving] = useState(false)

  const handleClick = useCallback(async () => {
    if (!isLoaded || isResolving) return

    if (!isSignedIn || !user?.id) {
      router.push('/sign-in')
      return
    }

    setIsResolving(true)
    try {
      const result = await getLastVisitedModuleAction(user.id)
      router.push(resolveLabPath(result.success ? result.data?.module : null))
    } finally {
      setIsResolving(false)
    }
  }, [isLoaded, isResolving, isSignedIn, router, user?.id])

  return (
    <Button
      size={size}
      className={className}
      disabled={!isLoaded || isResolving}
      onClick={() => void handleClick()}
    >
      {isResolving ? (
        <Loader2 className="h-4 w-4" />
      ) : (
        <>
          <span>{label}</span>
          {showArrow ? <IconArrowRight className="ml-1 h-4 w-4" /> : null}
        </>
      )}
    </Button>
  )
}

function LandingUserMenu() {
  const { t } = useTranslation('home')
  const { user } = useUser()
  const { signOut } = useClerk()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  if (!user) return null

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut({ redirectUrl: '/' })
    } catch (error) {
      console.error('Error closing session from landing:', error)
      setIsLoggingOut(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-primary/20 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] transition-shadow duration-200 hover:ring-2 hover:ring-primary/25 focus:outline-none focus:ring-2 focus:ring-primary/30"
          aria-label={user.fullName || user.firstName || 'User menu'}
        >
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={user.fullName || user.firstName || 'User'}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-muted-foreground">
              {(user.firstName || user.primaryEmailAddress?.emailAddress || 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={`w-[280px] ${HEADER_DROPDOWN_CONTENT_CLASS}`}>
        <DropdownMenuLabel className="px-3.5 py-3 font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-[1rem] font-medium leading-tight text-foreground">
              {user.fullName || user.firstName || 'Usuario'}
            </p>
            <p className="text-[0.84rem] leading-tight text-muted-foreground">
              {user.primaryEmailAddress?.emailAddress || ''}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className={HEADER_DROPDOWN_ITEM_CLASS}>
          <Link href="/settings" className="grid min-h-12 grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3 rounded-xl px-3.5 py-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center justify-self-center" aria-hidden="true">
              <IconSettings className="h-5 w-5 shrink-0 text-muted-foreground" />
            </span>
            <span>{t('landing.accountSettings', { defaultValue: 'Mi cuenta' })}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
          variant="destructive"
          className={`${HEADER_DROPDOWN_ITEM_CLASS} grid min-h-12 grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3 rounded-xl px-3.5 py-2.5`}
        >
          <span className="inline-flex h-9 w-9 items-center justify-center justify-self-center" aria-hidden="true">
            {isLoggingOut ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin opacity-80" />
            ) : (
              <IconLogout className="h-5 w-5 shrink-0 opacity-80" />
            )}
          </span>
          <span>{isLoggingOut ? t('landing.loggingOut', { defaultValue: 'Cerrando sesión...' }) : t('landing.logout', { defaultValue: 'Cerrar sesión' })}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()
  const userEmail = user?.emailAddresses[0]?.emailAddress || ''

  const betaAccess = useQuery(api.admin.checkBetaAccess, userEmail ? { email: userEmail } : 'skip')

  if (isLoaded && isSignedIn && betaAccess && !betaAccess.hasAccess) {
    if (betaAccess.status === 'pending' || betaAccess.status === 'rejected') {
      return <PendingAccessScreen status={betaAccess.status} email={userEmail} />
    }
  }

  return <LandingPage hasAccess={betaAccess?.hasAccess ?? false} />
}

/* ─────────────────────────── Pending Screen ─────────────────────────── */

function PendingAccessScreen({ status, email }: { status: string; email: string }) {
  const { t } = useTranslation('home')
  const { signOut } = useAuth()

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-8">
      <div className="bg-white rounded-2xl relative z-10 w-full max-w-md border border-border/40 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-border/30 bg-muted shadow-inner">
          {status === 'pending' ? (
            <IconClock className="h-10 w-10 animate-pulse text-primary" />
          ) : (
            <IconBot className="h-10 w-10 text-destructive" />
          )}
        </div>

        <h2 className="mb-2 text-3xl font-bold tracking-tight">
          {status === 'pending' ? t('pending.titlePending') : t('pending.titleRejected')}
        </h2>

        <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
          {status === 'pending'
            ? t('pending.bodyPending', { email })
            : t('pending.bodyRejected')}
        </p>

        <Button
          variant="outline"
          onClick={() => signOut({ redirectUrl: '/' })}
          className="h-12 w-full border-border text-base font-medium transition-all duration-300 hover:bg-white/10"
        >
          {t('pending.backHome')}
        </Button>
      </div>
    </div>
  )
}

/* ─────────────────────────── Main Landing ─────────────────────────── */

function LandingPage({ hasAccess = false }: { hasAccess?: boolean }) {
  const { t } = useTranslation('home')

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      {/* ── Nav ── */}
      <PublicLandingNav hasAccess={hasAccess} />

      {/* ── Hero ── */}
      <HeroSection hasAccess={hasAccess} />

      {/* ── Feature Tabs ── */}
      <FeatureTabsSection />

      {/* ── Feature Showcases (split layout) ── */}
      <FeatureShowcasesSection />

      {/* ── Stats ── */}
      <StatsSection />

      {/* ── Final CTA ── */}
      <FinalCTASection hasAccess={hasAccess} />

      {/* ── Footer ── */}
      <LandingFooter />
    </div>
  )
}

/* ─────────────────────────── Navigation ─────────────────────────── */

function LandingNav({ hasAccess }: { hasAccess: boolean }) {
  const { t } = useTranslation('home')
  const { isSignedIn } = useAuth()
  const { signOut } = useClerk()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navLinks = [
    { href: '#features', label: t('footer.features') },
    { href: '/academy', label: t('footer.academy') },
    { href: '/pricing', label: t('footer.pricing') },
    { href: '/contact', label: t('footer.contact') },
  ]

  return (
    <nav
      className={cn(
        'left-0 right-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'fixed px-4 py-4 sm:px-6'
          : 'absolute px-6 py-6 sm:px-12'
      )}
    >
      <div
        className={cn(
          'mx-auto flex items-center justify-between transition-all duration-300',
          scrolled
            ? 'max-w-[90rem] rounded-2xl border border-border/40 bg-white px-7 py-4 shadow-md'
            : 'max-w-[90rem] px-0 py-0'
        )}
      >
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3">
          <AppLogo className="h-10 w-12 transition-all duration-300 group-hover:scale-110" />
          <span className="text-[1.05rem] font-bold tracking-tight transition-all duration-300 sm:text-[1.35rem]">
            {brand.name}
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-10 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[16px] font-medium text-foreground/70 transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          {!isSignedIn ? (
            <>
              <Link href="/sign-up">
                <Button variant="ghost" className="h-11 rounded-2xl px-4 text-[15px] font-medium">
                  {t('landing.heroCTA')}
                </Button>
              </Link>
              <LabEntryButton
                label={t('landing.enterStudio')}
                className="h-11 rounded-2xl px-5 text-[15px] font-semibold text-primary-foreground shadow-md transition-all hover:scale-[1.03]"
              />
            </>
          ) : hasAccess ? (
            <>
              <LabEntryButton
                label={t('landing.enterStudio')}
                className="h-11 rounded-2xl px-5 text-[15px] font-semibold text-primary-foreground shadow-md transition-all hover:scale-[1.03]"
              />
              <LandingUserMenu />
            </>
          ) : (
            <Link href="/sign-up">
              <Button className="h-11 rounded-2xl px-5 text-[15px] font-semibold text-primary-foreground shadow-md transition-all hover:scale-[1.03]">
                  {t('landing.heroCTA')}
                </Button>
              </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex flex-col gap-1.5 p-2 md:hidden"
          aria-label="Menu"
        >
          <span className={cn('h-0.5 w-5 rounded bg-foreground transition-all', mobileMenuOpen && 'translate-y-2 rotate-45')} />
          <span className={cn('h-0.5 w-5 rounded bg-foreground transition-all', mobileMenuOpen && 'opacity-0')} />
          <span className={cn('h-0.5 w-5 rounded bg-foreground transition-all', mobileMenuOpen && '-translate-y-2 -rotate-45')} />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className={cn(
          'mt-2 rounded-2xl border border-border/40 bg-white p-6 shadow-lg md:hidden',
          !scrolled && 'mx-4'
        )}>
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              {!isSignedIn ? (
                <>
                  <Link href="/sign-up">
                    <Button variant="outline" className="w-full font-medium">{t('landing.heroCTA')}</Button>
                  </Link>
                  <LabEntryButton
                    label={t('landing.enterStudio')}
                    className="w-full bg-primary font-semibold text-primary-foreground"
                  />
                </>
              ) : hasAccess ? (
                <>
                  <LabEntryButton
                    label={t('landing.enterStudio')}
                    className="w-full bg-primary font-semibold text-primary-foreground"
                  />
                  <Button
                    variant="outline"
                    className="w-full font-medium"
                    onClick={async () => {
                      setMobileMenuOpen(false)
                      if (typeof window !== 'undefined') {
                        window.location.href = '/settings'
                      }
                    }}
                  >
                    {t('landing.accountSettings', { defaultValue: 'Mi cuenta' })}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full font-medium text-destructive hover:text-destructive"
                    onClick={async () => {
                      setMobileMenuOpen(false)
                      await signOut({ redirectUrl: '/' })
                    }}
                  >
                    {t('landing.logout', { defaultValue: 'Cerrar sesión' })}
                  </Button>
                </>
              ) : (
                <Link href="/sign-up">
                  <Button className="w-full bg-primary font-semibold text-primary-foreground">{t('landing.heroCTA')}</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

/* ─────────────────────────── Hero Section ─────────────────────────── */

function HeroSection({ hasAccess }: { hasAccess: boolean }) {
  const { t } = useTranslation('home')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState('')
  const submitRequest = useMutation(api.admin.submitBetaRequest)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setIsSubmitting(true)
    try {
      const result = await submitRequest({ email: email.trim() })
      setSubmitted(true)
      setMessage(result.message)
    } catch {
      setMessage(t('landing.requestError'))
    }
    setIsSubmitting(false)
  }

  return (
    <section className="relative px-6 pb-20 pt-32 sm:pt-40 md:pb-28 md:pt-48">

      <div className="mx-auto max-w-6xl text-center">
        {/* Headline */}
        <h1 className="mx-auto max-w-5xl text-balance text-[clamp(2.5rem,5vw,5rem)] font-bold leading-[1.08] tracking-tight">
          {t('landing.heroTitle')}
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-2xl text-[clamp(1.125rem,1.5vw,1.5rem)] font-medium leading-relaxed text-muted-foreground md:mt-8">
          {t('landing.heroBody')}
        </p>

        {/* CTA area */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center md:mt-12">
          {hasAccess ? (
            <LabEntryButton
              size="lg"
              label={t('landing.enterStudio')}
              className="h-14 rounded-2xl bg-primary px-10 text-lg font-bold text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            />
          ) : submitted ? (
            <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-4">
              <IconCheck className="h-6 w-6 text-primary" />
              <p className="font-semibold text-primary">{message || t('landing.registrationCompleted')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex w-full max-w-lg flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <IconMail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 rounded-2xl border-border/60 bg-white pl-12 text-lg transition-all focus:border-primary focus:ring-primary"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                size="lg"
                className="h-14 rounded-2xl bg-primary px-8 text-lg font-bold text-primary-foreground shadow-lg transition-all hover:scale-105 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-6 w-6" /> : t('landing.heroCTA')}
              </Button>
            </form>
          )}
        </div>

        {!hasAccess && !submitted && (
          <div className="mt-4">
            <Link href="/sign-in" className="text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground">
              {t('landing.alreadyHaveAccount')}
            </Link>
          </div>
        )}

        <HeroPillsShowcase />

        {/* Trusted by */}
        <p className="mt-14 text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 md:mt-20">
          {t('landing.trustedBy')}
        </p>
        <div className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-40 sm:gap-x-14">
          {[
            { name: 'Meridian', letters: 'MERIDIAN' },
            { name: 'Lumina', letters: 'LUMINA' },
            { name: 'Vertex', letters: 'VERTEX' },
            { name: 'Pulsar', letters: 'PULSAR' },
            { name: 'Arcadia', letters: 'ARCADIA' },
            { name: 'NovaBrand', letters: 'NOVA' },
          ].map((b) => (
            <span key={b.name} className="text-base font-extrabold tracking-[0.2em] text-foreground/60 sm:text-lg">
              {b.letters}
            </span>
          ))}
        </div>

        {/* ── Interactive hero showcase (Slack-style pills + image) ── */}
      </div>
    </section>
  )
}

/* ─────────────────────── Hero Pills Showcase (Slack style) ─────────────────────── */

const HERO_PILLS = [
  { key: 'productLaunch', icon: IconRocket, image: '/landing/hero-launch.webp' },
  { key: 'dailyPosts', icon: IconCalendarCheck, image: '/landing/hero-daily.webp' },
  { key: 'campaignDesign', icon: IconSparkles, image: '/landing/hero-campaign.webp' },
  { key: 'teamContent', icon: IconUsers, image: '/landing/hero-team.webp' },
  { key: 'promoOffer', icon: IconMegaphone, image: '/landing/hero-promo.webp' },
] as const

function HeroPillsShowcase() {
  const { t } = useTranslation('home')
  const [activeIdx, setActiveIdx] = useState(0)

  return (
    <div className="mt-10 md:mt-14">
      {/* Image */}
      <div className="mx-auto max-w-[900px] overflow-hidden rounded-2xl border border-border/40 shadow-xl sm:rounded-3xl">
        <div className="relative aspect-[16/10]">
          {HERO_PILLS.map((pill, idx) => (
            <img
              key={pill.key}
              src={pill.image}
              alt={t(`heroPills.${pill.key}`)}
              className={cn(
                'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
                idx === activeIdx ? 'opacity-100' : 'opacity-0'
              )}
            />
          ))}
        </div>
      </div>

      {/* Pills */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:mt-10">
        {HERO_PILLS.map((pill, idx) => {
          const Icon = pill.icon
          const isActive = idx === activeIdx
          return (
            <button
              key={pill.key}
              onClick={() => setActiveIdx(idx)}
              className={cn(
                'flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 sm:text-base',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              )}
            >
              {t(`heroPills.${pill.key}`)}
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────── Feature Tabs (Auto-rotate + Progress Bar) ─────────────────────────── */

const TAB_KEYS = ['brandKit', 'generateImages', 'carousels', 'editSemantic', 'multiFormat'] as const
const TAB_DURATION = 6000 // ms per tab

const TAB_IMAGES: Record<string, string> = {
  brandKit: '/landing/tab-brand.jpg',
  generateImages: '/landing/tab-generate.jpg',
  carousels: '/landing/tab-carousel.jpg',
  editSemantic: '/landing/tab-edit.jpg',
  multiFormat: '/landing/tab-format.jpg',
}

function FeatureTabsSection() {
  const { t } = useTranslation('home')
  const [activeIdx, setActiveIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const startTimeRef = useRef(0)
  const isPausedRef = useRef(false)

  const activeTab = TAB_KEYS[activeIdx]

  const goToTab = useCallback((idx: number) => {
    setActiveIdx(idx)
    setProgress(0)
    startTimeRef.current = Date.now()
  }, [])

  const advanceTab = useCallback(() => {
    setActiveIdx((prev) => (prev + 1) % TAB_KEYS.length)
    setProgress(0)
    startTimeRef.current = Date.now()
  }, [])

  useEffect(() => {
    startTimeRef.current = Date.now()
    const timer = setInterval(() => {
      if (isPausedRef.current) return
      const elapsed = Date.now() - startTimeRef.current
      const pct = Math.min(elapsed / TAB_DURATION, 1)
      setProgress(pct)
      if (pct >= 1) advanceTab()
    }, 30)
    return () => clearInterval(timer)
  }, [advanceTab])

  const handleMouseEnter = () => { isPausedRef.current = true }
  const handleMouseLeave = () => {
    isPausedRef.current = false
    startTimeRef.current = Date.now() - progress * TAB_DURATION
  }

  return (
    <section className="relative">
      {/* Curved top divider */}
      <SectionCurve position="top" className="text-muted" />
      <div className="bg-muted pb-20 pt-8 md:pb-28 md:pt-12">
      <div className="mx-auto max-w-[90rem] px-6 sm:px-10">
        <h2 className="mb-4 text-center text-[clamp(1.75rem,3vw,3rem)] font-bold tracking-tight">
          {t('tabs.label')}
        </h2>

        <div
          className="mt-12 grid items-stretch gap-10 md:mt-16 md:grid-cols-[minmax(0,1fr)_1.4fr] md:gap-14 lg:gap-20"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Left: Tab list with thick vertical progress bars (Slack style) */}
          <div className="flex flex-col justify-between gap-0">
            {TAB_KEYS.map((key, idx) => {
              const isActive = idx === activeIdx
              const isPast = idx < activeIdx
              return (
                <button
                  key={key}
                  onClick={() => goToTab(idx)}
                  className="group relative flex flex-1 items-stretch gap-5 py-1 text-left"
                >
                  {/* Thick vertical progress bar */}
                  <div className="relative w-1 shrink-0 overflow-hidden rounded-full bg-border/40">
                    <div
                      className="absolute left-0 top-0 w-full rounded-full bg-primary"
                      style={{
                        height: isActive ? `${progress * 100}%` : isPast ? '100%' : '0%',
                        transition: isActive ? 'height 50ms linear' : 'height 300ms ease',
                      }}
                    />
                  </div>

                  {/* Text content */}
                  <div className="flex flex-1 flex-col justify-center py-4">
                    <h3 className={cn(
                      'text-[clamp(1.125rem,1.5vw,1.375rem)] font-bold tracking-tight transition-colors duration-200',
                      isActive ? 'text-foreground' : 'text-muted-foreground/60 group-hover:text-muted-foreground'
                    )}>
                      {t(`tabs.${key}.title`)}
                    </h3>

                    {/* Expandable description */}
                    <div
                      className={cn(
                        'grid transition-all duration-400',
                        isActive ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      )}
                    >
                      <div className="overflow-hidden">
                        <p className="text-[clamp(0.9375rem,1.1vw,1.125rem)] leading-relaxed text-muted-foreground">
                          {t(`tabs.${key}.description`)}
                        </p>
                        <Link
                          href={tabHref(key)}
                          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                        >
                          {t('landing.learnMore')} <IconArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Right: Image area with crossfade — stretches to match text column height */}
          <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-muted shadow-lg">
            <div className="relative h-full min-h-[300px] sm:min-h-[400px]">
              {TAB_KEYS.map((key, idx) => (
                <img
                  key={key}
                  src={TAB_IMAGES[key]}
                  alt={t(`tabs.${key}.tab`)}
                  className={cn(
                    'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
                    idx === activeIdx ? 'opacity-100' : 'opacity-0'
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
      {/* Curved bottom divider */}
      <SectionCurve position="bottom" className="text-muted" />
    </section>
  )
}

function tabHref(tab: string) {
  switch (tab) {
    case 'brandKit': return '/brand-kit'
    case 'generateImages': return '/image'
    case 'carousels': return '/carousel'
    default: return '/image'
  }
}

/* ─────────────────────── Feature Showcases ─────────────────────── */

const SHOWCASES = [
  { key: 'brandDNA', image: '/landing/showcase-brand.jpg' },
  { key: 'multiAsset', image: '/landing/showcase-multi.jpg' },
  { key: 'smartEditing', image: '/landing/showcase-edit.jpg' },
  { key: 'teamScale', image: '/landing/showcase-scale.jpg' },
] as const

function FeatureShowcasesSection() {
  const { t } = useTranslation('home')
  const [headerRevealRef, headerRevealVisible] = useScrollReveal<HTMLDivElement>()

  return (
    <section id="features" className="py-20 md:py-28">
      <div className="mx-auto max-w-[90rem] px-6 sm:px-10">
        <div
          ref={headerRevealRef}
          className={cn(
            'transition-all duration-700',
            headerRevealVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          )}
        >
          <h2 className="mx-auto max-w-3xl text-center text-[clamp(1.75rem,3vw,3rem)] font-bold tracking-tight">
            {t('showcase.sectionTitle')}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-center text-[clamp(1.0625rem,1.3vw,1.25rem)] leading-relaxed text-muted-foreground">
            {t('showcase.sectionSubtitle')}
          </p>
        </div>

        <div className="mt-16 space-y-20 md:mt-24 md:space-y-28">
          {SHOWCASES.map((item, idx) => (
            <ShowcaseRow key={item.key} item={item} idx={idx} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ShowcaseRow({ item, idx }: { item: typeof SHOWCASES[number]; idx: number }) {
  const { t } = useTranslation('home')
  const isReversed = idx % 2 !== 0
  const [textRevealRef, textRevealVisible] = useScrollReveal<HTMLDivElement>(0.2)
  const [imageRevealRef, imageRevealVisible] = useScrollReveal<HTMLDivElement>(0.15)

  return (
    <div
      className={cn(
        'grid items-center gap-10 md:grid-cols-2 md:gap-16',
        isReversed && 'md:[&>*:first-child]:order-2'
      )}
    >
      {/* Text — slides in from the side */}
      <div
        ref={textRevealRef}
        className={cn(
          'transition-all duration-700',
          textRevealVisible
            ? 'translate-x-0 opacity-100'
            : isReversed ? 'translate-x-12 opacity-0' : '-translate-x-12 opacity-0'
        )}
      >
        <h3 className="text-[clamp(1.5rem,2.5vw,2.5rem)] font-bold tracking-tight">
          {t(`showcase.${item.key}.title`)}
        </h3>
        <p className="mt-5 text-[clamp(1.0625rem,1.3vw,1.25rem)] leading-relaxed text-muted-foreground">
          {t(`showcase.${item.key}.description`)}
        </p>
        <Link
          href="/image"
          className="mt-6 inline-flex items-center gap-1.5 text-base font-semibold text-primary transition-colors hover:text-primary/80"
        >
          {t(`showcase.${item.key}.link`)} <IconArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Image — slides in from opposite side + subtle parallax scale */}
      <div
        ref={imageRevealRef}
        className={cn(
          'overflow-hidden rounded-3xl border border-border/40 shadow-lg transition-all duration-700',
          imageRevealVisible
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-16 scale-95 opacity-0'
        )}
      >
        <img
          src={item.image}
          alt={t(`showcase.${item.key}.title`)}
          className="aspect-[4/3] w-full object-cover transition-transform duration-[1200ms] hover:scale-105"
        />
      </div>
    </div>
  )
}

/* ─────────────────────────── Stats ─────────────────────────── */

const STAT_KEYS = ['stat1', 'stat2', 'stat3', 'stat4'] as const

/* Parsed stat values for counter animation */
const STAT_TARGETS: Record<string, { value: number; suffix: string }> = {
  stat1: { value: 729, suffix: '+' },
  stat2: { value: 30, suffix: 's' },
  stat3: { value: 20, suffix: '+' },
  stat4: { value: 6, suffix: '' },
}

function AnimatedStat({ statKey }: { statKey: string }) {
  const { t } = useTranslation('home')
  const target = STAT_TARGETS[statKey]
  const { ref, display } = useCountUp(target.value, target.suffix)

  return (
    <div className="text-center">
      <p
        ref={ref}
        className="text-[clamp(2.5rem,5vw,4rem)] font-extrabold tracking-tight text-primary-foreground"
      >
        {display}
      </p>
      <p className="mt-2 text-sm font-medium leading-snug text-primary-foreground/70 sm:text-base">
        {t(`stats.${statKey}.label`)}
      </p>
    </div>
  )
}

function StatsSection() {
  const { t } = useTranslation('home')
  const [headerRevealRef, headerRevealVisible] = useScrollReveal<HTMLDivElement>(0.3)

  return (
    <section className="relative">
      {/* Curved top divider */}
      <SectionCurve position="top" className="text-primary" />
      <div className="bg-primary pb-20 pt-8 md:pb-28 md:pt-12">
        <div className="mx-auto max-w-[90rem] px-6 sm:px-10">
          <div
            ref={headerRevealRef}
            className={cn(
              'transition-all duration-700',
              headerRevealVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            )}
          >
            <h2 className="mb-4 text-center text-[clamp(1.75rem,3vw,2.5rem)] font-bold tracking-tight text-primary-foreground">
              {t('proof.title')}
            </h2>
            <p className="mx-auto mb-14 max-w-xl text-center text-[clamp(1.0625rem,1.3vw,1.25rem)] text-primary-foreground/70">
              {t('proof.subtitle')}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
            {STAT_KEYS.map((key) => (
              <AnimatedStat key={key} statKey={key} />
            ))}
          </div>
        </div>
      </div>
      {/* Curved bottom divider */}
      <SectionCurve position="bottom" className="text-primary" />
    </section>
  )
}

/* ─────────────────────────── Final CTA ─────────────────────────── */

function FinalCTASection({ hasAccess }: { hasAccess: boolean }) {
  const { t } = useTranslation('home')

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <h2 className="text-[clamp(1.75rem,3vw,3rem)] font-bold tracking-tight">
          {t('cta.title')}
        </h2>
        <p className="mt-4 text-[clamp(1.0625rem,1.3vw,1.375rem)] text-muted-foreground">
          {t('cta.subtitle')}
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          {hasAccess ? (
            <LabEntryButton
              size="lg"
              label={t('cta.primaryButton')}
              showArrow={false}
              className="h-14 rounded-2xl bg-primary px-10 text-lg font-bold text-primary-foreground shadow-lg transition-all hover:scale-105"
            />
          ) : (
            <Link href="/sign-up">
              <Button size="lg" className="h-14 rounded-2xl bg-primary px-10 text-lg font-bold text-primary-foreground shadow-lg transition-all hover:scale-105">
                {t('cta.primaryButton')}
              </Button>
            </Link>
          )}
          <Link href="/contact">
            <Button size="lg" variant="outline" className="h-14 rounded-2xl px-10 text-lg font-semibold">
              {t('cta.secondaryButton')}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── Footer ─────────────────────────── */

function LandingFooter() {
  const { t } = useTranslation('home')

  const columns = [
    {
      title: t('footer.product'),
      links: [
        { label: t('footer.features'), href: '#features' },
        { label: t('footer.pricing'), href: '/pricing' },
        { label: t('footer.changelog'), href: '#' },
      ],
    },
    {
      title: t('footer.company'),
      links: [
        { label: t('footer.about'), href: '/contact' },
        { label: t('footer.blog'), href: '/academy' },
        { label: t('footer.careers'), href: '#' },
      ],
    },
    {
      title: t('footer.resources'),
      links: [
        { label: t('footer.docs'), href: '/academy' },
        { label: t('footer.help'), href: '/academy' },
        { label: t('footer.community'), href: '#' },
      ],
    },
    {
      title: t('footer.legal'),
      links: [
        { label: t('footer.privacy'), href: '/privacy' },
        { label: t('footer.terms'), href: '/terms' },
        { label: t('footer.cookies'), href: '/cookies' },
      ],
    },
  ]

  return (
    <footer className="mt-auto border-t border-border/40 bg-muted/20">
      <div className="mx-auto max-w-[90rem] px-6 py-12 sm:px-10 md:py-16">
        <div className="grid gap-10 md:grid-cols-6">
          {/* Brand column */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <AppLogo className="h-7 w-9" />
              <span className="text-lg font-bold tracking-tight">{brand.name}</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t('landing.heroBody')}
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground/70">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/30 pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground/60">{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  )
}
