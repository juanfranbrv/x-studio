'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { IconArrowRight } from '@/components/ui/icons'
import type { AcademyPost } from '@/lib/academy-types'
import { cn } from '@/lib/utils'
import {
    ACADEMY_BODY_CLASS,
    ACADEMY_CARD_IMAGE_CLASS,
    ACADEMY_EYEBROW_CLASS,
    ACADEMY_MUTED_SURFACE_CLASS,
} from './academyStyles'

interface AcademyPostCardProps {
    post: AcademyPost
    priority?: 'default' | 'featured'
}

export function AcademyPostCard({ post, priority = 'default' }: AcademyPostCardProps) {
    const { i18n, t } = useTranslation('academy')
    const dateLabel = new Intl.DateTimeFormat(i18n.language, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(new Date(post.publishedAt))

    return (
        <Link
            href={`/academy/${post.slug}`}
            className={cn(
                'group flex h-full flex-col gap-4 rounded-[1.6rem] border border-border/60 bg-background/92 p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] transition-transform duration-200 hover:-translate-y-1 hover:border-primary/25',
                priority === 'featured' && ACADEMY_MUTED_SURFACE_CLASS
            )}
        >
            <img src={post.coverImage} alt={post.coverImageAlt} className={ACADEMY_CARD_IMAGE_CLASS} />

            <div className="flex flex-wrap items-center gap-2 text-[0.8rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                <span className={ACADEMY_EYEBROW_CLASS}>{t(`categories.${post.category}`)}</span>
                <span className="text-border">•</span>
                <span>{dateLabel}</span>
                <span className="text-border">•</span>
                <span>{post.readingTime}</span>
            </div>

            <div className="space-y-3">
                <h3 className="text-[clamp(1.1rem,1.02rem+0.3vw,1.32rem)] font-semibold tracking-[-0.03em] text-foreground">
                    {post.title}
                </h3>
                <p className={cn(ACADEMY_BODY_CLASS, 'line-clamp-3')}>{post.excerpt}</p>
            </div>

            <div className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                {t('post.readArticle')}
                <IconArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
        </Link>
    )
}
