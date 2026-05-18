export const REPLACE_IMAGE_PROMPT_KEY = 'generate_replace_image'
export const REPLACE_IMAGE_PROMPT_NAME = 'Generate image - Replace'
export const REPLACE_IMAGE_PROMPT_DESCRIPTION = 'Used by the Replace module to rebuild the template scene using the user product as the new hero subject.'

const DEFAULT_USER_REFINEMENT = 'No additional user refinement.'
export const DEFAULT_REPLACE_IMAGE_PROMPT_TEMPLATE = `Recreate this ad concept using my product instead of theirs.

Brand context:
- Brand: {{brand_name}}

MANDATORY GOAL:
- Replace the hero product with the product from my uploaded image.
- Keep the same mood, lighting, composition, camera language, and overall editorial vibe from the template image.
- Treat the template image as the composition and scene reference.
- Treat the uploaded product image as the only valid product to feature.

MANDATORY REPLACEMENT RULES:
- Remove all competitor branding, labels, logos, trademarks, and packaging references from the template.
- Do not keep the original product, even partially.
- Do not blend both products together.
- The final image must clearly feature only my product as the main subject.
- Adapt props, reflections, shadows, scale, background elements, and supporting objects so the new product feels native to the scene.
- Preserve the ad-level polish and realism of the template.

OPTIONAL USER REFINEMENT:
{{user_refinement}}

OUTPUT RULES:
- Generate the final advertising image only.
- Do not render any visible competitor text or branding.
- Do not add explanatory text, captions, watermarks, or UI elements unless they already belong naturally to the ad composition without branding.`

export const DEFAULT_REPLACE_SYSTEM_PROMPT = {
    key: REPLACE_IMAGE_PROMPT_KEY,
    name: REPLACE_IMAGE_PROMPT_NAME,
    description: REPLACE_IMAGE_PROMPT_DESCRIPTION,
    body: DEFAULT_REPLACE_IMAGE_PROMPT_TEMPLATE,
} as const

function injectVariables(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? '')
}

export function buildReplaceGenerationPrompt(
    template: string,
    options: {
        brandName?: string | null
        userRefinement?: string | null
    } = {}
): string {
    return injectVariables(template, {
        brand_name: String(options.brandName || '').trim(),
        user_refinement: String(options.userRefinement || '').trim() || DEFAULT_USER_REFINEMENT,
    }).trim()
}

export function canGenerateReplaceImage(input: {
    selectedProductImageUrl?: string | null
    selectedTemplateId?: string | null
}): boolean {
    return Boolean(
        String(input.selectedProductImageUrl || '').trim() &&
        String(input.selectedTemplateId || '').trim()
    )
}
