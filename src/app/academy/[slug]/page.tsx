import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AcademyArticlePage } from '@/components/academy/AcademyArticlePage'
import {
    getAcademyPostBySlug,
    getAllAcademyPosts,
    getRelatedAcademyPosts,
} from '@/lib/academy-content'

interface AcademyArticleRouteProps {
    params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
    return getAllAcademyPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: AcademyArticleRouteProps): Promise<Metadata> {
    const { slug } = await params
    const post = getAcademyPostBySlug(slug)

    if (!post) {
        return { title: 'Academy | Post laboratory' }
    }

    return {
        title: `${post.title} | Academy`,
        description: post.seoDescription ?? post.excerpt,
        openGraph: {
            title: `${post.title} | Academy`,
            description: post.seoDescription ?? post.excerpt,
            images: [{ url: post.coverImage }],
            type: 'article',
        },
    }
}

export default async function AcademyArticleRoute({ params }: AcademyArticleRouteProps) {
    const { slug } = await params
    const post = getAcademyPostBySlug(slug)

    if (!post) {
        notFound()
    }

    return <AcademyArticlePage post={post} relatedPosts={getRelatedAcademyPosts(slug)} />
}
