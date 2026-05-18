'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { IconHome, IconImage, IconCarousel, IconFileText, IconSettings } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

export function MobileNav() {
    const { t } = useTranslation()
    const pathname = usePathname()

    const navItems = [
        { icon: IconHome, label: 'nav.home', href: '/' },
        { icon: IconCarousel, label: 'nav.brandKit', href: '/brand-kit' },
        { icon: IconImage, label: 'nav.image', href: '/image' },
        { icon: IconFileText, label: 'nav.academy', href: '/academy' },
        { icon: IconSettings, label: 'nav.settings', href: '/settings' },
    ]

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex justify-around items-center h-16 px-2 md:hidden">
            {navItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                            isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <item.icon className={cn("w-6 h-6", isActive && "fill-current/10")} strokeWidth={isActive ? 2.5 : 2} />
                        <span className="text-[10px] font-medium leading-none">
                            {t(item.label)}
                        </span>
                    </Link>
                )
            })}
        </nav>
    )
}
