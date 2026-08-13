export type BrandKitIdentity = {
    id?: string
    _id?: string
    slug?: string
}

/** Devuelve siempre el identificador real de un registro brand_dna. */
export function getCanonicalBrandId(brand: BrandKitIdentity | null | undefined): string | undefined {
    return brand?._id ?? brand?.id
}

/** Devuelve el slug persistido para resolver el kit si falta el ID. */
export function getBrandSlug(brand: BrandKitIdentity | null | undefined): string | undefined {
    return brand?.slug
}
