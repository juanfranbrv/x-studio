'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { IconArrowRight } from '@/components/ui/icons'
import type { AcademyPost } from '@/lib/academy-types'
import { cn } from '@/lib/utils'
import {
    ACADEMY_BODY_CLASS,
    ACADEMY_EYEBROW_CLASS,
    ACADEMY_SECTION_TITLE_CLASS,
} from './academyStyles'
import { AcademyPostCard } from './AcademyPostCard'

interface AcademyHeroProps {
    featuredPost: AcademyPost
    secondaryPosts: AcademyPost[]
}

export function AcademyHero({ featuredPost, secondaryPosts }: AcademyHeroProps) {
    const { t } = useTranslation('academy')

    return (
        <section className="grid gap-8 border-b border-border/50 px-5 py-8 md:px-8 md:py-10 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.72fr)] xl:gap-10">
            <div className="flex h-full flex-col gap-8">
                <div className="space-y-4">
                    <p className={ACADEMY_EYEBROW_CLASS}>{t('hero.kicker')}</p>
                    <h1 className={cn(ACADEMY_SECTION_TITLE_CLASS, 'max-w-4xl text-[clamp(2.2rem,1.8rem+2.2vw,4.6rem)] leading-[0.96]')}>
                        {t('hero.title')}
                    </h1>
                    <p className={cn(ACADEMY_BODY_CLASS, 'max-w-2xl text-[1.04rem] sm:text-[1.08rem]')}>
                        {t('hero.description')}
                    </p>
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(260px,0.82fr)] xl:grid-cols-1">
                    <Link
                        href={`/academy/${featuredPost.slug}`}
                        className="group overflow-hidden rounded-[1.6rem] border border-border/60 bg-background/88 p-4 shadow-[0_20px_60px_-46px_rgba(15,23,42,0.24)] transition-transform duration-200 hover:-translate-y-1 hover:border-primary/25"
                    >
                        <img
                            src={featuredPost.coverImage}
                            alt={featuredPost.coverImageAlt}
                            className="aspect-[16/10] w-full rounded-[1.25rem] object-cover"
                        />
                        <div className="mt-4 space-y-3">
                            <p className={ACADEMY_EYEBROW_CLASS}>{t('hero.featuredLabel')}</p>
                            <h2 className="text-[clamp(1.28rem,1.18rem+0.45vw,1.68rem)] font-semibold tracking-[-0.03em] text-foreground">
                                {featuredPost.title}
                            </h2>
                            <p className={ACADEMY_BODY_CLASS}>{featuredPost.excerpt}</p>
                            <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                                {t('hero.openFeature')}
                                <IconArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                            </div>
                        </div>
                    </Link>

                    <div className="grid gap-4 xl:hidden">
                        {secondaryPosts.map((post) => (
                            <AcademyPostCard key={post.slug} post={post} priority="featured" />
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Link href="/image">
                        <Button className="rounded-full">{t('hero.primaryCta')}</Button>
                    </Link>
                    <Link href="/brand-kit">
                        <Button variant="outline" className="rounded-full bg-background/82">
                            {t('hero.secondaryCta')}
                        </Button>
                    </Link>
                </div>
            </div>

            <aside className="hidden xl:flex">
                <div className="w-full border-l border-border/45 pl-6">
                    <div className="sticky top-28 space-y-5">
                        {secondaryPosts.map((post) => (
                            <AcademyPostCard key={`${post.slug}-rail`} post={post} priority="featured" />
                        ))}
                    </div>
                </div>
            </aside>
        </section>
    )
}
