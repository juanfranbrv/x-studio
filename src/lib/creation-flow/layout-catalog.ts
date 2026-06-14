// Catalogo de layouts de imagen (datos estaticos).
// Extraido de creation-flow-types.ts (troceo Fase 2). Re-exportado desde alli.
import type { LayoutOption } from '../creation-flow-types'

// Default layouts for intents not in the map
export const DEFAULT_LAYOUTS: LayoutOption[] = [
    { id: 'clean', name: 'Limpio', description: 'Espacio para texto', svgIcon: 'Layout', textZone: 'bottom', promptInstruction: 'Clean composition with ample negative space at bottom 25% for text overlay.' },
    { id: 'full-bleed', name: 'Full Bleed', description: 'Imagen completa', svgIcon: 'Maximize', textZone: 'overlay', promptInstruction: 'Full bleed image with semi-transparent text overlay capability.' },
    { id: 'frame', name: 'Con Marco', description: 'Borde visual', svgIcon: 'Frame', textZone: 'overlay', promptInstruction: 'Image with decorative frame or border.' },
    {
        id: 'default-free',
        name: 'Libre',
        description: 'Sin indicación',
        svgIcon: 'Sparkles',
        textZone: 'center',
        promptInstruction: 'Natural composition without structural constraints.',
        structuralPrompt: '',
    },
    {
        id: 'basic-editorial-columns',
        name: 'Editorial',
        description: 'Columnas limpias',
        svgIcon: 'Columns2',
        textZone: 'left',
        promptInstruction: 'Editorial split layout with clear dual-column hierarchy.',
        structuralPrompt: `
## Composición: Editorial por Columnas

**Estructura:** Dos columnas principales con jerarquía clara y respiración visual.

### Jerarquía visual:
1. **Protagonista:** Zona principal en columna dominante.
2. **Secundario:** Columna de apoyo para bloques de lectura breve.
3. **Detalle:** Separadores suaves y ritmo vertical consistente.

### Distribución:
- Columna dominante + columna secundaria equilibrada.
- Márgenes internos uniformes.
- Lectura en flujo descendente natural.

### Evitar:
Superposición de bloques, simetría rígida sin jerarquía, densidad excesiva.
`,
    },
    {
        id: 'basic-mosaic-flow',
        name: 'Mosaico',
        description: 'Bloques dinámicos',
        svgIcon: 'Grid2X2',
        textZone: 'center',
        promptInstruction: 'Asymmetric mosaic with modular blocks and readable hierarchy.',
        structuralPrompt: `
## Composición: Mosaico Fluido

**Estructura:** Retícula modular asimétrica con bloques de distinto peso visual.

### Jerarquía visual:
1. **Protagonista:** Módulo dominante para el mensaje clave.
2. **Secundario:** Módulos medianos para apoyo.
3. **Detalle:** Micro-bloques como acentos estructurales.

### Distribución:
- Patrón modular con variación controlada de tamaños.
- Espacios de respiro entre módulos.
- Flujo visual en Z suave.

### Evitar:
Retícula uniforme de catálogo, fragmentación caótica, choques de escala.
`,
    },
    {
        id: 'basic-spotlight-radial',
        name: 'Radial',
        description: 'Foco central',
        svgIcon: 'CircleDot',
        textZone: 'center',
        promptInstruction: 'Centered radial focus with peripheral support zones.',
        structuralPrompt: `
## Composición: Spotlight Radial

**Estructura:** Núcleo central dominante con periferia limpia de soporte.

### Jerarquía visual:
1. **Protagonista:** Centro de atención en el eje del canvas.
2. **Secundario:** Información alrededor en anillos de prioridad.
3. **Detalle:** Conectores sutiles hacia el núcleo.

### Distribución:
- Centro fuerte con periferia equilibrada.
- Uso amplio de espacio negativo.
- Lectura centrípeta (borde -> centro) y centrífuga (centro -> apoyo).

### Evitar:
Centro débil, periferia saturada, elementos flotantes sin anclaje.
`,
    },
    {
        id: 'basic-stacked-cards',
        name: 'Tarjetas',
        description: 'Capas suaves',
        svgIcon: 'PanelsTopLeft',
        textZone: 'center',
        promptInstruction: 'Layered card composition with depth and clear reading order.',
        structuralPrompt: `
## Composición: Tarjetas Apiladas

**Estructura:** Capas superpuestas con profundidad suave y jerarquía por planos.

### Jerarquía visual:
1. **Protagonista:** Tarjeta frontal con el mensaje principal.
2. **Secundario:** Tarjetas traseras como contexto visual.
3. **Detalle:** Alineaciones y offsets mínimos para ritmo.

### Distribución:
- Plano frontal dominante.
- Planos de apoyo desplazados con coherencia.
- Orden de lectura de adelante hacia atrás.

### Evitar:
Exceso de capas, perspectiva agresiva, desalineación arbitraria.
`,
    },
    {
        id: 'basic-diagonal-energy',
        name: 'Diagonal',
        description: 'Impulso visual',
        svgIcon: 'MoveDiagonal',
        textZone: 'top-left',
        promptInstruction: 'Diagonal compositional axis with clear directional momentum.',
        structuralPrompt: `
## Composición: Eje Diagonal

**Estructura:** Diagonal principal como columna vertebral del diseño.

### Jerarquía visual:
1. **Protagonista:** Punto de mayor peso en uno de los extremos de la diagonal.
2. **Secundario:** Bloques de apoyo distribuidos sobre el recorrido.
3. **Detalle:** Elementos de transición que refuerzan dirección.

### Distribución:
- Flujo diagonal dominante (arriba-izquierda -> abajo-derecha o inverso).
- Contrapeso en esquina opuesta para estabilidad.
- Espacios limpios fuera del eje principal.

### Evitar:
Ejes cruzados, dirección ambigua, acumulación central plana.
`,
    },
]

// 30 composiciones de laboratorio para modo avanzado (agnosticas de intent)
export const LAB_ADVANCED_LAYOUTS: LayoutOption[] = [
    {
        id: 'lab-v6-carril-escenario',
        name: 'Carril Escenario Vivo',
        description: 'Carril limpio y escenario lateral con marco activo',
        skillVersion: '6',
        svgIcon: 'PanelsTopLeft',
        textZone: 'left',
        promptInstruction: 'Editorial rail with framed stage and one visible signature move.',
        structuralPrompt: `
Divide el lienzo con un carril lateral limpio y reserva ese carril como zona continua para título y texto de apoyo sin cruces. Enmarca el escenario principal con un marco abierto y coloca un marco secundario discreto como eco para sostener la jerarquía sin cerrar el centro. Encadena la lectura desde la cabecera del carril hacia el marco frontal y devuelve el recorrido al bloque de apoyo con continuidad clara. Ancla el logo principal en el pie del escenario y, si existe logo auxiliar, colócalo en un borde opuesto con presencia reducida; si no existe, deja ese borde respirable. Introduce solo una familia de marcos o ventanas y separa esos contenedores para proteger el aire alrededor del texto. Varía la composición desplazando los marcos, abriendo o cerrando su apertura y reflejando lateralmente la estructura sin romper el carril limpio.
`,
    },
    {
        id: 'lab-v6-escalera-bisagra',
        name: 'Escalera Bisagra',
        description: 'Peldaños de placas con pliegue como firma',
        skillVersion: '6',
        svgIcon: 'SquareStack',
        textZone: 'top-right',
        promptInstruction: 'Stepped modular rise with hinge-style fold as signature move.',
        structuralPrompt: `
Escalona una serie de placas para construir una subida visual progresiva y alinea ese rail para que la lectura suba con claridad. Reserva una cabecera limpia como no-go zone de texto y protege ese bloque tipográfico con perímetro despejado. Coloca una placa dominante en la escalera y distribuye placas de apoyo para mantener contraste de peso visual sin saturar el lado limpio. Recorta un peldaño con un pliegue tipo bisagra como firma estructural y evita añadir otra ruptura grande en el mismo sistema. Ancla el logo principal en la base del rail y, si existe logo auxiliar, ubícalo en un borde alto opuesto con escala discreta; si no existe, conserva ese borde como silencio funcional. Varía el resultado invirtiendo la dirección de la escalera, separando o acercando peldaños y alternando ruta en Z por niveles o diagonal suave.
`,
    },
    {
        id: 'lab-v6-cuadrantes-vacio',
        name: 'Cuadrantes con Ancla Vacía',
        description: 'Grid en cuadrantes con vacío protagonista',
        skillVersion: '6',
        svgIcon: 'Columns2',
        textZone: 'bottom-left',
        promptInstruction: 'Quadrant composition with protected void as dominant anchor.',
        structuralPrompt: `
Divide el lienzo en cuadrantes y reserva un cuadrante completo como vacío protagonista sin colocar props en ese hueco. Coloca el foco en un cuadrante activo y enmarca ese contenedor con placa o marco para fijar la jerarquía de lectura. Reserva un cuadrante continuo para texto y deja ese bloque como no-go zone con aire claro en todo su perímetro. Ancla el logo principal en un borde de base y, si existe logo auxiliar, colócalo en un borde opuesto con presencia baja; si no existe, protege ese borde como espacio limpio. Introduce una sola familia de placas o marcos y separa esos elementos para evitar ruido en el cuadrante tipográfico. Varía la composición rotando el rol de cuadrantes, intercambiando contenedor entre placa y marco y reflejando lateralmente sin mover el vacío protagonista.
`,
    },
    {
        id: 'lab-v6-diagonal-plegada',
        name: 'Diagonal Plegada',
        description: 'Dos campos en pliegue con tensión de borde',
        skillVersion: '6',
        svgIcon: 'Grid2X2',
        textZone: 'top-left',
        promptInstruction: 'Soft diagonal fold with edge tension and clear text protection.',
        structuralPrompt: `
Pliega el lienzo en dos campos diagonales y reserva la cabecera del campo alto como zona continua de texto sin invasiones. Enmarca el campo principal con una banda o placa inclinada y alinea los apoyos sobre la diagonal para reforzar continuidad. Acerca un contenedor al borde para crear tensión visible y deja un margen respirable que evite tocar la no-go zone tipográfica. Ancla el logo principal en el pie del campo opuesto y, si existe logo auxiliar, ubícalo en un borde lateral distante con presencia discreta; si no existe, mantiene ese borde libre. Usa una sola familia de bandas o placas y separa sus solapes para conservar lectura limpia en el título. Varía la estructura abriendo o cerrando la diagonal, adelantando o atrasando el pliegue y alternando ruta en diagonal suave o Z corta.
`,
    },
    {
        id: 'lab-v6-orbita-lateral',
        name: 'Órbita Lateral Silente',
        description: 'Periferia activa y vacío central protegido',
        skillVersion: '6',
        svgIcon: 'Route',
        textZone: 'top',
        promptInstruction: 'Lateral orbit with central breathing void and connector continuity.',
        structuralPrompt: `
Rodea el área central con una órbita lateral de contenedores y deja el centro como vacío funcional para que respire la composición. Reserva una cabecera limpia como carril de texto y protege ese carril con un perímetro despejado que no reciba conectores. Coloca un contenedor dominante en el arco lateral y conecta apoyos con líneas mínimas para sostener continuidad sin ruido. Ancla el logo principal en el pie opuesto al foco y, si existe logo auxiliar, alinéalo en un borde alto distante con jerarquía menor; si no existe, conserva ese borde como silencio. Introduce una sola familia de arcos o conectores y separa esos props del bloque tipográfico para mantener legibilidad firme. Varía el resultado ensanchando o estrechando la órbita, acercando o separando apoyos y alternando la ruta entre S suave y diagonal corta.
`,
    },
    {
        id: 'lab-v6-split-bahia',
        name: 'Split Bahía Activa',
        description: 'Dos campos asimétricos con borde de tensión',
        skillVersion: '6',
        svgIcon: 'Columns2',
        textZone: 'right',
        promptInstruction: 'Asymmetric split layout with a protected text bay and controlled edge tension.',
        structuralPrompt: `
Divide el lienzo en una bahía de texto y un escenario dominante con un corte asimétrico que marque jerarquía inmediata. Reserva la bahía como zona continua de texto y limpia su perímetro para que ningún contenedor la invada. Coloca una placa dominante en el escenario y alinea placas de apoyo para encadenar lectura hacia el bloque tipográfico. Acerca una placa al borde del escenario para crear tensión visible y deja un margen respirable que no toque la bahía limpia. Ancla el logo principal en el pie del escenario y, si existe logo auxiliar, ubícalo en la cabecera de la bahía con presencia discreta; si no existe, deja esa cabecera libre. Varía la composición ensanchando o estrechando la bahía, adelantando o atrasando el corte y reflejando lateralmente la estructura sin romper la prioridad del texto.
`,
    },
    {
        id: 'lab-v6-marco-perimetral',
        name: 'Marco Perimetral Abierto',
        description: 'Framing en U con centro respirable',
        skillVersion: '6',
        svgIcon: 'PanelsTopLeft',
        textZone: 'bottom',
        promptInstruction: 'Perimeter U-frame composition with open center and one notch signature.',
        structuralPrompt: `
Enmarca el lienzo con un contenedor en U y deja el centro abierto para sostener una respiración clara del escenario. Reserva una base continua como zona de texto y protege esa banda para que no reciba solapes ni conectores. Coloca el foco principal en el campo central y separa los apoyos en el perímetro para mantener jerarquía legible. Recorta un único notch en el marco para activar la firma estructural y evita introducir otra ruptura dominante. Ancla el logo principal en un extremo de la base y, si existe logo auxiliar, colócalo en un borde alto opuesto con escala reducida; si no existe, conserva ese borde sin peso extra. Varía el resultado abriendo o cerrando la U, desplazando el notch y alternando lectura en Z corta o diagonal suave sin invadir la base.
`,
    },
    {
        id: 'lab-v6-reticula-ruptura',
        name: 'Retícula con Ruptura Única',
        description: 'Grid estable con corte controlado',
        skillVersion: '6',
        svgIcon: 'Grid2X2',
        textZone: 'top-right',
        promptInstruction: 'Broken grid with one controlled interruption and protected top text zone.',
        structuralPrompt: `
Organiza una retícula estable de contenedores y reserva la esquina superior como zona continua de texto con perímetro despejado. Coloca un bloque dominante fuera de la alineación principal para ejecutar una ruptura visible sin romper la lectura general. Alinea bloques de apoyo en el resto de la rejilla para guiar una ruta clara desde el foco hacia el texto. Separa la ruptura del bloque tipográfico para sostener jerarquía y deja un borde limpio entre ambas zonas. Ancla el logo principal en el pie de la retícula y, si existe logo auxiliar, ubícalo en un lateral alto distante con presencia menor; si no existe, mantén ese lateral como silencio funcional. Varía la estructura desplazando la celda rota, intercambiando placa por marco y alternando el recorrido entre diagonal suave y Z corta.
`,
    },
    {
        id: 'lab-v6-ventana-desplazada',
        name: 'Ventana Desplazada',
        description: 'Ventana principal corrida con eco lateral',
        skillVersion: '6',
        svgIcon: 'SquareStack',
        textZone: 'left',
        promptInstruction: 'Offset window composition with side echo and protected left text lane.',
        structuralPrompt: `
Desplaza una ventana principal fuera del eje central y reserva un carril izquierdo limpio como zona continua de texto. Coloca una ventana de apoyo en el borde opuesto para crear eco geométrico sin duplicar protagonismo. Encadena la lectura desde el carril tipográfico hacia la ventana dominante y conecta el retorno con un conector mínimo. Separa las ventanas del carril para proteger el aire alrededor del título y evita solapes en la no-go zone. Ancla el logo principal en la base del campo dominante y, si existe logo auxiliar, alinéalo en una cabecera opuesta con firma discreta; si no existe, conserva esa cabecera despejada. Varía la composición adelantando o atrasando la ventana principal, abriendo o cerrando su marco y reflejando lateralmente el sistema sin mover el carril limpio.
`,
    },
    {
        id: 'lab-v6-banda-serpenteante',
        name: 'Banda Serpenteante',
        description: 'Recorrido en S con checkpoints limpios',
        skillVersion: '6',
        svgIcon: 'Route',
        textZone: 'top-left',
        promptInstruction: 'Serpentine band structure with clear checkpoints and protected header.',
        structuralPrompt: `
Traza una banda serpenteante que recorra el lienzo y reserva una cabecera limpia para mantener una zona continua de texto. Coloca un checkpoint dominante sobre la curva principal y alinea checkpoints de apoyo para sostener continuidad de lectura. Separa la banda del bloque tipográfico para evitar roces y deja un perímetro despejado en toda la cabecera. Conecta los checkpoints con un gesto suave para mantener ritmo visual sin saturar el campo central. Ancla el logo principal en el pie opuesto al arranque de la banda y, si existe logo auxiliar, ubícalo en un borde alto distante con presencia reducida; si no existe, deja ese borde como silencio. Varía el resultado abriendo o cerrando la curva, acercando o separando checkpoints y alternando la ruta entre S y diagonal suave sin romper la cabecera.
`,
    },
    {
        id: 'lab-v6-orbita-concentrica',
        name: 'Órbita Concéntrica',
        description: 'Anillos de lectura con núcleo respirable',
        skillVersion: '6',
        svgIcon: 'Circle',
        textZone: 'top-right',
        promptInstruction: 'Concentric orbit architecture with a quiet center and controlled reading flow.',
        structuralPrompt: `
Rodea el foco con anillos suaves y reserva una cabecera lateral limpia como zona continua para texto. Coloca un núcleo dominante en el centro y distribuye apoyos en la órbita para guiar continuidad sin ruido. Separa los anillos del bloque tipográfico y protege el perímetro de la no-go zone con aire claro. Conecta el recorrido entre órbita y núcleo con un gesto mínimo para sostener jerarquía estable. Ancla el logo principal en la base opuesta al núcleo y, si existe logo auxiliar, ubícalo en un borde alto distante con firma discreta; si no existe, conserva ese borde limpio. Varía la composición ensanchando o estrechando los anillos y alternando la ruta entre diagonal suave y Z corta.
`,
    },
    {
        id: 'lab-v6-diptico-puente',
        name: 'Díptico Puente',
        description: 'Dos campos unidos por conectores mínimos',
        skillVersion: '6',
        svgIcon: 'Columns2',
        textZone: 'left',
        promptInstruction: 'Two-panel split linked by minimal bridges and protected text lane.',
        structuralPrompt: `
Divide el lienzo en dos campos y reserva un carril limpio para texto en el lateral dominante. Coloca el foco en un panel y sitúa apoyos en el panel opuesto para crear contraste de peso visual. Conecta ambos paneles con puentes mínimos y evita que esos conectores invadan el bloque tipográfico. Separa el carril del escenario con un borde claro para mantener lectura continua y controlada. Ancla el logo principal en el pie del panel de foco y, si existe logo auxiliar, colócalo en el borde superior del panel opuesto con presencia menor; si no existe, deja ese borde respirable. Varía el resultado desplazando el corte central y alternando lectura en Z corta o diagonal.
`,
    },
    {
        id: 'lab-v6-islas-contrapeso',
        name: 'Islas en Contrapeso',
        description: 'Núcleo fuerte y satélites de apoyo',
        skillVersion: '6',
        svgIcon: 'Layers',
        textZone: 'bottom',
        promptInstruction: 'Island composition with one dominant mass and balanced satellites.',
        structuralPrompt: `
Coloca una isla dominante en el escenario y reserva una base limpia como zona continua para texto. Distribuye islas de apoyo alrededor del foco para construir contrapeso sin fragmentar la lectura. Separa las islas del bloque tipográfico y deja perímetro despejado para no contaminar la base. Encadena el recorrido desde la isla principal hacia los satélites con continuidad visual sobria. Ancla el logo principal en un extremo de la base y, si existe logo auxiliar, ubícalo en una esquina alta opuesta con escala discreta; si no existe, mantiene esa esquina libre. Varía la composición acercando o separando islas y alternando contenedor entre placa y marco sin romper la base.
`,
    },
    {
        id: 'lab-v6-capsulas-ritmo',
        name: 'Cápsulas de Ritmo',
        description: 'Serie modular con beats espaciados',
        skillVersion: '6',
        svgIcon: 'Pill',
        textZone: 'right',
        promptInstruction: 'Capsule rhythm layout with clean right text bay and soft beats.',
        structuralPrompt: `
Escalona cápsulas en una serie rítmica y reserva una bahía limpia en el lateral para título y apoyo. Coloca una cápsula dominante como ancla del recorrido y alinea cápsulas secundarias para sostener continuidad. Separa la serie del bloque tipográfico y protege la no-go zone con un borde respirable. Conecta los beats con un gesto mínimo para mantener orden sin saturar el escenario. Ancla el logo principal en el pie de la serie y, si existe logo auxiliar, ubícalo en la cabecera opuesta con presencia reducida; si no existe, conserva esa cabecera libre. Varía la composición ensanchando la cápsula ancla y alternando lectura en S suave o diagonal corta.
`,
    },
    {
        id: 'lab-v6-umbral-lateral',
        name: 'Umbral Lateral',
        description: 'Puerta estrecha con campo abierto',
        skillVersion: '6',
        svgIcon: 'DoorOpen',
        textZone: 'top-left',
        promptInstruction: 'Lateral threshold composition with narrow gate and open stage.',
        structuralPrompt: `
Construye un umbral estrecho en un lateral y reserva una cabecera limpia para la zona continua de texto. Coloca el foco en el campo abierto y usa el umbral como gesto de entrada sin cerrar el escenario. Separa el umbral del bloque tipográfico y deja un perímetro despejado para proteger legibilidad. Desplaza apoyos ligeros sobre el campo abierto para reforzar continuidad de lectura. Ancla el logo principal en la base del campo y, si existe logo auxiliar, ubícalo en un borde alto opuesto con firma discreta; si no existe, deja ese borde en silencio. Varía el resultado abriendo o estrechando la puerta lateral y reflejando la estructura sin romper la cabecera.
`,
    },
    {
        id: 'lab-v6-rejilla-hub',
        name: 'Rejilla Hub',
        description: 'Grid de soporte con centro ancla',
        skillVersion: '6',
        svgIcon: 'Grid3X3',
        textZone: 'top',
        promptInstruction: 'Grid hub architecture with central anchor and protected header.',
        structuralPrompt: `
Organiza una rejilla de soporte y reserva una franja superior limpia como zona continua de texto. Coloca un hub dominante en el centro y alinea celdas de apoyo para sostener jerarquía clara. Separa la franja tipográfica de la rejilla con un borde limpio que no reciba conectores. Conecta el hub con apoyos mediante líneas mínimas para mantener continuidad sin ruido. Ancla el logo principal en el pie de la rejilla y, si existe logo auxiliar, ubícalo en un lateral alto distante con presencia menor; si no existe, conserva ese lateral respirable. Varía la composición desplazando el hub y alternando ruta de lectura entre Z corta y diagonal.
`,
    },
    {
        id: 'lab-v6-columna-eco',
        name: 'Columna Eco',
        description: 'Eje vertical dominante con réplicas suaves',
        skillVersion: '6',
        svgIcon: 'AlignVerticalSpaceAround',
        textZone: 'left',
        promptInstruction: 'Vertical column layout with echoed supports and clean side text lane.',
        structuralPrompt: `
Traza una columna dominante y reserva un carril lateral limpio para texto continuo. Coloca apoyos en eco a lo largo del eje para reforzar ritmo sin competir con la columna. Separa el carril tipográfico del eje con un margen respirable y protege la no-go zone. Encadena la lectura de arriba hacia abajo con continuidad estable entre columna y apoyos. Ancla el logo principal en el pie de la columna y, si existe logo auxiliar, colócalo en la cabecera opuesta con escala discreta; si no existe, deja esa cabecera limpia. Varía el resultado desplazando la columna y alternando contenedor entre placa y banda sin romper el carril.
`,
    },
    {
        id: 'lab-v6-bisel-esquina',
        name: 'Bisel de Esquina',
        description: 'Recorte angular que activa el marco',
        skillVersion: '6',
        svgIcon: 'CornerDownRight',
        textZone: 'bottom-right',
        promptInstruction: 'Corner-bevel structure with one angular cut and reserved text base.',
        structuralPrompt: `
Enmarca el escenario con un borde activo y reserva una esquina de base limpia para texto continuo. Recorta un bisel angular como firma estructural y evita introducir una segunda ruptura fuerte. Coloca el foco cerca del bisel y distribuye apoyos en el lado opuesto para equilibrar peso visual. Separa el bloque tipográfico del recorte con perímetro despejado para preservar legibilidad. Ancla el logo principal en el extremo de la base y, si existe logo auxiliar, ubícalo en un borde superior opuesto con presencia menor; si no existe, conserva ese borde sin carga. Varía la composición girando el bisel y alternando lectura entre diagonal suave y Z corta.
`,
    },
    {
        id: 'lab-v6-cinta-cascada',
        name: 'Cinta Cascada',
        description: 'Banda descendente en niveles suaves',
        skillVersion: '6',
        svgIcon: 'Waves',
        textZone: 'right',
        promptInstruction: 'Cascade ribbon structure with descending stages and protected right lane.',
        structuralPrompt: `
Desplaza una cinta en cascada por el escenario y reserva un carril derecho limpio para texto. Coloca un tramo dominante en la parte alta de la cinta y encadena tramos de apoyo hacia la base. Separa la cinta del carril tipográfico con aire claro para evitar roces en la no-go zone. Conecta los tramos con continuidad suave para sostener una jerarquía legible de arriba abajo. Ancla el logo principal en la base de la cascada y, si existe logo auxiliar, colócalo en la cabecera opuesta con firma discreta; si no existe, deja esa cabecera libre. Varía el resultado abriendo la caída de la cinta y alternando ruta entre S suave y diagonal.
`,
    },
    {
        id: 'lab-v6-anillo-pivot',
        name: 'Anillo Pivot',
        description: 'Aro principal con pivote lateral',
        skillVersion: '6',
        svgIcon: 'CircleDot',
        textZone: 'top-right',
        promptInstruction: 'Pivot ring layout with lateral anchor and clear text headroom.',
        structuralPrompt: `
Enmarca el foco con un anillo principal y reserva una cabecera lateral limpia para texto continuo. Coloca un pivote en el borde del anillo para activar lectura sin romper el centro. Separa el bloque tipográfico del anillo y protege su perímetro con margen respirable. Encadena apoyos ligeros alrededor del aro para mantener continuidad y jerarquía estable. Ancla el logo principal en el pie opuesto al pivote y, si existe logo auxiliar, ubícalo en un borde alto distante con presencia reducida; si no existe, conserva ese borde limpio. Varía la composición ensanchando el anillo y desplazando el pivote sin invadir la cabecera.
`,
    },
    {
        id: 'lab-v6-rail-pie-editorial',
        name: 'Rail con Pie Editorial',
        description: 'Columna guiada y franja inferior de apoyo',
        skillVersion: '6',
        svgIcon: 'PanelBottom',
        textZone: 'bottom',
        promptInstruction: 'Editorial rail with reserved footer strip and structured reading ladder.',
        structuralPrompt: `
Define un rail vertical dominante y reserva una franja inferior limpia como zona continua de texto. Coloca el foco en la mitad alta del rail y distribuye apoyos en escalón para guiar lectura descendente. Separa la franja tipográfica del rail con un borde claro para evitar solapes y ruido. Conecta apoyos con alineaciones mínimas para sostener continuidad sin densidad excesiva. Ancla el logo principal en un extremo del pie editorial y, si existe logo auxiliar, ubícalo en una cabecera opuesta con firma discreta; si no existe, deja esa cabecera respirable. Varía el resultado desplazando el rail y alternando ruta entre F vertical y Z corta.
`,
    },
    {
        id: 'lab-v6-mosaico-hero',
        name: 'Mosaico Hero Tile',
        description: 'Retícula asimétrica con celda protagonista',
        skillVersion: '6',
        svgIcon: 'LayoutGrid',
        textZone: 'left',
        promptInstruction: 'Asymmetric mosaic with a hero tile and protected left text lane.',
        structuralPrompt: `
Construye un mosaico asimétrico y reserva un carril izquierdo limpio para título y apoyo. Coloca una celda hero como foco dominante y distribuye celdas secundarias para acompañar sin competir. Separa el carril tipográfico de la retícula con perímetro despejado para mantener legibilidad firme. Encadena la lectura desde la celda hero hacia celdas de apoyo con continuidad controlada. Ancla el logo principal en el pie del mosaico y, si existe logo auxiliar, ubícalo en una cabecera opuesta con presencia menor; si no existe, conserva esa cabecera libre. Varía la composición intercambiando posición de la celda hero y alternando contenedor entre placa y marco.
`,
    },
    {
        id: 'lab-v6-puerta-estrecha',
        name: 'Puerta Estrecha',
        description: 'Portal comprimido con escenario expandido',
        skillVersion: '6',
        svgIcon: 'DoorClosed',
        textZone: 'top-left',
        promptInstruction: 'Narrow gate composition with expansive stage and clean text header.',
        structuralPrompt: `
Define una puerta estrecha en un borde y reserva una cabecera limpia como zona continua de texto. Coloca el foco en el escenario amplio y usa la puerta como gesto de tensión de entrada. Separa el bloque tipográfico del portal con margen claro para evitar invasiones en la no-go zone. Alinea apoyos alrededor del foco para sostener una jerarquía estable y legible. Ancla el logo principal en la base del escenario y, si existe logo auxiliar, colócalo en un borde alto opuesto con firma discreta; si no existe, deja ese borde en silencio. Varía el resultado adelantando o atrasando la puerta y reflejando lateralmente la estructura sin romper la cabecera.
`,
    },
    {
        id: 'lab-v6-marco-bisagra',
        name: 'Marco Bisagra',
        description: 'Contenedor articulado sobre eje lateral',
        skillVersion: '6',
        svgIcon: 'Frame',
        textZone: 'right',
        promptInstruction: 'Hinged frame architecture with one articulated fold and right text protection.',
        structuralPrompt: `
Enmarca el escenario con un marco articulado y reserva un carril derecho limpio para texto continuo. Coloca el foco en la zona de bisagra y distribuye apoyos hacia el lado opuesto para equilibrar peso visual. Separa el carril tipográfico del pliegue con perímetro despejado para conservar legibilidad. Conecta el recorrido desde la bisagra hacia apoyos con continuidad suave y ordenada. Ancla el logo principal en la base del marco y, si existe logo auxiliar, ubícalo en la cabecera opuesta con escala discreta; si no existe, conserva esa cabecera libre. Varía la composición abriendo o cerrando la bisagra y alternando ruta entre diagonal y Z corta.
`,
    },
    {
        id: 'lab-v6-offset-perimetral',
        name: 'Offset Perimetral',
        description: 'Borde activo desplazado con núcleo limpio',
        skillVersion: '6',
        svgIcon: 'Square',
        textZone: 'top',
        promptInstruction: 'Offset perimeter frame with a calm core and protected top text strip.',
        structuralPrompt: `
Activa un marco perimetral desplazado y reserva una franja superior limpia para texto continuo. Coloca el foco en el núcleo interior y reparte apoyos en el perímetro para sostener contrapeso. Separa la franja tipográfica del borde activo con aire claro para evitar cruces. Encadena la lectura desde el núcleo hacia el perímetro con continuidad controlada y sin ruido. Ancla el logo principal en el pie del marco y, si existe logo auxiliar, ubícalo en un lateral alto opuesto con firma discreta; si no existe, deja ese lateral respirable. Varía el resultado desplazando el perímetro y alternando contenedor entre banda y marco sin romper la franja.
`,
    },
    {
        id: 'lab-v6-celda-satelite',
        name: 'Celda Satélite',
        description: 'Foco central con celdas orbitales',
        skillVersion: '6',
        svgIcon: 'Orbit',
        textZone: 'left',
        promptInstruction: 'Central cell with orbital satellites and clean left editorial lane.',
        structuralPrompt: `
Coloca una celda central dominante y reserva un carril izquierdo limpio como zona continua de texto. Distribuye celdas satélite alrededor del foco para construir una órbita legible sin saturación. Separa el carril tipográfico del sistema orbital con perímetro despejado y sin conectores invasivos. Conecta la celda central con satélites mediante guías mínimas para mantener continuidad. Ancla el logo principal en la base opuesta al carril y, si existe logo auxiliar, ubícalo en una cabecera distante con presencia menor; si no existe, conserva esa cabecera libre. Varía la composición acercando o separando satélites y alternando ruta en S suave o diagonal corta.
`,
    },
    {
        id: 'lab-v6-vacio-esquina',
        name: 'Vacío de Esquina',
        description: 'Silencio angular como ancla funcional',
        skillVersion: '6',
        svgIcon: 'CornerUpLeft',
        textZone: 'bottom-left',
        promptInstruction: 'Corner void strategy with protected text block and controlled support masses.',
        structuralPrompt: `
Reserva una esquina como vacío protagonista y coloca el bloque de texto continuo en un área adyacente limpia. Sitúa el foco en el campo opuesto y distribuye apoyos con masa controlada para sostener jerarquía. Separa el bloque tipográfico del vacío y de los apoyos con perímetro respirable para máxima legibilidad. Encadena la lectura entre foco y texto sin cruzar la esquina silenciosa. Ancla el logo principal en la base del campo activo y, si existe logo auxiliar, colócalo en un borde alto opuesto con firma discreta; si no existe, deja ese borde en silencio. Varía la estructura rotando el vacío de esquina y reflejando lateralmente el sistema sin romper la zona de texto.
`,
    },
    {
        id: 'lab-v6-banda-doble',
        name: 'Banda Doble',
        description: 'Dos carriles tensados con foco intermedio',
        skillVersion: '6',
        svgIcon: 'Rows3',
        textZone: 'top-right',
        promptInstruction: 'Dual-band composition with intermediate focus and protected top lane.',
        structuralPrompt: `
Traza dos bandas paralelas y reserva una cabecera lateral limpia para texto continuo. Coloca el foco entre ambas bandas para crear tensión controlada sin bloquear la lectura. Separa la cabecera tipográfica del sistema de bandas con un margen claro y estable. Alinea apoyos sobre las bandas para encadenar recorrido y mantener continuidad visual. Ancla el logo principal en la base del sistema y, si existe logo auxiliar, ubícalo en un borde superior opuesto con presencia menor; si no existe, conserva ese borde despejado. Varía el resultado ensanchando o estrechando bandas y alternando lectura entre Z corta y diagonal suave.
`,
    },
    {
        id: 'lab-v6-escalon-zeta',
        name: 'Escalón Zeta',
        description: 'Ruta quebrada en Z con niveles de apoyo',
        skillVersion: '6',
        svgIcon: 'MoveRight',
        textZone: 'right',
        promptInstruction: 'Stepped Z-path architecture with protected right text lane and one dominant node.',
        structuralPrompt: `
Escalona un recorrido en Z y reserva un carril derecho limpio como zona continua de texto. Coloca un nodo dominante en el quiebre principal y distribuye nodos de apoyo sobre la ruta para sostener jerarquía. Separa el carril tipográfico del zigzag con perímetro despejado y sin solapes. Conecta los nodos con guías mínimas para mantener continuidad sin densidad excesiva. Ancla el logo principal en la base del recorrido y, si existe logo auxiliar, ubícalo en una cabecera opuesta con firma discreta; si no existe, deja esa cabecera libre. Varía la composición abriendo la Z, desplazando el quiebre y reflejando lateralmente la estructura sin romper el carril.
`,
    },
    {
        id: 'lab-v6-ventana-constelacion',
        name: 'Ventana Constelación',
        description: 'Marco abierto con satélites en constelación',
        skillVersion: '6',
        svgIcon: 'Sparkles',
        textZone: 'top',
        promptInstruction: 'Open window with constellation supports and protected top text strip.',
        structuralPrompt: `
Enmarca el foco con una ventana abierta y reserva una franja superior limpia como zona continua de texto. Coloca satélites en constelación alrededor del marco para crear ritmo sin invadir el núcleo. Separa la franja tipográfica del sistema de satélites con perímetro despejado y estable. Conecta la constelación con gestos mínimos para sostener continuidad y jerarquía clara. Ancla el logo principal en el pie del marco y, si existe logo auxiliar, ubícalo en un lateral alto opuesto con presencia menor; si no existe, conserva ese lateral respirable. Varía el resultado desplazando la ventana, acercando o separando satélites y alternando lectura en S suave o diagonal.
`,
    },
]
