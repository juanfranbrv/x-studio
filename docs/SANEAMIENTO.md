# Plan de Saneamiento — X-Studio

> Origen: auditoría general del 2026-06-12. Cada subfase tiene una **verificación objetiva**
> que debe cumplirse antes de marcarla. Estado: `[ ]` pendiente · `[x]` completada y verificada.

## Fase 1 — Dependencias y secretos (crítico)

- [x] **1.1 Actualizar Clerk** (`@clerk/nextjs` con CVE crítico de bypass de middleware)
  - Verificación: ✅ 2026-06-12 — `@clerk/nextjs` 6.36.5 → **7.5.2** (major). `npm audit` sin vulnerabilidades de `@clerk/*` critical/high; `tsc --noEmit` limpio (único breaking: `appearance.baseTheme` → `theme` en `src/app/admin/page.tsx`).
- [x] **1.2 Resolver resto de vulnerabilidades npm** (`next`, `axios`, `undici`, `js-cookie`, …)
  - Verificación: ✅ 2026-06-12 — `npm audit fix` + `next` 16.1.1 → **16.2.9**. Resultado: **0 critical, 0 high**. Quedan 12 *moderate* transitivas (cadena `potrace`/`jimp`/`node-vibrant` y `@clerk/nextjs`→`postcss`) sin fix upstream no-breaking; riesgo aceptado por ser procesamiento server-side de imágenes propias.
- [x] **1.3 Retirar token de Vercel de AGENTS.md** (y del flujo de trabajo)
  - Verificación: ✅ 2026-06-12 — grep del token → 0 resultados; AGENTS.md ahora referencia `$env:VERCEL_TOKEN`.
  - ⚠️ Acción manual de Juanfran PENDIENTE: **revocar el token en el dashboard de Vercel** (está en el historial de git).
- [x] **1.4 Build de producción y tests siguen pasando tras los bumps**
  - Verificación: ✅ 2026-06-12 — `next build` OK; `vitest run` 160 pass / 10 fail (exactamente los 10 conocidos pre-existentes, ningún fallo nuevo).

## Fase 2 — Autenticación real en Convex (crítico)

- [x] **2.1 Diagnóstico de cableado**: confirmar cómo se conecta el cliente (¿`ConvexProviderWithClerk`?) y las llamadas server-side (`fetchQuery`/`ConvexHttpClient`) para saber si el JWT de Clerk llega a Convex.
  - Verificación: ✅ 2026-06-12 — Estado real: cliente usa `ConvexProvider` plano (sin JWT → `ctx.auth` siempre null); ~115 hooks `useQuery/useMutation` en cliente y 96 llamadas server-side sin token. `CLERK_ISSUER_URL` **sí** está configurado en el deployment Convex y `convex/auth.config.ts` existe.
  - **Plan de migración elegido**: (a) cliente → `ConvexProviderWithClerk`; (b) server → helper `authedFetchQuery/Mutation` que adjunta el JWT de Clerk (template `convex`); (c) funciones Convex → mantienen su firma (`clerk_id` como arg) pero un helper `requireSameUser(ctx, arg)` exige identidad real y que coincida; (d) admin → `requireAdmin(ctx)` contra la tabla `users`, nunca contra un argumento. Escape operativo: env `AUTH_ENFORCEMENT=off` en Convex desactiva la verificación si producción se rompiera (solo accesible por el operador).
  - ⚠️ Requisito externo: debe existir el **JWT template `convex`** en el dashboard de Clerk (se valida en el smoke test de 2.2).
- [x] **2.2 Identidad en funciones de `users.ts`** (`consumeCredits`, `setCurrentBrand`, `upsertUser`, `deleteUserByClerkId`, …): la identidad sale de `ctx.auth`, no de argumentos.
  - Verificación: ✅ 2026-06-12 — `scripts/verify-convex-auth.mjs` contra el deployment dev real: sin token → rechazada; token propio → OK (créditos leídos); token con `clerk_id` ajeno → rechazada. Webhooks (`syncUserFromClerkWebhook`, `deleteUserByClerkId`) gateados por `access_key` interno.
  - ⚠️ Pendiente UAT: smoke test visual con sesión real (el storage state de Playwright caducó — regenerar con `npm run playwright:auth:save`).
- [x] **2.3 Identidad en `brands.ts` y `work_sessions.ts`** (datos de usuario).
  - Verificación: ✅ 2026-06-12 — guards `requireSameUser` en las 16 funciones de brands + 9 de work_sessions; mismas aserciones del script (queries admin de brands sin token → rechazadas). `tsc` limpio; vitest sin fallos nuevos.
- [x] **2.4 Funciones admin (60 checks en 11 módulos + `systemPrompts` que no tenía ninguno)**: rol admin verificado contra identidad real (`requireAdmin`), nunca contra un argumento.
  - Verificación: ✅ 2026-06-12 — `debugBrandDNAStats` sin token → rechazada; con token de admin → OK. `systemPrompts.upsert/remove` ahora admin-only (el bootstrap del módulo Replace cae a su default en memoria si no es admin).

### Infraestructura creada/configurada en F2
- JWT template **`convex`** creado vía API en la instancia Clerk **dev** (en **prod ya existía**).
- `CLERK_ISSUER_URL=https://clerk.adstudio.click` configurado en el deployment Convex de **producción** (estaba vacío: producción no tenía NINGUNA env var).
- `STRIPE_INTERNAL_SECRET` generado y configurado en Convex **prod**; copia en `.tmp/prod-internal-secret.txt`.
- ⚠️ Acción manual de Juanfran ANTES del próximo deploy a prod: añadir esa misma `STRIPE_INTERNAL_SECRET` a las env vars de **Vercel** (si no, el webhook de Clerk y el billing interno fallarán en prod).
- Cliente migrado a `ConvexProviderWithClerk`; server actions/rutas migradas a `authedFetchQuery/Mutation` (`src/lib/convex-server.ts`).
- Escape operativo: `npx convex env set AUTH_ENFORCEMENT off` desactiva los guards si producción se rompiera.

## Fase 3 — Endurecer rutas API

- [x] **3.1 Gating de admin real en `/api/admin/*`** (hoy basta cualquier usuario logueado).
  - Verificación: ✅ 2026-06-12 — `src/lib/admin-guard.ts` (`getAdminUserIdOrNull`, email verificado contra la sesión Clerk) aplicado a `migrate-brand-kits` y `seed-prompts` → 403 para no-admins. Defensa en profundidad: las funciones Convex subyacentes ya exigen `requireAdmin` (F2.4), verificado e2e por `scripts/verify-convex-auth.mjs`.
- [x] **3.2 Allowlist robusta en `/api/proxy-image`** (cambiar `hostname.includes()` por sufijo de dominio exacto).
  - Verificación: ✅ 2026-06-12 — lógica extraída a `src/lib/proxy-image-allowlist.ts` (sufijo exacto + https obligatorio) con test unitario `proxy-image-allowlist.test.ts`: 3/3 en verde, incluye `instagram.com.evil.com` → rechazada y `scontent-mad1-1.cdninstagram.com` → permitida.
- [x] **3.3 Desactivar `/api/dev/transactional-email` en producción** (hoy depende del header `Host`).
  - Verificación: ✅ 2026-06-12 — la ruta devuelve 404 incondicional cuando `NODE_ENV === 'production'`; eliminado el check por header `Host` (controlable por el cliente).

## Fase 4 — Suite de tests en verde

- [x] **4.1 Arreglar o retirar los 10 tests rotos** (`ControlsPanel`, `HeaderTypography`, `OnboardingBrandPrecedence`).
  - Verificación: ✅ 2026-06-12 — `vitest run`: **165/165 en verde** (65 ficheros). Decisión: los 8 tests de `ControlsPanel` eran pins de clases Tailwind de un restyle anterior al canva-style → retirados (sin valor de regresión funcional); `HeaderTypography` y `OnboardingBrandPrecedence` protegían comportamiento → actualizados al código vigente (IconCoins01 deliberado; precedencia de módulo intacta con soporte brand-kit).

## Fase 5 — Higiene de código (progresivo)

- [~] **5.1 Eliminar los errores de ESLint** — PARCIAL (284 → **225**).
  - Hecho 2026-06-12 (sesión 1): **5 errores `react-hooks/rules-of-hooks` (bugs reales)** — early-return antes de hooks en `CanvasGhostOverlay.tsx` y `useMemo` condicional en `admin/page.tsx`.
  - Hecho 2026-06-12 (sesión 2, 272→225, todos verificados con tsc+165 tests+build):
    - Triviales seguros (-24): 16 `react/no-unescaped-entities` (`&quot;`), 3 `ban-ts-comment` (tipos `EyeDropper` declarados en `src/types/eyedropper.d.ts`), 2 `prefer-const`, 2 `prefer-as-const`, 1 `no-empty-object-type`.
    - `no-explicit-any` en manejo de errores (-23): helper `getErrorMessage(unknown)` en `src/lib/utils.ts`; convertidos los `catch (e: any)` de las 4 server actions de análisis de marca y los **17 de `admin/page.tsx`** a `catch (e)` + `getErrorMessage`.
  - Pendiente (progresivo, 166 `no-explicit-any` + ~59 `react-hooks/*` advisory): tipado real en ficheros grandes (`gemini.ts` 19, `analyze-brand-dna` 14, `ExtractionPreviewModal` 12, `image/page`, `BrandDNABoard`…) y catch de UI dispersos. Los `react-hooks/*` (set-state-in-effect, static-components, refs, purity) son del react-compiler y requieren refactor con cuidado — **no tocar a ciegas**. Recomendación: reducir por fichero al tocarlo, o delegar los casos mecánicos a `/local-worker`.
- [ ] **5.2 Migrar `console.*` a `src/lib/logger.ts` en los ficheros server-side más ruidosos** (`analyze-brand-dna.ts` con 176, `gemini.ts`, server actions).
  - Verificación: `grep console.` en `src/app/actions` y `src/lib/gemini.ts` ≈ 0; logs visibles con formato del logger.
  - Nota: no abordado en esta sesión — los logs usan formatos `%c` heterogéneos y la migración a ciegas rompería trazas; requiere pasada dedicada.

## Fase 6 — Troceo de ficheros gigantes (ronda 1)

> Objetivo no funcional: reducir la superficie de los ficheros >2.000 líneas **sin cambiar
> comportamiento**. Alcance de esta ronda: piloto (LayoutThumbnail) + server actions.
> Plan: `~/.claude/plans/optimized-plotting-whisper.md`.

- [x] **6.A LayoutThumbnail.tsx (3.875 → 537 líneas)**
  - Verificación: ✅ 2026-06-12 — 272 componentes `*Layout` presentacionales puros extraídos a
    `src/components/studio/creation-flow/layout-thumbnails/` en 8 ficheros temáticos (<555 líneas
    c/u) + barrel; el componente público y los dispatchers permanecen e importan vía `import * as L`.
    **Comprobado byte-idéntico al original** (script de comparación: 272/272 cuerpos JSX iguales →
    render garantizado idéntico), `tsc` limpio, 165/165 tests, `next build` OK. Commit `3e91625`.
- [x] **6.B1 generate-carousel.ts (2.836 → 2.367 líneas)**
  - Verificación: ✅ 2026-06-12 — 12 helpers puros de texto/JSON/URL/ID → `src/lib/carousel/text-utils.ts`
    con **24 tests nuevos**. `sanitizeUrl` resultó ser código muerto → conservado como util testeada.
    `tsc` limpio, 189/189 tests, build OK. Commit `7cae6a7`.
- [x] **6.B2 analyze-brand-dna.ts (−70 líneas)**
  - Verificación: ✅ 2026-06-12 — 4 helpers de color **matemático puros** (`colorDistance`,
    `deduplicateSimilarColors`, `rgbToHex`, `isColorful`) → `src/lib/brand-analysis/color-math.ts`
    con **9 tests nuevos**. `tsc` limpio, 198/198 tests, build OK.
  - ⚠️ **Acotado deliberadamente:** el resto de helpers de color (cluster de consenso +
    `assignStudioColorRoles` local, que **difiere** del de `color-utils.ts`) están entrelazados con
    lógica de negocio; extraerlos mecánicamente era arriesgado y se dejó intacto. El fichero sigue
    >2.000 líneas. También se detectó un `relativeLuminance` local duplicado del de `color-utils.ts`
    (no consolidado para no tocar el `assignStudioColorRoles` local).

### Fuera de alcance (ronda futura de troceo)
`image/page.tsx`, `carousel/page.tsx`, `useCreationFlow.ts`, `CarouselControlsPanel.tsx`,
`admin/page.tsx` y la consolidación de duplicados de color: requieren extraer custom hooks /
sub-componentes con props (refactor de estado real), mini-plan + revisión visual por fichero.

## Registro de decisiones

- 2026-06-12: migración a Better-Auth **descartada por ahora** — reabriría el agujero de auth
  recién cerrado y es un milestone propio; reevaluar tras estabilizar el saneamiento en producción.
- 2026-06-12: troceo de páginas/hooks con estado **pospuesto** a ronda futura por riesgo (refactor
  real, no movimiento mecánico).
