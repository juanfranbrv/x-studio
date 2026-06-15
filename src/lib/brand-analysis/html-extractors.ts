// Extractores puros de HTML/CSS (paginas valiosas, fuentes, DOM ponderado estatico).
// Extraido de analyze-brand-dna.ts (troceo Fase 2). Comportamiento-cero.
import * as cheerio from 'cheerio';
import { SYSTEM_FONTS } from '@/lib/prompts/data/system-fonts';

const VALUABLE_PATHS = [
    'about', 'nosotros', 'quienes-somos', 'empresa', 'company',
    'services', 'servicios', 'soluciones', 'what-we-do',
    'team', 'equipo', 'contact', 'contacto'
];

/**
 * Descubre otras páginas valiosas del sitio para dar más contexto a la IA
 */
export function discoverValuablePages(html: string, baseUrl: string): string[] {
    try {
        const $ = cheerio.load(html);
        const links = new Set<string>();
        const urlObj = new URL(baseUrl);
        const domain = urlObj.hostname;

        $('a[href]').each((_, el) => {
            const href = $(el).attr('href');
            if (!href) return;

            try {
                const absoluteUrl = new URL(href, baseUrl);
                // Solo enlaces del mismo dominio
                if (absoluteUrl.hostname !== domain) return;

                const path = absoluteUrl.pathname.toLowerCase();
                if (VALUABLE_PATHS.some(vp => path.includes(vp))) {
                    links.add(absoluteUrl.toString());
                }
            } catch (e) {
                // Ignore invalid URLs
            }
        });

        return Array.from(links).slice(0, 3); // Máximo 3 páginas extra
    } catch (e) {
        console.error('Error discovering valuable pages:', e);
        return [];
    }
}

/**
 * Extract fonts from HTML/CSS content
 * Uses multiple strategies: Google Fonts links, @font-face, font-family declarations
 */
export function extractFontsFromContent(content: string): string[] {
    const fonts: Set<string> = new Set();

    // Common font names to filter out (system fonts, generic families)
    const systemFonts = SYSTEM_FONTS;

    const cleanFontName = (name: string): string | null => {
        if (!name) return null;
        // Remove quotes, extra spaces, and weight/style suffixes
        let cleaned = name.replace(/['"]/g, '').replace(/\s+/g, ' ').trim();
        // Take only the first font if it's a list (e.g. "Open Sans, sans-serif")
        cleaned = cleaned.split(',')[0].trim();
        // Remove common suffixes like :wght@400
        cleaned = cleaned.split(':')[0].split('@')[0].trim();
        // Decode URL encoding
        cleaned = decodeURIComponent(cleaned).replace(/\+/g, ' ');

        if (!cleaned || cleaned.length < 2 || cleaned.length > 50) return null;
        if (systemFonts.has(cleaned.toLowerCase())) return null;
        // Must start with a letter and contain mostly letters/spaces
        if (!/^[A-Za-z]/.test(cleaned)) return null;
        if (/^\d+$/.test(cleaned)) return null;

        return cleaned;
    };

    try {
        // Strategy 1: Google Fonts CSS links (most reliable)
        // Matches: fonts.googleapis.com/css?family=Roboto:400,700|Open+Sans
        // And: fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Open+Sans
        const googleFontsRegex = /fonts\.googleapis\.com\/css2?\?[^"'\s>]*family=([^"'\&>\s]+)/gi;
        let match;
        while ((match = googleFontsRegex.exec(content)) !== null) {
            const familyParam = match[1];
            // Handle both old format (|) and new format (&family=)
            const families = familyParam.split(/[|&]/).filter(f => f.includes('family=') || !f.includes('='));
            families.forEach(f => {
                const name = f.replace('family=', '').split(':')[0];
                const cleaned = cleanFontName(name);
                if (cleaned) fonts.add(cleaned);
            });
        }

        // Strategy 1b: Generic CSS imports (@import url("..."))
        // Often used for fonts
        const importRegex = /@import\s+url\(['"]?([^'")]*)['"]?\)/gi;
        while ((match = importRegex.exec(content)) !== null) {
            const importUrl = match[1];
            if (importUrl.includes('fonts.googleapis.com')) {
                const familyParam = importUrl.split('family=')[1];
                if (familyParam) {
                    const name = familyParam.split(/[&:]/)[0];
                    const cleaned = cleanFontName(name);
                    if (cleaned) fonts.add(cleaned);
                }
            }
        }

        // Strategy 2: @font-face declarations
        const fontFaceRegex = /@font-face\s*\{[^}]*font-family\s*:\s*['"]?([^'";}\n]+)['"]?/gi;
        while ((match = fontFaceRegex.exec(content)) !== null) {
            const cleaned = cleanFontName(match[1]);
            if (cleaned) fonts.add(cleaned);
        }

        // Strategy 3: CSS variables with font names
        // Matches: --font-primary: "Open Sans", ... or --base-font: Roboto
        const cssVarFontRegex = /--[\w-]*(?:font|family|typography|main|heading|body)[\w-]*\s*:\s*['"]?([^;}'"]+)['"]?/gi;
        while ((match = cssVarFontRegex.exec(content)) !== null) {
            const cleaned = cleanFontName(match[1]);
            if (cleaned) fonts.add(cleaned);
        }

        // Strategy 3b: Common class-based font declarations
        // Matches: .font-heading { font-family: 'Open Sans' }
        const classFontRegex = /\.[\w-]*(?:font|family|typography)[\w-]*\s*\{[^}]*font-family\s*:\s*['"]?([^'";}\n]+)['"]?/gi;
        while ((match = classFontRegex.exec(content)) !== null) {
            const cleaned = cleanFontName(match[1]);
            if (cleaned) fonts.add(cleaned);
        }

        // Strategy 4: Main font-family declarations (usually body or main headers)
        // We look for capitalized names to avoid generic "sans-serif"
        const inlineFontRegex = /font-family\s*:\s*['"]?([A-Z][a-zA-Z0-s ]+)(?:['"]|,|;)/g;
        while ((match = inlineFontRegex.exec(content)) !== null) {
            const cleaned = cleanFontName(match[1]);
            if (cleaned) fonts.add(cleaned);
        }

        // Strategy 5: Adobe Fonts / Typekit Detection
        const typekitRegex = /use\.typekit\.net\/([a-z0-9]+)\.css/gi;
        if (typekitRegex.test(content)) {
            console.log('🔤 Adobe Fonts/Typekit detected in content');
        }

        // Strategy 6: data-font or data-family attributes (common in builders)
        const dataFontRegex = /data-(?:font|family)=['"]([^'"]+)['"]/gi;
        while ((match = dataFontRegex.exec(content)) !== null) {
            const cleaned = cleanFontName(match[1]);
            if (cleaned) fonts.add(cleaned);
        }

    } catch (error) {
        console.error('Error extracting fonts:', error);
    }

    const result = [...fonts].slice(0, 8); // Allow up to 8 candidates
    return result;
}

/**
 * Análisis Weighted Estático - Reemplazo de Microlink Weighted DOM
 * Asigna pesos a colores y fuentes basándose en posición DOM, semantic classes e inline styles
 */
export function analyzeStaticWeightedDOM(html: string, rootColors: Record<string, string>): {
    weightedColors: Array<{ hex: string; weight: number }>;
    weightedFonts: Array<{ font: string; weight: number }>;
} {
    const colorWeights: Record<string, number> = {};
    const fontWeights: Record<string, number> = {};

    const normalizeHex = (color: string): string | null => {
        if (!color) return null;
        if (color.startsWith('#')) {
            const cleaned = color.toUpperCase().substring(0, 7);
            return cleaned.length === 7 ? cleaned : null;
        }
        return null;
    };

    const extractInlineColors = (style: string): string[] => {
        const hexRegex = /#([0-9A-Fa-f]{6})/g;
        const colors: string[] = [];
        let match;
        while ((match = hexRegex.exec(style)) !== null) {
            const normalized = normalizeHex(match[0]);
            if (normalized) colors.push(normalized);
        }
        return colors;
    };

    // Match ALL style attributes (minified HTML safe)
    const styleRegex = /style=["']([^"']+)["']/g;
    const styleMatches = [...html.matchAll(styleRegex)];

    styleMatches.forEach(match => {
        const fullTag = html.substring(Math.max(0, match.index - 200), match.index! + 200).toLowerCase();
        const styleContent = match[1];

        let sectionBonus = 1.0;
        if (fullTag.includes('header') || fullTag.includes('nav')) sectionBonus = 1.5;
        else if (fullTag.includes('hero') || fullTag.includes('masthead')) sectionBonus = 2.0;
        else if (fullTag.includes('footer')) sectionBonus = 0.7;

        let semanticBonus = 1.0;
        if (fullTag.includes('cta') || fullTag.includes('button') || fullTag.includes('btn')) semanticBonus = 1.8;
        else if (fullTag.includes('primary') || fullTag.includes('brand')) semanticBonus = 1.5;
        else if (fullTag.includes('accent')) semanticBonus = 1.3;

        const inlineColors = extractInlineColors(styleContent);
        inlineColors.forEach(color => {
            colorWeights[color] = (colorWeights[color] || 0) + (100 * sectionBonus * semanticBonus);
        });
    });

    // Find all headings (minified HTML safe)
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
    const headingMatches = [...html.matchAll(headingRegex)];

    headingMatches.forEach(match => {
        const level = parseInt(match[1]);
        const headingWeight = 100 / level;
        const fullTag = match[0].toLowerCase();
        const fontMatch = fullTag.match(/font-family:\s*['"]?([^'";,]+)/);
        if (fontMatch) {
            const font = fontMatch[1].trim();
            fontWeights[font] = (fontWeights[font] || 0) + headingWeight;
        }
    });

    // CSS Variables
    Object.entries(rootColors).forEach(([varName, hex]) => {
        const normalized = normalizeHex(hex);
        if (!normalized) return;
        let varWeight = 80;
        if (varName.includes('primary') || varName.includes('brand')) varWeight *= 1.8;
        else if (varName.includes('accent') || varName.includes('secondary')) varWeight *= 1.4;
        colorWeights[normalized] = (colorWeights[normalized] || 0) + varWeight;
    });

    console.log(`🐛 [STATIC WEIGHTED] Style matches found: ${styleMatches.length}`);
    console.log(`🐛 [STATIC WEIGHTED] Heading matches found: ${headingMatches.length}`);
    console.log(`🐛 [STATIC WEIGHTED] Root colors processed: ${Object.keys(rootColors).length}`);
    console.log(`🐛 [STATIC WEIGHTED] Color weights:`, Object.keys(colorWeights).length, colorWeights);

    const sortedColors = Object.entries(colorWeights)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15)
        .map(([hex, weight]) => ({ hex, weight }));

    const sortedFonts = Object.entries(fontWeights)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([font, weight]) => ({ font, weight }));

    return { weightedColors: sortedColors, weightedFonts: sortedFonts };
}
