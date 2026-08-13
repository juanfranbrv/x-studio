# Programar en Postiz — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un botón en el lienzo de imagen que manda la pieza recién generada a Postiz y la programa para una fecha, dejando rastro en la Biblioteca.

**Architecture:** Un módulo puro (`src/lib/postiz/`) habla HTTP con la API pública de Postiz y no conoce Next, Convex ni Clerk. Una server action lo orquesta: comprueba permisos, resuelve la URL de la imagen, llama a Postiz y anota el resultado. Las credenciales viven por usuario en Convex, autorizadas con los mismos helpers que campañas.

**Tech Stack:** Next.js 15 (server actions), Convex, Clerk, Vitest, shadcn/ui, lucide-react.

Diseño aprobado: `docs/superpowers/specs/2026-08-13-programar-en-postiz-design.md` (commit `b8a679a`).

## Global Constraints

- **Idioma**: todo el texto de interfaz en castellano. Comentarios de código en castellano sin tildes que rompan (el repo mezcla; seguir el fichero que se toca).
- **UTF-8 estricto**: antes de cerrar, `rg -n -P "\u00C3|\u00C2|\uFFFD" src` no debe devolver nada (AGENTS.md §16).
- **Reutilizar componentes** (AGENTS.md §19): `Dialog`, `Input`, `Select`, `Button` de `src/components/ui/`. **Prohibido crear un componente de calendario.**
- **No tocar estilos de shadcn** (AGENTS.md §11): usar `variant`, nunca colores literales.
- **Iconos**: solo `lucide-react`.
- **Convex es producción real** (AGENTS.md): cada `npx convex dev --once` publica en la web pública. **Antes de aplicar el cambio de esquema, avisar a Juanfran y esperar confirmación.**
- **Ficheros manejables** (AGENTS.md §12): si un componente pasa de ~250-300 líneas, dividirlo.
- Ejecutar tests con `npx vitest run <ruta>`; el script del repo es `npm test` (vitest en modo observación).

## Contrato real de la API de Postiz

Verificado el 2026-08-13 contra el código fuente en `F:\postiz`, no supuesto.

- **Base**: `{base_url}/api/public/v1` — con `base_url = https://postiz.postlaboratory.com`.
- **Autenticación**: cabecera `Authorization` con **la clave en crudo**, sin `Bearer`
  (`apps/backend/src/services/auth/public.auth.middleware.ts`).
- `GET /integrations` → `[{ id, name, identifier, picture, disabled, profile, customer? }]`
  donde `identifier` es la plataforma (`instagram`, `facebook`, …).
- `POST /upload-from-url` con `{ url }` → devuelve el medio guardado, con `id` y `path`.
  Usa un `ssrfSafeDispatcher`: **solo acepta URLs públicas**. Las de Convex Storage lo son.
- `POST /posts` con el cuerpo de `CreatePostDto`
  (`libraries/nestjs-libraries/src/dtos/posts/create.post.dto.ts`):

```jsonc
{
  "type": "schedule",          // 'draft' | 'schedule' | 'now' | 'update'
  "shortLink": false,          // obligatorio; false conserva el texto literal
  "date": "2026-08-21T09:30:00+02:00",
  "tags": [],                  // obligatorio, puede ir vacío
  "posts": [
    {
      "integration": { "id": "<id de integración>" },
      "value": [
        {
          "content": "<texto de la publicación>",
          "image": [{ "id": "<id del medio>", "path": "<path del medio>" }]
        }
      ],
      "settings": { "__type": "instagram", "post_type": "post" }
    }
  ]
}
```

`settings.__type` es el discriminador y **debe coincidir con `identifier`**. En la base
de datos real conviven `{"__type":"instagram","post_type":"post"}` y
`{"post_type":"post","__type":"facebook"}`: **Facebook también lleva `post_type`**.

## Desviación deliberada del diseño: el fallo parcial desaparece

El diseño (§7.2) pedía informar canal por canal y reintentar solo el fallido, porque en
la campaña BAU-31 Instagram falló y Facebook entró.

Al leer el contrato real se ve que **aquel fallo venía del CLI, que hace una petición por
canal**. Este cliente manda **todos los canales en una sola petición** (`posts` es un
array), y `class-validator` valida el array completo antes de crear nada: o entran todos
o no entra ninguno. El fallo parcial **no puede ocurrir en la creación**.

Por tanto no se implementa gestión por canal: se elimina la causa en vez de gestionar el
síntoma. Lo que sí puede fallar por separado es la **publicación** posterior, y de eso ya
avisa el bot de Telegram del VPS.

Consecuencia para los tests: la garantía que hay que probar no es "informa de cuál falló"
sino **"si la creación falla, no se anota nada"** (Tarea 4, paso 1).

## Prerrequisito manual (Juanfran)

Antes de la Tarea 6 hace falta una clave de API de Postiz: entrar en
`https://srv734820.hstgr.cloud` → Ajustes → API pública, y generarla. Las tareas 1 a 5
se completan sin ella.

## File Structure

| Fichero | Responsabilidad |
|---|---|
| `src/lib/postiz/types.ts` | Tipos del contrato: integración, medio, petición de creación |
| `src/lib/postiz/errors.ts` | Errores tipados distinguibles: auth, red, límite, respuesta |
| `src/lib/postiz/client.ts` | Las tres llamadas HTTP. Puro: recibe `{baseUrl, apiKey}` |
| `src/lib/postiz/__tests__/client.test.ts` | Contrato del cliente con `fetch` simulado |
| `convex/schema.ts` | Tabla `postiz_accounts` + campos nuevos en la anotación |
| `convex/postizAccounts.ts` | Guardar/leer credenciales, autorizado |
| `convex/contentLibrary.ts` | Mutación que marca una pieza como programada |
| `convex/lib/__tests__/postiz-authz.test.ts` | Que las funciones nuevas exigen admin |
| `src/app/actions/schedule-to-postiz.ts` | Orquestación |
| `src/app/actions/__tests__/schedule-to-postiz.test.ts` | Orden, permisos, fallo parcial |
| `src/components/studio/ScheduleToPostizDialog.tsx` | El diálogo |
| `src/components/studio/CanvasPanel.tsx` | El botón que lo abre |

---

### Task 1: Cliente HTTP de Postiz

Módulo puro y aislado. Es la única pieza que sabe cómo habla Postiz.

**Files:**
- Create: `src/lib/postiz/types.ts`
- Create: `src/lib/postiz/errors.ts`
- Create: `src/lib/postiz/client.ts`
- Test: `src/lib/postiz/__tests__/client.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type PostizIntegration = { id: string; name: string; identifier: string; picture?: string; disabled?: boolean }`
  - `type PostizMedia = { id: string; path: string }`
  - `type PostizCredentials = { baseUrl: string; apiKey: string }`
  - `type ScheduleTarget = { integrationId: string; identifier: string }`
  - `listIntegrations(c: PostizCredentials): Promise<PostizIntegration[]>`
  - `uploadFromUrl(c: PostizCredentials, url: string): Promise<PostizMedia>`
  - `createPost(c: PostizCredentials, input: CreatePostInput): Promise<{ groupId: string }>`
  - `CreatePostInput = { date: string; content: string; media: PostizMedia; targets: ScheduleTarget[] }`
  - Errores: `PostizAuthError`, `PostizUnreachableError`, `PostizRateLimitError`, `PostizResponseError` (todos con `.message` en castellano).

- [ ] **Step 1: Escribir los errores tipados**

Crear `src/lib/postiz/errors.ts`:

```ts
/** Errores del cliente de Postiz, distinguibles para que la interfaz sepa qué decir. */

export class PostizAuthError extends Error {
    constructor() {
        super('Postiz rechazo la clave de API.')
        this.name = 'PostizAuthError'
    }
}

export class PostizUnreachableError extends Error {
    constructor(cause?: unknown) {
        super('No se pudo contactar con Postiz.')
        this.name = 'PostizUnreachableError'
        this.cause = cause
    }
}

export class PostizRateLimitError extends Error {
    constructor() {
        super('Postiz esta limitando las peticiones. Prueba en unos minutos.')
        this.name = 'PostizRateLimitError'
    }
}

export class PostizResponseError extends Error {
    readonly status: number
    constructor(status: number, detail?: string) {
        super(detail ? `Postiz respondio ${status}: ${detail}` : `Postiz respondio ${status}.`)
        this.name = 'PostizResponseError'
        this.status = status
    }
}
```

- [ ] **Step 2: Escribir los tipos**

Crear `src/lib/postiz/types.ts`:

```ts
/** Tipos del contrato de la API publica v1 de Postiz. */

export type PostizCredentials = {
    /** Origen de la instancia, sin barra final. Ej.: https://postiz.postlaboratory.com */
    baseUrl: string
    /** Clave de organizacion. Viaja en la cabecera Authorization EN CRUDO, sin 'Bearer'. */
    apiKey: string
}

export type PostizIntegration = {
    id: string
    name: string
    /** Plataforma: 'instagram', 'facebook', ... Debe coincidir con settings.__type */
    identifier: string
    picture?: string
    disabled?: boolean
}

export type PostizMedia = {
    id: string
    path: string
}

export type ScheduleTarget = {
    integrationId: string
    identifier: string
}

export type CreatePostInput = {
    /** ISO con desplazamiento explicito. Ej.: 2026-08-21T09:30:00+02:00 */
    date: string
    content: string
    media: PostizMedia
    targets: ScheduleTarget[]
}
```

- [ ] **Step 3: Escribir el test que falla**

Crear `src/lib/postiz/__tests__/client.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPost, listIntegrations, uploadFromUrl } from '../client'
import { PostizAuthError, PostizRateLimitError, PostizUnreachableError } from '../errors'

const credenciales = { baseUrl: 'https://postiz.ejemplo.com', apiKey: 'clave-secreta' }

const respuesta = (body: unknown, status = 200) =>
    Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
    } as Response)

describe('cliente de Postiz', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it('manda la clave en crudo, sin Bearer', async () => {
        const fetchMock = vi.fn().mockReturnValue(respuesta([]))
        vi.stubGlobal('fetch', fetchMock)

        await listIntegrations(credenciales)

        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe('https://postiz.ejemplo.com/api/public/v1/integrations')
        expect((init.headers as Record<string, string>).Authorization).toBe('clave-secreta')
    })

    it('traduce un 401 a PostizAuthError', async () => {
        vi.stubGlobal('fetch', vi.fn().mockReturnValue(respuesta({ msg: 'No API Key found' }, 401)))
        await expect(listIntegrations(credenciales)).rejects.toBeInstanceOf(PostizAuthError)
    })

    it('traduce un 429 a PostizRateLimitError', async () => {
        vi.stubGlobal('fetch', vi.fn().mockReturnValue(respuesta({}, 429)))
        await expect(listIntegrations(credenciales)).rejects.toBeInstanceOf(PostizRateLimitError)
    })

    it('traduce un fallo de red a PostizUnreachableError', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
        await expect(listIntegrations(credenciales)).rejects.toBeInstanceOf(PostizUnreachableError)
    })

    it('sube la imagen pasando la URL', async () => {
        const fetchMock = vi.fn().mockReturnValue(respuesta({ id: 'm1', path: 'https://cdn/x.png' }))
        vi.stubGlobal('fetch', fetchMock)

        const media = await uploadFromUrl(credenciales, 'https://convex/imagen.png')

        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe('https://postiz.ejemplo.com/api/public/v1/upload-from-url')
        expect(JSON.parse(init.body as string)).toEqual({ url: 'https://convex/imagen.png' })
        expect(media).toEqual({ id: 'm1', path: 'https://cdn/x.png' })
    })

    it('construye el cuerpo de creacion con la forma que exige Postiz', async () => {
        const fetchMock = vi.fn().mockReturnValue(respuesta([{ group: 'g-123' }]))
        vi.stubGlobal('fetch', fetchMock)

        await createPost(credenciales, {
            date: '2026-08-21T09:30:00+02:00',
            content: 'Hola',
            media: { id: 'm1', path: 'https://cdn/x.png' },
            targets: [
                { integrationId: 'i-ig', identifier: 'instagram' },
                { integrationId: 'i-fb', identifier: 'facebook' },
            ],
        })

        const cuerpo = JSON.parse(fetchMock.mock.calls[0][1].body as string)
        expect(cuerpo.type).toBe('schedule')
        expect(cuerpo.shortLink).toBe(false)
        expect(cuerpo.date).toBe('2026-08-21T09:30:00+02:00')
        expect(cuerpo.tags).toEqual([])
        expect(cuerpo.posts).toHaveLength(2)
        expect(cuerpo.posts[0].integration).toEqual({ id: 'i-ig' })
        expect(cuerpo.posts[0].value[0].content).toBe('Hola')
        expect(cuerpo.posts[0].value[0].image).toEqual([{ id: 'm1', path: 'https://cdn/x.png' }])
        // El discriminador debe coincidir con la plataforma, y Facebook TAMBIEN lleva post_type
        expect(cuerpo.posts[0].settings).toEqual({ __type: 'instagram', post_type: 'post' })
        expect(cuerpo.posts[1].settings).toEqual({ __type: 'facebook', post_type: 'post' })
    })

    it('quita la barra final del origen para no generar rutas dobles', async () => {
        const fetchMock = vi.fn().mockReturnValue(respuesta([]))
        vi.stubGlobal('fetch', fetchMock)

        await listIntegrations({ baseUrl: 'https://postiz.ejemplo.com/', apiKey: 'k' })

        expect(fetchMock.mock.calls[0][0]).toBe('https://postiz.ejemplo.com/api/public/v1/integrations')
    })
})
```

- [ ] **Step 4: Ejecutar el test y comprobar que falla**

Run: `npx vitest run src/lib/postiz/__tests__/client.test.ts`
Expected: FAIL — `Failed to resolve import "../client"`.

- [ ] **Step 5: Implementar el cliente**

Crear `src/lib/postiz/client.ts`:

```ts
import {
    PostizAuthError,
    PostizRateLimitError,
    PostizResponseError,
    PostizUnreachableError,
} from './errors'
import type {
    CreatePostInput,
    PostizCredentials,
    PostizIntegration,
    PostizMedia,
} from './types'

/**
 * Cliente de la API publica v1 de Postiz.
 *
 * Modulo puro a proposito: no importa nada de Next, Convex ni Clerk. Asi se
 * prueba sin levantar nada, y exponerlo manana como ruta /api/v1 es envolverlo.
 */

const ruta = (baseUrl: string, camino: string) =>
    `${baseUrl.replace(/\/+$/, '')}/api/public/v1${camino}`

async function pedir<T>(
    credenciales: PostizCredentials,
    camino: string,
    init?: { method?: string; body?: unknown },
): Promise<T> {
    let respuesta: Response
    try {
        respuesta = await fetch(ruta(credenciales.baseUrl, camino), {
            method: init?.method ?? 'GET',
            headers: {
                // En crudo: Postiz NO espera el prefijo 'Bearer'.
                Authorization: credenciales.apiKey,
                'Content-Type': 'application/json',
            },
            ...(init?.body === undefined ? {} : { body: JSON.stringify(init.body) }),
        })
    } catch (error) {
        // fetch solo rechaza por fallo de red: DNS, conexion rechazada, timeout.
        throw new PostizUnreachableError(error)
    }

    if (respuesta.status === 401 || respuesta.status === 403) throw new PostizAuthError()
    if (respuesta.status === 429) throw new PostizRateLimitError()

    if (!respuesta.ok) {
        let detalle = ''
        try {
            detalle = await respuesta.text()
        } catch {
            // Un cuerpo ilegible no debe tapar el codigo de estado, que ya informa.
        }
        throw new PostizResponseError(respuesta.status, detalle.slice(0, 200))
    }

    return (await respuesta.json()) as T
}

export async function listIntegrations(
    credenciales: PostizCredentials,
): Promise<PostizIntegration[]> {
    const lista = await pedir<PostizIntegration[]>(credenciales, '/integrations')
    return Array.isArray(lista) ? lista : []
}

export async function uploadFromUrl(
    credenciales: PostizCredentials,
    url: string,
): Promise<PostizMedia> {
    const medio = await pedir<PostizMedia>(credenciales, '/upload-from-url', {
        method: 'POST',
        body: { url },
    })
    if (!medio?.id || !medio?.path) {
        throw new PostizResponseError(200, 'la subida no devolvio un medio utilizable')
    }
    return { id: medio.id, path: medio.path }
}

export async function createPost(
    credenciales: PostizCredentials,
    entrada: CreatePostInput,
): Promise<{ groupId: string }> {
    const cuerpo = {
        type: 'schedule' as const,
        // false conserva el texto literal: Postiz no reescribe los enlaces.
        shortLink: false,
        date: entrada.date,
        tags: [],
        posts: entrada.targets.map((destino) => ({
            integration: { id: destino.integrationId },
            value: [
                {
                    content: entrada.content,
                    image: [{ id: entrada.media.id, path: entrada.media.path }],
                },
            ],
            // __type es el discriminador y tiene que coincidir con la plataforma.
            settings: { __type: destino.identifier, post_type: 'post' },
        })),
    }

    const creado = await pedir<Array<{ group?: string }>>(credenciales, '/posts', {
        method: 'POST',
        body: cuerpo,
    })

    const groupId = Array.isArray(creado) ? creado[0]?.group : undefined
    if (!groupId) throw new PostizResponseError(200, 'Postiz no devolvio identificador de grupo')
    return { groupId }
}
```

- [ ] **Step 6: Ejecutar el test y comprobar que pasa**

Run: `npx vitest run src/lib/postiz/__tests__/client.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 7: Commit**

```bash
git add src/lib/postiz
git commit -m "feat(postiz): cliente de la API publica, aislado y probado"
```

---

### Task 2: Credenciales de Postiz por usuario, en Convex

**Files:**
- Modify: `convex/schema.ts` (añadir tabla)
- Create: `convex/postizAccounts.ts`
- Test: `convex/lib/__tests__/postiz-authz.test.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `requireSameUser` de `convex/lib/authz.ts`.
- Produces:
  - `postizAccounts.getStatus({ clerk_user_id })` → `{ configured: boolean; base_url?: string }` — **apta para el cliente**
  - `postizAccounts.getCredentials({ clerk_user_id })` → `{ base_url, api_key } | null` — **solo desde servidor**
  - `postizAccounts.save({ clerk_user_id, base_url, api_key })` → `null`

- [ ] **Step 1: Escribir el test de autorización que falla**

Crear `convex/lib/__tests__/postiz-authz.test.ts` (mismo estilo que `campaigns-authz.test.ts`, que verifica sobre el texto del módulo):

```ts
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(path.resolve(__dirname, '../../postizAccounts.ts'), 'utf8')

describe('Autorizacion de las credenciales de Postiz', () => {
    it('exige admin y la identidad del propio usuario en todas las operaciones', () => {
        expect(source).toContain('requireAdmin')
        expect(source).toContain('requireSameUser')
        // Las tres funciones exportadas pasan por el mismo portero.
        expect(source.match(/await requirePostizUser\(ctx, args\.clerk_user_id\)/g)?.length).toBe(3)
    })

    it('la consulta apta para el cliente no devuelve nunca la clave', () => {
        const getStatus = source.slice(source.indexOf('export const getStatus'), source.indexOf('export const getCredentials'))
        expect(getStatus).not.toContain('api_key:')
    })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run convex/lib/__tests__/postiz-authz.test.ts`
Expected: FAIL — `ENOENT ... postizAccounts.ts`.

- [ ] **Step 3: Añadir la tabla al esquema**

En `convex/schema.ts`, junto a las demás tablas:

```ts
  // Conexion a Postiz de cada usuario. Hoy solo existe la fila del administrador,
  // pero la forma ya admite que cada usuario apunte a SU propia instancia.
  postiz_accounts: defineTable({
    user_id: v.string(),
    base_url: v.string(),
    api_key: v.string(),
    created_at: v.string(),
    updated_at: v.string(),
  }).index("by_user", ["user_id"]),
```

- [ ] **Step 4: Implementar el módulo**

Crear `convex/postizAccounts.ts`:

```ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireSameUser } from "./lib/authz";

/**
 * Credenciales de Postiz por usuario.
 *
 * Hoy la funcionalidad esta restringida al administrador, pero el modelo ya es
 * por usuario para que abrirla no obligue a migrar nada.
 */

type Ctx = Parameters<Parameters<typeof query>[0]["handler"]>[0];

async function requirePostizUser(ctx: Ctx, clerkUserId: string) {
  await requireAdmin(ctx);
  await requireSameUser(ctx, clerkUserId);
}

const buscar = async (ctx: Ctx, userId: string) =>
  await ctx.db
    .query("postiz_accounts")
    .withIndex("by_user", (q) => q.eq("user_id", userId))
    .unique();

/** Apta para el cliente: dice si hay conexion, nunca la clave. */
export const getStatus = query({
  args: { clerk_user_id: v.string() },
  handler: async (ctx, args) => {
    await requirePostizUser(ctx, args.clerk_user_id);
    const fila = await buscar(ctx, args.clerk_user_id);
    return { configured: !!fila, base_url: fila?.base_url };
  },
});

/** SOLO desde servidor. No invocar jamas desde un componente de cliente. */
export const getCredentials = query({
  args: { clerk_user_id: v.string() },
  handler: async (ctx, args) => {
    await requirePostizUser(ctx, args.clerk_user_id);
    const fila = await buscar(ctx, args.clerk_user_id);
    if (!fila) return null;
    return { base_url: fila.base_url, api_key: fila.api_key };
  },
});

export const save = mutation({
  args: {
    clerk_user_id: v.string(),
    base_url: v.string(),
    api_key: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePostizUser(ctx, args.clerk_user_id);
    const ahora = new Date().toISOString();
    const fila = await buscar(ctx, args.clerk_user_id);
    // Se normaliza el origen aqui para que el cliente HTTP no tenga que adivinar.
    const base_url = args.base_url.trim().replace(/\/+$/, "");

    if (fila) {
      await ctx.db.patch(fila._id, { base_url, api_key: args.api_key, updated_at: ahora });
      return null;
    }
    await ctx.db.insert("postiz_accounts", {
      user_id: args.clerk_user_id,
      base_url,
      api_key: args.api_key,
      created_at: ahora,
      updated_at: ahora,
    });
    return null;
  },
});
```

- [ ] **Step 5: Ejecutar el test y comprobar que pasa**

Run: `npx vitest run convex/lib/__tests__/postiz-authz.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: PARAR y avisar a Juanfran antes de publicar el esquema**

El cambio de esquema toca el Convex que sirve la web pública. **No ejecutar
`npx convex dev --once` sin su confirmación explícita.** Cuando la dé:

Run: `npx convex dev --once`
Expected: sin errores; la tabla `postiz_accounts` aparece en el panel.

- [ ] **Step 7: Commit**

```bash
git add convex/schema.ts convex/postizAccounts.ts convex/lib/__tests__/postiz-authz.test.ts
git commit -m "feat(postiz): credenciales por usuario en Convex, restringidas a admin"
```

---

### Task 3: Marcar la pieza como programada

**Files:**
- Modify: `convex/schema.ts` (dos campos opcionales en `content_asset_annotations`)
- Modify: `convex/contentLibrary.ts` (mutación nueva)
- Modify: `src/components/library/contentLibraryTypes.ts` (nuevo estado)

**Interfaces:**
- Consumes: nada de tareas previas.
- Produces:
  - `contentLibrary.markScheduled({ user_id, asset_key, planned_at, postiz_group_id, postiz_base_url })` → `null`
  - `contentLibrary.getAnnotation({ user_id, asset_key })` → `{ status, planned_at?, postiz_group_id?, postiz_base_url? } | null`

`getAnnotation` es lo que permite al diálogo saber que una pieza **ya se programó**.
Hoy `contentLibrary.ts` solo tiene `listAssets`, que trae la lista entera: pedir todo el
catálogo para mirar una anotación sería un desperdicio.

- [ ] **Step 1: Añadir los campos al esquema**

En `convex/schema.ts`, dentro de `content_asset_annotations`, junto a `notes`:

```ts
    // Rastro de la programacion en Postiz. Opcionales: las piezas antiguas no lo tienen.
    postiz_group_id: v.optional(v.string()),
    postiz_base_url: v.optional(v.string()),
```

- [ ] **Step 2: Añadir el estado nuevo al tipo de la Biblioteca**

En `src/components/library/contentLibraryTypes.ts`, ampliar la unión:

```ts
export type ContentAssetStatus = 'draft' | 'selected' | 'ready' | 'scheduled' | 'published_manual' | 'discarded'
```

Y en `src/app/library/page.tsx`, añadirlo a `STATUS_KEYS` **entre `ready` y `published_manual`**:

```ts
const STATUS_KEYS: ContentAssetStatus[] = ['draft', 'selected', 'ready', 'scheduled', 'published_manual', 'discarded']
```

Añadir su etiqueta en los ficheros de traducción que ya usen las demás claves de estado
(buscar con `rg -n "published_manual" src/locales`) — mismo formato, texto
`"Programada"` en `es-ES` y `"Scheduled"` en `en-US`.

- [ ] **Step 3: Escribir la mutación**

En `convex/contentLibrary.ts`, siguiendo el estilo de las mutaciones vecinas:

```ts
/**
 * Deja constancia de que la pieza se programo en Postiz.
 *
 * Se llama SIEMPRE en ultimo lugar, cuando Postiz ya ha confirmado la creacion:
 * asi la Biblioteca nunca dice "programada" sobre algo que no se programo.
 */
export const markScheduled = mutation({
  args: {
    user_id: v.string(),
    asset_key: v.string(),
    planned_at: v.string(),
    postiz_group_id: v.string(),
    postiz_base_url: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.user_id);
    const ahora = new Date().toISOString();
    const existente = await ctx.db
      .query("content_asset_annotations")
      .withIndex("by_user_asset", (q) =>
        q.eq("user_id", args.user_id).eq("asset_key", args.asset_key),
      )
      .unique();

    const campos = {
      status: "scheduled",
      planned_at: args.planned_at,
      postiz_group_id: args.postiz_group_id,
      postiz_base_url: args.postiz_base_url,
      updated_at: ahora,
    };

    if (existente) {
      await ctx.db.patch(existente._id, campos);
      return null;
    }
    await ctx.db.insert("content_asset_annotations", {
      user_id: args.user_id,
      asset_key: args.asset_key,
      created_at: ahora,
      ...campos,
    });
    return null;
  },
});
```

Y la consulta que lee la anotación de una sola pieza:

```ts
/** Lee la anotacion de UNA pieza. La usa el dialogo para detectar duplicados. */
export const getAnnotation = query({
  args: { user_id: v.string(), asset_key: v.string() },
  handler: async (ctx, args) => {
    await requireSameUser(ctx, args.user_id);
    const fila = await ctx.db
      .query("content_asset_annotations")
      .withIndex("by_user_asset", (q) =>
        q.eq("user_id", args.user_id).eq("asset_key", args.asset_key),
      )
      .unique();
    if (!fila) return null;
    return {
      status: fila.status,
      planned_at: fila.planned_at,
      postiz_group_id: fila.postiz_group_id,
      postiz_base_url: fila.postiz_base_url,
    };
  },
});
```

Comprobar que `requireSameUser` y `query` ya están importados en el fichero; si no,
añadirlos a los imports existentes.

- [ ] **Step 4: Comprobar que el proyecto sigue compilando**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos. Si `ContentAssetStatus` provoca fallos de exhaustividad en
algún `switch`, añadir el caso `scheduled` allí donde aparezca.

- [ ] **Step 5: Publicar el esquema (con la misma confirmación de la Tarea 2)**

Run: `npx convex dev --once`

- [ ] **Step 6: Commit**

```bash
git add convex/schema.ts convex/contentLibrary.ts src/components/library/contentLibraryTypes.ts src/app/library/page.tsx src/locales
git commit -m "feat(biblioteca): estado 'programada' y rastro del post de Postiz"
```

---

### Task 4: La server action que orquesta

Es el corazón del comportamiento: permisos, orden y fallo parcial.

**Files:**
- Create: `src/app/actions/schedule-to-postiz.ts`
- Test: `src/app/actions/__tests__/schedule-to-postiz.test.ts`

**Interfaces:**
- Consumes: `listIntegrations`, `uploadFromUrl`, `createPost` (Tarea 1); `postizAccounts.getCredentials` (Tarea 2); `contentLibrary.markScheduled` (Tarea 3); `persistGeneratedImage` de `src/lib/campaigns/store-image.ts`.
- Produces:
  - `fetchPostizChannels()` → `{ ok: true; channels: PostizIntegration[] } | { ok: false; error: string }`
  - `scheduleToPostiz(input)` → `{ ok: true; groupId: string } | { ok: false; error: string }`
  - `ScheduleInput = { assetKey: string; imageUrl: string; content: string; date: string; targets: ScheduleTarget[] }`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/app/actions/__tests__/schedule-to-postiz.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const persistGeneratedImage = vi.fn()
const listIntegrations = vi.fn()
const uploadFromUrl = vi.fn()
const createPost = vi.fn()
const authedFetchQuery = vi.fn()
const authedFetchMutation = vi.fn()
const requireAdminUser = vi.fn()

vi.mock('@/lib/campaigns/store-image', () => ({ persistGeneratedImage }))
vi.mock('@/lib/postiz/client', () => ({ listIntegrations, uploadFromUrl, createPost }))
vi.mock('@/lib/convex-server', () => ({ authedFetchQuery, authedFetchMutation }))
vi.mock('@/lib/postiz/guard', () => ({ requireAdminUser }))

const { scheduleToPostiz } = await import('../schedule-to-postiz')

const entrada = {
    assetKey: 'image:s1:g1',
    imageUrl: 'data:image/png;base64,AAAA',
    content: 'Texto de la publicacion',
    date: '2026-08-21T09:30:00+02:00',
    targets: [
        { integrationId: 'i-ig', identifier: 'instagram' },
        { integrationId: 'i-fb', identifier: 'facebook' },
    ],
}

describe('scheduleToPostiz', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        requireAdminUser.mockResolvedValue({ userId: 'u1' })
        authedFetchQuery.mockResolvedValue({ base_url: 'https://postiz.ejemplo.com', api_key: 'k' })
        persistGeneratedImage.mockResolvedValue('https://convex/imagen.png')
        uploadFromUrl.mockResolvedValue({ id: 'm1', path: 'https://cdn/x.png' })
        createPost.mockResolvedValue({ groupId: 'g-123' })
        authedFetchMutation.mockResolvedValue(null)
    })

    it('rechaza a quien no es administrador y no toca Postiz', async () => {
        requireAdminUser.mockRejectedValue(new Error('no autorizado'))

        const resultado = await scheduleToPostiz(entrada)

        expect(resultado.ok).toBe(false)
        expect(createPost).not.toHaveBeenCalled()
    })

    it('avisa si no hay Postiz configurado', async () => {
        authedFetchQuery.mockResolvedValue(null)

        const resultado = await scheduleToPostiz(entrada)

        expect(resultado.ok).toBe(false)
        expect(resultado.ok === false && resultado.error).toContain('configurad')
        expect(uploadFromUrl).not.toHaveBeenCalled()
    })

    it('sube la imagen, crea el post y SOLO ENTONCES anota', async () => {
        const orden: string[] = []
        uploadFromUrl.mockImplementation(async () => { orden.push('subir'); return { id: 'm1', path: 'p' } })
        createPost.mockImplementation(async () => { orden.push('crear'); return { groupId: 'g-123' } })
        authedFetchMutation.mockImplementation(async () => { orden.push('anotar'); return null })

        const resultado = await scheduleToPostiz(entrada)

        expect(resultado).toEqual({ ok: true, groupId: 'g-123' })
        expect(orden).toEqual(['subir', 'crear', 'anotar'])
    })

    it('si falla la creacion NO anota nada', async () => {
        createPost.mockRejectedValue(new Error('Postiz respondio 500.'))

        const resultado = await scheduleToPostiz(entrada)

        expect(resultado.ok).toBe(false)
        expect(authedFetchMutation).not.toHaveBeenCalled()
    })

    it('persiste la imagen antes de dar la URL a Postiz', async () => {
        await scheduleToPostiz(entrada)

        expect(persistGeneratedImage).toHaveBeenCalledWith(entrada.imageUrl)
        expect(uploadFromUrl).toHaveBeenCalledWith(expect.anything(), 'https://convex/imagen.png')
    })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run src/app/actions/__tests__/schedule-to-postiz.test.ts`
Expected: FAIL — no se resuelve `../schedule-to-postiz`.

- [ ] **Step 3: Escribir el portero de permisos**

Crear `src/lib/postiz/guard.ts`:

```ts
import { auth, currentUser } from '@clerk/nextjs/server'
import { isAdminEmail } from '@/lib/auth-config'

/**
 * Comprobacion temprana en Next para no ensenar un dialogo condenado.
 * El control AUTORITATIVO vive en Convex (requireAdmin + requireSameUser):
 * una comprobacion que solo estuviera aqui se esquiva llamando a Convex.
 */
export async function requireAdminUser(): Promise<{ userId: string }> {
    const { userId } = await auth()
    if (!userId) throw new Error('Hay que iniciar sesion.')

    const user = await currentUser()
    const email = user?.primaryEmailAddress?.emailAddress
    if (!isAdminEmail(email)) throw new Error('Esta funcion esta restringida al administrador.')

    return { userId }
}
```

- [ ] **Step 4: Implementar la acción**

Crear `src/app/actions/schedule-to-postiz.ts`:

```ts
'use server'

import { api } from '@/../convex/_generated/api'
import { persistGeneratedImage } from '@/lib/campaigns/store-image'
import { authedFetchMutation, authedFetchQuery } from '@/lib/convex-server'
import { createPost, listIntegrations, uploadFromUrl } from '@/lib/postiz/client'
import { requireAdminUser } from '@/lib/postiz/guard'
import type { PostizIntegration, ScheduleTarget } from '@/lib/postiz/types'

export type ScheduleInput = {
    assetKey: string
    /** data URL recien generada, o una URL remota ya servible */
    imageUrl: string
    content: string
    /** ISO con desplazamiento explicito */
    date: string
    targets: ScheduleTarget[]
}

type Resultado<T> = ({ ok: true } & T) | { ok: false; error: string }

const mensaje = (error: unknown) =>
    error instanceof Error ? error.message : 'Ocurrio un error inesperado.'

async function credencialesDe(userId: string) {
    const fila = await authedFetchQuery(api.postizAccounts.getCredentials, {
        clerk_user_id: userId,
    })
    if (!fila) return null
    return { baseUrl: fila.base_url, apiKey: fila.api_key }
}

/** Alimenta el selector de canales del dialogo. */
export async function fetchPostizChannels(): Promise<Resultado<{ channels: PostizIntegration[] }>> {
    try {
        const { userId } = await requireAdminUser()
        const credenciales = await credencialesDe(userId)
        if (!credenciales) return { ok: false, error: 'No hay ningun Postiz configurado todavia.' }

        const canales = await listIntegrations(credenciales)
        return { ok: true, channels: canales.filter((canal) => !canal.disabled) }
    } catch (error) {
        return { ok: false, error: mensaje(error) }
    }
}

export async function scheduleToPostiz(entrada: ScheduleInput): Promise<Resultado<{ groupId: string }>> {
    try {
        const { userId } = await requireAdminUser()

        const credenciales = await credencialesDe(userId)
        if (!credenciales) return { ok: false, error: 'No hay ningun Postiz configurado todavia.' }

        if (entrada.targets.length === 0) {
            return { ok: false, error: 'Hay que elegir al menos un canal.' }
        }

        // Postiz se descarga la imagen, asi que necesita una URL publica: si lo que
        // llega es una data URL, esto la sube a Convex Storage y devuelve la suya.
        const urlPublica = await persistGeneratedImage(entrada.imageUrl)
        const medio = await uploadFromUrl(credenciales, urlPublica)

        const { groupId } = await createPost(credenciales, {
            date: entrada.date,
            content: entrada.content,
            media: medio,
            targets: entrada.targets,
        })

        // El ultimo paso, siempre: si algo fallo antes, la Biblioteca no miente.
        await authedFetchMutation(api.contentLibrary.markScheduled, {
            user_id: userId,
            asset_key: entrada.assetKey,
            planned_at: entrada.date,
            postiz_group_id: groupId,
            postiz_base_url: credenciales.baseUrl,
        })

        return { ok: true, groupId }
    } catch (error) {
        return { ok: false, error: mensaje(error) }
    }
}
```

- [ ] **Step 5: Ejecutar el test y comprobar que pasa**

Run: `npx vitest run src/app/actions/__tests__/schedule-to-postiz.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add src/app/actions/schedule-to-postiz.ts src/app/actions/__tests__ src/lib/postiz/guard.ts
git commit -m "feat(postiz): accion que programa y deja rastro solo si Postiz confirma"
```

---

### Task 5: El diálogo y el botón

**Files:**
- Create: `src/components/studio/ScheduleToPostizDialog.tsx`
- Modify: `src/components/studio/CanvasPanel.tsx`

**Interfaces:**
- Consumes: `fetchPostizChannels`, `scheduleToPostiz` (Tarea 4).
- Produces: componente `<ScheduleToPostizDialog open onOpenChange assetKey imageUrl initialContent alreadyScheduledAt />`

- [ ] **Step 1: Crear el diálogo**

Crear `src/components/studio/ScheduleToPostizDialog.tsx`. Reutiliza `Dialog`, `Input`,
`Button` y `Textarea` existentes. **Sin componente de calendario**: `Input type="date"`
más `Input type="time"`, como ya hace `ContentAssetDetailPanel`.

Requisitos de comportamiento:

- Al abrirse, llama a `fetchPostizChannels()`. Mientras carga, muestra estado de espera;
  si falla, muestra el error y deja el botón de confirmar deshabilitado.
- Canales como casillas, con su nombre. Ninguno marcado por defecto.
- Texto en un `Textarea` precargado con `initialContent`, editable.
- Fecha y hora por defecto: mañana a las 09:30.
- `alreadyScheduledAt` sale de `contentLibrary.getAnnotation` (Tarea 3), consultada al
  abrirse con el `assetKey` recibido: si la anotación trae `postiz_group_id`, su
  `planned_at` es el valor a mostrar.
- Si `alreadyScheduledAt` tiene valor, muestra un aviso arriba —
  `Esta imagen ya se programo para el {fecha}.` — y **exige marcar una casilla de
  confirmación** antes de habilitar el botón.
- Valida antes de enviar: al menos un canal, texto no vacío, y fecha futura.
  Mensaje si la fecha está en el pasado: `La fecha tiene que ser futura.`
- Construye el `date` con desplazamiento explícito a partir de la zona del navegador,
  con este helper dentro del componente:

```ts
/** Convierte fecha y hora locales en ISO con desplazamiento explicito (+02:00). */
const componerFecha = (dia: string, hora: string) => {
    const local = new Date(`${dia}T${hora}:00`)
    const desfaseMin = -local.getTimezoneOffset()
    const signo = desfaseMin >= 0 ? '+' : '-'
    const abs = Math.abs(desfaseMin)
    const hh = String(Math.floor(abs / 60)).padStart(2, '0')
    const mm = String(abs % 60).padStart(2, '0')
    return `${dia}T${hora}:00${signo}${hh}:${mm}`
}
```

- Al confirmar, llama a `scheduleToPostiz`. Si `ok`, cierra y muestra un aviso de éxito
  con enlace a `{base}/launches`. Si no, **deja el diálogo abierto** con el error a la
  vista, para no perder el texto escrito.

Si el fichero se acerca a 300 líneas, extraer el selector de canales a
`ScheduleChannelPicker.tsx` en la misma carpeta (AGENTS.md §12).

- [ ] **Step 2: Añadir el botón en el lienzo**

En `src/components/studio/CanvasPanel.tsx`, junto a los controles que ya aparecen cuando
hay imagen generada, añadir un botón con icono `CalendarClock` de `lucide-react` y texto
`Programar en Postiz`. Solo se muestra si el usuario es administrador — reutilizar la
comprobación de administrador que ya use el panel; si no hay ninguna, usar
`isAdminEmail` de `@/lib/auth-config` con el correo de Clerk.

Al pulsarlo abre el diálogo con:
- `assetKey`: la misma clave que arma la Biblioteca, `image:{sessionId}:{generationId}`
- `imageUrl`: `currentImage`
- `initialContent`: `creationState.caption` más los hashtags, unidos por dos saltos de línea

- [ ] **Step 3: Comprobar tipos y estilo**

Run: `npx tsc --noEmit && npx eslint src/components/studio/ScheduleToPostizDialog.tsx src/components/studio/CanvasPanel.tsx`
Expected: sin errores.

- [ ] **Step 4: Comprobar que no hay mojibake**

Run: `rg -n -P "\u00C3|\u00C2|\uFFFD" src`
Expected: sin coincidencias.

- [ ] **Step 5: Verificación visual**

Arrancar `npm run dev` y el navegador de depuración (`npm run chrome:debug`), entrar en
`localhost:3000` (**no** `127.0.0.1`: Clerk da 403 en dev), generar una imagen y abrir el
diálogo. Comprobar que los canales cargan, que la validación de fecha pasada salta, y que
el error se ve si se confirma sin canales.

- [ ] **Step 6: Commit**

```bash
git add src/components/studio
git commit -m "feat(lienzo): boton y dialogo para programar en Postiz"
```

---

### Task 6: Verificación contra el Postiz real

Los tests automáticos no tocan Postiz nunca. Esto se hace **una vez**, a mano.

**Files:** ninguno.

- [ ] **Step 1: Configurar la conexión**

Con la clave del prerrequisito, guardar la fila mediante `postizAccounts.save` con
`base_url = https://postiz.postlaboratory.com`.

- [ ] **Step 2: Programar una pieza de prueba a seis meses vista**

Generar una imagen, pulsar el botón, elegir **solo Instagram**, poner una fecha a seis
meses. Confirmar.

Expected: aviso de éxito con identificador de grupo.

- [ ] **Step 3: Comprobar en Postiz**

Abrir `https://srv734820.hstgr.cloud` y verificar que la publicación aparece en el
calendario, en la fecha correcta y **con la imagen visible**.

- [ ] **Step 4: Comprobar el rastro en la Biblioteca**

La pieza debe figurar como `Programada`, con esa misma fecha.

- [ ] **Step 5: Comprobar que el aviso de duplicado salta**

Pulsar otra vez el botón sobre la misma imagen. Debe avisar de que ya está programada y
pedir confirmación extra.

- [ ] **Step 6: Borrar la publicación de prueba**

Desde el calendario de Postiz, o con
`DELETE /api/public/v1/posts/{id}` usando la cabecera `Authorization`.

Expected: desaparece del calendario. **No se ha publicado nada.**

- [ ] **Step 7: Anotar el resultado**

Añadir a `docs/API_AUTOMATIZACION.md` una nota corta en §11 diciendo que la integración
directa existe para pieza suelta, con enlace al diseño, para que el documento no siga
afirmando que Postiz queda fuera de alcance.

```bash
git add docs/API_AUTOMATIZACION.md
git commit -m "docs: la integracion directa con Postiz existe para pieza suelta"
```
