'use client'

import { useMemo } from 'react'
import { IconCheck, IconAlertCircle, IconSparkles } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { calculateBrandKitCompleteness, getCompletenessMessage } from '@/lib/brand-kit-utils'
import type { BrandDNA } from '@/lib/brand-types'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
    BRAND_KIT_PAGE_SHELL_CLASS,
    BRAND_KIT_PANEL_DESCRIPTION_CLASS,
    BRAND_KIT_PANEL_HEADER_CLASS,
    BRAND_KIT_PANEL_TITLE_CLASS,
    BRAND_KIT_CALLOUT_CLASS,
} from './brandKitStyles'

interface BrandKitProgressProps {
    brandKit: BrandDNA | null
    showDetails?: boolean
    compact?: boolean
    subtle?: boolean
    className?: string
}

export function BrandKitProgress({ brandKit, showDetails = true, compact = false, subtle = false, className }: BrandKitProgressProps) {
    const { t } = useTranslation('brandKit')
    const completeness = useMemo(() => calculateBrandKitCompleteness(brandKit), [brandKit])
    const message = useMemo(() => getCompletenessMessage(completeness.percentage), [completeness.percentage])

    const subtlePct = completeness.percentage
    const subtleStrokeColor = subtlePct >= 70 ? '#10b981' : subtlePct >= 40 ? '#fb923c' : '#fbbf24'
    const subtleTextColor = subtlePct >= 70 ? 'text-emerald-500' : subtlePct >= 40 ? 'text-orange-400' : 'text-amber-400'

    if (subtle) {
        return (
            <div className={cn(
                BRAND_KIT_CALLOUT_CLASS,
                "flex flex-col sm:flex-row items-center gap-4 sm:gap-8 py-3 px-6",
                "animate-in fade-in slide-in-from-top-2 duration-500",
                className
            )}>
                <div className="flex items-center gap-3 shrink-0">
                    <div className="relative flex h-16 w-16 items-center justify-center">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                            <circle
                                className="stroke-current text-muted/15"
                                strokeWidth="2.5"
                                fill="transparent"
                                r="15"
                                cx="18"
                                cy="18"
                            />
                            <motion.circle
                                stroke={subtleStrokeColor}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                fill="transparent"
                                r="15"
                                cx="18"
                                cy="18"
                                initial={{ strokeDasharray: "94.25, 94.25", strokeDashoffset: 94.25 }}
                                animate={{ strokeDashoffset: 94.25 - (94.25 * subtlePct / 100) }}
                                transition={{ duration: 1.2, ease: "easeOut" }}
                            />
                        </svg>
                        <span className={cn("absolute text-[13px] font-black tabular-nums leading-none", subtleTextColor)}>
                            {subtlePct}%
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80 leading-none mb-1">
                            {t('progress.scoreLabel', { defaultValue: 'Progreso' })}
                        </span>
                        <div className="flex items-center gap-1.5">
                            {completeness.isComplete ? (
                                <IconCheck className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                                <IconSparkles className="h-3.5 w-3.5 text-primary" />
                            )}
                            <span className="text-xs font-bold text-foreground">
                                {completeness.isComplete ? 'Kit Completo' : 'Kit en progreso'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="h-8 w-px bg-border/40 hidden sm:block" />

                <div className="flex-1 min-w-0">
                    {!completeness.isComplete && showDetails ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <IconAlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                            <p className="truncate font-medium">
                                <span className="text-foreground/70">{t('progress.improve', { defaultValue: 'Próximo paso:' })}</span>{' '}
                                {completeness.tips[0]}
                            </p>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                            <IconCheck className="h-4 w-4" />
                            <p>{t('progress.complete', { defaultValue: 'Tu kit de marca está listo para brillar.' })}</p>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    if (compact) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className={cn("flex items-center gap-3 cursor-help", className)}>
                            <div className="h-2.5 w-28 overflow-hidden rounded-full bg-[hsl(var(--surface-alt))]">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-500 ease-out",
                                        completeness.isComplete
                                            ? "bg-primary"
                                            : "bg-gradient-to-r from-primary to-primary/75"
                                    )}
                                    style={{ width: `${completeness.percentage}%` }}
                                />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">
                                {completeness.percentage}%
                            </span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[280px]">
                        <p className="font-medium mb-1">{message.emoji} {message.message}</p>
                        {completeness.tips.length > 0 && (
                            <ul className="text-xs text-muted-foreground space-y-1">
                                {completeness.tips.map((tip, i) => (
                                    <li key={i}>• {tip}</li>
                                ))}
                            </ul>
                        )}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    const pct = completeness.percentage
    const progressColor = pct >= 70
        ? 'text-emerald-500'
        : pct >= 40
            ? 'text-orange-400'
            : 'text-amber-400'
    const barColor = pct >= 70
        ? 'bg-emerald-500'
        : pct >= 40
            ? 'bg-orange-400'
            : 'bg-amber-400'

    return (
        <div className={cn("rounded-[1.5rem] border border-border/40 bg-muted/20 px-6 py-6 shadow-sm", className)}>
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                {/* Porcentaje hero */}
                <div className="flex items-center gap-5">
                    <div className="flex flex-col items-center justify-center shrink-0">
                        <span className={cn("text-5xl font-black leading-none tabular-nums tracking-tight", progressColor)}>
                            {pct}
                        </span>
                        <span className={cn("text-lg font-bold leading-none", progressColor)}>%</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className={BRAND_KIT_PANEL_TITLE_CLASS}>
                            {completeness.isComplete ? (
                                <IconCheck className="!text-emerald-500" />
                            ) : (
                                <IconSparkles />
                            )}
                            <span>
                                {t('progress.title', { defaultValue: 'Completitud del Kit de Marca' })}
                            </span>
                        </div>
                        <p className={BRAND_KIT_PANEL_DESCRIPTION_CLASS}>
                            {completeness.isComplete
                                ? t('progress.complete', { defaultValue: 'Tu Kit de Marca esta listo para generar contenido de alta calidad.' })
                                : t('progress.description', { defaultValue: 'Completa los activos visuales y editoriales para que el resto de la app genere con mas precision.' })}
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-muted/40">
                <motion.div
                    className={cn("h-full rounded-full", barColor)}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                />
            </div>

            <p className={cn("mt-3 text-[1rem] font-medium", message.color)}>
                {message.emoji} {message.message}
            </p>

            {showDetails && completeness.tips.length > 0 && !completeness.isComplete && (
                <div className="mt-4 rounded-[1.2rem] border border-border/70 bg-[hsl(var(--surface-alt))]/70 px-4 py-4">
                    <p className="mb-3 flex items-center gap-1.5 text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        <IconAlertCircle className="h-3.5 w-3.5" />
                        {t('progress.improve', { defaultValue: 'To improve:' })}
                    </p>
                    <ul className="space-y-2.5">
                        {completeness.tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-[0.96rem] leading-relaxed text-foreground/85">
                                <span className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", barColor)} />
                                {tip}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
