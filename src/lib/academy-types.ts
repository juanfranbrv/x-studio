export type AcademyCategory = 'guides' | 'tutorials' | 'news' | 'inspiration'

export type AcademyContentBlock =
    | {
        type: 'heading'
        content: string
    }
    | {
        type: 'paragraph'
        content: string
    }
    | {
        type: 'image'
        src: string
        alt: string
        caption?: string
    }
    | {
        type: 'callout'
        title: string
        content: string
    }

export interface AcademyProductCta {
    href: '/image' | '/carousel' | '/brand-kit'
    eyebrow: string
    title: string
    description: string
    buttonLabel: string
}

export interface AcademyPost {
    slug: string
    title: string
    excerpt: string
    category: AcademyCategory
    publishedAt: string
    coverImage: string
    coverImageAlt: string
    featured: boolean
    readingTime: string
    eyebrow: string
    intro: string
    seoDescription?: string
    blocks: AcademyContentBlock[]
    productCta?: AcademyProductCta
}
