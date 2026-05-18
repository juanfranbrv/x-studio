import type { AcademyCategory, AcademyPost } from '@/lib/academy-types'

const ACADEMY_POSTS: AcademyPost[] = [
    {
        slug: 'guia-primer-brand-kit',
        title: 'Como montar tu primer Brand Kit sin bloquearte',
        excerpt: 'La forma mas rapida de construir una base de marca util para que Imagen y Carrusel respondan con coherencia desde el primer intento.',
        category: 'guides',
        publishedAt: '2026-04-02',
        coverImage: '/landing/tab-brand.jpg',
        coverImageAlt: 'Vista del modulo Brand Kit en Post laboratory',
        featured: true,
        readingTime: '6 min',
        eyebrow: 'Guia base',
        intro: 'Si el kit de marca arranca flojo, el resto del estudio trabaja a medias. Esta guia condensa el recorrido minimo para definir una base util sin convertir el proceso en un formulario infinito.',
        seoDescription: 'Guia para crear un Brand Kit solido en Post laboratory y mejorar la calidad de Imagen y Carrusel.',
        blocks: [
            { type: 'paragraph', content: 'Empieza por lo que de verdad cambia el resultado: logos, paleta, tono y una muestra clara de tu universo visual. No intentes rellenarlo todo en la primera pasada.' },
            { type: 'heading', content: '1. Prioriza las piezas que gobiernan el resultado' },
            { type: 'paragraph', content: 'Los colores principales, una tipografia reconocible y un contexto de marca honesto pesan mas que una lista larguisima de detalles decorativos. El sistema necesita una senal clara, no ruido.' },
            { type: 'image', src: '/landing/showcase-brand.jpg', alt: 'Detalle visual del analisis de marca', caption: 'El analisis inicial te da una base; la calidad final depende del criterio con el que la ajustes.' },
            { type: 'heading', content: '2. Usa ejemplos reales de tu marca' },
            { type: 'paragraph', content: 'Si tienes web, piezas publicadas o logos secundarios, subelos. Cuanto mas real sea la referencia, menos tendras que corregir despues en cada generacion.' },
            { type: 'callout', title: 'Regla practica', content: 'Un Brand Kit bueno no es el que tiene mas campos rellenos. Es el que hace que la primera generacion ya se parezca a tu marca.' },
        ],
        productCta: {
            href: '/brand-kit',
            eyebrow: 'Siguiente paso',
            title: 'Abre tu kit y deja la base lista',
            description: 'Si tu marca todavia no esta bien definida dentro del estudio, empieza por aqui antes de generar piezas.',
            buttonLabel: 'Ir a Brand Kit',
        },
    },
    {
        slug: 'tutorial-imagen-desde-brief',
        title: 'De un brief corto a una imagen lista para publicar',
        excerpt: 'Un flujo corto para pasar de una idea en bruto a una pieza visual usable sin perder tiempo retocando el prompt veinte veces.',
        category: 'tutorials',
        publishedAt: '2026-03-30',
        coverImage: '/landing/tab-generate.jpg',
        coverImageAlt: 'Vista del modulo Imagen con una pieza generada',
        featured: true,
        readingTime: '5 min',
        eyebrow: 'Tutorial',
        intro: 'La clave no es escribir un prompt barroco. La clave es decidir bien la intencion, el contexto visual y el nivel de control que quieres darle al sistema.',
        blocks: [
            { type: 'paragraph', content: 'Empieza con una idea concreta y una accion clara. Si la pieza tiene objetivo comercial, dilo. Si busca awareness, dilo tambien. La herramienta responde mejor cuando la intencion no esta mezclada.' },
            { type: 'heading', content: '1. Marca la intencion antes del detalle' },
            { type: 'paragraph', content: 'Primero define que quieres conseguir. Luego ajusta estilo, referencias e imagenes de contenido. Invertir ese orden suele hacer que el proceso se vuelva erratico.' },
            { type: 'image', src: '/landing/showcase-edit.jpg', alt: 'Lienzo de imagen con ajustes semanticos', caption: 'La edicion semantica funciona mejor cuando la primera base ya va en la direccion correcta.' },
            { type: 'heading', content: '2. Reutiliza tu contexto de marca' },
            { type: 'paragraph', content: 'No vuelvas a explicar tu marca en cada prompt. Si el Brand Kit esta bien construido y las referencias son buenas, el sistema ya parte con ventaja.' },
            { type: 'callout', title: 'Atajo util', content: 'Cuando una pieza ya esta cerca, usa edicion semantica para refinar en vez de reiniciar la generacion desde cero.' },
        ],
        productCta: {
            href: '/image',
            eyebrow: 'Practica inmediata',
            title: 'Pruebalo ahora en Imagen',
            description: 'Abre el modulo y construye una pieza desde un brief corto con tu contexto de marca ya aplicado.',
            buttonLabel: 'Ir a Imagen',
        },
    },
    {
        slug: 'novedades-academy-publica',
        title: 'Academy ya vive dentro del producto y tambien fuera',
        excerpt: 'La nueva capa editorial de Post laboratory conecta ayuda, descubrimiento y navegacion publica sin obligar al usuario a salir de la plataforma.',
        category: 'news',
        publishedAt: '2026-04-01',
        coverImage: '/landing/showcase-scale.jpg',
        coverImageAlt: 'Vista editorial de Academy integrada en el ecosistema del producto',
        featured: false,
        readingTime: '4 min',
        eyebrow: 'Novedad',
        intro: 'Queriamos una capa de contenido que sirviera a dos ritmos distintos: el del usuario que ya esta dentro y el de quien todavia esta evaluando la plataforma desde fuera.',
        blocks: [
            { type: 'paragraph', content: 'Academy nace como una seccion publica integrada. No es un blog suelto ni una pagina aislada: es una parte mas del producto, con lenguaje editorial y acceso abierto.' },
            { type: 'heading', content: 'Que cambia' },
            { type: 'paragraph', content: 'Ahora hay un indice de publicaciones, articulos publicos y una entrada estable tanto desde la landing como desde la navegacion interna. La idea es reducir friccion y aumentar contexto.' },
            { type: 'heading', content: 'Que no cambia' },
            { type: 'paragraph', content: 'La V1 sigue siendo ligera: contenido local tipado, estructura clara y sin depender todavia de un CMS externo.' },
            { type: 'callout', title: 'Direccion de producto', content: 'La seccion debe enseñar mejor el sistema, no competir con el propio estudio creativo.' },
        ],
        productCta: {
            href: '/carousel',
            eyebrow: 'Explorar modulo',
            title: 'Ver como encaja con Carrusel',
            description: 'Las guias y tutoriales no viven aislados: deben ayudarte a pasar del contenido a la accion.',
            buttonLabel: 'Abrir Carrusel',
        },
    },
    {
        slug: 'inspiracion-carrusel-con-contexto',
        title: 'Un carrusel fuerte no empieza en la slide 1: empieza en el contexto',
        excerpt: 'La coherencia entre slides no sale de repetir layouts: sale de dar al sistema una direccion visual y narrativa que aguante toda la secuencia.',
        category: 'inspiration',
        publishedAt: '2026-03-24',
        coverImage: '/landing/tab-carousel.jpg',
        coverImageAlt: 'Vista del modulo Carrusel con varias slides',
        featured: false,
        readingTime: '7 min',
        eyebrow: 'Inspiracion',
        intro: 'Cuando un carrusel se siente suelto, casi nunca es un problema de composicion aislada. Suele ser una falta de contrato narrativo entre intencion, tono y recursos visuales.',
        blocks: [
            { type: 'paragraph', content: 'Piensa cada secuencia como una sola pieza larga que respira por partes. La slide individual importa, pero no deberia dictar el lenguaje del conjunto por si sola.' },
            { type: 'heading', content: 'Secuencias con pulso, no solo con orden' },
            { type: 'paragraph', content: 'Alterna densidad, ritmo y foco visual. Si todas las slides hablan con la misma energia, la historia pierde tension antes de llegar a la mitad.' },
            { type: 'image', src: '/landing/tab-carousel.jpg', alt: 'Ejemplo de carrusel con slides conectadas', caption: 'La continuidad visual no implica repeticion rigida. Implica criterio.' },
            { type: 'callout', title: 'Idea central', content: 'El contexto visual, las referencias y el contrato de marca deben entrar antes que la obsesion por la slide perfecta.' },
        ],
        productCta: {
            href: '/carousel',
            eyebrow: 'Llevalo al estudio',
            title: 'Construye una secuencia con mas continuidad',
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
