# Proyecto: Calidad y Mantenibilidad (continuación del Troceo)

> Documento vivo. Objetivo: reducir el tamaño de los ficheros monolíticos,
> refactorizar y subir la calidad/mantenibilidad del código para frenar el
> deterioro y la generación constante de errores. Continúa el trabajo de
> "troceo" (fases A/B ya commiteadas).

## ⏯️ ESTADO PARA RETOMAR (2026-06-15)
- **Rama `develop`, git limpio.** Sin desplegar vs `main`: `fase 2.6 gemini` + `docs 1.10`. Todo lo demás en producción (Vercel READY).
- **Hecho hoy:** Fase 0 ✓, Fase 1 (4 paneles) ✓, Fase 1b (CarouselControlsPanel 3634→3114, secciones 1.5–1.10) ✓, Fase 2 (2.1–2.6: generate-carousel, analyze-brand-dna ×2, parse-intent, creation-flow-types, gemini format mappers) ✓.
- 🔴 **BUG URGENTE PREEXISTENTE (no del troceo):** generar IMAGEN con OpenAI + referencia (logo) → 500 "No se pudo preparar ninguna imagen de referencia para OpenAI" (`gemini.ts:595` en `generateOpenAIImage`, código INTACTO; confirmado por git diff). **Comprobar si afecta a PRODUCCIÓN o solo dev** antes de nada. La generación de TEXTO sí funciona.
- **Deploy de 2.6 en pausa** hasta revisar ese 500.
- **Próximos pasos troceo:** hook `useCarouselControls` (para Prompt/Image del panel, atendido con QA) · `gemini.ts` provider-split completo · `work_sessions.ts` (separar helpers puros de los que usan `ctx`) · Fase 3 páginas · Fase 6 `any` (196).
- **QA:** usar `http://localhost:3000` (NO 127.0.0.1, Clerk da 403). `vitest.config` NO define alias `@/` → en ficheros que los tests cargan en runtime, usar imports RELATIVOS.

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

**Fase 1b — Profundización del cuerpo de CarouselControlsPanel (EN MARCHA):**
Secciones del render extraídas a subcomponentes (QA visual + funcional con login):
- [x] 1.5 Diálogos de sesión → `CarouselSessionDialogs.tsx`
- [x] 1.6 Modal composición avanzada → `AdvancedCompositionDialog.tsx`
- [x] 1.7 FormatSection + 1.8 SlideCountSection + 1.9 CompositionSection + 1.10 SessionsSection → `CarouselControlSections.tsx`
- [x] De-dup `shouldApplyPrimaryLogoToSlide` (carousel/page usa el de visual-prompt-builders).
- Panel: **3634 → 3114 líneas**. Todo desplegado (Vercel READY). TS 0, tests 198/198.
      QA visual+funcional OK (SlideCount "+", HISTORIAL "Nueva").
- [ ] **Secciones restantes (Prompt ~25 props, Image): MUY ACOPLADAS.** Prompt mezcla
      textarea+inspire+analyze+suggestions+promo+modal (~25 deps). Mejor con refactor
      basado en HOOK (`useCarouselControls`) antes de partir, para no crear interfaces
      de 25 props. CarouselControlSections.tsx ya pasa de 300 (sub-trocear si se desea).
- [ ] De-dup de `RoleColorSwatch`/`AddAccentSwatch` entre ControlsPanel y carousel:
      hoy son variantes visuales distintas (hover:scale, sombras); unificar con un
      componente compartido parametrizado SOLO con verificación visual.

### Fase 2 — Server actions / lógica core (continúa fase B) — CASI COMPLETA
Verificable con TS + tests (sin QA visual). Commits atómicos.
Nota: `vitest.config.ts` NO define alias `@/`; ficheros cargados en runtime por
tests (p.ej. `creation-flow-types`) deben usar imports RELATIVOS en lo extraído.
- [x] `generate-carousel.ts` 2661→2201 (2.1) → cluster de 15 builders de prompt visual
      a `src/lib/carousel/visual-prompt-builders.ts`. TS 0, tests 198/198.
- [x] `analyze-brand-dna.ts` 2953→2765 (2.2) → 7 funciones de consenso/roles de color
      a `src/lib/brand-analysis/color-consensus.ts`. TS 0, tests 198/198, lint 843→842.
- [x] `analyze-brand-dna.ts` 2765→2515 (2.5) → parsers puros de HTML/fuentes
      (discoverValuablePages, extractFontsFromContent, analyzeStaticWeightedDOM)
      a `src/lib/brand-analysis/html-extractors.ts`. TS 0, tests 198/198, lint 843.
- [x] `parse-intent.ts` 1356→1138 (2.3) → 6 helpers de reparacion de JSON
      a `src/lib/json-repair.ts`. TS 0, tests 198/198, lint 842 (sin cambio).
- [x] `creation-flow-types.ts` 1486→979 (2.4) → catálogo de layouts
      (`DEFAULT_LAYOUTS`+`LAB_ADVANCED_LAYOUTS`, ~510 líneas) a
      `src/lib/creation-flow/layout-catalog.ts` (re-export, imports relativos). TS 0, tests 198/198.
- [ ] `gemini.ts` (~1956) — cliente central de IA. DECISIÓN: no trocear con migajas;
      merece pasada dedicada que lo **divida por proveedor** (wisdom/openai/naga/replicate/
      atlas/google → `lib/gemini/<provider>.ts`) dejando `gemini.ts` como fachada. Pendiente.
- Pendiente menor (opcional): `visual-prompt-builders.ts` (427) y `layout-catalog.ts` (513)
  superan 300; sub-trocear si se desea. `SOCIAL_FORMATS` no se mueve (test fija su fuente).

### Fase 3 — Páginas (route components)
- [ ] `admin/page.tsx` (2586)
- [ ] `image/page.tsx` (2542)
- [ ] `carousel/page.tsx` (2095)
- [ ] `brand-kit/page.tsx` (1350)
- [ ] `page.tsx` (1027)
- Mover lógica a hooks/containers; las páginas quedan de orquestación.

### Fase 4 — Hooks y tipos
- [ ] `useCreationFlow.ts` (2485) — hook, requiere QA visual
- [x] `creation-flow-types.ts` — hecho en 2.4 (catálogo de layouts extraído)

### Fase 5 — Convex
- [ ] `work_sessions.ts` (1559) — CUIDADO: la región de "helpers" (7-890) NO es toda
      pura; hay funciones que toman `QueryCtx`/`MutationCtx` y tocan `ctx.db`. Separar
      primero los helpers puros (compactación/sanitización de snapshots: `compact*`,
      `sanitizeSnapshot`, `safeStableStringify`, `summarize*`, `buildSessionFingerprint`,
      `compareSessionsForKeep`) → `convex/lib/session-compaction.ts`, dejando los
      ctx-dependientes en el fichero. Romper esto afecta persistencia de sesiones. Atender.
- [ ] `billing.ts` (638)

### Fase 6 — Deuda de tipos y warnings reales
- [ ] Reducir los ~189 `any` por módulo, una vez el scope de lint esté limpio.

### Fase 7 — Documentación de convenciones
- [ ] Documentar el patrón de troceo en `docs/TECHNICAL_REFERENCE.md`.

## Notas
- Cada fase puede pausarse/retomarse; el orden de ficheros dentro de una fase
  puede ajustarse según el trabajo de features en curso.
- Antes de tocar cualquier fichero: consultar `DONT_TOUCH.md` (AGENTS §1.1).
