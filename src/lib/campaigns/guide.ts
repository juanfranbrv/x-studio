/**
 * Genera la guía que se entrega a quien diseña una campaña.
 *
 * El agente externo decide la estrategia, el contenido editorial y el
 * calendario. PostLaboratory resuelve después la identidad visual y los
 * activos del kit de marca.
 */

export type GuideCatalog = {
    brands: Array<{ slug: string; name: string }>
    styles: Array<{ slug: string; name: string; description?: string | null }>
    formats: Array<{ id: string; platform: string; name: string; aspect_ratio: string; description?: string }>
    /** Se conserva para compatibilidad con consumidores antiguos. No se imprime en la guía. */
    layouts: Array<{ id: string; name: string; description?: string | null }>
    /** Se conserva para compatibilidad con consumidores antiguos. No se imprime en la guía. */
    layoutsByIntent?: Array<{ intent: string; layouts: Array<{ id: string; name: string; description?: string }> }>
    intents?: Array<{ id: string; name: string; description?: string | null }>
    platforms: string[]
}

function renderBrands(catalog: GuideCatalog): string {
    return catalog.brands.map((brand) => '- ' + brand.slug + ' — ' + brand.name).join('\n') || '- (no hay marcas disponibles)'
}

function renderPlatforms(catalog: GuideCatalog): string {
    return catalog.platforms.map((platform) => '- ' + platform).join('\n') || '- (sin plataformas)'
}

function renderStyles(catalog: GuideCatalog): string {
    return (
        catalog.styles
            .map((style) => '- ' + style.slug + ' — ' + style.name + (style.description ? ': ' + style.description : ''))
            .join('\n') || '- (sin estilos)'
    )
}

function renderCampaignFormats(catalog: GuideCatalog): string {
    const allowed = new Set(['ig-square', 'ig-portrait-feed'])
    return (
        catalog.formats
            .filter((format) => format.platform === 'instagram' && allowed.has(format.id))
            .map((format) => '- ' + format.id + ' — ' + format.aspect_ratio + (format.description ? ': ' + format.description : ''))
            .join('\n') || '- (sin formatos de Instagram disponibles)'
    )
}

function renderIntents(catalog: GuideCatalog): string {
    return (
        (catalog.intents ?? [])
            .map((intent) => '- ' + intent.id + ' — ' + intent.name + (intent.description ? ': ' + intent.description : ''))
            .join('\n') || '- (sin intenciones disponibles)'
    )
}

/**
 * Prompt listo para pegar en cualquier IA. Solo expone las decisiones que
 * corresponden al agente externo y el contrato mínimo de PostLaboratory.
 */
export function buildCampaignPrompt(catalog: GuideCatalog): string {
    return [
        'Eres un planificador de campañas para redes sociales. Diseña la estrategia completa y prepara dos entregables coordinados para PostLaboratory.',
        '',
        'Trabaja en dos fases internas:',
        '1. Define el objetivo, las subcampañas, los pilares, la distribución y el calendario.',
        '2. Convierte esas decisiones en publicaciones completas, con copy editorial definitivo y una idea visual concreta.',
        '',
        'No expliques el proceso ni añadas comentarios fuera de los dos entregables.',
        '',
        '## Ficheros adicionales de contexto',
        '',
        'Si recibes ficheros adicionales de contexto junto con este encargo, debes leerlos y utilizarlos para completar la estrategia, el calendario, el contenido editorial y las ideas visuales cuando aporten información relevante.',
        'No ignores esos ficheros ni inventes datos que contradigan su contenido. Si existe una contradicción, el briefing estructurado y las reglas del kit de marca tienen prioridad sobre los ficheros para identidad, formato y activos; los ficheros tienen prioridad para información específica de la campaña.',
        '',
        '## Entregable 1: documento Markdown para uso manual (fichero descargable obligatorio)',
        '',
        'Genera un archivo descargable independiente con un nombre significativo siguiendo esta convención: `<slug-de-marca>-<slug-de-campaña>.md`. Usa el slug de la marca de campaign.brand y un slug descriptivo de campaign.name, en minúsculas, sin tildes y separado por guiones. No uses nombres genéricos como `campana.md` salvo que la campaña se llame literalmente «Campaña». No basta con mostrar el contenido en la respuesta ni con dejarlo únicamente dentro de un bloque de código: el usuario debe poder descargar el fichero Markdown completo.',
        '',
        'Genera un documento Markdown con una sección por publicación. Cada publicación debe contener un bloque de código independiente para poder copiarlo y pegarlo manualmente en PostLaboratory.',
        '',
        'Usa esta estructura para cada publicación:',
        '',
        '## <ref> · <fecha y hora> · <subcampaña>',
        '',
        '```text',
        'Deseo crear una publicación para redes sociales (Facebook e Instagram) con este objetivo: <objetivo de la campaña o de esta publicación>.',
        '',
        'Este es el contenido que debe aparecer y no debes alterarlo:',
        '',
        'Headline: <headline literal>',
        'Textos de apoyo visibles:',
        '- <image_texts[0] literal>',
        '- <image_texts[1] literal>',
        'CTA: <cta literal con la URL oficial incluida>',
        'URL protagonista: <cta_url exacta>',
        'Formato de imagen: <1:1 (ig-square) o 4:5 (ig-portrait-feed)>',
        '',
        'La imagen debe mostrar: <visual_content concreto y producible>.',
        '',
        'Body/caption para publicar (NO debe aparecer en la imagen):',
        '<body literal>',
        '```',
        '',
        'El bloque debe empezar exactamente con la frase «Deseo crear una publicación...» y conservar literalmente headline, image_texts, body y CTA. La CTA debe incluir la URL oficial del kit y cta_url debe repetir esa URL exacta para que PostLaboratory pueda darle tratamiento protagonista. El body es el caption editorial para publicar y no forma parte del texto visible de la imagen. No metas colores, logos, estilos, layouts, teléfonos, emails ni hashtags en este prompt: PostLaboratory los aplica desde el kit y su configuración.',
        '',
        '## Entregable 2: JSON descargable para PostLaboratory (fichero descargable obligatorio)',
        '',
        'Genera un archivo descargable independiente con el mismo nombre base y extensión `.json`: `<slug-de-marca>-<slug-de-campaña>.json`. Debe contener el manifiesto completo. No uses un nombre genérico como `campana.json` salvo que la campaña se llame literalmente «Campaña». No basta con mostrar el JSON en la respuesta ni con dejarlo únicamente dentro de un bloque de código.',
        '',
        'Adjunta ambos archivos con ese nombre significativo o proporciona dos enlaces de descarga claramente identificados. Los dos deben compartir exactamente el mismo nombre base y diferenciarse solo por `.md` y `.json`. Estos dos ficheros descargables son la salida obligatoria del encargo; mostrar el contenido sin ofrecer su descarga no cumple el encargo.',
        '',
        'Después de adjuntar los archivos, puedes mostrar una vista previa o los bloques de código, pero nunca como sustituto de los ficheros descargables.',
        '',
        '```json',
        '{',
        '  "version": 1,',
        '  "campaign": {',
        '    "name": "<nombre de la campaña>",',
        '    "brand": "<slug de marca del catálogo>",',
        '    "defaults": {',
        '      "platform": "instagram",',
        '      "publish_to": ["facebook", "instagram"]',
        '    }',
        '  },',
        '  "posts": [',
        '    {',
        '      "ref": "REF-01",',
        '      "scheduled_at": "<fecha y hora ISO 8601 con zona horaria>",',
        '      "group": "<subcampaña>",',
        '      "goal": "<objetivo de esta publicación>",',
        '      "intent": "<intención autorizada para elegir el layout predeterminado>",',
        '      "style": "<slug de estilo autorizado para esta publicación>",',
        '      "format": "<identificador de formato autorizado para esta publicación>",',
        '      "headline": "<titular final>",',
        '      "image_texts": [',
        '        "<texto visible breve 1>",',
        '        "<texto visible breve 2>"',
        '      ],',
        '      "body": "<caption editorial final; no aparece en la imagen>",',
        '      "cta": "<llamada a la acción final con la URL oficial incluida>",',
        '      "cta_url": "<URL oficial exacta que también aparece dentro de cta>",',
        '      "visual_content": "<idea visual concreta y producible>"',
        '    }',
        '  ]',
        '}',
        '```',
        '',
        '# Reglas',
        '',
        '1. Cada publicación necesita una ref única que sirva como nombre de fichero. Usa solo letras, números, guion y guion bajo.',
        '2. Cada publicación debe incluir obligatoriamente scheduled_at, style, format, intent, headline, image_texts, body, cta, cta_url y visual_content. No dejes ninguno vacío.',
        '3. scheduled_at debe estar dentro del periodo indicado y respetar la frecuencia definida por plataforma.',
        '4. headline, image_texts, body y cta son contenido editorial definitivo. Escríbelo completo y no lo sustituyas por instrucciones para otra IA.',
        '5. body es el caption editorial de la publicación: debe conservarse para publicar, pero nunca debe renderizarse dentro de la imagen.',
        '6. image_texts contiene de 2 a 4 textos breves que sí deben aparecer literalmente en la imagen. Divide aquí los beneficios o datos escaneables; no copies el párrafo completo del body.',
        '7. La CTA es obligatoria. cta contiene la frase final completa con la URL oficial incluida y cta_url repite únicamente esa URL exacta para que PostLaboratory la convierta en el elemento protagonista.',
        '8. visual_content describe QUÉ SE VE: sujeto, acción, ambiente y tratamiento de la escena. Debe ser concreto, producible y no abstracto.',
        '9. No representes fachadas, aulas, oficinas, instalaciones o espacios identificables que puedan no corresponder a la empresa real. Para una academia, usa escenas conceptuales de aprendizaje, progreso, idiomas, tecnología, concentración o colaboración, sin representar un local concreto.',
        '10. No escribas texto dentro de visual_content salvo que ese texto aparezca también de forma literal en headline, image_texts o cta.',
        '11. platform indica para qué red se optimiza la publicación; publish_to indica dónde se publica.',
        '12. Usa solo marcas, plataformas, estilos, formatos e intenciones presentes en los catálogos. Un identificador inventado hace que se rechace la campaña.',
        '13. Cada publicación debe elegir exactamente un estilo de la lista autorizada. Elige el estilo según el objetivo, el pilar y el tipo de contenido de esa publicación; puedes repetir estilos cuando sea coherente. No uses "campaign.defaults.style" ni dejes que PostLaboratory lo decida.',
        '14. El formato de imagen es una decisión de campaña fijada por el formulario. Copia el mismo formato autorizado en el campo format de cada publicación y en su prompt Markdown: usa solo ig-square (1:1) o ig-portrait-feed (4:5). No inventes formatos ni dejes que PostLaboratory lo decida.',
        '15. Elige intent según la función comunicativa de cada publicación. El agente externo no elige ningún layout: PostLaboratory elige automáticamente el layout predeterminado asociado a intent.',
        '16. No generes hashtags. PostLaboratory los generará a partir del contenido.',
        '17. No generes prompt técnico de imagen, layout, colores, logos, tipografías ni datos de contacto. PostLaboratory aplica esos elementos desde el kit y desde su configuración lateral.',
        '18. No incluyas claves adicionales en el JSON.',
        '',
        '# Catálogos disponibles',
        '',
        '## Marcas (campaign.brand)',
        renderBrands(catalog),
        '',
        '## Plataformas (platform)',
        renderPlatforms(catalog),
        '',
        '## Estilos visuales (style)',
        renderStyles(catalog),
        '',
        '## Formatos de imagen permitidos (format)',
        renderCampaignFormats(catalog),
        '',
        '## Intenciones permitidas (intent)',
        renderIntents(catalog),
        '',
        '# Responsabilidades de PostLaboratory',
        '',
        'PostLaboratory resolverá el kit indicado en campaign.brand, aplicará su identidad visual, elegirá el layout predeterminado de intent, incorporará los activos configurados en la interfaz y respetará literalmente headline, image_texts, body y cta. Solo headline, image_texts, cta y cta_url forman parte del texto visible; body se conserva como caption editorial.',
    ].join('\n')
}

/** Versión corta para mostrar junto al botón de descarga. */
export function buildCatalogSummary(catalog: GuideCatalog): string {
    return [catalog.brands.length + ' marcas', catalog.styles.length + ' estilos'].join(' · ')
}
