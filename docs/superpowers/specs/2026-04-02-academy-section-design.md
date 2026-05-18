# Especificacion de seccion Academy publica e integrada

## Contexto
Juanfran quiere una seccion de contenido dentro de la plataforma para que los usuarios puedan aprender a usarla sin salir de ella, pero que al mismo tiempo sea de libre acceso para captar interes desde fuera.

La seccion debe:
- enlazarse desde la landing publica
- aparecer tambien en la barra vertical interna
- organizarse como un conjunto de publicaciones tipo blog
- mostrar cards con imagen, titulo y subtexto
- abrir articulos con formato editorial clasico de texto e imagenes
- heredar la misma familia estructural que `brand-kit`, `image` o `carousel`, pero sin panel derecho

## Objetivos
1. Crear una nueva superficie publica llamada `Academy` dentro del ecosistema del producto.
2. Hacer que sirva tanto como centro de ayuda como canal de captacion y descubrimiento.
3. Mantener coherencia visual y estructural con los modulos existentes del estudio.
4. Evitar en la V1 dependencias innecesarias como un CMS externo o una arquitectura editorial compleja.

## Decisiones validadas
- El nombre visible de la seccion sera `Academy`.
- La V1 incluira contenido mixto:
  - guias
  - tutoriales
  - novedades
  - inspiracion
- La portada mostrara categorias visibles desde el inicio.
- Los articulos mostraran fecha, pero no autor visible en la V1.
- La arquitectura recomendada es un modulo nativo del producto con una portada editorial, no un blog desacoplado.

## Enfoque recomendado
Construir `Academy` como un modulo publico nativo del producto:

- ruta indice publica en `/academy`
- ruta de detalle publica en `/academy/[slug]`
- integracion en la landing como destino editorial
- integracion en sidebar interna como destino de navegacion estable
- layout editorial sin panel derecho
- cards y articulos con lenguaje visual alineado con el resto de la app

Este enfoque combina:
- la coherencia estructural de los modulos existentes
- la claridad de un blog editorial
- la flexibilidad de una seccion publica util para SEO, onboarding y conversion

## Arquitectura de informacion

### Portada `/academy`
La portada debe tener estas capas:

1. Hero editorial breve:
   - titulo de seccion
   - texto corto de orientacion
   - una categoria o articulo destacado
2. Filtros o tabs de categoria visibles:
   - `Guias`
   - `Tutoriales`
   - `Novedades`
   - `Inspiracion`
3. Rejilla de publicaciones:
   - imagen de portada
   - categoria
   - fecha
   - titulo
   - extracto corto
4. Bloque opcional de destacados o recomendados si hay contenido suficiente

### Articulo `/academy/[slug]`
Cada articulo debe usar un layout editorial limpio:
- imagen principal
- titulo
- entradilla opcional
- cuerpo de contenido por bloques
- imagenes intercaladas cuando proceda
- navegacion de retorno al indice
- opcion de enlazar contenidos relacionados
- CTA suave hacia `image`, `carousel` o `brand-kit` cuando el contenido lo justifique

## Modelo de contenido para V1
La V1 no necesita CMS. Se recomienda una fuente de contenido local tipada.

Cada publicacion debe incluir como minimo:
- `slug`
- `title`
- `excerpt`
- `category`
- `publishedAt`
- `coverImage`
- `featured`
- `content`

Categorias iniciales:
- `guides`
- `tutorials`
- `news`
- `inspiration`

Esto permite:
- publicar rapido
- controlar estructura y orden
- renderizar indice y detalle sin dependencia externa
- migrar mas adelante a CMS si el volumen editorial crece

## Integracion de navegacion

### Landing
- añadir enlace visible a `Academy`
- dar a la seccion suficiente presencia para que no parezca un footer link secundario
- mantenerla como una puerta de entrada publica al producto

### Sidebar interna
- añadir entrada `Academy` como destino estable del ecosistema
- debe convivir con `image`, `carousel`, `brand-kit` y resto de destinos sin romper la jerarquia principal
- el acceso debe funcionar tanto con sesion como sin ella si la navegacion publica lo permite

## Integracion visual
- `Academy` no debe parecer un sitio separado ni una plantilla de blog generica
- debe heredar el sistema de espaciado, tipografia, botones y superficies del producto
- no debe incluir panel derecho
- el ancho de lectura del articulo debe priorizar legibilidad y ritmo editorial
- las cards deben sentirse parte del mismo sistema visual que la app, aunque con un tono mas editorial

## Alcance V1
- rutas publicas de indice y detalle
- contenido local tipado
- categorias visibles
- cards editoriales con imagen, titulo y extracto
- articulos con texto e imagenes
- enlace desde landing
- enlace desde sidebar interna
- namespace i18n propio de `academy`

## No alcance V1
- CMS externo
- buscador avanzado
- comentarios
- perfiles de autor
- sistema de series, tags complejos o relacion automatica entre posts
- analytics editorial avanzada

## Riesgos
- que la seccion parezca demasiado externa al producto si se separa demasiado de la shell actual
- que parezca demasiado interna y pierda valor como superficie publica
- sobrecargar la V1 con necesidades editoriales que todavia no son necesarias
- introducir patrones visuales nuevos que rompan el sistema compartido

## Validacion
Antes de dar la implementacion por cerrada, validar:

1. Navegacion:
   - acceso a `Academy` desde landing
   - acceso a `Academy` desde sidebar interna
   - acceso publico correcto a indice y detalle
2. Visual:
   - cards coherentes con el sistema de UI del producto
   - articulo legible y sin panel derecho
   - buen comportamiento responsive
3. Contenido:
   - categorias visibles y comprensibles
   - fecha visible en cards y detalle
   - extractos y portadas funcionando como patron general, no como parche puntual
4. Arquitectura:
   - fuente de contenido tipada y escalable
   - sin dependencias de CMS en V1
   - estructura preparada para crecer sin rehacer rutas

## Siguiente paso
Tras aprobar este spec, crear un plan de implementacion que cubra:
- fuente de contenido y tipado
- rutas y layouts
- integracion en landing y sidebar
- componentes de card y articulo
- i18n y validacion visual final
