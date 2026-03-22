# Reglas de sistema UI

Documento vivo de reglas visuales y de coherencia para nuevas iteraciones de UI en `x-studio`.

Objetivo:

- evitar decisiones aisladas por tarjeta o pantalla
- mantener una jerarquia visual consistente entre paneles
- fijar minimos legibles para desktop
- preservar una familia comun de botones, selects y cabeceras

## Ambito actual

Estas reglas nacen del restyle de:

- cabecera principal de la app
- panel derecho del modulo `image`
- controles secundarios asociados a prompts, historial, diseno y formato

Se deben reutilizar como punto de partida en nuevas tarjetas y modulos equivalentes.

## Principios base

1. Resolver como sistema, no como parche local.
2. Si dos controles cumplen la misma funcion, deben compartir escala visual.
3. La densidad no se consigue bajando la tipografia por debajo de lo legible.
4. El espacio vertical se optimiza quitando ineficiencias, no encogiendo texto.
5. La jerarquia debe distinguir entre accion principal, accion secundaria fuerte y accion ligera.

## Tipografia

### Minimos legibles en desktop

- Ningun texto principal de control o formulario debe caer por debajo de `14px` reales en desktop.
- Labels, helpers y metadatos pueden ser mas discretos, pero no deben sentirse micro.
- Si se usa tipografia fluida con `clamp()`, el minimo real debe seguir respetando el suelo anterior.

### Textareas de entrada principal

Las areas de texto que cumplen una funcion equivalente deben compartir tamano base.

Regla actual:

- prompt principal del panel derecho: `14px`
- prompt principal del area central inferior: `14px`

No deben divergir sin una razon funcional clara.

## Cabeceras de tarjeta

### Estructura

Cada tarjeta principal del panel creativo debe usar:

- icono alineado con el titulo
- titulo como ancla principal de lectura
- sin adornos innecesarios alrededor del icono

### Regla visual

- evitar capsulas o fondos decorativos alrededor del icono si no aportan significado
- evitar duplicar el estado de la tarjeta en dos lugares distintos
- el titulo real debe pesar mas que cualquier eyebrow o metadato

Ejemplo correcto:

- `Historial` como titulo unico de cabecera
- estado `Activa` dentro del item seleccionado, no repetido arriba

## Dropdowns y selects

### Coherencia entre trigger y menu

El texto del item seleccionado en el trigger y el texto de las opciones abiertas deben compartir escala visual.

Regla:

- no reducir el menu respecto a la caja cerrada
- el menu desplegado debe sentirse del mismo sistema que el trigger

### Prioridad de legibilidad

- el trigger no debe parecer mas importante que sus opciones
- las opciones no deben verse como texto tecnico diminuto

## Iconografia

### Libreria obligatoria

- siempre que se introduzcan iconos nuevos en UI de producto, se debe usar `hugeicons`
- no mezclar librerias de iconos dentro del mismo patron visual salvo dependencia heredada dificil de retirar

### Tamano de referencia

- los iconos interactivos de controles, dropdowns y acciones deben tomar como referencia el tamano visual ya establecido en el panel derecho del estudio creativo
- si un icono nuevo duda entre varios tamanos, se prioriza igualar la presencia visual de ese panel antes que inventar una escala local
- no reducir ni inflar iconos de forma aislada para "hacer que quepan"; si no encajan, se revisa el layout o el componente

## Botones

### Familias de accion

#### 1. CTA principal

Reservado para la accion final o mas importante del panel.

Regla actual:

- altura `L = 46px`
- ejemplo: `Generar imagen`

#### 2. Secundaria fuerte

Para acciones relevantes pero no finales.

Regla actual:

- altura `M = 42px`
- ejemplos: `Nueva sesion`, `Renombrar sesion`, `Borrar sesion`, `Analizar`

Estas acciones deben compartir:

- misma familia visual
- mismo radio base
- mismo tono tipografico

#### 3. Accion ligera con revelado

Para controles discretos que en reposo pueden verse casi como texto, pero que al hover deben revelarse como boton.

Regla:

- base ligera
- hover con capsula suave
- transicion corta y limpia

Ejemplo:

- `Generar idea para mi`

## Consistencia tipografica en botones

Dentro de una misma familia de acciones:

- no mezclar mayusculas con sentence case sin razon funcional
- no mezclar tracking forzado en unos botones y en otros no
- la jerarquia debe venir del peso visual y del color, no de hablar en alfabetos distintos

Aplicacion practica:

- `Analizar` y `Generar imagen` deben parecer familia
- `Generar imagen` conserva mas peso por jerarquia, no por reglas tipograficas incompatibles

## Copys de botones

- priorizar claridad antes que minimalismo extremo
- no sustituir texto claro por iconos solos si se pierde comprension
- si un idioma largo rompe una fila, resolver con layout o copy mas claro, no haciendo el boton ilegible

Aplicacion actual:

- en historial se prefiere `Nueva sesion`
- se prefiere `Borrar todas las sesiones` frente a `Borrar historial` por ser mas explicito
- queda prohibido usar el icono de `sparkles` o estrellitas en botones, CTAs y acciones nuevas del sistema
- si hace falta un apoyo visual para IA o inspiracion, usar iconos mas sobrios como `Idea`, `Wand` o directamente ningun icono si el copy ya es claro

## Layout de acciones

- si varias acciones largas no caben bien en una sola fila, usar una rejilla compacta antes que wraps torpes
- centrar el texto del boton cuando la composicion lo pida y la familia de botones lo soporte
- mantener dos alturas de referencia visibles como maximo dentro del mismo panel: `M` y `L`

## Estados y badges

- no encapsular informacion de estado por defecto si puede leerse mejor como texto limpio
- reservar fondos, capsulas o alertas para momentos de verdadera prioridad o criticidad
- si un estado se puede expresar con tono, color y posicion, no hace falta otra burbuja

Aplicacion actual:

- `Sin cambios` o `Hay cambios por guardar` se presentan mejor como texto de estado que como capsula decorativa

## Agrupacion de secciones dentro de una tarjeta

- evitar lineas horizontales como solucion por defecto para separar bloques funcionales dentro del panel creativo
- evitar tambien el patron de `tarjeta dentro de tarjeta` como respuesta rapida a la jerarquia
- dentro de una tarjeta principal, priorizar espacio, tipografia y ritmo vertical antes que crear sub-superficies con borde y fondo
- usar sub-superficies solo cuando exista una interaccion realmente distinta o un bloque que deba sentirse aislado de forma semantica

Aplicacion actual:

- `Kit de marca` debe mantenerse como una sola superficie con secciones limpias, no como una pila de subcards

## Botones de cierre y borrado con `x`

- las `x` de cerrar, quitar o borrar elementos pequenos deben pertenecer a una sola familia visual en toda la app
- no mezclar tamanos, opacidades, radios y fondos distintos para la misma accion
- por defecto deben resolverse como icon button circular pequeno, superpuesto cuando corresponda, con transicion corta y contraste suficiente sobre imagen o superficie
- si la accion ya existe por item con `x`, evitar duplicarla con un `Limpiar` o `Borrar todo` ocupando layout extra salvo que haya una necesidad real de accion masiva frecuente

## Regla de revision antes de tocar UI nueva

Antes de introducir una nueva tarjeta, toolbar o grupo de controles en zonas creativas:

1. comprobar si ya existe un patron equivalente en este documento
2. reutilizar la jerarquia de tipografia, botones y dropdowns
3. evitar introducir una tercera familia de control si ya existen dos suficientes
4. medir en navegador si hay dudas reales de tamano computado

## Regla de extensibilidad

Si una nueva necesidad obliga a romper alguna de estas reglas:

- documentar la excepcion
- explicar por que la excepcion mejora el sistema
- evitar decisiones implicitas enterradas en clases locales

## Paridad entre modulos creativos

- `image` y `carousel` deben sentirse como el mismo producto con distinto objetivo, no como dos consolas distintas.
- Si existe un patron ya resuelto en `image` para panel derecho, dropdown, toolbar flotante, dialogo de decision o barra de accion inferior, `carousel` debe reutilizarlo o colgar de la misma constante compartida.
- Antes de crear una variante local para `carousel`, comprobar si la necesidad real es distinta o si solo falta adaptar copy y comportamiento.
- La regla operativa es:
  - mismos `select` de primer nivel
  - mismos dialogos de decision
  - misma familia de CTA y barra inferior
  - mismo lenguaje para estados activos e inactivos
  - mismo tono visual en overlays y toolbar del canvas

## Cabeceras de tarjeta en Brand Kit

Las tarjetas del Brand Kit deben usar **exactamente** el mismo lenguaje visual que las secciones del panel derecho del módulo imagen (`ControlsPanel`). La fuente de verdad es `SectionHeader.tsx` + `PANEL_SECTION_HEADER_ICON_CLASS` / `PANEL_SECTION_HEADER_TITLE_CLASS`.

### Icono de sección

- **Tamaño del SVG**: `h-[18px] w-[18px]` — ni más ni menos
- **Color**: `text-foreground/72` — nunca `text-primary` en iconos de cabecera
- **Fondo/borde**: ninguno — icono limpio sin cápsula, sin `bg-primary/10`, sin `border`
- **Librería**: `hugeicons` siempre

Regla operativa: el selector `[&_svg]` de `BRAND_KIT_PANEL_TITLE_CLASS` en `brandKitStyles.ts` impone estos valores sobre todos los SVG descendientes del título. **No añadir clases de tamaño ni color explícitas al icono** — se heredan del padre. Excepción única: si el icono tiene significado semántico de estado (ej. check de completitud verde), usar `!text-emerald-500` con `!important` para sobreescribir.

### Título de sección

- **Tamaño**: `text-[0.94rem]` (≈ 15px)
- **Peso**: `font-bold`
- **Caja**: `uppercase`
- **Tracking**: `tracking-[0.14em]`
- **Color**: `text-foreground/92`
- **Constante**: `BRAND_KIT_PANEL_TITLE_CLASS` en `brandKitStyles.ts`

### Prohibido en cabeceras de tarjeta

- Iconos con `h-9 w-9` (36px) — ese era el tamaño antiguo, ya no se usa
- Iconos con `text-primary` en cabecera — reservado para CTAs y acciones, no para iconos de sección
- Mezclar `text-[11px]` o `tracking-[0.16em]` — son los valores por defecto del `SectionHeader` sin customizar, no del estudio

### Paleta flotante de herramientas (Brand Kit, Imagen, Carrusel)

Las tres vistas comparten **la misma clase base**:

- **Contenedor**: `STUDIO_CANVAS_FLOATING_TOOLBAR_CLASS` de `canvasStyles.ts`
  - `rounded-[1.65rem]`, `border border-border/60`, fondo blanco translúcido, `backdrop-blur-xl`, `shadow-[0_24px_54px_-34px_...]`, `p-2`, `grid-cols-3 gap-1.5`
- **Botones**: `STUDIO_CANVAS_TOOL_BUTTON_CLASS` — `h-[3.2rem] w-[3.2rem]`, sin fondo, hover con borde y sombra suave
- **Iconos dentro de botones de paleta**: `!h-8 !w-8` (32px) — constante local `TOOL_ICON_CLASS`
- **Brand Kit añade**: `!fixed right-6 top-24 z-[60] !hidden md:!grid` — se usa `!fixed` con `!important` porque `STUDIO_CANVAS_FLOATING_TOOLBAR_CLASS` contiene `absolute` baked-in, y en el CSS generado por Tailwind `.absolute` aparece después de `.fixed`, sobreescribiéndolo sin el modificador `!`

Cualquier nueva paleta flotante en cualquier módulo debe reutilizar estas constantes. No crear variantes locales.

### Logo en la tarjeta de cabecera del Brand Kit

El logo de marca que aparece en la primera tarjeta (junto al nombre del kit) usa:

- **Contenedor**: `h-[12.5rem] w-[12.5rem]` (200px) con `BRAND_KIT_CALLOUT_CLASS`
- **Imagen del logo**: `w-[8.75rem] h-[8.75rem]` (140px), `object-contain`
- **Fallback de letra**: `text-6xl font-bold text-foreground/40`

## Brand Kit

- `brand-kit` debe alinearse con el lenguaje premium de `image` y `carousel`, no con el lenguaje historico de dashboard o backoffice.
- Evitar `glass-panel` y las tarjetas dentro de tarjetas como solucion por defecto.
- En `brand-kit` la jerarquia debe resolverse con:
  - una superficie principal clara
  - subbloques por ritmo vertical
  - cabeceras con descripcion corta
  - campos y listas con la misma familia de radios y alturas que el resto del estudio
- Logos, colores y activos visuales deben seguir la misma regla de seleccion que el panel creativo:
  - en paneles, activo por color/fondo/borde
  - los checks se reservan para modales de seleccion de imagen cuando hagan falta
- Los dialogos de `brand-kit` deben compartir radio, escala tipografica y CTA con los dialogos premium de `image` y `carousel`.
