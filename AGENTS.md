
- El usuario se llama Juanfran

## Referencia técnica del proyecto
- Existe un documento vivo de referencia técnica en `docs/TECHNICAL_REFERENCE.md`.
- Úsalo como contexto técnico de proyecto para integraciones, decisiones compartidas y comportamientos transversales.
- Cuando se documente una decisión técnica nueva, debe añadirse también ahí.

- Para reglas de coherencia visual, tipografia, botones, dropdowns y jerarquia de UI, consulta tambien docs/UI_SYSTEM_RULES.md antes de introducir controles nuevos o retocar patrones existentes.

## ⛔ CONVEX: LEE ESTO ANTES DE TOCAR NADA (verificado el 2026-08-14)

**DESARROLLO LOCAL Y PRODUCCIÓN YA ESTÁN SEPARADOS.**

**`.env.local` apunta al deployment de pruebas `moonlit-marten-227`, dentro del proyecto
`gradeyourwritings/x-studio-dev`. `npx convex dev` trabaja por defecto contra esa base
aislada. No contiene datos de usuarios; solo configuración mínima.**

**SOLO HAY UN CONVEX REAL: `prestigious-pigeon-784`. AUNQUE CONVEX LO ETIQUETE COMO
"DEVELOPMENT", ES EL QUE USA LA WEB PUBLICA `postlaboratory.com`.**

**`prestigious-pigeon-784` sigue siendo la producción real aunque Convex lo etiquete
"Development". Solo se alcanza reactivando deliberadamente su deploy key histórica o
seleccionándolo de forma explícita. Cualquier operación contra él requiere confirmación.**

**EL DEPLOYMENT LLAMADO "PRODUCTION" (`watchful-retriever-328`) ESTA VACIO Y NO LO USA
NADIE: 0 LLAMADAS, TABLA `users` VACIA, ULTIMO DEPLOY HACE 2 MESES.
`CONVEX_PROD_DEPLOY_KEY` APUNTA A ESE CASCARON: NO LA USES CREYENDO QUE DESPLIEGAS A
LA WEB REAL, PORQUE DESPLIEGA AL SITIO EQUIVOCADO.**

Evidencia (por si alguien vuelve a dudar):

| Cosa | Valor real |
|---|---|
| Deployment local de pruebas | `moonlit-marten-227` — proyecto `gradeyourwritings/x-studio-dev` |
| Deployment que sirve `postlaboratory.com` | `prestigious-pigeon-784` (visto en el bundle JS de produccion) |
| Etiqueta que le pone Convex | `Development` |
| Deployment etiquetado `Production` | `watchful-retriever-328` — vacio, sin trafico |
| `NEXT_PUBLIC_CONVEX_URL` local | `moonlit-marten-227` |
| `CONVEX_PROD_URL`, `MIGRATION_SOURCE_URL`, `MIGRATION_TARGET_URL` | `prestigious-pigeon-784` |
| Deploy key histórica real | comentada en `.env.local`; backup ignorado en `.backups/` |
| `CONVEX_PROD_DEPLOY_KEY` | `prod:watchful-retriever-328` (el cascaron vacio) |
| `warmhearted-schnauzer-446` | MUERTO, no responde. Si aparece en codigo o docs, es basura heredada |

Reglas practicas que se derivan:

1. `npx convex dev --once` sin overrides publica en `moonlit-marten-227`. Antes de
   usar `prestigious-pigeon-784`, su clave histórica o cualquier override de deployment,
   avisar y pedir confirmación porque eso sí publica en producción.
2. **El login del CLI de Convex es global por maquina** (`~/.convex/config.json`), asi
   que loguearse para otro proyecto rompe el acceso a este. Por eso existe
   La base local usa la sesión global. La clave de producción queda desactivada para
   impedir selecciones accidentales.
3. El migrador `/admin/migrate` tiene origen y destino en el MISMO deployment: solo
   copia de un usuario a otro. Es correcto, no es un bug.
4. Existe un backup completo previo a la consolidación, con almacenamiento incluido, en
   `.backups/convex-production-pre-identity-migration-20260814-163216.zip`. El riesgo
   abierto es que producción sigue con límites de tier Development.
## 🧠 Instrucciones Críticas de Comportamiento (Persona & Workflow)

### 1. Razonamiento y Planificación (Core)
Antes de tomar cualquier acción o responder:
1.  **Analiza dependencias**: ¿Qué bloquea qué? ¿Hay requisitos previos?
2.  **Evalúa riesgos**: ¿Es reversible? ¿Necesito confirmación?
3.  **Explora hipótesis**: No te quedes con la causa obvia.
4.  **Planifica**: Estructura tu respuesta y acciones lógicamente.

### 1.1 Consulta OBLIGATORIA de Componentes Estables
⚠️ **ANTES de modificar CUALQUIER código**, **CONSULTA `DONT_TOUCH.md`**:
- Este archivo lista componentes y funcionalidades que **ESTÁN FUNCIONANDO** y **NO DEBEN MODIFICARSE** sin confirmación explícita.
- Si tu tarea implica modificar algo listado en `DONT_TOUCH.md`, **PREGUNTA AL USUARIO PRIMERO**.
- **NUNCA** "optimices" o "refactorices" código estable sin permiso.
- Referencia: `DONT_TOUCH.md` en la raíz del proyecto.

### 2. Reglas de Interacción (instrucciones de Juanfran)
1.  **Preferencias del Usuario Primero**: Juanfran manda. Respeta sus decisiones.
2.  **Idioma**: **CASTELLANO/ESPAÑOL SIEMPRE**. No negociable.
3.  **Confirmación Explícita**: Si dudas, pregunta.
4.  **Cierre sobrio**: En todas las tareas completadas, finaliza tus respuestas con esta coleccion de iconos y nada mas: "➖➖➖➖➖➖➖➖➖➖". Si el entorno lo permite, emite tambien un patron de pitido breve pero llamativo al finalizar, preferiblemente en 3 tonos ascendentes.
5.  **Transparencia**: Explica qué haces y por qué.
6.  **Generalización Obligatoria**: No crear parches específicos para ejemplos concretos. Siempre buscar soluciones generales y escalables.
7.  **Logs Claros y Coloridos**: Si creas o mantienes logs, usa el helper `src/lib/logger.ts` y estructura los mensajes con etiquetas visibles y colores coherentes por nivel (info/success/warn/error/debug). Evita logs crudos dispersos.

### 3. Autonomía con Herramientas (CLI & MCP)
**CRÍTICO**: Si puedes hacerlo tú, **HAZLO TÚ**.
-   **NUNCA** le digas al usuario "ejecuta este comando" si tienes `run_command`.
-   **NUNCA** le digas "lanza esta query" si tienes `supabase-mcp`.
-   **SOLO** pide intervención manual si es imposible para ti (ej. abrir una URL en su navegador local si no tienes tool de navegador, o acciones físicas).
-   Ejemplos: Database queries, deploys, scripts, git operations -> **Hazlas tú**.

### 4. Reglas de Git y Deployment (SEGURIDAD)
-   **NUNCA hacer `git push` sin preguntar**:
    1.  Haz commits locales (`git commit`).
    2.  Pregunta: "¿Hago push a canva-style/main?".
    3.  Espera confirmación explícita (Vercel cuesta dinero y tiempo).
-   **Verificación de Deployment**:
    -   Tras un push autorizado, **SIEMPRE** verifica el estado en Vercel.
    -   Comando: `vercel list --token $env:VERCEL_TOKEN` (el token vive en la variable de entorno `VERCEL_TOKEN`, nunca en este fichero ni en el repo).
    -   Si falla, investiga inmediatamente.
    **Pero SIEMPRE preguntar al usuario si quiere hacer un deploy** cuando recibas una solicitud de realizar una tarea que implique cambios en el código fuente, antes de hacerlo.


### 5. Comandos de Servidor
-   **Permitido arrancar servidores** (`npm run dev`, `npm run dev:quiet`, `npm run dev:mobile` o equivalentes) cuando sea necesario para validación técnica, revisión responsive, pruebas E2E o depuración autónoma.
-   **Prioridad**: si una tarea requiere comprobar funcionamiento real, el agente debe intentar levantar el entorno por su cuenta antes de pedir intervención manual.
-   **Evita procesos innecesarios**: no dejar servidores colgados si ya no hacen falta y no arrancar más de un entorno simultáneo sin motivo.

### 6. Verificación en Navegador (REGLA DE ORO)
⚠️ **MODO AUTÓNOMO PERMITIDO**: el agente **SÍ PUEDE** utilizar navegador automatizado para comprobaciones visuales, revisión responsive, validación de flujos finales y toma de decisiones de UI de bajo riesgo.
- **Herramientas preferidas**:
  - `playwright` para recorridos funcionales, interacción y validación responsive.
  - `chrome-devtools` para inspección técnica de DOM, red, consola, estilos computados y estados internos.
- **Objetivo**: si Juanfran pide "revísalo", "haz que vaya", "pruébalo tú", "deja mobile bien", o cualquier petición equivalente, el agente debe intentar resolver el ciclo completo sin depender de revisión manual constante.
- **Autonomía autorizada**:
  - abrir la app,
  - recorrer rutas,
  - cambiar viewport,
  - interactuar con formularios,
  - detectar errores visuales/funcionales,
  - corregir,
  - volver a validar.
- **Solo pedir confirmación previa** para:
  - rediseños grandes,
  - cambios de arquitectura,
  - modificaciones en zonas protegidas por `DONT_TOUCH.md`,
  - decisiones de producto ambiguas donde haya más de una dirección válida.
- **Si el agente puede verificarlo por su cuenta, debe hacerlo**. La revisión manual de Juanfran pasa a ser una capa final, no un requisito para cada iteración pequeña.
- **Si una validación visual no puede hacerse de forma fiable**, el agente debe explicar exactamente qué faltó para automatizarla.
- **Preferencia operativa obligatoria de Juanfran para validación visual**:
  - Usar primero la extensión de ChatGPT instalada en el Chrome personal de Juanfran. Esta es la superficie prioritaria para revisar la UI, aprovechar sesiones autenticadas y comprobar el estado que Juanfran está viendo.
  - Reutilizar las pestañas existentes cuando corresponda y evitar abrir navegadores o perfiles adicionales sin necesidad.
  - Usar el navegador de debug aislado del proyecto (`npm run chrome:debug`, `npm run chrome:debug:studio` o `npm run dev:debug-browser`) solo si la extensión no está disponible, falla la conexión o la prueba exige aislamiento técnico.
  - No arrancar el navegador aislado por defecto mientras la extensión de ChatGPT esté conectada y sea suficiente para la comprobación.

### 7. Rediseños y UI
-   **PROHIBIDO realizar rediseños completos** de una página o componente sin consulta previa y autorización explícita de Juanfran.
-   Si crees que el diseño puede mejorar, sugiere el cambio primero, pero no lo implementes por tu cuenta.

### 8. Comando "Sincroniza"
Cuando Juanfran diga **"sincroniza"**, ejecuta automáticamente:
1.  `git add -A && git commit` (commitea cambios en canva-style)
2.  `git checkout main && git merge canva-style` (merge a main)
3.  `git push origin main` (push de main)
4.  `git checkout canva-style` (volver a canva-style para seguir trabajando)
5.  **Informar al finalizar**: Indica detalladamente qué has hecho, el estado actual del proyecto (si hay errores de build, etc.) y confirma en qué rama te encuentras.

### 8.1 Comando "deploy"
Cuando Juanfran diga **"deploy"**, se considera **autorización explícita** para ejecutar flujo completo de release:
1.  Guardar rama actual en variable (`$currentBranch`) para volver al final.
2.  `git add -A`
3.  `git commit -m "<mensaje automático o el último propuesto en conversación>"`
4.  `git checkout main`
5.  `git merge $currentBranch`
6.  `git push origin main`
7.  Deploy a producción (Vercel) y verificar estado:
    - `vercel --prod --yes --token $env:VERCEL_TOKEN`
    - `vercel list --token $env:VERCEL_TOKEN`
8.  **Verificación estricta de build**:
    - Confirmar que el deployment en Vercel termina en estado `READY`.
    - Si el build/deploy falla, **iterar automáticamente**: diagnosticar, corregir código, commitear, push y redeploy hasta que el estado final sea `READY`.
    - No dar por finalizada la tarea mientras Vercel no esté en verde.
9.  Volver a la rama original:
    - `git checkout $currentBranch`
10.  **Informar al finalizar**: commit creado, merge realizado, resultado de push/deploy, estado de verificación en Vercel y rama final activa.

### 9. Workflow de Verificación y Commits
- **Verificación autónoma primero**: Al implementar cambios, el agente debe intentar comprobarlos por su cuenta con herramientas locales, navegador automatizado, logs, tests y validaciones técnicas antes de pedir revisión humana.
- **Verificación manual de Juanfran**:
  - obligatoria antes de commit cuando el cambio sea sensible, visualmente subjetivo, o afecte a experiencia principal de usuario;
  - opcional para iteraciones pequeñas, ajustes técnicos o correcciones claramente verificables por automatización.
- **Ciclo de Commit**: Solo cuando Juanfran confirme que el cambio funciona correctamente y es de su agrado, propondrás el commit de los cambios.
- **NUNCA** propongas o realices un commit sin que el usuario haya validado el funcionamiento de la nueva implementación.

### 10. Conocimiento del Sistema (Windows)
- **Entorno**: Este proyecto se ejecuta sobre **Windows**.
- **Separadores de Comandos**: **PROHIBIDO** utilizar el operador `&&` para encadenar comandos (ej. `git add . && git commit`). En este entorno, `&&` no es reconocido correctamente por el shell.
- **Uso Correcto**: Utiliza el punto y coma `;` para separar comandos o ejecútalos de forma secuencial e independiente.
- **Memoria**: Recuerda esto siempre para evitar errores de sintaxis en la terminal.

### 10.1 Codificación UTF-8 (Anti-mojibake)
- **Siempre** forzar salida UTF-8 en scripts que generan texto (ej. `PYTHONIOENCODING=utf-8` y `PYTHONUTF8=1`).
- **Nunca** escribir archivos de texto en otra codificación.
- **Verificación**: si aparecen caracteres como `Ã` o `�`, hay que regenerar con UTF-8.

### 11. Coherencia Visual y Estilos (Design System)
- **Integridad del Design System (MANDAMIENTO SUPREMO)**:
    - **PROHIBIDO TOCAR LOS ESTILOS DE SHADCN**: Déjalos actuar. Tienes PROHIBIDO añadir clases como `bg-white`, `text-black`, `border-gray-200` o cualquier color específico a componentes que ya tienen un `variant` definido.
    - **NO SEAS "CREATIVO" CON LOS COLORES**: Si un botón no se ve bien, NO LE PONGAS `bg-amber-600`. Usa `variant="default"`, `variant="secondary"`, `variant="destructive"` o `variant="outline"`. Si ninguno encaja, el problema es el diseño, no el código -> **Pregunta a Juanfran**.
    - **CERO CLASES "FORZADAS"**:
        - ❌ MAL: `className="bg-[#123456] text-white"`
        - ❌ MAL: `className="!bg-blue-500 !important"`
        - ✅ BIEN: `className="text-muted-foreground"` (utilidades semánticas permitidas solo para texto/layout).
    - **LIMPIEZA EXTREMA**: Tu trabajo es usar el sistema, no luchar contra él. Si te ves escribiendo un color hardcodeado, PARA. Estás cometiendo un error.
- **Iconografía**:
    - Usa **EXCLUSIVAMENTE** `lucide-react` para todos los iconos nuevos o reemplazos.
    - No mezcles librerías de iconos (ej. evitar `@mui/icons-material`) a menos que sea una dependencia heredada crítica que no se puede tocar.
- **Experiencia de Usuario (Micro-interacciones)**:
    - **"El Trabajo Silencioso"**: Las microanimaciones deben guiar la atención y dar feedback sin interferir.
    - **Imperativo**: **AÑADE SIEMPRE** detalles que hagan que la aplicación parezca viva.
    - Usa transiciones suaves (`transition-all`), estados de carga elegantes y respuestas táctiles visuales al interactuar.
    - *Filosofía*: "Delightful but unobtrusive". Que el usuario sienta que la interfaz responde a su presencia.

### 12. Modularidad y Limpieza de Código
- **Evita Componentes Monolíticos**:
    - Si un componente supera las ~250-300 líneas, es una señal roja. **DIVÍDELO**.
    - Extrae lógica a hooks personalizados (`useSomething`) o subcomponentes en el mismo directorio.
    - Mantén los archivos manejables y con responsabilidad única.

### 13. Uso del Copiloto Técnico (Chrome DevTools MCP)
**Propósito**: El MCP `chrome-devtools` es tu herramienta de "Rayos X" para debugear la lógica de cliente, red y DOM en tiempo real.
- **Cuándo Usarlo**:
    - Errores de consola que no se ven en el terminal de VSCode (hooks, Clerk, etc.).
    - Peticiones de red (Convex, APIs) para ver payloads y status.
    - Inspección de estilos computados para puzzles de CSS difíciles.
    - Verificación técnica de estados de la UI (ej. ¿está este botón realmente habilitado?).
- **REGLA DE CONEXIÓN**: Prioriza la extensión de ChatGPT del Chrome personal. Verifica el puerto `9222` únicamente cuando sea necesario recurrir al navegador de debug aislado.
- **ÉTICA DE USO (Cruce con Regla 6)**:
    - Úsalo para diagnóstico técnico, validación visual y resolución autónoma de bloqueos cuando haga falta.
    - Si Playwright no basta para explicar un fallo visual, usa DevTools para inspeccionar las tripas antes de parchear a ciegas.
    - Reporta hallazgos técnicos (logs de error, variables CSS, requests fallidas) para fundamentar tus cambios.
- **Proactividad**: Si una tarea de responsive, mobile o QA visual puede resolverse más rápido con navegador y DevTools, hazlo sin esperar permiso adicional.

### 14. Estandarización de Modelos AI
- **Texto**: Cuando necesites un modelo de texto, **USA SIEMPRE** el mismo que se utiliza en el resto del proyecto.
- **Modelo Oficial**: `gemini-flash-latest` (o la exportación `flashModel` de `@/lib/gemini`).
- **Prohibido**: No inventes nombres de modelos ni instancies clientes nuevos si ya existe uno centralizado. MANTÉN LA COHERENCIA.
- **Configuración de Admin**: Los modelos de IA (texto e imagen) deben obtenerse siempre de la configuración del panel de Admin (`app_settings` en Convex) y pasarse desde el cliente. PROHIBIDO hardcodear strings de modelos en acciones o componentes.

### 15. Réplica Completa Entre Módulos (Imagen -> Carrusel)
- Si Juanfran pide "replicar el comportamiento del módulo de imagen", la réplica debe ser **funcionalmente completa** (no parcial ni visual).
- Esto incluye toda la cadena: selección de referencia, análisis, inyección en prompt final, contexto enviado al generador, prioridades del prompt y reglas de fallback.
- El análisis interno (ej. bloques de estilo `PRIORITY 5`) se usa para construir prompt y debug técnico, pero **NO debe mostrarse como contenido editable en el frontend** salvo petición explícita.
- La misma lógica debe aplicar a referencias subidas y a referencias elegidas desde Brand Kit.
### 17. Comando "misión autónoma"
Cuando Juanfran añada **"misión autónoma"** a cualquier petición, se activa el siguiente protocolo sin excepciones:

1. **Sin pausas**: Ejecuta la tarea de principio a fin sin pedir confirmación en ningún paso intermedio.
2. **Verificación visual obligatoria**: Al terminar la implementación, arrancar el entorno local (`npm run dev` o `npm run dev:mobile`) y el navegador de debug aislado (`npm run chrome:debug`), y comprobar visualmente que la tarea está resuelta.
3. **Iterar hasta certeza**: Si la comprobación visual revela que algo no funciona o no es correcto, corregir, volver a verificar y repetir el ciclo hasta tener certeza de que está solucionado.
4. **Solo detenerse al final**: Una vez que el agente tiene certeza visual de que la tarea está completa y correcta, informar a Juanfran con el resultado final, el estado del navegador y lo que se hizo.
5. **Excepciones únicas**: Solo interrumpir el ciclo autónomo si se encuentra una decisión de producto ambigua con más de una dirección válida, una modificación en zona protegida por `DONT_TOUCH.md`, o un rediseño completo no autorizado (regla 7).

### 18. Protocolo de delegación con EmilIA

Cuando exista una tarea susceptible de delegación mecánica a un worker local/cloud, el agente principal debe evaluar si conviene enviársela a **EmilIA**.

#### Regla de decisión

Aplicar siempre un semáforo antes de delegar:

- **Verde**:
  - tarea mecánica
  - alcance acotado
  - archivos conocidos
  - revisión barata
  - se puede delegar a `EmilIA`
- **Amarillo**:
  - tarea mecánica pero demasiado amplia para una sola spec
  - requiere partirse en piezas
  - primero se trocea y luego se delega a `EmilIA` por microtareas
- **Rojo**:
  - diagnóstico
  - arquitectura
  - UX/UI ambigua
  - lógica de negocio difusa
  - no se delega a `EmilIA`

#### Regla de envío

`EmilIA` **nunca** debe recibir una misión vaga.

Siempre debe recibir:
- un **plan corto cerrado** para una tarea verde, o
- un **microplan** que forme parte de un plan mayor para una tarea amarilla

Cada plan o microplan para `EmilIA` debe incluir:
- objetivo exacto
- archivos permitidos
- transformación concreta
- límites de lo que no puede tocar
- formato de salida esperado
- criterio rápido de revisión

#### Regla de seguridad

- `EmilIA` trabaja en **modo propuesta**, no en autoaplicación por defecto
- el agente principal sigue siendo responsable de revisar, corregir y decidir si aplicar o no
- si una tarea necesita demasiada explicación para delegarse con seguridad, no es tarea para `EmilIA`

### 19. Reutilizacion Obligatoria de Componentes Existentes
- **PROHIBIDO crear componentes nuevos** cuando ya exista un componente en el proyecto que cumpla la misma funcion o una funcion equivalente.
- Antes de crear cualquier componente de UI, **BUSCAR PRIMERO** si ya existe uno en el proyecto que haga lo mismo (por ejemplo: editor de paleta de colores, selector de color, chips de tags, etc.).
- Si existe un componente equivalente, **REUTILIZARLO** con las props necesarias (por ejemplo, `hideHeader`, variantes, etc.) en lugar de crear uno nuevo.
- **Razon**: Cada componente nuevo que duplica funcionalidad existente introduce inconsistencia visual, duplica mantenimiento y se aleja del lenguaje visual de la app.
- **Referencia de componentes reutilizables clave**:
  - `ColorPalette` (`src/components/brand-dna/ColorPalette.tsx`): editor de colores con roles (Texto/Fondo/Acento), color picker, eyedropper, drag-to-swap, eliminar (X), añadir (+).
  - `BrandingConfigurator` (`src/components/studio/creation-flow/BrandingConfigurator.tsx`): configurador visual de branding.
  - `RoleColorSwatch` / `AddAccentSwatch` en ControlsPanel y CarouselControlsPanel.
- Si un componente existente necesita una adaptacion menor (nueva prop, variante visual), **extiende** el componente en lugar de crear uno desde cero.

### 16. Regla Anti-Mojibake (UTF-8 estricto)
- Antes de cerrar una tarea con cambios de texto UI, ejecutar: `rg -n -P "\\u00C3|\\u00C2|\\uFFFD" src`.
- Si hay coincidencias, no finalizar hasta corregirlas.
- Forzar UTF-8 en scripts y evitar copiar texto desde fuentes con codificacion dudosa sin normalizar.
