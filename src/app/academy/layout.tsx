import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Post laboratory Academy | Guías, tutoriales y novedades',
    description: 'Academy reúne guías, tutoriales, novedades e inspiración para aprender a usar Post laboratory sin salir del ecosistema del producto.',
    keywords: ['academy', 'docs', 'tutoriales', 'guías', 'post laboratory', 'marketing visual'],
}

export default function AcademyLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
