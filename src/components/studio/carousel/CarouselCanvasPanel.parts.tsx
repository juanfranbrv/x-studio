'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

export function renderCompositionGhostIcon(iconName: string) {
    const trimmed = (iconName || '').trim()
    if (!trimmed) return null

    if (trimmed.startsWith('<svg')) {
        return (
            <div
                className="w-[92%] h-[92%] max-w-[820px] max-h-[820px] text-primary/25 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
                dangerouslySetInnerHTML={{ __html: trimmed }}
            />
        )
    }

    return (
        <span
            className="material-symbols-outlined text-primary/25 leading-none"
            style={{ fontSize: 'clamp(140px, 56cqw, 760px)' }}
        >
            {trimmed}
        </span>
    )
}

export function StyleReferenceCorner({ url }: { url: string }) {
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
            className="absolute z-50 w-[24%] aspect-square overflow-visible -left-10 bottom-10 pointer-events-none"
        >
            <div
                className="absolute left-0 group"
                style={{ top: `${imgTop}px`, width: `${renderW}px`, height: `${renderH}px` }}
            >
                <img
                    src={url}
                    alt={t('styleImage.referenceTitle', { defaultValue: 'Style reference' })}
                    className="w-full h-full object-contain object-left-bottom origin-bottom-left -rotate-[10deg] drop-shadow-[0_12px_22px_rgba(0,0,0,0.24)]"
                    onLoad={(e) => {
                        const target = e.currentTarget
                        if (target.naturalWidth && target.naturalHeight) {
                            setNaturalSize({ w: target.naturalWidth, h: target.naturalHeight })
                        }
                    }}
                />
            </div>
        </div>
    )
}
