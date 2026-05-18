import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Post laboratory Academy | Guias, tutoriales y novedades',
    description: 'Academy reune guias, tutoriales, novedades e inspiracion para aprender a usar Post laboratory sin salir del ecosistema del producto.',
    keywords: ['academy', 'docs', 'tutoriales', 'guias', 'post laboratory', 'marketing visual'],
}

export default function AcademyLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
