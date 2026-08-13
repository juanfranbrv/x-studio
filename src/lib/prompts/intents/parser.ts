import path from 'path'
import { readFileSync } from 'fs'
import { IntentMeta, LayoutOption } from '@/lib/creation-flow-types'
import { BrandDNA } from '@/lib/brand-types'
import {
  buildContextDocumentPromptBlock,
  type AnalyticalContextDocument,
} from '@/lib/prompts/context-document'
import { buildBrandContextBlock } from './brand-context-template'
const PROMPT_TEMPLATE_PATH = path.join(
  process.cwd(),
  'src',
  'lib',
  'prompts',
  'intents',
  'lazy-intent-parser.md'
)

let cachedPromptTemplate: string | null = null

function getPromptTemplate(): string {
  if (process.env.NODE_ENV !== 'production') {
    return readFileSync(PROMPT_TEMPLATE_PATH, 'utf8')
  }
  if (!cachedPromptTemplate) {
    cachedPromptTemplate = readFileSync(PROMPT_TEMPLATE_PATH, 'utf8')
  }
  return cachedPromptTemplate
}

export function buildIntentParserPrompt(
  userRequest: string,
  brandWebsite?: string,
  brandDNA?: Partial<BrandDNA> | null,
  intent?: IntentMeta,
  layout?: LayoutOption,
  previewTextContext?: string,
  detectedLanguage?: string,
  contextDocument?: AnalyticalContextDocument | null
): string {
  const brandContext = buildBrandContextBlock(brandDNA) || 'BRAND CONTEXT: (none)'
  const websiteContext = brandWebsite ? `BRAND WEBSITE:\n${brandWebsite}` : 'BRAND WEBSITE: (none)'
  const safeDetectedLanguage = String(detectedLanguage || 'es').trim().toLowerCase().slice(0, 2) || 'es'
  const languageNames: Record<string, string> = {
    es: 'Español',
    en: 'English',
    fr: 'Français',
    de: 'Deutsch',
    it: 'Italiano',
    pt: 'Português',
    ca: 'Català'
  }
  const userLanguage = languageNames[safeDetectedLanguage] || safeDetectedLanguage
  const intentContextLines: string[] = []

  if (intent) {
    intentContextLines.push(`INTENT: ${intent.name} - ${intent.description}`)
  } else {
    intentContextLines.push('INTENT: AUTO-DETECT')
  }

  if (layout) {
    const layoutLabel = layout.name || layout.id
    intentContextLines.push(`LAYOUT: ${layoutLabel}`)
  }

  const intentContext = intentContextLines.join('\n')

  const previewContext = previewTextContext?.trim()
    ? `PREVIEW TEXTS (from current canvas):\n${previewTextContext.trim()}`
    : 'PREVIEW TEXTS: (none)'

  const contextDocumentBlock = buildContextDocumentPromptBlock(contextDocument)
  const analyticalBrandContext = contextDocumentBlock
    ? `${brandContext}\n\n${contextDocumentBlock}`
    : brandContext

  return getPromptTemplate()
    .replaceAll('{{BRAND_CONTEXT}}', analyticalBrandContext)
    .replaceAll('{{WEBSITE_CONTEXT}}', websiteContext)
    .replaceAll('{{INTENT_CONTEXT}}', intentContext)
    .replaceAll('{{PREVIEW_CONTEXT}}', previewContext)
    .replaceAll('{{USER_LANGUAGE}}', userLanguage)
    .replaceAll('{{USER_REQUEST}}', userRequest)
}



