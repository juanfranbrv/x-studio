# Carousel Video Admin Controls Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir controlar globalmente desde Admin la duración del vídeo del carrusel y la biblioteca de pistas aleatorias usada al exportar MP4 con música.

**Architecture:** Se añaden dos settings globales en `app_settings` para duración base y duración de la última slide. La música deja de depender de la carpeta local `songs/` y pasa a un catálogo persistido en Convex Storage con metadatos en una tabla nueva; el carrusel consume solo pistas activas y elige una al azar.

**Tech Stack:** Next.js, React, Convex, Convex Storage, Vitest.

---

## Chunk 1: Configuración global de vídeo

### Task 1: Añadir cobertura de test

**Files:**
- Create: `src/components/studio/carousel/__tests__/CarouselVideoAdminConfig.test.ts`

- [ ] **Step 1: Escribir test rojo para verificar que el carrusel deja de usar 4s/6s hardcodeado**
- [ ] **Step 2: Ejecutar el test y comprobar que falla**
- [ ] **Step 3: Implementar query pública de configuración y conexión en el canvas panel**
- [ ] **Step 4: Ejecutar test y dejarlo en verde**

### Task 2: Exponer settings en Admin

**Files:**
- Modify: `convex/admin.ts`
- Modify: `convex/settings.ts`
- Modify: `src/app/admin/page.tsx`
- Create: `src/components/admin/CarouselVideoSettingsCard.tsx`

- [ ] **Step 1: Añadir defaults de settings en backend**
- [ ] **Step 2: Crear card reusable para editar duración base y duración última**
- [ ] **Step 3: Integrar la card en el tab de settings**
- [ ] **Step 4: Verificar guardado y lectura**

## Chunk 2: Biblioteca admin de pistas

### Task 3: Persistencia y API de pistas

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/adminAudio.ts`

- [ ] **Step 1: Escribir test rojo para verificar catálogo admin y consulta pública de pistas activas**
- [ ] **Step 2: Ejecutar test y comprobar que falla**
- [ ] **Step 3: Crear tabla y funciones Convex para listar, crear, activar/desactivar y borrar pistas**
- [ ] **Step 4: Ejecutar test y dejarlo en verde**

### Task 4: UI de Admin para subir y gestionar pistas

**Files:**
- Create: `src/components/admin/AdminAudioTracksCard.tsx`
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Reutilizar patrón de Convex Storage para subir audio**
- [ ] **Step 2: Mostrar lista de pistas con estado activa/inactiva**
- [ ] **Step 3: Permitir borrar y alternar activación**
- [ ] **Step 4: Validar tipos soportados y feedback de errores**

### Task 5: Conectar export del carrusel con pistas activas

**Files:**
- Modify: `src/components/studio/carousel/CarouselCanvasPanel.tsx`
- Modify: `src/app/api/experimental-songs/route.ts`

- [ ] **Step 1: Sustituir la lectura desde `songs/` por la query pública de pistas activas**
- [ ] **Step 2: Mantener selección aleatoria entre activas**
- [ ] **Step 3: Eliminar fallback textual `4s / 6s` de la UI**
- [ ] **Step 4: Verificar export con y sin música**

## Chunk 3: Verificación

### Task 6: Validación final

**Files:**
- Modify: `docs/TECHNICAL_REFERENCE.md`

- [ ] **Step 1: Ejecutar tests de Vitest relacionados**
- [ ] **Step 2: Ejecutar búsqueda anti-mojibake en `src`**
- [ ] **Step 3: Documentar la decisión técnica en la referencia viva**
- [ ] **Step 4: Revisar que no queden referencias operativas a `songs/` como fuente principal**
