type SupportedLanguage = 'es' | 'ca' | 'en'

interface BuildSemanticImagePromptSuggestionsInput {
  targetLanguage?: string
  detectedIntent?: string
  userText?: string
  headline?: string
  caption?: string
  imageTexts?: string[]
  modelSuggestions?: string[]
}

interface PromptContext {
  subject: string
  workspace: string
  supportObject: string
}

const MAX_SUGGESTIONS = 8

const EDITORIAL_LEADS = [
  'explicar con criterio que hace especial ',
  'desmontar un error frecuente sobre ',
  'reivindicar autoridad experta alrededor de ',
  'abrir conversacion util sobre ',
  'poner en valor el proceso real detras de ',
  'demostrar calidad tangible en ',
  'conectar ',
  'dar un criterio claro para elegir mejor ',
  'explicar amb criteri que fa especial ',
  'desmuntar un error frequent sobre ',
  'reivindicar autoritat experta al voltant de ',
  'obrir conversa util sobre ',
  'posar en valor el proces real darrere de ',
  'demostrar qualitat tangible en ',
  'connectar ',
  'donar un criteri clar per escollir millor ',
  'explain with authority what makes ',
  'debunk a common misconception about ',
  'claim expert authority around ',
  'open a useful conversation about ',
  'highlight the real process behind ',
  'show tangible quality in ',
  'connect ',
  'give a clear criterion to choose better ',
]

const EDITORIAL_TOKENS = [
  'explicar',
  'demostrar',
  'reivindicar',
  'posar en valor',
  'poner en valor',
  'desmuntar',
  'desmontar',
  'obrir conversa',
  'abrir conversacion',
  'connectar',
  'conectar',
  'donar un criteri',
  'dar un criterio',
]

const BANNED_STYLE_TOKENS = [
  'llum',
  'luz',
  'lighting',
  'ambient',
  'ambiente',
  'mood',
  'composicio',
  'composicion',
  'composition',
  'primer pla',
  'primer plano',
  'close-up',
  'focus',
  'foco',
  'textura',
  'texture',
  'fotografia',
  'fotografico',
  'ilustracion',
  'ilustratiu',
  'ilustrativo',
  'cinematico',
  'cinematic',
  'estilo',
  'style',
  'realista',
  'realistic',
]

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toSentence(text: string): string {
  const clean = normalizeWhitespace(text).replace(/[.!?]+$/g, '')
  if (!clean) return ''
  return `${clean.charAt(0).toUpperCase()}${clean.slice(1)}.`
}

function pickLanguage(raw?: string): SupportedLanguage {
  const lang = (raw || '').trim().toLowerCase().slice(0, 2)
  if (lang === 'ca' || lang === 'en') return lang
  return 'es'
}

function stripEditorialLead(text: string): string {
  const normalized = normalizeForCompare(text)
  for (const lead of EDITORIAL_LEADS) {
    const normalizedLead = normalizeForCompare(lead)
    if (normalized.startsWith(normalizedLead)) {
      return text.slice(lead.length).trim()
    }
  }
  return text
}

function cleanSubjectCandidate(text: string): string {
  const withoutLead = stripEditorialLead(text)
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .replace(/^[A-Z\s_-]+:\s*/g, '')

  return normalizeWhitespace(withoutLead)
    .replace(/[.!?]+$/g, '')
    .replace(/^(el|la|los|las|un|una|the)\s+/i, (match) => match.toLowerCase())
}

function truncateWords(text: string, maxWords: number): string {
  const words = normalizeWhitespace(text).split(' ').filter(Boolean)
  return words.slice(0, maxWords).join(' ')
}

function buildSubject(input: BuildSemanticImagePromptSuggestionsInput, language: SupportedLanguage): string {
  const candidates = [
    input.headline || '',
    ...(input.imageTexts || []),
    input.userText || '',
  ]

  for (const candidate of candidates) {
    const clean = truncateWords(cleanSubjectCandidate(candidate), 8)
    if (clean.length >= 10) {
      return clean
    }
  }

  if (language === 'ca') return 'la proposta principal'
  if (language === 'en') return 'the main offer'
  return 'la propuesta principal'
}

function detectWorkspace(corpus: string, language: SupportedLanguage): string {
  if (corpus.includes('obrador')) return language === 'ca' ? "l'obrador" : language === 'en' ? 'the bakery workshop' : 'el obrador'
  if (corpus.includes('forn') || corpus.includes('horno')) return language === 'ca' ? 'el forn' : language === 'en' ? 'the oven area' : 'el horno'
  if (corpus.includes('botiga') || corpus.includes('tienda')) return language === 'ca' ? 'la botiga' : language === 'en' ? 'the shop counter' : 'la tienda'
  if (corpus.includes('restaurant') || corpus.includes('restaurante')) return language === 'ca' ? 'la cuina del restaurant' : language === 'en' ? 'the restaurant kitchen' : 'la cocina del restaurante'
  if (corpus.includes('consulta') || corpus.includes('clinica') || corpus.includes('clínica')) return language === 'ca' ? 'la consulta' : language === 'en' ? 'the consultation space' : 'la consulta'
  return language === 'ca' ? 'la taula de treball' : language === 'en' ? 'the worktable' : 'la mesa de trabajo'
}

function detectSupportObject(corpus: string, language: SupportedLanguage): string {
  if (corpus.includes('massa mare')) return language === 'ca' ? 'massa mare, farina i eines de forn' : language === 'en' ? 'starter dough, flour and bakery tools' : 'masa madre, harina y herramientas de horno'
  if (corpus.includes('coca de sant joan')) return language === 'ca' ? 'fruita confitada, crema i safates de forn' : language === 'en' ? 'candied fruit, cream and baking trays' : 'fruta confitada, crema y bandejas de horno'
  if (corpus.includes('croissant')) return language === 'ca' ? 'massa laminada i safates de forn' : language === 'en' ? 'laminated dough and baking trays' : 'masa laminada y bandejas de horno'
  if (corpus.includes('pa')) return language === 'ca' ? 'farina, massa i eines de forn' : language === 'en' ? 'flour, dough and bakery tools' : 'harina, masa y herramientas de horno'
  return language === 'ca' ? 'ingredients i eines de feina' : language === 'en' ? 'ingredients and work tools' : 'ingredientes y herramientas de trabajo'
}

function buildContext(input: BuildSemanticImagePromptSuggestionsInput, language: SupportedLanguage): PromptContext {
  const corpus = normalizeForCompare([
    input.userText || '',
    input.headline || '',
    input.caption || '',
    ...(input.imageTexts || []),
    ...(input.modelSuggestions || []),
  ].join(' '))

  return {
    subject: buildSubject(input, language),
    workspace: detectWorkspace(corpus, language),
    supportObject: detectSupportObject(corpus, language),
  }
}

function sanitizeModelSuggestion(text: string): string | null {
  const firstLine = normalizeWhitespace(text)
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .replace(/^[A-Z\s_-]+:\s*/g, '')
    .split(/[.!?\n]/)[0]
    .replace(/^(mostrem|mostramos|mostrar|muestra|show)\s+/i, '')

  const normalized = normalizeForCompare(firstLine)
  if (!normalized) return null
  if (BANNED_STYLE_TOKENS.some((token) => normalized.includes(normalizeForCompare(token)))) return null
  if (EDITORIAL_TOKENS.some((token) => normalized.includes(normalizeForCompare(token)))) return null
  if (normalized.split(' ').length < 4) return null
  return toSentence(firstLine)
}

function buildTemplates(language: SupportedLanguage, intent: string | undefined, context: PromptContext): string[] {
  const normalizedIntent = normalizeForCompare(intent || '')
  const isProcessIntent = ['bts', 'equipo', 'servicio', 'pasos'].includes(normalizedIntent)
  const isEducationalIntent = ['definicion', 'dato', 'comparativa', 'pregunta'].includes(normalizedIntent)

  if (language === 'ca') {
    if (isEducationalIntent) {
      return [
        `Comparativa de ${context.subject} sobre ${context.workspace}`,
        `Ingredients reals de ${context.subject} preparats abans de l'elaboracio`,
        `Pas del proces de ${context.subject} amb ${context.supportObject}`,
        `Professional assenyalant un detall clau de ${context.subject}`,
        `Interior de ${context.subject} tallat per mostrar el contingut real`,
        `${context.subject} al costat dels ingredients principals`,
        `Mans revisant el punt de ${context.subject} a ${context.workspace}`,
        `${context.subject} amb una etiqueta o pissarra explicativa al costat`,
      ]
    }

    if (isProcessIntent) {
      return [
        `Mans treballant ${context.subject} a ${context.workspace}`,
        `Proces d'elaboracio de ${context.subject} amb ${context.supportObject}`,
        `Ingredients per preparar ${context.subject} sobre la taula de feina`,
        `${context.subject} a mig proces dins ${context.workspace}`,
        `Moment de cocció o fermentacio de ${context.subject}`,
        `Equip acabant ${context.subject} abans de servir-lo`,
        `Interior real de ${context.subject} tallat o obert`,
        `Taulell amb ${context.subject} llest per emportar o compartir`,
      ]
    }

    return [
      `${context.subject} presentat al taulell amb ${context.supportObject}`,
      `Safata amb ${context.subject} acabat de preparar`,
      `Mans servint ${context.subject} al punt de venda`,
      `${context.subject} al costat dels ingredients principals`,
      `Interior real de ${context.subject} tallat o obert`,
      `Pack o capsa amb ${context.subject} preparada per emportar`,
      `Diverses unitats de ${context.subject} al mostrador`,
      `Moment de consum de ${context.subject} a taula`,
    ]
  }

  if (language === 'en') {
    if (isEducationalIntent) {
      return [
        `Comparison of ${context.subject} on ${context.workspace}`,
        `Real ingredients for ${context.subject} prepared before making it`,
        `A production step for ${context.subject} with ${context.supportObject}`,
        `A professional pointing to a key detail of ${context.subject}`,
        `The inside of ${context.subject} cut open to show the real filling`,
        `${context.subject} beside its main ingredients`,
        `Hands checking the ideal point of ${context.subject} on ${context.workspace}`,
        `${context.subject} next to a small explanatory label or board`,
      ]
    }

    if (isProcessIntent) {
      return [
        `Hands working on ${context.subject} at ${context.workspace}`,
        `The making process of ${context.subject} with ${context.supportObject}`,
        `Ingredients for ${context.subject} arranged on the worktable`,
        `${context.subject} halfway through the process inside ${context.workspace}`,
        `A baking or fermentation moment for ${context.subject}`,
        `The team finishing ${context.subject} before serving it`,
        `The real inside of ${context.subject} cut open`,
        `A counter with ${context.subject} ready to take away or share`,
      ]
    }

    return [
      `${context.subject} presented on the counter with ${context.supportObject}`,
      `A tray of ${context.subject} freshly prepared`,
      `Hands serving ${context.subject} at the point of sale`,
      `${context.subject} beside its main ingredients`,
      `The real inside of ${context.subject} cut open`,
      `A pack or box with ${context.subject} ready to go`,
      `Several units of ${context.subject} displayed on the counter`,
      `A consumption moment with ${context.subject} on the table`,
    ]
  }

  if (isEducationalIntent) {
    return [
      `Comparativa de ${context.subject} sobre ${context.workspace}`,
      `Ingredientes reales de ${context.subject} preparados antes de elaborarlo`,
      `Paso del proceso de ${context.subject} con ${context.supportObject}`,
      `Profesional señalando un detalle clave de ${context.subject}`,
      `Interior de ${context.subject} abierto para mostrar el contenido real`,
      `${context.subject} junto a sus ingredientes principales`,
      `Manos revisando el punto de ${context.subject} en ${context.workspace}`,
      `${context.subject} junto a una etiqueta o pizarra explicativa`,
    ]
  }

  if (isProcessIntent) {
    return [
      `Manos trabajando ${context.subject} en ${context.workspace}`,
      `Proceso de elaboracion de ${context.subject} con ${context.supportObject}`,
      `Ingredientes para preparar ${context.subject} sobre la mesa de trabajo`,
      `${context.subject} a mitad del proceso dentro de ${context.workspace}`,
      `Momento de horneado o fermentacion de ${context.subject}`,
      `Equipo terminando ${context.subject} antes de servirlo`,
      `Interior real de ${context.subject} abierto o cortado`,
      `Mostrador con ${context.subject} listo para llevar o compartir`,
    ]
  }

  return [
    `${context.subject} presentado en el mostrador con ${context.supportObject}`,
    `Bandeja con ${context.subject} recien preparado`,
    `Manos sirviendo ${context.subject} en el punto de venta`,
    `${context.subject} junto a sus ingredientes principales`,
    `Interior real de ${context.subject} abierto o cortado`,
    `Caja o pack con ${context.subject} listo para llevar`,
    `Varias unidades de ${context.subject} en el mostrador`,
    `Momento de consumo de ${context.subject} en la mesa`,
  ]
}

export function buildSemanticImagePromptSuggestions(
  input: BuildSemanticImagePromptSuggestionsInput
): string[] {
  const language = pickLanguage(input.targetLanguage)
  const context = buildContext(input, language)
  const results: string[] = []
  const seen = new Set<string>()

  for (const rawSuggestion of input.modelSuggestions || []) {
    const sanitized = sanitizeModelSuggestion(rawSuggestion)
    const normalized = normalizeForCompare(sanitized || '')
    if (!sanitized || !normalized || seen.has(normalized)) continue
    seen.add(normalized)
    results.push(sanitized)
    if (results.length >= MAX_SUGGESTIONS) return results
  }

  for (const rawTemplate of buildTemplates(language, input.detectedIntent, context)) {
    const suggestion = toSentence(rawTemplate)
    const normalized = normalizeForCompare(suggestion)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    results.push(suggestion)
    if (results.length >= MAX_SUGGESTIONS) break
  }

  return results.slice(0, MAX_SUGGESTIONS)
}
