# Programar en Postiz desde el lienzo — diseño

> **Estado: DISEÑO APROBADO.** Nada implementado todavía.
> Creado el 2026-08-13.

## 1. Qué se construye

Un botón en el lienzo de imagen que, tras generar una pieza, la manda a Postiz y la
programa para una fecha. Hoy ese camino es manual: descargar la imagen, entrar en
Postiz, subirla, pegar el copy y fijar la fecha.

Solo cubre **una imagen suelta**. Los lotes de campaña siguen saliendo por el ZIP
(`docs/API_AUTOMATIZACION.md` §7.2), que no se toca.

### 1.1 Relación con la decisión previa

`docs/API_AUTOMATIZACION.md` §11.4 decidió que *"la plataforma solo genera. Postiz
publica, gestionado por un agente aparte"*, y §7.2 que no se persigue el formato de
importación de Postiz *"que además podría cambiar por su cuenta"*.

Esto lo reabre **solo para el caso de pieza suelta**, y el argumento de entonces se
sostiene peor aquí: aquella decisión hablaba de lotes de 60 y de un formato de
importación; esto son tres endpoints de una API pública y versionada. El acoplamiento
existe —si Postiz cambia su API v1, esto se rompe— pero queda confinado a un módulo
(`src/lib/postiz/client.ts`) y no sustituye al ZIP, lo complementa.

## 2. Lo verificado antes de diseñar

No son suposiciones; se comprobaron contra el entorno real el 2026-08-13:

| Hecho | Cómo se comprobó |
|---|---|
| Postiz expone `GET /public/v1/integrations`, `POST /public/v1/upload-from-url` y `POST /public/v1/posts` | Rutas mapeadas en el log del backend |
| La API pide clave: 401 sin ella y con una inválida | `curl` contra el endpoint real |
| El contenedor de Postiz alcanza Convex Storage sin credenciales | `fetch` desde dentro del contenedor: HTTP 404 (no 401) sobre un id inexistente |
| Postiz corre con `STORAGE_PROVIDER=cloudflare` | `printenv` en el contenedor |
| `POST /public/v1/posts` es la vía que **sí crea el workflow de Temporal** | `NOTAS-OPERATIVAS.md`: así se re-armó el calendario tras la migración |

Consecuencia útil del tercero y el cuarto: basta con **pasarle una URL**; Postiz se
descarga la imagen y la reubica en R2, que es de donde Meta ya baja sin problemas las
58 publicaciones de campaña. No se crea dependencia del VPS para servir medios.

## 3. Decisiones tomadas

1. **El botón vive en el lienzo**, tras generar. Es donde la imagen y el copy están
   vivos. La Biblioteca queda para más adelante.
2. **Credenciales por usuario**: cada uno apunta a *su* Postiz. Hoy solo existe la fila
   del administrador. Evita que la plataforma se convierta en proveedora de las redes
   de terceros.
3. **El botón lo ve solo el administrador.** Se reutiliza `requireAdmin` +
   `requireSameUser` de `convex/lib/authz.ts`, la misma combinación que aplicó
   `convex/campaigns.ts` en el commit `2f66c4f`. La arquitectura no asume que sea así
   para siempre.
4. **Se deja rastro**: la pieza queda marcada como programada en la Biblioteca.
5. **La lógica va en una server action de Next**, siguiendo el patrón de
   `generate-social-post.ts`, con el cliente HTTP aislado en un módulo puro. Se
   descartó ponerla en Convex (rompe el patrón ya establecido para llamadas externas) y
   se descartó nacer como ruta `/api/v1/...` (fachada antes de necesitarla).

## 4. Arquitectura

```
src/lib/postiz/
  client.ts      listIntegrations() · uploadFromUrl() · createPost()
  types.ts       tipos del contrato
  errors.ts      PostizAuthError · PostizUnreachableError · PostizRateLimitError

src/app/actions/schedule-to-postiz.ts     orquesta, no habla HTTP
convex/postizAccounts.ts                  credenciales por usuario
src/components/studio/ScheduleToPostizDialog.tsx
```

`client.ts` **no importa nada de Next, Convex ni Clerk**. Recibe `{ baseUrl, apiKey }`
y devuelve datos o lanza errores tipados. Esa frontera es lo que permite probarlo sin
levantar nada, y lo que hace que exponerlo mañana como `/api/v1/schedule` sea una
envoltura fina — la costura que pide `API_AUTOMATIZACION.md` §3, sin pagarla hoy.

### 4.0 Dónde se autoriza de verdad

El control autoritativo va en las **funciones de Convex** (`requireAdmin` +
`requireSameUser`), no en la server action: una comprobación que viva solo en Next se
esquiva llamando a Convex directamente. La action comprueba también, pero solo para
fallar pronto y no enseñar un diálogo condenado.

### 4.1 Interfaz de la UI

Reutiliza `Dialog`, `Input`, `Select` y `Button` existentes (AGENTS.md §19). Para la
fecha se usa `<Input type="date">` más hora, que es el patrón ya presente en
`ContentAssetDetailPanel` y en `CampaignAssistantWizard`. **No se crea ningún
componente de calendario.**

## 5. Datos

### 5.1 Tabla nueva

```
postiz_accounts
  user_id: string
  base_url: string
  api_key: string
  created_at, updated_at: string
  índice by_user
```

### 5.2 Anotación existente, ampliada

`content_asset_annotations` ya tiene `asset_key`, `status`, `planned_at`, `platform`,
`campaign` y `notes`. Se le añaden dos campos **opcionales**:

```
postiz_group_id: optional(string)    identificador devuelto por Postiz
postiz_base_url: optional(string)    a qué instancia se mandó
```

Y `status` gana el valor **`scheduled`**, que se suma a
`draft | selected | ready | published_manual | discarded`. Encaja con el vocabulario
existente: `published_manual` ya daba por hecho que publicar ocurre fuera.

`planned_at` se rellena con la fecha elegida, así que **el Calendario de la Biblioteca
empieza a reflejar la programación real** sin tocar esa vista.

### 5.3 Compromiso conocido: dónde vive la clave

La clave está en Convex y el módulo que la usa está en Next, así que existe una
consulta que devuelve la clave del usuario a quien tenga su sesión.

No es escalada de privilegios —es su propia clave, leída por su propia sesión— pero sí
amplía la superficie ante un XSS. Mitigación desde el día uno: esa consulta **no se
invoca nunca desde un componente de cliente**, y la que alimenta la interfaz devuelve
solo `{ configurado, base_url }`.

Si algún día importa, se cierra del todo moviendo las tres llamadas a una action de
Convex, donde la clave no sale nunca. Queda escrito para que sea una decisión y no un
descuido.

## 6. Flujo

1. **Pulsar** abre el diálogo, que pide los canales a Postiz (cacheados por sesión).
2. **Revisar**: copy precargado desde `caption` más los hashtags, editable. Selección
   de canales y de fecha y hora.
3. **Confirmar** ejecuta, en este orden:
   1. comprobar que el usuario es administrador
   2. `persistGeneratedImage()` — **se reutiliza** `src/lib/campaigns/store-image.ts`,
      que ya resuelve exactamente esto: deja pasar una URL remota y sube la data URL
   3. `uploadFromUrl()` en Postiz
   4. `createPost()` con fecha, canales, texto y medio
   5. anotar en `content_asset_annotations`
4. **Confirmación** con enlace al calendario de Postiz.

Detalles que se olvidan y rompen en producción:

- Instagram exige `settings: { post_type: 'post' }` (`NOTAS-OPERATIVAS.md`).
- La fecha viaja con desplazamiento explícito (`+02:00`), como el flujo de campañas.
  Postiz almacena en UTC.

## 7. Errores

**Regla que ordena el resto: la anotación es el último paso.** Si algo falla antes, la
Biblioteca no se entera y por tanto no miente. Nunca aparece "programada" sobre algo
que no se programó.

| Fallo | Mensaje |
|---|---|
| Sin Postiz configurado | El botón no aparece; enlace a configurarlo |
| 401 | "Postiz rechazó la clave", con enlace a ajustes |
| Red o instancia caída | "No se pudo contactar con Postiz. No se ha programado nada" |
| Falla `upload-from-url` | "Postiz no pudo descargar la imagen" |
| 429 | "Demasiadas peticiones, prueba en unos minutos" |

### 7.1 Ya programada

Si la anotación tiene `postiz_group_id`, el diálogo avisa con la fecha existente y
exige una confirmación adicional. Sin esto, un doble clic publica dos veces.

### 7.2 Fallo parcial entre canales

**No es hipotético.** En la campaña BAU-31 Instagram rechazó los ajustes y Facebook sí
entró; hubo que crear solo el que faltaba *"sin duplicar Facebook"*.

Por tanto el resultado es **por canal**, no global: se informa de cuáles entraron y
cuáles no, se puede reintentar solo el fallido, y la anotación registra únicamente lo
que de verdad se creó.

## 8. Pruebas

**`client.ts`** con `fetch` simulado, sin red. Se prueba el contrato: cabecera de
autenticación presente, `post_type` de Instagram, fecha con desplazamiento y no en hora
local, y que 401, 429 y error de red producen errores distinguibles.

**La server action** con cliente y Convex simulados. Reglas cubiertas: un
no-administrador queda fuera; si `createPost` falla **no se anota nada**; un fallo
parcial registra solo los canales creados; una pieza ya programada exige confirmación.

**La autorización en Convex**, siguiendo `convex/lib/__tests__/campaigns-authz.test.ts`,
que ya prueba exactamente este patrón: que las funciones nuevas rechazan a un usuario no
administrador y a un `clerk_user_id` que no es el suyo.

Vitest, con los tests junto al módulo como en `src/lib/__tests__/`.

**Verificación manual, una sola vez**, contra el Postiz real: programar una pieza a seis
meses vista, comprobar que aparece en el calendario con su imagen, y borrarla con
`DELETE /public/v1/posts/:id`. Es la única forma de confirmar que el contrato real
coincide con el supuesto, y no publica nada. **Los tests automáticos no tocan Postiz.**

## 9. Fuera de alcance

- Programar desde la Biblioteca o el Calendario.
- Carruseles (varias imágenes por publicación).
- Consultar después si la publicación salió o falló: de eso ya avisa el bot de Telegram
  montado en el VPS el 2026-08-13.
- Exponer esto como `/api/v1/...`. La frontera queda puesta para hacerlo sin rehacer.
