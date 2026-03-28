// ============================================================================
// CREATION FLOW TYPES - Cascade Interface for X Imagen
// ============================================================================

// -----------------------------------------------------------------------------
// INTENT CATEGORIES (20 Master Templates)
// -----------------------------------------------------------------------------

import { LucideIcon } from 'lucide-react'
import { SHARED_LAYOUTS } from './prompts/intents/shared-layouts'
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

// Default layouts for intents not in the map
export const DEFAULT_LAYOUTS: LayoutOption[] = [
    { id: 'clean', name: 'Limpio', description: 'Espacio para texto', svgIcon: 'Layout', textZone: 'bottom', promptInstruction: 'Clean composition with ample negative space at bottom 25% for text overlay.' },
    { id: 'full-bleed', name: 'Full Bleed', description: 'Imagen completa', svgIcon: 'Maximize', textZone: 'overlay', promptInstruction: 'Full bleed image with semi-transparent text overlay capability.' },
    { id: 'frame', name: 'Con Marco', description: 'Borde visual', svgIcon: 'Frame', textZone: 'overlay', promptInstruction: 'Image with decorative frame or border.' },
    {
        id: 'default-free',
        name: 'Libre',
        description: 'Sin indicación',
        svgIcon: 'Sparkles',
        textZone: 'center',
        promptInstruction: 'Natural composition without structural constraints.',
        structuralPrompt: '',
    },
    {
        id: 'basic-editorial-columns',
        name: 'Editorial',
        description: 'Columnas limpias',
        svgIcon: 'Columns2',
        textZone: 'left',
        promptInstruction: 'Editorial split layout with clear dual-column hierarchy.',
        structuralPrompt: `
## Composición: Editorial por Columnas

**Estructura:** Dos columnas principales con jerarquía clara y respiración visual.

### Jerarquía visual:
1. **Protagonista:** Zona principal en columna dominante.
2. **Secundario:** Columna de apoyo para bloques de lectura breve.
3. **Detalle:** Separadores suaves y ritmo vertical consistente.

### Distribución:
- Columna dominante + columna secundaria equilibrada.
- Márgenes internos uniformes.
- Lectura en flujo descendente natural.

### Evitar:
Superposición de bloques, simetría rígida sin jerarquía, densidad excesiva.
`,
    },
    {
        id: 'basic-mosaic-flow',
        name: 'Mosaico',
        description: 'Bloques dinámicos',
        svgIcon: 'Grid2X2',
        textZone: 'center',
        promptInstruction: 'Asymmetric mosaic with modular blocks and readable hierarchy.',
        structuralPrompt: `
## Composición: Mosaico Fluido

**Estructura:** Retícula modular asimétrica con bloques de distinto peso visual.

### Jerarquía visual:
1. **Protagonista:** Módulo dominante para el mensaje clave.
2. **Secundario:** Módulos medianos para apoyo.
3. **Detalle:** Micro-bloques como acentos estructurales.

### Distribución:
- Patrón modular con variación controlada de tamaños.
- Espacios de respiro entre módulos.
- Flujo visual en Z suave.

### Evitar:
Retícula uniforme de catálogo, fragmentación caótica, choques de escala.
`,
    },
    {
        id: 'basic-spotlight-radial',
        name: 'Radial',
        description: 'Foco central',
        svgIcon: 'CircleDot',
        textZone: 'center',
        promptInstruction: 'Centered radial focus with peripheral support zones.',
        structuralPrompt: `
## Composición: Spotlight Radial

**Estructura:** Núcleo central dominante con periferia limpia de soporte.

### Jerarquía visual:
1. **Protagonista:** Centro de atención en el eje del canvas.
2. **Secundario:** Información alrededor en anillos de prioridad.
3. **Detalle:** Conectores sutiles hacia el núcleo.

### Distribución:
- Centro fuerte con periferia equilibrada.
- Uso amplio de espacio negativo.
- Lectura centrípeta (borde -> centro) y centrífuga (centro -> apoyo).

### Evitar:
Centro débil, periferia saturada, elementos flotantes sin anclaje.
`,
    },
    {
        id: 'basic-stacked-cards',
        name: 'Tarjetas',
        description: 'Capas suaves',
        svgIcon: 'PanelsTopLeft',
        textZone: 'center',
        promptInstruction: 'Layered card composition with depth and clear reading order.',
        structuralPrompt: `
## Composición: Tarjetas Apiladas

**Estructura:** Capas superpuestas con profundidad suave y jerarquía por planos.

### Jerarquía visual:
1. **Protagonista:** Tarjeta frontal con el mensaje principal.
2. **Secundario:** Tarjetas traseras como contexto visual.
3. **Detalle:** Alineaciones y offsets mínimos para ritmo.

### Distribución:
- Plano frontal dominante.
- Planos de apoyo desplazados con coherencia.
- Orden de lectura de adelante hacia atrás.

### Evitar:
Exceso de capas, perspectiva agresiva, desalineación arbitraria.
`,
    },
    {
        id: 'basic-diagonal-energy',
        name: 'Diagonal',
        description: 'Impulso visual',
        svgIcon: 'MoveDiagonal',
        textZone: 'top-left',
        promptInstruction: 'Diagonal compositional axis with clear directional momentum.',
        structuralPrompt: `
## Composición: Eje Diagonal

**Estructura:** Diagonal principal como columna vertebral del diseño.

### Jerarquía visual:
1. **Protagonista:** Punto de mayor peso en uno de los extremos de la diagonal.
2. **Secundario:** Bloques de apoyo distribuidos sobre el recorrido.
3. **Detalle:** Elementos de transición que refuerzan dirección.

### Distribución:
- Flujo diagonal dominante (arriba-izquierda -> abajo-derecha o inverso).
- Contrapeso en esquina opuesta para estabilidad.
- Espacios limpios fuera del eje principal.

### Evitar:
Ejes cruzados, dirección ambigua, acumulación central plana.
`,
    },
]

// 30 composiciones de laboratorio para modo avanzado (agnosticas de intent)
export const LAB_ADVANCED_LAYOUTS: LayoutOption[] = [
    {
        id: 'lab-v6-carril-escenario',
        name: 'Carril Escenario Vivo',
        description: 'Carril limpio y escenario lateral con marco activo',
        skillVersion: '6',
        svgIcon: 'PanelsTopLeft',
        textZone: 'left',
        promptInstruction: 'Editorial rail with framed stage and one visible signature move.',
        structuralPrompt: `
Divide el lienzo con un carril lateral limpio y reserva ese carril como zona continua para título y texto de apoyo sin cruces. Enmarca el escenario principal con un marco abierto y coloca un marco secundario discreto como eco para sostener la jerarquía sin cerrar el centro. Encadena la lectura desde la cabecera del carril hacia el marco frontal y devuelve el recorrido al bloque de apoyo con continuidad clara. Ancla el logo principal en el pie del escenario y, si existe logo auxiliar, colócalo en un borde opuesto con presencia reducida; si no existe, deja ese borde respirable. Introduce solo una familia de marcos o ventanas y separa esos contenedores para proteger el aire alrededor del texto. Varía la composición desplazando los marcos, abriendo o cerrando su apertura y reflejando lateralmente la estructura sin romper el carril limpio.
`,
    },
    {
        id: 'lab-v6-escalera-bisagra',
        name: 'Escalera Bisagra',
        description: 'Peldaños de placas con pliegue como firma',
        skillVersion: '6',
        svgIcon: 'SquareStack',
        textZone: 'top-right',
        promptInstruction: 'Stepped modular rise with hinge-style fold as signature move.',
        structuralPrompt: `
Escalona una serie de placas para construir una subida visual progresiva y alinea ese rail para que la lectura suba con claridad. Reserva una cabecera limpia como no-go zone de texto y protege ese bloque tipográfico con perímetro despejado. Coloca una placa dominante en la escalera y distribuye placas de apoyo para mantener contraste de peso visual sin saturar el lado limpio. Recorta un peldaño con un pliegue tipo bisagra como firma estructural y evita añadir otra ruptura grande en el mismo sistema. Ancla el logo principal en la base del rail y, si existe logo auxiliar, ubícalo en un borde alto opuesto con escala discreta; si no existe, conserva ese borde como silencio funcional. Varía el resultado invirtiendo la dirección de la escalera, separando o acercando peldaños y alternando ruta en Z por niveles o diagonal suave.
`,
    },
    {
        id: 'lab-v6-cuadrantes-vacio',
        name: 'Cuadrantes con Ancla Vacía',
        description: 'Grid en cuadrantes con vacío protagonista',
        skillVersion: '6',
        svgIcon: 'Columns2',
        textZone: 'bottom-left',
        promptInstruction: 'Quadrant composition with protected void as dominant anchor.',
        structuralPrompt: `
Divide el lienzo en cuadrantes y reserva un cuadrante completo como vacío protagonista sin colocar props en ese hueco. Coloca el foco en un cuadrante activo y enmarca ese contenedor con placa o marco para fijar la jerarquía de lectura. Reserva un cuadrante continuo para texto y deja ese bloque como no-go zone con aire claro en todo su perímetro. Ancla el logo principal en un borde de base y, si existe logo auxiliar, colócalo en un borde opuesto con presencia baja; si no existe, protege ese borde como espacio limpio. Introduce una sola familia de placas o marcos y separa esos elementos para evitar ruido en el cuadrante tipográfico. Varía la composición rotando el rol de cuadrantes, intercambiando contenedor entre placa y marco y reflejando lateralmente sin mover el vacío protagonista.
`,
    },
    {
        id: 'lab-v6-diagonal-plegada',
        name: 'Diagonal Plegada',
        description: 'Dos campos en pliegue con tensión de borde',
        skillVersion: '6',
        svgIcon: 'Grid2X2',
        textZone: 'top-left',
        promptInstruction: 'Soft diagonal fold with edge tension and clear text protection.',
        structuralPrompt: `
Pliega el lienzo en dos campos diagonales y reserva la cabecera del campo alto como zona continua de texto sin invasiones. Enmarca el campo principal con una banda o placa inclinada y alinea los apoyos sobre la diagonal para reforzar continuidad. Acerca un contenedor al borde para crear tensión visible y deja un margen respirable que evite tocar la no-go zone tipográfica. Ancla el logo principal en el pie del campo opuesto y, si existe logo auxiliar, ubícalo en un borde lateral distante con presencia discreta; si no existe, mantiene ese borde libre. Usa una sola familia de bandas o placas y separa sus solapes para conservar lectura limpia en el título. Varía la estructura abriendo o cerrando la diagonal, adelantando o atrasando el pliegue y alternando ruta en diagonal suave o Z corta.
`,
    },
    {
        id: 'lab-v6-orbita-lateral',
        name: 'Órbita Lateral Silente',
        description: 'Periferia activa y vacío central protegido',
        skillVersion: '6',
        svgIcon: 'Route',
        textZone: 'top',
        promptInstruction: 'Lateral orbit with central breathing void and connector continuity.',
        structuralPrompt: `
Rodea el área central con una órbita lateral de contenedores y deja el centro como vacío funcional para que respire la composición. Reserva una cabecera limpia como carril de texto y protege ese carril con un perímetro despejado que no reciba conectores. Coloca un contenedor dominante en el arco lateral y conecta apoyos con líneas mínimas para sostener continuidad sin ruido. Ancla el logo principal en el pie opuesto al foco y, si existe logo auxiliar, alinéalo en un borde alto distante con jerarquía menor; si no existe, conserva ese borde como silencio. Introduce una sola familia de arcos o conectores y separa esos props del bloque tipográfico para mantener legibilidad firme. Varía el resultado ensanchando o estrechando la órbita, acercando o separando apoyos y alternando la ruta entre S suave y diagonal corta.
`,
    },
    {
        id: 'lab-v6-split-bahia',
        name: 'Split Bahía Activa',
        description: 'Dos campos asimétricos con borde de tensión',
        skillVersion: '6',
        svgIcon: 'Columns2',
        textZone: 'right',
        promptInstruction: 'Asymmetric split layout with a protected text bay and controlled edge tension.',
        structuralPrompt: `
Divide el lienzo en una bahía de texto y un escenario dominante con un corte asimétrico que marque jerarquía inmediata. Reserva la bahía como zona continua de texto y limpia su perímetro para que ningún contenedor la invada. Coloca una placa dominante en el escenario y alinea placas de apoyo para encadenar lectura hacia el bloque tipográfico. Acerca una placa al borde del escenario para crear tensión visible y deja un margen respirable que no toque la bahía limpia. Ancla el logo principal en el pie del escenario y, si existe logo auxiliar, ubícalo en la cabecera de la bahía con presencia discreta; si no existe, deja esa cabecera libre. Varía la composición ensanchando o estrechando la bahía, adelantando o atrasando el corte y reflejando lateralmente la estructura sin romper la prioridad del texto.
`,
    },
    {
        id: 'lab-v6-marco-perimetral',
        name: 'Marco Perimetral Abierto',
        description: 'Framing en U con centro respirable',
        skillVersion: '6',
        svgIcon: 'PanelsTopLeft',
        textZone: 'bottom',
        promptInstruction: 'Perimeter U-frame composition with open center and one notch signature.',
        structuralPrompt: `
Enmarca el lienzo con un contenedor en U y deja el centro abierto para sostener una respiración clara del escenario. Reserva una base continua como zona de texto y protege esa banda para que no reciba solapes ni conectores. Coloca el foco principal en el campo central y separa los apoyos en el perímetro para mantener jerarquía legible. Recorta un único notch en el marco para activar la firma estructural y evita introducir otra ruptura dominante. Ancla el logo principal en un extremo de la base y, si existe logo auxiliar, colócalo en un borde alto opuesto con escala reducida; si no existe, conserva ese borde sin peso extra. Varía el resultado abriendo o cerrando la U, desplazando el notch y alternando lectura en Z corta o diagonal suave sin invadir la base.
`,
    },
    {
        id: 'lab-v6-reticula-ruptura',
        name: 'Retícula con Ruptura Única',
        description: 'Grid estable con corte controlado',
        skillVersion: '6',
        svgIcon: 'Grid2X2',
        textZone: 'top-right',
        promptInstruction: 'Broken grid with one controlled interruption and protected top text zone.',
        structuralPrompt: `
Organiza una retícula estable de contenedores y reserva la esquina superior como zona continua de texto con perímetro despejado. Coloca un bloque dominante fuera de la alineación principal para ejecutar una ruptura visible sin romper la lectura general. Alinea bloques de apoyo en el resto de la rejilla para guiar una ruta clara desde el foco hacia el texto. Separa la ruptura del bloque tipográfico para sostener jerarquía y deja un borde limpio entre ambas zonas. Ancla el logo principal en el pie de la retícula y, si existe logo auxiliar, ubícalo en un lateral alto distante con presencia menor; si no existe, mantén ese lateral como silencio funcional. Varía la estructura desplazando la celda rota, intercambiando placa por marco y alternando el recorrido entre diagonal suave y Z corta.
`,
    },
    {
        id: 'lab-v6-ventana-desplazada',
        name: 'Ventana Desplazada',
        description: 'Ventana principal corrida con eco lateral',
        skillVersion: '6',
        svgIcon: 'SquareStack',
        textZone: 'left',
        promptInstruction: 'Offset window composition with side echo and protected left text lane.',
        structuralPrompt: `
Desplaza una ventana principal fuera del eje central y reserva un carril izquierdo limpio como zona continua de texto. Coloca una ventana de apoyo en el borde opuesto para crear eco geométrico sin duplicar protagonismo. Encadena la lectura desde el carril tipográfico hacia la ventana dominante y conecta el retorno con un conector mínimo. Separa las ventanas del carril para proteger el aire alrededor del título y evita solapes en la no-go zone. Ancla el logo principal en la base del campo dominante y, si existe logo auxiliar, alinéalo en una cabecera opuesta con firma discreta; si no existe, conserva esa cabecera despejada. Varía la composición adelantando o atrasando la ventana principal, abriendo o cerrando su marco y reflejando lateralmente el sistema sin mover el carril limpio.
`,
    },
    {
        id: 'lab-v6-banda-serpenteante',
        name: 'Banda Serpenteante',
        description: 'Recorrido en S con checkpoints limpios',
        skillVersion: '6',
        svgIcon: 'Route',
        textZone: 'top-left',
        promptInstruction: 'Serpentine band structure with clear checkpoints and protected header.',
        structuralPrompt: `
Traza una banda serpenteante que recorra el lienzo y reserva una cabecera limpia para mantener una zona continua de texto. Coloca un checkpoint dominante sobre la curva principal y alinea checkpoints de apoyo para sostener continuidad de lectura. Separa la banda del bloque tipográfico para evitar roces y deja un perímetro despejado en toda la cabecera. Conecta los checkpoints con un gesto suave para mantener ritmo visual sin saturar el campo central. Ancla el logo principal en el pie opuesto al arranque de la banda y, si existe logo auxiliar, ubícalo en un borde alto distante con presencia reducida; si no existe, deja ese borde como silencio. Varía el resultado abriendo o cerrando la curva, acercando o separando checkpoints y alternando la ruta entre S y diagonal suave sin romper la cabecera.
`,
    },
    {
        id: 'lab-v6-orbita-concentrica',
        name: 'Órbita Concéntrica',
        description: 'Anillos de lectura con núcleo respirable',
        skillVersion: '6',
        svgIcon: 'Circle',
        textZone: 'top-right',
        promptInstruction: 'Concentric orbit architecture with a quiet center and controlled reading flow.',
        structuralPrompt: `
Rodea el foco con anillos suaves y reserva una cabecera lateral limpia como zona continua para texto. Coloca un núcleo dominante en el centro y distribuye apoyos en la órbita para guiar continuidad sin ruido. Separa los anillos del bloque tipográfico y protege el perímetro de la no-go zone con aire claro. Conecta el recorrido entre órbita y núcleo con un gesto mínimo para sostener jerarquía estable. Ancla el logo principal en la base opuesta al núcleo y, si existe logo auxiliar, ubícalo en un borde alto distante con firma discreta; si no existe, conserva ese borde limpio. Varía la composición ensanchando o estrechando los anillos y alternando la ruta entre diagonal suave y Z corta.
`,
    },
    {
        id: 'lab-v6-diptico-puente',
        name: 'Díptico Puente',
        description: 'Dos campos unidos por conectores mínimos',
        skillVersion: '6',
        svgIcon: 'Columns2',
        textZone: 'left',
        promptInstruction: 'Two-panel split linked by minimal bridges and protected text lane.',
        structuralPrompt: `
Divide el lienzo en dos campos y reserva un carril limpio para texto en el lateral dominante. Coloca el foco en un panel y sitúa apoyos en el panel opuesto para crear contraste de peso visual. Conecta ambos paneles con puentes mínimos y evita que esos conectores invadan el bloque tipográfico. Separa el carril del escenario con un borde claro para mantener lectura continua y controlada. Ancla el logo principal en el pie del panel de foco y, si existe logo auxiliar, colócalo en el borde superior del panel opuesto con presencia menor; si no existe, deja ese borde respirable. Varía el resultado desplazando el corte central y alternando lectura en Z corta o diagonal.
`,
    },
    {
        id: 'lab-v6-islas-contrapeso',
        name: 'Islas en Contrapeso',
        description: 'Núcleo fuerte y satélites de apoyo',
        skillVersion: '6',
        svgIcon: 'Layers',
        textZone: 'bottom',
        promptInstruction: 'Island composition with one dominant mass and balanced satellites.',
        structuralPrompt: `
Coloca una isla dominante en el escenario y reserva una base limpia como zona continua para texto. Distribuye islas de apoyo alrededor del foco para construir contrapeso sin fragmentar la lectura. Separa las islas del bloque tipográfico y deja perímetro despejado para no contaminar la base. Encadena el recorrido desde la isla principal hacia los satélites con continuidad visual sobria. Ancla el logo principal en un extremo de la base y, si existe logo auxiliar, ubícalo en una esquina alta opuesta con escala discreta; si no existe, mantiene esa esquina libre. Varía la composición acercando o separando islas y alternando contenedor entre placa y marco sin romper la base.
`,
    },
    {
        id: 'lab-v6-capsulas-ritmo',
        name: 'Cápsulas de Ritmo',
        description: 'Serie modular con beats espaciados',
        skillVersion: '6',
        svgIcon: 'Pill',
        textZone: 'right',
        promptInstruction: 'Capsule rhythm layout with clean right text bay and soft beats.',
        structuralPrompt: `
Escalona cápsulas en una serie rítmica y reserva una bahía limpia en el lateral para título y apoyo. Coloca una cápsula dominante como ancla del recorrido y alinea cápsulas secundarias para sostener continuidad. Separa la serie del bloque tipográfico y protege la no-go zone con un borde respirable. Conecta los beats con un gesto mínimo para mantener orden sin saturar el escenario. Ancla el logo principal en el pie de la serie y, si existe logo auxiliar, ubícalo en la cabecera opuesta con presencia reducida; si no existe, conserva esa cabecera libre. Varía la composición ensanchando la cápsula ancla y alternando lectura en S suave o diagonal corta.
`,
    },
    {
        id: 'lab-v6-umbral-lateral',
        name: 'Umbral Lateral',
        description: 'Puerta estrecha con campo abierto',
        skillVersion: '6',
        svgIcon: 'DoorOpen',
        textZone: 'top-left',
        promptInstruction: 'Lateral threshold composition with narrow gate and open stage.',
        structuralPrompt: `
Construye un umbral estrecho en un lateral y reserva una cabecera limpia para la zona continua de texto. Coloca el foco en el campo abierto y usa el umbral como gesto de entrada sin cerrar el escenario. Separa el umbral del bloque tipográfico y deja un perímetro despejado para proteger legibilidad. Desplaza apoyos ligeros sobre el campo abierto para reforzar continuidad de lectura. Ancla el logo principal en la base del campo y, si existe logo auxiliar, ubícalo en un borde alto opuesto con firma discreta; si no existe, deja ese borde en silencio. Varía el resultado abriendo o estrechando la puerta lateral y reflejando la estructura sin romper la cabecera.
`,
    },
    {
        id: 'lab-v6-rejilla-hub',
        name: 'Rejilla Hub',
        description: 'Grid de soporte con centro ancla',
        skillVersion: '6',
        svgIcon: 'Grid3X3',
        textZone: 'top',
        promptInstruction: 'Grid hub architecture with central anchor and protected header.',
        structuralPrompt: `
Organiza una rejilla de soporte y reserva una franja superior limpia como zona continua de texto. Coloca un hub dominante en el centro y alinea celdas de apoyo para sostener jerarquía clara. Separa la franja tipográfica de la rejilla con un borde limpio que no reciba conectores. Conecta el hub con apoyos mediante líneas mínimas para mantener continuidad sin ruido. Ancla el logo principal en el pie de la rejilla y, si existe logo auxiliar, ubícalo en un lateral alto distante con presencia menor; si no existe, conserva ese lateral respirable. Varía la composición desplazando el hub y alternando ruta de lectura entre Z corta y diagonal.
`,
    },
    {
        id: 'lab-v6-columna-eco',
        name: 'Columna Eco',
        description: 'Eje vertical dominante con réplicas suaves',
        skillVersion: '6',
        svgIcon: 'AlignVerticalSpaceAround',
        textZone: 'left',
        promptInstruction: 'Vertical column layout with echoed supports and clean side text lane.',
        structuralPrompt: `
Traza una columna dominante y reserva un carril lateral limpio para texto continuo. Coloca apoyos en eco a lo largo del eje para reforzar ritmo sin competir con la columna. Separa el carril tipográfico del eje con un margen respirable y protege la no-go zone. Encadena la lectura de arriba hacia abajo con continuidad estable entre columna y apoyos. Ancla el logo principal en el pie de la columna y, si existe logo auxiliar, colócalo en la cabecera opuesta con escala discreta; si no existe, deja esa cabecera limpia. Varía el resultado desplazando la columna y alternando contenedor entre placa y banda sin romper el carril.
`,
    },
    {
        id: 'lab-v6-bisel-esquina',
        name: 'Bisel de Esquina',
        description: 'Recorte angular que activa el marco',
        skillVersion: '6',
        svgIcon: 'CornerDownRight',
        textZone: 'bottom-right',
        promptInstruction: 'Corner-bevel structure with one angular cut and reserved text base.',
        structuralPrompt: `
Enmarca el escenario con un borde activo y reserva una esquina de base limpia para texto continuo. Recorta un bisel angular como firma estructural y evita introducir una segunda ruptura fuerte. Coloca el foco cerca del bisel y distribuye apoyos en el lado opuesto para equilibrar peso visual. Separa el bloque tipográfico del recorte con perímetro despejado para preservar legibilidad. Ancla el logo principal en el extremo de la base y, si existe logo auxiliar, ubícalo en un borde superior opuesto con presencia menor; si no existe, conserva ese borde sin carga. Varía la composición girando el bisel y alternando lectura entre diagonal suave y Z corta.
`,
    },
    {
        id: 'lab-v6-cinta-cascada',
        name: 'Cinta Cascada',
        description: 'Banda descendente en niveles suaves',
        skillVersion: '6',
        svgIcon: 'Waves',
        textZone: 'right',
        promptInstruction: 'Cascade ribbon structure with descending stages and protected right lane.',
        structuralPrompt: `
Desplaza una cinta en cascada por el escenario y reserva un carril derecho limpio para texto. Coloca un tramo dominante en la parte alta de la cinta y encadena tramos de apoyo hacia la base. Separa la cinta del carril tipográfico con aire claro para evitar roces en la no-go zone. Conecta los tramos con continuidad suave para sostener una jerarquía legible de arriba abajo. Ancla el logo principal en la base de la cascada y, si existe logo auxiliar, colócalo en la cabecera opuesta con firma discreta; si no existe, deja esa cabecera libre. Varía el resultado abriendo la caída de la cinta y alternando ruta entre S suave y diagonal.
`,
    },
    {
        id: 'lab-v6-anillo-pivot',
        name: 'Anillo Pivot',
        description: 'Aro principal con pivote lateral',
        skillVersion: '6',
        svgIcon: 'CircleDot',
        textZone: 'top-right',
        promptInstruction: 'Pivot ring layout with lateral anchor and clear text headroom.',
        structuralPrompt: `
Enmarca el foco con un anillo principal y reserva una cabecera lateral limpia para texto continuo. Coloca un pivote en el borde del anillo para activar lectura sin romper el centro. Separa el bloque tipográfico del anillo y protege su perímetro con margen respirable. Encadena apoyos ligeros alrededor del aro para mantener continuidad y jerarquía estable. Ancla el logo principal en el pie opuesto al pivote y, si existe logo auxiliar, ubícalo en un borde alto distante con presencia reducida; si no existe, conserva ese borde limpio. Varía la composición ensanchando el anillo y desplazando el pivote sin invadir la cabecera.
`,
    },
    {
        id: 'lab-v6-rail-pie-editorial',
        name: 'Rail con Pie Editorial',
        description: 'Columna guiada y franja inferior de apoyo',
        skillVersion: '6',
        svgIcon: 'PanelBottom',
        textZone: 'bottom',
        promptInstruction: 'Editorial rail with reserved footer strip and structured reading ladder.',
        structuralPrompt: `
Define un rail vertical dominante y reserva una franja inferior limpia como zona continua de texto. Coloca el foco en la mitad alta del rail y distribuye apoyos en escalón para guiar lectura descendente. Separa la franja tipográfica del rail con un borde claro para evitar solapes y ruido. Conecta apoyos con alineaciones mínimas para sostener continuidad sin densidad excesiva. Ancla el logo principal en un extremo del pie editorial y, si existe logo auxiliar, ubícalo en una cabecera opuesta con firma discreta; si no existe, deja esa cabecera respirable. Varía el resultado desplazando el rail y alternando ruta entre F vertical y Z corta.
`,
    },
    {
        id: 'lab-v6-mosaico-hero',
        name: 'Mosaico Hero Tile',
        description: 'Retícula asimétrica con celda protagonista',
        skillVersion: '6',
        svgIcon: 'LayoutGrid',
        textZone: 'left',
        promptInstruction: 'Asymmetric mosaic with a hero tile and protected left text lane.',
        structuralPrompt: `
Construye un mosaico asimétrico y reserva un carril izquierdo limpio para título y apoyo. Coloca una celda hero como foco dominante y distribuye celdas secundarias para acompañar sin competir. Separa el carril tipográfico de la retícula con perímetro despejado para mantener legibilidad firme. Encadena la lectura desde la celda hero hacia celdas de apoyo con continuidad controlada. Ancla el logo principal en el pie del mosaico y, si existe logo auxiliar, ubícalo en una cabecera opuesta con presencia menor; si no existe, conserva esa cabecera libre. Varía la composición intercambiando posición de la celda hero y alternando contenedor entre placa y marco.
`,
    },
    {
        id: 'lab-v6-puerta-estrecha',
        name: 'Puerta Estrecha',
        description: 'Portal comprimido con escenario expandido',
        skillVersion: '6',
        svgIcon: 'DoorClosed',
        textZone: 'top-left',
        promptInstruction: 'Narrow gate composition with expansive stage and clean text header.',
        structuralPrompt: `
Define una puerta estrecha en un borde y reserva una cabecera limpia como zona continua de texto. Coloca el foco en el escenario amplio y usa la puerta como gesto de tensión de entrada. Separa el bloque tipográfico del portal con margen claro para evitar invasiones en la no-go zone. Alinea apoyos alrededor del foco para sostener una jerarquía estable y legible. Ancla el logo principal en la base del escenario y, si existe logo auxiliar, colócalo en un borde alto opuesto con firma discreta; si no existe, deja ese borde en silencio. Varía el resultado adelantando o atrasando la puerta y reflejando lateralmente la estructura sin romper la cabecera.
`,
    },
    {
        id: 'lab-v6-marco-bisagra',
        name: 'Marco Bisagra',
        description: 'Contenedor articulado sobre eje lateral',
        skillVersion: '6',
        svgIcon: 'Frame',
        textZone: 'right',
        promptInstruction: 'Hinged frame architecture with one articulated fold and right text protection.',
        structuralPrompt: `
Enmarca el escenario con un marco articulado y reserva un carril derecho limpio para texto continuo. Coloca el foco en la zona de bisagra y distribuye apoyos hacia el lado opuesto para equilibrar peso visual. Separa el carril tipográfico del pliegue con perímetro despejado para conservar legibilidad. Conecta el recorrido desde la bisagra hacia apoyos con continuidad suave y ordenada. Ancla el logo principal en la base del marco y, si existe logo auxiliar, ubícalo en la cabecera opuesta con escala discreta; si no existe, conserva esa cabecera libre. Varía la composición abriendo o cerrando la bisagra y alternando ruta entre diagonal y Z corta.
`,
    },
    {
        id: 'lab-v6-offset-perimetral',
        name: 'Offset Perimetral',
        description: 'Borde activo desplazado con núcleo limpio',
        skillVersion: '6',
        svgIcon: 'Square',
        textZone: 'top',
        promptInstruction: 'Offset perimeter frame with a calm core and protected top text strip.',
        structuralPrompt: `
Activa un marco perimetral desplazado y reserva una franja superior limpia para texto continuo. Coloca el foco en el núcleo interior y reparte apoyos en el perímetro para sostener contrapeso. Separa la franja tipográfica del borde activo con aire claro para evitar cruces. Encadena la lectura desde el núcleo hacia el perímetro con continuidad controlada y sin ruido. Ancla el logo principal en el pie del marco y, si existe logo auxiliar, ubícalo en un lateral alto opuesto con firma discreta; si no existe, deja ese lateral respirable. Varía el resultado desplazando el perímetro y alternando contenedor entre banda y marco sin romper la franja.
`,
    },
    {
        id: 'lab-v6-celda-satelite',
        name: 'Celda Satélite',
        description: 'Foco central con celdas orbitales',
        skillVersion: '6',
        svgIcon: 'Orbit',
        textZone: 'left',
        promptInstruction: 'Central cell with orbital satellites and clean left editorial lane.',
        structuralPrompt: `
Coloca una celda central dominante y reserva un carril izquierdo limpio como zona continua de texto. Distribuye celdas satélite alrededor del foco para construir una órbita legible sin saturación. Separa el carril tipográfico del sistema orbital con perímetro despejado y sin conectores invasivos. Conecta la celda central con satélites mediante guías mínimas para mantener continuidad. Ancla el logo principal en la base opuesta al carril y, si existe logo auxiliar, ubícalo en una cabecera distante con presencia menor; si no existe, conserva esa cabecera libre. Varía la composición acercando o separando satélites y alternando ruta en S suave o diagonal corta.
`,
    },
    {
        id: 'lab-v6-vacio-esquina',
        name: 'Vacío de Esquina',
        description: 'Silencio angular como ancla funcional',
        skillVersion: '6',
        svgIcon: 'CornerUpLeft',
        textZone: 'bottom-left',
        promptInstruction: 'Corner void strategy with protected text block and controlled support masses.',
        structuralPrompt: `
Reserva una esquina como vacío protagonista y coloca el bloque de texto continuo en un área adyacente limpia. Sitúa el foco en el campo opuesto y distribuye apoyos con masa controlada para sostener jerarquía. Separa el bloque tipográfico del vacío y de los apoyos con perímetro respirable para máxima legibilidad. Encadena la lectura entre foco y texto sin cruzar la esquina silenciosa. Ancla el logo principal en la base del campo activo y, si existe logo auxiliar, colócalo en un borde alto opuesto con firma discreta; si no existe, deja ese borde en silencio. Varía la estructura rotando el vacío de esquina y reflejando lateralmente el sistema sin romper la zona de texto.
`,
    },
    {
        id: 'lab-v6-banda-doble',
        name: 'Banda Doble',
        description: 'Dos carriles tensados con foco intermedio',
        skillVersion: '6',
        svgIcon: 'Rows3',
        textZone: 'top-right',
        promptInstruction: 'Dual-band composition with intermediate focus and protected top lane.',
        structuralPrompt: `
Traza dos bandas paralelas y reserva una cabecera lateral limpia para texto continuo. Coloca el foco entre ambas bandas para crear tensión controlada sin bloquear la lectura. Separa la cabecera tipográfica del sistema de bandas con un margen claro y estable. Alinea apoyos sobre las bandas para encadenar recorrido y mantener continuidad visual. Ancla el logo principal en la base del sistema y, si existe logo auxiliar, ubícalo en un borde superior opuesto con presencia menor; si no existe, conserva ese borde despejado. Varía el resultado ensanchando o estrechando bandas y alternando lectura entre Z corta y diagonal suave.
`,
    },
    {
        id: 'lab-v6-escalon-zeta',
        name: 'Escalón Zeta',
        description: 'Ruta quebrada en Z con niveles de apoyo',
        skillVersion: '6',
        svgIcon: 'MoveRight',
        textZone: 'right',
        promptInstruction: 'Stepped Z-path architecture with protected right text lane and one dominant node.',
        structuralPrompt: `
Escalona un recorrido en Z y reserva un carril derecho limpio como zona continua de texto. Coloca un nodo dominante en el quiebre principal y distribuye nodos de apoyo sobre la ruta para sostener jerarquía. Separa el carril tipográfico del zigzag con perímetro despejado y sin solapes. Conecta los nodos con guías mínimas para mantener continuidad sin densidad excesiva. Ancla el logo principal en la base del recorrido y, si existe logo auxiliar, ubícalo en una cabecera opuesta con firma discreta; si no existe, deja esa cabecera libre. Varía la composición abriendo la Z, desplazando el quiebre y reflejando lateralmente la estructura sin romper el carril.
`,
    },
    {
        id: 'lab-v6-ventana-constelacion',
        name: 'Ventana Constelación',
        description: 'Marco abierto con satélites en constelación',
        skillVersion: '6',
        svgIcon: 'Sparkles',
        textZone: 'top',
        promptInstruction: 'Open window with constellation supports and protected top text strip.',
        structuralPrompt: `
Enmarca el foco con una ventana abierta y reserva una franja superior limpia como zona continua de texto. Coloca satélites en constelación alrededor del marco para crear ritmo sin invadir el núcleo. Separa la franja tipográfica del sistema de satélites con perímetro despejado y estable. Conecta la constelación con gestos mínimos para sostener continuidad y jerarquía clara. Ancla el logo principal en el pie del marco y, si existe logo auxiliar, ubícalo en un lateral alto opuesto con presencia menor; si no existe, conserva ese lateral respirable. Varía el resultado desplazando la ventana, acercando o separando satélites y alternando lectura en S suave o diagonal.
`,
    },
]
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
