/**
 * BASE IMAGE GENERATION PROMPT
 * Edit this template to change the behavior of the AI designer.
 */
export const IMAGE_GENERATION_BASE_PROMPT = `
{{systemRole}}

DATOS DE MARCA:
- Colores base: {{colorList}}
- Tono visual: {{tone}}

RECURSOS ARRASTRADOS (PRIORIDAD TOTAL):
{{contextInstructions}}

{{layoutReferencePart}}

{{typographyInstructions}}

SOLICITUD DEL USUARIO:
"{{userPrompt}}"

---------------------------------------------------------
LOGICA DE INFERENCIA INTELIGENTE (SMART MODE):
Si la solicitud del usuario es breve o ambigua, APLICA LOS RECURSOS AUTOMATICAMENTE:

1. Hay colores arrastrados?
   - Los colores con el rol (FONDO) dominan fondos y bloques grandes.
   - Los colores con el rol (ACENTO) se usan para CTAs y elementos destacados.

2. Hay texto arrastrado?
   - DEBE aparecer en la imagen. Prioridad absoluta a la legibilidad.
   - Si no se dice donde, ponlo centrado o en una zona limpia.

3. El usuario refiere a una etiqueta ("Usa Color 2")?
   - Busca en lineas de RECURSOS ARRASTRADOS la referencia [Ref: "Color 2"] y usalo exactamente como se pide.

---------------------------------------------------------
REGLAS CRITICAS - INTOCABLES:
---------------------------------------------------------

PROTECCION DE LOGOS (MAXIMA PRIORIDAD):
- Los logos son SAGRADOS e INMUTABLES.
- NUNCA alteres, distorsiones, recrees o simplifiques un logo.
- El logo debe aparecer EXACTAMENTE como en la imagen original: misma forma, proporcion, colores y detalles.
- Tratamiento: El logo es una CAPA SUPERIOR superpuesta sobre la composicion final.
- NO apliques efectos visuales (blur, glow, sombras exageradas, distorsion) al logo.
- Si no puedes preservar el logo perfectamente, NO lo incluyas.

COMPOSICION:
- NO alucines productos que no esten en las imagenes de contexto.
- Si hay una imagen de PRODUCTO PRINCIPAL, usala tal cual, no la recrees.
- CONTROL DE TEXTO RADICAL: Solo incluye los textos listados explicitamente. PROHIBIDO "Lorem Ipsum" o rellenos.
- CTA / URL: obedece la jerarquia que traiga la peticion. Si se pide que la URL sea el elemento protagonista, tratala como tal (pastilla, bloque de color, peso tipografico fuerte, integrada en la direccion de arte); si no se dice nada, mantenla legible y proporcionada. NUNCA la reduzcas a una linea de texto suelta ni la encierres en un recuadro de contorno fino.
- AUTO-FIT TIPOGRAFICO OBLIGATORIO: ningun texto puede quedar cortado. Si el titular es largo, reduce tamano y haz salto de linea hasta que el 100% del texto sea visible.
- SAFE MARGINS DE TEXTO: deja al menos un 8% de margen respecto a bordes del lienzo y evita recortes de ascenders/descenders.
- PROTECCION ANTIFUGA DE FUENTES: cualquier nombre de fuente o familia tipografica mencionado en el prompt es metadato invisible para estilizar el texto.
- NUNCA imprimas nombres de fuente, etiquetas internas ni tokens de produccion como copy visible dentro de la imagen.
- Si aparece una fuente en el prompt, usala solo para decidir forma, peso, ritmo, remates y jerarquia del texto.
- PROHIBICION DE COLORES EXTRANOS: NO uses colores que no esten en la paleta de marca. Si la plantilla tiene elementos rojos y la marca no tiene rojo, cambialos al color primario de la marca ({{colorList}}).
- Fidelidad estructural absoluta al layout de referencia, pero con estetica 100% de la marca.
---------------------------------------------------------
`.trim();
