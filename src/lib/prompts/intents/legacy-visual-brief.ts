function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const LEGACY_VISUAL_BRIEF_TOKENS = [
  'mostrem',
  'mostramos',
  'muestra',
  'primer pla',
  'primer plano',
  'llum',
  'luz',
  'lighting',
  'ambient',
  'ambiente',
  'composicio',
  'composicion',
  'textura',
  'fons borros',
  'fondo borroso',
  'focus en',
  'foco en',
]

export function looksLikeLegacyVisualBrief(text?: string | null): boolean {
  const clean = normalizeText(text || '')
  if (!clean) return false
  if (clean.length > 180) return true
  return LEGACY_VISUAL_BRIEF_TOKENS.some((token) => clean.includes(token))
}

export function shouldRefreshAiImageDescription(params: {
  currentDescription?: string | null
  previousSuggestions?: string[]
}): boolean {
  const current = (params.currentDescription || '').trim()
  if (!current) return true
  if (looksLikeLegacyVisualBrief(current)) return true

  const normalizedCurrent = normalizeText(current)
  const previous = Array.isArray(params.previousSuggestions) ? params.previousSuggestions : []

  return previous.some((item) => normalizeText(item) === normalizedCurrent)
}
