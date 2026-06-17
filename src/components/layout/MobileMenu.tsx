'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useClerk, useUser } from '@clerk/nextjs'
import { useTranslation } from 'react-i18next'
import { IconCarousel, IconFileText, IconHome, IconImage, IconLogout, IconMenu, IconSettings } from '@/components/ui/icons'
import { AppLogo } from '@/components/ui/AppLogo'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from './LanguageSwitcher'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet'

export function MobileMenu() {
    const { t } = useTranslation('common')
    const pathname = usePathname()
    const { signOut } = useClerk()
    const { user } = useUser()
    const [open, setOpen] = useState(false)

    const navItems = [
        { icon: IconHome, label: 'nav.home', href: '/' },
        { icon: IconCarousel, label: 'nav.brandKit', href: '/brand-kit' },
        { icon: IconImage, label: 'nav.image', href: '/image' },
        { icon: IconCarousel, label: 'nav.carousel', href: '/carousel' },
        { icon: IconFileText, label: 'nav.academy', href: '/academy' },
        { icon: IconSettings, label: 'nav.settings', href: '/settings' },
    ]

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2 md:hidden" aria-label={t('actions.openMenu', { defaultValue: 'Abrir menú' })}>
                    <IconMenu className="h-6 w-6" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[80vw] p-0 sm:w-[350px]">
                <SheetHeader className="border-b border-border bg-muted/20 p-6">
                    <SheetTitle className="flex items-center gap-2">
                        <AppLogo className="h-6 w-8" />
                        <span>{t('app.name')}</span>
                    </SheetTitle>
                </SheetHeader>

                <div className="flex h-full flex-col">
                    <nav className="flex flex-1 flex-col gap-2 p-4">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setOpen(false)}
                                    className={cn(
                                        'flex items-center gap-4 rounded-lg px-4 py-3 transition-colors',
                                        isActive
                                            ? 'bg-primary/10 font-medium text-primary'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    <span>{t(item.label)}</span>
                                </Link>
                            )
                        })}
                    </nav>

                    <div className="border-t border-border bg-muted/10 p-4">
                        {user ? (
                            <div className="mb-3 flex items-center gap-3 rounded-xl border border-border/60 bg-white px-3 py-2.5">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted">
                                    {user.imageUrl ? (
                                        <img
                                            src={user.imageUrl}
                                            alt={user.fullName || user.firstName || t('labels.user')}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-sm font-semibold text-muted-foreground">
                                            {(user.firstName || user.primaryEmailAddress?.emailAddress || t('labels.user')).charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-foreground">
                                        {user.fullName || user.firstName || t('labels.user')}
                                    </p>
                                    {user.primaryEmailAddress?.emailAddress ? (
                                        <p className="truncate text-xs text-muted-foreground">
                                            {user.primaryEmailAddress.emailAddress}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}

                        <div className="mb-3 grid gap-3 rounded-2xl border border-border/60 bg-white p-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-foreground">{t('labels.language')}</span>
                                <LanguageSwitcher compact align="end" />
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            className="h-11 w-full justify-start gap-3 rounded-xl border-border/70 text-destructive hover:bg-destructive/5 hover:text-destructive"
                            onClick={async () => {
                                setOpen(false)
                                await signOut({ redirectUrl: '/' })
                            }}
                        >
                            <IconLogout className="h-4.5 w-4.5" />
                            {t('actions.logout')}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
