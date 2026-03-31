const CREATIVE_ANGLE_SEQUENCE = [
    'benefit-led',
    'emotion-led',
    'contrast-led',
    'curiosity-led',
    'objection-led',
    'scene-led',
]

export function buildPromptDiversitySuffix(module: 'image' | 'carousel'): string {
    const moduleLabel = module === 'carousel' ? 'carousel concept' : 'image concept'
    const imageHardGuard = module === 'image'
        ? `

IMAGE HARD GUARD:
- This is NOT a visual scene brief.
- Return an editorial angle only. Do NOT describe camera, framing, lighting, texture, atmosphere, mood, composition, background blur, or decorative details.
- Do NOT start with labels or headers such as "BEHIND THE SCENES:", "EDUCATIONAL VISUAL:", "PROMOTION:", or similar.
- Do NOT write "show", "mostrar", "mostrem", "a video of", "un vídeo", "a short video", or any production-format instruction.
- Do NOT turn the answer into a shot list or execution brief.
- The answer must read like a publication intention a strategist would give to a copywriter.
- Keep it compact: 1-2 sentences, max 45 words total.
- Sentence 1 must state the editorial angle.
- Sentence 2, if present, may only sharpen the communicative purpose or audience payoff.
- If you feel tempted to describe the image, stop and rewrite the idea as a publishing angle instead.
`.trim()
        : ''

    return `
OUTPUT GOAL:
- Return exactly ONE ${moduleLabel} idea.
- The idea must feel fresh, specific, and usable immediately.

DIVERSITY RULES:
- Do NOT reuse the same response structure, framing, or opening move that you tend to repeat.
- Avoid defaulting to the same 2-3 safe formulas, slogans, or generic campaign patterns.
- Pick ONE creative angle from this set and commit to it fully: ${CREATIVE_ANGLE_SEQUENCE.join(', ')}.
- Vary the angle from your usual favorite pattern. Do not collapse different angles into the same generic idea.

ANTI-GENERICITY RULES:
- Do NOT return vague lines that could fit any brand or any post.
- Avoid generic formulas such as broad inspiration, empty empowerment, bland promotional copy, or template-like hooks.
- Prefer a concrete situation, tension, payoff, sensory cue, objection, or specific promise over a generic message.
- Make the core idea sharply differentiated, not interchangeable with your previous suggestions.

SPECIFICITY RULES:
- The proposal must suggest a concrete narrative or communicative move, not just a topic.
- Make it narrow enough that a designer or copywriter could build from it without asking what you meant.
- If two phrasings are equally valid, choose the more distinctive and less predictable one.

${imageHardGuard}
`.trim()
}
