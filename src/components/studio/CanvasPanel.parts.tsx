'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { IconClose } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { renderLucideLayoutIcon } from '@/lib/layout-icon'

export function renderLayoutIcon(svgIcon: string) {
    const trimmed = (svgIcon || '').trim()
    if (!trimmed) return null

    if (trimmed.startsWith('<svg')) {
        return (
            <div
                className="w-[85%] h-[85%] text-primary/25 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
                dangerouslySetInnerHTML={{ __html: trimmed }}
            />
        )
    }

    const lucideIcon = renderLucideLayoutIcon(trimmed, {
        className: 'w-[85%] h-[85%] text-primary/25 stroke-[1.25]',
    })
    if (lucideIcon) {
        return (
            <div className="w-[85%] h-[85%] flex items-center justify-center">
                {lucideIcon}
            </div>
        )
    }

    return (
        <span
            className="material-symbols-outlined text-primary/25 leading-none"
            style={{ fontSize: 'clamp(240px, 86cqw, 1500px)' }}
        >
            {trimmed}
        </span>
    )
}

export function StyleReferenceCorner({
    url,
    onRemove,
    isMobile = false,
}: {
    url: string
    onRemove?: () => void
    isMobile?: boolean
}) {
    const { t } = useTranslation('common')
    const containerRef = useRef<HTMLDivElement>(null)
    const [boxSize, setBoxSize] = useState({ w: 0, h: 0 })
    const [naturalSize, setNaturalSize] = useState({ w: 1, h: 1 })

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const update = () => {
            setBoxSize({ w: el.clientWidth, h: el.clientHeight })
        }

        update()
        const ro = new ResizeObserver(update)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const ratio = naturalSize.w / naturalSize.h || 1
    let renderW = boxSize.w
    let renderH = renderW / ratio
    if (renderH > boxSize.h) {
        renderH = boxSize.h
        renderW = renderH * ratio
    }

    const imgTop = Math.max(0, boxSize.h - renderH)
    return (
        <div
            ref={containerRef}
            className="absolute z-50 w-[24%] aspect-square overflow-visible -left-10 bottom-10 pointer-events-auto"
        >
            <div
                className="absolute left-0 group"
                style={{ top: `${imgTop}px`, width: `${renderW}px`, height: `${renderH}px` }}
            >
                <img
                    src={url}
                    alt={t('common:styleImage.referenceTitle', { defaultValue: 'Style reference' })}
                    className="w-full h-full object-contain object-left-bottom origin-bottom-left -rotate-[10deg] drop-shadow-[0_12px_22px_rgba(0,0,0,0.24)]"
                    onLoad={(e) => {
                        const target = e.currentTarget
                        if (target.naturalWidth && target.naturalHeight) {
                            setNaturalSize({ w: target.naturalWidth, h: target.naturalHeight })
                        }
                    }}
                />
                {null}
                {onRemove && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation()
                            onRemove()
                        }}
                        className={cn(
                            'absolute top-1 right-1 rounded-full bg-destructive/70 text-destructive-foreground shadow-lg z-50 pointer-events-auto transition-opacity hover:bg-destructive hover:text-destructive-foreground',
                            isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:opacity-100'
                        )}
                        style={{ width: 'clamp(16px, 2.8cqw, 22px)', height: 'clamp(16px, 2.8cqw, 22px)' }}
                    >
                        <IconClose style={{ width: 'clamp(9px, 1.8cqw, 13px)', height: 'clamp(9px, 1.8cqw, 13px)' }} />
                    </Button>
                )}
            </div>
        </div>
    )
}
