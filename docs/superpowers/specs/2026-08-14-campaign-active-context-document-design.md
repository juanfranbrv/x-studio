# Documento de contexto activo en el Mega Prompt de campañas

**Fecha:** 2026-08-14
**Estado:** Diseño aprobado por Juanfran
**Ámbito:** Asistente de campañas y generación del Mega Prompt

## Objetivo

Cuando el Brand Kit seleccionado tenga un documento de contexto activo, el Mega Prompt generado por el asistente de campañas debe incluir íntegramente su título y contenido. De este modo, el agente externo recibe el mismo contexto empresarial sin que Juanfran tenga que adjuntar el fichero manualmente.

Si el Brand Kit no tiene ningún documento activo, la generación debe conservar el comportamiento actual.

## Alcance

- Resolver el documento activo en el servidor para el Brand Kit ya autenticado.
- Incorporar el documento al Mega Prompt personalizado creado mediante `POST /api/v1/campaign-guide`.
- Reutilizar el formato seguro existente de `buildContextDocumentPromptBlock`.
- Mantener intacta la guía técnica genérica creada mediante `GET /api/v1/campaign-guide`.
- Añadir pruebas del constructor y del contrato de integración de la ruta.
- Registrar la decisión en `docs/TECHNICAL_REFERENCE.md`.

## Alcance excluido

- Cambios de interfaz.
- Cambios en el esquema o en las mutaciones de Convex.
- Incorporar varios documentos simultáneamente.
- Resumir, truncar o reinterpretar el documento.
- Adjuntar un segundo fichero al descargar el Mega Prompt.
- Cambiar la integración de documentos de contexto en Imagen o Carrusel.

## Diseño técnico

### 1. Resolución autoritativa en servidor

La ruta `POST /api/v1/campaign-guide` continuará resolviendo el Brand Kit por `brand_id`, con fallback por `brand_slug`. Una vez validado el kit, consultará `api.contextDocuments.getActiveForBrand` usando el identificador canónico del Brand Kit y la identidad Clerk autenticada.

El cliente no enviará el contenido del documento. Esto evita contenido obsoleto, manipulado o perteneciente a otro Brand Kit.

### 2. Contrato del constructor

`buildCampaignAssistantPrompt` aceptará un campo `contextDocument` de tipo
`AnalyticalContextDocument | null`, reutilizando el tipo público exportado por
`src/lib/prompts/context-document.ts`:

```ts
{
  id: string
  title: string
  content: string
} | null
```

El retorno de Convex contiene `_id`, `title`, `content` y metadatos de
persistencia. La ruta será la única frontera de adaptación y construirá
explícitamente `{ id: String(activeDocument._id), title, content }` antes de
llamar al constructor. Ni el constructor ni el helper conocerán el tipo de fila
de Convex.

El constructor llamará a `buildContextDocumentPromptBlock(contextDocument)`. Este helper ya serializa el documento como JSON, escapa `<`, `>` y `&`, declara el contenido como datos no confiables y establece reglas contra inyección de instrucciones.

No se duplicará esta lógica dentro del módulo de campañas.

### 3. Posición y precedencia dentro del Mega Prompt

El bloque se insertará después del encargo general al agente externo y antes del Kit de marca, el briefing y los contratos de salida. El encargo seguirá gobernando el comportamiento del agente; el documento aportará únicamente datos de referencia.

El contenido se incluirá completo, sin resumen ni truncado adicional. El escape
seguro y la serialización JSON no se consideran modificación editorial del
contenido. Los límites ya garantizados al guardar documentos —12.000
caracteres— acotan el tamaño máximo.

La precedencia será:

1. Contrato e instrucciones del Mega Prompt.
2. Briefing estructurado de campaña y decisiones del Brand Kit.
3. Documento de contexto como fuente factual complementaria.

Las instrucciones que puedan aparecer dentro del documento se ignorarán.

### 4. Ausencia de documento activo

Si `getActiveForBrand` devuelve `null`, `buildContextDocumentPromptBlock` devolverá una cadena vacía. El ensamblado filtrará bloques vacíos para no introducir separadores o encabezados sin contenido.

### 5. Errores

- Los errores de autenticación o propiedad conservarán las respuestas actuales.
- Una inconsistencia de datos, como más de un documento activo, seguirá el contrato estricto de `getActiveForBrand` y provocará un error del servidor. No se elegirá un documento arbitrariamente.
- Cualquier fallo general de `getActiveForBrand` alcanzará el `catch` exterior de
  la ruta y devolverá `500 internal_error`, igual que los demás fallos internos.
  La respuesta no incluirá ningún Mega Prompt parcial.
- El contenido del documento no se escribirá en logs.

## Flujo de datos

```text
Brand Kit seleccionado
        ↓
POST /api/v1/campaign-guide
        ↓
Validación de usuario y propiedad del Brand Kit
        ↓
getActiveForBrand(brandId)
        ↓
buildCampaignAssistantPrompt({ brief, brand, catalog, contextDocument })
        ↓
Mega Prompt descargable/copiar con el documento completo
```

## Pruebas

### Constructor del Mega Prompt

- Incluye el título y el contenido completo cuando recibe un documento.
- Incluye el bloque de seguridad y trata el contenido como referencia no confiable.
- Conserva mediante serialización segura un documento de 12.000 caracteres con
  Unicode, `<`, `>` y `&`, incluso si contiene instrucciones maliciosas.
- No incluye `<context_document>` cuando el documento es `null`.
- Conserva el briefing, el Brand Kit y los contratos técnicos actuales.

### Contrato de la ruta

- La ruta consulta `api.contextDocuments.getActiveForBrand` después de resolver el Brand Kit.
- Usa el identificador del Brand Kit validado, no un contenido enviado por el cliente.
- Adapta `_id` a `id` en la frontera de la ruta y pasa el DTO recuperado a
  `buildCampaignAssistantPrompt`.
- Si Convex devuelve `null`, pasa `null`, conserva la respuesta anterior y no
  produce bloques ni separadores residuales.
- Si la consulta falla, devuelve `500 internal_error` sin un Mega Prompt parcial.

### Verificación global

- Pruebas unitarias afectadas.
- TypeScript.
- Lint del alcance modificado.
- Build de producción.
- Inspección de un Mega Prompt con documento y otro sin documento.
- Búsqueda anti-mojibake obligatoria.

## Despliegue

Tras la validación local se realizará un único commit de la funcionalidad y su documentación. Después se fusionará la rama actual en `main`, se hará push autorizado, se desplegará a Vercel y se verificará que el deployment termine en estado `READY`. No se desplegará Convex porque no hay cambios de esquema ni de funciones Convex.
