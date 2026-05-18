'use client'

import type { AcademyPost } from '@/lib/academy-types'
import { AcademyPostCard } from './AcademyPostCard'

interface AcademyPostGridProps {
    posts: AcademyPost[]
}

export function AcademyPostGrid({ posts }: AcademyPostGridProps) {
    return (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
                <AcademyPostCard key={post.slug} post={post} />
            ))}
        </div>
    )
}
