'use client'

import { ReactNode, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useTranslation } from 'react-i18next'
import { IconArrowDown, IconPlus, IconSettings, IconDelete, IconCheckSimple } from '@/components/ui/icons'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CreditsBadge } from './CreditsBadge'
import { MobileMenu } from './MobileMenu'
import { cn } from '@/lib/utils'
import { AppLogo } from '@/components/ui/AppLogo'
import {
    HEADER_DROPDOWN_CONTENT_CLASS,
    HEADER_DROPDOWN_ITEM_CLASS,
    HEADER_DROPDOWN_META_CLASS,
} from './headerDropdownStyles'
import { STUDIO_RICH_SELECT_TRIGGER_CLASS } from '@/components/studio/shared/selectStyles'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { BrandKitSummary, BrandDNA } from '@/lib/brand-types'

interface HeaderProps {
    brands?: BrandKitSummary[]
    currentBrand?: BrandDNA | BrandKitSummary | null
    onBrandChange?: (brandId: string) => void
    onBrandDelete?: (brandId: string) => void
    onNewBrandKit?: () => void
    afterBrandActions?: ReactNode
    variant?: 'card' | 'bar'
}

export function Header({
    brands = [],
    currentBrand,
    onBrandChange,
    onBrandDelete,
    onNewBrandKit,
    afterBrandActions,
    variant = 'card',
}: HeaderProps) {
    const { t } = useTranslation('common')
    const { user } = useUser()
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [brandToDelete, setBrandToDelete] = useState<BrandKitSummary | BrandDNA | null>(null)

    const ADMIN_EMAILS = ['juanfranbrv@gmail.com']
    const isAdmin = user?.emailAddresses?.some((email) => ADMIN_EMAILS.includes(email.emailAddress.toLowerCase()))

    const getBrandInitial = (name?: string) => name?.charAt(0).toUpperCase() || '?'

    const getCompletenessStyle = (value?: number) => {
        const percentage = Number.isFinite(value) ? Number(value) : 0
        if (percentage >= 100) return 'text-emerald-700 bg-emerald-500/15 border-emerald-500/30'
        if (percentage < 70) return 'text-red-700 bg-red-500/15 border-red-500/30'
        return 'text-amber-700 bg-amber-500/15 border-amber-500/30'
    }

    const currentBrandName = ('brand_name' in (currentBrand || {}))
        ? (currentBrand as BrandDNA | BrandKitSummary).brand_name
        : t('labels.switchBrand')
    const currentBrandFavicon = (currentBrand as BrandDNA | BrandKitSummary | undefined)?.favicon_url as string | undefined

    const handleDeleteClick = (brand: BrandKitSummary | BrandDNA, e: React.MouseEvent) => {
        e.stopPropagation()
        setBrandToDelete(brand)
        setDeleteDialogOpen(true)
    }

    const handleConfirmDelete = () => {
        if (brandToDelete && onBrandDelete) {
            onBrandDelete(brandToDelete.id!)
        }
        setDeleteDialogOpen(false)
        setBrandToDelete(null)
    }

    return (
        <>
            <header className={cn(
                "flex shrink-0 items-center justify-between px-4 backdrop-blur-xl md:px-6",
                variant === 'bar'
                    ? "h-[74px] border-b border-border/55 bg-white/74 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
                    : "mx-3 mt-3 h-[72px] rounded-[1.5rem] border border-border/60 bg-white/82 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.38)]"
            )}>
                <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
                    <MobileMenu />

                    <div className="flex shrink-0 items-center gap-2">
                        {variant === 'bar' ? (
                            <Link
                                href="/"
                                aria-label="Post laboratory"
                                className="hidden md:flex h-14 w-14 items-center justify-center overflow-visible rounded-xl border border-transparent bg-transparent shadow-none transition-transform duration-200 hover:scale-[1.03]"
                            >
                                <AppLogo className="h-[74px] w-[84px] translate-x-[21px] -translate-y-[4px]" />
                            </Link>
                        ) : null}
                        <h1 className={cn(
                            "font-heading text-[clamp(1.26rem,1.08rem+0.62vw,1.72rem)] font-semibold leading-none text-primary",
                            variant === 'bar' && "ml-[25px]"
                        )}>
                            {t('app.name')}
                        </h1>
                    </div>

                    {brands.length > 0 ? (
                        <div className={cn(variant === 'bar' && "ml-[40px]")}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className={`${STUDIO_RICH_SELECT_TRIGGER_CLASS} w-[clamp(9.5rem,42vw,12.75rem)] min-w-0 md:w-72`}>
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-[hsl(var(--surface))] translate-y-[1px]">
                                            {currentBrandFavicon ? (
                                                <img src={currentBrandFavicon} alt={currentBrandName} className="h-full w-full object-cover" />
                                            ) : (
                                                <span className="text-sm font-semibold text-muted-foreground">{getBrandInitial(currentBrandName)}</span>
                                            )}
                                        </span>
                                        <span className="block truncate text-left text-[clamp(1rem,0.96rem+0.2vw,1.08rem)] font-medium leading-tight">{currentBrandName}</span>
                                    </span>
                                    <IconArrowDown className="h-[18px] w-[18px] shrink-0 opacity-60" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className={`w-[320px] ${HEADER_DROPDOWN_CONTENT_CLASS} md:w-[440px]`}>
                                {brands.map((brand) => (
                                    <DropdownMenuItem
                                        key={brand.id}
                                        onSelect={() => onBrandChange?.(brand.id)}
                                        className={`group ${HEADER_DROPDOWN_ITEM_CLASS} ${brand.id === currentBrand?.id ? 'bg-primary/8 border border-primary/20' : 'border border-transparent'}`}
                                    >
                                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/60">
                                            {brand.favicon_url ? (
                                                <img src={brand.favicon_url} alt={brand.brand_name} className="h-full w-full object-cover" />
                                            ) : (
                                                <span className="text-sm font-semibold text-muted-foreground">{getBrandInitial(brand.brand_name)}</span>
                                            )}
                                        </div>
                                        <div className="flex min-w-0 flex-1 items-center gap-2">
                                            <span className="truncate text-[clamp(1rem,0.96rem+0.2vw,1.08rem)] font-medium leading-tight">
                                                {brand.brand_name}
                                            </span>
                                            <span className={`whitespace-nowrap rounded-md border px-1.5 py-0.5 ${HEADER_DROPDOWN_META_CLASS} ${getCompletenessStyle(brand.completeness)}`}>
                                                {Math.max(0, Math.min(100, Math.round(brand.completeness ?? 0)))}%
                                            </span>
                                        </div>
                                        {brand.id === currentBrand?.id ? (
                                            <IconCheckSimple className="h-4 w-4 shrink-0 text-primary" />
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                                                onClick={(e) => handleDeleteClick(brand, e)}
                                            >
                                                <IconDelete className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuItem className={`${HEADER_DROPDOWN_ITEM_CLASS} cursor-pointer text-primary`} onClick={onNewBrandKit}>
                                    + {t('labels.newBrand')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </div>
                    ) : null}

                    {onNewBrandKit ? (
                        <Button variant="outline" size="sm" onClick={onNewBrandKit} className={cn(
                            "hidden h-11 gap-2 rounded-2xl border-border/70 bg-[hsl(var(--surface-alt))]/90 px-4 text-[1rem] font-medium transition-all hover:border-primary/20 hover:bg-white md:flex md:h-[3.15rem]",
                            variant === 'bar' && "ml-[15px]"
                        )}>
                            <IconPlus className="h-4 w-4" />
                            {t('actions.newBrandKit')}
                        </Button>
                    ) : null}

                    {afterBrandActions ? (
                        <div className="hidden min-w-0 items-center md:flex">
                            {afterBrandActions}
                        </div>
                    ) : null}
                </div>

                <div className="ml-3 flex shrink-0 items-center gap-1 md:gap-2">
                    <Link href="/settings#credits" className="origin-right scale-75 sm:scale-90 md:mr-2 md:scale-100">
                        <CreditsBadge />
                    </Link>

                    {isAdmin ? (
                        <Link href="/admin" target="_blank" rel="noreferrer">
                            <Button
                                variant="ghost"
                                size="icon"
                                title={t('labels.adminPanel')}
                                className="hidden h-10 w-10 rounded-2xl hover:bg-primary/8 md:flex"
                            >
                                <IconSettings className="h-4.5 w-4.5" />
                            </Button>
                        </Link>
                    ) : null}

                </div>
            </header>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <IconDelete className="h-5 w-5" />
                            {t('brand.deleteTitle', { name: (brandToDelete as BrandDNA | BrandKitSummary | null)?.brand_name || '' })}
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="text-muted-foreground">
                                {t('brand.deleteIntro')}
                                <ul className="mt-2 list-inside list-disc space-y-1">
                                    <li>{t('brand.deleteItems.colors')}</li>
                                    <li>{t('brand.deleteItems.typography')}</li>
                                    <li>{t('brand.deleteItems.assets')}</li>
                                    <li>{t('brand.deleteItems.voice')}</li>
                                </ul>
                                <p className="mt-3 font-semibold">{t('brand.deleteWarning')}</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {t('brand.deleteConfirm')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
