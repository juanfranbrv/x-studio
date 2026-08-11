import { describe, expect, it } from 'vitest'
import { collectReferencedSlugs, resolvePost, validateManifest, type CampaignManifest } from '../manifest'

const manifestoValido = {
    version: 1,
    campaign: {
        name: 'Bauset · Matrículas agosto 2026',
        brand: 'academia-bauset',
        defaults: {
            platform: 'instagram',
            format: 'ig-square',
            style: 'retrato-natural-calido',
            layout: 'clean',
        },
    },
    posts: [
        {
            ref: 'BAU-01',
            scheduled_at: '2026-08-11T09:30:00+02:00',
            headline: 'El curso 2026-2027 ya está abierto',
            body: 'Agosto también es para descansar...',
            cta: 'Infórmate en nuestra web',
            hashtags: ['#AcademiaBauset'],
        },
    ],
}

function clonar(): Record<string, unknown> {
    return JSON.parse(JSON.stringify(manifestoValido))
}

describe('validateManifest', () => {
    it('acepta un manifiesto correcto', () => {
        const result = validateManifest(manifestoValido)
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.manifest.posts).toHaveLength(1)
        expect(result.manifest.campaign.brand).toBe('academia-bauset')
    })

    it('acepta un post descrito solo con prompt en prosa', () => {
        const m = clonar()
        m.posts = [{ ref: 'BAU-01', prompt: 'Deseo crear una publicación... no debes alterarlo' }]
        const result = validateManifest(m)
        expect(result.ok).toBe(true)
    })

    it('rechaza un post que no describe nada que generar', () => {
        const m = clonar()
        m.posts = [{ ref: 'BAU-01', cta: 'Solo un CTA suelto' }]
        const result = validateManifest(m)
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.errors[0].message).toContain('no describe nada que generar')
        expect(result.errors[0].ref).toBe('BAU-01')
    })

    it('rechaza versiones no soportadas', () => {
        const m = clonar()
        m.version = 2
        const result = validateManifest(m)
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.errors.some((e) => e.path === 'version')).toBe(true)
    })

    it('exige nombre de campana y marca', () => {
        const result = validateManifest({ version: 1, campaign: {}, posts: [{ ref: 'A', prompt: 'x' }] })
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.errors.some((e) => e.path === 'campaign.name')).toBe(true)
        expect(result.errors.some((e) => e.path === 'campaign.brand')).toBe(true)
    })

    it('detecta referencias duplicadas sin distinguir mayusculas', () => {
        const m = clonar()
        m.posts = [
            { ref: 'BAU-01', prompt: 'uno' },
            { ref: 'bau-01', prompt: 'dos' },
        ]
        const result = validateManifest(m)
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.errors.some((e) => e.message.includes('duplicada'))).toBe(true)
    })

    it('rechaza referencias que no sirven como nombre de fichero', () => {
        const m = clonar()
        m.posts = [{ ref: 'BAU 01/con barra', prompt: 'x' }]
        const result = validateManifest(m)
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.errors.some((e) => e.path.endsWith('.ref'))).toBe(true)
    })

    it('rechaza plataformas desconocidas', () => {
        const m = clonar()
        m.posts = [{ ref: 'BAU-01', prompt: 'x', platform: 'threads' }]
        const result = validateManifest(m)
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.errors.some((e) => e.message.includes('Plataforma no reconocida'))).toBe(true)
    })

    it('rechaza fechas no parseables', () => {
        const m = clonar()
        m.posts = [{ ref: 'BAU-01', prompt: 'x', scheduled_at: 'el martes que viene' }]
        const result = validateManifest(m)
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.errors.some((e) => e.path.endsWith('.scheduled_at'))).toBe(true)
    })

    it('avisa (sin fallar) de los posts sin fecha, agrupados', () => {
        const m = clonar()
        m.posts = [{ ref: 'BAU-01', prompt: 'x' }, { ref: 'BAU-02', prompt: 'y' }]
        const result = validateManifest(m)
        expect(result.ok).toBe(true)
        const aviso = result.warnings.find((w) => w.path.includes('scheduled_at'))
        expect(aviso?.message).toContain('2 publicaciones sin fecha')
        expect(aviso?.message).toContain('BAU-01, BAU-02')
    })

    it('avisa cuando ninguna publicacion tiene estilo', () => {
        const m = clonar()
        delete (m.campaign as Record<string, unknown>).defaults
        const result = validateManifest(m)
        expect(result.ok).toBe(true)
        const aviso = result.warnings.find((w) => w.path.includes('style'))
        expect(aviso?.message).toContain('Ninguna publicación indica estilo')
    })

    it('no avisa de estilo si la campana lo define en los defaults', () => {
        const result = validateManifest(manifestoValido)
        expect(result.ok).toBe(true)
        expect(result.warnings.some((w) => w.path.includes('style'))).toBe(false)
    })

    it('avisa solo de las publicaciones sueltas que se quedan sin estilo', () => {
        const m = clonar()
        ;(m.campaign as { defaults: Record<string, unknown> }).defaults.style = undefined
        m.posts = [
            { ref: 'A', prompt: 'x', style: 'retrato-natural-calido' },
            { ref: 'B', prompt: 'y' },
        ]
        const result = validateManifest(m)
        expect(result.ok).toBe(true)
        const aviso = result.warnings.find((w) => w.path.includes('style'))
        expect(aviso?.message).toContain('1 publicaciones sin estilo')
        expect(aviso?.message).toContain('B')
    })

    it('rechaza una lista de posts vacia', () => {
        const m = clonar()
        m.posts = []
        expect(validateManifest(m).ok).toBe(false)
    })

    it('rechaza lo que no es un objeto', () => {
        expect(validateManifest(null).ok).toBe(false)
        expect(validateManifest('{}').ok).toBe(false)
        expect(validateManifest([]).ok).toBe(false)
    })

    it('acumula todos los errores en vez de parar en el primero', () => {
        const result = validateManifest({
            version: 9,
            campaign: {},
            posts: [{ ref: '' }, { ref: 'OK', platform: 'myspace' }],
        })
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.errors.length).toBeGreaterThan(3)
    })
})

describe('collectReferencedSlugs', () => {
    it('reune y deduplica lo referenciado por defaults y posts', () => {
        const result = validateManifest({
            ...manifestoValido,
            posts: [
                { ref: 'A', prompt: 'x', style: 'comic-tinta-bicolor' },
                { ref: 'B', prompt: 'y', style: 'comic-tinta-bicolor', format: 'ig-story' },
            ],
        })
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const refs = collectReferencedSlugs(result.manifest)
        expect(refs.styles.sort()).toEqual(['comic-tinta-bicolor', 'retrato-natural-calido'])
        expect(refs.formats.sort()).toEqual(['ig-square', 'ig-story'])
        expect(refs.layouts).toEqual(['clean'])
    })
})

describe('resolvePost', () => {
    const base: CampaignManifest = {
        version: 1,
        campaign: {
            name: 'C',
            brand: 'b',
            defaults: { platform: 'instagram', format: 'ig-square', style: 'estilo-a', layout: 'clean' },
        },
        posts: [],
    }

    it('hereda los valores por defecto de la campana', () => {
        const resolved = resolvePost(base, { ref: 'A', prompt: 'x' })
        expect(resolved.platform).toBe('instagram')
        expect(resolved.style).toBe('estilo-a')
    })

    it('lo del post gana sobre lo de la campana', () => {
        const resolved = resolvePost(base, { ref: 'A', prompt: 'x', style: 'estilo-b', format: 'ig-story' })
        expect(resolved.style).toBe('estilo-b')
        expect(resolved.format).toBe('ig-story')
        expect(resolved.layout).toBe('clean')
    })
})
