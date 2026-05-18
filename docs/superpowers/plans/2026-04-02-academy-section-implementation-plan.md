# Academy Section Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir `Academy` como una seccion publica integrada en `x-studio`, con indice editorial, detalle de articulo, fuente de contenido local tipada y navegacion visible tanto desde la landing como desde la navegacion interna.

**Architecture:** La V1 se resuelve con contenido local tipado en `src/lib`, rutas Next App Router en `/academy` y `/academy/[slug]`, y componentes editoriales propios en `src/components/academy`. La integracion de navegacion se hace reutilizando los patrones existentes de landing, sidebar y menus moviles, y la capa de texto queda cubierta por un nuevo namespace i18n `academy`.

**Tech Stack:** Next.js App Router, React 19, TypeScript, i18next, Vitest, Tailwind, navegacion existente de `x-studio`.

---

## Chunk 1: Modelo de contenido y cimientos

### Task 1: Tipos y fuente de contenido de Academy

**Files:**
- Create: `src/lib/academy-types.ts`
- Create: `src/lib/academy-content.ts`
- Create: `src/lib/__tests__/academy-content.test.ts`

- [ ] Definir tipos cerrados para `AcademyCategory`, `AcademyPost`, `AcademyContentBlock` y helpers derivados.
- [ ] Crear una coleccion local inicial con varias entradas de ejemplo reales y slugs unicos.
- [ ] Exponer utilidades puras:
  - `getAllAcademyPosts()`
  - `getFeaturedAcademyPosts()`
  - `getAcademyPostBySlug(slug)`
  - `getAcademyPostsByCategory(category)`
- [ ] Escribir tests de ordenado, filtro por categoria y resolucion por slug.
- [ ] Ejecutar `npm run test -- src/lib/__tests__/academy-content.test.ts`.

### Task 2: Namespace i18n de Academy

**Files:**
- Modify: `src/lib/i18n.ts`
- Create: `src/locales/es-ES/academy.json`
- Create: `src/locales/en-US/academy.json`

- [ ] Registrar el namespace `academy` en recursos e `I18N_NAMESPACES`.
- [ ] Añadir textos de shell editorial:
  - hero
  - categorias
  - destacados
  - volver al indice
  - articulos relacionados
  - CTA suaves al producto
- [ ] Mantener textos de contenido editorial fuera de i18n si en V1 van embebidos en la coleccion local, y reservar i18n para UI estructural.
- [ ] Ejecutar `npm run test` si existe algun test que cubra carga de i18n; si no, dejar validacion con `npm run build` en un chunk posterior.

## Chunk 2: Rutas y componentes editoriales

### Task 3: Layout y metadatos de la seccion

**Files:**
- Create: `src/app/academy/layout.tsx`
- Modify: `src/app/layout.tsx`

- [ ] Crear un layout de `Academy` con enfoque editorial y sin panel derecho.
- [ ] Asegurar que hereda providers globales del root sin crear una shell paralela.
- [ ] Definir metadata base de la seccion para titulo y descripcion.
- [ ] Decidir si el layout incorpora o no una cabecera propia minima; si se reutiliza navegacion existente, documentarlo en el codigo.

### Task 4: Indice publico `/academy`

**Files:**
- Create: `src/app/academy/page.tsx`
- Create: `src/components/academy/AcademyIndexPage.tsx`
- Create: `src/components/academy/AcademyHero.tsx`
- Create: `src/components/academy/AcademyCategoryTabs.tsx`
- Create: `src/components/academy/AcademyPostCard.tsx`
- Create: `src/components/academy/AcademyPostGrid.tsx`
- Create: `src/components/academy/__tests__/AcademyIndexPage.test.tsx`

- [ ] Renderizar hero editorial con categoria o articulo destacado.
- [ ] Renderizar categorias visibles desde el inicio.
- [ ] Renderizar rejilla de publicaciones con:
  - imagen
  - categoria
  - fecha
  - titulo
  - extracto
- [ ] Resolver el filtrado de categoria con la minima complejidad posible:
  - preferencia: filtrado en cliente ligero si mejora UX
  - alternativa valida: query param y render en servidor si deja el codigo mas limpio
- [ ] Escribir test del indice comprobando que aparecen cards, categorias y post destacado.
- [ ] Ejecutar `npm run test -- src/components/academy/__tests__/AcademyIndexPage.test.tsx`.

### Task 5: Detalle publico `/academy/[slug]`

**Files:**
- Create: `src/app/academy/[slug]/page.tsx`
- Create: `src/components/academy/AcademyArticlePage.tsx`
- Create: `src/components/academy/AcademyRichContent.tsx`
- Create: `src/components/academy/__tests__/AcademyArticlePage.test.tsx`

- [ ] Resolver el articulo por slug desde la fuente local.
- [ ] Implementar fallback 404 cuando el slug no exista.
- [ ] Renderizar layout editorial con:
  - portada
  - titulo
  - entradilla
  - bloques de texto e imagenes
  - enlace de retorno al indice
  - CTA contextual al producto
- [ ] Mantener los bloques de contenido suficientemente simples para la V1:
  - `paragraph`
  - `heading`
  - `image`
  - `callout` opcional
- [ ] Escribir test del detalle comprobando resolucion por slug y estado no encontrado.
- [ ] Ejecutar `npm run test -- src/components/academy/__tests__/AcademyArticlePage.test.tsx`.

## Chunk 3: Integracion en navegacion del producto

### Task 6: Sidebar y menus internos

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/MobileMenu.tsx`
- Modify: `src/components/layout/MobileNav.tsx`
- Modify: `src/locales/es-ES/common.json`
- Modify: `src/locales/en-US/common.json`

- [ ] Añadir entrada `Academy` a la navegacion interna de escritorio.
- [ ] Añadir la misma entrada a los menus moviles para evitar una navegacion inconsistente.
- [ ] Usar una sola etiqueta i18n (`nav.academy`) en todos los puntos.
- [ ] Elegir un icono existente coherente con el sistema y mantener la misma jerarquia visual del resto de destinos.
- [ ] Verificar que el estado activo funciona en `/academy` y en `/academy/[slug]`, no solo en igualdad exacta de pathname.
- [ ] Escribir un test de navegacion si la suite actual ya cubre patrones de `Sidebar`; si no, cubrirlo en el smoke final.

### Task 7: Landing y enlaces publicos

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/locales/es-ES/home.json`
- Modify: `src/locales/en-US/home.json`

- [ ] Añadir `Academy` a la navegacion superior de la landing.
- [ ] Sustituir placeholders del footer en recursos/documentacion por enlaces reales a `/academy`.
- [ ] Añadir al menos un punto de entrada visible en la landing que no sea solo footer:
  - preferencia: nav superior
  - opcional adicional: link contextual en tabs/showcases si encaja sin rediseño grande
- [ ] Mantener el cambio como integracion ligera, sin rediseñar la landing completa.

## Chunk 4: Acabado visual, validacion y documentacion

### Task 8: Sistema visual y responsive de Academy

**Files:**
- Create: `src/components/academy/academyStyles.ts`
- Modify: `src/components/academy/AcademyIndexPage.tsx`
- Modify: `src/components/academy/AcademyArticlePage.tsx`
- Modify: `src/components/academy/AcademyPostCard.tsx`

- [ ] Extraer clases base o constantes de estilo para evitar duplicacion local.
- [ ] Reutilizar tokens semanticos del sistema y evitar colores hardcodeados.
- [ ] Garantizar que las cards se sienten parte del mismo producto, pero con tono editorial.
- [ ] Verificar responsive en indice y detalle:
  - grid de cards
  - hero
  - ancho de lectura
  - imagenes de portada

### Task 9: Smoke tests tecnicos y visuales

**Files:**
- Create: `src/app/academy/__tests__/academy-routing.test.tsx` o el archivo de test equivalente que mejor encaje
- Optional Create: `tests/academy-public.spec.ts` si se decide cubrir visualmente con Playwright

- [ ] Ejecutar tests unitarios del modelo y de componentes.
- [ ] Ejecutar `npm run build` para validar rutas, metadata e i18n.
- [ ] Ejecutar comprobacion anti-mojibake:
  - `rg -n -P "\\u00C3|\\u00C2|\\uFFFD" src`
- [ ] Levantar entorno local si el cambio pasa a implementacion:
  - `npm run dev:quiet`
  - `npm run chrome:debug`
- [ ] Validar visualmente:
  - `/academy`
  - `/academy/<slug-real>`
  - landing con enlace a `Academy`
  - sidebar interna con entrada activa

### Task 10: Cierre documental

**Files:**
- Modify: `docs/TECHNICAL_REFERENCE.md`
- Optional Modify: `docs/UI_SYSTEM_RULES.md`

- [ ] Confirmar que la referencia tecnica refleja la arquitectura final implementada si cambia algun detalle del spec.
- [ ] Solo tocar `UI_SYSTEM_RULES.md` si durante la implementacion nace un patron editorial reusable que merezca regla de sistema.

## Orden recomendado de ejecucion

1. Modelo de contenido
2. i18n
3. layout y ruta indice
4. ruta detalle
5. navegacion interna
6. landing
7. pulido visual
8. validacion tecnica y visual

## Criterios de aceptacion

- Existe una ruta publica `/academy` con publicaciones visibles.
- Existe una ruta publica `/academy/[slug]` con articulo editorial legible.
- `Academy` aparece enlazada desde la landing y desde la navegacion interna.
- La seccion no usa CMS externo y se alimenta desde contenido local tipado.
- La UI respeta el lenguaje visual del producto sin crear una shell paralela.
- El comportamiento responsive queda validado en indice y detalle.
- La implementacion no introduce mojibake en textos nuevos.

## Notas de ejecucion

- No rediseñar la landing completa para introducir `Academy`; la integracion debe ser puntual y controlada.
- No meter busqueda, tags complejos ni CMS en esta fase.
- Si durante la implementacion aparece necesidad de SEO por articulo, resolverlo con metadata por ruta y no con infraestructura adicional.
- Si la cantidad de contenido inicial crece rapido, el siguiente paso natural sera separar la coleccion de contenido de los componentes, no introducir un CMS de inmediato.
