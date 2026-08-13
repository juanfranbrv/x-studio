# Asistente de campañas — Plan de implementación

> **Para agentes de implementación:** usar `subagent-driven-development` si hay subagentes disponibles o `executing-plans` en caso contrario. Ejecutar las tareas en orden y mantener los checks sin marcar hasta verificarlos.

**Objetivo:** Crear un asistente guiado en Campañas que recopile el briefing, reutilice el kit de marca y genere un mega prompt personalizado para un agente externo.

**Arquitectura:** El asistente no generará publicaciones ni sustituirá el manifiesto actual. Recopilará decisiones estratégicas y restricciones, las combinará con el Brand Kit y los catálogos vivos de estilos, formatos y layouts, y devolverá un prompt listo para copiar o descargar. El agente externo seguirá produciendo el JSON final que la tubería actual valida y ejecuta.

**Tecnologías:** Next.js App Router, React, TypeScript, Convex queries autenticadas, Vitest, componentes UI existentes.

---

## Límites de la primera versión

- Mantener `POST /api/v1/campaigns` y toda la tubería de generación sin cambios funcionales.
- Mantener la guía técnica actual como contrato JSON y reutilizarla dentro del mega prompt.
- Añadir un flujo guiado en `/campaigns`, no un chat libre.
- No generar contenido mediante un modelo dentro de Postlaboratory en esta fase.
- No duplicar colores, logos ni activos binarios del kit en el manifiesto; el JSON solo referenciará el `brand` y las opciones de uso.
- No permitir identificadores de estilos, formatos o layouts que no procedan de los catálogos reales.

## Estructura de archivos

- Crear `src/lib/campaigns/assistant.ts`: tipos del briefing, normalización y construcción del mega prompt personalizado.
- Crear `src/lib/campaigns/__tests__/assistant.test.ts`: pruebas puras del prompt, reglas de integridad y serialización del briefing.
- Modificar `src/lib/campaigns/guide.ts`: extraer o reutilizar el bloque técnico actual sin cambiar su contrato de salida.
- Modificar `src/app/api/v1/campaign-guide/route.ts`: conservar `GET` como guía genérica y añadir `POST` autenticado para generar la guía personalizada con Brand Kit y briefing.
- Crear `src/components/campaigns/CampaignAssistantWizard.tsx`: flujo guiado por pasos y resumen editable.
- Modificar `src/components/campaigns/CampaignGuideCard.tsx`: convertir la tarjeta en entrada al asistente y mantener copiar/descargar para el prompt generado.
- Modificar `src/app/campaigns/page.tsx`: conectar el asistente con el kit activo y preservar el formulario de manifiesto y la lista de campañas.
- Modificar `docs/TECHNICAL_REFERENCE.md`: documentar el asistente como compilador de briefing y la separación entre mega prompt, JSON final y tubería de ejecución.

## Chunk 1: Contrato del mega prompt

### Tarea 1: Definir el modelo del briefing

**Archivos:**
- Crear `src/lib/campaigns/assistant.ts`
- Test: `src/lib/campaigns/__tests__/assistant.test.ts`

- [ ] Definir tipos para objetivo, oferta, subcampañas, periodo, audiencia, canales, volumen, pilares, formatos, CTA, hashtags, métricas y restricciones.
- [ ] Definir el modo de decisión para estilos y activos: `locked`, `allowed` o `delegated`.
- [ ] Definir el contexto textual mínimo del Brand Kit: nombre, slug, audiencia general, tono, valores, posicionamiento, web y logos auxiliares referenciables.
- [ ] Normalizar campos vacíos sin inventar valores.
- [ ] Escribir pruebas para el briefing completo, briefing parcial y kit sin datos opcionales.

### Tarea 2: Construir el mega prompt

**Archivos:**
- Modificar `src/lib/campaigns/guide.ts`
- Modificar `src/lib/campaigns/assistant.ts`
- Test: `src/lib/campaigns/__tests__/assistant.test.ts`

- [ ] Mantener la estructura JSON y los catálogos que ya genera `buildCampaignPrompt`.
- [ ] Añadir delante el rol del agente externo: estratega, director de contenidos y planificador editorial.
- [ ] Incluir el briefing personalizado y las decisiones bloqueadas, acotadas o delegadas.
- [ ] Incluir el contexto del kit sin duplicar la identidad visual como datos manuales del manifiesto.
- [ ] Añadir la regla de integridad: `headline`, `body`, `cta` y `hashtags` son contenido definitivo y Postlaboratory no debe reescribirlo, resumirlo, traducirlo, corregirlo ni ampliarlo.
- [ ] Aclarar que `prompt` es contexto de intención, no sustituto de copy literal.
- [ ] Aclarar que `visual_content` describe lo visible y no debe convertirse en texto.
- [ ] Exigir que el agente externo entregue planificación, calendario, subcampañas y publicaciones dentro del JSON final.
- [ ] Exigir salida única en JSON, sin explicaciones ni identificadores inventados.
- [ ] Probar que aparecen el slug del kit, las decisiones del briefing, la regla de integridad y los catálogos válidos.

## Chunk 2: Endpoint personalizado

### Tarea 3: Extender la ruta de guía

**Archivos:**
- Modificar `src/app/api/v1/campaign-guide/route.ts`
- Test: añadir cobertura en `src/app/api/v1/campaign-guide/__tests__/route.test.ts` si el patrón de pruebas de rutas existente lo permite.

- [ ] Mantener el `GET` actual como fallback genérico.
- [ ] Añadir `POST` con `brand_slug` y briefing validado.
- [ ] Resolver el Brand Kit perteneciente al usuario autenticado con `api.brands.getBrandDNABySlug`.
- [ ] Obtener estilos activos con `api.stylePresets.listCatalog` y reutilizar los catálogos actuales de formatos, layouts y plataformas.
- [ ] Rechazar sesiones sin usuario, kits inexistentes y briefings con campos estructurales inválidos.
- [ ] Pasar al builder solo datos sanitizados y necesarios para el prompt.
- [ ] Devolver `prompt`, resumen del kit y resumen del catálogo sin persistir todavía la campaña.
- [ ] No tocar Convex ni ejecutar despliegues.

## Chunk 3: Asistente guiado en la interfaz

### Tarea 4: Construir el flujo por pasos

**Archivos:**
- Crear `src/components/campaigns/CampaignAssistantWizard.tsx`
- Modificar `src/app/campaigns/page.tsx`

- [ ] Usar el kit activo del `BrandKitContext` como fuente automática del `brand_slug`.
- [ ] Mostrar resumen del kit y permitir cambiarlo mediante el selector global existente, sin pedir de nuevo colores o logos.
- [ ] Implementar pasos: objetivo/oferta, audiencia, periodo/canales, arquitectura de contenido, dirección creativa y revisión.
- [ ] Hacer obligatorios solo los datos necesarios para que el agente externo pueda trabajar.
- [ ] Permitir texto libre adicional como contexto, sin sustituir los campos estructurados.
- [ ] Permitir elegir para estilos, formatos y logos auxiliares entre bloqueado, acotado o delegado.
- [ ] Mostrar únicamente estilos, formatos, layouts y logos disponibles.
- [ ] Mostrar un resumen editable antes de solicitar el mega prompt.
- [ ] Mantener el formulario actual para abrir, comprobar y encolar un JSON generado externamente.

### Tarea 5: Integrar copiar y descargar

**Archivos:**
- Modificar `src/components/campaigns/CampaignGuideCard.tsx`

- [ ] Sustituir la generación genérica inmediata por la entrada al asistente.
- [ ] Mantener copiar y descargar sobre el prompt personalizado.
- [ ] Permitir volver a editar el briefing sin perderlo mientras dure la sesión del asistente.
- [ ] Usar los patrones visuales existentes para tarjetas, botones, inputs y estados.
- [ ] No introducir una tercera familia visual ni iconos decorativos nuevos.

## Chunk 4: Verificación y documentación

### Tarea 6: Pruebas automáticas

**Archivos:**
- `src/lib/campaigns/__tests__/assistant.test.ts`
- Tests de ruta si se crean en la tarea 3.

- [ ] Ejecutar `npx vitest run src/lib/campaigns/__tests__/assistant.test.ts`.
- [ ] Ejecutar los tests existentes de campañas: `npx vitest run src/lib/campaigns/__tests__`.
- [ ] Ejecutar `npm run lint`.
- [ ] Ejecutar la comprobación anti-mojibake sobre `src` antes de cerrar cualquier cambio de texto.

### Tarea 7: Validación visual y de flujo

- [ ] Arrancar el entorno local y el navegador aislado solo después de confirmar que el flujo de desarrollo que ejecuta `npx convex dev` puede publicarse en el único deployment real del proyecto.
- [ ] Verificar `/campaigns` en desktop y mobile.
- [ ] Verificar cambio de kit, navegación por pasos, resumen, generación del prompt, copiar, descargar y retorno al formulario JSON.
- [ ] Confirmar que el manifiesto actual se sigue validando y encolando sin modificaciones.
- [ ] Revisar consola y red en el navegador aislado.

### Tarea 8: Actualizar referencia técnica

**Archivos:**
- Modificar `docs/TECHNICAL_REFERENCE.md`

- [ ] Documentar que el asistente genera un mega prompt y no el JSON final.
- [ ] Documentar que el agente externo produce el JSON ejecutable.
- [ ] Documentar la regla de integridad del contenido.
- [ ] Documentar que el Brand Kit sigue siendo la fuente única de verdad visual.

## Criterios de aceptación

- El usuario puede completar el briefing sin repetir datos del kit.
- El resultado copiable contiene el contexto de campaña, el kit activo, las reglas de integridad y los catálogos válidos.
- El agente externo recibe instrucciones para diseñar estrategia, calendario y publicaciones completas.
- El agente externo debe devolver un JSON compatible con el contrato actual.
- Postlaboratory no reescribe el contenido final de las publicaciones; solo aplica las reglas necesarias para el renderizado, como excluir hashtags de la imagen.
- La tubería existente de validación, cola y generación permanece intacta.
- No se realiza commit hasta la validación manual de Juanfran.
