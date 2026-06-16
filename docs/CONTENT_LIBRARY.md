# Biblioteca de Contenidos Generados

> Documento vivo. Hoja de ruta y decisiones de la Biblioteca. Objetivo: ver y
> planificar todos los activos generados (imagen + carrusel) sin saltar entre
> sesiones. Rama de trabajo: `develop`.

## Visión: 3 vistas

1. **Biblioteca** — rejilla con todos los activos. ✅ **V1 desplegada.**
2. **Campañas** — agrupación por cliente / producto / promoción / tema. ✅ **hecha** (campo `campaign` editable + filtro + bulk; **vista agrupada** con toggle Rejilla/Campañas; **CRUD** de campañas como entidad propia). Sin desplegar.
3. **Calendario** — planificación por fecha. ⏳ pendiente.

**Orden de construcción (con dependencia):** Biblioteca → Campañas → Calendario.
El calendario depende de poder **seleccionar, filtrar y clasificar** bien los
activos; esa clasificación la aporta **Campañas**, así que va antes que el
calendario. El campo `planned_at` ya está preparado para el calendario.

## Arquitectura (V1)

- **Modelo:** los activos NO se duplican; se **derivan** de `work_sessions.snapshot`
  (módulos `image` y `carousel`). Solo se persisten **anotaciones editoriales**.
- **Tabla Convex `content_asset_annotations`:** `user_id`, `asset_key`, `status`,
  `planned_at`, `platform`, `format`, `notes`, timestamps. Índices:
  `by_user_asset`, `by_user_status`, `by_user_planned`.
- **`asset_key` = `módulo:sessionId:generationId`** (ver `parseContentAssetKey`).
- **Estados:** `draft → selected → ready → published_manual / discarded`.
- **API Convex (`convex/contentLibrary.ts`):** `listAssets` (query, deriva + mezcla
  anotaciones, ordena por `created_at` desc), `updateAnnotation`,
  `bulkUpdateAnnotations`, `bulkDeleteAssets`. Lógica pura en
  `convex/contentLibrary.shared.ts` (`extractContentAssetsFromSessions`,
  `buildImageAssets`, `buildCarouselAsset`, `mergeContentAssetAnnotations`).
- **Captura de copy:** `/image` persiste `caption/headline/cta/platform/format`
  por generación en el snapshot (`convex/work_sessions.ts` los conserva).
- **UI:** `src/app/library/page.tsx` + `src/components/library/*`
  (`ContentLibraryGrid`, `ContentAssetCard`, `ContentAssetFilters`,
  `ContentAssetDetailPanel`, `ContentAssetBulkActions`). Enlace en `Sidebar`
  (`IconFolderKanban`). i18n: namespace `library` (es/en) + `common.nav.library`.
- **Detalle sticky:** el panel derecho usa `xl:sticky top-4 self-start` +
  `max-h`/scroll interno para no perder de vista el activo al hacer scroll.

## Estado y validación (V1)

- TS 0, suite verde (tests de contrato Convex + filtros). Lint del código nuevo
  sin errores. `npm run build` OK. QA visual desktop+mobile OK.
- Verificado end-to-end: scoping por usuario correcto; con datos reales la rejilla
  se puebla y el panel de detalle muestra imagen/copy/metadatos.

## Huecos conocidos / decisiones

- **Snapshots legacy:** `buildImageAssets` lee generaciones de
  `snapshot.sessionGenerations` (forma actual). Sesiones **antiguas** con otra
  forma no aparecen. En producción no afecta (tablas vacías → todo nuevo usa la
  forma correcta). Si se quiere mostrar contenido antiguo, extender el extractor.
- **Campañas HECHA:** `content_asset_annotations.campaign` (+ índice `by_user_campaign`),
  editable en el detalle, bulk (`bulkSetCampaign`, merge-safe) y filtrable (opción
  "sin campaña"). **Vista agrupada** (toggle Rejilla/Campañas). **CRUD** sobre tabla
  `content_campaigns` (entidad propia → campañas vacías posibles); `renameCampaign`
  propaga por nombre a las anotaciones, `deleteCampaign` deja los activos sin campaña.
  **SIN desplegar** (requiere `convex deploy` por las tablas/índices/campos nuevos).
- **Carruseles** se muestran como **una** pieza (no una card por slide).
- **Sin publicación automática** a redes; `published_manual` es marcado manual.
- No se migra ni duplica almacenamiento de imágenes.

## Próximos pasos

1. **(hecho + desplegado)** Biblioteca V1.
2. **Campañas:** HECHA (clasificación + vista agrupada + CRUD) en `develop`, **sin
   desplegar**. Pendiente: `convex deploy` por la tabla `content_campaigns`, el
   campo `campaign` y los índices nuevos. QA visual con datos reales (cuenta con
   contenido) cuando se despliegue.
3. **Calendario:** vista por fecha sobre `planned_at` + clasificación de Campañas.

## QA

- Usar `http://localhost:3000` (no `127.0.0.1`; Clerk dev da 403).
- La biblioteca es **por usuario**: si la cuenta no tiene sesiones, sale vacía
  (no es un bug).
