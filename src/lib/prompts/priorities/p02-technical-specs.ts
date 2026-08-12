/**
 * PRIORITY-BASED PROMPT CONSTRUCTION - TECHNICAL SPECS (P2)
 *
 * Output format and technical specifications.
 *
 * @priority 2
 * @section Technical Specifications
 */

export const PRIORITY_HEADER = `╔═════════════════════════════════════════════════════════════════╗
║  PRIORITY 2 - TECHNICAL SPECIFICATIONS                          ║
╚═════════════════════════════════════════════════════════════════╝`

/**
 * Un hex de verdad, no cualquier cadena. El valor se inyecta literalmente en
 * el prompt: si llega basura, el modelo la lee como si fuera un color.
 */
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/**
 * Color de las vinetas de las listas.
 *
 * Estuvo fijado a un `#ed2aed` (un magenta que no es de ninguna marca, resto
 * de alguna prueba). Al ser una constante estatica, ese hex viajaba en TODAS
 * las generaciones y contradecia a la paleta de PRIORITY 4: el prompt pedia
 * usar solo colores de marca y acto seguido nombraba uno ajeno.
 *
 * Ahora se resuelve con el acento real de la generacion; si no lo hay, se
 * remite a PRIORITY 4 en vez de inventar un valor.
 */
function buildMarkerColorRule(acentoHex?: string): string {
    const hex = acentoHex?.trim()
    return hex && HEX_COLOR.test(hex)
        ? `   - COLOR: The markers MUST be strictly in the 'ACENTO' color (${hex}).`
        : `   - COLOR: The markers MUST be strictly in the 'ACENTO' color defined in PRIORITY 4. Do NOT introduce any hue outside the brand palette.`
}

/**
 * Especificaciones tecnicas de composicion.
 *
 * @param acentoHex Acento real de esta generacion (`#rgb` o `#rrggbb`).
 *                  Si se omite o no es un hex valido, la regla de las vinetas
 *                  remite a la paleta de PRIORITY 4.
 */
export function buildCompositionRules(acentoHex?: string): string {
    return `BACKGROUND: NEVER use transparency, transparency grids, checkered patterns (gray/white squares), or simulate transparent backgrounds in any way. The image must be a complete, ready-to-use marketing asset with a fully rendered background.
OUTPUT: Complete, finished marketing image ready for social media. No transparency, no placeholders, no mock-ups.
TEXT RENDERING: NEVER render meta labels, production shorthand, or control tokens such as the standalone letters C T A, "URL", "SUBJECT", "KEYWORDS", "PRIORITY", "HEADLINE", or "STYLE DIRECTIVES" as visible text. NEVER render internal font names/families as visible text. Only render the actual provided content.
TYPOGRAPHY COMPLIANCE: Typography compliance is mandatory and has precedence over aesthetic freedom.
TYPOGRAPHY LOCK: Typography lock already defined above. Do not override.
╔═════════════════════════════════════════════════════════════════╗
║  PRIORITY 2A - LIST LAYOUT, MARKER LIBRARY & SIZE CONTROL      ║
╚═════════════════════════════════════════════════════════════════╝

STRICT LAYOUT RULES (NO PARAGRAPHS):
1. MODULAR ROW STRUCTURE: Do NOT render a text block. Render each item as a completely independent UI element, separated by empty space.
2. EXTREME SPACING: Apply "200% Leading" (Double-double spacing). The empty vertical gap between lines must be TALLER than the text letters themselves.

3. STRICT SIZE CONTROL (CRITICAL):
   - TEXT-RELATIVE SCALING: The bullet icon height must MATCH the "Cap-Height" (height of a capital letter) of the adjacent text.
   - PROHIBITION: Do NOT render massive icons or illustrations. The bullet is a typographical anchor, not a hero image.
   - RATIO: The bullet should occupy roughly the same visual square area as a capital letter "M".

4. APPROVED BULLET LIBRARY (STRICT SELECTION):
   - INSTRUCTION: Select EXACTLY ONE shape style from the allowed list below and apply it consistently to ALL items.
   - VISUAL COHERENCE: The shape must look like a flat, vector design element (UI Icon), NOT a 3D object or sketch.

   - ALLOWED SHAPES (Choose one):
     A) Heavy Modern Chevron (e.g., a bold ">" or arrow-head)
     B) Solid Geometric Square (■)
     C) Thick Minimalist Checkmark (✔ - stylized, not handwritten)
     D) Solid Diamond/Rhombus (◆)
     E) Arrow inside a solid Circle
     F) Thick Horizontal Pill/Dash (▬)
     G) Solid Hexagon (Industrial/Nut shape)
     H) Right-Pointing Play Triangle (▶)
     I) Bold Forward Slash (/) (Swiss Design style)
     J) Outlined Square with Thick Stroke (Box style)
     K) Bold Plus Sign (+) (Swiss Cross style)

${buildMarkerColorRule(acentoHex)}

5. ALIGNMENT: The bullets must align perfectly on the left margin.
CONTACT SEPARATION RULE: Phone numbers, emails, URLs and social handles MUST be rendered outside list/enumeration modules, in their own separate contact area.
CASING RULE: Use sentence case for all generated text. Do NOT capitalize every word. Only capitalize the first word of a sentence and proper nouns/acronyms.`
}
