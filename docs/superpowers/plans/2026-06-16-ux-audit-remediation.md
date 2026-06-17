# UX Audit Remediation Implementation Plan

## Estado de ejecución - 2026-06-17

- Fases 1-7 implementadas en código.
- Fases 4-6 cerradas con evidencia adicional en `outputs/`:
  - `ux-phase4-library-desktop.png`
  - `ux-phase4-library-mobile.png`
  - `ux-phase5-image-desktop.png`
  - `ux-phase5-carousel-desktop.png`
  - `ux-phase5-image-mobile-drawer.png`
  - `ux-phase6-brand-kit-desktop.png`
  - `ux-phase6-settings-desktop.png`
- Academy corregida para usar ortografía española natural con acentos en contenido local, locale ES y metadata.
- Validaciones ejecutadas:
  - `npx tsc --noEmit --pretty false` OK.
  - `rg -n "Ã|Â|�" src` sin coincidencias.
  - `npm run test -- --run src\components\library\__tests__\contentLibraryFilters.test.ts src\lib\__tests__\academy-content.test.ts` OK: 9 tests.
  - `npx eslint <archivos tocados>` sin errores, con warnings heredados.
- Navegador:
  - `/library` validado en desktop y mobile con sesión autenticada.
  - `/image` y `/carousel` validados en desktop para jerarquía de panel y ausencia de tokens técnicos visibles.
  - `/image` validado en mobile: el drawer muestra `¿Qué quieres crear?` antes que `Historial` visualmente.
  - `/brand-kit` y `/settings` validados en sesión autenticada.
- Pendiente antes de commit:
  - revisión humana de Juanfran.
  - decidir si la deuda global de lint queda fuera de esta tanda.
  - no se ha hecho commit.

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir los principales problemas detectados en la auditoría UX de `x-studio` sin rediseñar el producto ni tocar el módulo experimental `replace`.

**Architecture:** El plan prioriza correcciones verificables y acotadas: eliminar superficies técnicas visibles, sanear accesibilidad de controles, reducir ruido en mobile y compactar flujos densos. Cada fase deja una mejora usable por sí misma y bloquea el paso a la siguiente hasta tener evidencia en navegador, consola y pruebas estáticas.

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS 4, Convex, Clerk, i18next, `@hugeicons/react`, scripts CDP del proyecto, Vitest, ESLint, TypeScript.

---

## Alcance y restricciones

- No tocar `replace`; queda excluido por ser experimental.
- No hacer rediseños completos.
- No cambiar la arquitectura de generación IA.
- No crear componentes nuevos si existe un patrón reutilizable.
- Antes de tocar código en ejecución, comprobar si reaparece `DONT_TOUCH.md`.
- Consultar `docs/UI_SYSTEM_RULES.md` antes de retocar controles, toolbars o paneles.
- Si se documenta una decisión técnica transversal, actualizar `docs/TECHNICAL_REFERENCE.md`.
- No hacer commit hasta validación explícita de Juanfran.
- No usar `&&` en comandos; usar comandos separados o `;`.

## Fases y puertas de avance

Cada fase tiene una puerta verificable. No se pasa a la siguiente si la puerta no queda cumplida.

### Fase 0: Preparación y línea base

**Objetivo:** fijar evidencia inicial y confirmar que no se pisa trabajo previo.

**Archivos esperados:**
- Leer: `DONT_TOUCH.md` si existe.
- Leer: `docs/UI_SYSTEM_RULES.md`.
- Leer: `docs/TECHNICAL_REFERENCE.md`.
- No modificar código.

**Subfase 0.1: Inventario de estado**

- [ ] Ejecutar `git status --short`.
- [ ] Identificar cambios ajenos existentes.
- [ ] Confirmar que `replace` no entra en el alcance.
- [ ] Si existe `DONT_TOUCH.md`, leerlo completo.

**Subfase 0.2: Baseline visual**

- [ ] Arrancar o reutilizar app local en `http://localhost:3000`.
- [ ] Usar sesión local autenticada existente.
- [ ] Capturar desktop:
  - `/image`
  - `/carousel`
  - `/library`
  - `/brand-kit`
  - `/settings`
- [ ] Capturar mobile emulado 390×844:
  - `/image`
  - `/library`

**Puerta de avance Fase 0**

- [ ] Existen capturas baseline en `outputs/`.
- [ ] `git status --short` está documentado mentalmente antes de editar.
- [ ] Se sabe qué cambios son previos y no se tocarán.

---

### Fase 1: Eliminar exposición técnica al usuario

**Objetivo:** quitar del producto visible los rastros internos que hacen que la app parezca herramienta de desarrollo.

**Problemas cubiertos:**
- `Admin composición` visible en Carrusel.
- IDs técnicos como `basic-pyramid-stack`.
- Texto de iconos Material visible/accesible: `wand_stars`, `grid_view`, `workspace_premium`, `auto_awesome_motion`, `area_chart`, `3d_rotation`, `view_agenda`.

**Archivos probables:**
- Modificar: `src/components/studio/carousel/CarouselCanvasPanel.tsx`
- Modificar: `src/components/studio/carousel/CarouselCanvasPanel.parts.tsx`
- Modificar: `src/components/studio/CanvasPanel.tsx`
- Modificar: `src/components/studio/CanvasPanel.parts.tsx`
- Modificar: componentes que rendericen `Material Symbols` como texto.
- Revisar: `src/lib/studio-debug-visibility.ts`
- Revisar: `docs/TECHNICAL_REFERENCE.md`

**Subfase 1.1: Localizar fuentes técnicas**

- [ ] Ejecutar `rg -n "Admin composición|basic-pyramid-stack|wand_stars|grid_view|workspace_premium|auto_awesome_motion|area_chart|3d_rotation|view_agenda" src`.
- [ ] Clasificar cada aparición:
  - debug visible
  - icono Material mal aislado
  - copy técnico
  - test o prompt no visible

**Subfase 1.2: Ocultar debug de Carrusel**

- [ ] Escribir o ajustar test unitario si ya existe cobertura de debug visibility.
- [ ] Verificar fallo inicial cuando `studio_debug_overlays_enabled` esté desactivado o usuario no sea admin.
- [ ] Implementar mínimo:
  - barra `Admin composición` solo visible con flag global de debug/admin.
  - no mostrar `structure_id` técnico al usuario normal.
- [ ] Ejecutar test focalizado.

**Subfase 1.3: Sanear iconos textuales**

- [ ] Reemplazar renderizado textual de Material Symbols por componente iconográfico existente si aplica.
- [ ] Si se mantiene Material Symbols por dependencia heredada, aplicar `aria-hidden="true"` y evitar que el texto se incorpore al árbol accesible.
- [ ] Mantener `@hugeicons/react` como preferencia para iconos nuevos.

**Verificación técnica**

- [ ] `rg -n "Admin composición|basic-pyramid-stack|wand_stars|grid_view|workspace_premium|auto_awesome_motion|area_chart|3d_rotation|view_agenda" src/components src/app` no debe encontrar ocurrencias visibles no justificadas.
- [ ] En navegador, `document.body.innerText` en `/image` y `/carousel` no contiene esos tokens.
- [ ] `npm run lint -- <archivos tocados>` sin errores.
- [ ] `npx tsc --noEmit --pretty false` sin errores.

**Puerta de avance Fase 1**

- [ ] `/carousel` no muestra `Admin composición` ni IDs técnicos en usuario normal.
- [ ] `/image` y `/carousel` no filtran nombres técnicos de iconos en texto visible/accesible.
- [ ] Capturas desktop actualizadas en `outputs/`.

---

### Fase 2: Accesibilidad básica de controles críticos

**Objetivo:** que los módulos principales tengan nombres accesibles en botones e imágenes relevantes.

**Problemas cubiertos:**
- Imagen: 22 botones sin nombre accesible.
- Carrusel: 16 botones sin nombre accesible.
- Imagen: al menos 1 imagen sin `alt`.

**Archivos probables:**
- Modificar: `src/components/studio/CanvasPanel.tsx`
- Modificar: `src/components/studio/CanvasPanel.parts.tsx`
- Modificar: `src/components/studio/carousel/CarouselCanvasPanel.tsx`
- Modificar: `src/components/studio/carousel/CarouselCanvasPanel.parts.tsx`
- Modificar: `src/components/studio/shared/canvasStyles.ts`
- Modificar: `src/components/studio/TextLayersEditor.tsx`
- Modificar: `src/components/studio/PreviewEditableTextBlock.tsx`
- Revisar: `src/components/ui/button.tsx`

**Subfase 2.1: Medición base automatizada**

- [ ] Crear script temporal o usar CDP eval para medir:
  - botones sin `textContent`, `aria-label` o `title`
  - imágenes sin `alt`
  - overflow horizontal
- [ ] Guardar valores base por ruta:
  - `/image`
  - `/carousel`

**Subfase 2.2: Nombrar toolbars y botones icon-only**

- [ ] Añadir `aria-label` a botones de:
  - zoom
  - descargar
  - exportar ZIP
  - regenerar
  - música/vídeo en carrusel
  - cerrar/borrar bloque
  - navegación de slides
- [ ] Evitar labels genéricos como `Botón`.
- [ ] Usar labels funcionales y concretos.

**Subfase 2.3: Alt text de imágenes**

- [ ] Añadir `alt` a logos, previews y thumbnails cuando sean informativos.
- [ ] Usar `alt=""` solo en imágenes decorativas reales.

**Verificación técnica**

- [ ] CDP eval en `/image`:
  - `buttonsWithoutName === 0` o lista restante justificada.
  - `imgMissingAlt === 0` o lista restante justificada.
- [ ] CDP eval en `/carousel`:
  - `buttonsWithoutName === 0` o lista restante justificada.
- [ ] Tabulación manual/automatizada básica no pierde foco en toolbars principales.
- [ ] `npm run lint -- <archivos tocados>` sin errores.
- [ ] `npx tsc --noEmit --pretty false` sin errores.

**Puerta de avance Fase 2**

- [ ] No quedan botones icon-only sin nombre accesible en `/image` y `/carousel`.
- [ ] No quedan imágenes informativas sin `alt`.
- [ ] Capturas desktop y mobile actualizadas.

---

### Fase 3: Limpieza de mobile en Imagen

**Objetivo:** reducir el ruido visual y riesgo accidental en mobile sin perder edición.

**Problemas cubiertos:**
- Muchas `x` visibles permanentemente sobre el canvas.
- Acciones destructivas compiten con el contenido.
- Panel de trabajo mobile contiene texto instructivo redundante.

**Archivos probables:**
- Modificar: `src/components/studio/TextLayersEditor.tsx`
- Modificar: `src/components/studio/PreviewEditableTextBlock.tsx`
- Modificar: `src/components/studio/shared/MobileWorkPanelDrawer.tsx`
- Modificar: `src/components/studio/CanvasPanel.tsx`
- Revisar: `docs/TECHNICAL_REFERENCE.md`, sección drawer mobile y preview editable.

**Subfase 3.1: Definir estado visible de controles destructivos**

- [ ] Mantener la `x` visible solo cuando:
  - bloque seleccionado
  - modo edición activo
  - foco dentro del bloque
  - hover en desktop
- [ ] En mobile, evitar múltiples `x` simultáneas sobre bloques no activos.

**Subfase 3.2: Implementar comportamiento**

- [ ] Ajustar estado de selección/foco en los bloques editables.
- [ ] Garantizar que borrar sigue siendo posible con dedo.
- [ ] No introducir menús nuevos si una selección activa basta.

**Subfase 3.3: Reducir instrucción redundante del drawer**

- [ ] Revisar copy visible del drawer mobile.
- [ ] Eliminar o reducir textos que explican acciones evidentes.
- [ ] Mantener accesibilidad con labels y no con copy visible redundante.

**Verificación visual**

- [ ] En mobile 390×844 `/image`, al cargar:
  - no hay una pila de `x` sobre todos los textos.
  - se ve claramente el canvas.
  - el CTA inferior sigue accesible.
- [ ] Al seleccionar un texto:
  - aparece una vía clara para borrarlo.
  - no se tapa el contenido de forma incoherente.
- [ ] No hay overflow horizontal.

**Puerta de avance Fase 3**

- [ ] Captura mobile de `/image` muestra canvas limpio sin múltiples `x` simultáneas.
- [ ] La edición y borrado de un bloque sigue funcionando.
- [ ] `npm run lint -- <archivos tocados>` y `npx tsc --noEmit --pretty false` pasan.

---

### Fase 4: Biblioteca mobile compacta

**Objetivo:** que la biblioteca muestre activos antes y no se comporte como un formulario largo en mobile.

**Problemas cubiertos:**
- Filtros y acciones masivas ocupan casi toda la primera pantalla en mobile.
- Las acciones bulk aparecen aunque no haya selección.

**Archivos probables:**
- Modificar: `src/app/library/page.tsx`
- Modificar: `src/components/library/ContentAssetFilters.tsx`
- Modificar: `src/components/library/ContentAssetBulkActions.tsx`
- Modificar: `src/components/library/ContentLibraryGrid.tsx`
- Revisar: `src/locales/es-ES/library.json`
- Revisar: `src/locales/en-US/library.json`

**Subfase 4.1: Diseño funcional mobile**

- [ ] En mobile, mostrar una fila compacta:
  - búsqueda
  - botón `Filtros`
  - contador de activos visibles
- [ ] Mover filtros secundarios a panel desplegable/collapsible.
- [ ] Mostrar acciones masivas solo si `selectedCount > 0`.
- [ ] Mantener desktop como está salvo ajustes mínimos.

**Subfase 4.2: Implementación sin duplicar lógica**

- [ ] Reutilizar `ContentAssetFilters` extendiéndolo con variante compacta si es necesario.
- [ ] Reutilizar `ContentAssetBulkActions` con estado colapsado/oculto si es necesario.
- [ ] No crear otro sistema paralelo de filtros.

**Subfase 4.3: Tests de filtros**

- [ ] Mantener tests existentes de `filterContentLibraryAssets`.
- [ ] Añadir test de visibilidad/contrato si ya hay patrón de test de componentes; si no, validar con CDP.

**Verificación visual**

- [ ] En mobile 390×844 `/library`:
  - se ve al menos parte del primer activo en la primera pantalla o con desplazamiento mínimo.
  - las acciones masivas no ocupan espacio si no hay selección.
  - filtros siguen accesibles.
- [ ] En desktop `/library`:
  - filtros, acciones y detalle siguen funcionando.
  - scroll de miniaturas sigue aislado como fue ajustado.

**Puerta de avance Fase 4**

- [ ] Captura mobile de `/library` muestra activos sin atravesar un bloque masivo de controles.
- [ ] Filtros funcionan igual que antes.
- [ ] Selección masiva funciona cuando hay activos seleccionados.
- [ ] `npm run lint -- <archivos tocados>` y `npx tsc --noEmit --pretty false` pasan.

---

### Fase 5: Jerarquía del panel de trabajo en Imagen y Carrusel

**Objetivo:** que la tarea principal aparezca antes que historial y gestión de sesiones.

**Problemas cubiertos:**
- El usuario ve historial/sesión antes de la intención principal.
- La acción principal queda hundida en el panel.

**Archivos probables:**
- Modificar: `src/components/studio/ControlsPanel.tsx`
- Modificar: `src/components/studio/ControlsPanel.helpers.ts`
- Modificar: `src/components/studio/carousel/CarouselControlsPanel.tsx`
- Modificar: `src/components/studio/carousel/CarouselControlSections.tsx`
- Revisar: `src/components/studio/shared/SectionHeader.tsx`

**Subfase 5.1: Reordenar sin rediseñar**

- [ ] Mover `¿Qué quieres crear?` por encima de `Historial`.
- [ ] Mantener `Historial` disponible, pero secundario.
- [ ] No cambiar colores ni familias de botones.
- [ ] No tocar lógica de sesiones.

**Subfase 5.2: Verificar paridad Image/Carousel**

- [ ] Image y Carousel deben compartir el mismo principio:
  - intención primero
  - sesión/historial después
  - opciones avanzadas después de análisis o configuración

**Verificación visual**

- [ ] En desktop `/image`, el primer bloque útil del panel es la intención.
- [ ] En desktop `/carousel`, el primer bloque útil del panel es la intención o número de slides si se decide mantenerlo como parámetro primario.
- [ ] En mobile, el drawer abre sobre el bloque de trabajo principal, no sobre historial.

**Puerta de avance Fase 5**

- [ ] Usuario nuevo puede identificar qué escribir y qué pulsar sin bajar por historial.
- [ ] No se rompe gestión de sesiones.
- [ ] `npm run lint -- <archivos tocados>` y `npx tsc --noEmit --pretty false` pasan.

---

### Fase 6: Estados de carga y verificación de acceso

**Objetivo:** convertir pantallas blancas de `Verificando acceso...` en estados entendibles y medibles.

**Problemas cubiertos:**
- Capturas iniciales de varias rutas muestran solo pantalla blanca con loader.
- El usuario no sabe si falta sesión, kit, red o si la app está bloqueada.

**Archivos probables:**
- Modificar: `src/components/providers/ProtectedRoute.tsx`
- Modificar: `src/components/layout/DashboardLayout.tsx`
- Revisar: `src/components/onboarding/OnboardingModal.tsx`
- Revisar: `src/app/brand-kit/page.tsx`
- Revisar: `src/app/settings/page.tsx`

**Subfase 6.1: Mapear estados**

- [ ] Identificar estados actuales:
  - Clerk cargando
  - usuario no autenticado
  - usuario autenticado sin datos Convex todavía
  - brand kit cargando
  - bloqueo por completitud
- [ ] No cambiar reglas de negocio.

**Subfase 6.2: Estado visual mínimo**

- [ ] Añadir loader contextual dentro del shell cuando sea posible.
- [ ] Mostrar mensaje concreto:
  - `Preparando tu espacio de trabajo`
  - `Cargando Kit de marca`
  - `Comprobando sesión`
- [ ] Evitar pantalla blanca completa salvo carga inicial real.

**Verificación**

- [ ] Simular navegación directa a `/brand-kit`, `/settings`, `/image`.
- [ ] Capturar estado antes de carga y después.
- [ ] No aparece pantalla vacía sin contexto durante más de un intervalo razonable.
- [ ] Consola sin errores.

**Puerta de avance Fase 6**

- [ ] Las rutas protegidas tienen estado de carga contextual.
- [ ] No hay regresión de redirección a login/onboarding.
- [ ] `npm run lint -- <archivos tocados>` y `npx tsc --noEmit --pretty false` pasan.

---

### Fase 7: Home y Academy como confianza de producto

**Objetivo:** mejorar percepción externa sin rediseño completo.

**Problemas cubiertos:**
- Home enseña producto real demasiado tarde.
- Academy mezcla mockups genéricos en inglés con copy español.

**Archivos probables:**
- Modificar: `src/app/page.tsx`
- Modificar: `src/app/academy/page.tsx`
- Modificar: contenido local de Academy si existe en `src/lib` o `src/locales`.
- Revisar: `src/locales/es-ES/home.json`
- Revisar: `src/locales/es-ES/academy.json`

**Subfase 7.1: Home**

- [ ] Subir una señal visual real del producto al primer viewport.
- [ ] No convertir la home en una landing nueva.
- [ ] Evitar mockups genéricos si hay capturas reales útiles.
- [ ] Mantener CTA actual.

**Subfase 7.2: Academy**

- [ ] Sustituir mockups en inglés por capturas/localización coherente.
- [ ] Mantener estructura editorial.
- [ ] Evitar contenido placeholder.

**Verificación**

- [ ] Captura desktop y mobile de `/`.
- [ ] Captura desktop y mobile de `/academy`.
- [ ] No hay textos mock en inglés dentro de tarjetas españolas salvo nombres de producto inevitables.
- [ ] No hay overflow horizontal.

**Puerta de avance Fase 7**

- [ ] Home comunica producto real en primer viewport.
- [ ] Academy parece parte integrada del producto, no placeholder.
- [ ] `npm run lint -- <archivos tocados>` y `npx tsc --noEmit --pretty false` pasan.

---

### Fase 8: Verificación final y cierre

**Objetivo:** cerrar la tanda con evidencia completa y preparar validación humana.

**Subfase 8.1: Validación estática**

- [ ] Ejecutar `npm run lint`.
- [ ] Ejecutar `npx tsc --noEmit --pretty false`.
- [ ] Ejecutar tests afectados:
  - `npm run test -- --run src/components/library/__tests__/contentLibraryFilters.test.ts`
  - tests de visibilidad/debug si se añaden.

**Subfase 8.2: Anti-mojibake**

- [ ] Ejecutar `rg -n -P "Ã|Â|�" src`.
- [ ] Si aparecen coincidencias nuevas en archivos tocados, corregir antes de cerrar.
- [ ] No asumir que mojibake heredado fuera del alcance queda resuelto.

**Subfase 8.3: Validación navegador**

- [ ] Desktop:
  - `/image`
  - `/carousel`
  - `/library`
  - `/brand-kit`
  - `/settings`
  - `/`
  - `/academy`
- [ ] Mobile 390×844:
  - `/image`
  - `/library`
  - `/`
  - `/academy`
- [ ] Revisar consola.
- [ ] Revisar overflow horizontal.
- [ ] Guardar capturas en `outputs/ux-final-*`.

**Subfase 8.4: Informe de cierre**

- [ ] Enumerar fases completadas.
- [ ] Listar verificaciones con resultado.
- [ ] Listar riesgos residuales.
- [ ] Pedir validación de Juanfran antes de commit.

**Puerta de cierre**

- [ ] No hay errores TypeScript.
- [ ] No hay errores ESLint.
- [ ] No hay regresiones visuales evidentes en rutas revisadas.
- [ ] Juanfran valida resultado antes de commit.

---

## Orden recomendado de ejecución

1. Fase 1: exposición técnica.
2. Fase 2: accesibilidad de controles.
3. Fase 3: Imagen mobile.
4. Fase 4: Biblioteca mobile.
5. Fase 5: jerarquía de panel.
6. Fase 6: estados de carga.
7. Fase 7: Home/Academy.
8. Fase 8: verificación final.

## Criterio de parada

Detener la ejecución si aparece cualquiera de estos casos:

- cambio en zona protegida por `DONT_TOUCH.md`;
- necesidad de rediseño completo;
- cambio de arquitectura de generación;
- decisión de producto ambigua con dos direcciones válidas;
- fallo de autenticación o sesión local que impida validar.
