/**
 * P12 - Preferred Language prompt templates.
 * Keep this file free of logic so prompts can be reviewed/edited easily.
 */

export const LANGUAGE_ENFORCEMENT_TEMPLATE = `CRITICAL LANGUAGE REQUIREMENT
LANGUAGE: {{languageName}}.
ALL visible text in the final image MUST be in {{languageName}}. This includes headlines, body copy, CTAs, contact blocks, section labels, decorative tags, captions, footers, and any other text element — invented or provided.
Treat this as an absolute lock for the entire carousel and every slide.
Translate any provided text to {{languageName}} and preserve meaning and tone.
If there is any conflict with brand settings, references, or prior slide wording, {{languageName}} ALWAYS wins.
Never switch languages mid-carousel.
Keep brand/product names and proper nouns unchanged. Use idiomatic {{languageName}}.`

export const COPY_LANGUAGE_NOTE_TEMPLATE = `Generate all copy and hashtags in {{languageName}}.`
