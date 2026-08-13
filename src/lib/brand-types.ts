// Brand DNA Types - Nueva estructura para el sistema de extracción

export interface TextAssets {
    marketing_hooks: string[];      // Headlines para banners
    visual_keywords: string[];      // Keywords para generación de imágenes
    ctas: string[];                 // Textos de botones
    brand_context: string;          // Información de contexto
    slogans?: string[];              // Slogans sugeridos
    headlines?: string[];            // Titulares de marketing
}

export interface BrandDNA {
    id?: string;
    _id?: string;
    slug?: string;
    url: string;
    brand_name: string;
    cta_url_enabled?: boolean;
    tagline: string;
    business_overview: string;
    brand_values: string[];
    tone_of_voice: string[];
    visual_aesthetic: string[];
    colors: { color: string; sources: string[]; score: number; role?: string; selected?: boolean }[];
    fonts: { family: string; role?: 'heading' | 'body' }[];
    logo_url?: string;
    logos?: { url: string; selected?: boolean }[];
    favicon_url?: string;
    screenshot_url?: string;
    images: { url: string; selected?: boolean }[];
    target_audience?: string[];
    social_links?: { platform: string; url: string; username?: string }[];
    emails?: string[];
    phones?: string[];
    addresses?: string[];
    preferred_language?: string; // 'es' | 'en' | 'fr' | 'de' | 'pt' | 'it' | 'ca'
    api_trace?: { action: string; status: 'pending' | 'success' | 'fail' | 'highlight'; timestamp: number; details?: string; duration?: number; }[];
    text_assets?: TextAssets;
    created_at?: string;
    updated_at?: string;
    debug?: any;
}

export interface AnalyzeBrandDNAResponse {
    success: boolean;
    data?: BrandDNA;
    error?: string;
}

// Tipo resumido para la lista de perfiles
export interface BrandKitSummary {
    id: string;
    brand_name: string;
    url: string;
    logo_url?: string;
    favicon_url?: string;
    screenshot_url?: string;
    completeness?: number;
    updated_at?: string;
}
