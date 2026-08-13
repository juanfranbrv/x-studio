# Programar en Postiz desde la Biblioteca — diseño

> **Estado: FASE 1 IMPLEMENTADA** el 2026-08-14 y verificada en el navegador.
> La fase 2 (lote con cadencia, §9) sigue pendiente.
> Creado el 2026-08-14. Continúa `2026-08-13-programar-en-postiz-design.md`.

## 1. Qué se construye

Poder programar una pieza en Postiz **desde la Biblioteca**, sin tener que volver al
lienzo ni regenerar la imagen. Hoy el único punto de entrada es el lienzo de Imagen,
justo después de generar: si cierras esa pantalla, la pieza queda en la Biblioteca sin
forma de mandarla a Postiz.

Esta fase cubre **una pieza suelta**. La programación en lote se diseña aparte (§9).

## 2. Lo que ya existe y se reutiliza

Comprobado leyendo el código el 2026-08-14. No hay que construir casi nada nuevo:

| Pieza | Dónde | Estado |
|---|---|---|
| Diálogo de programación completo | `src/components/studio/ScheduleToPostizDialog.tsx` | Reutilizable tal cual; único cambio, el texto del aviso (§10) |
| Selector de canales | `src/components/studio/ScheduleChannelPicker.tsx` | Reutilizable |
| Orquestación (subida + creación + anotación) | `convex/postiz.ts` → `scheduleImage` | Sin tocar |
| Selección múltiple con casillas | `library/page.tsx` → `selectedAssetKeys` | Ya funciona (útil en fase 2) |
| Barra de acciones en lote | `ContentAssetBulkActions.tsx` | Ya funciona (útil en fase 2) |
| Panel de detalle de una pieza | `ContentAssetDetailPanel.tsx` | Se le añade el botón |

El activo de la Biblioteca (`ContentLibraryAsset`) ya trae **todos** los datos que el
diálogo necesita: `asset_key`, `original_url` / `preview_url`, `copy` y `type`.

## 3. Decisiones tomadas

| Pregunta | Decisión | Motivo |
|---|---|---|
| ¿Individual o lote? | **Individual primero**, lote en fase 2 | Lo urgente es no depender del lienzo |
| ¿Carruseles? | **Fuera de esta fase** | Publicar un carrusel implica subir N diapositivas y multiplicar los modos de fallo; merece su propio diseño |
| ¿Punto de entrada? | **Los dos**: tarjeta (al pasar el ratón) y panel de detalle | El de la tarjeta es rápido; el del panel agrupa las acciones de la pieza |
| ¿Reprogramar sustituye la anterior? | **No**, se queda como está | Decisión explícita de Juanfran. Ver riesgo aceptado en §10 |

## 4. Arquitectura

### 4.1 Enfoque elegido: una sola instancia del diálogo, elevada a la página

`library/page.tsx` guarda qué pieza se está programando:

```ts
const [schedulingAsset, setSchedulingAsset] = useState<ContentLibraryAsset | null>(null)
```

La tarjeta y el panel **solo llaman a `setSchedulingAsset(asset)`**. El diálogo se monta
una única vez, al final de la página. Es el mismo patrón que ya usa `CanvasPanel.tsx`,
así que no se introduce una forma nueva de hacer lo mismo.

### 4.2 Enfoques descartados

- **Componente autocontenido `ScheduleAssetButton`** (botón + diálogo juntos, uno por
  tarjeta). Descartado: en la rejilla hay decenas de activos a la vez (42 en la sesión
  de prueba), y montaría un diálogo por tarjeta, **cada uno con su propio
  `useQuery(getAnnotation)`** contra Convex. Coste desproporcionado para el beneficio.
- **Extraer un hook `useScheduleAsset()`.** Válido, pero `library/page.tsx` tiene hoy 543
  líneas y el umbral de troceo del proyecto son 1000 (`docs/CALIDAD.md`). El cambio suma
  ~25 líneas. Se anota para cuando ese fichero se acerque al límite.

## 5. Flujo de datos

```
Tarjeta / Panel
   └─ setSchedulingAsset(asset)
        └─ <ScheduleToPostizDialog
             assetKey={asset.asset_key}
             imageUrl={asset.original_url ?? asset.preview_url}
             initialContent={asset.copy ?? ''} />
                └─ api.postiz.scheduleImage  (sin cambios)
                     └─ contentLibrary.markScheduled
                          └─ status: 'scheduled' + planned_at
```

`imageUrl` será siempre una **URL remota** (Convex Storage), nunca una data URL. Ese
camino es el que `fetchRemoteImage` (`convex/postiz.ts`) ya cubre: valida que el esquema
sea http/https, comprueba el `Content-Type` contra la lista blanca de imágenes y aplica
un tope de 10 MB. Tiene pruebas desde el 2026-08-13.

## 6. Cuándo NO se ofrece el botón

Las tres condiciones se evalúan igual en la tarjeta y en el panel:

1. **`asset.type !== 'image'`** — los carruseles quedan fuera de esta fase.
2. **Sin imagen** — ni `original_url` ni `preview_url`: no hay nada que publicar.
3. **Sin rol de administrador** — misma regla que en el lienzo (`CanvasPanel.tsx:652`
   comprueba `isAdmin`). La acción de Convex vuelve a validarlo en el servidor, así que
   ocultar el botón es comodidad, no seguridad.

### 6.1 Móvil

El botón de la tarjeta aparece «al pasar el ratón», gesto que en táctil no existe. En
pantallas sin puntero fino debe mostrarse siempre. Se resuelve con la media query
`(hover: hover)`, no con el ancho de pantalla: lo que decide no es el tamaño sino si hay
puntero.

## 7. Estado tras programar

No hace falta refrescar nada. Convex es reactivo: `markScheduled` escribe la anotación y
la rejilla, la vista Calendario y el panel de detalle se actualizan solos. La pieza pasa
a estado **«Programada»** y su `planned_at` queda fijado a la fecha elegida.

## 8. Errores

El diálogo ya los gestiona y no se cambia su comportamiento: ante un fallo **se queda
abierto**, con el mensaje visible y el texto que hubiera escrito el usuario intacto. Eso
está probado en el recorrido real (fue el comportamiento que salvó la sesión del
2026-08-13, cuando Postiz devolvía 500).

Único cambio de texto: el aviso de pieza ya programada pasa a decir de forma explícita
que la publicación anterior **no** se borra (ver §10).

## 9. Fuera de alcance (fase 2)

- **Programación en lote con cadencia.** La forma prevista: seleccionar N piezas, elegir
  fecha de inicio, intervalo (cada día / días concretos de la semana) y hora, y que se
  repartan. Requiere resolver antes: fallos parciales (si falla la 12 de 20), el tiempo
  de ejecución de una action de Convex con N subidas, y el informe de resultado.
- **Carruseles.**
- **Sustituir la publicación anterior al reprogramar.**

## 10. Riesgo aceptado: publicaciones duplicadas

Al reprogramar una pieza se crea una publicación **nueva** en Postiz y la anterior sigue
viva y programada. Si no se limpia a mano, **se publican las dos**.

Postiz sí permite borrarla (`DELETE /public/v1/posts/group/:group`) y guardamos su
identificador en `postiz_group_id`, así que resolverlo es viable. Juanfran decidió el
2026-08-14 no abordarlo ahora.

Mitigación acordada, sin cambiar el comportamiento: el aviso del diálogo lo dice con
todas las letras en vez de dejarlo implícito.

> Esta pieza ya está programada para el 14/8/2026, 9:30.
> Si continúas se creará una publicación **nueva**; la anterior seguirá en Postiz y
> tendrás que borrarla tú.

## 11. Pruebas

No hay lógica de negocio nueva: la acción de Convex, el cliente HTTP y la anotación no
se tocan. Las pruebas son de interfaz y cubren exactamente las reglas del §6:

| Caso | Se espera |
|---|---|
| Pieza de tipo imagen, con URL, usuario administrador | El botón aparece |
| Pieza de tipo carrusel | Sin botón |
| Pieza sin `original_url` ni `preview_url` | Sin botón |
| Usuario que no es administrador | Sin botón |
| Al pulsarlo | El diálogo recibe `asset_key`, URL y copy de **esa** pieza |

El último es el que de verdad importa: en una rejilla de decenas de activos, el fallo
plausible es abrir el diálogo con los datos de la pieza equivocada.
