# Campaign Daily Frequency and Copy Feedback Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar y transmitir la frecuencia como publicaciones diarias y confirmar en el propio botón que el mega prompt se ha copiado.

**Architecture:** El contrato del briefing adopta `postsPerDay` y centraliza la lectura compatible de `postsPerWeek` en helpers puros. El formulario usa exclusivamente el valor normalizado. El botón de copia usa un estado local temporal y una presentación derivada comprobable sin introducir nuevas dependencias de UI.

**Tech Stack:** Next.js, React, TypeScript, Vitest, componentes UI existentes.

---

## Chunk 1: Contrato diario y feedback de copia

### Task 1: Normalizar la frecuencia diaria

**Files:**
- Modify: `src/lib/campaigns/assistant.ts`
- Modify: `src/lib/campaigns/__tests__/assistant.test.ts`

- [ ] Añadir pruebas fallidas para `postsPerDay`, compatibilidad directa con `postsPerWeek` y precedencia del campo nuevo.
- [ ] Ejecutar `npx vitest run src/lib/campaigns/__tests__/assistant.test.ts` y confirmar el fallo esperado.
- [ ] Añadir `getCampaignPostsPerDay`, normalización de canales y salida `<n> publicaciones por día`.
- [ ] Repetir la prueba y confirmar que pasa.

### Task 2: Actualizar el formulario

**Files:**
- Modify: `src/components/campaigns/CampaignAssistantWizard.tsx`

- [ ] Normalizar `initialBrief.channels` al crear el estado.
- [ ] Crear y editar canales mediante `postsPerDay`.
- [ ] Mostrar `Publicaciones por día`, etiquetas accesibles diarias y resumen `/día`.
- [ ] Comprobar mediante TypeScript y lint que no quedan usos semanales en el asistente.

### Task 3: Añadir confirmación temporal de copia

**Files:**
- Modify: `src/components/campaigns/CampaignGuideCard.tsx`
- Create: `src/lib/campaigns/__tests__/copy-feedback.test.ts`
- Create: `src/lib/campaigns/copy-feedback.ts`

- [ ] Añadir una prueba fallida para la presentación `idle` y `copied` del botón.
- [ ] Ejecutar la prueba y confirmar el fallo esperado.
- [ ] Implementar el helper mínimo de presentación.
- [ ] Incorporar estado local: tras copiar, mostrar `Copiado`, desactivar dos segundos y restaurar el estado; no activar éxito si falla el portapapeles.
- [ ] Repetir la prueba y confirmar que pasa.

### Task 4: Verificación final

**Files:**
- Modify: `docs/TECHNICAL_REFERENCE.md`

- [ ] Documentar que la frecuencia de campañas es diaria y que el campo anterior se reinterpreta sin conversión.
- [ ] Ejecutar `npx vitest run src/lib/campaigns`.
- [ ] Ejecutar TypeScript y lint focalizado.
- [ ] Ejecutar `npm run build`.
- [ ] Ejecutar la comprobación anti-mojibake y `git diff --check`.
- [ ] No crear commit ni desplegar antes de la validación del usuario.
