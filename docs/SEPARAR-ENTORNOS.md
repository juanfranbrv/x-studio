# Operación: separar entornos de desarrollo y producción

> **Estado: EN CURSO.** Fase 0 completada el 2026-08-14. Resto pendiente.
> **Este documento es autosuficiente:** contiene todo lo necesario para continuar sin
> haber participado en la investigación. Si lo retoma otro agente, empieza por §1 y §2.
> Decisión tomada por Juanfran el 2026-08-14 tras ver el diagnóstico de §2.

---

## 1. Qué problema resuelve esto

Juanfran veía **imágenes y kits distintos según trabajase en su despacho (localhost) o
fuera (postlaboratory.com)**, y la Biblioteca aparecía vacía al entrar, con el mensaje
"No pudimos recuperar tus kits". Llevaba meses así.

Durante meses se atribuyó a una "carrera del token de Clerk". **Era un diagnóstico
erróneo.** La causa real está en §2.

## 2. Causa raíz (verificada, no supuesta)

### 2.1 El síntoma medido

Traza capturada en el fallo real (instrumentación del commit `38842ac`):

```json
{"success":true,"count":0,"diag":{
  "arg":"user_37R8MiIJvgY7ZIQaMyDnQCqDl5t",
  "authUserId":"user_37R8MiIJvgY7ZIQaMyDnQCqDl5t",
  "match":true,"brandsIsArray":true,"brandsLen":0}}
```

El servidor ve al usuario, coincide con el argumento, la consulta se ejecuta y Convex
devuelve un array **realmente vacío**. No falta ningún token: Convex dice la verdad.

### 2.2 Por qué está vacío

Juanfran tiene **dos identidades de Clerk con el mismo correo**, y **una sola base de
datos** compartida:

```
LOCAL  → .env.local pk_test/sk_test → supreme-chipmunk-83.clerk.accounts.dev
         → identidad user_37R8MiIJvgY7ZIQaMyDnQCqDl5t
PROD   → pk_live                    → clerk.postlaboratory.com
         → identidad user_3AB2BmaIPSkUvq1jIap4rKqRqdL
CONVEX → prestigious-pigeon-784, EL MISMO para los dos
```

`convex/auth.config.ts` acepta los dos emisores (`CLERK_ISSUER_URL` +
`CLERK_DEV_ISSUER_URL`), así que ambos tokens son válidos; simplemente su `subject` es
un usuario distinto.

### 2.3 El mecanismo exacto

`convex/users.ts:48` → `migrateUserOwnershipIfNeeded()`, llamada desde `upsertUser`:

```ts
...brandDNA.map((item) => ctx.db.patch(item._id, { clerk_user_id: newClerkId })),
```

Cuando entra un `clerk_id` nuevo con un correo ya existente, **reasigna los datos al
identificador de turno**. Con dos identidades, los kits rebotan:

```
entra en PROD  → los kits pasan a user_3AB2Bma...
entra en LOCAL → los kits pasan a user_37R8Mi...
vuelve a PROD  → vuelven a user_3AB2Bma...
```

El "0 kits" es **la ventana entre que la página pide los kits y que `upsertUser` termina
de migrarlos**. `upsertUser` se llama de forma perezosa, NO antes de la primera lectura.
Por eso al recargar o al pasar a `/image` ya aparecen.

### 2.4 Y lo peor: los datos partidos

La migración SOLO cubre `brand_dna`, `brands`, `presets`, `feedback`. **NO cubre**
`work_sessions`, `session_images`, `content_asset_annotations`, `content_campaigns`,
`postiz_accounts`, `credit_transactions`.

Medido con `npx convex data`:

| tabla                     | user_3AB2Bma (prod) | user_37R8Mi (local) |
|---------------------------|---------------------|---------------------|
| work_sessions             | **116**             | **58**              |
| content_asset_annotations | **84**              | **77**              |

**El trabajo real de Juanfran lleva meses partiéndose en dos.** Los kits le siguen; las
imágenes no.

## 3. Decisión tomada y por qué

**Separar en dos bases de datos**: local con su propia base de pruebas, producción
intacta.

Se descartó la alternativa (unificar en una sola identidad) porque **no cerraba el riesgo
principal**: hoy trabajar en local es trabajar en producción, y cualquier error mientras
se desarrolla toca datos reales sin marcha atrás. `AGENTS.md` ya marcaba ese riesgo en
mayúsculas y sin resolver.

Coste aceptado conscientemente por Juanfran: **en local dejará de ver su trabajo real**.
A cambio, produce siempre en `postlaboratory.com`. Su duda ("no siempre tengo claro dónde
estoy") se mitiga con el indicador visible de la Fase 4, no con arquitectura.

## 4. Estado de partida (2026-08-14)

| Deployment Convex | Etiqueta de Convex | Realidad |
|---|---|---|
| `prestigious-pigeon-784` | "Development" | **Tiene TODOS los datos y sirve postlaboratory.com** |
| `watchful-retriever-328` | "Production" | **Vacío**, 0 llamadas, nadie lo usa |

⚠ **No dejarse engañar por las etiquetas.** Ver `AGENTS.md` §CONVEX.

`NEXT_PUBLIC_CONVEX_URL` en Vercel (producción) apunta a `prestigious-pigeon-784`.
Es la única variable de Convex en Vercel: cliente y servidor usan la misma.

---

## 5. Plan de ejecución

### Fase 0 — Copia de seguridad ✅ COMPLETADA (2026-08-14)

Este proyecto **no tenía backups** ("No backup yet" en el panel de Convex).

```bash
npx convex export --path ".backups/convex-2026-08-14.zip"
```

Resultado: `.backups/convex-2026-08-14.zip`, 728 KB, 34 tablas. `.backups/` añadido al
`.gitignore` (datos reales, nunca al repositorio).

**Antes de cualquier fase destructiva, repetir el export con la fecha del día.**

### Fase 1 — Crear la base de desarrollo ⏳ PENDIENTE

**Principio rector: NO se mueven los datos de producción.** `prestigious-pigeon-784` se
queda como está, sirviendo a `postlaboratory.com`. Lo que se crea es una base nueva y
vacía para local. Así la operación es reversible: si algo va mal, se revierte
`.env.local` y todo vuelve a estar como antes.

Opción recomendada: **proyecto nuevo de Convex** (p. ej. `x-studio-dev`), en vez de
reutilizar `watchful-retriever-328`, para no arrastrar la confusión de etiquetas.

```bash
npx convex dev --once --configure=new
```

Verificación: el panel de Convex muestra el proyecto nuevo con las tablas del esquema
creadas y vacías.

### Fase 2 — Apuntar local a la base nueva ⏳ PENDIENTE

En `.env.local`, cambiar `CONVEX_DEPLOYMENT` y `NEXT_PUBLIC_CONVEX_URL` a los del
deployment nuevo. **Clerk se queda como está** (`pk_test`/`sk_test`): local con Clerk de
desarrollo + Convex de desarrollo es precisamente la combinación coherente.

⚠ **Guardar los valores antiguos comentados en el propio fichero**, para poder volver
atrás en segundos.

⚠ `CONVEX_DEPLOY_KEY` en `.env.local` apunta hoy a `prestigious-pigeon-784`. Revisar que
no siga forzando el deployment antiguo.

Verificación: `npx convex dev --once` reporta el deployment NUEVO, no
`prestigious-pigeon-784`.

### Fase 3 — Sembrar la configuración mínima ⏳ PENDIENTE

La base nueva estará vacía y la aplicación necesita filas de configuración para arrancar.
Revisar como mínimo: `app_settings`, `system_prompts`, `model_costs`, `billing_packs`.

Se pueden extraer del export de la Fase 0 (el zip trae un `.jsonl` por tabla) e
importarlas **solo esas** al deployment nuevo. **NO importar datos de usuarios.**

Verificación: entrar en `localhost:3000`, crear un kit de marca de prueba y generar algo.

### Fase 4 — Indicador visible de entorno ⏳ PENDIENTE

Requisito explícito de Juanfran: *"no siempre lo tengo claro"*.

Banda superior imposible de ignorar cuando NO se está en producción, del tipo
`LOCAL · datos de prueba`. Debe decidirse por la URL de Convex o por una variable de
entorno, **no** por `NODE_ENV` (un despliegue de vista previa también es "production").

Verificación: se ve en `localhost:3000` y NO se ve en `postlaboratory.com`.

### Fase 5 — Consolidar el trabajo ya partido en producción ⏳ PENDIENTE

**Esta es la fase destructiva. Requiere backup del día y confirmación explícita.**

En producción quedan 58 sesiones y 77 activos bajo `user_37R8Mi...` que son **trabajo
real** hecho desde local. Hay que reasignarlos a la identidad buena.

- **Identidad destino: `user_3AB2BmaIPSkUvq1jIap4rKqRqdL`** — es la que tiene más trabajo
  (116 sesiones) y la única registrada en `users`, con los 58 créditos y ACADEMIA BAUSET.
- **Identidad origen: `user_37R8MiIJvgY7ZIQaMyDnQCqDl5t`** — ni siquiera existe en `users`.

Tablas a reasignar (campo entre paréntesis):

```
work_sessions (user_id)              session_images (user_id)
content_asset_annotations (user_id)  content_campaigns (user_id)
postiz_accounts (user_id)            credit_transactions (user_id)
brand_dna (clerk_user_id)            brands (owner_id)
presets (userId)                     feedback (userId)
```

⚠ **Cuidado con las colisiones**: `content_asset_annotations` tiene índice
`by_user_asset`, y `convex/postiz.ts` usa `.unique()` sobre él. Si el mismo `asset_key`
existe bajo las dos identidades, al reasignar habrá **dos filas iguales** y `.unique()`
empezará a lanzar. Hay que detectar duplicados ANTES y decidir con cuál quedarse.

Verificación: contar filas por identidad antes y después; la de origen debe quedar a 0 y
los totales deben cuadrar.

### Fase 6 — Cerrar el círculo ⏳ PENDIENTE

1. **Quitar la traza temporal** del commit `38842ac` (`__diag` en
   `src/app/actions/get-user-brand-kit.ts` y el `JSON.stringify` en
   `src/contexts/BrandKitContext.tsx`). Está viva en producción.
2. **Arreglar el mensaje que miente**: "No pudimos recuperar tus kits / La comprobación no
   devolvió un estado válido" cuando el estado SÍ era válido y el usuario simplemente no
   tiene kits. Confundir vacío-legítimo con error es lo que hizo perseguir el fantasma del
   token durante meses. Debe decir que no hay kits y ofrecer crear uno.
3. **Actualizar `AGENTS.md`**: la sección "⛔ CONVEX" describe el mundo de una sola base y
   quedará obsoleta.
4. **Decidir qué hacer con `migrateUserOwnershipIfNeeded`**: con entornos separados deja
   de dispararse en el día a día, pero sigue siendo una bomba si alguna vez vuelven a
   convivir dos identidades. Como mínimo, que cubra TODAS las tablas con dueño, o que
   deje de existir.

---

## 6. Cómo revertir

- **Fases 1–4**: restaurar los valores antiguos en `.env.local`. Nada de producción se ha
  tocado, así que la vuelta atrás es inmediata.
- **Fase 5**: es la única irreversible. Restaurar desde el export con
  `npx convex import`. Por eso el backup del día es obligatorio antes de ejecutarla.

## 7. Riesgos conocidos

| Riesgo | Mitigación |
|---|---|
| El proyecto no tenía backups | Hecho en Fase 0; repetir antes de la Fase 5 |
| Etiquetas de Convex engañosas (el "Development" es el real) | §4; no fiarse del nombre |
| Duplicados de `asset_key` al consolidar | Detectar antes (Fase 5) |
| Perder configuración al sembrar la base nueva | Extraer del export, no inventar |
| Que alguien crea que local es seguro antes de la Fase 4 | Hacer la Fase 4 pronto |

## 8. Referencias

- `AGENTS.md` → sección "⛔ CONVEX" (obsoleta tras esta operación)
- `convex/users.ts:48` → `migrateUserOwnershipIfNeeded`, el mecanismo del §2.3
- `src/app/actions/get-user-brand-kit.ts` → donde se capturó la traza
- `.superpowers/sdd/progress.md` → estado del trabajo de Postiz (no relacionado)
