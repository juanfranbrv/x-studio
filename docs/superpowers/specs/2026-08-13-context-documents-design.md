# Documentos de contexto por Brand Kit

**Fecha:** 2026-08-13
**Estado:** Diseño aprobado por Juanfran
**Ámbito:** Brand Kit, Imagen y Carrusel

## Objetivo

Permitir que cada Brand Kit almacene varios documentos de contexto empresarial y que, como máximo, uno esté activo. El documento activo debe ampliar el contexto usado al analizar publicaciones en Imagen y Carrusel sin incorporarse íntegramente a los prompts finales de generación visual.

La funcionalidad debe coexistir con el campo actual «Visión y contexto de marca». Ese campo continúa siendo el resumen base del Brand Kit; los documentos aportan contexto ampliado y seleccionable.

## Decisiones aprobadas

- Un Brand Kit puede tener cero o varios documentos de contexto.
- Como máximo puede haber un documento activo por Brand Kit.
- Puede no haber ningún documento activo.
- Se permiten alta, importación, consulta, activación, desactivación y eliminación.
- No se incluye edición después del alta en esta primera versión.
- El alta admite escritura o pegado directo e importación de `.md` y `.txt`.
- El límite por documento es de 12.000 caracteres.
- Cada Brand Kit puede almacenar como máximo 20 documentos en esta primera versión.
- Los documentos nuevos se guardan inactivos.
- El documento activo se usa al analizar publicaciones en Imagen y Carrusel.
- No se inyecta íntegramente en el prompt final del generador de imágenes.
- «Analizar documento» aparece desactivado y marcado como función futura.
- Imagen y Carrusel muestran un indicador sutil en «¿Qué quieres crear?» y permiten cambiar el documento activo desde un modal compartido.

## Alcance excluido

- Análisis del propio documento y generación de recomendaciones.
- Resúmenes automáticos mediante IA.
- Edición de un documento ya guardado.
- Versionado o historial de cambios.
- Adjuntos distintos de texto Markdown o texto plano.
- Contextos simultáneos o combinación de varios documentos activos.
- Uso directo del documento en generación visual, campañas, vídeo, Replace o «Inspírame».

## Modelo de datos

Se añadirá una tabla independiente `brand_context_documents` en Convex. Separarla de `brand_dna` mantiene la relación uno-a-muchos, evita inflar todas las lecturas del Brand Kit y permite gestionar activación y ciclo de vida sin convertir `brand_dna` en un documento monolítico.

Campos previstos:

| Campo | Tipo | Regla |
|---|---|---|
| `brand_id` | `Id<"brand_dna">` | Brand Kit propietario |
| `title` | `string` | Obligatorio, 1-100 caracteres tras normalizar espacios |
| `content` | `string` | Obligatorio, 1-12.000 puntos de código Unicode |
| `source_filename` | `string?` | Nombre original saneado, máximo 255 caracteres |
| `is_active` | `boolean` | Solo uno puede ser `true` por Brand Kit |
| `created_at` | `string` | ISO 8601 |

Índices:

- `by_brand`: `brand_id`.
- `by_brand_active`: `brand_id`, `is_active`.

La tabla no duplicará `owner_id`. La propiedad se deriva siempre de `brand_dna.clerk_user_id`, evitando que dos campos de propietario puedan divergir en clonaciones o migraciones.

### Invariantes

1. Toda query y mutación verifica que el Brand Kit pertenece al usuario autenticado.
2. La activación se realiza en una única mutación: consulta todos los activos por `by_brand_active`, desactiva cualquier activo previo y activa el seleccionado.
3. `getActiveForBrand` falla de forma explícita si detecta más de un activo; nunca elige uno mediante `.first()`.
4. La desactivación afecta solo al documento activo indicado.
5. Eliminar el activo deja el Brand Kit sin documento activo; no se activa otro automáticamente.
6. Eliminar un Brand Kit elimina primero todos sus documentos de contexto.
7. No se confía en límites o tipos validados únicamente por la interfaz.
8. No se pueden crear más de 20 documentos por Brand Kit.

## Operaciones de servidor

La API Convex del dominio ofrecerá operaciones acotadas:

- `listMetadataForBrand`: lista solo ID, título, origen, tamaño, estado y fecha de creación. El máximo de 20 registros hace innecesaria la paginación en esta versión.
- `getForBrand`: recupera el contenido completo de un documento concreto para la vista autenticada.
- `getActiveForBrand`: devuelve el documento activo o `null` para acciones de análisis autenticadas.
- `create`: valida título, contenido y pertenencia; siempre crea con `is_active: false`.
- `activate`: garantiza exclusividad dentro de una única mutación.
- `deactivate`: deja el Brand Kit sin documento activo.
- `remove`: elimina un documento del propietario.

No existirá una mutación de actualización en esta versión.

Las Server Actions de gestión usarán `auth()` para exigir una sesión Clerk y `authedFetchQuery`/`authedFetchMutation` de `src/lib/convex-server.ts` para adjuntar el JWT de la plantilla `convex`. Las funciones Convex usarán `requireSameUser` y comprobarán que `brand_dna.clerk_user_id` coincide con la identidad. Si falta sesión o el token es transitorio, no se invoca ningún modelo ni se degrada a una consulta anónima.

### Borrado, duplicación y migración

- `brands.deleteBrandDNA` ejecutará la cascada en la misma mutación antes de eliminar `brand_dna`.
- `brands.cloneBrandDNAToUser` copiará también los documentos y conservará cuál estaba activo, porque el clon debe representar el Brand Kit completo.
- Los flujos de duplicación de Brand Kit reutilizarán esa misma regla.
- `claimOrphanedBrandKits` mantiene el mismo `brand_id`; al derivarse la propiedad desde `brand_dna`, los documentos quedan asociados al propietario reclamado sin parches independientes.
- Cualquier flujo futuro que transfiera o clone un Brand Kit deberá tratar sus documentos como parte del agregado.

## Gestión en Brand Kit

Debajo de «Visión y contexto de marca» aparecerá una sección «Documentos de contexto».

Cada fila mostrará:

- título;
- nombre de archivo de origen, si existe;
- número de caracteres;
- fecha de creación;
- estado activo o inactivo;
- acciones para ver, activar o desactivar y eliminar.

### Alta e importación

Un diálogo compartirá los dos métodos de entrada:

- editor para escritura o pegado;
- selector de archivos `.md` y `.txt`.

La importación aceptará extensiones `.md` y `.txt` sin distinguir mayúsculas. Rechazará archivos mayores de 64 KiB antes de decodificar y usará `TextDecoder('utf-8', { fatal: true })`. Eliminará un BOM inicial, rellenará el título a partir del nombre sin extensión y copiará el contenido al editor. El usuario podrá revisarlo antes de guardar.

El diálogo mostrará un contador `actual / 12.000`. El conteo común será por puntos de código Unicode mediante `Array.from(content).length`, no por bytes ni unidades UTF-16. La validación usará `trim()` solo para decidir si título o contenido están vacíos; no alterará el cuerpo guardado. Guardar permanecerá deshabilitado con título vacío, contenido vacío, título mayor de 100 caracteres, contenido por encima del límite o cuota de 20 documentos agotada. El servidor repetirá estas validaciones.

### Consulta

La vista del documento será de solo lectura y usará texto preformateado con ajuste de línea. No interpretará HTML ni ejecutará contenido. No es necesario renderizar Markdown enriquecido en esta primera versión.

El diálogo incluirá «Analizar documento» desactivado y la indicación «Próximamente». No existirá endpoint ni lógica oculta para esa función.

### Eliminación

La eliminación requerirá confirmación explícita. El mensaje diferenciará si el documento está activo y explicará que el Brand Kit quedará sin contexto ampliado.

## Indicador y selector rápido en Imagen y Carrusel

La tarjeta «¿Qué quieres crear?» ya usa `SectionHeader`, que admite el slot `extra`. El indicador se colocará en ese slot para conservar la jerarquía y no reducir el área útil del textarea.

El control será un `Button` con variante `ghost`, tamaño compacto e icono `FileText` de `lucide-react`:

- con documento activo: icono acompañado de un punto de estado semántico;
- sin documento activo: estado neutro, sin punto;
- tooltip activo: `Este análisis usará: {título}`;
- tooltip inactivo: `Sin documento de contexto`;
- `aria-label` equivalente al tooltip.

No se usarán colores hardcodeados ni estilos que sustituyan los variants de shadcn. El patrón debe reutilizar dimensiones, tokens, foco y transiciones del panel existente.

Al pulsar el indicador se abrirá un modal compartido por Imagen y Carrusel. El modal permitirá:

- listar los documentos del Brand Kit activo;
- identificar el documento activo;
- activar uno inactivo;
- dejar de usar el activo;
- abrir un documento en modo lectura.

El modal rápido no permitirá crear ni eliminar documentos. Esas operaciones pertenecen a la gestión completa del Brand Kit.

Estados del indicador y el modal:

- sin Brand Kit seleccionado: indicador deshabilitado con tooltip específico;
- cargando documentos: icono y lista en estado de carga, sin acciones repetibles;
- Brand Kit sin documentos: estado vacío con explicación breve;
- documentos pero ninguno activo: indicador neutro y opción de activar;
- error de suscripción o mutación: mensaje visible y reconsulta de metadatos;
- documento eliminado mientras está abierto: cerrar la vista de contenido, mantener el selector abierto y refrescar la lista;
- mutación en curso: bloquear activar, desactivar y repetir la misma acción hasta recibir el estado confirmado.

## Estado de análisis y cambio de contexto

El Brand Kit y el documento activo forman una firma indivisible `{ brandId, contextDocumentId }`. Cada resultado y snapshot de sesión persistirá `usedBrandId`, `usedContextDocumentId` y `contextChangedSinceAnalysis`. Comparar solo el documento no es suficiente porque dos Brand Kits distintos pueden carecer de documento activo o tener IDs diferentes bajo estados transitorios.

- Antes del primer análisis, cambiar la selección solo actualiza el contexto que se usará.
- Después de un análisis, activar o desactivar un documento marca `contextChangedSinceAnalysis: true`. Este latch no vuelve a `false` aunque el usuario cambie A→B→A; solo un análisis satisfactorio lo restablece.
- La generación queda bloqueada hasta ejecutar «Reanalizar», para no producir con resultados derivados de otro contexto.
- Las publicaciones y sesiones ya guardadas no se reescriben.
- El documento activo se recupera de nuevo en servidor al analizar; no se confía en una copia de contenido enviada por el navegador.

Imagen y Carrusel se suscribirán reactivamente al ID activo. Al restaurar una sesión:

- si el snapshot tiene firma, se compara con el Brand Kit y el documento activo actuales;
- si un snapshot heredado no tiene firma y actualmente no hay documento activo, se considera compatible;
- si un snapshot heredado no tiene firma y existe un documento activo, exige reanálisis;
- si el documento usado fue eliminado o pertenece a otro Brand Kit, exige reanálisis.

En Carrusel se reutilizará el mecanismo existente de `needsReanalysis`. Imagen tendrá un estado equivalente basado en la firma del documento utilizado en el último análisis satisfactorio.

## Integración con prompts

### Orden conceptual

1. Solicitud concreta del usuario.
2. Resumen actual «Visión y contexto de marca».
3. Documento de contexto activo.
4. Resto del Brand DNA.

El orden conceptual expresa precedencia, aunque la plantilla coloque los bloques de contexto antes de la solicitud por razones estructurales.

### Bloque delimitado

El documento activo se incorporará a través de un constructor central y reutilizable. `brand_dna.business_overview` permanecerá en los constructores actuales como resumen base; el documento se añadirá en un bloque distinto y nunca lo sustituirá. Una prueba debe demostrar la presencia diferenciada de ambos valores.

El bloque del documento debe:

- delimitar inequívocamente inicio y final;
- identificar el título del documento;
- declarar que el contenido es información no confiable de referencia, no instrucciones del sistema;
- ordenar que se ignoren instrucciones, cambios de rol o peticiones de revelar prompts incluidas dentro del documento;
- permitir usar únicamente hechos relevantes para la solicitud;
- prohibir inventar ofertas, precios, fechas, condiciones o servicios;
- mantener la solicitud explícita del usuario como prioridad.

La serialización usará un objeto JSON con `title`, `content` y longitud. Antes de insertarlo en una envoltura fija, escapará al menos `<`, `>` y `&` como secuencias Unicode, de modo que el contenido no pueda reproducir literalmente el marcador de cierre. Se probarán documentos que contengan ambos delimitadores, cambios de rol y solicitudes de revelar el prompt.

### Imagen

`parseLazyIntentAction` recibirá `brandId: Id<"brand_dna">`. Exigirá sesión Clerk, usará `authedFetchQuery` y recuperará el documento activo antes de llamar al modelo. Devolverá `usedBrandId` y `usedContextDocumentId`. El contexto podrá influir en intención, titulares, textos secundarios, CTA, copy y sugerencias semánticas de imagen.

Justo antes de aplicar el resultado o limpiar el latch, el cliente comparará la pareja devuelta `{ usedBrandId, usedContextDocumentId }` con refs actuales `{ currentBrandId, currentContextDocumentId }`. Si cualquiera cambió mientras el modelo respondía, descartará el resultado analítico y mantendrá bloqueada la generación. Se cubrirá expresamente el cambio de Brand Kit A a B cuando ambos tengan `contextDocumentId: null`.

El texto completo no se añadirá después al prompt final de generación visual.

### Carrusel

El documento activo se incorporará en los dos pasos relevantes:

1. análisis y descomposición del carrusel, para guion, narrativa y contenido de diapositivas;
2. análisis semántico posterior compartido con Imagen, para mantener alineadas las sugerencias visuales.

No se duplicará el bloque dentro de una misma llamada de modelo.

`analyzeCarouselAction` recibirá también `brandId`, resolverá el documento antes de la primera llamada de modelo y devolverá `usedBrandId` y `usedContextDocumentId`. Antes de invocar `parseLazyIntentAction`, el cliente comprobará que la firma activa sigue siendo la misma y pasará ambos valores como firma esperada. La segunda acción verificará en servidor que el Brand Kit y el documento siguen siendo los esperados, que el documento existe, pertenece al kit y continúa activo; devolverá de nuevo ambos valores usados. Si alguna condición cambió, abortará antes de la segunda llamada de modelo y exigirá reanálisis.

Al finalizar la segunda llamada y justo antes de aplicar resultados o limpiar `contextChangedSinceAnalysis`, el cliente repetirá la comparación completa contra refs actuales. Un cambio ocurrido durante esa segunda llamada descarta el resultado y conserva el latch. Así nunca se mezcla el documento A en el guion con el documento B en las sugerencias visuales ni se acepta un análisis perteneciente a otro Brand Kit.

### Ausencia o fallo

- Sin documento activo y con consulta correcta, los prompts deben conservar snapshots dorados equivalentes a los actuales. La consulta adicional puede añadir latencia y su fallo operativo detiene el análisis por diseño.
- Si la consulta autenticada confirma que no existe documento activo, el análisis continúa normalmente.
- Si el servidor no puede resolver la consulta por un error operativo, el análisis se detiene antes de consumir generación y muestra un error visible.
- En Carrusel el contexto se resuelve antes de la primera llamada. Si cambia durante esa llamada, puede haberse consumido ese primer análisis, pero se aborta el segundo y no se permite generar; no se promete consumo cero frente a cambios concurrentes ocurridos durante una llamada ya iniciada.

## Seguridad

- Todas las operaciones exigen sesión autenticada y verifican propietario del Brand Kit y del documento.
- Nunca se acepta una identidad efectiva desde el cliente sin contrastarla con la sesión y `brand_dna.clerk_user_id`.
- Un usuario no puede listar, consultar, activar, desactivar ni eliminar documentos de otro usuario.
- El contenido se trata como entrada no confiable tanto en interfaz como dentro del prompt.
- Los logs pueden registrar identificadores, tamaños y estados, pero nunca el contenido completo del documento.
- Los logs nuevos usarán `src/lib/logger.ts`.
- Ningún helper de IA, traza, modal de debug, error o evento económico registrará el prompt analítico completo cuando contenga el documento. Solo se registrarán IDs, longitudes y fases.

## Errores de interfaz

Se contemplan mensajes localizados para:

- extensión incompatible;
- archivo vacío;
- archivo mayor de 64 KiB;
- archivo que no puede leerse como texto;
- límite de 12.000 caracteres superado;
- título obligatorio o demasiado largo;
- documento eliminado o cambiado desde otra sesión;
- fallo de activación o desactivación;
- fallo de eliminación;
- imposibilidad de recuperar el contexto antes del análisis.

Tras operaciones concurrentes, la interfaz volverá a consultar la lista y mostrará el estado confirmado por servidor.

## Internacionalización y accesibilidad

- Todo texto nuevo se añadirá a los namespaces `brandKit`, `image` y `carousel` en `es-ES` y `en-US`.
- El selector rápido compartirá claves cuando el texto sea idéntico.
- Diálogos, confirmaciones, tooltips, botones y estados tendrán nombres accesibles.
- La lista del selector será operable con teclado.
- El punto de estado no será la única señal: tooltip, `aria-label` y estado textual dentro del modal comunicarán la selección.
- Se respetará `prefers-reduced-motion` en cualquier transición añadida.

## Estrategia de pruebas

### Datos y autorización

- crear un documento válido;
- rechazar título vacío, contenido vacío y límites excedidos;
- crear siempre inactivo;
- aceptar exactamente 8.553 y 12.000 puntos de código y rechazar 12.001;
- aceptar extensiones en mayúsculas y rechazar UTF-8 inválido, BOM problemático, título mayor de 100 y contenido compuesto solo por espacios;
- rechazar el documento número 21;
- activar uno y desactivar el anterior;
- desactivar el activo;
- eliminar el activo sin activar otro;
- impedir operaciones cruzadas entre usuarios, identidad ausente e identidad de cliente falsificada, comprobando que no se invoca ningún modelo;
- eliminar documentos al eliminar el Brand Kit.
- cubrir dos activaciones concurrentes, activación frente a eliminación y desactivación obsoleta desde otra pestaña.
- verificar clonación completa y conservación del activo.

### Constructores de prompt

- incluir una sola vez el documento activo en Imagen;
- incluir una sola vez por llamada en los dos análisis de Carrusel;
- conservar el comportamiento actual sin documento activo;
- delimitar contenido y reglas antiinyección;
- preservar prioridad de la solicitud del usuario;
- no incorporar el texto bruto al prompt final visual, verificado con espías sobre constructores y un marcador canario único;
- comprobar que logs, errores, auditoría y debug no contienen el marcador canario;
- mantener snapshots dorados de los prompts actuales cuando no hay activo.

### Interfaz

- alta manual e importación;
- título derivado del nombre de archivo;
- contador y validaciones;
- vista de solo lectura;
- botón futuro visible y desactivado;
- activación, desactivación y eliminación;
- indicador correcto en Imagen y Carrusel;
- selector rápido compartido;
- cambio de contexto obliga a reanalizar;
- firma persistida y restaurada, snapshots heredados, eliminación concurrente y cambio A→B→A;
- cambio de Brand Kit con firma `null→null` y cambio de documento durante la segunda llamada de Carrusel;
- navegación por teclado y etiquetas accesibles.

### Verificación final

- tests unitarios y de componentes relevantes;
- comprobación TypeScript y lint del alcance modificado;
- búsqueda anti-mojibake con `rg -n -P "\u00C3|\u00C2|\uFFFD" src`;
- navegador aislado del proyecto para validar Imagen, Carrusel y Brand Kit en desktop y mobile;
- confirmación de que no aparecen errores nuevos en consola o red.

## Restricción operativa de Convex

El único deployment Convex usado por `postlaboratory.com` es `prestigious-pigeon-784`. No existe un entorno de pruebas separado. Preparar el esquema y el código local no publica nada, pero ejecutar `npx convex dev --once` o cualquier deploy de Convex modifica el servicio real y requiere confirmación explícita de Juanfran justo antes de hacerlo.

La primera fase de implementación debe agotar tests puros, tests de componentes y validación estática antes de solicitar esa autorización.

## Documentación técnica

Al implementar la decisión se actualizará `docs/TECHNICAL_REFERENCE.md` con:

- tabla y operaciones de documentos de contexto;
- regla de exclusividad del activo;
- puntos exactos de inyección en Imagen y Carrusel;
- comportamiento de reanálisis;
- límite y formatos admitidos;
- advertencia operativa sobre el despliegue Convex.

## Criterios de aceptación

1. Un usuario puede crear documentos mediante texto o archivos `.md`/`.txt` hasta 12.000 caracteres.
2. Puede verlos, activar uno, desactivarlo y eliminarlos desde el Brand Kit.
3. Nunca hay más de un documento activo por Brand Kit.
4. Imagen y Carrusel muestran de forma sutil si el análisis usará un documento.
5. El selector rápido permite activar o dejar de usar documentos sin salir del módulo.
6. Cambiar el documento después de analizar obliga a reanalizar.
7. El documento activo influye en el análisis de Imagen y en ambos pasos analíticos de Carrusel.
8. El texto bruto del documento no llega al constructor ni a la llamada final de generación visual; solo pueden llegar datos derivados por el análisis.
9. Sin documento activo y con la consulta disponible, los prompts analíticos conservan sus snapshots actuales.
10. «Analizar documento» aparece visible y desactivado como función futura.
11. No se puede acceder ni operar sobre documentos de otro usuario.
12. El flujo funciona en desktop y mobile, en español e inglés, sin mojibake.
13. Un Brand Kit no puede superar 20 documentos y la gestión nunca carga todos sus contenidos para listar metadatos.
14. Un análisis nunca mezcla dos documentos distintos entre sus fases y ninguna generación se habilita con una firma de contexto obsoleta.
