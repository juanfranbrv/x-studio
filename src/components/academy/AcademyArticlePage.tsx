'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { IconArrowRight, IconChevronLeft } from '@/components/ui/icons'
import type { AcademyPost } from '@/lib/academy-types'
import { cn } from '@/lib/utils'
import { AcademyChrome } from './AcademyChrome'
import { AcademyPostCard } from './AcademyPostCard'
import { AcademyRichContent } from './AcademyRichContent'
import {
    ACADEMY_BODY_CLASS,
    ACADEMY_EYEBROW_CLASS,
    ACADEMY_MUTED_SURFACE_CLASS,
    ACADEMY_SECTION_TITLE_CLASS,
} from './academyStyles'

interface AcademyArticlePageProps {
    post: AcademyPost
    relatedPosts: AcademyPost[]
}

export function AcademyArticlePage({ post, relatedPosts }: AcademyArticlePageProps) {
    const { i18n, t } = useTranslation('academy')
    const publishedAt = new Intl.DateTimeFormat(i18n.language, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date(post.publishedAt))

    return (
        <AcademyChrome>
            <article className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="border-b border-border/60 px-5 py-6 md:px-8 md:py-8 xl:border-b-0 xl:border-r">
                    <div className="mx-auto max-w-4xl space-y-8">
                        <div className="space-y-4">
                            <Link
                                href="/academy"
                                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/82 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <IconChevronLeft className="h-4 w-4" />
                                {t('article.backToIndex')}
                            </Link>

                            <div className="flex flex-wrap items-center gap-2 text-[0.82rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                <span className={ACADEMY_EYEBROW_CLASS}>{t(`categories.${post.category}`)}</span>
                                <span className="text-border">•</span>
                                <span>{publishedAt}</span>
                                <span className="text-border">•</span>
                                <span>{post.readingTime}</span>
                            </div>

                            <div className="space-y-4">
                                <h1 className={ACADEMY_SECTION_TITLE_CLASS}>{post.title}</h1>
                                <p className={cn(ACADEMY_BODY_CLASS, 'max-w-[62ch] text-[1.06rem] sm:text-[1.12rem]')}>
                                    {post.intro}
                                </p>
                            </div>
                        </div>

                        <img
                            src={post.coverImage}
                            alt={post.coverImageAlt}
                            className="aspect-[16/9] w-full rounded-[1.75rem] border border-border/60 object-cover shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)]"
                        />

                        <AcademyRichContent blocks={post.blocks} />

                        {post.productCta ? (
                            <div className={cn('p-5 md:p-6', ACADEMY_MUTED_SURFACE_CLASS)}>
                                <div className="space-y-3">
                                    <p className={ACADEMY_EYEBROW_CLASS}>{post.productCta.eyebrow}</p>
                                    <h2 className="text-[clamp(1.3rem,1.22rem+0.4vw,1.7rem)] font-semibold tracking-[-0.03em] text-foreground">
                                        {post.productCta.title}
                                    </h2>
                                    <p className={ACADEMY_BODY_CLASS}>{post.productCta.description}</p>
                                    <Link href={post.productCta.href}>
                                        <Button className="mt-2 rounded-full">
                                            {post.productCta.buttonLabel}
                                            <IconArrowRight className="ml-1 h-4 w-4" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>

                <aside className="space-y-5 px-5 py-6 md:px-8 md:py-8">
                    <div className="space-y-3">
                        <p className={ACADEMY_EYEBROW_CLASS}>{t('article.relatedKicker')}</p>
                        <h2 className="text-[1.35rem] font-semibold tracking-[-0.03em] text-foreground">
                            {t('article.relatedTitle')}
                        </h2>
                        <p className={ACADEMY_BODY_CLASS}>{t('article.relatedDescription')}</p>
                    </div>

                    <div className="grid gap-4">
                        {relatedPosts.map((relatedPost) => (
                            <AcademyPostCard key={relatedPost.slug} post={relatedPost} />
                        ))}
                    </div>
                </aside>
            </article>
        </AcademyChrome>
    )
}
