const ALLOWED_HOST_SUFFIXES = [
  'cdninstagram.com',
  'fbcdn.net',
  'instagram.com',
]

/**
 * Allowlist del proxy de imágenes (/api/proxy-image).
 * Coincidencia por sufijo de dominio exacto y https obligatorio: evita
 * bypass tipo "instagram.com.evil.com" que pasaba con hostname.includes().
 */
export function isAllowedProxyImageUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url)
    if (protocol !== 'https:') return false
    return ALLOWED_HOST_SUFFIXES.some(
      (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`)
    )
  } catch {
    return false
  }
}
