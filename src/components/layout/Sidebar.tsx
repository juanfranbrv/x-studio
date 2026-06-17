'use client'

import { Loader2 } from '@/components/ui/spinner'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useClerk, useUser } from '@clerk/nextjs'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import {
    IconBrandKit,
    IconImage,
    IconCarousel,
    IconFileText,
    IconLayers,
    IconSettings,
    IconUser,
    IconLogout,
    IconFolderKanban,
} from '@/components/ui/icons'
import { AppLogo } from '@/components/ui/AppLogo'
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
} from './headerDropdownStyles'

interface SidebarProps {
    className?: string
    showLogo?: boolean
    offsetTopClassName?: string
}

export function Sidebar({ className, showLogo = true, offsetTopClassName }: SidebarProps) {
    const { t } = useTranslation('common')
    const pathname = usePathname()
    const { user } = useUser()
    const { signOut } = useClerk()
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const replaceModuleFlags = useQuery(api.settings.getReplaceModuleFlags, {})

    const navItems = [
        { icon: IconBrandKit, label: t('nav.brandKit'), href: '/brand-kit' },
        { icon: IconImage, label: t('nav.image'), href: '/image' },
        { icon: IconCarousel, label: t('nav.carousel'), href: '/carousel' },
        { icon: IconFolderKanban, label: t('nav.library'), href: '/library' },
        ...(replaceModuleFlags?.showReplaceModule ? [{ icon: IconLayers, label: t('nav.replace'), href: '/replace' }] : []),
        { icon: IconFileText, label: t('nav.academy'), href: '/academy' },
    ]

    const handleLogout = async () => {
        setIsLoggingOut(true)
        try {
            await signOut({ redirectUrl: '/' })
        } catch (error) {
            console.error('Error closing session:', error)
            setIsLoggingOut(false)
        }
    }

    const dropdownAccountRowClass =
        'grid min-h-12 grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3 rounded-xl px-3.5 py-2.5'
    const dropdownAccountIconWrapClass =
        'inline-flex h-9 w-9 items-center justify-center justify-self-center'
    const dropdownAccountIconClass = 'shrink-0 text-muted-foreground'

    return (
        <aside
            className={cn(
                'flex h-dvh w-[104px] shrink-0 flex-col overflow-hidden border-r border-border/60 bg-white/74 backdrop-blur-xl transition-colors duration-300 ease-in-out [@media(max-height:820px)]:w-[96px]',
                offsetTopClassName,
                className
            )}
        >
            {showLogo ? (
                <div className="flex flex-col items-center gap-3 border-b border-border/60 px-3 pb-[31px] pt-4 [@media(max-height:820px)]:gap-2 [@media(max-height:820px)]:px-2.5 [@media(max-height:820px)]:pb-5 [@media(max-height:820px)]:pt-3.5">
                    <Link
                        href="/"
                        aria-label="Post laboratory"
                        className="flex h-14 w-14 items-center justify-center rounded-2xl border border-transparent bg-transparent shadow-none transition-transform duration-200 hover:scale-[1.03] [@media(max-height:820px)]:h-12 [@media(max-height:820px)]:w-12"
                    >
                        <AppLogo className="h-[56px] w-[66px] translate-x-[7px] translate-y-[4px] [@media(max-height:820px)]:h-[48px] [@media(max-height:820px)]:w-[58px] [@media(max-height:820px)]:translate-x-[6px] [@media(max-height:820px)]:translate-y-[3px]" />
                    </Link>
                </div>
            ) : null}

            <nav className={cn(
                'thin-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-5 [@media(max-height:820px)]:gap-1.5 [@media(max-height:820px)]:px-2.5 [@media(max-height:820px)]:pb-4',
                showLogo ? 'pt-[31px] [@media(max-height:820px)]:pt-5' : 'pt-5 [@media(max-height:820px)]:pt-4'
            )}>
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'group flex flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 transition-all duration-200 [@media(max-height:820px)]:gap-1.5 [@media(max-height:820px)]:rounded-[1.1rem] [@media(max-height:820px)]:py-2.5',
                                isActive
                                    ? 'border-primary/20 bg-primary/8 text-foreground shadow-[0_18px_40px_-30px_hsl(var(--primary)/0.6)]'
                                    : 'border-transparent text-muted-foreground hover:border-border/60 hover:bg-white/80 hover:text-foreground'
                            )}
                        >
                            <item.icon className={cn('h-7 w-7 shrink-0 [@media(max-height:820px)]:h-6 [@media(max-height:820px)]:w-6', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary')} />
                            <span className="text-center text-[12px] font-semibold leading-tight [@media(max-height:820px)]:text-[11px] [@media(max-height:820px)]:leading-[1.05]">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>

            <div
                className="shrink-0 flex flex-col items-center gap-3 border-t border-border/60 px-3 pb-5 pt-4 [@media(max-height:820px)]:gap-2.5 [@media(max-height:820px)]:px-2.5 [@media(max-height:820px)]:pb-4 [@media(max-height:820px)]:pt-3"
            >
                <Link
                    href="/settings"
                    className={cn(
                        'group flex w-full flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 transition-all duration-200 [@media(max-height:820px)]:gap-1.5 [@media(max-height:820px)]:rounded-[1.1rem] [@media(max-height:820px)]:py-2.5',
                        pathname === '/settings'
                            ? 'border-primary/20 bg-primary/8 text-foreground shadow-[0_18px_40px_-30px_hsl(var(--primary)/0.6)]'
                            : 'border-transparent text-muted-foreground hover:border-border/60 hover:bg-white/80 hover:text-foreground'
                    )}
                >
                    <IconSettings className={cn('h-7 w-7 shrink-0 [@media(max-height:820px)]:h-6 [@media(max-height:820px)]:w-6', pathname === '/settings' ? 'text-primary' : 'text-muted-foreground group-hover:text-primary')} />
                    <span className="text-[12px] font-semibold [@media(max-height:820px)]:text-[11px]">{t('nav.settings')}</span>
                </Link>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-full border border-primary/20 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] transition-colors transition-shadow duration-200 hover:ring-2 hover:ring-primary/25 focus:outline-none focus:ring-2 focus:ring-primary/30 [@media(max-height:820px)]:h-14 [@media(max-height:820px)]:w-14"
                            aria-label={t('labels.accountMenu', { defaultValue: 'Menú de cuenta' })}
                        >
                            {user?.imageUrl ? (
                                <img
                                    src={user.imageUrl}
                                    alt={user.firstName || t('labels.user')}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-muted-foreground">
                                    {user?.firstName?.[0] || 'U'}
                                </div>
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side="right"
                        align="end"
                        className={`w-[280px] ${HEADER_DROPDOWN_CONTENT_CLASS}`}
                    >
                        <DropdownMenuLabel className="px-3.5 py-3 font-normal">
                            <div className="flex flex-col gap-1">
                                <p className="text-[1rem] font-medium leading-tight text-foreground">
                                    {user?.fullName || user?.firstName || t('labels.user')}
                                </p>
                                <p className="text-[0.84rem] leading-tight text-muted-foreground">
                                    {user?.primaryEmailAddress?.emailAddress || ''}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/settings" className={dropdownAccountRowClass}>
                                <span className={dropdownAccountIconWrapClass} aria-hidden="true">
                                    <IconUser size={20} className={dropdownAccountIconClass} />
                                </span>
                                <span>{t('labels.myAccount')}</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            variant="destructive"
                            className={`${dropdownAccountRowClass} cursor-pointer`}
                        >
                            {isLoggingOut ? (
                                <>
                                    <Loader2 className="h-5 w-5 shrink-0" />
                                    <span>{t('actions.loggingOut')}</span>
                                </>
                            ) : (
                                <>
                                    <span className={dropdownAccountIconWrapClass} aria-hidden="true">
                                        <IconLogout size={20} className="shrink-0 opacity-80" />
                                    </span>
                                    <span>{t('actions.logout')}</span>
                                </>
                            )}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </aside>
    )
}


