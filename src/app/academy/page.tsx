import { AcademyIndexPage } from '@/components/academy/AcademyIndexPage'
import { getAllAcademyPosts, getFeaturedAcademyPosts } from '@/lib/academy-content'

export default function AcademyPage() {
    return (
        <AcademyIndexPage
            posts={getAllAcademyPosts()}
            featuredPosts={getFeaturedAcademyPosts()}
        />
    )
}
