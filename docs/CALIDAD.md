# Proyecto: Calidad y Mantenibilidad (continuación del Troceo)

> Documento vivo. Objetivo: reducir el tamaño de los ficheros monolíticos,
> refactorizar y subir la calidad/mantenibilidad del código para frenar el
> deterioro y la generación constante de errores. Continúa el trabajo de
> "troceo" (fases A/B ya commiteadas).

## Diagnóstico (baseline 2026-06-14)

- **TypeScript: 0 errores** (`tsc --noEmit` limpio). → Red de seguridad para refactorizar.
- **Tests: 165/165 en verde** (vitest).
- **ESLint (antes): 85.042 problemas (3.087 err, 81.955 warn)** — gate inservible:
  ~82k warnings venían de `.tmp/chrome-debug/**` (extensiones del navegador de
  debug) y tooling local, no del código.
- **ESLint (tras Fase 0): 845 problemas (290 err, 555 warn)** — señal real.
  - Errores: `no-explicit-any` 196, `no-require-imports` 34, `react-hooks/*` ~59.
  - Warnings: `no-unused-vars` 320, `no-img-element` 82, **`max-lines` 81**
    (= ficheros >300 líneas, backlog de troceo cuantificado), `exhaustive-deps` 67.
- **Umbral de tamaño (AGENTS §12): ~300 líneas.** Decenas de ficheros lo superan.

### Ficheros más grandes (top offenders)

| Líneas | Fichero |
|-------:|---------|
| 3672 | `src/components/studio/carousel/CarouselControlsPanel.tsx` |
| 2586 | `src/app/admin/page.tsx` |
| 2558 | `src/app/actions/analyze-brand-dna.ts` |
| 2542 | `src/app/image/page.tsx` |
| 2485 | `src/hooks/useCreationFlow.ts` |
| 2404 | `src/app/actions/generate-carousel.ts` |
| 2095 | `src/app/carousel/page.tsx` |
| 1956 | `src/lib/gemini.ts` |
| 1540 | `src/components/studio/ControlsPanel.tsx` |
| 1430 | `convex/work_sessions.ts` |
| 1389 | `src/components/studio/carousel/CarouselCanvasPanel.tsx` |
| 1387 | `src/components/brand-dna/BrandKitAssistantWizard.tsx` |
| 1383 | `src/lib/creation-flow-types.ts` |
| 1350 | `src/app/brand-kit/page.tsx` |
| 1299 | `src/components/studio/CanvasPanel.tsx` |
| 1177 | `src/app/actions/parse-intent.ts` |
| 1119 | `src/components/studio/BrandDNAPanel.tsx` |
| 1065 | `src/components/brand-dna/BrandDNABoard.tsx` |
| 1027 | `src/app/page.tsx` |

## Estrategia

- **Refactor de comportamiento-cero** (pure refactor): no cambiar funcionalidad.
- Apoyo en **TS limpio + tests verdes** como red de seguridad.
- Patrón ya validado en fases A/B: **extraer helpers puros a `lib/`** y
  **subcomponentes a carpetas hermanas**; el fichero original queda de orquestación.
- **Commits atómicos** por extracción; correr tests tras cada paso.
- Trabajo compatible con desarrollo de features (incremental, no big-bang).

## Priorización (framework tech-debt)

`Prioridad = (Impacto + Riesgo) × (6 − Esfuerzo)` — 1-5 cada eje.

## Fases

### Fase 0 — Red de seguridad y baseline de lint ✅ COMPLETADA (2026-06-14)
*Esfuerzo bajo, alto efecto habilitador.*
- [x] Arreglar scope/ignores de ESLint (`.tmp`, `convex/_generated`, `.claude`,
      `.gemini`, `.opencode`, `.agents`, `docs/legacy-compositions`, coverage…).
      → ESLint pasó de **85.042 → 845 problemas**.
- [x] Establecer baseline real: 290 errores / 555 warnings (desglose arriba).
- [x] Guardarraíl anti-regresión: regla `max-lines` warn @300 (skipBlank/comments)
      sobre `src/**` y `convex/**`. Surfacea 81 monolitos. Subir a `error` al acabar.
- [x] Confirmar suite verde: **198/198 tests** (vitest), TS 0 errores.
- **Entregable:** `npm run lint` con señal útil + límite de tamaño activo. ✅

### Fase 1 — Paneles de UI gigantes (mayor impacto diario) — EN CURSO
Primera pasada **segura (comportamiento-cero)**: extraer preámbulo (tipos, helpers
puros, constantes de estilo, subcomponentes presentacionales) a ficheros hermanos.
Verificado con TS (0 errores) + suite (198/198) tras cada paso. Commits atómicos.
- [x] `CarouselControlsPanel.tsx` 3922→3634 (1.1) → `.types.ts`, `.helpers.ts`, `CarouselColorSwatches.tsx`
- [x] `ControlsPanel.tsx` 1621→1483 (1.2) → `.helpers.ts`, `.types.ts`, `ControlsColorSwatches.tsx`
- [x] `CarouselCanvasPanel.tsx` 1482→1363 (1.3) → `.helpers.ts`, `.parts.tsx`
- [x] `CanvasPanel.tsx` 1421→1299 (1.4) → `.helpers.ts`, `.parts.tsx`
- Lint global: 845→842 (sin regresión; -2 constantes muertas).
- **QA visual OK (2026-06-14)**: `/image` y `/carousel` verificados en sesión real
  (los 4 paneles renderizan idénticos, swatches y toolbars funcionando).
  Nota: usar `http://localhost:3000` (NO `127.0.0.1`) o Clerk dev devuelve 403 y el login no monta.

**Pendiente Fase 1 (requiere verificación VISUAL con login Clerk):**
- [ ] Extraer secciones grandes del *cuerpo* de cada panel a subcomponentes + hooks
      (`useXxx`). Es la parte que más reduce líneas pero exige QA visual (no se pudo
      hacer en sesión autónoma: `/carousel` y `/studio` están tras login).
- [ ] De-dup de `RoleColorSwatch`/`AddAccentSwatch` entre ControlsPanel y carousel:
      hoy son variantes visuales distintas (hover:scale, sombras); unificar con un
      componente compartido parametrizado SOLO con verificación visual.

### Fase 2 — Server actions / lógica core (continúa fase B) — EN CURSO
Verificable con TS + tests (sin QA visual). Commits atómicos.
- [x] `generate-carousel.ts` 2661→2201 (2.1) → cluster de 15 builders de prompt visual
      a `src/lib/carousel/visual-prompt-builders.ts`. TS 0, tests 198/198.
- [ ] `analyze-brand-dna.ts` (~2558)
- [ ] `gemini.ts` (~1956)
- [ ] `parse-intent.ts` (~1177)
- Pendiente: `visual-prompt-builders.ts` (427 líneas) podría sub-trocearse (locale/idioma
  vs distribución de detalles) para bajar de 300; opcional.

### Fase 3 — Páginas (route components)
- [ ] `admin/page.tsx` (2586)
- [ ] `image/page.tsx` (2542)
- [ ] `carousel/page.tsx` (2095)
- [ ] `brand-kit/page.tsx` (1350)
- [ ] `page.tsx` (1027)
- Mover lógica a hooks/containers; las páginas quedan de orquestación.

### Fase 4 — Hooks y tipos
- [ ] `useCreationFlow.ts` (2485)
- [ ] `creation-flow-types.ts` (1383)

### Fase 5 — Convex
- [ ] `work_sessions.ts` (1430)
- [ ] `billing.ts` (638)

### Fase 6 — Deuda de tipos y warnings reales
- [ ] Reducir los ~189 `any` por módulo, una vez el scope de lint esté limpio.

### Fase 7 — Documentación de convenciones
- [ ] Documentar el patrón de troceo en `docs/TECHNICAL_REFERENCE.md`.

## Notas
- Cada fase puede pausarse/retomarse; el orden de ficheros dentro de una fase
  puede ajustarse según el trabajo de features en curso.
- Antes de tocar cualquier fichero: consultar `DONT_TOUCH.md` (AGENTS §1.1).
