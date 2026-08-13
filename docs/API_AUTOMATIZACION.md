# Automatización por lotes y API — contrato

> **Estado: PROPUESTA DE DISEÑO.** Nada de este documento está implementado todavía.
> Documento vivo: se actualiza a medida que se decide y se construye.
> Creado el 2026-08-11.

## 1. El problema

Una campaña real (Academia Bauset, agosto 2026) son **60 publicaciones**. Hoy el
proceso es: abrir el módulo de imagen, pegar el prompt, esperar, guardar la imagen,
renombrarla, repetir. Sesenta veces, a golpe de ratón.

El objetivo no es "generar imágenes en lote". Es **pasar de un plan de campaña a un
calendario lleno de contenido revisable**, sin intervención manual por pieza.

## 2. Principio rector: una tubería, tres puertas

Todo lo que hace el trabajo de verdad —resolver la marca, construir el prompt, encolar,
generar, reintentar, guardar en la Biblioteca— es **una sola tubería**. Encima de ella
se abren puertas:

| Puerta | Quién la usa | Cuándo |
|---|---|---|
| **UI de lote** en la plataforma | Juanfran, solo admin | Fase 1 |
| **API con key** | Clientes externos, scripts, n8n, Postiz | Fase 2 |
| **MCP / CLI** | Agentes (Claude), automatizaciones propias | Fase 3, casi gratis sobre la API |

La regla que evita duplicar esfuerzo: **la UI de lote consume la misma tubería que
consumiría un tercero.** En la implementación actual, esa tubería está cerrada al
administrador; la apertura a clientes externos requiere una decisión posterior y una
API key independiente.

**Los atajos en la tubería se pagan al doble. Los atajos en la fachada son gratis.**
Por eso la Fase 1 construye la tubería entera y **nada** de fachada (ni portal de keys,
ni docs públicas, ni cuotas por cliente).

## 3. Las cuatro costuras que se dejan puestas desde el día uno

Cuestan poco ahora y son un fastidio después:

1. **Ruta versionada** (`/api/v1/...`) aunque todavía no haya clientes.
2. **La autenticación pasa por una función intermedia** ("dame el usuario de esta
   petición"). En Fase 1 lee la sesión de Clerk; en Fase 2 se le *añade* el caso de la
   API key, sin tocar los endpoints.
3. **La tabla de trabajos nace con** `user_id`, `idempotency_key`, `source` y `status`.
   Añadirlos después, con lotes vivos, es una migración desagradable.
4. **Nada entra en el contrato que no queramos sostener**: fuera las claves de
   proveedor (`nagaApiKey`, `replicateApiKey`, `atlasApiKey`), fuera
   `promptAlreadyBuilt`, fuera las rutas de fichero de `layoutReference`.

## 4. El manifiesto de campaña

Un único formato JSON que sirve **a la vez** como fichero que se arrastra a la
plataforma y como cuerpo de la petición a la API.

**Se eligió JSON y no Markdown** porque el manifiesto lo va a generar una IA: con un
esquema publicado lo produce sin ambigüedad, se valida **antes de gastar un crédito**, y
un error dice "el post BAU-37 no tiene headline" en vez de fallar a mitad del lote.

### 4.1 Estructura

```jsonc
{
  "version": 1,
  "campaign": {
    "name": "Bauset · Matrículas agosto 2026",  // agrupa en la Biblioteca
    "brand": "academia-bauset",                  // marca (Brand Kit) que se aplica
    "defaults": {                                // se aplican a todo post que no lo pise
      "platform": "instagram",                   // instagram | tiktok | youtube | linkedin
      "format": "ig-square",                     // id de SOCIAL_FORMATS (ig-square, ig-story, ig-portrait-feed…)
      "style": "retrato-natural-calido",         // SLUG de estilo (nunca el _id de Convex)
      "layout": "clean",                         // id de layout (clean, full-bleed, frame…)
      "colors": ["#1a3d6d", "#f4b942"],          // opcional: pisa la paleta del Brand Kit
      "logo": true
    }
  },
  "posts": [
    {
      "ref": "BAU-01",                           // identificador tuyo; nombra la imagen resultante
      "scheduled_at": "2026-08-11T09:30:00+02:00", // cae en el Calendario de la Biblioteca
      "group": "General",                        // subcampaña, informativo
      "goal": "Anunciar que la matrícula 2026-2027 ya está abierta online.",
      "headline": "El curso 2026-2027 ya está abierto",
      "body": "Agosto también es para descansar, así que este año lo hemos dejado todo listo…",
      "cta": "Infórmate y matricúlate en nuestra web",
      "hashtags": ["#AcademiaBauset", "#Meliana"],
      "visual_note": "Aula luminosa, niños participando, colores vivos",  // opcional
      "style": "comic-tinta-bicolor"             // opcional: pisa el estilo por defecto
    }
  ]
}
```

### 4.2 Campos separados y prosa: ambos válidos

Un post puede describirse de dos maneras, y **las dos se admiten**:

- **Por campos** (`headline`, `body`, `cta`, `hashtags`): la plataforma ya los trata
  como campos estructurados y los inyecta en su sitio exacto del prompt compilado
  (`src/lib/pipeline/compilePrompt.ts`).
- **Por prosa** (`prompt`): el texto largo tal cual, como se pega hoy a mano en el
  módulo de imagen.

**Nota de diseño (rectificada el 2026-08-11):** la primera versión de este documento
defendía los campos separados argumentando que los prompts en prosa del tipo *"no debes
alterarlo"* se incumplen a veces. **Eso era una suposición sin evidencia y Juanfran la
desmintió: su plataforma respeta ese tipo de prompt y no altera el texto.** Los campos
separados se mantienen por razones reales —se validan antes de gastar créditos, y un
agente puede componerlos programáticamente— pero **no se obliga a trocear el texto**, y
un manifiesto hecho solo de prompts en prosa es perfectamente válido.

Si vienen ambos, `prompt` aporta el CONTEXTO de intención (equivale al mensaje original
del usuario en el panel) y los campos aportan el texto que debe imprimirse en la imagen,
además de servir de metadatos de la publicación (que es lo que acaba necesitando el
agente de Postiz).

### 4.2.1 Los hashtags no entran nunca en la imagen (2026-08-12)

`hashtags` es copy de la publicación: viaja al CSV/ZIP del lote y de ahí al programador,
pero **nunca al prompt de imagen**. Las almohadillas impresas dentro del diseño son la
señal más visible de que una pieza está automatizada, y el panel manual jamás las mete.

Como el manifiesto lo suele escribir una IA, los hashtags se cuelan a veces dentro de
`prompt`, `headline` o `body`: `stripHashtags` (`src/lib/campaigns/prompt.ts`) los
elimina de todos esos campos antes de construir el prompt, y la guía del planificador
(§ regla 9) lo prohíbe explícitamente.

### 4.2.2 La web es el elemento protagonista, no un dato de contacto (2026-08-12)

El panel de imagen construye el prompt en el cliente y lo envía con
`promptAlreadyBuilt: true`, apilando las prioridades P12/P10/P09/**P09b**/P07/P05/P04/P02.
P09b da a la URL tratamiento de HERO (píldora, peso tipográfico, color de acento) con el
CTA como copy secundario encima.

El lote hacía lo contrario: mandaba texto suelto y dejaba que el servidor lo envolviera
con `buildImagePrompt`, cuya plantilla base (`IMAGE_GENERATION_BASE_PROMPT`) ordena lo
opuesto — *"CTA URL must be visually secondary and compact"*, *"never dominant"* — y
además emitía la web dentro del bloque de datos de contacto. Resultado: en automático la
URL salía pequeña y plana; a mano salía como botón protagonista.

Desde 2026-08-12 el lote construye el prompt con `buildCampaignImagePrompt`
(`src/lib/campaigns/prompt.ts`), que **replica la misma pila de prioridades que el panel**
reutilizando los mismos módulos, y lo envía también con `promptAlreadyBuilt: true`. Los
helpers de estilo compartidos viven en `src/lib/prompts/image-generation/style-directive.ts`
para que las dos vías no se separen con el tiempo.

### 4.3 Identificadores estables (ya resuelto)

Todo lo seleccionable en la interfaz se nombra en el manifiesto por identificador
estable, nunca por `_id` de Convex:

| Concepto | Identificador | Origen |
|---|---|---|
| Estilo | `slug` | `style_presets.slug` — implementado el 2026-08-11 |
| Formato | `id` | `SOCIAL_FORMATS` (`ig-square`, `ig-story`, …) |
| Layout | `id` | catálogo de layouts (`clean`, `full-bleed`, …) |
| Plataforma | literal | `instagram` \| `tiktok` \| `youtube` \| `linkedin` |
| Marca (Brand Kit) | `slug` | `brand_dna.slug` — implementado el 2026-08-11. **Único por usuario**, no global |

## 5. Endpoints (v1)

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/api/v1/campaigns` | Valida el manifiesto y encola el lote. Devuelve `job_id`. **No devuelve imágenes.** |
| `GET` | `/api/v1/campaigns/{job_id}` | Estado del lote: progreso, y por post su estado y el activo generado |
| `GET` | `/api/v1/styles` | Catálogo de estilos (slug, nombre, descripción). Ya existe como `stylePresets.listCatalog` |
| `GET` | `/api/v1/formats` | Catálogo de formatos y plataformas |
| `POST` | `/api/v1/campaigns/{job_id}/cancel` | Cancela los pendientes del lote |
| `POST` | `/api/v1/campaigns/{job_id}/items/{ref}/regenerate` | Regenera un post concreto |
| `GET` | `/api/v1/campaigns/{job_id}/export` | Descarga el ZIP del lote (ver §7.2) |

Una generación tarda y un lote de 60 no cabe en el tiempo de una petición HTTP en
Vercel: **el `POST` solo encola**. El resultado se consulta (y más adelante, se
notifica por webhook).

**Importante:** hoy todo `/api/*` está protegido por Clerk salvo excepciones
(`src/proxy.ts`). Las rutas `v1` deberán declararse allí y hacer su propia
autenticación.

## 6. La cola, en Convex

Decidido: la cola vive en Convex, no en Next. Sobrevive al cierre de la pestaña, tiene
estado consultable y reintentos.

```
campaign_jobs            un lote
  user_id, brand_id, name, source ('ui'|'api'), idempotency_key,
  status ('queued'|'running'|'done'|'failed'|'cancelled'),
  total, completed, failed, created_at, finished_at

campaign_job_items       un post del lote
  job_id, ref, status ('pending'|'running'|'done'|'failed'|'skipped'),
  payload, asset_key, error, attempts, scheduled_at
```

Reglas de funcionamiento:

- **Concurrencia limitada (2-3 en paralelo, nunca 60).** El proveedor de imagen ya da
  "System busy" de forma habitual.
- **Reintentos con backoff** por item, no por lote: un fallo aislado no tumba la
  campaña.
- **Créditos**: se cobran por generación efectiva, con la lógica que ya existe. Un item
  fallido no debe cobrar.
- **Idempotencia**: dos envíos con la misma `idempotency_key` devuelven el mismo
  `job_id` y no duplican ni generación ni cobro.

## 7. La salida: Biblioteca **y** paquete descargable

La plataforma **solo genera**. No publica. La publicación ocurre fuera, en Postiz,
manejada por un agente propio de Juanfran. El diseño de la salida se subordina a ese
hecho: tiene que servir a un consumidor externo, no solo a la interfaz.

Por eso hay **dos salidas, no una**:

### 7.1 En la Biblioteca (para revisar)

Cada imagen se deposita en la Biblioteca ya existente, en estado `draft`, con
`campaign` = nombre de la campaña y `planned_at` = `scheduled_at` del post. Las tres
vistas (Rejilla / Campañas / Calendario) ya están construidas y sirven para revisar
pieza a pieza y regenerar lo que no convenza.

### 7.2 En un ZIP (para Postiz)

`GET /api/v1/campaigns/{job_id}/export` devuelve **un único ZIP con todo el lote**:

```
bauset-agosto-2026.zip
├── BAU-01.png
├── BAU-02.png
├── …
├── BAU-60.png
└── campaign.json     ← metadatos de programación
```

- **Las imágenes se nombran con la `ref` del post** (`BAU-01.png`), tal y como pedía el
  plan de campaña original.
- **`campaign.json` es lo que hace útil el ZIP.** Sin él, el agente de Postiz tendría
  que adivinar qué texto y qué fecha corresponden a cada imagen.
- Se incluye también `campaign.csv` con lo mismo en plano, porque muchos programadores
  de redes importan CSV directamente.

Cada post lleva **dos bloques** (ampliado el 2026-08-12):

| Bloque | Campos | Para qué |
|---|---|---|
| Publicación | `ref`, `file`, `scheduled_at`, `publish_to`, `optimized_for`, `headline`, `body`, `cta`, `hashtags` | programar el calendario |
| Producción | `group`, `goal`, `visual_content`, `style`, `layout`, `format`, `colors`, `logo`, `brand_assets`, `prompt` | auditar y repetir la pieza |

Hasta esa fecha solo se exportaba el primer bloque, así que el paquete no decía **con
qué estilo ni con qué descripción visual** se había generado cada imagen: los datos
estaban en el `payload` guardado, pero no salían del sistema. `brand_assets` lista los
datos del kit que la campaña pidió imprimir (`cta_url`, `phone`, `email`, `address`,
`extra_logos`); `visual_content` acepta el alias histórico `visual_note`.

Los campos vienen del post **ya resuelto** (`resolvePost`), así que reflejan lo que de
verdad se usó, incluidos los heredados de `campaign.defaults`. Las campañas anteriores
también los exportan: el payload ya estaba guardado, solo faltaba sacarlo.

Descargable desde la UI (botón en la campaña) y desde la API. Debe poder pedirse
**parcialmente**: solo los posts en estado `done`, para no tener que esperar a que
termine el lote entero.

**Decidido (2026-08-11):** el formato del paquete lo define esta plataforma
(`campaign.json` + `campaign.csv`); **el agente de Postiz se adapta**. No perseguimos
el formato de importación de Postiz, que además podría cambiar por su cuenta y
convertirse en una dependencia que no controlamos.

## 8. Autenticación

- **Fase 1 (uso propio)**: la petición se resuelve con la sesión de Clerk, igual que
  hoy. Sin keys, sin portal.
- **Fase 2 (clientes)**: API key por usuario (`Authorization: Bearer`), guardada
  *hasheada*, revocable, con cuota apoyada en el sistema de créditos que ya existe.

Lo único que cambia entre fases es la función que resuelve el usuario. Los endpoints no
se tocan.

## 9. Errores

Códigos estables y documentados, no mensajes en castellano dentro de un JSON:

| Código | Significado |
|---|---|
| `manifest_invalid` | El manifiesto no cumple el esquema (incluye el `ref` del post culpable) |
| `unknown_style` / `unknown_format` / `unknown_brand` | Identificador que no existe |
| `insufficient_credits` | No hay crédito para el lote completo |
| `rate_limited` | Demasiadas peticiones |
| `provider_error` | Falló el proveedor de imagen tras agotar reintentos |

La validación del manifiesto ocurre **entera y antes** de encolar: o el lote entra
completo, o no entra ninguno.

## 9.bis Cosas aprendidas construyendo el worker (2026-08-11)

Verificado contra el entorno real, no deducido:

1. **La imagen generada llega como data URL de ~1,5-2 MB y NO cabe en un campo
   de Convex** (`Value is too large (1.60 MiB > maximum size 1 MiB)`). Hay que
   subirla a Convex Storage y guardar la URL resultante
   (`src/lib/campaigns/store-image.ts`). Este fallo es especialmente caro porque
   ocurre **despues** de generar: la imagen ya esta pagada cuando revienta.
2. **El modelo de imagen se resuelve SIEMPRE desde `settings.getAIConfig`**
   (Admin > Modelos), como hace `/api/generate`. Pasar el prompt sin modelo
   acaba en `Image model provider no soportado`, porque los identificadores
   llevan prefijo de proveedor (`openai/gpt-image-2-low`).
3. **Un fallo con intentos restantes debe volver a `pending`, no a `failed`.**
   Marcarlo como fallido de entrada inutiliza los reintentos y da por perdida
   una publicacion que solo tropezo una vez.
4. **Los endpoints v1 son vulnerables a la carrera de token Clerk->Convex** ya
   documentada en el proyecto: una consulta puede devolver vacio si el token no
   esta listo, y eso se traduciria en un `unknown_brand` enganoso. Observado en
   vivo: la misma llamada fallo y, repetida, devolvio las 6 marcas.
   **PENDIENTE**: distinguir fallo transitorio (503, reintentable) de referencia
   que de verdad no existe (422), reutilizando `isTransientAuthError`.

## 10. Restricciones del entorno (leer antes de implementar)

- **No hay separación dev/producción en Convex** (ver `AGENTS.md`). Las tablas de la
  cola se crean directamente en el Convex que sirve la web pública, y las pruebas del
  lote consumen créditos y generan contenido real. Conviene un interruptor de
  `dry_run` que valide y encole **sin generar**.
- El deployment que guarda todos los datos **no tiene backups** y corre con límites de
  tier Development; el dashboard ya avisa de *"Queries hit concurrency limit"*. Un lote
  de 60 es justo la clase de carga que lo empuja.

## 11. Decisiones tomadas (2026-08-11)

1. ✅ **Slug de marcas: hecho.** `brand_dna.slug`, único por usuario, con backfill
   ejecutado (22/22 kits). El manifiesto ya puede decir `"brand": "academia-bauset"`.
2. ✅ **Si un post agota reintentos, el lote continúa.** El item queda en `failed` con
   su error, y el resto de la campaña sigue adelante. Se puede reintentar después con
   el endpoint de regeneración.
3. ✅ **Sí se permite regenerar un post concreto desde la API.** Con 60 piezas es
   seguro que algunas no convenzan, y relanzar el lote entero para rehacer una sería
   absurdo: duplicaría coste y contenido. Reutiliza la misma tubería con un solo item,
   y conserva la `ref`, de modo que el ZIP se regenera coherente.
4. ✅ **La plataforma solo genera.** Postiz publica, gestionado por un agente aparte.
   La integración con Postiz queda **fuera del alcance** de este contrato; lo que sí
   entra es que la salida sea directamente consumible por ese agente (§7.2).

5. ✅ **El formato del paquete lo define esta plataforma**, no Postiz. El agente se
   adapta (§7.2).

### Sigue abierto

- **Dónde se guardan los ZIP** y cuánto tiempo: generarlos al vuelo en cada descarga es
  simple pero lento con 60 imágenes; cachearlos consume almacenamiento. Decisión que
  puede tomarse al implementar el export, no antes.

## 12. Plan de construcción (Fase 1)

1. ✅ **Validador del manifiesto** — módulo puro con tests. Probado contra la campaña
   real de Bauset: los 60 posts validan sin errores ni avisos.
2. ✅ **Tablas de la cola** (`campaign_jobs`, `campaign_job_items`) en Convex.
3. ✅ **El encolado**: `POST /api/v1/campaigns`, con `dry_run` e idempotencia.
4. ✅ **El worker**: `POST /api/v1/campaigns/{id}/run`, concurrencia 2 y reintentos.
   Vive en Next, no en Convex, porque la cadena de generación está en `src/lib`.
5. ⬜ **La pantalla de lote**: subir manifiesto, ver progreso, revisar resultados.
   Es lo único que falta para no depender de llamadas a la API.
6. ✅ **El export ZIP** (§7.2), con `campaign.json` y `campaign.csv`.

Además, fuera del plan original pero necesarios al aparecer:
`GET /api/v1/catalog` y `GET /api/v1/campaign-guide` (§4.4), y la paridad con los
controles del panel lateral (§13).

## 13. Paridad con el panel lateral

El manifiesto tiene que ser el panel en forma de parámetros: "un clic con
parámetros". Estado verificado control a control:

| Control del panel | Parámetro | Verificado |
|---|---|---|
| Kit de marca | `campaign.brand` | ✅ |
| Formato (red + tamaño) | `format` | ✅ 4:5 y 1:1 confirmados en el proveedor |
| Estilo predefinido | `style` | ✅ |
| Paleta del kit | `colors` | ✅ |
| Logo y cuál | `logo`, `logo_id` | ✅ `refs=1` en el proveedor |
| Diseño (layouts) | `layout` | ✅ los 279 verificados por prompt |
| Contenido generado por IA | `visual_content` | ✅ |
| CTA con la web | `cta_url` | ✅ |
| Teléfono / email / dirección | `phone`, `email`, `address` | ✅ |
| Logos auxiliares (sellos) | `extra_logos` | ✅ `refs=3` |
| Modo avanzado de diseño | — | ⛔ descartado: no se usa |
| Modelo de imagen | — | ⬜ pendiente (hoy se toma de Admin) |
| Imágenes de referencia propias | — | ⬜ pendiente |

**Lección de método:** aceptar un parámetro no significa que llegue. Tres de estos
(paleta, logo y layout) se aceptaban sin efecto alguno, y el layout no llegaba
*nunca*. Verificar contra el prompt o contra los `refs` que recibe el proveedor
cuesta segundos; comprobarlo generando imágenes cuesta horas y créditos.
