'use server'

import { revalidatePath } from 'next/cache'

/**
 * Invalida la cache del endpoint publico de estilos predefinidos
 * (`/api/style-presets`) para que los cambios hechos desde el panel de
 * Admin (crear, activar/desactivar, reordenar, borrar) se reflejen de
 * inmediato en el modulo de imagen y carrusel sin esperar al TTL de 5 min.
 */
export async function revalidateStylePresets() {
  try {
    revalidatePath('/api/style-presets')
    return { success: true as const }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'No se pudo revalidar la cache de estilos',
    }
  }
}
