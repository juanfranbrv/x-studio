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

- [ ] **2.1 Diagnóstico de cableado**: confirmar cómo se conecta el cliente (¿`ConvexProviderWithClerk`?) y las llamadas server-side (`fetchQuery`/`ConvexHttpClient`) para saber si el JWT de Clerk llega a Convex.
  - Verificación: documentado aquí el estado real y el plan de migración exacto.
- [ ] **2.2 Identidad en funciones de `users.ts`** (`consumeCredits`, `setCurrentBrand`, `upsertUser`, `deleteUserByClerkId`, …): la identidad sale de `ctx.auth`, no de argumentos.
  - Verificación: llamada directa sin token falla con Unauthorized; la app funciona logueada (smoke test navegador).
- [ ] **2.3 Identidad en `brands.ts` y `work_sessions.ts`** (datos de usuario).
  - Verificación: ídem 2.2.
- [ ] **2.4 Funciones admin (`billing.updatePack`, `seedDefaultPacks`, `economic.*`, `admin.ts`)**: rol admin verificado contra identidad real, nunca contra un argumento.
  - Verificación: llamada con `admin_email` falsificado falla; panel admin funciona para Juanfran.

## Fase 3 — Endurecer rutas API

- [ ] **3.1 Gating de admin real en `/api/admin/*`** (hoy basta cualquier usuario logueado).
  - Verificación: petición de usuario no-admin recibe 403; test unitario que lo cubra.
- [ ] **3.2 Allowlist robusta en `/api/proxy-image`** (cambiar `hostname.includes()` por sufijo de dominio exacto).
  - Verificación: test unitario: `instagram.com.evil.com` → 403; `scontent-mad1-1.cdninstagram.com` → permitido.
- [ ] **3.3 Desactivar `/api/dev/transactional-email` en producción** (hoy depende del header `Host`).
  - Verificación: en build de producción la ruta devuelve 403/404 incondicionalmente salvo `NODE_ENV !== 'production'`.

## Fase 4 — Suite de tests en verde

- [ ] **4.1 Arreglar o retirar los 10 tests rotos** (`ControlsPanel`, `HeaderTypography`, `OnboardingBrandPrecedence`).
  - Verificación: `npx vitest run` → 0 fallos.

## Fase 5 — Higiene de código (progresivo)

- [ ] **5.1 Eliminar los 284 errores de ESLint** (mayormente `no-explicit-any`), empezando por código de servidor.
  - Verificación: `npx eslint src` → 0 errores (warnings pueden quedar documentados).
- [ ] **5.2 Migrar `console.*` a `src/lib/logger.ts` en los ficheros server-side más ruidosos** (`analyze-brand-dna.ts` con 176, `gemini.ts`, server actions).
  - Verificación: `grep console.` en `src/app/actions` y `src/lib/gemini.ts` ≈ 0; logs visibles con formato del logger.

## Registro de decisiones

- (vacío)
