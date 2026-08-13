/**
 * Construccion del prompt de imagen para una publicacion de campana.
 *
 * POR QUE EXISTE ESTE MODULO
 * --------------------------
 * El panel de imagen construye el prompt en el cliente (`useCreationFlow`)
 * apilando las PRIORIDADES (P12 idioma, P10 logo, P09 texto obligatorio,
 * P09b jerarquia URL/CTA, P07 composicion, P05 estilo, P04 paleta, P02
 * especificaciones) y lo envia con `promptAlreadyBuilt: true`.
 *
 * El lote hacia otra cosa: mandaba un texto suelto y dejaba que el servidor lo
 * envolviera con `buildImagePrompt`. Esa plantilla base incluye reglas que
 * CONTRADICEN a P09b ("CTA URL must be visually secondary and compact",
 * "never dominant"), asi que la URL salia pequena y sin tratamiento grafico,
 * mientras que a mano salia como elemento protagonista. Ademas el lote se
 * quedaba sin idioma, sin contrato tipografico, sin reglas de encaje de texto,
 * sin roles de color y sin las especificaciones tecnicas.
 *
 * Aqui se replica la MISMA pila de prioridades que el panel, reutilizando los
 * mismos modulos de prompt. El resultado se envia tambien con
 * `promptAlreadyBuilt: true`, de modo que campana y panel hablan igual.
 */

import type { ManifestPost } from '@/lib/campaigns/manifest'
import type { SelectedColor } from '@/lib/creation-flow-types'
import { detectLanguage } from '@/lib/language-detection'
import { resolveAsset } from '@/lib/campaigns/brand-assets'
import { buildLayoutDirective } from '@/lib/campaigns/layout-directive'
import { resolveCampaignLayout } from '@/lib/campaigns/catalogs'
import * as P12 from '@/lib/prompts/priorities/p12-preferred-language'
import * as P10 from '@/lib/prompts/priorities/p10-logo-integrity'
import { P10B } from '@/lib/prompts/priorities/p10b-secondary-logos'
import * as P09 from '@/lib/prompts/priorities/p09-brand-dna'
import { P09B } from '@/lib/prompts/priorities/p09b-cta-url-hierarchy'
import { P06B } from '@/lib/prompts/priorities/p06b-ai-image-description'
import * as P05 from '@/lib/prompts/priorities/p05-visual-style'
import * as P04 from '@/lib/prompts/priorities/p04-brand-colors'
import * as P02 from '@/lib/prompts/priorities/p02-technical-specs'
import { buildVisualStyleDirective } from '@/lib/prompts/image-generation/style-directive'

export type CampaignBrandLike = {
    tone_of_voice?: unknown
    fonts?: unknown
    url?: unknown
    phones?: unknown
    emails?: unknown
    addresses?: unknown
} | null | undefined

export type CampaignStyleLike = {
    name?: string
    keywords?: string[]
    subject?: string
} | null

export type CampaignPromptInput = {
    post: ManifestPost
    brand: CampaignBrandLike
    /** Paleta ya resuelta (manifiesto o kit), con sus roles. */
    colors: SelectedColor[]
    style: CampaignStyleLike
    format: { name?: string; aspectRatio?: string } | null
    /** El logo principal viaja como imagen de referencia. */
    hasPrimaryLogo: boolean
    /** Sellos y certificaciones adjuntos como referencias adicionales. */
    auxiliaryLogoCount: number
}

/**
 * Los hashtags son cosa del copy, NUNCA de la imagen: en el panel jamas entran
 * al prompt. Como el manifiesto lo escribe una IA, pueden aparecer colados
 * dentro de la prosa, del titular o del cuerpo, asi que se limpian en origen.
 */
export function stripHashtags(text: string | undefined | null): string {
    if (!text) return ''

    return text
        .replace(/(^|[\s(])#[\p{L}\p{N}_]+/gu, '$1')
        .split('\n')
        // Una linea que solo servia de cabecera a los hashtags ("Hashtags:")
        // se queda vacia o huerfana; se descarta entera.
        .filter((line) => !/^\s*#*\s*hashtags?\s*:?\s*$/i.test(line.trim()))
        .join('\n')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

const URL_PATTERN = /\b(?:https?:\/\/|www\.)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?:\/[^\s]*)?/iu

function trimUrlPunctuation(value: string): string {
    return value.replace(/[.,;:!?)}\]]+$/u, '')
}

function extractUrl(value: string): string | null {
    const match = value.match(URL_PATTERN)?.[0]
    return match ? trimUrlPunctuation(match) : null
}

function normalizedUrl(value: string): string {
    return trimUrlPunctuation(value)
        .replace(/^https?:\/\//iu, '')
        .replace(/^www\./iu, '')
        .replace(/\/$/u, '')
        .toLowerCase()
}

function withoutUrlFromCta(cta: string, ctaUrl: string | null): string {
    if (!ctaUrl) return cta

    const embedded = extractUrl(cta)
    if (!embedded || normalizedUrl(embedded) !== normalizedUrl(ctaUrl)) return cta

    const start = cta.indexOf(embedded)
    const before = cta.slice(0, start).replace(/\b(?:en|at|on|via)\s*$/iu, '').trimEnd()
    const after = cta.slice(start + embedded.length).trimStart()

    return `${before} ${after}`
        .replace(/\s+([.,;:!?])/gu, '$1')
        .replace(/\s{2,}/gu, ' ')
        .trim()
}

function firstFontList(fonts: unknown): Array<{ family: string; role?: 'heading' | 'body' }> {
    if (!Array.isArray(fonts)) return []

    return fonts
        .map((entry) => {
            if (typeof entry === 'string') {
                const family = entry.trim()
                return family ? { family } : null
            }
            const item = (entry ?? {}) as { family?: unknown; role?: unknown }
            const family = typeof item.family === 'string' ? item.family.trim() : ''
            if (!family) return null
            const role = item.role === 'heading' || item.role === 'body' ? item.role : undefined
            return { family, role }
        })
        .filter((font): font is { family: string; role?: 'heading' | 'body' } => Boolean(font))
}

function toneList(tone: unknown): string[] {
    if (!Array.isArray(tone)) return []
    return tone.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

/** Bloque PRIORITY 4 con los colores agrupados por rol, igual que el panel. */
function buildColorSection(colors: SelectedColor[]): string[] {
    if (colors.length === 0) return []

    const sections: string[] = [
        P04.PRIORITY_HEADER,
        `Below is the STRICT color palette for this generation. Use these specific values and respect their assigned semantic roles:`,
        ``,
    ]

    const coreRoles = ['Fondo', 'Texto', 'Acento'] as const
    const usedColors = new Set<string>()

    coreRoles.forEach((role) => {
        const group = colors.filter((c) => {
            const normalizedRole = (c.role as string) === 'Principal' ? 'Fondo' : c.role
            return normalizedRole === role
        })

        if (group.length > 0) {
            const label = (P04.ROLE_LABELS as Record<string, string>)[role] || role.toUpperCase()
            sections.push(`### ${label}`)
            group.forEach((c) => {
                sections.push(`- ${c.color}`)
                usedColors.add(c.color.toLowerCase())
            })
            sections.push(``)
        }
    })

    const extras = colors.filter((c) => !usedColors.has(c.color.toLowerCase()))
    if (extras.length > 0) {
        sections.push(`### EXTRA / SECONDARY COLORS`)
        extras.forEach((c) => {
            const displayRole = (P04.ROLE_LABELS as Record<string, string>)[c.role] || c.role || 'Acento'
            sections.push(`- ${c.color} (${displayRole})`)
        })
        sections.push(``)
    }

    sections.push(P04.COLOR_USAGE_GUIDELINES, ``)
    return sections
}

/**
 * Prompt final de una publicacion, listo para enviarse con
 * `promptAlreadyBuilt: true`.
 */
export function buildCampaignImagePrompt(input: CampaignPromptInput): string {
    const { post, brand, colors, style, format } = input
    const sections: string[] = []

    const prosePrompt = stripHashtags(post.prompt)
    const headline = stripHashtags(post.headline)
    const body = stripHashtags(post.body)
    const cta = stripHashtags(post.cta)
    const goal = stripHashtags(post.goal)
    const visual = stripHashtags(post.visual_content || post.visual_note)
    const imageTexts = (post.image_texts ?? []).map((text) => stripHashtags(text)).filter(Boolean)

    // -----------------------------------------------------------------------
    // PRIORITY 12 - IDIOMA
    // -----------------------------------------------------------------------
    const language = detectLanguage([prosePrompt, headline, body, cta].filter(Boolean).join(' ')) || 'es'
    sections.push(P12.PRIORITY_HEADER, ``, P12.LANGUAGE_ENFORCEMENT_INSTRUCTION(language), ``)

    // -----------------------------------------------------------------------
    // PRIORITY 10 - INTEGRIDAD DEL LOGO
    // -----------------------------------------------------------------------
    if (input.hasPrimaryLogo) {
        sections.push(P10.PRIORITY_HEADER, ``, P10.LOGO_INTEGRITY_INTRO, ``, P10.LOGO_INTEGRITY_RULES, ``)
    }

    // -----------------------------------------------------------------------
    // PRIORITY 10b - LOGOS SECUNDARIOS (sellos, certificaciones)
    // -----------------------------------------------------------------------
    if (input.auxiliaryLogoCount > 0) {
        sections.push(
            P10B.PRIORITY_HEADER,
            ``,
            P10B.ANALYSIS_INSTRUCTION,
            ``,
            P10B.HIERARCHY_RULES,
            ``,
            P10B.VISUAL_TREATMENT,
            ``,
            P10B.AVOID_INSTRUCTION,
            ``,
        )
    }

    // -----------------------------------------------------------------------
    // PRIORITY 9 - ADN DE MARCA Y TEXTO OBLIGATORIO
    // -----------------------------------------------------------------------
    const tone = toneList(brand?.tone_of_voice)
    if (tone.length > 0) {
        sections.push(P09.PRIORITY_HEADER, ``, `BRAND TONE: ${tone.join(', ')}`, ``, P09.BRAND_DNA_REQUIREMENT, ``)
    }

    // La web es la llamada a la accion de la pieza: recibe el tratamiento de
    // elemento protagonista (P09b), no el de dato de contacto.
    const configuredCtaUrl = resolveAsset(post.cta_url, brand?.url)
    const ctaUrl = configuredCtaUrl ?? (post.cta_url === false ? null : extractUrl(cta))
    const ctaLabel = withoutUrlFromCta(cta, ctaUrl)
    const phone = resolveAsset(post.phone, brand?.phones)
    const email = resolveAsset(post.email, brand?.emails)
    const address = resolveAsset(post.address, brand?.addresses)

    const textParts: string[] = []
    if (headline) textParts.push(`- HEADLINE: "${headline}"`)
    imageTexts.forEach((text, index) => textParts.push(`- SUPPORT TEXT ${index + 1}: "${text}"`))

    if (ctaUrl) {
        textParts.push(P09B.URL_HERO_INSTRUCTION(ctaUrl))
        if (ctaLabel) textParts.push(P09B.CTA_SECONDARY_INSTRUCTION(ctaLabel))
    } else if (ctaLabel) {
        textParts.push(P09B.CTA_ONLY_INSTRUCTION(ctaLabel))
    }

    const contactParts = [
        phone ? `- TELEFONO: "${phone}"` : '',
        email ? `- EMAIL: "${email}"` : '',
        address ? `- DIRECCION: "${address}"` : '',
    ].filter(Boolean)

    if (textParts.length > 0 || contactParts.length > 0) {
        sections.push(P09.MANDATORY_TEXT_HEADER)
        sections.push(P09.TEXT_FIT_SAFETY_RULES)
        sections.push(P09.buildTypographyContract(firstFontList(brand?.fonts)))
        if (ctaUrl) {
            sections.push(
                ctaLabel
                    ? P09B.CRITICAL_HIERARCHY_INSTRUCTION(ctaUrl)
                    : P09B.CRITICAL_URL_ONLY_INSTRUCTION(ctaUrl),
            )
        }
        if (textParts.length > 0) sections.push(...textParts, ``)
        if (contactParts.length > 0) {
            sections.push(
                P09.CONTACT_INFO_LAYOUT_RULES,
                `CONTACT INFORMATION (SEPARATE BLOCK):`,
                ...contactParts,
                ``,
            )
        }
    } else if (prosePrompt || goal) {
        // Publicacion descrita solo en prosa: el texto a imprimir no viene
        // troceado, hay que extraerlo de la intencion. Es exactamente lo que
        // hace el panel cuando el usuario escribe un mensaje libre y no rellena
        // los campos.
        sections.push(P09.MANDATORY_TEXT_HEADER, `(No explícitos, extraer de la INTENCIÓN ORIGINAL)`, ``)
    } else {
        sections.push(P09.NO_TEXT_WARNING, ``)
    }

    // La prosa del manifiesto equivale al mensaje original del usuario en el
    // panel: contexto de intencion, no texto que deba imprimirse literalmente.
    const rawContext = [goal ? `Objetivo: ${goal}` : '', prosePrompt].filter(Boolean).join('\n')
    if (rawContext) {
        sections.push(`USER ORIGINAL INTENTION / RAW CONTEXT:`, `"${rawContext}"`, ``)
    }

    // -----------------------------------------------------------------------
    // PRIORITY 7 - COMPOSICION Y LAYOUT
    // -----------------------------------------------------------------------
    const resolvedLayout = resolveCampaignLayout(post.layout, post.intent)
    const layoutDirective = buildLayoutDirective(resolvedLayout?.id)
    if (layoutDirective) {
        sections.push(
            `╔═════════════════════════════════════════════════════════════════╗`,
            `║  PRIORITY 7 - COMPOSITION & LAYOUT                             ║`,
            `╚═════════════════════════════════════════════════════════════════╝`,
            ``,
            layoutDirective,
            ``,
        )
    }

    // -----------------------------------------------------------------------
    // PRIORITY 6b - CONTENIDO VISUAL DESCRITO
    // -----------------------------------------------------------------------
    if (visual) {
        sections.push(P06B.PRIORITY_HEADER, ``, P06B.AI_IMAGE_DESCRIPTION_INSTRUCTION(visual), ``)
    }

    // -----------------------------------------------------------------------
    // PRIORITY 5 - ESTILO VISUAL
    // -----------------------------------------------------------------------
    const styleKeywords = Array.isArray(style?.keywords) ? style!.keywords.filter(Boolean) : []
    if (style?.name || styleKeywords.length > 0) {
        sections.push(
            P05.PRIORITY_HEADER,
            ``,
            buildVisualStyleDirective(style?.name, { keywords: styleKeywords, subjectLabel: style?.subject }),
            P09.TYPOGRAPHY_LOCK_REFERENCE,
            `COLOR DOMINANCE RULE: Style cues define form, line quality, texture and composition. PRIORITY 4 brand palette controls final hue decisions. Do not override brand colors with fixed external color schemes.`,
            ``,
            `STYLE SOURCE RULE: The style reference was analyzed as text-only guidance. DO NOT reproduce its exact subject/object unless explicitly requested in the mandatory text.`,
            ``,
            P05.STYLE_REQUIREMENT,
            ``,
        )
    }

    // -----------------------------------------------------------------------
    // PRIORITY 4 - PALETA DE MARCA
    // -----------------------------------------------------------------------
    sections.push(...buildColorSection(colors))

    // -----------------------------------------------------------------------
    // PRIORITY 2 - ESPECIFICACIONES TECNICAS
    // -----------------------------------------------------------------------
    // Las vinetas se pintan con el acento REAL de la campana, no con un hex
    // fijo que contradiga la paleta de PRIORITY 4.
    const acentoHex = colors.find((c) => c.role === 'Acento')?.color

    sections.push(P02.PRIORITY_HEADER, ``, P02.buildCompositionRules(acentoHex), ``)

    if (format?.name || format?.aspectRatio) {
        if (format.name) sections.push(`FORMAT: ${format.name}`)
        if (format.aspectRatio) sections.push(`ASPECT RATIO: ${format.aspectRatio}`)
        sections.push(``)
    }

    // -----------------------------------------------------------------------
    // COMPROBACION FINAL - VISIBILIDAD DE LA URL
    // -----------------------------------------------------------------------
    if (ctaUrl) {
        sections.push(
            ``,
            cta
                ? P09B.FINAL_URL_VISIBILITY_INSTRUCTION(ctaUrl)
                : P09B.FINAL_URL_ONLY_VISIBILITY_INSTRUCTION(ctaUrl),
            ``,
        )
    }

    return sections.join('\n')
}
