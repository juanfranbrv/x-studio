'use client'

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AcademyCategory, AcademyPost } from '@/lib/academy-types'
import { AcademyChrome } from './AcademyChrome'
import { AcademyCategoryTabs } from './AcademyCategoryTabs'
import { AcademyHero } from './AcademyHero'
import { AcademyPostGrid } from './AcademyPostGrid'
import { ACADEMY_BODY_CLASS, ACADEMY_EYEBROW_CLASS, ACADEMY_SECTION_TITLE_CLASS } from './academyStyles'

interface AcademyIndexPageProps {
    posts: AcademyPost[]
    featuredPosts: AcademyPost[]
}

export function AcademyIndexPage({ posts, featuredPosts }: AcademyIndexPageProps) {
    const { t } = useTranslation('academy')
    const [activeCategory, setActiveCategory] = useState<'all' | AcademyCategory>('all')

    const categoryOptions = useMemo(
        () => [
            { value: 'all' as const, label: t('categories.all') },
            { value: 'guides' as const, label: t('categories.guides') },
            { value: 'tutorials' as const, label: t('categories.tutorials') },
            { value: 'news' as const, label: t('categories.news') },
            { value: 'inspiration' as const, label: t('categories.inspiration') },
        ],
        [t]
    )

    const visiblePosts = useMemo(() => {
        if (activeCategory === 'all') return posts
        return posts.filter((post) => post.category === activeCategory)
    }, [activeCategory, posts])

    const [heroPost, ...secondaryFeaturedPosts] = featuredPosts

    return (
        <AcademyChrome>
            <AcademyHero featuredPost={heroPost} secondaryPosts={secondaryFeaturedPosts} />

            <section className="space-y-7 px-5 py-8 md:px-8 md:py-10">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl space-y-3">
                        <p className={ACADEMY_EYEBROW_CLASS}>{t('listing.kicker')}</p>
                        <h2 className={ACADEMY_SECTION_TITLE_CLASS}>{t('listing.title')}</h2>
                        <p className={ACADEMY_BODY_CLASS}>{t('listing.description')}</p>
                    </div>

                    <AcademyCategoryTabs
                        categories={categoryOptions}
                        activeCategory={activeCategory}
                        onChange={setActiveCategory}
                    />
                </div>

                <AcademyPostGrid posts={visiblePosts} />
            </section>
        </AcademyChrome>
    )
}
