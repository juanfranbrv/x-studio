export type PromptIntentId =
    | 'product_showcase'
    | 'promotion'
    | 'service_in_action'
    | 'behind_the_scenes'
    | 'proof_results'
    | 'educational_angle'
    | 'community_hook'

export interface PromptIntent {
    id: PromptIntentId
    label: string
    description: string
}

interface SelectPromptIntentInput {
    module: 'image' | 'carousel'
    brandKitId: string
    seed: string
    brandName?: string
    businessOverview?: string
    toneOfVoice?: string
    targetAudience?: string
    brandValues?: string
    marketingHooks?: string
    recentIntents?: string[]
}

const IMAGE_PROMPT_INTENTS: PromptIntent[] = [
    {
        id: 'product_showcase',
        label: 'PRODUCT SHOWCASE',
        description: 'Center the value of a specific product or signature item.',
    },
    {
        id: 'promotion',
        label: 'PROMOTION',
        description: 'Frame a concrete commercial opportunity worth acting on.',
    },
    {
        id: 'service_in_action',
        label: 'SERVICE IN ACTION',
        description: 'Highlight the value or transformation behind the service.',
    },
    {
        id: 'behind_the_scenes',
        label: 'BEHIND THE SCENES',
        description: 'Reveal craft, process, expertise, or real work moments.',
    },
    {
        id: 'proof_results',
        label: 'PROOF & RESULTS',
        description: 'Emphasize outcome, trust, evidence, or visible quality.',
    },
    {
        id: 'educational_angle',
        label: 'EDUCATIONAL ANGLE',
        description: 'Teach something useful, surprising, or clarifying.',
    },
    {
        id: 'community_hook',
        label: 'COMMUNITY HOOK',
        description: 'Spark recognition, conversation, or audience identification.',
    },
]

const KEYWORDS: Record<PromptIntentId, string[]> = {
    product_showcase: ['producto', 'product', 'menu', 'carta', 'coleccion', 'signature', 'croissant', 'pan', 'coca', 'bolleria'],
    promotion: ['oferta', 'promo', 'descuento', 'limited', 'seasonal', 'bundle', 'special', 'campaign', 'lanzamiento'],
    service_in_action: ['servicio', 'service', 'asesoria', 'consultoria', 'tratamiento', 'book', 'reserva', 'proceso de servicio'],
    behind_the_scenes: ['artesanal', 'obrador', 'proceso', 'craft', 'hecho a mano', 'taller', 'forner', 'manos', 'tradicion'],
    proof_results: ['calidad', 'resultado', 'evidencia', 'prueba', 'trust', 'excelencia', 'visible', 'antes', 'despues'],
    educational_angle: ['explicar', 'por que', 'porque', 'aprender', 'tip', 'guia', 'educar', 'clarificar', 'difference', 'calidad real'],
    community_hook: ['familia', 'comunidad', 'vecinos', 'ritual', 'tradicion', 'celebrar', 'conversation', 'opinion', 'audiencia'],
}

function normalize(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
}

function hashString(value: string): number {
    let hash = 0
    for (let index = 0; index < value.length; index += 1) {
        hash = ((hash << 5) - hash) + value.charCodeAt(index)
        hash |= 0
    }
    return Math.abs(hash)
}

function scoreIntent(intent: PromptIntentId, corpus: string): number {
    const keywords = KEYWORDS[intent]
    return keywords.reduce((acc, keyword) => acc + (corpus.includes(normalize(keyword)) ? 1 : 0), 0)
}

function recencyPenalty(intent: PromptIntentId, recentIntents: string[]): number {
    const recent = recentIntents.map((item) => item.trim().toLowerCase())
    const index = recent.indexOf(intent)
    if (index === -1) return 0
    return index === 0 ? 100 : (40 - (index * 8))
}

export function selectPromptIntent(input: SelectPromptIntentInput): PromptIntent {
    if (input.module !== 'image') {
        return IMAGE_PROMPT_INTENTS[0]
    }

    const corpus = normalize([
        input.brandName || '',
        input.businessOverview || '',
        input.toneOfVoice || '',
        input.targetAudience || '',
        input.brandValues || '',
        input.marketingHooks || '',
    ].join(' '))

    const scored = IMAGE_PROMPT_INTENTS.map((intent) => ({
        intent,
        score: scoreIntent(intent.id, corpus) - recencyPenalty(intent.id, input.recentIntents || []),
    }))

    const topScore = Math.max(...scored.map((item) => item.score))
    const viable = scored
        .filter((item) => item.score >= topScore - 1)
        .sort((a, b) => b.score - a.score)

    const pool = (viable.length >= 3 ? viable.slice(0, 3) : scored.sort((a, b) => b.score - a.score).slice(0, 4))
    const offset = hashString(`${input.brandKitId}::${input.seed}`) % pool.length

    return pool[offset].intent
}

export function buildForcedIntentInstruction(intent: PromptIntent): string {
    return [
        'FORCED INTENT FOR THIS RUN:',
        `- Use exactly this intent: ${intent.label}.`,
        `- Definition: ${intent.description}`,
        '- Do not switch to another intent, label, or category.',
        '- If another angle seems tempting, reinterpret it inside this forced intent instead of changing intent.',
    ].join('\n')
}
