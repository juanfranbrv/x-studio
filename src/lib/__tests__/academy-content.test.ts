import { describe, expect, it } from 'vitest'
import {
    getAcademyCategories,
    getAcademyPostBySlug,
    getAcademyPostsByCategory,
    getAllAcademyPosts,
    getFeaturedAcademyPosts,
    getRelatedAcademyPosts,
} from '../academy-content'

describe('academy content helpers', () => {
    it('ordena publicaciones de mas reciente a mas antigua', () => {
        const posts = getAllAcademyPosts()
        expect(posts[0]?.slug).toBe('guia-primer-brand-kit')
        expect(posts[1]?.slug).toBe('novedades-academy-publica')
    })

    it('resuelve un post por slug y devuelve null si no existe', () => {
        expect(getAcademyPostBySlug('tutorial-imagen-desde-brief')?.title).toContain('brief')
        expect(getAcademyPostBySlug('no-existe')).toBeNull()
    })

    it('filtra featured y categorias conocidas', () => {
        expect(getFeaturedAcademyPosts().map((post) => post.slug)).toEqual([
            'guia-primer-brand-kit',
            'tutorial-imagen-desde-brief',
        ])
        expect(getAcademyPostsByCategory('news')).toHaveLength(1)
        expect(getAcademyCategories()).toEqual(['guides', 'tutorials', 'news', 'inspiration'])
    })

    it('sugiere relacionados sin incluir el post actual', () => {
        const related = getRelatedAcademyPosts('guia-primer-brand-kit', 2)
        expect(related).toHaveLength(2)
        expect(related.some((post) => post.slug === 'guia-primer-brand-kit')).toBe(false)
    })
})
