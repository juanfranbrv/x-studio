import type { ContentLibraryAsset } from './contentLibraryTypes'

/**
 * Regla unica de "esta pieza se puede programar en Postiz".
 *
 * Vive aparte porque la consultan la tarjeta y el panel de detalle, y si cada
 * uno la reimplementara acabarian discrepando: el boton aparecería en un sitio
 * y no en el otro para la misma pieza.
 *
 * NO cubre el permiso: quien puede programar (administrador) lo decide la
 * pagina, que es quien conoce al usuario. Y la ultima palabra la tiene siempre
 * la action de Convex, que vuelve a validarlo en el servidor.
 */
export function canScheduleAsset(asset: ContentLibraryAsset): boolean {
    // Los carruseles quedan fuera de esta fase: publicarlos implica subir N
    // diapositivas y que cada red las acepte, y eso tiene su propio diseño.
    if (asset.type !== 'image') return false

    // Sin imagen no hay nada que publicar. Se prefiere el original y se cae al
    // preview, el mismo orden que usa `scheduleAssetImageUrl`.
    return Boolean(asset.original_url || asset.preview_url)
}

/**
 * URL que se le manda a Postiz. El original va primero: el preview puede estar
 * recomprimido y esto acaba publicandose en redes.
 */
export function scheduleAssetImageUrl(asset: ContentLibraryAsset): string {
    return asset.original_url || asset.preview_url || ''
}
