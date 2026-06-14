// ============================================================================
// CREATION FLOW TYPES - Cascade Interface for X Imagen
// ============================================================================

// -----------------------------------------------------------------------------
// INTENT CATEGORIES (20 Master Templates)
// -----------------------------------------------------------------------------

import { LucideIcon } from 'lucide-react'
import { SHARED_LAYOUTS } from './prompts/intents/shared-layouts'
import { DEFAULT_LAYOUTS, LAB_ADVANCED_LAYOUTS } from './creation-flow/layout-catalog'
export { DEFAULT_LAYOUTS, LAB_ADVANCED_LAYOUTS }
// import { OFERTA_IMPACTO_PROMPT, OFERTA_IMPACTO_DESCRIPTION } from './prompts/layouts/oferta-impacto'
// import { PROMO_MOVIL_PROMPT, PROMO_MOVIL_DESCRIPTION } from './prompts/layouts/promo-movil'
import {
    OFERTA_EXTENDED_DESCRIPTION,
    OFERTA_REQUIRED_FIELDS,
    OFERTA_DESCRIPTION,
    OFERTA_LAYOUTS,
} from './prompts/intents/oferta'
import {
    CITA_EXTENDED_DESCRIPTION,
    CITA_REQUIRED_FIELDS,
    CITA_DESCRIPTION,
    CITA_LAYOUTS,
} from './prompts/intents/cita'
import {
    EQUIPO_EXTENDED_DESCRIPTION,
    EQUIPO_REQUIRED_FIELDS,
    EQUIPO_DESCRIPTION,
    EQUIPO_LAYOUTS,
} from './prompts/intents/equipo'
import {
    LOGRO_EXTENDED_DESCRIPTION,
    LOGRO_REQUIRED_FIELDS,
    LOGRO_DESCRIPTION,
    LOGRO_LAYOUTS,
} from './prompts/intents/logro'


import {
    SERVICIO_EXTENDED_DESCRIPTION,
    SERVICIO_REQUIRED_FIELDS,
    SERVICIO_DESCRIPTION,
    SERVICIO_LAYOUTS, // Nuevo: layouts completos con metadatos
} from './prompts/intents/servicio'
import {
    TALENTO_EXTENDED_DESCRIPTION,
    TALENTO_REQUIRED_FIELDS,
    TALENTO_DESCRIPTION,
    TALENTO_LAYOUTS,
} from './prompts/intents/talento'
import {
    DEFINICION_EXTENDED_DESCRIPTION,
    DEFINICION_REQUIRED_FIELDS,
    DEFINICION_DESCRIPTION,
    DEFINICION_LAYOUTS,
} from './prompts/intents/definicion'
import {
    EFEMERIDE_EXTENDED_DESCRIPTION,
    EFEMERIDE_REQUIRED_FIELDS,
    EFEMERIDE_DESCRIPTION,
    EFEMERIDE_LAYOUTS,
} from './prompts/intents/efemeride'
import {
    PASOS_EXTENDED_DESCRIPTION,
    PASOS_REQUIRED_FIELDS,
    PASOS_DESCRIPTION,
    PASOS_LAYOUTS,
} from './prompts/intents/pasos'
import {
    BTS_EXTENDED_DESCRIPTION,
    BTS_REQUIRED_FIELDS,
    BTS_DESCRIPTION,
    BTS_LAYOUTS,
} from './prompts/intents/bts'
import {
    CATALOGO_EXTENDED_DESCRIPTION,
    CATALOGO_REQUIRED_FIELDS,
    CATALOGO_DESCRIPTION,
    CATALOGO_LAYOUTS,
} from './prompts/intents/catalogo'
import {
    LANZAMIENTO_EXTENDED_DESCRIPTION,
    LANZAMIENTO_REQUIRED_FIELDS,
    LANZAMIENTO_LAYOUTS,
    LANZAMIENTO_DESCRIPTION,
} from './prompts/intents/lanzamiento'

// Debug Modal Data - Per-Slide Info
export interface SlideDebugInfo {
    slideNumber: number
    prompt: string
    mood: string
    references: Array<{
        type: string
        label: string
        weight: number
        url: string // shortened for display
    }>
}

export interface DebugContextItem {
    id: string
    type: string
    label: string
    url: string
    source?: 'upload' | 'brandkit' | 'generated' | 'system' | 'unknown'
    role?: 'style' | 'style_content' | 'content' | 'logo' | 'primary_logo' | 'aux_logo' | 'generated' | 'unknown'
}

// Debug Modal Data
export interface DebugPromptData {
    finalPrompt: string
    logoUrl?: string
    referenceImageUrl?: string
    attachedImages?: string[] // URLs of all attached images (uploaded or from brand kit)
    selectedStyles: string[]
    headline?: string
    cta?: string
    platform?: string
    format?: string
    intent?: string
    layoutId?: string
    layoutName?: string
    layoutSkillName?: string
    layoutSkillVersion?: string
    compositionMode?: 'basic' | 'advanced'
    contextItems?: DebugContextItem[]
    requestPayload?: Record<string, unknown>
    // Carousel-specific: per-slide debug
    seed?: number
    model?: string
    aspectRatio?: string
    slideDebug?: SlideDebugInfo[]
}

// Intent-specific prompts
import {
    ESCAPARATE_EXTENDED_DESCRIPTION,
    ESCAPARATE_REQUIRED_FIELDS,
    ESCAPARATE_LAYOUTS,
    ESCAPARATE_DESCRIPTION,
} from './prompts/intents/escaparate'
import {
    COMUNICADO_EXTENDED_DESCRIPTION,
    COMUNICADO_REQUIRED_FIELDS,
    COMUNICADO_LAYOUTS,
    COMUNICADO_DESCRIPTION,
} from './prompts/intents/comunicado'
import {
    EVENTO_DESCRIPTION,
    EVENTO_LAYOUTS,
    EVENTO_REQUIRED_FIELDS,
} from './prompts/intents/evento'
import {
    COMPARATIVA_EXTENDED_DESCRIPTION,
    COMPARATIVA_REQUIRED_FIELDS,
    COMPARATIVA_DESCRIPTION,
    COMPARATIVA_LAYOUTS,
} from './prompts/intents/comparativa'
import {
    LISTA_EXTENDED_DESCRIPTION,
    LISTA_REQUIRED_FIELDS,
    LISTA_DESCRIPTION,
    LISTA_LAYOUTS,
} from './prompts/intents/lista'

import {
    DATO_EXTENDED_DESCRIPTION,
    DATO_REQUIRED_FIELDS,
    DATO_DESCRIPTION,
    DATO_LAYOUTS,
} from './prompts/intents/dato'
import {
    PREGUNTA_EXTENDED_DESCRIPTION,
    PREGUNTA_REQUIRED_FIELDS,
    PREGUNTA_DESCRIPTION,
    PREGUNTA_LAYOUTS,
} from './prompts/intents/pregunta'
import {
    RETO_EXTENDED_DESCRIPTION,
    RETO_REQUIRED_FIELDS,
    RETO_DESCRIPTION,
    RETO_LAYOUTS,
} from './prompts/intents/reto'

export type IntentGroup = 'vender' | 'informar' | 'conectar' | 'educar' | 'engagement'

export type ColorRole = 'Texto' | 'Fondo' | 'Acento'

export interface SelectedColor {
    color: string
    role: ColorRole
}

export type TextAssetType = 'cta' | 'tagline' | 'url' | 'hook' | 'custom'
export type ReferenceImageRole = 'style' | 'style_content' | 'content' | 'logo'
export type TypographyFamilyClass = 'sans' | 'serif' | 'slab' | 'mono' | 'script' | 'display'
export type TypographyWeight = 'light' | 'regular' | 'semibold' | 'bold' | 'black'
export type TypographyWidth = 'condensed' | 'normal' | 'extended'
export type TypographyCasing = 'uppercase' | 'title' | 'sentence'
export type TypographySpacing = 'tight' | 'normal' | 'wide'
export type TypographyContrast = 'low' | 'high'
export type TypographyTone = 'corporate' | 'editorial' | 'tech' | 'classic' | 'humanist'

export interface TypographyProfile {
    mode: 'auto' | 'manual'
    familyClass: TypographyFamilyClass
    weight: TypographyWeight
    width: TypographyWidth
    casing: TypographyCasing
    spacing: TypographySpacing
    contrast: TypographyContrast
    tone: TypographyTone
}

export interface TextAsset {
    id: string
    type: TextAssetType
    label: string
    value: string
}

export type IntentCategory =
    // Grupo A: Venta y Producto (Hard Sell)
    | 'oferta'           // La Oferta (Discount)
    | 'escaparate'       // El Escaparate (Product Hero)
    | 'catalogo'         // El Catálogo (Grid/Collection)
    | 'lanzamiento'      // El Lanzamiento (New Arrival)
    | 'servicio'         // El Servicio (Abstract)
    // Grupo B: Información y Avisos (Utility)
    | 'comunicado'       // El Comunicado (Notice)
    | 'evento'           // El Evento (Save the Date)
    | 'lista'            // La Lista (Checklist)
    | 'comparativa'      // La Comparativa (Versus/Split)
    | 'efemeride'        // La Efeméride (Seasonal)
    // Grupo C: Marca y Personas (Connection)
    | 'equipo'           // El Equipo (Meet the Team)
    | 'cita'             // La Cita (Quote)
    | 'talento'          // El Talento (Hiring)
    | 'logro'            // El Logro (Milestone)
    | 'bts'              // Behind the Scenes (Storytelling)
    // Grupo D: Educación y Valor (Content)
    | 'dato'             // El Dato (Stat/Infographic)
    | 'pasos'            // El Paso a Paso (How-To)
    | 'definicion'       // La Definición
    // Grupo E: Engagement (Interaction)
    | 'pregunta'         // La Pregunta (Q&A)
    | 'reto'             // El Reto/Juego

export type LayoutId =
    | 'oferta-impacto'
    | 'promo-movil'
    | 'comunicado-ai-freedom'

export interface LayoutMeta {
    id: LayoutId
    name: string
    description: string
    prompt: string
    icon: LucideIcon
    intent: IntentCategory
}



// -----------------------------------------------------------------------------
// INTENT METADATA
// -----------------------------------------------------------------------------

export interface IntentRequiredField {
    id: string
    label: string
    placeholder: string
    type: 'text' | 'textarea' | 'url' | 'phone' | 'address'
    required: boolean
    optional?: boolean
    mapsTo?: 'headline' | 'cta' // Map to layout-level fields
    aiContext?: string
}

export interface IntentMeta {
    id: IntentCategory
    name: string
    description: string
    extendedDescription?: string  // 3 líneas explicando uso tras seleccionar
    group: IntentGroup
    icon: string  // Lucide icon name
    requiresImage: boolean
    requiredFields?: IntentRequiredField[]  // Campos específicos de esta intención
    subModes?: string[]  // e.g., Escaparate: ['studio', 'lifestyle', 'servicio']
    defaultHeadline?: string
    defaultCta?: string
}

export const INTENT_GROUPS: Record<IntentGroup, { name: string; icon: string; description: string }> = {
    vender: { name: 'Vender', icon: 'ShoppingBag', description: 'Productos y ofertas' },
    informar: { name: 'Informar', icon: 'Info', description: 'Avisos y eventos' },
    conectar: { name: 'Conectar', icon: 'Users', description: 'Marca y personas' },
    educar: { name: 'Educar', icon: 'GraduationCap', description: 'Contenido de valor' },
    engagement: { name: 'Engagement', icon: 'MessageCircle', description: 'Interacción' },
}

export const INTENT_CATALOG: IntentMeta[] = [
    // Grupo A: Vender
    { id: 'oferta', name: 'La Oferta', description: 'Descuento, precio destacado', extendedDescription: 'Promociones con precio o descuento destacado. Ideal para ofertas flash, rebajas y Black Friday. Requiere imagen del producto a promocionar.', group: 'vender', icon: 'Percent', requiresImage: true, defaultHeadline: '30% OFF', defaultCta: 'Comprar Ahora' },
    { id: 'escaparate', name: 'El Escaparate', description: 'Producto protagonista', extendedDescription: ESCAPARATE_EXTENDED_DESCRIPTION, group: 'vender', icon: 'Package', requiresImage: true, requiredFields: ESCAPARATE_REQUIRED_FIELDS, subModes: ['studio', 'lifestyle', 'mockup'] },
    { id: 'catalogo', name: 'El Catálogo', description: 'Colección de productos', extendedDescription: 'Muestra varios productos en una cuadrícula elegante. Perfecto para lanzar colecciones o destacar la variedad de tu catálogo.', group: 'vender', icon: 'Grid3x3', requiresImage: true },
    { id: 'lanzamiento', name: 'El Lanzamiento', description: LANZAMIENTO_DESCRIPTION, extendedDescription: LANZAMIENTO_EXTENDED_DESCRIPTION, group: 'vender', icon: 'Rocket', requiresImage: false, requiredFields: LANZAMIENTO_REQUIRED_FIELDS, defaultHeadline: 'Próximamente' },
    { id: 'servicio', name: 'El Servicio', description: 'Servicios intangibles', extendedDescription: 'Para promocionar servicios que no se pueden fotografiar. Usa iconografía y textos claros para comunicar el valor.', group: 'vender', icon: 'Briefcase', requiresImage: false },

    // Grupo B: Informar
    { id: 'comunicado', name: 'El Comunicado', description: 'Aviso, información densa', extendedDescription: COMUNICADO_EXTENDED_DESCRIPTION, group: 'informar', icon: 'FileText', requiresImage: false, requiredFields: COMUNICADO_REQUIRED_FIELDS },
    { id: 'evento', name: 'El Evento', description: 'Fecha, hora, lugar', extendedDescription: 'Save the Date para eventos, talleres o webinars. Fecha y hora prominentes con información esencial del evento.', group: 'informar', icon: 'Calendar', requiresImage: false, defaultHeadline: 'Save the Date' },
    { id: 'lista', name: 'La Lista', description: 'Pasos, checklist', extendedDescription: 'Información estructurada en formato lista. Ideal para tips, pasos a seguir o requisitos. Fácil de escanear y recordar.', group: 'informar', icon: 'ListChecks', requiresImage: false },
    { id: 'comparativa', name: 'La Comparativa', description: 'Antes/Después, Versus', extendedDescription: 'Comparación visual entre dos estados o opciones. Perfecto para transformaciones, diferencias de producto o decisiones.', group: 'informar', icon: 'ArrowLeftRight', requiresImage: true },
    { id: 'efemeride', name: 'La Efeméride', description: EFEMERIDE_DESCRIPTION, extendedDescription: EFEMERIDE_EXTENDED_DESCRIPTION, group: 'informar', icon: 'Sparkles', requiresImage: false, requiredFields: EFEMERIDE_REQUIRED_FIELDS },

    // Grupo C: Conectar
    { id: 'equipo', name: 'El Equipo', description: 'Meet the Team', extendedDescription: 'Presenta a las personas detrás de la marca. Humaniza tu negocio mostrando rostros, nombres y roles del equipo.', group: 'conectar', icon: 'Users', requiresImage: true },
    { id: 'cita', name: 'La Cita', description: 'Quote, frase inspiracional', extendedDescription: 'Citas memorables, testimonios o frases de marca. Diseño tipográfico protagonista que transmite personalidad.', group: 'conectar', icon: 'Quote', requiresImage: false },
    { id: 'talento', name: 'El Talento', description: TALENTO_DESCRIPTION, extendedDescription: TALENTO_EXTENDED_DESCRIPTION, group: 'conectar', icon: 'UserPlus', requiresImage: false, requiredFields: TALENTO_REQUIRED_FIELDS, defaultHeadline: 'Te Buscamos' },
    { id: 'logro', name: 'El Logro', description: 'Milestone, celebración', extendedDescription: LOGRO_EXTENDED_DESCRIPTION, group: 'conectar', icon: 'Trophy', requiresImage: false, requiredFields: LOGRO_REQUIRED_FIELDS, defaultHeadline: '¡Gracias!' },
    { id: 'bts', name: 'Behind the Scenes', description: 'Proceso, storytelling', extendedDescription: 'Muestra el proceso creativo o día a día del negocio. Contenido auténtico que genera confianza y cercanía.', group: 'conectar', icon: 'Clapperboard', requiresImage: true },

    // Grupo D: Educar
    { id: 'dato', name: 'El Dato', description: 'Estadística, infografía', extendedDescription: DATO_EXTENDED_DESCRIPTION, group: 'educar', icon: 'BarChart3', requiresImage: false, requiredFields: DATO_REQUIRED_FIELDS },
    { id: 'pasos', name: 'El Paso a Paso', description: 'How-To, tutorial', extendedDescription: 'Tutoriales y guías paso a paso. Enseña a tu audiencia algo útil relacionado con tu expertise o producto.', group: 'educar', icon: 'ListOrdered', requiresImage: false },
    { id: 'definicion', name: 'La Definición', description: DEFINICION_DESCRIPTION, extendedDescription: DEFINICION_EXTENDED_DESCRIPTION, group: 'educar', icon: 'BookOpen', requiresImage: false, requiredFields: DEFINICION_REQUIRED_FIELDS },

    // Grupo E: Engagement
    { id: 'pregunta', name: 'La Pregunta', description: 'Q&A, genera comentarios', extendedDescription: PREGUNTA_EXTENDED_DESCRIPTION, group: 'engagement', icon: 'HelpCircle', requiresImage: false, requiredFields: PREGUNTA_REQUIRED_FIELDS, defaultHeadline: '¿Qué opinas?' },
    { id: 'reto', name: 'El Reto', description: RETO_DESCRIPTION, extendedDescription: RETO_EXTENDED_DESCRIPTION, group: 'engagement', icon: 'Gamepad2', requiresImage: false, requiredFields: RETO_REQUIRED_FIELDS },
]

export const INTENT_OPTIONS = INTENT_CATALOG.map(intent => ({
    id: intent.id,
    label: intent.name
}))

// -----------------------------------------------------------------------------
// THEMES (for non-image intents)
// -----------------------------------------------------------------------------

export type SeasonalTheme =
    | 'navidad'
    | 'verano'
    | 'halloween'
    | 'sanvalentin'
    | 'blackfriday'
    | 'corporativo'
    | 'minimalista'
    | 'vibrante'

export interface ThemeMeta {
    id: SeasonalTheme
    name: string
    icon: string
    colors: string[]  // Suggested palette
    keywords: string[]
}

export const THEME_CATALOG: ThemeMeta[] = [
    { id: 'navidad', name: 'Navidad', icon: '🎄', colors: ['#C41E3A', '#165B33', '#FFD700'], keywords: ['festive', 'cozy', 'snow', 'gifts'] },
    { id: 'verano', name: 'Verano', icon: '☀️', colors: ['#FFB347', '#00CED1', '#FF6B6B'], keywords: ['beach', 'tropical', 'bright', 'fresh'] },
    { id: 'halloween', name: 'Halloween', icon: '🎃', colors: ['#FF6600', '#1A1A2E', '#8B008B'], keywords: ['spooky', 'dark', 'mysterious'] },
    { id: 'sanvalentin', name: 'San Valentín', icon: '💕', colors: ['#FF69B4', '#FFB6C1', '#DC143C'], keywords: ['romantic', 'love', 'hearts'] },
    { id: 'blackfriday', name: 'Black Friday', icon: '🏷️', colors: ['#000000', '#FFD700', '#FF0000'], keywords: ['sale', 'bold', 'urgent'] },
    { id: 'corporativo', name: 'Corporativo', icon: '🏢', colors: ['#2C3E50', '#3498DB', '#ECF0F1'], keywords: ['professional', 'clean', 'modern'] },
    { id: 'minimalista', name: 'Minimalista', icon: '◻️', colors: ['#FFFFFF', '#000000', '#F5F5F5'], keywords: ['simple', 'elegant', 'whitespace'] },
    { id: 'vibrante', name: 'Vibrante', icon: '🌈', colors: ['#FF006E', '#8338EC', '#3A86FF'], keywords: ['energetic', 'bold', 'colorful'] },
]

// -----------------------------------------------------------------------------
// VISION ANALYSIS (from Gemini Vision API)
// -----------------------------------------------------------------------------

export type DetectedSubject =
    | 'food'
    | 'tech'
    | 'fashion'
    | 'beauty'
    | 'home'
    | 'sports'
    | 'nature'
    | 'people'
    | 'abstract'
    | 'product'
    | 'unknown'

export interface VisionAnalysis {
    subject: DetectedSubject
    subjectLabel: string        // Human-readable: "Botella de aceite"
    lighting: 'bright' | 'dim' | 'natural' | 'studio' | 'golden_hour' | 'unknown'
    colorPalette: string[]      // Extracted hex colors
    keywords: string[]          // Visual descriptors
    confidence: number          // 0-1
}

// -----------------------------------------------------------------------------
// STYLE CHIPS (contextual based on vision/theme)
// -----------------------------------------------------------------------------

export interface StyleChip {
    id: string
    label: string
    icon: string
    keywords: string[]  // Added to prompt
    category?: string   // Optional category for grouping
}

export const STYLE_CHIPS_BY_SUBJECT: Record<DetectedSubject, StyleChip[]> = {
    food: [
        { id: 'editorial-gourmet', label: '🍷 Editorial Gourmet', icon: 'ChefHat', keywords: ['high-end restaurant photography', 'dark minimalist background', 'dramatic side lighting', 'michelin star plating'] },
        { id: 'casual-authentic', label: '🌿 Auténtico Casero', icon: 'Utensils', keywords: ['rustic wooden table', 'warm natural sunlight', 'homemade aesthetic', 'comfort food vibe'] },
    ],
    tech: [
        { id: 'minimal-tech', label: '⚪ Tech Minimal', icon: 'Monitor', keywords: ['apple design aesthetic', 'clean white background', 'soft shadows', 'premium product photography'] },
        { id: 'neon-cyber', label: '⚡ Neón Cyber', icon: 'Zap', keywords: ['cyberpunk aesthetic', 'dark mode', 'glowing neon accents', 'high contrast futuristic'] },
    ],
    fashion: [
        { id: 'studio-chic', label: '📸 Estudio Chic', icon: 'Camera', keywords: ['fashion editorial', 'clean studio backdrop', 'softbox lighting', 'elegant pose'] },
        { id: 'street-urban', label: '🏙️ Urbano Real', icon: 'Building2', keywords: ['street style photography', 'natural outdoor lighting', 'urban city background', 'dynamic candid'] },
    ],
    beauty: [
        { id: 'pure-clean', label: '🫧 Pureza', icon: 'Droplets', keywords: ['skincare commercial style', 'soft airy lighting', 'white and pastel tones', 'clean purity'] },
        { id: 'bold-glam', label: '💄 Glamour', icon: 'Sparkles', keywords: ['high fashion makeup', 'bold lighting', 'rich saturated colors', 'glossy textures'] },
    ],
    home: [
        { id: 'scandi-modern', label: '🛋️ Moderno Scandi', icon: 'Sofa', keywords: ['architectural digest style', 'bright airy room', 'natural wood details', 'minimalist geometry'] },
        { id: 'cozy-warm', label: '🧶 Acogedor', icon: 'Coffee', keywords: ['hygge aesthetic', 'warm ambient lighting', 'soft textures', 'lived-in comfort'] },
    ],
    sports: [
        { id: 'dynamic-action', label: '⚡ Acción Pura', icon: 'Activity', keywords: ['frozen motion', 'dynamic athlete pose', 'dramatic stadium lighting', 'high energy'] },
        { id: 'gym-focus', label: '💪 Estética Gym', icon: 'Dumbbell', keywords: ['fitness motivation', 'contrasty lighting', 'gym environment', 'focused determination'] },
    ],
    nature: [
        { id: 'cinematic-view', label: '🌄 Cinemático', icon: 'Mountain', keywords: ['national geographic style', 'golden hour', 'epic wide angle', 'dramatic landscape'] },
        { id: 'macro-detail', label: '🔍 Detalle Macro', icon: 'Flower2', keywords: ['macro photography', 'shallow depth of field', 'bokeh background', 'intricate nature details'] },
    ],
    people: [
        { id: 'pro-portrait', label: '👔 Profesional', icon: 'UserCircle', keywords: ['professional headshot', 'trustworthy lighting', 'clean office background', 'friendly corporate'] },
        { id: 'candid-moment', label: '😊 Espontáneo', icon: 'Smile', keywords: ['lifestyle photography', 'genuine laughter', 'sun flare', 'authentic moment'] },
    ],
    abstract: [
        { id: 'modern-geo', label: '🔷 Geométrico', icon: 'Shapes', keywords: ['abstract 3d shapes', 'clean corporate memphis', 'gradient colors', 'modern tech abstract'] },
        { id: 'artistic-fluid', label: '🎨 Fluido Arte', icon: 'Palette', keywords: ['alcohol ink texture', 'fluid gradients', 'dreamy abstract art', 'creative background'] },
    ],
    product: [
        { id: 'pro-studio', label: '📦 Estudio Pro', icon: 'Box', keywords: ['commercial product shot', 'infinite white background', 'perfect reflections', 'advertising standard'] },
        { id: 'lifestyle-context', label: '🏠 En Contexto', icon: 'Home', keywords: ['product in use', 'lifestyle setting', 'blurry background', 'realistic environment'] },
    ],
    unknown: [
        { id: 'clean-modern', label: '✨ Limpio Moderno', icon: 'Sparkles', keywords: ['high quality stock photography', 'well lit', 'clean composition', 'modern aesthetic'] },
        { id: 'bold-creative', label: '🎨 Creativo Bold', icon: 'Zap', keywords: ['creative studio lighting', 'vibrant color palette', 'bold artistic choice', 'unique perspective'] },
    ],
}

// -----------------------------------------------------------------------------
// ARTISTIC STYLE CATALOG (Global Expansion)
// -----------------------------------------------------------------------------

export const ARTISTIC_STYLE_GROUPS = [
    { id: 'brand', label: '💼 Tu Marca', description: 'Estilos de tu Kit de Marca' },
    { id: 'suggested', label: '⭐ Sugeridos', description: 'Basados en tu imagen' },
    { id: 'design', label: '🎨 Diseño & Mockups', description: 'Editorial y Comercial' },
    { id: 'artistic', label: '🎭 Arte & Retro', description: 'Estilos clásicos y vintage' },
    { id: 'digital', label: '🎮 Digital & Animación', description: 'Videojuegos y Series' },
    { id: 'cinematic', label: '🎥 Cine & Foto', description: 'Directores y atmósferas' },
    { id: 'technical', label: '📐 Técnico & Gráfico', description: 'Planos y vectores' },
    { id: 'cultural', label: '🌍 Cultural & Regional', description: 'Estilos del mundo' },
    { id: 'experimental', label: '🌀 Experimental', description: 'Glitch, Vaporwave y más' },
]

export const ARTISTIC_STYLE_CATALOG: StyleChip[] = [
    // 1. Diseño & Mockups
    { id: 'mockup-cotton', label: '👕 Mockups Textiles', icon: 'Shirt', category: 'design', keywords: ['cotton t-shirt mockup', 'natural folds', 'realistic shadows', 'studio lighting'] },
    { id: 'editorial-high', label: '📖 Editorial Premium', icon: 'BookOpen', category: 'design', keywords: ['editorial layout', 'clean finishing', 'dark background', 'sharp typography', 'minimalist'] },
    { id: 'ecommerce-lux', label: '🛍️ E-commerce Lujo', icon: 'ShoppingBag', category: 'design', keywords: ['high-end commercial photography', 'virtual models', 'optimized lighting', 'conversion focused'] },
    { id: 'infographic', label: '📊 Infográfico', icon: 'BarChart', category: 'design', keywords: ['structured diagrams', 'clean infographics', 'data visualization style', 'vector elements'] },

    // 2. Arte & Retro
    { id: 'graphic-novel', label: '🖋️ Novela Gráfica', icon: 'PenTool', category: 'artistic', keywords: ['graphic novel style', 'heavy ink lines', 'high contrast', 'sketch textures', 'noir'] },
    { id: 'vintage-film', label: '🎞️ Película Retro', icon: 'Film', category: 'artistic', keywords: ['vintage film aesthetic', 'bollywood style', 'film grain', 'saturated colors', 'harsh shadows'] },
    { id: 'pop-art', label: '💥 Pop Art', icon: 'Zap', category: 'artistic', keywords: ['andy warhol style', 'halftone patterns', 'bold colors', 'silkscreen print'] },
    { id: 'impressionist', label: '🎨 Impresionista', icon: 'Palette', category: 'artistic', keywords: ['monet style', 'loose brushstrokes', 'light and color focus', 'painterly texture'] },
    { id: 'cubism', label: '🧊 Cubismo', icon: 'Box', category: 'artistic', keywords: ['picasso style', 'geometric deconstruction', 'multiple viewpoints', 'abstracted forms'] },
    { id: 'surrealism', label: '🌀 Surrealismo', icon: 'Wind', category: 'artistic', keywords: ['salvador dali style', 'dream-like', 'unusual juxtapositions', 'melting forms'] },

    // 3. Digital & Animación
    { id: 'ghibli', label: '☁️ Studio Ghibli', icon: 'Cloud', category: 'digital', keywords: ['studio ghibli aesthetic', 'hand-painted backgrounds', 'soft lighting', 'nature focus', 'nostalgic'] },
    { id: 'ibanez', label: '🖊️ Francisco Ibáñez', icon: 'Smile', category: 'digital', keywords: ['mortadelo y filemon style', 'classic spanish comic', 'caricatured features', 'detailed chaotic backgrounds'] },
    { id: 'muppets', label: '🧸 Muppets', icon: 'Hand', category: 'digital', keywords: ['muppet puppet style', 'felt texture', 'jim henson aesthetic', 'distinctive puppet eyes'] },
    { id: 'dbz', label: '🐉 Dragon Ball Z', icon: 'Flame', category: 'digital', keywords: ['90s anime style', 'akira toriyama aesthetic', 'bold outlines', 'dynamic energy'] },
    { id: 'akira', label: '🏍️ Akira', icon: 'Zap', category: 'digital', keywords: ['katsuhiro otomo style', 'cyberpunk anime', 'detailed urban decay', 'gritty', 'cinematic'] },
    { id: 'simpsons', label: '🍩 Los Simpsons', icon: 'CircleDot', category: 'digital', keywords: ['matt groening style', 'yellow skin', 'overbite', 'springfield aesthetic'] },
    { id: 'pixar', label: '🎬 Pixar Style', icon: 'Video', category: 'digital', keywords: ['disney pixar aesthetic', '3d rendered', 'expressive characters', 'subsurface scattering'] },
    { id: 'one-piece', label: '☠️ One Piece', icon: 'Anchor', category: 'digital', keywords: ['eiichiro oda style', 'wild character designs', 'vibrant adventure', 'unique anatomy'] },
    { id: 'lego', label: '🧱 LEGO Style', icon: 'BoxSelect', category: 'digital', keywords: ['lego plastic bricks', 'minifigure aesthetic', 'shiny plastic surface', 'modular construction'] },
    { id: 'south-park', label: '🏔️ South Park', icon: 'UserCircle', category: 'digital', keywords: ['construction paper cutout', 'stop-motion look', 'simplistic design', 'big eyes'] },

    // 4. Cine & Foto
    { id: 'cinematic-gold', label: '🎥 Cinematic Gold', icon: 'Camera', category: 'cinematic', keywords: ['golden hour lighting', 'dramatic portraits', 'detailed skin textures', 'shallow depth of field'] },
    { id: 'wes-anderson', label: '🏰 Wes Anderson', icon: 'Palace', category: 'cinematic', keywords: ['symmetrical composition', 'pastel color palette', 'flat lay', 'quirky details', 'center framing'] },
    { id: 'tarantino', label: '🔫 Tarantino style', icon: 'Bomb', category: 'cinematic', keywords: ['intense colors', 'low angle shots', 'stylized violence aesthetic', 'retro 70s look'] },
    { id: 'a24', label: '🎬 A24 Aesthetic', icon: 'Framer', category: 'cinematic', keywords: ['poetic atmosphere', 'soft natural light', 'indie film look', 'grainy texture'] },
    { id: 'noir', label: '🌑 Cine Negro', icon: 'Moon', category: 'cinematic', keywords: ['film noir', 'chiaroscuro lighting', 'high contrast black and white', 'moody', 'shadowy'] },

    // 5. Técnico & Gráfico
    { id: 'blueprint', label: '📐 Blueprint', icon: 'Ruler', category: 'technical', keywords: ['technical drawing', 'cyanotype blue', 'white lines', 'architectural plan', 'grid background'] },
    { id: 'vector-flat', label: '🎨 Vector Flat', icon: 'Image', category: 'technical', keywords: ['flat design', 'clean vectors', 'no gradients', 'minimalist shapes'] },
    { id: 'woodcut', label: '🪵 Xilografía', icon: 'Scissors', category: 'technical', keywords: ['woodcut print', 'artisan texture', 'rough edges', 'hand-printed look'] },
    { id: 'watercolor-d', label: '💧 Acuarela Digital', icon: 'Droplets', category: 'technical', keywords: ['digital watercolor', 'soft bleeding edges', 'paper texture', 'translucent layers'] },

    // 6. Cultural & Regional
    { id: 'ukiyo-e', label: '🌊 Ukiyo-e', icon: 'Waves', category: 'cultural', keywords: ['japanese woodblock print', 'hokusai style', 'flat perspective', 'traditional patterns'] },
    { id: 'tribal-af', label: '🌍 Tribal Africano', icon: 'Globe', category: 'cultural', keywords: ['african tribal art patterns', 'earthy tones', 'hand-carved textures', 'symbolic motifs'] },
    { id: 'aztec', label: '🎭 Mexica / Azteca', icon: 'Sun', category: 'cultural', keywords: ['pre-columbian art', 'intricate stone carvings', 'indigenous motifs', 'vibrant historical colors'] },

    // 7. Experimental
    { id: 'glitch-art', label: '👾 Glitch Art', icon: 'Cpu', category: 'experimental', keywords: ['digital corruption', 'chromatic aberration', 'data moshing', 'modern tech error'] },
    { id: 'liminal', label: '🚪 Espacios Liminales', icon: 'DoorOpen', category: 'experimental', keywords: ['liminal space aesthetic', 'uncanny', 'empty nostalgic environments', 'dreamcore'] },
    { id: 'vaporwave-exp', label: '🌅 Vaporwave', icon: 'Sun', category: 'experimental', keywords: ['aesthetic 80s', 'glitched marble statues', 'neon pink and teal', 'digital surrealism'] },
    { id: 'brutalist-exp', label: '🧱 Brutalista', icon: 'Box', category: 'experimental', keywords: ['raw concrete', 'massive forms', 'functional aesthetic', 'unpolished'] },
]

// -----------------------------------------------------------------------------
// LAYOUT OPTIONS (Smart Layouts / Wireframes)
// -----------------------------------------------------------------------------

export interface LayoutOption {
    id: string
    name: string
    description: string
    skillVersion?: string // Version del skill que genero esta composicion (si aplica)
    svgIcon: string  // SVG path or component name
    textZone: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'overlay'
    promptInstruction: string  // Fixed instruction
    structuralPrompt?: string  // Advanced deconstruction DNA
    referenceImage?: string    // Path to a template image (Phantom Template)
    referenceImageDescription?: string // Reinforced textual description of the template
    textFields?: LayoutTextField[]
}

export interface LayoutTextField {
    id: string
    label: string
    placeholder: string
    defaultValue: string
    aiContext?: string // Hint for the text generator
}

// Legacy layouts removed – intent TS files are the single source of truth.
// Orphan layouts (not tied to any intent) live in shared-layouts.ts.

export const LAYOUTS_BY_INTENT: Partial<Record<IntentCategory, LayoutOption[]>> = {

    cita: CITA_LAYOUTS as LayoutOption[],
    equipo: EQUIPO_LAYOUTS as LayoutOption[],
    logro: LOGRO_LAYOUTS as LayoutOption[],
    lanzamiento: LANZAMIENTO_LAYOUTS as LayoutOption[],
    reto: RETO_LAYOUTS as LayoutOption[],
    servicio: SERVICIO_LAYOUTS as LayoutOption[],
    talento: TALENTO_LAYOUTS as LayoutOption[],
    definicion: DEFINICION_LAYOUTS as LayoutOption[],
    efemeride: EFEMERIDE_LAYOUTS as LayoutOption[],
    pasos: PASOS_LAYOUTS as LayoutOption[],
    bts: BTS_LAYOUTS as LayoutOption[],
    catalogo: CATALOGO_LAYOUTS as LayoutOption[],
    oferta: OFERTA_LAYOUTS as LayoutOption[],
    escaparate: ESCAPARATE_LAYOUTS as LayoutOption[],
    comunicado: COMUNICADO_LAYOUTS as LayoutOption[],
    pregunta: PREGUNTA_LAYOUTS as LayoutOption[],
    dato: DATO_LAYOUTS as LayoutOption[],
    evento: EVENTO_LAYOUTS as LayoutOption[],
    comparativa: COMPARATIVA_LAYOUTS as LayoutOption[],
    lista: LISTA_LAYOUTS as LayoutOption[],
}

// Intent TS files are the single source of truth – no merge needed.
export const MERGED_LAYOUTS_BY_INTENT: Partial<Record<IntentCategory, LayoutOption[]>> = LAYOUTS_BY_INTENT

// Layouts usados en el modo basico (orden editable).
// Puedes mover cualquier layout existente a este modo anadiendo su ID aqui.
export const BASIC_MODE_LAYOUT_IDS: string[] = [
    'default-free',
    'basic-editorial-columns',
    'basic-mosaic-flow',
    'basic-spotlight-radial',
    'basic-stacked-cards',
    'basic-diagonal-energy',
    'comunicado-modern', // Asimetrico Tech
    'servicio-benefit',  // Split Hero
]

export const ALL_IMAGE_LAYOUTS: LayoutOption[] = [
    ...DEFAULT_LAYOUTS,
    ...LAB_ADVANCED_LAYOUTS,
    ...Object.values(MERGED_LAYOUTS_BY_INTENT).flatMap((list) => list ?? []),
    ...SHARED_LAYOUTS as LayoutOption[],
]

export const BASIC_MODE_LAYOUTS: LayoutOption[] = BASIC_MODE_LAYOUT_IDS
    .map((id) => ALL_IMAGE_LAYOUTS.find((layout) => layout.id === id))
    .filter((layout): layout is LayoutOption => Boolean(layout))

// -----------------------------------------------------------------------------
// SOCIAL MEDIA FORMATS
// -----------------------------------------------------------------------------

export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'x'

export interface SocialFormat {
    id: string
    platform: SocialPlatform
    name: string
    aspectRatio: string // e.g., "1:1", "4:5", "9:16"
    description: string
    icon: string
}

export const SOCIAL_FORMATS: SocialFormat[] = [
    // Instagram
    {
        id: 'ig-square',
        platform: 'instagram',
        name: 'Cuadrado',
        aspectRatio: '1:1',
        description: 'Feed, carruseles, vídeos y anuncios (1080 x 1080 px)',
        icon: 'Instagram'
    },
    {
        id: 'ig-story',
        platform: 'instagram',
        name: 'Story / Reel',
        aspectRatio: '9:16',
        description: 'Stories, Reels y anuncios en Stories (1080 x 1920 px)',
        icon: 'Instagram'
    },
    {
        id: 'ig-portrait-feed',
        platform: 'instagram',
        name: 'Vertical',
        aspectRatio: '4:5',
        description: 'Feed vertical, vídeos y carruseles (1080 x 1350 px)',
        icon: 'Instagram'
    },
    {
        id: 'ig-mobile-portrait',
        platform: 'instagram',
        name: 'Vertical móvil',
        aspectRatio: '3:4',
        description: 'Feed y carruseles, ideal para fotos directas del móvil (1080 x 1440 px)',
        icon: 'Instagram'
    },
    {
        id: 'ig-landscape-feed',
        platform: 'instagram',
        name: 'Horizontal 1.91',
        aspectRatio: '1.91:1',
        description: 'Fotografías del feed, carruseles y anuncios (1080 x 566 px)',
        icon: 'Instagram'
    },
    {
        id: 'ig-landscape-video',
        platform: 'instagram',
        name: 'Vídeo horizontal',
        aspectRatio: '16:9',
        description: 'Vídeos horizontales (1920 x 1080 px o 1080 x 608 px)',
        icon: 'Instagram'
    },
    // TikTok
    {
        id: 'tt-square',
        platform: 'tiktok',
        name: 'Cuadrado',
        aspectRatio: '1:1',
        description: 'Imágenes (1080 x 1080 px)',
        icon: 'Tiktok'
    },
    {
        id: 'tt-vertical',
        platform: 'tiktok',
        name: 'Vertical',
        aspectRatio: '9:16',
        description: 'Imágenes, vídeos y stories (1080 x 1920 px)',
        icon: 'Tiktok'
    },
    {
        id: 'tt-horizontal',
        platform: 'tiktok',
        name: 'Horizontal',
        aspectRatio: '16:9',
        description: 'Vídeos (1920 x 1080 px)',
        icon: 'Tiktok'
    },
    // Facebook
    {
        id: 'fb-square',
        platform: 'facebook',
        name: 'Cuadrado',
        aspectRatio: '1:1',
        description: 'Publicaciones, vídeo y anuncios en feed (1080 x 1080 px)',
        icon: 'Facebook'
    },
    {
        id: 'fb-story',
        platform: 'facebook',
        name: 'Story / Reel',
        aspectRatio: '9:16',
        description: 'Stories, Reels y anuncios verticales (1080 x 1920 px)',
        icon: 'Facebook'
    },
    {
        id: 'fb-landscape',
        platform: 'facebook',
        name: 'Horizontal',
        aspectRatio: '16:9',
        description: 'Portadas para escritorio y móvil (mínimo 400 x 150 px)',
        icon: 'Facebook'
    },
    {
        id: 'fb-event',
        platform: 'facebook',
        name: 'Portada de evento',
        aspectRatio: '2:1',
        description: 'Portada de evento (1200 x 628 px)',
        icon: 'Facebook'
    },
    // X (Twitter)
    {
        id: 'x-square',
        platform: 'x',
        name: 'Cuadrado',
        aspectRatio: '1:1',
        description: 'Imágenes, vídeos y anuncios (1200 x 1200 px)',
        icon: 'Twitter'
    },
    {
        id: 'x-landscape',
        platform: 'x',
        name: 'Horizontal',
        aspectRatio: '16:9',
        description: 'Imagen horizontal, enlace y vídeo (1200 x 675 px)',
        icon: 'Twitter'
    },
    {
        id: 'x-vertical',
        platform: 'x',
        name: 'Vertical',
        aspectRatio: '9:16',
        description: 'Vídeo vertical (1080 x 1920 px)',
        icon: 'Twitter'
    },
    {
        id: 'x-carousel-horizontal',
        platform: 'x',
        name: 'Horizontal 1.91',
        aspectRatio: '1.91:1',
        description: 'Anuncios, carrusel y X Cards (1200 x 628 px o 800 x 418 px)',
        icon: 'Twitter'
    },
    // YouTube
    {
        id: 'yt-shorts',
        platform: 'youtube',
        name: 'Shorts',
        aspectRatio: '9:16',
        description: 'Shorts (1080 x 1920 px)',
        icon: 'Youtube'
    },
    {
        id: 'yt-landscape',
        platform: 'youtube',
        name: 'Horizontal',
        aspectRatio: '16:9',
        description: 'Portada, vídeo largo y miniatura (2048 x 1152 / 1920 x 1080 / 1280 x 720 px)',
        icon: 'Youtube'
    },
    // LinkedIn
    {
        id: 'li-square',
        platform: 'linkedin',
        name: 'Cuadrado',
        aspectRatio: '1:1',
        description: 'Anuncios de una imagen, carrusel y vídeo (1200 x 1200 px)',
        icon: 'Linkedin'
    },
    {
        id: 'li-post-link',
        platform: 'linkedin',
        name: 'Horizontal 1.91',
        aspectRatio: '1.91:1',
        description: 'Post con enlace y anuncios horizontales (1200 x 627/628 px)',
        icon: 'Linkedin'
    },
    {
        id: 'li-cover-personal',
        platform: 'linkedin',
        name: 'Cabecera personal',
        aspectRatio: '4:1',
        description: 'Cabecera de perfil personal y anuncios de eventos (1584 x 396 px)',
        icon: 'Linkedin'
    },
    {
        id: 'li-video-landscape',
        platform: 'linkedin',
        name: 'Vídeo horizontal',
        aspectRatio: '16:9',
        description: 'Ratio admitido para anuncios de vídeo horizontales',
        icon: 'Linkedin'
    },
    {
        id: 'li-video-vertical',
        platform: 'linkedin',
        name: 'Vídeo vertical',
        aspectRatio: '9:16',
        description: 'Ratio admitido para anuncios de vídeo verticales',
        icon: 'Linkedin'
    }
]

export const DEFAULT_SOCIAL_PLATFORM: SocialPlatform = 'instagram'
export const DEFAULT_SOCIAL_FORMAT_ID = 'ig-portrait-feed'

export function getDefaultSocialFormatId(platform?: SocialPlatform | null): string | null {
    const targetPlatform = platform ?? DEFAULT_SOCIAL_PLATFORM

    if (targetPlatform === DEFAULT_SOCIAL_PLATFORM) {
        return DEFAULT_SOCIAL_FORMAT_ID
    }

    return (
        SOCIAL_FORMATS.find((format) => format.platform === targetPlatform)?.id ??
        SOCIAL_FORMATS.find((format) => format.platform === DEFAULT_SOCIAL_PLATFORM)?.id ??
        null
    )
}

// -----------------------------------------------------------------------------
// GENERATION STATE (Global Store)
// -----------------------------------------------------------------------------

export interface GenerationState {
    // Step 0: Platform and Format
    selectedPlatform: SocialPlatform | null
    selectedFormat: string | null // SocialFormat ID
    currentStep: number // 1-based index for the linear creation flow

    // Step 1: Intent
    selectedGroup: IntentGroup | null
    selectedIntent: IntentCategory | null
    selectedSubMode: string | null  // For intents with sub-modes

    // Step 2: Input
    uploadedImages: string[]  // Base64 or URL array (max 10)
    uploadedImageFiles: File[]
    selectedTheme: SeasonalTheme | null

    // Step 3:    // AI Configuration
    selectedImageModel?: string
    selectedIntelligenceModel?: string

    // Analysis
    visionAnalysis?: VisionAnalysis | null
    firstVisionAnalysis?: VisionAnalysis | null
    firstReferenceId?: string | null
    firstReferenceSource?: 'upload' | 'brandkit' | null

    // Suggestions from AI
    suggestions?: Array<{
        title: string
        subtitle: string
        modifications: Partial<GenerationState> // Recursive Partial of state to apply
    }>
    selectedSuggestionIndex?: number | null
    imagePromptSuggestions: string[]
    originalState?: Partial<GenerationState> | null // Snapshot of state before applying suggestion
    isAnalyzing: boolean

    // Step 4: Style
    selectedStyles: string[]  // StyleChip IDs
    selectedStylePresetId?: string | null
    selectedStylePresetName?: string | null

    // Step 5: Layout
    selectedLayout: string | null  // LayoutOption ID

    // Step 6: Branding
    selectedLogoId: string | null
    headline: string
    cta: string
    ctaUrl: string // NEW: URL for the CTA
    ctaUrlManual: boolean
    ctaUrlEnabled: boolean
    caption: string // NEW: Social media caption
    customTexts: Record<string, string>
    selectedBrandColors: SelectedColor[]
    rawMessage: string // User's raw message for AI to use as context
    additionalInstructions: string // Direct instructions from user
    customStyle: string // User defined custom visual style
    applyStyleToTypography: boolean
    selectedTextAssets: TextAsset[] // Text assets for prompt (CTA, Tagline, URL, custom)

    // Image Reference Options
    imageSourceMode: 'upload' | 'brandkit' | 'generate' // Which image source is active
    selectedBrandKitImageIds: string[] // IDs of selected brand kit images (max 10)
    referenceImageRoles: Record<string, ReferenceImageRole> // Role by image ID/URL/base64
    aiImageDescription: string // Description for AI to generate reference image
    typography: TypographyProfile

    // Step 7: Final Format
    // (Moved to Step 0)

    // Generation
    isGenerating: boolean
    generatedImage: string | null
    hasGeneratedImage: boolean
    error: string | null
}

export const INITIAL_GENERATION_STATE: GenerationState = {
    selectedPlatform: DEFAULT_SOCIAL_PLATFORM,
    selectedFormat: DEFAULT_SOCIAL_FORMAT_ID,
    currentStep: 1,
    selectedGroup: null,
    selectedIntent: null,
    selectedSubMode: null,
    uploadedImages: [],
    uploadedImageFiles: [],
    selectedTheme: null,
    visionAnalysis: null,
    firstVisionAnalysis: null,
    firstReferenceId: null,
    firstReferenceSource: null,
    suggestions: undefined,
    selectedSuggestionIndex: null,
    imagePromptSuggestions: [],
    originalState: null,
    isAnalyzing: false,
    selectedStyles: [],
    selectedStylePresetId: null,
    selectedStylePresetName: null,
    selectedLayout: null,
    selectedLogoId: null,
    headline: '',
    cta: '',
    ctaUrl: '', // NEW: Init ctaUrl
    ctaUrlManual: false,
    ctaUrlEnabled: false,
    caption: '', // NEW: Init caption
    customTexts: {},
    selectedBrandColors: [],
    rawMessage: '',
    additionalInstructions: '',
    customStyle: '',
    applyStyleToTypography: false,
    selectedTextAssets: [],
    imageSourceMode: 'generate',
    selectedBrandKitImageIds: [],
    referenceImageRoles: {},
    aiImageDescription: '',
    typography: {
        mode: 'auto',
        familyClass: 'sans',
        weight: 'semibold',
        width: 'normal',
        casing: 'title',
        spacing: 'normal',
        contrast: 'low',
        tone: 'corporate'
    },
    isGenerating: false,
    generatedImage: null,
    hasGeneratedImage: false,
    error: null,
}
