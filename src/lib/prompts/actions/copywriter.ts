import { BrandDNA } from '../../brand-types'
import { VisionAnalysis } from '../../creation-flow-types'

interface CopywriterPromptParams {
   brandName: string
   brandDNA: BrandDNA
   visionAnalysis?: VisionAnalysis | null
   intent?: string
   intentDescription?: string
   fieldLabel: string
   fieldDescription?: string
   rawMessage?: string
   languageOverride?: string
}

const LANGUAGE_NAMES: Record<string, string> = {
   'es': 'SPANISH (Español)',
   'en': 'ENGLISH',
   'fr': 'FRENCH (Français)',
   'de': 'GERMAN (Deutsch)',
   'pt': 'PORTUGUESE (Português)',
   'it': 'ITALIAN (Italiano)',
   'ca': 'CATALAN (Català)'
}

const SYSTEM_INSTRUCTIONS = (brandName: string) =>
   `ACTÚA COMO: Copywriter Senior para la marca "${brandName}".`

const VERSION_CONTEXT = (visionAnalysis?: VisionAnalysis | null) => `
=== CONTEXTO OBLIGATORIO (TIENES QUE HABLAR DE ESTO) ===
1. LO QUE SE VE EN LA IMAGEN (Vision Context):
${visionAnalysis ? `   - DESCRIPCIÓN: ${visionAnalysis.subjectLabel}
   - ESTILO: ${visionAnalysis.keywords.join(', ')}` : '   - (No hay imagen, céntrate solo en la marca)'}
`

const BRAND_CONTEXT = (brandDNA: BrandDNA) => `
2. QUÉ HACE LA MARCA (Brand Context):
   - Valores/ADN: ${brandDNA.brand_values?.join(', ') || 'Calidad y servicio'}
   - Tono: ${brandDNA.tone_of_voice?.join(', ') || 'Profesional'}
   - Público: ${brandDNA.target_audience || 'General'}
`

const INTENT_CONTEXT = (intent?: string, intentDescription?: string) => intent ? `
3. INTENCIÓN DE MARKETING:
   - Tipo de Creatividad: ${intent}
   ${intentDescription ? `- Objetivo: ${intentDescription}` : ''}
` : ''

const USER_INPUT = (rawMessage?: string) => `
=== INPUT DEL USUARIO (LA ORDEN PRINCIPAL) ===
"${rawMessage || 'Genera un texto atractivo'}"
================================================
`

const TASK_SPECIFICS = (fieldLabel: string, fieldDescription?: string) => `
TU TAREA:
Escribir el contenido para el campo: "${fieldLabel}"
(${fieldDescription || 'Texto visible en la creatividad'})
`

const LANGUAGE_ENFORCEMENT = (languageName: string) => `
⚠️ IDIOMA OBLIGATORIO: ${languageName}
TODO el contenido generado DEBE estar en ${languageName}.
`

const GOLDEN_RULES = `
REGLAS DE ORO PARA EL CONTENIDO:
1. RELEVANCIA TOTAL: El texto generado DEBE tener sentido con lo que se ve en la imagen y lo que hace la marca.
2. INTERPRETA LA ORDEN DEL USUARIO.
3. ESTILO: Cero clichés, usa el tono de la marca y emojis si encaja.

DAME SOLO EL TEXTO FINAL.
`

export const buildCopywriterPrompt = ({
   brandName,
   brandDNA,
   visionAnalysis,
   intent,
   intentDescription,
   fieldLabel,
   fieldDescription,
   rawMessage,
   languageOverride
}: CopywriterPromptParams) => {
   const preferredLanguage = languageOverride || 'es'
   const languageName = LANGUAGE_NAMES[preferredLanguage] || preferredLanguage.toUpperCase()

   const sections = [
      SYSTEM_INSTRUCTIONS(brandName),
      VERSION_CONTEXT(visionAnalysis),
      BRAND_CONTEXT(brandDNA),
      INTENT_CONTEXT(intent, intentDescription),
      USER_INPUT(rawMessage),
      TASK_SPECIFICS(fieldLabel, fieldDescription),
      LANGUAGE_ENFORCEMENT(languageName),
      GOLDEN_RULES
   ]

   return sections.join('\n')
}
