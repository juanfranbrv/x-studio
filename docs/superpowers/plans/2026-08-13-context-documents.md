# Context Documents Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir documentos de contexto seleccionables por Brand Kit e incorporarlos de forma segura y coherente al análisis de Imagen y Carrusel.

**Architecture:** Una tabla Convex independiente guarda hasta 20 documentos inmutables por Brand Kit. Los análisis resuelven en servidor una firma indivisible `{ brandId, contextDocumentId }`, inyectan el documento solo en prompts analíticos y bloquean resultados obsoletos. Brand Kit ofrece gestión completa; Imagen y Carrusel reutilizan un indicador y selector rápido compartidos.

**Tech Stack:** Next.js 16, React 19, TypeScript, Convex, Clerk, shadcn/Radix, Tailwind semántico, i18next, Vitest.

**Restricciones operativas:** No ejecutar `npx convex dev`, `npx convex dev --once`, `convex deploy` ni `npm run dev`, porque todos arrancan o publican contra el único Convex real de `postlaboratory.com`. No hacer commit hasta que Juanfran valide la implementación. No modificar componentes no relacionados y no crear colores hardcodeados.

**Spec:** `docs/superpowers/specs/2026-08-13-context-documents-design.md`

---

## Mapa de archivos

### Crear

- `src/lib/context-documents.ts`: constantes, tipos, validación Unicode, lectura segura de archivos y construcción de firmas.
- `src/lib/__tests__/context-documents.test.ts`: límites, Unicode, BOM, extensiones y firmas.
- `convex/contextDocuments.ts`: queries y mutaciones autorizadas del agregado.
- `convex/__tests__/context-documents-contract.test.ts`: contrato estático de esquema, autorización, cuota y exclusividad sin desplegar Convex.
- `src/lib/prompts/context-document.ts`: serialización segura y bloque analítico delimitado.
- `src/lib/prompts/__tests__/context-document.test.ts`: coexistencia con `business_overview`, delimitadores, marcador canario y ausencia.
- `src/hooks/useBrandContextDocuments.ts`: suscripción reactiva a metadatos y mutaciones compartidas.
- `src/app/actions/context-documents.ts`: fachada autenticada para creación, lectura de contenido, activación, desactivación y eliminación.
- `src/components/context-documents/ContextDocumentViewerDialog.tsx`: vista de solo lectura y botón futuro desactivado.
- `src/components/context-documents/ContextDocumentSelectorDialog.tsx`: selector rápido compartido.
- `src/components/context-documents/ContextDocumentAnalysisControl.tsx`: icono sutil para `SectionHeader.extra`.
- `src/components/context-documents/ContextDocumentsManager.tsx`: gestión completa en Brand Kit.
- `src/components/context-documents/__tests__/context-documents-ui.test.ts`: contratos de UI, accesibilidad y reutilización.
- `src/lib/context-analysis-signature.ts`: comparación y estado de reanálisis puro.
- `src/lib/__tests__/context-analysis-signature.test.ts`: carreras, herencia y latch.

### Modificar

- `convex/schema.ts`: tabla e índices.
- `convex/brands.ts`: cascada de borrado y clonación de documentos.
- `convex/_generated/api.d.ts`: registrar localmente el módulo nuevo sin ejecutar codegen remoto.
- `src/lib/brand-types.ts`: metadatos de firma cuando correspondan.
- `src/lib/prompts/intents/parser.ts`: aceptar bloque de documento separado.
- `src/lib/prompts/carousel.ts`: aceptar bloque de documento separado.
- `src/app/actions/parse-intent.ts`: resolver contexto autenticado, devolver firma y verificar firma esperada.
- `src/app/actions/generate-carousel.ts`: resolver firma antes del primer modelo y devolverla.
- `src/app/brand-kit/page.tsx`: duplicar también los documentos mediante una operación autenticada del agregado.
- `src/app/image/page.tsx`: firma, descarte de respuestas obsoletas, snapshots y props del control.
- `src/app/carousel/page.tsx`: firma coherente entre dos llamadas y descarte final.
- `src/components/studio/ControlsPanel.tsx`: usar `SectionHeader.extra` con control compartido.
- `src/components/studio/carousel/CarouselControlsPanel.tsx`: mismo control y latch de reanálisis.
- `src/components/studio/carousel/CarouselControlsPanel.types.ts`: persistir firma y latch en `CarouselWorkspaceSnapshot`.
- `convex/work_sessions.ts`: preservar campos de firma al sanear snapshots.
- `src/components/brand-dna/BrandDNABoard.tsx`: insertar gestor bajo `BrandContextCard`.
- `src/locales/es-ES/brandKit.json`, `src/locales/en-US/brandKit.json`: gestión completa.
- `src/locales/es-ES/image.json`, `src/locales/en-US/image.json`: indicador y errores de Imagen.
- `src/locales/es-ES/carousel.json`, `src/locales/en-US/carousel.json`: indicador y errores de Carrusel.
- `docs/TECHNICAL_REFERENCE.md`: decisión transversal final.

---

## Chunk 1: Dominio, datos y prompts

### Task 1: Dominio puro y validación compartida

**Files:**
- Create: `src/lib/context-documents.ts`
- Create: `src/lib/__tests__/context-documents.test.ts`

- [ ] **Step 1: Escribir tests fallidos de límites y archivos**

Cubrir:

```ts
expect(countContextCharacters(example8553)).toBe(8553)
expect(validateContextDocument({ title: 'A', content: text12000 })).toEqual({ ok: true })
expect(validateContextDocument({ title: 'A', content: text12001 }).ok).toBe(false)
expect(validateContextDocument({ title: 'A', content: '   ' }).ok).toBe(false)
expect(isSupportedContextFile('DOC.MD')).toBe(true)
expect(isSupportedContextFile('doc.pdf')).toBe(false)
```

Añadir casos con emojis astrales para demostrar conteo por puntos de código, BOM inicial, título de 100/101 caracteres y nombre de archivo de 255/256.

- [ ] **Step 2: Ejecutar los tests y confirmar fallo**

Run: `npx vitest run src/lib/__tests__/context-documents.test.ts`

Expected: FAIL porque el módulo no existe.

- [ ] **Step 3: Implementar el dominio mínimo**

Exportar:

```ts
export const CONTEXT_DOCUMENT_MAX_CHARACTERS = 12_000
export const CONTEXT_DOCUMENT_MAX_TITLE_CHARACTERS = 100
export const CONTEXT_DOCUMENT_MAX_SOURCE_FILENAME_CHARACTERS = 255
export const CONTEXT_DOCUMENT_MAX_FILE_BYTES = 64 * 1024
export const CONTEXT_DOCUMENT_MAX_PER_BRAND = 20
export type ContextDocumentMetadata = { id: string; brandId: string; title: string; sourceFilename?: string; characterCount: number; isActive: boolean; createdAt: string }
export type ContextAnalysisSignature = { brandId: string; contextDocumentId: string | null }
export function countContextCharacters(value: string): number
export function validateContextDocument(input: { title: string; content: string; sourceFilename?: string }): ValidationResult
export function isSupportedContextFile(name: string): boolean
export async function readContextTextFile(file: File): Promise<{ title: string; content: string; sourceFilename: string }>
```

`readContextTextFile` debe validar bytes antes de usar `TextDecoder('utf-8', { fatal: true })`, quitar solo el BOM inicial y preservar el resto del cuerpo.

- [ ] **Step 4: Ejecutar tests**

Run: `npx vitest run src/lib/__tests__/context-documents.test.ts`

Expected: PASS.

### Task 2: Modelo Convex y operaciones autorizadas

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/contextDocuments.ts`
- Modify: `convex/_generated/api.d.ts`
- Create: `convex/__tests__/context-documents-contract.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Escribir contrato estático fallido**

El test debe leer los archivos fuente y exigir:

- tabla `brand_context_documents`;
- índices `by_brand` y `by_brand_active`;
- uso de `requireSameUser`;
- comprobación de `brand.clerk_user_id`;
- cuota 20;
- `listMetadataForBrand` sin `content` en su retorno;
- `getForBrand`, `getActiveForBrand`, `create`, `activate`, `deactivate`, `remove`;
- `getActiveForBrand` falla ante múltiples activos;
- `activate` desactiva todos los activos dentro de la mutación.

- [ ] **Step 2: Ejecutar y confirmar fallo**

Run: `npx vitest run convex/__tests__/context-documents-contract.test.ts`

Expected: FAIL.

- [ ] **Step 3: Instalar harness local y escribir pruebas ejecutables fallidas**

Instalar `convex-test` como dependencia de desarrollo. Crear pruebas con identidad simulada que cubran creación válida, sesión ausente, identidad cruzada, cuota 21, exclusividad, dos activaciones concurrentes, activación frente a eliminación y desactivación obsoleta. Estas pruebas deben usar el esquema y funciones locales en memoria; no pueden leer variables de deployment ni conectarse a red.

Run: `npx vitest run convex/__tests__/context-documents.test.ts`

Expected: FAIL porque tabla y funciones aún no existen.

- [ ] **Step 4: Añadir tabla y funciones**

Implementar la tabla exacta de la spec. Cada handler recibe `brand_id` y `clerk_user_id`, llama `requireSameUser`, carga `brand_dna` y compara propietario.

`activate` debe:

```ts
const activeRows = await ctx.db
  .query('brand_context_documents')
  .withIndex('by_brand_active', q => q.eq('brand_id', args.brand_id).eq('is_active', true))
  .collect()
for (const row of activeRows) await ctx.db.patch(row._id, { is_active: false })
await ctx.db.patch(target._id, { is_active: true })
```

`deactivate` solo desactiva el ID solicitado si sigue activo; una petición obsoleta no toca otro documento. Todas las funciones registradas deben declarar validadores `args` y `returns`.

- [ ] **Step 5: Registrar el módulo en tipos generados locales**

Añadir `import type * as contextDocuments from "../contextDocuments.js";` y la entrada correspondiente en `fullApi` dentro de `convex/_generated/api.d.ts`. No ejecutar codegen conectado.

- [ ] **Step 6: Ejecutar contrato, pruebas ejecutables y TypeScript dirigido**

Run: `npx vitest run convex/__tests__/context-documents-contract.test.ts convex/__tests__/context-documents.test.ts src/lib/__tests__/context-documents.test.ts`

Expected: PASS.

### Task 3: Ciclo de vida del Brand Kit

**Files:**
- Modify: `convex/brands.ts`
- Modify: `src/app/brand-kit/page.tsx`
- Create: `src/app/actions/context-documents.ts`
- Modify: `convex/__tests__/context-documents-contract.test.ts`
- Modify: `convex/__tests__/context-documents.test.ts`

- [ ] **Step 1: Ampliar test fallido**

Exigir que `deleteBrandDNA` consulte por `by_brand` y borre los documentos antes del kit. Exigir una mutación autenticada `cloneForBrand` que copie todos los documentos al nuevo `brand_id` y mantenga el único activo. Exigir también que el flujo admin `cloneBrandDNAToUser` clone la colección. Añadir una prueba ejecutable del flujo usado por la interfaz y verificar la propiedad de los kits origen y destino.

- [ ] **Step 2: Ejecutar y confirmar fallo**

Run: `npx vitest run convex/__tests__/context-documents-contract.test.ts`

- [ ] **Step 3: Implementar cascada y clonación**

Mantener intactos los comportamientos actuales de `brands.ts`. No modificar migraciones ajenas. `claimOrphanedBrandKits` no requiere parche porque la propiedad se deriva de `brand_dna`.

El flujo real de duplicación en `src/app/brand-kit/page.tsx` crea primero el kit destino con `create-empty` y luego copia los datos. Tras crear el destino, llamará a la Server Action de documentos para clonar la colección. No se usará `cloneBrandDNAToUser`, reservado al admin.

Crear aquí `src/app/actions/context-documents.ts` con la fachada autenticada necesaria para `cloneForBrand`; Task 7 ampliará el mismo archivo con el resto de operaciones.

- [ ] **Step 4: Ejecutar tests**

Run: `npx vitest run convex/__tests__/context-documents-contract.test.ts convex/__tests__/context-documents.test.ts`

Expected: PASS.

### Task 4: Constructor seguro del bloque de contexto

**Files:**
- Create: `src/lib/prompts/context-document.ts`
- Create: `src/lib/prompts/__tests__/context-document.test.ts`
- Modify: `src/lib/prompts/intents/parser.ts`
- Modify: `src/lib/prompts/carousel.ts`

- [ ] **Step 1: Escribir tests fallidos**

Casos:

- `null` devuelve cadena vacía;
- `business_overview` y documento aparecen en bloques diferenciados;
- `<`, `>` y `&` del documento se serializan como escapes Unicode;
- un contenido con `</context_document>` no cierra la envoltura;
- el bloque contiene precedencia, antiinyección y longitud;
- un marcador canario aparece solo en el prompt analítico y no en constructores visuales.

- [ ] **Step 2: Ejecutar y confirmar fallo**

Run: `npx vitest run src/lib/prompts/__tests__/context-document.test.ts`

- [ ] **Step 3: Implementar builder e integración opcional**

Crear `buildContextDocumentPromptBlock(document)` con JSON escapado y añadir un argumento opcional independiente a `buildIntentParserPrompt` y al constructor de descomposición de Carrusel. `business_overview` debe seguir entrando por `buildBrandContextBlock`.

- [ ] **Step 4: Ejecutar snapshots y tests relacionados**

Run: `npx vitest run src/lib/prompts/__tests__/context-document.test.ts src/lib/prompts/intents/__tests__ src/lib/prompts/carousel/builder/__tests__`

Expected: PASS sin cambios cuando el documento es `null`.

---

## Chunk 2: Acciones, interfaz y estado coherente

### Task 5: Firma de análisis pura y persistible

**Files:**
- Create: `src/lib/context-analysis-signature.ts`
- Create: `src/lib/__tests__/context-analysis-signature.test.ts`
- Modify: `convex/work_sessions.ts`
- Modify: `src/components/studio/carousel/CarouselControlsPanel.types.ts`

- [ ] **Step 1: Escribir tests fallidos**

Cubrir:

```ts
expect(signaturesMatch({ brandId: 'A', contextDocumentId: null }, { brandId: 'B', contextDocumentId: null })).toBe(false)
expect(resolveLegacySignature({ persisted: null, current: { brandId: 'A', contextDocumentId: null } }).requiresReanalysis).toBe(false)
expect(resolveLegacySignature({ persisted: null, current: { brandId: 'A', contextDocumentId: 'doc' } }).requiresReanalysis).toBe(true)
expect(updateContextLatch(true, matchingSignature)).toBe(true)
```

Incluir A→B→A, documento eliminado y cambio durante una respuesta.

- [ ] **Step 2: Ejecutar y confirmar fallo**

Run: `npx vitest run src/lib/__tests__/context-analysis-signature.test.ts`

Expected: FAIL porque el módulo no existe.

- [ ] **Step 3: Implementar helpers mínimos**

Exportar comparación de firma, resolución heredada y latch que solo se limpia tras análisis satisfactorio con comparación final coincidente.

- [ ] **Step 4: Preservar firma en tipos y snapshots saneados**

Añadir `usedBrandId`, `usedContextDocumentId` y `contextChangedSinceAnalysis` a `CarouselWorkspaceSnapshot` en `CarouselControlsPanel.types.ts` y a los saneadores de Imagen y Carrusel en `convex/work_sessions.ts`.

- [ ] **Step 5: Ejecutar tests**

Run: `npx vitest run src/lib/__tests__/context-analysis-signature.test.ts convex/__tests__/work_sessions-content-library-contract.test.ts`

Expected: PASS.

### Task 6: Resolver contexto autenticado en acciones analíticas

**Files:**
- Modify: `src/app/actions/parse-intent.ts`
- Modify: `src/app/actions/generate-carousel.ts`
- Create: `src/app/actions/__tests__/context-document-analysis-contract.test.ts`
- Create: `src/app/actions/__tests__/context-document-log-redaction.test.ts`

- [ ] **Step 1: Escribir tests/contratos fallidos**

Exigir que ambas acciones:

- reciben `brandId`;
- llaman `auth()` y rechazan sesión ausente;
- usan `authedFetchQuery(api.contextDocuments.getActiveForBrand, ...)` antes del modelo;
- devuelven `usedBrandId` y `usedContextDocumentId`;
- no registran el prompt completo.

Para `parseLazyIntentAction`, cubrir `expectedBrandId` y `expectedContextDocumentId`: cualquier discrepancia aborta antes del modelo.

Exigir que `auth()` y `getActiveForBrand` ocurren antes de `detectLanguageWithApi` y cualquier otra llamada externa. Sesión ausente, token transitorio o fallo de consulta deben dejar en cero las llamadas de detección y modelo.

Usar un marcador canario para demostrar que `log.debug`, `log.error`, eventos económicos, datos de debug y errores devueltos no contienen texto del documento ni fragmentos de respuestas del modelo derivados de él.

- [ ] **Step 2: Ejecutar y confirmar fallo**

Run: `npx vitest run src/app/actions/__tests__/context-document-analysis-contract.test.ts src/app/actions/__tests__/context-document-log-redaction.test.ts`

Expected: FAIL por ausencia de firma, orden de autenticación y redacción.

- [ ] **Step 3: Implementar carga y firma en Imagen**

Resolver Brand Kit y documento con identidad de servidor antes de detectar idioma. Pasar el bloque al parser. Incluir firma usada en el resultado. El evento económico solo incluye IDs/longitudes. Eliminar o sustituir `jsonResponse.substring(...)` por forma estructural sin contenido.

- [ ] **Step 4: Implementar carga y firma en Carrusel**

Resolver antes de la primera llamada, pasar el bloque a la descomposición y devolver firma. No introducir el texto bruto en builders visuales. Redactar cualquier preview o fragmento de respuesta registrado actualmente.

- [ ] **Step 5: Ejecutar tests dirigidos**

Run: `npx vitest run src/app/actions src/lib/prompts/__tests__/context-document.test.ts`

Expected: PASS.

### Task 7: Hook reactivo y componentes compartidos

**Files:**
- Modify: `src/app/actions/context-documents.ts`
- Create: `src/hooks/useBrandContextDocuments.ts`
- Create: `src/components/context-documents/ContextDocumentViewerDialog.tsx`
- Create: `src/components/context-documents/ContextDocumentSelectorDialog.tsx`
- Create: `src/components/context-documents/ContextDocumentAnalysisControl.tsx`
- Create: `src/components/context-documents/__tests__/context-documents-ui.test.ts`

- [ ] **Step 1: Escribir contratos fallidos de UI**

Exigir:

- `FileText` desde `lucide-react`;
- `Button variant="ghost"` y `Tooltip`;
- `aria-label` activo, inactivo y sin Brand Kit;
- punto de estado acompañado por texto accesible;
- selector con activar, dejar de usar y ver;
- viewer con «Analizar documento» desactivado y «Próximamente»;
- bloqueo de acciones durante mutaciones;
- ausencia de clases de color hardcodeadas.

Crear además pruebas ejecutables de componentes con Testing Library para navegación por teclado, acciones bloqueadas durante mutación, error visible y viewer invalidado por eliminación concurrente. Si Testing Library no está instalada, añadirla como dependencia de desarrollo junto a `jsdom` y documentar el cambio de lockfile.

- [ ] **Step 2: Implementar Server Actions autenticadas**

Cada acción llama primero `auth()`, rechaza sesión ausente y usa `authedFetchQuery`/`authedFetchMutation`. Las mutaciones de crear, activar, desactivar, eliminar y clonar pasan exclusivamente por estas acciones. La lectura reactiva de metadatos puede seguir usando `useQuery` directo porque Convex valida identidad en servidor; la lectura puntual de contenido pasa por la acción autenticada.

- [ ] **Step 3: Implementar hook**

El hook usa `useUser` y `useQuery(api.contextDocuments.listMetadataForBrand, ...)` para la suscripción. Invoca las Server Actions para mutaciones. Devuelve `activeDocument`, estados de carga/error y acciones serializadas. Tras conflicto conserva el modal y confía en la suscripción como fuente de verdad.

- [ ] **Step 4: Implementar viewer, selector e indicador**

Reutilizar `Dialog`, `Tooltip`, `Button`, `ScrollArea` y tokens semánticos. El viewer solicita contenido con `getForBrand` solo al abrir un documento. No duplicar lógica entre Imagen y Carrusel.

- [ ] **Step 5: Ejecutar tests**

Run: `npx vitest run src/components/context-documents/__tests__/context-documents-ui.test.ts`

Expected: PASS.

### Task 8: Gestión completa en Brand Kit

**Files:**
- Create: `src/components/context-documents/ContextDocumentsManager.tsx`
- Modify: `src/components/brand-dna/BrandDNABoard.tsx`
- Modify: `src/components/context-documents/__tests__/context-documents-ui.test.ts`

- [ ] **Step 1: Ampliar tests fallidos**

Exigir editor/importación, contador, cuota, estados vacío/carga/error, creación inactiva, visualización, activación, desactivación, confirmación de borrado y botón futuro desactivado.

- [ ] **Step 2: Implementar gestor modular**

Insertarlo inmediatamente después de `BrandContextCard`. Usar `Input`, `Textarea`, `Dialog`, `AlertDialog`, `Button` variants y el viewer compartido. No modificar `BrandContextCard` ni mezclar el contenido con `business_overview`.

- [ ] **Step 3: Ejecutar tests**

Run: `npx vitest run src/components/context-documents/__tests__/context-documents-ui.test.ts src/components/brand-dna/__tests__`

Expected: PASS.

### Task 9: Cableado de Imagen, Carrusel y sesiones

**Files:**
- Modify: `src/app/image/page.tsx`
- Modify: `src/app/carousel/page.tsx`
- Modify: `src/components/studio/ControlsPanel.tsx`
- Modify: `src/components/studio/carousel/CarouselControlsPanel.tsx`
- Modify: `src/components/studio/carousel/CarouselControlsPanel.types.ts`
- Modify: existing tests under `src/app/image/__tests__`, `src/app/carousel/__tests__`, `src/components/studio/__tests__`.

- [ ] **Step 1: Escribir tests fallidos de firma y ubicación**

Exigir `ContextDocumentAnalysisControl` dentro de `SectionHeader.extra` en ambos paneles. Cubrir cambio A→B con `null→null`, cambio durante respuesta de Imagen, cambio entre las dos fases de Carrusel y durante la segunda fase.

- [ ] **Step 2: Cablear Imagen**

Obtener firma actual desde el hook en `page.tsx`. Pasar `brandId` al análisis. Antes de aplicar campos, comparar la firma devuelta con refs actuales; ante discrepancia descartar. Persistir firma/latch en `ImageWorkspaceSnapshot`. Bloquear generación cuando el latch esté activo.

- [ ] **Step 3: Cablear Carrusel**

Resolver firma en la primera acción, comprobar antes de la segunda, pasar firma esperada, volver a comprobar después y solo entonces limpiar `needsReanalysis`. Persistir firma/latch en `CarouselWorkspaceSnapshot`.

- [ ] **Step 4: Insertar el control compartido**

Usar `extra={<ContextDocumentAnalysisControl ... />}` en los dos `SectionHeader`. El cambio desde el selector activa el latch si ya existía un análisis.

- [ ] **Step 5: Ejecutar tests dirigidos**

Run: `npx vitest run src/app/image/__tests__ src/app/carousel/__tests__ src/components/studio/__tests__ src/lib/__tests__/context-analysis-signature.test.ts`

Expected: PASS.

### Task 10: Internacionalización y documentación

**Files:**
- Modify: `src/locales/es-ES/brandKit.json`
- Modify: `src/locales/en-US/brandKit.json`
- Modify: `src/locales/es-ES/image.json`
- Modify: `src/locales/en-US/image.json`
- Modify: `src/locales/es-ES/carousel.json`
- Modify: `src/locales/en-US/carousel.json`
- Modify: `docs/TECHNICAL_REFERENCE.md`

- [ ] **Step 1: Añadir todas las claves ES/EN**

Incluir títulos, descripciones, validaciones, estados, tooltips, errores, confirmaciones, «Próximamente» y estados de reanálisis. No dejar `defaultValue` como única fuente del texto nuevo.

- [ ] **Step 2: Documentar la decisión transversal**

Añadir tabla, límites, formatos, exclusividad, firma, puntos de inyección y restricción de deployment Convex a `docs/TECHNICAL_REFERENCE.md`.

- [ ] **Step 3: Validar JSON y mojibake**

Run: `npx vitest run src/locales`

Run: `rg -n "Ã|Â|�" src docs/TECHNICAL_REFERENCE.md`

Expected: sin errores nuevos ni caracteres corruptos.

### Task 11: Verificación local sin despliegue

**Files:** todos los anteriores.

- [ ] **Step 1: Ejecutar suite focalizada**

Run: `npx vitest run src/lib/__tests__/context-documents.test.ts src/lib/__tests__/context-analysis-signature.test.ts src/lib/prompts/__tests__/context-document.test.ts convex/__tests__/context-documents-contract.test.ts src/components/context-documents/__tests__/context-documents-ui.test.ts`

- [ ] **Step 2: Ejecutar tests relacionados**

Run: `npx vitest run src/app/image/__tests__ src/app/carousel/__tests__ src/components/studio/__tests__ convex/__tests__`

Run: `npx vitest run src/app/actions/__tests__/context-document-analysis-contract.test.ts src/app/actions/__tests__/context-document-log-redaction.test.ts`

- [ ] **Step 3: Medir cobertura de módulos críticos**

Instalar `@vitest/coverage-v8` si no está presente y ejecutar:

Run: `npx vitest run --coverage src/lib/__tests__/context-documents.test.ts src/lib/__tests__/context-analysis-signature.test.ts src/lib/prompts/__tests__/context-document.test.ts convex/__tests__/context-documents.test.ts src/app/actions/__tests__/context-document-analysis-contract.test.ts src/app/actions/__tests__/context-document-log-redaction.test.ts`

Expected: las rutas críticas nuevas aparecen instrumentadas; cualquier rama de autorización, límite o firma sin cubrir se completa antes de seguir.

- [ ] **Step 4: Comprobar TypeScript y lint del alcance**

Run: `npx tsc --noEmit`

Run: `npx eslint convex/contextDocuments.ts src/lib/context-documents.ts src/lib/context-analysis-signature.ts src/lib/prompts/context-document.ts src/hooks/useBrandContextDocuments.ts src/components/context-documents src/app/actions/parse-intent.ts src/app/actions/generate-carousel.ts src/app/image/page.tsx src/app/carousel/page.tsx src/components/studio/ControlsPanel.tsx src/components/studio/carousel/CarouselControlsPanel.tsx src/components/brand-dna/BrandDNABoard.tsx`

- [ ] **Step 5: Compilar Next localmente**

Confirmar en `package.json` que `build` ejecuta solo `next build` y no invoca Convex. Después:

Run: `npm run build`

Expected: build completo con exit 0 y sin publicación Convex.

- [ ] **Step 6: Verificar diff y ausencia de secretos/contenido en logs**

Run: `git diff --check`

Run: `rg -n "console\.(log|warn|error)|substring\(|slice\(0, ?500|fullPrompt|jsonResponse" convex/contextDocuments.ts src/lib/prompts/context-document.ts src/app/actions/parse-intent.ts src/app/actions/generate-carousel.ts`

Run: `npx vitest run src/app/actions/__tests__/context-document-log-redaction.test.ts`

- [ ] **Step 7: Detenerse ante la frontera Convex**

No arrancar app ni navegador porque los scripts de desarrollo publican el esquema en el Convex real. Informar a Juanfran de la verificación local disponible y solicitar autorización específica para ejecutar el despliegue Convex y la validación visual integrada.

No hacer commit: la regla del proyecto exige validación funcional previa de Juanfran.
