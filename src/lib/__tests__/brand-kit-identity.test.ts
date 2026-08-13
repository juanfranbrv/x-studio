import { describe, expect, it } from 'vitest'
import { getCanonicalBrandId, getBrandSlug } from '../brand-kit-identity'

describe('identidad canónica del kit de marca', () => {
    it('prioriza el _id de Convex sobre un id legado', () => {
        expect(getCanonicalBrandId({ _id: 'brand_dna_canonical', id: 'legacy-id' })).toBe('brand_dna_canonical')
    })

    it('usa id cuando el kit ya está normalizado', () => {
        expect(getCanonicalBrandId({ id: 'brand_dna_canonical' })).toBe('brand_dna_canonical')
    })

    it('conserva el slug para permitir la resolución de respaldo', () => {
        expect(getBrandSlug({ slug: 'academia-bauset' })).toBe('academia-bauset')
    })
})
