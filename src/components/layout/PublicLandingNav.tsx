'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth, useClerk, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { getLastVisitedModuleAction } from '@/app/actions/get-last-visited-module'
import { AppLogo } from '@/components/ui/AppLogo'
import { Button } from '@/components/ui/button'
import { Loader2 } from '@/components/ui/spinner'
import { brand } from '@/lib/brand'
import { cn } from '@/lib/utils'
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
import { IconArrowRight, IconLogout, IconSettings } from '@/components/ui/icons'

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

export function PublicLandingNav({
  hasAccess,
  className,
}: {
  hasAccess: boolean
  className?: string
}) {
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
        scrolled ? 'fixed px-4 py-4 sm:px-6' : 'absolute px-6 py-6 sm:px-12',
        className
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
        <Link href="/" className="group flex items-center gap-3">
          <AppLogo className="h-10 w-12 transition-all duration-300 group-hover:scale-110" />
          <span className="text-[1.05rem] font-bold tracking-tight transition-all duration-300 sm:text-[1.35rem]">
            {brand.name}
          </span>
        </Link>

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

      {mobileMenuOpen && (
        <div
          className={cn(
            'mt-2 rounded-2xl border border-border/40 bg-white p-6 shadow-lg md:hidden',
            !scrolled && 'mx-4'
          )}
        >
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
                    <Button variant="outline" className="w-full font-medium">
                      {t('landing.heroCTA')}
                    </Button>
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
                  <Button className="w-full bg-primary font-semibold text-primary-foreground">
                    {t('landing.heroCTA')}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
