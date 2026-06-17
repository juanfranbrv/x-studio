import type { AcademyCategory, AcademyPost } from '@/lib/academy-types'

const ACADEMY_POSTS: AcademyPost[] = [
    {
        slug: 'guia-primer-brand-kit',
        title: 'Cómo montar tu primer Brand Kit sin bloquearte',
        excerpt: 'La forma más rápida de construir una base de marca útil para que Imagen y Carrusel respondan con coherencia desde el primer intento.',
        category: 'guides',
        publishedAt: '2026-04-02',
        coverImage: '/academy/brand-kit-real.png',
        coverImageAlt: 'Vista del módulo Brand Kit en Post laboratory',
        featured: true,
        readingTime: '6 min',
        eyebrow: 'Guía base',
        intro: 'Si el kit de marca arranca flojo, el resto del estudio trabaja a medias. Esta guía condensa el recorrido mínimo para definir una base útil sin convertir el proceso en un formulario infinito.',
        seoDescription: 'Guía para crear un Brand Kit sólido en Post laboratory y mejorar la calidad de Imagen y Carrusel.',
        blocks: [
            { type: 'paragraph', content: 'Empieza por lo que de verdad cambia el resultado: logos, paleta, tono y una muestra clara de tu universo visual. No intentes rellenarlo todo en la primera pasada.' },
            { type: 'heading', content: '1. Prioriza las piezas que gobiernan el resultado' },
            { type: 'paragraph', content: 'Los colores principales, una tipografía reconocible y un contexto de marca honesto pesan más que una lista larguísima de detalles decorativos. El sistema necesita una señal clara, no ruido.' },
            { type: 'image', src: '/academy/brand-kit-real.png', alt: 'Detalle visual del análisis de marca', caption: 'El análisis inicial te da una base; la calidad final depende del criterio con el que la ajustes.' },
            { type: 'heading', content: '2. Usa ejemplos reales de tu marca' },
            { type: 'paragraph', content: 'Si tienes web, piezas publicadas o logos secundarios, súbelos. Cuanto más real sea la referencia, menos tendrás que corregir después en cada generación.' },
            { type: 'callout', title: 'Regla práctica', content: 'Un Brand Kit bueno no es el que tiene más campos rellenos. Es el que hace que la primera generación ya se parezca a tu marca.' },
        ],
        productCta: {
            href: '/brand-kit',
            eyebrow: 'Siguiente paso',
            title: 'Abre tu kit y deja la base lista',
            description: 'Si tu marca todavía no está bien definida dentro del estudio, empieza por aquí antes de generar piezas.',
            buttonLabel: 'Ir a Brand Kit',
        },
    },
    {
        slug: 'tutorial-imagen-desde-brief',
        title: 'De un brief corto a una imagen lista para publicar',
        excerpt: 'Un flujo corto para pasar de una idea en bruto a una pieza visual usable sin perder tiempo retocando el prompt veinte veces.',
        category: 'tutorials',
        publishedAt: '2026-03-30',
        coverImage: '/academy/image-real.png',
        coverImageAlt: 'Vista del módulo Imagen con una pieza generada',
        featured: true,
        readingTime: '5 min',
        eyebrow: 'Tutorial',
        intro: 'La clave no es escribir un prompt barroco. La clave es decidir bien la intención, el contexto visual y el nivel de control que quieres darle al sistema.',
        blocks: [
            { type: 'paragraph', content: 'Empieza con una idea concreta y una acción clara. Si la pieza tiene objetivo comercial, dilo. Si busca awareness, dilo también. La herramienta responde mejor cuando la intención no está mezclada.' },
            { type: 'heading', content: '1. Marca la intención antes del detalle' },
            { type: 'paragraph', content: 'Primero define qué quieres conseguir. Luego ajusta estilo, referencias e imágenes de contenido. Invertir ese orden suele hacer que el proceso se vuelva errático.' },
            { type: 'image', src: '/academy/image-real.png', alt: 'Lienzo de imagen con ajustes semánticos', caption: 'La edición semántica funciona mejor cuando la primera base ya va en la dirección correcta.' },
            { type: 'heading', content: '2. Reutiliza tu contexto de marca' },
            { type: 'paragraph', content: 'No vuelvas a explicar tu marca en cada prompt. Si el Brand Kit está bien construido y las referencias son buenas, el sistema ya parte con ventaja.' },
            { type: 'callout', title: 'Atajo útil', content: 'Cuando una pieza ya está cerca, usa edición semántica para refinar en vez de reiniciar la generación desde cero.' },
        ],
        productCta: {
            href: '/image',
            eyebrow: 'Práctica inmediata',
            title: 'Pruébalo ahora en Imagen',
            description: 'Abre el módulo y construye una pieza desde un brief corto con tu contexto de marca ya aplicado.',
            buttonLabel: 'Ir a Imagen',
        },
    },
    {
        slug: 'novedades-academy-publica',
        title: 'Academy ya vive dentro del producto y también fuera',
        excerpt: 'La nueva capa editorial de Post laboratory conecta ayuda, descubrimiento y navegación pública sin obligar al usuario a salir de la plataforma.',
        category: 'news',
        publishedAt: '2026-04-01',
        coverImage: '/academy/library-mobile-real.png',
        coverImageAlt: 'Vista editorial de Academy integrada en el ecosistema del producto',
        featured: false,
        readingTime: '4 min',
        eyebrow: 'Novedad',
        intro: 'Queríamos una capa de contenido que sirviera a dos ritmos distintos: el del usuario que ya está dentro y el de quien todavía está evaluando la plataforma desde fuera.',
        blocks: [
            { type: 'paragraph', content: 'Academy nace como una sección pública integrada. No es un blog suelto ni una página aislada: es una parte más del producto, con lenguaje editorial y acceso abierto.' },
            { type: 'heading', content: 'Qué cambia' },
            { type: 'paragraph', content: 'Ahora hay un índice de publicaciones, artículos públicos y una entrada estable tanto desde la landing como desde la navegación interna. La idea es reducir fricción y aumentar contexto.' },
            { type: 'heading', content: 'Qué no cambia' },
            { type: 'paragraph', content: 'La V1 sigue siendo ligera: contenido local tipado, estructura clara y sin depender todavía de un CMS externo.' },
            { type: 'callout', title: 'Dirección de producto', content: 'La sección debe enseñar mejor el sistema, no competir con el propio estudio creativo.' },
        ],
        productCta: {
            href: '/carousel',
            eyebrow: 'Explorar módulo',
            title: 'Ver cómo encaja con Carrusel',
            description: 'Las guías y tutoriales no viven aislados: deben ayudarte a pasar del contenido a la acción.',
            buttonLabel: 'Abrir Carrusel',
        },
    },
    {
        slug: 'inspiracion-carrusel-con-contexto',
        title: 'Un carrusel fuerte no empieza en la slide 1: empieza en el contexto',
        excerpt: 'La coherencia entre slides no sale de repetir layouts: sale de dar al sistema una dirección visual y narrativa que aguante toda la secuencia.',
        category: 'inspiration',
        publishedAt: '2026-03-24',
        coverImage: '/academy/carousel-real.png',
        coverImageAlt: 'Vista del módulo Carrusel con varias slides',
        featured: false,
        readingTime: '7 min',
        eyebrow: 'Inspiración',
        intro: 'Cuando un carrusel se siente suelto, casi nunca es un problema de composición aislada. Suele ser una falta de contrato narrativo entre intención, tono y recursos visuales.',
        blocks: [
            { type: 'paragraph', content: 'Piensa cada secuencia como una sola pieza larga que respira por partes. La slide individual importa, pero no debería dictar el lenguaje del conjunto por sí sola.' },
            { type: 'heading', content: 'Secuencias con pulso, no solo con orden' },
            { type: 'paragraph', content: 'Alterna densidad, ritmo y foco visual. Si todas las slides hablan con la misma energía, la historia pierde tensión antes de llegar a la mitad.' },
            { type: 'image', src: '/academy/carousel-real.png', alt: 'Ejemplo de carrusel con slides conectadas', caption: 'La continuidad visual no implica repetición rígida. Implica criterio.' },
            { type: 'callout', title: 'Idea central', content: 'El contexto visual, las referencias y el contrato de marca deben entrar antes que la obsesión por la slide perfecta.' },
        ],
        productCta: {
            href: '/carousel',
            eyebrow: 'Llévalo al estudio',
            title: 'Construye una secuencia con más continuidad',
            description: 'Usa Carrusel para probar una narrativa visual completa en lugar de pensar cada slide como una pieza aislada.',
            buttonLabel: 'Ir a Carrusel',
        },
    },
]

export function getAllAcademyPosts(): AcademyPost[] {
    return [...ACADEMY_POSTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

export function getFeaturedAcademyPosts(): AcademyPost[] {
    return getAllAcademyPosts().filter((post) => post.featured)
}

export function getAcademyPostBySlug(slug: string): AcademyPost | null {
    return ACADEMY_POSTS.find((post) => post.slug === slug) ?? null
}

export function getAcademyPostsByCategory(category: AcademyCategory): AcademyPost[] {
    return getAllAcademyPosts().filter((post) => post.category === category)
}

export function getRelatedAcademyPosts(slug: string, limit = 2): AcademyPost[] {
    const currentPost = getAcademyPostBySlug(slug)
    if (!currentPost) return []

    return getAllAcademyPosts()
        .filter((post) => post.slug !== slug)
        .sort((a, b) => {
            const aScore = a.category === currentPost.category ? 1 : 0
            const bScore = b.category === currentPost.category ? 1 : 0
            if (aScore !== bScore) return bScore - aScore
            return b.publishedAt.localeCompare(a.publishedAt)
        })
        .slice(0, limit)
}

export function getAcademyCategories(): AcademyCategory[] {
    return ['guides', 'tutorials', 'news', 'inspiration']
}
