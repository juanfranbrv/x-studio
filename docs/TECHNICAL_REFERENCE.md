# Referencia Técnica

Documento vivo de referencia técnica para Juanfran y cualquier IA que trabaje en `x-studio`.

## Reglas de sistema UI

Existe un documento vivo con reglas reutilizables de coherencia visual para nuevas iteraciones de interfaz:

- [docs/UI_SYSTEM_RULES.md](F:/_PROYECTOS/x-studio/docs/UI_SYSTEM_RULES.md)

Uso recomendado:

1. consultarlo antes de tocar cabeceras de tarjeta, textareas principales, botones o dropdowns
2. reutilizar sus familias visuales antes de inventar una nueva
3. documentar ahi cualquier excepcion que se introduzca a nivel de sistema

Decision vigente:

- en desktop, las entradas de texto principales equivalentes deben compartir tamano base
- el sistema de acciones del panel creativo se organiza en dos alturas visibles principales: M = 42px y L = 46px
- Analizar pertenece a la misma familia visual que el CTA principal, pero con menor jerarquia
- los dropdowns deben mantener la misma escala tipografica cerrados y abiertos
- los estados informativos no deben encapsularse por defecto si se leen mejor como texto limpio
- dentro de tarjetas con varios subbloques funcionales, se evita tanto la linea dura como el patron de tarjeta dentro de tarjeta; primero se resuelve con espacio, tipografia y ritmo vertical
- el icono de `sparkles` queda prohibido en botones y CTAs de `x-studio`; si se necesita apoyo visual para acciones de IA, usar iconos funcionales o mas sobrios, o prescindir del icono
## Detección de idioma con Detect Language API

### Propósito

Se usa para mejorar la detección de idioma en prompts cortos o ambiguos, especialmente en español, catalán y portugués.

No sustituye por completo la heurística local:

- en cliente se mantiene detección local síncrona
- en servidor se usa Detect Language API con fallback local

Esto evita exponer la clave y mantiene la app funcional si la API falla.

### Configuración

- Variable de entorno: `DETECT_LANGUAGE_API_KEY`
- Endpoint: `POST https://ws.detectlanguage.com/0.2/detect`
- Autenticación: `Authorization: Bearer <API_KEY>`

### Implementación compartida

Archivo base:

- [src/lib/language-detection.ts](F:/_PROYECTOS/x-studio/src/lib/language-detection.ts)

Funciones principales:

- `detectLanguage(text)`: heurística local síncrona
- `detectLanguageFromParts(parts, fallback)`: heurística local para varias entradas
- `detectLanguageWithApi(text, fallback)`: detección en servidor con API + fallback local
- `detectLanguageFromPartsWithApi(parts, fallback)`: variante agregada para varias entradas

### Dónde se usa

Acciones de servidor conectadas a la API:

- [src/app/actions/generate-social-post.ts](F:/_PROYECTOS/x-studio/src/app/actions/generate-social-post.ts)
- [src/app/actions/generate-carousel.ts](F:/_PROYECTOS/x-studio/src/app/actions/generate-carousel.ts)
- [src/app/actions/parse-intent.ts](F:/_PROYECTOS/x-studio/src/app/actions/parse-intent.ts)
- [src/app/actions/analyze-brand-dna.ts](F:/_PROYECTOS/x-studio/src/app/actions/analyze-brand-dna.ts)

Uso local síncrono en cliente o utilidades que no deben depender de red:

- hooks del flujo de creación
- lógica de apoyo en imagen/carrusel
- constructores de prompt que necesitan respuesta inmediata

### Regla de decisión

El sistema sigue esta prioridad:

1. heurística local
2. consulta a Detect Language API en servidor
3. si la API es fiable, se acepta su idioma
4. si falla, no hay clave o la respuesta es dudosa, se conserva el resultado local

### Regla vigente en generacion de image y carousel

- En generacion de `image` y `carousel`, el idioma final se resuelve exclusivamente desde el prompt del usuario.
- `preferred_language` del Brand Kit no debe participar ni como fallback ni como pista dentro del contexto de generacion.
- La Detect Language API sigue usandose en servidor cuando esta disponible, y si falla se conserva el fallback heuristico local basado en el prompt.

### Notas de mantenimiento

- No mover la llamada a la API a cliente.
- No usar esta integración para bloquear flujos críticos.
- Si aparece una regresión en detección, ajustar primero [src/lib/language-detection.ts](F:/_PROYECTOS/x-studio/src/lib/language-detection.ts), no parchear cada módulo por separado.
## Plan vivo de responsive e internacionalizacion

Existe un checklist operativo para abordar la revision responsive/mobile y la internacionalizacion ES/EN:

- [docs/RESPONSIVE_I18N_CHECKLIST.md](F:/_PROYECTOS/x-studio/docs/RESPONSIVE_I18N_CHECKLIST.md)

Decision de trabajo actual:

1. estabilizar responsive/mobile primero
2. introducir i18n despues sobre layouts ya saneados
3. hacer una pasada final de ajuste con textos reales en espanol e ingles

Nota operativa:

- En esta sesion no se ha encontrado `DONT_TOUCH.md` en la raiz del proyecto. Antes de tocar componentes marcados como estables conviene restaurar ese inventario o confirmar manualmente que zonas no deben modificarse.

### Drawer movil compartido de Image y Carousel

- El panel lateral movil de `image` y `carousel` debe mantenerse en un componente compartido para no duplicar gestos ni animaciones.
- Archivo base: `src/components/studio/shared/MobileWorkPanelDrawer.tsx`
- Reglas:
  - apertura y cierre por toque sobre el tirador, no solo por drag
  - drag horizontal reservado al tirador y la cabecera para no competir con el scroll interno
  - boton de cierre visible dentro de la cabecera
  - transicion rapida y organica, respetando `prefers-reduced-motion`

### Modulo experimental Replace

- Existe un modulo experimental `replace` con ruta propia `/replace`.
- Su visibilidad no queda hardcodeada en frontend: depende del flag global `replace_module_enabled` en `app_settings`.
- La fuente de verdad publica para cliente es `api.settings.getReplaceModuleFlags`.
- Reglas vigentes:
  - si el flag esta desactivado, `Sidebar` no debe mostrar el acceso
  - si alguien entra por URL directa con el flag desactivado, el modulo debe redirigir a `/image`
  - la activacion y desactivacion debe controlarse desde `/admin`

### Plantillas Replace

- Las plantillas visuales del panel derecho de `/replace` ya no viven hardcodeadas en frontend.
- Fuente de verdad:
  - tabla `replace_templates`
  - query publica `api.replaceTemplates.listActive`
- Gestion admin:
  - ruta dedicada `/admin/replace-templates`
  - alta basica con `title`, `image_url` y `thumbnail_url`
  - eliminacion desde el propio gestor
- Regla operativa:
  - el panel derecho de `Replace` debe renderizar directamente las imagenes de esta tabla
  - si no hay registros, el modulo muestra estado vacio en lugar de placeholders falsos

### Generacion Replace

- El CTA principal de `Replace` no debe estar activo por defecto.
- Regla vigente:
  - solo se activa cuando el usuario ha seleccionado una imagen de producto y una plantilla
  - el campo de prompt manual es opcional y actua solo como refinamiento adicional
  - si el refinamiento esta vacio, se usa exclusivamente la instruccion base configurable desde Admin
- La generacion real del modulo vive en `POST /api/replace`.
- El backend debe reutilizar:
  - `app_settings.model_image_generation` como modelo de imagen activo
  - `system_prompts.generate_replace_image` como prompt editable desde Admin
- En cada generacion de `Replace` se deben enviar al modelo:
  - la imagen del producto del usuario como referencia de sujeto
  - la imagen de plantilla como referencia de composicion/escena
- Regla de prompt:
  - la plantilla aporta mood, iluminacion, composicion y vibe general
  - el producto del usuario debe sustituir completamente al producto principal original
  - no debe sobrevivir branding, packaging ni texto visible del competidor

### Modelo Wisdom GPT Image 2

- `wisdom/gpt-image-2-low` y `wisdom/gpt-image-2-medium` están disponibles como modelos de imagen seleccionables en Admin > Modelos.
- `wisdom/gpt-image-2` queda como alias legacy compatible y se resuelve como `low`.
- Wisdom lo expone como modelo OpenAI-compatible con identificador `gpt-image-2`.
- En `src/lib/gemini.ts`, los modelos `wisdom/*` que no son Gemini se enrutan por la API OpenAI-compatible y los alias de calidad se normalizan antes de llamar al proveedor.
- Para `wisdom/gpt-image-2-*`, si no hay referencias visuales se usa `/v1/images/generations`; si hay logos, imágenes de contexto o plantilla de layout, se usa `/v1/images/edits` con `image[]` para preservar el contexto visual.
- El tamaño enviado a `wisdom/gpt-image-2-*` usa el mismo mapper que OpenAI directo (`getOpenAIImageSizeForAspectRatio`) y la calidad sale del sufijo del modelo (`low` o `medium`).
- Las respuestas de imagen OpenAI-compatible se extraen con `src/lib/openai-image-response.ts`, tolerando `b64_json`, `url`, `image_url`, `result`, `output` e `images`; si no hay payload reconocido se registra solo la forma del JSON, sin volcar base64 completo.
- El catalogo de costes de Admin > Economia se sincroniza desde `IMAGE_MODEL_OPTIONS`, por lo que este modelo debe aparecer como modelo de imagen registrable con coste editable.

### Proveedor OpenAI para imagen

- Existe proveedor de imagen con prefijo `openai/*`.
- `openai/gpt-image-2-low` y `openai/gpt-image-2-medium` están disponibles como modelos de imagen seleccionables en Admin > Modelos y registrables en Admin > Economia.
- `openai/gpt-image-2` queda como alias legacy compatible y se resuelve como `low`.
- La API key se guarda en `app_settings.provider_openai_api_key` desde Admin > Modelos.
- Las llamadas directas a OpenAI resuelven `quality` desde el sufijo del modelo cuando existe; sin sufijo usan `low` por defecto.
- Si no hay imagenes de referencia, se usa `POST https://api.openai.com/v1/images/generations`.
- Si hay referencias visuales o plantilla de layout, se usa `POST https://api.openai.com/v1/images/edits` con `image[]` para conservar el contexto visual.
- El tamano enviado a OpenAI se deriva del formato social con dimensiones validas multiplo de 16, por ejemplo `4:5 -> 1024x1280`, `9:16 -> 1024x1792` y `16:9 -> 1792x1024`.

### Preview desktop de texto en canvas

- La preview editable de `image` en desktop ya no debe gobernarse por breakpoints de viewport ni por offsets negativos para encajar texto.
- La escala tipografica debe depender del ancho real del canvas mediante tokens fluidos con unidades de contenedor (`cqi`) y limites `clamp()`.
- Los textos visibles del canvas deben clasificarse por zonas semanticas:
  - `headline`
  - `support`
  - `meta`
  - `cta`
- Archivo de clasificacion: `src/components/studio/previewTextLayout.ts`
- Archivo de render: `src/components/studio/TextLayersEditor.tsx`
- Regla operativa:
  - no reutilizar una sola anchura para todos los bloques de texto
  - no volver a introducir `--tl-middle-top` negativos ni gaps negativos para corregir composiciones
  - si una nueva necesidad rompe el sistema, ajustar tokens y anchos maximos por zona antes de parchear por resolucion

## Ultimo modulo visitado y entrada al lab

- La home no debe mandar siempre a una ruta fija al pulsar `Entrar al lab`.
- Regla vigente:
  1. si no hay sesion, `Entrar al lab` lleva a `sign-in`
  2. tras autenticar, `onboarding` resuelve la ultima zona real del usuario
  3. el destino puede ser `image`, `carousel` o `brand-kit`
  4. si no existe un ultimo destino valido, el fallback es `/image`
- Fuente de verdad:
  - `work_sessions.getLastVisitedModule`
  - `brand-kit` tambien debe registrarse como modulo valido dentro de `work_sessions` para no quedar fuera de esta resolucion

### Desarrollo LAN en la misma red

- Para probar desde movil u otros dispositivos en la misma red hay que usar `npm run dev:lan` o `npm run dev:lan:quiet`.
- Ese flujo detecta una IP privada util, expone Next en `0.0.0.0:3000`, inyecta `NEXT_PUBLIC_APP_URL` con la URL LAN correcta para esa sesion y rellena `allowedDevOrigins`.
- Evitar fijar manualmente una IP LAN en `.env.local`; la IP puede cambiar entre redes y romper Clerk o los redirects de desarrollo.

## Navegador automatizado y verificacion visual

### Regla operativa

- La via prioritaria para control del navegador y verificacion visual es `Google Chrome CDP` mediante `chrome-devtools`.
- `Playwright` queda como herramienta secundaria para flujos puntuales o automatizaciones concretas, no como capa principal de inspeccion visual diaria.

### Motivo

- Mezclar `Playwright` y `Chrome CDP` como si fueran equivalentes genera diagnosticos inconsistentes.
- El patron estable del proyecto es:
  1. levantar la app
  2. arrancar el navegador aislado con `npm run chrome:debug` o `npm run dev:debug-browser`
  3. verificar que el puerto `9222` responde correctamente
  4. usar `chrome-devtools` como fuente principal de verdad para snapshots, consola, red y validacion visual

### Regla de saneamiento del puerto 9222

- Si el puerto `9222` esta ocupado por un Chrome viejo o un listener degradado, la automatizacion deja de ser fiable aunque parezca que "hay navegador".
- El helper compartido `scripts/chrome-debug-common.ps1` debe actuar solo sobre el Chrome aislado del proyecto (`.tmp/chrome-debug`) y su arbol de procesos.
- No se debe matar el navegador personal de Juanfran para limpiar el entorno del proyecto.
- Antes de declarar que CDP "no funciona", comprobar siempre:
  - que `npm run chrome:debug:kill` deja libre `9222`
  - que `npm run chrome:debug` vuelve a levantar un listener sano
  - que `chrome-devtools` puede listar paginas o tomar snapshot sin timeout de `Network.enable`

### Navegador personal vs navegador aislado

- `Chrome CDP` puede controlar un navegador con sesion real solo si ese navegador ha sido lanzado explicitamente con puerto de depuracion remoto.
- El flujo estandar del proyecto sigue siendo un navegador aislado para no interferir con otras pestanas o trabajo personal.
- Si se quiere usar el navegador personal con cookies reales, debe tratarse como un modo deliberado y no como comportamiento por defecto.

### CLI oficial del proyecto para Chrome CDP

- El wrapper oficial del repo vive en `scripts/cdp.mjs`.
- Ese wrapper delega en el skill instalado en `.agents/skills/chrome-cdp/scripts/cdp.mjs` y evita depender de rutas manuales.
- Script npm oficial:
  - `npm run cdp -- list`
  - `npm run cdp -- snap <target>`
  - `npm run cdp -- shot <target>`
  - `npm run cdp -- click <target> "<selector>"`
  - `npm run cdp -- type <target> "texto"`
- Regla operativa:
  1. habilitar remote debugging en `chrome://inspect/#remote-debugging`
  2. usar `npm run cdp -- list` para comprobar que el navegador real responde
  3. trabajar sobre esa sesion como via prioritaria si el contexto requiere cookies y login reales

### Reutilizacion de sesion de depuracion ya concedida

- Si Chrome ya muestra el aviso de que esta siendo controlado por software automatizado, se asume que la depuracion remota ya esta concedida para esa sesion.
- En ese estado no se debe forzar un nuevo navegador ni provocar una nueva peticion de aprobacion si antes puede verificarse el control existente.
- Orden de comprobacion obligatorio antes de lanzar nuevas peticiones o abrir un Chrome alternativo:
  1. `npm run cdp -- list`
  2. si responde, reutilizar esa sesion
  3. solo intentar una nueva conexion o un navegador alternativo si la comprobacion anterior falla de verdad
- Objetivo: no depender de que Juanfran este delante para aceptar prompts repetidos de depuracion.

### Doble verificacion recomendada

- Cuando se toque infraestructura de navegador o se sospeche intermitencia:
  1. parar Chrome debug
  2. arrancarlo limpio
  3. probar CDP
  4. repetir el ciclo una segunda vez
- No dar por cerrada una incidencia de navegador con una unica prueba positiva.

## Mapeo de ratios en Gemini Image

- El mapper central de ratios para Gemini vive en `src/lib/gemini.ts`.
- Regla vigente:
  - `gemini-3-pro-image-preview` y `gemini-2.5-flash-image` aceptan la base oficial: `1:1`, `3:2`, `2:3`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`.
  - `gemini-3.1-flash-image-preview` añade soporte directo para `1:4`, `1:8`, `4:1` y `8:1`.
- Todas las peticiones de imagen a Gemini deben enviarse con `imageSize: "1K"`.
- Si la UI pide un ratio no soportado por el modelo activo, no se fuerza `1:1`: se aproxima automaticamente al ratio oficial mas cercano del modelo para preservar composicion.

## Arquitectura de internacionalizacion

### Stack actual

- Libreria base: `i18next` + `react-i18next`
- Provider cliente: [src/components/providers/I18nProvider.tsx](F:/_PROYECTOS/x-studio/src/components/providers/I18nProvider.tsx)
- Configuracion central: [src/lib/i18n.ts](F:/_PROYECTOS/x-studio/src/lib/i18n.ts)
- Locales soportados: [src/locales/config.ts](F:/_PROYECTOS/x-studio/src/locales/config.ts)

### Idiomas activos

- `es-ES` (por defecto)
- `en-US`

La arquitectura queda preparada para sumar mas idiomas anadiendo nuevos directorios de locale y registrandolos en `src/lib/i18n.ts` y `src/locales/config.ts`.

### Namespaces actuales

- `common`: shell compartida, navegacion, acciones globales, creditos
- `auth`: pantallas y componentes de acceso
- `home`: landing, estados de beta y footer
- `settings`: preferencias de usuario
- `video`: modulo de video
- `image`: shell del modulo de imagen, dialogs de sesion, toasts visibles y panel principal
- `carousel`: shell del modulo de carrusel, dialogs de sesion, CTA principales y panel principal
- `brandKit`: carga, toasts y estados base del modulo de kit de marca

### Reglas de implementacion

1. No hardcodear texto UI nuevo en componentes.
2. Reutilizar `common` para textos compartidos y crear namespace propio cuando un modulo crezca.
3. Persistir idioma en `localStorage` con la clave `xstudio.locale`.
4. Cambiar idioma siempre a traves de `setAppLocale()`.
5. Pensar los textos para expansion futura; evitar concatenaciones manuales.

### Estado de rollout

- Shell principal y menu movil ya internacionalizados.
- Header, sidebar, creditos, auth, landing, settings y video ya cuelgan del sistema i18n.
- `image`, `carousel` y `brand-kit` ya tienen namespace propio y una segunda ola aplicada sobre shells, dialogs, CTA, placeholders, toasts visibles y paneles principales.
- Los catalogos del carrusel que llegan desde Convex se localizan por `structure_id` y `composition_id` en cliente para no depender del idioma guardado en base de datos.
- Las descripciones legacy de composiciones del carrusel usan `layoutPrompt` como fallback en ingles cuando el registro historico solo trae copy en espanol.

### Deuda conocida

- El repo sigue teniendo mojibake heredado en archivos antiguos fuera del bloque nuevo de i18n.
- Antes de cerrar fases grandes de texto UI conviene ejecutar una busqueda de `?`, `?` y `?` sobre `src`.
## Loading, cancelacion y paginas legales

## Correo transaccional

### Proveedor actual

- El proyecto usa `SMTP2GO` para correo transaccional.
- La capa de envio local vive en `src/lib/email/smtp2go.ts`.
- La ruta de prueba local vive en `src/app/api/dev/transactional-email/route.ts`.

### Regla operativa

- En local, la API key se puede resolver desde `SMTP2GO_API_KEY`.
- Como fallback tecnico, la capa tambien puede leer `provider_smtp2go_api_key` desde `app_settings` usando Convex.
- El remitente por defecto es `Post Laboratory <mail@postlaboratory.com>`.
- El `reply-to` por defecto es `mail@postlaboratory.com`.

### Plantillas preparadas

- `welcome`
- `betaApproved`
- `creditsPurchased`

Estas plantillas quedan preparadas para conectarse despues a eventos reales de alta, aprobacion beta o compra de creditos, pero en esta fase no se enganchan automaticamente a Clerk o Stripe para evitar envios accidentales durante desarrollo.

### Ruta local de smoke test

- `POST /api/dev/transactional-email`

Payload ejemplo:

```json
{
  "template": "welcome",
  "to": "postlaboratorycorreo@gmail.com",
  "locale": "es",
  "name": "Juanfran",
  "actionUrl": "http://127.0.0.1:3000/image"
}
```

### Variables de entorno recomendadas

- `SMTP2GO_API_KEY`
- `SMTP2GO_FROM`
- `SMTP2GO_REPLY_TO`
- `SMTP2GO_TEST_RECIPIENT`

## Benchmark operativo de local-worker

### Objetivo

- El benchmark de `local-worker` existe para medir ahorro real de coste operativo en tareas mecanicas del repo, no para autoaplicar cambios.

### Nombre operativo

- La persona operativa del worker delegado en este proyecto se llama `EmilIA`.
- Cuando una tarea se delega a `local-worker`, se entiende que el plan o microplan se esta enviando a `EmilIA` en modo propuesta.

### Regla de seguridad

1. El worker solo genera propuestas en `tools/.worker-results/`.
2. El benchmark nunca debe ejecutarse con `--apply`.
3. La validez del workflow se evalua primero por formato aplicable, despues por calidad tecnica.

### Fuente operativa

- La documentacion viva del benchmark esta en [docs/LOCAL_WORKER_BENCHMARK.md](F:/_PROYECTOS/x-studio/docs/LOCAL_WORKER_BENCHMARK.md)

### Spinner global

- El proyecto usa [src/components/ui/spinner.tsx](F:/_PROYECTOS/x-studio/src/components/ui/spinner.tsx) como spinner visual unico.
- La implementacion replica el loader `blocks-shuffle-3` y se expone como `Loader2` para mantener compatibilidad con el resto del codigo.
- No se deben introducir nuevos spinners con `animate-spin` o SVG distintos en componentes de producto.

### Regla de cancelacion en procesos largos

- Los flujos largos visibles para usuario deben exponer una accion `Detener` o `Stop`, tambien en mobile.
- El patron actual se aplica en:
  - `image`: analisis de prompt y generacion de imagen
  - `carousel`: analisis de prompt y generacion de carrusel
  - `brand-kit`: analisis principal y analisis lanzado desde el asistente
- La cancelacion visual debe estar internacionalizada y, cuando sea posible, abortar la operacion real con `AbortController` o con una bandera de cancelacion controlada.

### Paginas legales y about/contact

- El shell comun vive en [src/components/legal/LegalPage.tsx](F:/_PROYECTOS/x-studio/src/components/legal/LegalPage.tsx).
- El contenido se gestiona desde el namespace `legal` en:
  - [src/locales/es-ES/legal.json](F:/_PROYECTOS/x-studio/src/locales/es-ES/legal.json)
  - [src/locales/en-US/legal.json](F:/_PROYECTOS/x-studio/src/locales/en-US/legal.json)
- Rutas activas:
  - `/privacy`
  - `/terms`
  - `/cookies`
  - `/contact`
- La home enlaza estas rutas desde el footer para que siempre exista salida publica a informacion legal y a la pagina de contacto/about.
- En `/contact`, el correo oficial `mail@postlaboratory.com` se revela bajo interaccion en cliente para no quedar expuesto en el HTML inicial ni en un `mailto:` estatico.

## Billing y Stripe

### Arquitectura

- Stripe gestiona Checkout alojado, Customer Portal, recibos e invoices.
- Convex es la fuente de verdad para packs, clientes de billing, compras y ledger de creditos.
- Las piezas base viven en:
  - [src/lib/billing.ts](F:/_PROYECTOS/x-studio/src/lib/billing.ts)
  - [src/lib/stripe.ts](F:/_PROYECTOS/x-studio/src/lib/stripe.ts)
  - [src/lib/billing-server.ts](F:/_PROYECTOS/x-studio/src/lib/billing-server.ts)
  - [convex/billing.ts](F:/_PROYECTOS/x-studio/convex/billing.ts)

### Catalogo actual

- `trail-10`: 5 EUR por 10 creditos
- `studio-30`: 15 EUR por 30 creditos
- `orbit-100`: 30 EUR por 100 creditos
- Los slugs son estables y enlazan pricing, checkout, confirmacion y ledger.

### Tablas de Convex

- `billing_packs`: definicion interna y referencias Stripe
- `billing_customers`: relacion usuario <-> `stripe_customer_id`
- `billing_purchases`: compras, estados finales y enlaces de recibo/factura
- `billing_events`: eventos Stripe procesados para deduplicacion
- `credit_transactions`: ledger real de creditos

### Flujo de compra

- Pricing publica:
  - [src/app/pricing/page.tsx](F:/_PROYECTOS/x-studio/src/app/pricing/page.tsx)
  - [src/components/billing/PricingPageClient.tsx](F:/_PROYECTOS/x-studio/src/components/billing/PricingPageClient.tsx)
- Checkout:
  - [src/app/api/stripe/checkout/route.ts](F:/_PROYECTOS/x-studio/src/app/api/stripe/checkout/route.ts)
- Antes de crear la sesion se asegura:
  - catalogo por defecto en Convex
  - usuario Convex
  - `stripe_customer_id`
  - `stripe_price_id` del pack
- Cada checkout se registra primero como compra pendiente.

### Confirmacion y sincronizacion

- La compra se confirma por dos vias:
  - webhook en [src/app/api/stripe/webhook/route.ts](F:/_PROYECTOS/x-studio/src/app/api/stripe/webhook/route.ts)
  - confirmacion post redirect en [src/app/api/stripe/confirm/route.ts](F:/_PROYECTOS/x-studio/src/app/api/stripe/confirm/route.ts)
- Esta doble via permite validar compras locales aunque no exista webhook publico expuesto.
- La sincronizacion del catalogo vive en `syncStripeCatalog()` dentro de [src/lib/billing-server.ts](F:/_PROYECTOS/x-studio/src/lib/billing-server.ts).

### Seguridad interna

- Las mutaciones sensibles de Convex para Stripe usan `STRIPE_INTERNAL_SECRET`.
- Ese secreto permite que rutas server-side de Stripe escriban en Convex sin depender de funciones internas no accesibles via `ConvexHttpClient`.
- La sincronizacion admin via [src/app/api/stripe/sync/route.ts](F:/_PROYECTOS/x-studio/src/app/api/stripe/sync/route.ts) exige sesion Clerk valida y email admin.

### Superficies de producto

- Usuario:
  - `/pricing`
  - `/billing`
  - `/billing/success`
  - Customer Portal de Stripe
- Admin:
  - [src/components/admin/BillingAdminPanel.tsx](F:/_PROYECTOS/x-studio/src/components/admin/BillingAdminPanel.tsx)
  - integrado en [src/app/admin/page.tsx](F:/_PROYECTOS/x-studio/src/app/admin/page.tsx)

### Rutas publicas relacionadas

- `/pricing` debe seguir marcada como publica en [src/proxy.ts](F:/_PROYECTOS/x-studio/src/proxy.ts).
- `/api/stripe/webhook` tambien debe seguir publica para que Stripe entregue eventos.

## Referral program

### Architecture

- Referral attribution is persisted in Convex and not inferred from transient checkout metadata.
- User codes live on `users.referral_code`.
- Referral relationships live on `referrals`.
- Granted and reversed rewards live on `referral_rewards`.
- Credits are always reflected in the existing `credit_transactions` ledger.

### Runtime flow

1. A shared client tracker captures `?ref=` and stores it locally.
2. Once the invited user authenticates with Clerk, `/api/referrals/claim` resolves the real authenticated user and claims the code securely.
3. The referrer receives a fixed signup reward from `app_settings.referral_signup_reward_credits`.
4. When the referred user completes a paid Stripe checkout, `finalizeCheckoutSecure` grants the referrer a percentage of purchased credits using `app_settings.referral_purchase_reward_percentage`.
5. If that purchase is refunded, the referral bonus is reversed from the referrer to keep the ledger coherent.

### Admin knobs

- `referral_signup_reward_credits`
- `referral_purchase_reward_percentage`

These values are editable from Admin and must remain the single source of truth for referral rewards.

## Chrome remote debug workflow

### Goal

- Make Chrome DevTools remote debugging reproducible for QA and responsive reviews.
- Avoid depending on a personal Chrome session or on a random open port.
- Support Chrome 144+ shared-session debugging, including Chrome 146 with the new remote debugging toggle in `chrome://inspect/#remote-debugging`.

### Commands

- `npm run chrome:debug`: launch Chrome with remote debugging on `9222` and an isolated profile.
- `npm run chrome:debug:studio`: same flow, opening `/studio`.
- `npm run chrome:debug:kill`: stop only the debug Chrome instances created for this project.
- `npm run dev:debug-browser`: ensure the local app is running and then open Chrome in debug mode against `/studio`.

### Rules

1. The debug browser must always use the isolated profile `.tmp/chrome-debug`.
2. Before using Chrome DevTools MCP, verify `127.0.0.1:9222` is reachable.
3. If the port is not reachable, relaunch Chrome through `scripts/start-chrome-debug.ps1`.
4. In Chrome 144+, if the user has enabled remote debugging for the real browser session in `chrome://inspect/#remote-debugging`, prefer attaching to that live session instead of forcing an isolated profile.
5. Do not assume `http://127.0.0.1:9222/json/version` will answer. In Chrome 146 real-session mode, the reliable source of truth can be `DevToolsActivePort` inside the active Chrome user data directory.
6. When `/json/version` fails but `DevToolsActivePort` exists, derive the WebSocket endpoint from that file and connect directly with `ws://127.0.0.1:<port>/devtools/browser/<id>`.
7. If DevTools MCP still cannot attach, continue with Playwright over CDP and browser console instead of blocking the task.
8. For visual QA in this project, prefer the shared authenticated browser session when available; the isolated debug browser remains the fallback for unauthenticated or reproducible flows.
9. On Windows, Codex should have a `chrome-devtools` MCP server configured in `C:\Users\Usuario\.codex\config.toml` using `chrome-devtools-mcp@latest` with `--auto-connect` for Chrome 144+ shared-session debugging. If that is not sufficient, the fallback is `--wsEndpoint=<resolved endpoint from DevToolsActivePort>`.

### Implementation notes

- Shared helpers live in `scripts/chrome-debug-common.ps1`.
- `scripts/resolve-chrome-cdp-endpoint.mjs` resolves the best available CDP endpoint in this order:
  1. explicit environment overrides (`PLAYWRIGHT_CDP_WS_ENDPOINT`, `CHROME_CDP_WS_ENDPOINT`, `PLAYWRIGHT_CDP_URL`, `CHROME_CDP_URL`)
  2. `DevToolsActivePort` from the real Chrome user profile on Windows
  3. `DevToolsActivePort` from `.tmp/chrome-debug`
  4. fallback `http://127.0.0.1:9222`
- The old `/json/version` HTTP probe is still useful for isolated browsers, but it is no longer a hard requirement for shared-session Chrome 146.
- The stop script only targets Chrome processes started with the debug port or the isolated profile, so the normal user browser session is not killed.

## Playwright auth state local

### Goal

- Reuse the authenticated local session for Playwright without automating Google login on every run.
- Keep QA stable by capturing auth from the isolated debug Chrome already attached to the app.

### Commands

- `npm run playwright:auth:save`: connects to the debug browser on `127.0.0.1:9222` and stores the current session in `playwright/.auth/user.json`.

### Rules

1. The source session must come from the isolated debug browser, not from a personal Chrome profile.
2. Run the capture only after confirming the debug browser is already authenticated in the app.
3. `playwright.config.ts` should use `playwright/.auth/user.json` automatically when the file exists.
4. If the auth file does not exist or expires, Playwright must still be able to run public-route checks without failing config bootstrap.
5. In this project with Clerk dev keys, `storageState` alone may not fully rehydrate an authenticated session in a fresh Playwright browser. For authenticated E2E against local development, prefer attaching Playwright to the shared debug browser session through the endpoint resolved by `scripts/resolve-chrome-cdp-endpoint.mjs`.

## Video de carrusel desde Admin

### Fuente de verdad global

- La duracion del video exportado del modulo `carousel` ya no debe quedarse hardcodeada en el canvas.
- Los valores globales viven en `app_settings`:
  - `carousel_video_slide_duration_ms`
  - `carousel_video_last_slide_duration_ms`
- La query publica que consume el frontend es `api.settings.getCarouselVideoConfig`.

### Biblioteca global de audio

- Las pistas del video de carrusel deben gestionarse desde Admin y persistirse en Convex Storage, no en la carpeta local `songs/` como fuente principal.
- La tabla de catalogo es `admin_audio_tracks`.
- La query publica `api.adminAudio.listActiveTracks` devuelve solo pistas activas con URL resuelta.
- El export del carrusel elige una pista activa al azar.

### Regla operativa

1. Si no hay pistas activas, el export con musica debe fallar con error explicito y no usar fallback silencioso.
2. La duracion del audio se adapta al total del video; la musica no gobierna la duracion de slides.
3. La UI de Admin debe permitir:
   - subir pistas
   - activar/desactivar pistas
   - borrar pistas
4. La exportacion final debe renderizarse en servidor y no depender del codec que el navegador del usuario soporte en `MediaRecorder`.

### Render y compatibilidad

- La route de verdad para export video del carrusel es `src/app/api/carousel/export-video/route.ts`.
- El cliente del canvas solo prepara las slides y dispara esa route; no debe volver a decidir contenedor o codec localmente.
- El render compatible actual sale en:
  - contenedor `mp4`
  - video `H.264` (`libx264`)
  - audio `AAC` cuando hay pista
  - pixel format `yuv420p`
  - `+faststart` para mejorar compatibilidad al compartir y reproducir online

### Limites operativos

- El total del video del carrusel queda limitado a `60s`.
- Si la configuracion global de duraciones supera ese maximo para el numero de slides exportadas, la route debe rechazar la exportacion con error explicito en lugar de intentar un render largo en Vercel.

### Practical note

- The spec `tests/image-debug-auth.spec.ts` is designed to run against the shared debug browser session.
- `npm run chrome:cdp:endpoint` prints the currently resolved CDP endpoint so debugging failures can be diagnosed quickly.
- Use `RUN_REAL_IMAGE_GENERATION=1` only when you explicitly want to spend time/credits on a real generation attempt.

## Image provider timeout guard

### Goal

- Prevent `/api/generate` from hanging forever when the upstream image provider stops responding.

### Rules

1. Direct image-provider HTTP calls should run with a bounded timeout in the provider layer.
2. When an upstream timeout happens, the API should answer with a handled error instead of leaving the client waiting indefinitely.

## Migracion de dominio a Postlaboratory

### Estado objetivo

- Dominio principal de producto: `postlaboratory.com`
- Dominio legado a redirigir: `adstudio.click`
- Dominio frontend de Clerk en produccion: `clerk.postlaboratory.com`

### Regla operativa

1. `NEXT_PUBLIC_APP_URL` debe apuntar siempre a `https://postlaboratory.com` en produccion.
2. `CLERK_ISSUER_URL` debe apuntar siempre a `https://clerk.postlaboratory.com`.
3. La `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` de produccion debe corresponder al frontend API `clerk.postlaboratory.com`.
4. Cualquier dominio legado (`adstudio.click`, `adstudio.com` y variantes `www`) debe redirigir de forma permanente al dominio principal.

## Gobernanza del tema visual

### Regla de producto

- El tema de color de la aplicacion es global y solo se configura desde `/admin`.
- Los usuarios no pueden personalizar colores desde `/settings`.

### Fuente de verdad

- Los valores del tema viven en `app_settings` de Convex.
- La paleta global actual se compone de:
  - `theme_primary`
  - `theme_secondary`
  - `theme_surface`
  - `theme_surface_alt`
  - `theme_muted`
  - `theme_border`
  - `theme_ring`
- El runtime cliente debe leer esos valores globales y aplicarlos como unica referencia activa del tema.
- Si faltan tokens auxiliares, el runtime debe derivarlos de `theme_primary` y `theme_secondary` para mantener compatibilidad con configuraciones antiguas.

### Regla de implementacion

1. No introducir overrides por usuario en `localStorage` para colores globales.
2. No reabrir selectores de paleta en `/settings`.
3. Si en el futuro se amplian tokens visuales, deben seguir colgando del mismo origen global en Admin.

### Presets de Admin

- `/admin` debe ofrecer presets propuestos de tema para acelerar la seleccion de combinaciones coherentes sin obligar a partir de cero.
- Esos presets no son una segunda fuente de verdad: rellenan la paleta editable de Admin y el guardado posterior persiste los tokens finales en `app_settings`.
- La UI de Admin debe exponer la paleta completa para que Juanfran pueda retocar cada token antes de guardar.
- Cuando un preset se construye desde una paleta corta de varios colores, la UI debe conservar y mostrar la paleta original completa como referencia visual, aunque luego derive los tokens globales (`theme_primary`, `theme_secondary`, `theme_surface`, `theme_surface_alt`, `theme_muted`, `theme_border`, `theme_ring`) para la edicion.

## Depuracion visual del estudio

### Regla de producto

- Los overlays de depuracion visual del estudio no deben eliminarse del codigo cuando haya que grabar demos o capturas.
- Su visibilidad se gobierna desde Admin con un unico setting global.

### Fuente de verdad

- La clave global es `studio_debug_overlays_enabled` en `app_settings`.
- Si la clave no existe, el comportamiento por defecto es visible para mantener compatibilidad con el estado historico del proyecto.

### Alcance actual

- Oculta o muestra el icono de ver prompt en `image`.
- Oculta o muestra el icono y modal de prompt debug en `carousel`.
- Oculta o muestra la barra `Admin composición` del modulo `carousel`.

## Blindaje de tipografias en prompts

### Regla de producto

- Los nombres de fuente pueden mencionarse en prompts porque ayudan al modelo a aproximarse a la familia correcta.
- Esa mencion nunca puede tratarse como copy visible ni imprimirse dentro de la imagen final.

### Regla de implementacion

1. Las referencias a fuentes deben formularse como metadato invisible de estilo.
2. Los bloques de prompt de `image` y `carousel` deben incluir una prohibicion explicita de renderizar nombres de fuente, etiquetas internas o tokens como texto visible.
3. Si una fuente aparece en contexto, contrato tipografico o instrucciones de estilo, el modelo solo puede usarla para decidir forma, peso, ritmo, remates, contraste y jerarquia del texto.
4. Antes de interpolar texto narrativo o visual en prompts finales, conviene sanear menciones directas a familias conocidas para reducir fugas accidentales.

### DNS minimo de Clerk

- `clerk.postlaboratory.com` -> `frontend-api.clerk.services`
- `accounts.postlaboratory.com` -> `accounts.clerk.services`

Si Clerk exige verificacion completa del dominio para correo o cuenta hospedada, pueden ser necesarios tambien `clkmail` y los registros DKIM asociados.

## Drawer mobile y capas de modal

- El drawer mobile compartido del panel de trabajo usa capas altas (`z-[60]` y `z-[70]`) para mantenerse interactivo sobre la vista previa.
- La oreja del drawer mobile debe permanecer anclada en el mismo sitio tanto cerrada como abierta para que el gesto de abrir/cerrar tenga continuidad espacial. No debe reservar ancho de layout: va superpuesta por fuera del borde del panel.
- La oreja debe apoyarse en tokens semanticos del tema (`primary`, `primary-foreground`, `border`, `ring`) para reflejar automaticamente la personalizacion definida en `/settings`, sin colores hardcodeados.
- La cabecera interna del drawer en mobile debe ser minima y no gastar altura en textos explicativos si la interaccion ya es evidente por la oreja persistente, el gesto y el boton de cierre.
- Los `Dialog` base deben renderizarse por encima de ese drawer (`overlay z-[120]`, `content z-[130]`) para que modales de Brand Kit, estilos u otros flujos no queden ocultos detras del panel.
- En mobile no se debe depender solo de `hover` para acciones de borrar o quitar elementos dentro de la vista previa; esos controles deben seguir siendo visibles o claramente tocables con el dedo.
- Las acciones clave de resultado en mobile, como descargar imagen o ZIP, deben vivir en el canvas o en un overlay propio, no solo en el rail lateral de escritorio.

## Bloqueo de pull-to-refresh en modulos creativos

- En `image` y `carousel` se desactiva el gesto nativo de pull-to-refresh del navegador cuando el layout esta en mobile.
- La regla se aplica con un hook compartido (`useDisablePullToRefresh`) que actua sobre `html` y `body`, y se refuerza en el contenedor raiz del modulo con `overscrollBehaviorY: 'none'`.
- En dispositivos donde `overscroll-behavior` no basta, el hook tambien intercepta `touchmove` descendente con listeners no pasivos cuando no existe ningun ancestro scrolleable que pueda seguir subiendo. Eso evita que el navegador interprete el gesto como refresh de pagina.
- El objetivo es evitar refresh accidentales al hacer tope arriba durante el trabajo en canvas o paneles con sesion no guardada.

## Catalogo de formatos por red social

- La fuente de verdad de formatos sociales del modulo de imagen vive en `src/lib/creation-flow-types.ts`, dentro de `SOCIAL_FORMATS`.
- El catalogo visible se limita a las plataformas `instagram`, `tiktok`, `facebook`, `x`, `youtube` y `linkedin`.
- `whatsapp` queda fuera del selector y del catalogo activo; no debe reaparecer salvo decision explicita de producto.
- Solo se muestran formatos con proporcion estandar util para composicion visual. Las medidas especiales sin ratio reutilizable (cabeceras, covers exoticos o casos puntuales sin familia clara) se excluyen del selector para no mezclar formatos operativos con excepciones de soporte.

## Paridad visual entre Image y Carousel

- `image` actua como referencia principal del lenguaje visual del estudio creativo.
- `carousel` debe reutilizar los mismos patrones compartidos siempre que la funcion sea equivalente.
- Componentes y constantes compartidas vigentes:
  - `src/components/studio/shared/selectStyles.ts`
  - `src/components/studio/shared/StudioActionBar.tsx`
  - `src/components/studio/shared/dialogStyles.ts`
  - `src/components/studio/shared/canvasStyles.ts`
- Regla de mantenimiento:
  - si un dropdown, dialogo de decision, barra inferior o toolbar flotante se pule en `image`, revisar si `carousel` debe heredar el mismo ajuste en la misma sesion o en la siguiente.

## Brand Kit y lenguaje visual compartido

- `brand-kit` debe seguir el mismo lenguaje visual base que `image` y `carousel`.
- Las superficies nuevas de `brand-kit` deben reutilizar estilos compartidos desde `src/components/brand-dna/brandKitStyles.ts`.
- Regla operativa:
  1. evitar `glass-panel` como solucion por defecto
  2. evitar el patron de tarjeta dentro de tarjeta
  3. usar la misma jerarquia tipografica y la misma familia de radios y alturas para campos, botones y dialogos
  4. mantener la misma logica de seleccion visual: panel = color/fondo/borde, modal de imagen = check si aporta claridad
- Regla de borradores del asistente:
  - un `Brand Kit` nuevo creado desde el asistente debe arrancar en `0%`
  - placeholders como `My Brand`, `Mi marca` o equivalentes no cuentan como progreso real
  - la completitud solo debe subir cuando el usuario rellena contenido real o cuando el analisis autocompleta datos validos

## Seccion Academy publica integrada

### Objetivo de producto

- `Academy` sera una seccion publica integrada en la propia plataforma para cubrir ayuda de uso, contenido de descubrimiento y captacion externa sin sacar al usuario del ecosistema.

### Rutas base

- indice publico: `/academy`
- detalle publico: `/academy/[slug]`

### Regla estructural

- `Academy` debe heredar la misma familia de shell y navegacion del producto, pero con layout editorial y sin panel derecho.
- No debe sentirse como un blog externo ni como una landing aislada.

### Integracion de navegacion

1. La landing publica debe enlazar `Academy` como destino visible de contenido.
2. La barra lateral interna debe incluir `Academy` como entrada estable del ecosistema.
3. El acceso a `Academy` y a sus articulos debe ser libre, con o sin sesion.

### Modelo editorial V1

- categorias visibles desde el inicio:
  - `guides`
  - `tutorials`
  - `news`
  - `inspiration`
- metadatos minimos por publicacion:
  - `slug`
  - `title`
  - `excerpt`
  - `category`
  - `publishedAt`
  - `coverImage`
  - `featured`
  - `content`

### Regla tecnica de V1

- La V1 de `Academy` debe resolverse con una fuente de contenido local tipada, sin CMS externo.
- El modulo debe disponer de namespace propio de i18n: `academy`.

## Import/export portable de Brand Kit

- El formato portable del Brand Kit vive en `src/lib/portable-brand-kit.ts`.
- El export portable debe embeder siempre los assets visuales del kit:
  - `logo_url`
  - `logos[]`
  - `favicon_url`
  - `screenshot_url`
  - `images[]`
- Regla operativa:
  1. si uno o mas assets del kit no pueden leerse durante el export, el export debe fallar; no se permite generar un JSON "medio portable" con URLs colgando
  2. al importar un kit portable, todos los assets embebidos deben re-subirse a storage del usuario destino antes de guardar el documento
  3. si falta algun asset embebido o falla la copia de uno de ellos, la importacion debe abortarse; no se permite conservar URLs del usuario origen como fallback silencioso
  4. los logos importados deben re-subirse como `assetKind=logo` para conservar el tratamiento de transparencia y compresion especifico de logos
- Seguridad:
  - `POST /api/brand-kit/create-empty` debe validar la sesion Clerk y rechazar cualquier intento de crear un kit para un `clerk_user_id` distinto del usuario autenticado
- Limite vigente:
  - el formato portable cubre los assets persistidos dentro de `brand_dna`
  - los assets efimeros o de sesion fuera del Brand Kit, como `session_images`, no forman parte del paquete portable salvo implementacion explicita futura

## Preview editable de textos

- La preview de `image` clasifica los textos en zonas semanticas (`headline`, `support`, `meta`, `cta`, `url`) desde `src/components/studio/previewTextLayout.ts`.
- La tipografia y las zonas de la preview deben gobernarse por el tamano real del canvas, no por breakpoints rigidos de ventana.
- Para bloques de texto editables que deban abrazar visualmente su contenido, la base recomendada es medicion por espejo:
  - un nodo invisible replica el texto renderizado real
  - el `textarea` editable se superpone encima
  - el marco visual se dimensiona por el espejo, no por `scrollHeight` ni por heuristicas en `ch`
- El patron reusable vive en `src/components/studio/PreviewEditableTextBlock.tsx`.
- Regla de mantenimiento:
  1. la `x` de borrar no debe invadir el texto medido
  2. el marco debe crecer con el contenido real
  3. desktop pequeno y mobile deben compartir la misma logica de medicion, cambiando solo tokens y limites de zona

## Motor adaptativo de composicion de preview

- La preview de `image` usa ahora un motor adaptativo para distribuir textos segun:
  - ancho real del canvas
  - alto real del canvas
  - ratio real del canvas
  - cantidad de bloques visibles
  - carga total de texto
  - presencia de CTA y URL
- La base pura vive en:
  - `src/components/studio/previewCompositionMetrics.ts`
  - `src/components/studio/previewCompositionPlan.ts`
  - `src/components/studio/usePreviewComposition.ts`
- El sistema resuelve un `layout mode` semantico:
  - `compact`
  - `balanced`
  - `airy`
- Las metricas puras incluyen tambien:
  - `viewportBucket`
  - `aspectBucket`
  - `textPressure`
  - longitudes maximas de `support` y `meta`
- El plan adaptativo no reparte solo anchura:
  - calcula anchos maximos por zona
  - calcula escalas por zona
  - calcula ritmo vertical (`stackGap`, `supportGap`, `metaGap`)
  - ajusta offsets de `headline`, bloque medio, chip de marca y CTA segun holgura vertical estimada
- Regla operativa:
  1. `globals.css` solo define tokens base fluidos
  2. la composicion final la decide el plan adaptativo en JS
  3. `TextLayersEditor.tsx` debe consumir ese plan y no reintroducir maximos hardcodeados por zona
  4. mobile y desktop comparten el mismo motor; solo cambian presupuestos y prioridades
  5. las reglas viejas de viewport no deben volver a meter compensaciones manuales sobre `textarea` o margenes negativos
- Orden de compactacion cuando falta espacio:
  1. reducir gaps
  2. ajustar anchuras de zona
  3. reducir ligeramente `support/meta`
  4. proteger el `headline` y la CTA el mayor tiempo posible
