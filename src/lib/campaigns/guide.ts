/**
 * Genera la guia que se entrega a quien disena una campana (persona o IA) para
 * que produzca un manifiesto valido.
 *
 * Se construye a partir de los catalogos VIVOS de la plataforma en lugar de
 * mantenerse a mano: los estilos cambian, se anaden y se renombran, y una guia
 * escrita a mano nace obsoleta. Quien la lea vera siempre lo que existe hoy.
 */

export type GuideCatalog = {
    brands: Array<{ slug: string; name: string }>
    styles: Array<{ slug: string; name: string; description?: string | null }>
    formats: Array<{ id: string; platform: string; name: string; aspect_ratio: string; description?: string }>
    /** Layouts genericos, validos para cualquier intencion. */
    layouts: Array<{ id: string; name: string; description?: string | null }>
    /**
     * Layouts especificos de cada intencion. El panel los presenta asi: al
     * detectar el intent muestra sus layouts. Listarlos todos juntos daria
     * cientos de opciones que en la interfaz nunca aparecen a la vez.
     */
    layoutsByIntent?: Array<{ intent: string; layouts: Array<{ id: string; name: string; description?: string }> }>
    platforms: string[]
}

function listar<T>(items: T[], render: (item: T) => string, vacio: string): string {
    if (items.length === 0) return vacio
    return items.map((item) => `- ${render(item)}`).join('\n')
}

/**
 * Prompt de sistema listo para pegar en cualquier IA. Le da el formato exacto
 * del manifiesto y, sobre todo, QUE puede elegir: sin el catalogo delante, una
 * IA inventa nombres de estilo que no existen y el lote se rechaza entero.
 */
export function buildCampaignPrompt(catalog: GuideCatalog): string {
    return `Eres un planificador de campanas para redes sociales. Tu tarea es
producir un MANIFIESTO DE CAMPANA en JSON que la plataforma pueda ejecutar para
generar todas las imagenes de una campana de una sola vez.

# Formato de salida

Responde UNICAMENTE con un objeto JSON valido, sin texto alrededor:

{
  "version": 1,
  "campaign": {
    "name": "<nombre de la campana>",
    "brand": "<slug de marca del catalogo>",
    "defaults": {
      "platform": "instagram",
      "format": "<id de formato del catalogo>",
      "style": "<slug de estilo del catalogo, opcional>",
      "layout": "<id de layout del catalogo, opcional>",
      "logo": true
    }
  },
  "posts": [
    {
      "ref": "REF-01",
      "scheduled_at": "2026-08-11T09:30:00+02:00",
      "prompt": "<texto libre describiendo la publicacion>",
      "headline": "<titular, opcional>",
      "body": "<cuerpo, opcional>",
      "cta": "<llamada a la accion, opcional>",
      "hashtags": ["#Ejemplo"],
      "style": "<slug de estilo, opcional: pisa el de la campana>",
      "format": "<id de formato, opcional: pisa el de la campana>"
    }
  ]
}

# Reglas

1. Cada publicacion necesita una "ref" unica que sirva como nombre de fichero
   (solo letras, numeros, guion y guion bajo). Sera el nombre de su imagen.
2. Cada publicacion debe describir algo que generar: "prompt" en prosa, o al
   menos "headline" o "body". El prompt en prosa es perfectamente valido y no
   hace falta trocear el texto en campos.
3. "scheduled_at" en formato ISO 8601 con zona horaria. Determina donde cae la
   pieza en el calendario.
4. **Solo puedes usar identificadores que aparezcan en los catalogos de abajo.**
   Un slug o id inventado hace que se rechace la campana entera.
5. Lo que pongas en un post pisa lo que haya en "defaults".

# Catalogos disponibles

## Marcas (campaign.brand)
${listar(catalog.brands, (b) => `\`${b.slug}\` — ${b.name}`, '- (no hay marcas disponibles)')}

## Plataformas (platform)
${catalog.platforms.map((p) => `- \`${p}\``).join('\n')}

## Formatos (format)
${listar(
        catalog.formats,
        (f) => `\`${f.id}\` — ${f.name} (${f.aspect_ratio}), ${f.platform}${f.description ? `. ${f.description}` : ''}`,
        '- (sin formatos)',
    )}

## Layouts genericos (layout)
${listar(catalog.layouts, (l) => `\`${l.id}\` — ${l.name}${l.description ? `: ${l.description}` : ''}`, '- (sin layouts)')}

## Layouts por tipo de publicacion
Cada tipo de publicacion tiene composiciones propias. Usa uno de estos solo si
encaja con lo que cuenta la publicacion.

${
        (catalog.layoutsByIntent ?? [])
            .map(
                (grupo) =>
                    `### ${grupo.intent}\n${grupo.layouts
                        .map((l) => `- \`${l.id}\` — ${l.name}${l.description ? `: ${l.description}` : ''}`)
                        .join('\n')}`,
            )
            .join('\n\n') || '(sin layouts especificos)'
    }

## Estilos visuales (style)
${listar(catalog.styles, (s) => `\`${s.slug}\` — ${s.name}${s.description ? `: ${s.description}` : ''}`, '- (sin estilos)')}

# Como elegir el estilo

Si el usuario no indica un estilo, elige uno del catalogo coherente con el tono
de la campana y usalo como "style" en los defaults, para que toda la campana
tenga un aspecto homogeneo. Cambia de estilo en publicaciones concretas solo si
hay una razon clara (por ejemplo, una subcampana con publico distinto).`
}

/** Version corta, para mostrar en la interfaz junto al boton de descarga. */
export function buildCatalogSummary(catalog: GuideCatalog): string {
    return [
        `${catalog.brands.length} marcas`,
        `${catalog.styles.length} estilos`,
        `${catalog.formats.length} formatos`,
        `${catalog.layouts.length} layouts`,
    ].join(' · ')
}
