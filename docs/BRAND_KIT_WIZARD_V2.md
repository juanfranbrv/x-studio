# Brand Kit Wizard v2 — Documento de Diseño

## Visión

Crear un proceso de creación de brand kit que se sienta como hojear una revista y marcar lo que te gusta. La IA hace el trabajo pesado; el usuario solo reacciona a lo que ve. Tocar, arrastrar, elegir entre opciones. Nunca pensar "qué debería poner aquí".

## Principios de diseño (inamovibles)

1. **Cada pantalla = 1 decisión fácil.** Cero sobrecarga cognitiva.
2. **Mínima escritura.** Solo nombre de marca y URL/Instagram. Todo lo demás: la IA propone, el usuario elige con clicks.
3. **Pantalla completa** (`/brand-kit/new`). Amplitud, oxígeno visual, no modal.
4. **Visual y casi divertido.** Colores vivos, transiciones suaves, feedback inmediato.
5. **IA proactiva:** genera opciones concretas, el usuario acepta/descarta/modifica.
6. **Preview en vivo:** cada decisión se refleja inmediatamente en un mini-preview que se va construyendo paso a paso.
7. **Navegación libre:** se puede volver atrás en cada paso y se puede salir en cualquier momento.
8. **Mobile-first.** Cada pantalla se diseña primero para móvil y luego se escala a desktop. Touch targets mínimo 44px. Drag & drop con soporte táctil nativo.
9. **Internacionalizado desde el día 1.** Cero strings hardcodeadas. Todos los textos vía i18n (ficheros `src/locales/{lang}/brand-studio.json`). Los contenidos generados por IA (slogans, CTAs, chips de personalidad) se generan en el `preferred_language` del usuario.

## Anti-features (NO construir)

- ❌ Chat/conversación con la IA
- ❌ Generación de logos (diseño nuevo)
- ❌ Templates de kit por industria (v2 potencial)
- ❌ Múltiples variantes de paleta para comparar (v2)
- ❌ Scraping de TikTok, LinkedIn, etc.
- ❌ Gamificación explícita (puntos, badges)
- ❌ Import/export de brand kits
- ❌ Textarea de brand_context visible (se genera silenciosamente)

---

## Flujo de pantallas

```
1. SOURCE        → "¿De dónde partimos?" — Web / Instagram / De cero
2. NAME          → "¿Cómo se llama tu marca?" (solo si "de cero"; si URL/IG el nombre se extrae)
3. LOADING       → Análisis animado (solo si URL/IG)
4. LOGO          → Variaciones automáticas generadas + upload
5. PALETTE       → Elegir paleta base (pick 1 de 3) → Playground de colores con preview en vivo
6. TYPOGRAPHY    → Combos de fonts con preview real
7. PERSONALITY   → Chips de estilo + tono + valores
8. VOICE         → Slogan (pick 1 de 3) + CTAs (toggle)
9. BRAND BOARD   → Review visual + preview de post de red social + guardar
```

Barra de progreso mínima siempre visible en la parte superior.
Botón "Atrás" siempre accesible.
Transición suave tipo slide entre pantallas.

### Campos generados silenciosamente por IA (sin pantalla propia)

Estos campos de BrandDNA se generan automáticamente a partir de las elecciones del usuario, sin que los vea ni edite durante el wizard:

- `brand_context` — se genera a partir de nombre + overview + personalidad + tono + slogan
- `marketing_hooks` — se genera a partir de slogan + tono + overview
- `visual_keywords` — se genera a partir de estética visual + colores + personalidad
- `target_audience` — se infiere de personalidad + overview + tono

Si el usuario quiere ajustarlos, puede hacerlo después desde la edición del brand kit (no durante la creación).

---

## Detalle pantalla a pantalla

### Pantalla 1: Source ("¿De dónde partimos?")

**Layout:** 3 tarjetas grandes centradas a pantalla completa.

**Razón de pedir source primero:** Si el usuario tiene URL o Instagram, el nombre de la marca se extrae automáticamente del análisis. Pedirlo antes es trabajo innecesario en 2 de 3 caminos.

**Tarjetas:**
- 🌐 **"Tengo una web"** → al seleccionar, aparece input de URL inline en la tarjeta
- 📸 **"Tengo Instagram"** → al seleccionar, aparece input de @handle inline
- ✨ **"Empiezo de cero"** → lleva a la pantalla 2 (Name)

Cada tarjeta tiene icono grande, título, subtítulo breve.
Solo se escribe URL o handle. Nada más.

Si elige web o Instagram → salta directamente a pantalla 3 (Loading). El nombre se extrae del análisis.

### Pantalla 2: Name (solo si "de cero")

**Layout:** Centrado, tipografía grande, un solo input protagonista.

- Título: "¿Cómo se llama tu marca?" (texto grande, amable)
- Input de texto con placeholder animado
- Debajo: "¿A qué te dedicas?" — textarea mínimo, 1-2 frases
- Es el ÚNICO momento de escritura libre de todo el wizard
- Si viene de URL/IG → esta pantalla se salta completamente (nombre extraído del análisis)

### Pantalla 3: Loading / Análisis (condicional)

**Solo aparece si el usuario proporcionó URL o Instagram.**

**Layout:** Animación centralizada a pantalla completa.

**Elementos:**
- Animación visual atractiva (no un spinner triste)
- Mensajes secuenciales que van cambiando:
  - "Leyendo tu web..." / "Analizando tu Instagram..."
  - "Detectando colores..."
  - "Extrayendo tipografías..."
  - "Estudiando tu estilo..."
- Barra de progreso orgánica
- Botón "Detener" discreto pero accesible
- Al terminar → transición automática a la siguiente pantalla

**Duración esperada:** 15-30 segundos.

### Pantalla 4: Logo + Variaciones automáticas

**La pantalla "wow" del wizard.** El usuario sube un logo (o viene del scraping) y recibe múltiples variantes generadas automáticamente.

**Variaciones generadas con Sharp (~2-3 segundos):**

| Variante | Operación |
|----------|-----------|
| Transparent (sin fondo) | removeBackground vía remove.bg API |
| Greyscale | `sharp.grayscale()` |
| Mono (blanco/negro puro) | `sharp.threshold(128)` |
| Monocromático tintado | Tint al color primario de la paleta (si ya se extrajo) |
| Inverted (sobre fondo oscuro) | Compositar sobre fondo `#333` |
| Square (con padding) | `sharp.extend()` con padding |
| Square + nombre | Logo centrado + brand name debajo — formato perfil de redes sociales |
| Square Mono | Combinar square + mono |
| Square Inverted | Combinar square + inverted |
| Símbolo solo | AI vision para detectar bounding box del icono (si aplica) |

**Layout:**
- Si hay logos detectados del scraping: se muestran primero como tarjetas seleccionables
- Drop zone grande e invitadora para subir más
- Al subir/seleccionar un logo → se generan las variaciones y aparecen en grid
- Cada variante tiene: nombre descriptivo ("Logo principal", "Logo monocromo", "Logo invertido"), toggle de selección ✓, botón de descarga
- Slider de padding como en la referencia

**Sin logos detectados y "empiezo de cero":** Drop zone protagonista con texto amable. Se puede saltar este paso.

**Cero escritura.** Puro "wow, todo esto a partir de mi logo".

### Pantalla 5: Paleta de colores (dos momentos)

**La pantalla más interactiva del wizard.** Dividida en dos momentos para reducir la sobrecarga cognitiva.

#### Momento 1: "Elige tu base"

La IA propone 2-3 paletas completas como bandas de color a pantalla completa. Cada paleta tiene un nombre evocador generado por IA: "Atardecer urbano", "Bosque digital", "Neón suave", etc.

El usuario toca la que más le gusta → transición al playground.

Esto evita soltar 6 colores sueltos de golpe. Primero una decisión fácil: "¿cuál de estas 3 te gusta más?"

#### Momento 2: "Juega con tus colores" (playground)

La pantalla entera es el preview — el fondo, texto y acentos de la propia pantalla usan los colores seleccionados.

**Tres zonas visuales como "slots":** Fondo — Texto — Acentos

**Interacciones:**
- **Drag & drop entre roles:** Arrastrar un círculo de color de una zona a otra. Al soltar, toda la pantalla cambia en vivo.
- **Toca un círculo → abanico de variantes:** 8-10 tonos cercanos (más claro, más oscuro, más saturado, más apagado) dispuestos en arco. Toca el que prefieras.
- **Color picker avanzado:** icono discreto en el abanico, para quien quiera hex exacto. No es el camino principal.
- **Botón "+" para añadir:**
  - "Sugerir más" → IA propone 3 colores que armonicen
  - Eyedropper (si el navegador lo soporta)
  - Picker manual
- **Eliminar:** arrastrar fuera de las zonas → desaparece con animación suave
- **Preview en vivo tipo post de red social:** logo real del usuario, nombre con color Texto, fondo con color Fondo, botón CTA con color Acento, engagement simulado (corazones, comentarios, compartir). Se actualiza instantáneamente con cada cambio.

**Técnicamente:**
- Drag & drop: `@dnd-kit/core`
- Variantes de color: `chroma-js` (escalas de luminosidad/saturación)
- Live preview: CSS custom properties (`--brand-bg`, `--brand-text`, `--brand-accent`)
- Animaciones: `framer-motion`
- Nombres evocadores de paletas: generados por IA en `generate-brand-proposals.ts`

### Pantalla 6: Tipografía

**Layout:** Preview real del nombre de la marca renderizado con cada combinación.

**Elementos:**
- IA propone 3-4 combinaciones heading+body como tarjetas visuales
- Cada combo muestra: el nombre de la marca en fuente heading + un texto de ejemplo en fuente body
- El usuario hace click en el combo que más le gusta
- Opción secundaria "Otra combinación" que abre búsqueda manual de Google Fonts (flujo secundario)
- Al elegir, el mini-preview se actualiza con las nuevas fonts

**Click para elegir. Cero escritura.**

### Pantalla 7: Personalidad

**Layout:** Grid de chips/tags grandes y coloridos a pantalla completa.

**La IA genera ~12-15 chips divididos en 3 categorías visuales:**

- 🎨 **Estilo visual:** "Minimalista", "Premium", "Orgánico", "Geométrico", "Editorial"...
- 💬 **Tono de voz:** "Cercano", "Profesional", "Directo", "Inspirador", "Divertido"...
- ⭐ **Valores:** "Innovación", "Confianza", "Sostenibilidad", "Creatividad", "Calidad"...

**Interacciones:**
- Cada chip es toggle: click para activar/desactivar
- Los que vienen del análisis web/IG ya vienen marcados como sugeridos (pre-activados)
- Chip "+" al final de cada categoría para añadir uno custom (opcional y secundario)
- Animación de toggle satisfactoria
- Al cambiar selección, el mini-preview refleja el cambio de personalidad

**Internamente:** los chips seleccionados se mapean a `brand_values`, `tone_of_voice` y `visual_aesthetic` del BrandDNA.

### Pantalla 8: Voz y eslogan

**Layout:** Dos secciones.

**Sección superior — Eslogan:**
- La IA genera 3 opciones contextuales como tarjetas grandes
- El usuario hace click en la que prefiere
- Puede editar ligeramente la elegida (inline, no modal)
- Botón "↻ Más opciones" para regenerar las 3

**Sección inferior — CTAs:**
- La IA genera 5-6 opciones ("Descubre más", "Reservar ahora", "Empieza gratis"...)
- Toggle on/off para cada una
- Al menos 1 debe estar activo

**Click para elegir + edición mínima opcional.**

### Pantalla 9: Brand Board (Review + Save)

**La culminación visual.** Todo junto, presentado como una página de brand guidelines real.

**Layout:** Brand card visual centrada que resume todo el kit:
- Logo + variaciones generadas
- Paleta de colores con roles
- Muestra tipográfica (heading + body)
- Chips de personalidad seleccionados
- Eslogan y CTAs

**Preview de post de red social:**
- Mock realista de un post de red social generado por PostLaboratory con este brand kit
- Logo real del usuario, colores aplicados, tipografía real, slogan integrado
- Engagement simulado (corazones, comentarios, compartir) para dar contexto visual
- Demuestra el valor del producto: "esto es lo que PostLaboratory hará con tu marca"

**Completitud:**
- Indicador visual de completitud (sin porcentaje numérico — más sutil)
- Si algo crítico falta, señalar suavemente qué y ofrecer volver al paso correspondiente

**Acciones:**
- "Guardar y empezar a crear" → guarda el kit y redirige al studio
- Cada sección del board tiene un botón sutil de "editar" que lleva al paso correspondiente

**Cero escritura. Solo confirmar.**

---

## Fuentes de datos: las 3 entradas

### 1. URL de web (lo que ya existe, mejorado)

Pipeline actual: Jina Reader + Microlink + Cheerio + Sharp + AI estructurada.

**Mejoras:**
- El resultado se presenta como "propuesta visual" editable en el flujo de pantallas, no como formulario
- Se rellenan todos los campos posibles: colores, fonts, logos, overview, tono, valores

### 2. Instagram vía Apify

**Actor:** `apify/instagram-profile-scraper`

**Datos que se extraen:**

| Dato Instagram | → Campo BrandDNA |
|---|---|
| `profilePicUrlHD` | `logo_url` candidato |
| `biography` | → IA extrae `tagline`, `business_overview` |
| `externalUrl` | → lanza scraping web en paralelo (si existe) |
| `businessCategoryName` | → enriquece `brand_context` |
| `latestPosts[].displayUrl` (9-12 imágenes) | → extracción de colores con node-vibrant + `images` |
| `latestPosts[].caption` + `hashtags` | → IA analiza tono, valores, keywords |
| Distribución image/video/carousel | → `visual_aesthetic` |

**Implementación:**

```
@handle introducido
    │
    ├─ Apify: profile + últimos 12 posts (15-30s)
    │   ├─ node-vibrant sobre las imágenes → paleta de colores
    │   ├─ AI vision sobre avatar → ¿es logo o foto personal?
    │   └─ AI texto sobre bio + captions → tono, valores, overview
    │
    └─ Si externalUrl existe → scraping web en paralelo
    │
    ▼
  Merge de ambas fuentes → BrandDNA propuesto
```

**Coste:** ~$2.70 por 1K resultados. Free tier de $5/mes ≈ ~1,800 perfiles/mes.

**Fallback:** Si Apify falla o se agotan créditos → screenshot del perfil público vía Microlink/ApiFlash + AI vision (la ruta pragmática sin dependencia externa).

**Server action nuevo:** `analyze-brand-instagram.ts`

### 3. "Empiezo de cero"

- Se toma el nombre de marca (pantalla 1)
- Se pide "¿A qué te dedicas?" — 1-2 frases (único texto que escribe)
- La IA genera una propuesta completa de BrandDNA basándose solo en eso:
  - Colores sugeridos por industria/tono
  - Fonts sugeridas
  - Valores y personalidad inferidos
  - Slogan, CTAs, hooks generados
- El usuario refina en las pantallas siguientes

---

## Logo Variations: detalle técnico

### Servicios para remove background

| Servicio | Coste | Calidad | Recomendación |
|----------|-------|---------|---------------|
| remove.bg API | 50 gratis/mes, luego $0.20/img | Excelente | V1 — usar esto |
| rembg (Python self-hosted) | Gratis | Muy buena | V2 si el volumen crece |
| Sharp threshold | Gratis | Solo fondos sólidos | Fallback |

### Pipeline de generación

```
Logo subido/detectado
    │
    ├─ remove.bg → versión transparente
    ├─ Sharp .grayscale() → versión greyscale
    ├─ Sharp .threshold(128) → versión mono
    ├─ Sharp .tint(primaryColor) → versión monocromática tintada al color primario
    ├─ Compositar sobre fondo oscuro → versión invertida
    ├─ Sharp .extend() con padding → versiones square
    ├─ Logo centrado + brand name → versión square para perfil de redes sociales
    ├─ Combinar: square × (main, mono, inverted)
    └─ AI vision → detectar símbolo solo (bounding box del icono)
    │
    ▼
  Grid de ~10-12 variantes
  Usuario marca ✓ las que quiere guardar
```

**Tiempo estimado:** 2-3 segundos para las transformaciones Sharp. ~3-5 segundos adicionales para remove.bg.

Todas las variantes se almacenan en Convex Storage como assets del brand kit.

---

## Preview en vivo (progresivo)

A partir de la pantalla 5 (paleta), aparece un **preview tipo post de red social** lateral (desktop) o colapsable (mobile) que muestra cómo las elecciones del usuario se traducen en un post real de PostLaboratory.

**El preview es un mock de post de red social** con: logo del usuario, nombre de marca, fondo con color de la paleta, botón CTA con color acento, engagement simulado (corazones, comentarios, compartir). Se va completando con cada paso.

**Evolución del preview:**

| Pantalla | Qué se añade al preview |
|----------|----------------------|
| 5. Palette | Colores aplicados al fondo, texto y acentos del post |
| 6. Typography | Nombre de marca + texto renderizado con fonts elegidas |
| 7. Personality | Estilo visual del post se ajusta sutilmente |
| 8. Voice | Slogan integrado como copy del post |
| 9. Brand Board | Preview completo y definitivo |

El preview usa CSS custom properties que se actualizan en tiempo real con cada cambio.

---

## Arquitectura técnica

### Estado del wizard

**`useReducer` local + sync a Convex como draft** en cada transición de pantalla.

- Estado local para interactividad instantánea (drag & drop, toggles, etc.)
- Sync a Convex en cada "Siguiente" → el brand kit se guarda como draft
- Si el usuario abandona y vuelve, retoma donde estaba
- Al completar (pantalla 8), el draft se marca como completo

### Estructura de componentes

```
src/app/brand-kit/new/
├── page.tsx                    — ruta principal, pantalla completa, sin header/sidebar
├── BrandStudio.tsx             — orquestador del flujo (steps, navegación, estado)
├── steps/
│   ├── SourceStep.tsx          — "¿de dónde partimos?" (web/ig/de cero)
│   ├── NameStep.tsx            — nombre + descripción (solo si "de cero")
│   ├── LoadingStep.tsx         — análisis animado
│   ├── LogoStep.tsx            — logos + variaciones automáticas
│   ├── PaletteStep.tsx         — elegir paleta base + playground de colores
│   ├── TypographyStep.tsx      — combos de fonts
│   ├── PersonalityStep.tsx     — chips de estilo/tono/valores
│   ├── VoiceStep.tsx           — slogan + CTAs
│   └── BrandBoardStep.tsx      — review final + preview post social
├── components/
│   ├── StudioProgress.tsx      — barra de progreso mínima
│   ├── StudioNav.tsx           — botones atrás/siguiente
│   ├── PaletteCard.tsx         — banda de colores + nombre evocador
│   ├── ColorCircle.tsx         — círculo draggable de color
│   ├── ColorFan.tsx            — abanico de variantes al tocar
│   ├── ColorPlayground.tsx     — playground drag & drop con roles
│   ├── FontComboCard.tsx       — preview de combinación tipográfica
│   ├── PersonalityChip.tsx     — chip toggle
│   ├── SloganCard.tsx          — tarjeta de opción de slogan
│   ├── LogoVariantCard.tsx     — tarjeta de variante de logo
│   ├── LogoVariationGrid.tsx   — grid de variaciones de logo
│   └── SocialPostPreview.tsx   — preview en vivo tipo post de red social
├── hooks/
│   ├── useWizardState.ts       — reducer + sync Convex draft
│   ├── useColorDrag.ts         — lógica de drag & drop de colores
│   └── useLogoVariations.ts    — generación de variantes
└── actions/
    ├── analyze-brand-instagram.ts  — pipeline Apify
    ├── generate-brand-proposals.ts — paletas con nombres evocadores, combos de fonts
    ├── generate-logo-variations.ts — Sharp + remove.bg
    └── generate-silent-fields.ts   — brand_context, hooks, keywords, audience
```

### Dependencias nuevas

| Paquete | Uso | Tamaño |
|---------|-----|--------|
| `@dnd-kit/core` | Drag & drop de colores | ~15KB |
| `chroma-js` | Generación de variantes de color | ~14KB |
| `framer-motion` | Animaciones y transiciones | Ya en el proyecto (verificar) |
| `apify-client` | API de Apify para Instagram | ~20KB |
| `node-vibrant` | Extracción de colores de imágenes de Instagram | ~25KB |

### Restricciones Vercel

- Serverless timeout: 60s (Pro plan) — suficiente para Apify (15-30s) y scraping web
- Si Instagram + web en paralelo se acerca al límite: hacer el merge client-side en dos pasos (primero Instagram, luego web en background)
- Logo variations con Sharp: se ejecutan en server action, ~2-3s

---

## Estética y layout

### Principios visuales

- **Background:** Fondo limpio, gradiente sutil (no blanco plano)
- **Tarjetas:** Esquinas redondeadas grandes (radius 16-24px), sombra suave, hover sutil
- **Chips/tags:** Coloridos, bordes redondeados, animación de toggle satisfactoria
- **Transiciones:** Slide horizontal entre pantallas (`framer-motion`)
- **Tipografía:** Grande, clara, pocos niveles de jerarquía por pantalla
- **Espaciado:** Generoso. Más aire = menos estrés visual
- **Progreso:** Barra fina en top, con dots o segmentos mínimos

### Mobile-first (obligatorio)

Cada pantalla se construye primero para viewport móvil (375px) y se escala hacia arriba.

- **Mobile (< 768px):**
  - Layout single-column, full-width
  - Preview de post social como sección colapsable debajo del contenido principal (no lateral)
  - Tarjetas de selección apiladas verticalmente
  - Chips en wrap natural con scroll si necesario
  - Touch targets mínimo 44×44px en todos los elementos interactivos
  - Drag & drop con `@dnd-kit` touchAction support nativo
  - Color playground: círculos más grandes (80px+), zonas de drop amplias
  - Barra de progreso simplificada (dots en vez de segmentos)
- **Desktop (≥ 768px):**
  - Layout centrado con `max-width ~900px`
  - Preview de post social fijo en lateral derecho
  - Tarjetas en grid horizontal (2-3 columnas)
  - Más espacio para color playground y font previews

### Internacionalización (obligatorio)

- **Cero strings hardcodeadas** en componentes. Todo vía el sistema i18n existente del proyecto.
- Nuevo fichero de traducciones: `src/locales/{lang}/brand-studio.json` (es-ES, en-US como mínimo)
- Incluye: títulos de pantallas, labels, placeholders, botones, mensajes de loading, nombres de roles de color, categorías de personalidad, tooltips
- **Contenido generado por IA** (slogans, CTAs, chips de personalidad, nombres de paletas): se genera en el `preferred_language` del usuario. El prompt de generación recibe el idioma como parámetro.
- **Nombres evocadores de paletas**: se generan en el idioma del usuario ("Atardecer urbano" en ES, "Urban Sunset" en EN)
- **Chips de personalidad**: la IA genera los chips en el idioma del usuario, no se traducen desde un set fijo en inglés
- Dirección del texto: LTR por defecto (sin necesidad de RTL por ahora)

### Coherencia con design system existente

- Usar variantes de shadcn/ui donde aplique (botones, inputs)
- Colores del wizard via CSS custom properties, no hardcodeados
- Iconos: `lucide-react` exclusivamente
- Seguir `docs/UI_SYSTEM_RULES.md` para jerarquía visual

---

## Fases de implementación

### Fase 1: Infraestructura y flujo base
- Ruta `/brand-kit/new` a pantalla completa (sin header/sidebar)
- Componente orquestador `BrandStudio` con navegación entre steps
- `useWizardState` con reducer + sync a Convex draft
- Barra de progreso + navegación atrás/siguiente
- Pantallas 1 (Source), 2 (Name) y 9 (Brand Board) como esqueletos funcionales

### Fase 2: Fuentes de datos
- Integrar pipeline web existente en el nuevo flujo
- `analyze-brand-instagram.ts` con Apify
- Ruta "de cero" con generación AI completa
- Pantalla 3 (Loading) con animaciones
- `generate-brand-proposals.ts` para paletas con nombres evocadores y combos de fonts

### Fase 3: Pantallas de refinamiento visual
- Pantalla 5 (Palette) con dos momentos: elegir base + playground
- Pantalla 6 (Typography) con combos de fonts
- Pantalla 7 (Personality) con chips
- Pantalla 8 (Voice) con slogans y CTAs

### Fase 4: Logo variations
- `generate-logo-variations.ts` con Sharp
- Integración remove.bg API
- Pantalla 4 (Logo) con grid de variantes (incluyendo monocromático tintado y square+nombre)
- AI vision para extracción de símbolo

### Fase 5: Preview en vivo y pulido
- `SocialPostPreview` — preview tipo post de red social con engagement simulado
- Preview progresivo que se construye paso a paso
- Generación silenciosa de campos (brand_context, hooks, keywords, audience)
- Animaciones, transiciones, micro-interacciones
- Testing responsive

### Fase 6 (futura): Moodboards IA
- Pantalla adicional entre Personality y Voice
- 6 moodboards generados por IA en grid 2x3 basándose en colores + personalidad elegidos
- Click para elegir → define `visual_aesthetic`
- No bloquea el MVP, añade valor como mejora posterior
