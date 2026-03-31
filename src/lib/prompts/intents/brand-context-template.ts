/**
 * BRAND CONTEXT TEMPLATE
 * 
 * Generates a contextual block from BrandDNA to inject into the intent parser prompt.
 * This helps the AI understand the brand's voice and adapt extraction accordingly.
 */

import { BrandDNA } from '@/lib/brand-types'

export function buildBrandContextBlock(brandDNA: Partial<BrandDNA> | null | undefined): string {
    if (!brandDNA) {
        return ''
    }

    const toneOfVoice = brandDNA.tone_of_voice?.join(', ') || 'Profesional'
    const targetAudience = brandDNA.target_audience?.join(', ') || 'General'
    const brandValues = brandDNA.brand_values?.join(', ') || 'Calidad, Confianza'
    const visualAesthetic = brandDNA.visual_aesthetic?.join(', ') || 'Moderno'
    const preferredCTAs = brandDNA.text_assets?.ctas?.slice(0, 3).join(', ') || ''
    const marketingHooks = brandDNA.text_assets?.marketing_hooks?.slice(0, 3).join(' | ') || ''
    const brandContext = brandDNA.text_assets?.brand_context || ''
    const tagline = brandDNA.tagline || ''

    return `
### BRAND CONTEXT (Use this to adapt tone and style of the extraction):
- Brand Name: ${brandDNA.brand_name || 'Unknown'}
- Tone of Voice: ${toneOfVoice}
- Target Audience: ${targetAudience}
- Brand Values: ${brandValues}
- Visual Aesthetic: ${visualAesthetic}
${tagline ? `- Tagline: ${tagline}` : ''}
${preferredCTAs ? `- Preferred CTAs (use as inspiration): ${preferredCTAs}` : ''}
${marketingHooks ? `- Marketing Hooks (use as inspiration): ${marketingHooks}` : ''}
${brandContext ? `- Brand Description: ${brandContext}` : ''}

BRAND CONTEXT USAGE RULES:
1. Use the brand's tone_of_voice to set the headline's style (formal, playful, direct, etc.)
2. Consider target_audience when choosing vocabulary complexity
3. You MAY use the preferred CTAs or marketing hooks as INSPIRATION, but the user's specific request ALWAYS takes priority
4. NEVER override the user's specific topic (e.g., "Arduino course") with generic brand messaging
5. The headline MUST reflect what the USER is promoting, not generic brand slogans
`.trim()
}
