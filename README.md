# Certifica · AB-410

Web local monousuario para estudiar **Microsoft Certified: Intelligent Applications
Builder Associate (AB-410)** sin reproducir el recorrido completo de Microsoft Learn.
Interfaz y material en español, sin cuenta, suscripción ni claves de IA.

## Arrancar

Requiere **Node.js 24 o superior** y npm. SQLite está incluido en Node; no requiere
instalar un servidor de base de datos.

```bash
npm install
npm run dev
```

Abre **http://127.0.0.1:4100**. El proceso permanece en esa terminal; detén con
`Ctrl+C`. `dev` sirve API e interfaz en el mismo puerto con recarga de frontend.

Para uso normal, sin servidor de desarrollo:

```bash
npm run start
```

`prestart` ejecuta automáticamente `npm run build`; `start` sirve la compilación
y la API. No ejecutes `dev` y `start` simultáneamente sobre el mismo puerto.
También existen `npm run build` y `npm test`.
`npm run test:ui` comprueba la portada y sus accesos al estudio en un navegador
con SQLite en memoria; requiere el Chromium de Playwright descrito en el tutorial.

Configuración opcional:

```bash
PORT=4200 DB_PATH=./data/otro-progreso.sqlite npm run dev
```

El servidor escucha **solo en 127.0.0.1**, comprueba Host/Origin y no habilita CORS.
No está diseñado para publicarse directamente en Internet: no tiene autenticación.
El puerto debe estar libre; no se terminan otros procesos automáticamente.

## Qué incluye

- **12 módulos** de síntesis original: 103 minutos de lectura estimada, más
  recuperación activa y laboratorios. No es una promesa de dominar el examen en
  ese tiempo ni un sustituto de práctica real.
- **60 preguntas originales**, de opción única, con explicación de las cuatro
  alternativas, referencias y módulo de repaso.
- Ruta inicial adaptada a experiencia en Power Platform y menor familiaridad con
  Copilot Studio: agentes → prompts → integración → datos con IA.
- Portada guiada con una sola acción principal: empezar, retomar una sesión,
  practicar un módulo leído o repasar preguntas pendientes. El diagnóstico breve
  es una alternativa de práctica no oficial al empezar; el temario, las fuentes y
  las estadísticas siguen accesibles desde el menú. Una práctica guardada no
  desplaza el estudio pendiente: se retoma con un enlace secundario. El simulacro
  activo mantiene prioridad porque su reloj continúa, pero también permite ir al
  estudio. Las recomendaciones de práctica o repaso nunca ocultan el acceso al estudio.
- Estudio por secciones, reanudación exacta y marcado explícito de módulo completado.
  Completar una lectura no marca dominio de conocimientos.
- Lectura primero: se oculta la ruta superior al leer y el título, los datos y las
  secciones del módulo quedan plegados en **Módulo e índice**. El botón de enfoque
  está dentro de la tarjeta, junto al reproductor compacto. El progreso queda
  debajo del texto.
- Diseño compacto en portada, ruta, práctica, resultados, estadísticas, fuentes y
  configuración. La ruta muestra al menos siete módulos completos en 1920×1080;
  las explicaciones sobre el orden y la metodología se despliegan cuando hacen
  falta. Se reduce espacio decorativo, no el tamaño del texto de las lecciones.
- Tres capturas de Microsoft Learn en columnas de prompt y reglas de negocio,
  con explicación breve, texto alternativo, fuente y ampliación en otra pestaña.
  Se guardan localmente, sin modificar ni generar interfaces con IA.
- **Modo enfoque** dentro de cada lección: oculta navegación, índice y referencias
  para dejar la sección actual, el progreso y los botones para avanzar. Se sale
  con el botón siempre visible **Salir del modo enfoque** o con **Esc**. Cambiar
  de vista no modifica el punto de lectura; el modo no se conserva al recargar.
- **Lectura en voz alta** de la sección actual: reproducir, pausar/reanudar, detener
  y velocidades 1x, 1,25x y 1,5x en una barra compacta, también en modo enfoque.
  Las velocidades son opciones visibles de un clic, sin lista desplegable.
  Reproducir y pausar comparten botón; el icono de información despliega los detalles
  de la voz, sin ocupar espacio de lectura de forma permanente. Usa solo voces españolas
  que el navegador identifica como locales, sin servicios externos. Si no hay una,
  muestra cómo habilitarla en el sistema. Cambiar la velocidad reinicia la sección
  con el nuevo ritmo; avanzar o salir detiene la lectura. La velocidad es temporal.
- Práctica configurable: nuevas, última respuesta incorrecta, difíciles o falladas,
  repasos vencidos o todo el banco; filtro por módulo.
- Orden fijo del temario, aleatorio, dificultad descendente o vencimiento.
- Simulacro local cronometrado, respuestas definitivas y sin feedback hasta acabar.
  El tiempo continúa al cerrar la página y se aplica también en el servidor.
  Se puede finalizar antes: las no contestadas cuentan en el denominador.
- Historial de sesiones y estadísticas globales, por área y pregunta:
  aciertos, intentos, última dificultad, dificultad media y próximo repaso.
- Temas **sistema, oscuro y claro**, guardados en SQLite.
- **GH-300 (GitHub Copilot)** y **AB-100 (Agentic AI Business Solutions Architect
  Expert)** guardadas como certificaciones de interés en Configuración. Al
  seleccionarlas se avisa de que aún no tienen material; no cambian la certificación
  activa ni su progreso. Son recordatorios, sin lecciones, preguntas, generación
  automática ni fecha programada. Solo AB-410 está disponible para estudiar.
- Exportación JSON del progreso; no incluye importador JSON en esta versión.

No se ejecutan modelos de IA ni se envían respuestas a terceros. Los laboratorios
de Power Platform requieren tu propio entorno y sus permisos/licencias.
No se incluyen preguntas múltiples, drag-and-drop ni todos los formatos del examen.

## Tutorial con voz y vídeo editable

El guion, los textos y el diseño están en **`tutorial/index.html`**. Se puede abrir
directamente en el navegador o, con `npm run dev`, en
**http://127.0.0.1:4100/tutorial/index.html**. Tiene narración en español, capítulos,
pausa y navegación manual. Las capturas usan datos de demostración, no tu progreso.

Para generar el MP4 de 1080p se requieren macOS, una voz española local (`Paulina`
por defecto), `ffmpeg`, `ffprobe` y Chromium de Playwright:

```bash
npx playwright install chromium  # solo la primera vez
npm run tutorial:capture        # primera vez o si cambia la interfaz
npm run tutorial:video          # tutorial/certifica-guia.mp4
```

Para modificar una explicación, edita su `narration` en el bloque `tutorial-data`
del HTML y ejecuta `npm run tutorial:video`. Se reutilizan las voces, imágenes y
clips sin cambios: **solo se regeneran las escenas afectadas** y se vuelve a unir
el MP4. Los cambios de estilo comunes sí afectan a todas las escenas. Mantén
`tutorial/.cache/` para aprovechar esa reutilización. Los audios del reproductor
HTML quedan en `tutorial/generated/`; conserva también `tutorial/assets/`.

Se puede recapturar una sola pantalla con
`npm run tutorial:capture -- 04-responder`. Ese proceso levanta y cierra su propia
instancia temporal en loopback con SQLite **en memoria**, sin tocar la base real.
La voz y la velocidad pueden cambiarse con `TUTORIAL_VOICE` y `TUTORIAL_RATE`
(palabras por minuto, de 80 a 250). No se usan servicios externos de síntesis.

## Fuentes y límites

Fecha de consulta inicial: **2026-11-16**. Fuente de alcance:
[guía oficial AB-410](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ab-410).

| Área oficial | Peso |
| --- | --- |
| Create a foundation for intelligent applications | 25–30% |
| Create intelligent applications | 25–30% |
| Build business application logic and automation | 40–45% |

El simulacro de 40 preguntas selecciona **11 / 11 / 18** (27,5 / 27,5 / 45%).
Los simulacros pequeños aproximan esos pesos mediante restos mayores; el redondeo
puede quedar fuera de las bandas. Esto no reproduce el algoritmo oficial de examen.
El máximo inicial es 40 para preservar esa distribución con el banco disponible.

Las referencias exactas, fecha, carácter oficial/comunitario y correspondencia con
lecciones están en `content/ab410.mjs` y en **Biblioteca de fuentes**. Se consultó
Microsoft Learn y, como apoyo no oficial para canvas, la guía de estándares de
Matthew Devaney. La comunidad no es evidencia del contenido real del examen.

**Todas las preguntas de esta aplicación son originales y no oficiales**, incluso
si sus conceptos están respaldados por documentación oficial. No se copiaron
preguntas reales, dumps, ExamTopics ni el banco de evaluación de Microsoft.
No se garantizan preguntas que aparecerán en tu evaluación.

La [evaluación oficial en AI Skills Navigator](https://aiskillsnavigator.microsoft.com/en-us/credentials/cert-5098c91b4878b505ac66f8840d07c1105e8ad172e3bf8f76ce0a8ccb1234e85f)
se abre desde el enlace validado del catálogo en la aplicación. Requiere iniciar
sesión en Microsoft; no se extrae su contenido y sus resultados no se sincronizan.
La nota local porcentual **no equivale** a la puntuación escalada de Microsoft
ni permite afirmar que un 70% local sea el umbral oficial de aprobado.

Los nombres AI Hub/AI Builder y las experiencias de Copilot evolucionan. Se
priorizan conceptos y se señalan despliegues progresivos; verifica documentación
vigente antes de rendir. No se memorizan precios, límites o rutas de UI sin revisión.

## Datos y copias

Base predeterminada: **`data/progress.sqlite`** (ignorada por Git).
Tablas:

| Tabla | Contenido |
| --- | --- |
| `settings` | Certificación activa y tema |
| `study` | Certificación, módulo, sección, completado y fecha |
| `sessions` | Modo, orden materializado de preguntas, cursor, plazo y estado |
| `attempts` | Pregunta, respuesta elegida, acierto, dificultad 1–3, tiempo y fecha |

Cada sesión guarda una **instantánea versionada** de sus preguntas: una actualización
del contenido no altera la corrección de un intento histórico. Las respuestas son
inmutables tras confirmarse; cada nuevo intento se hace en otra sesión.
Una sesión activa por modo y certificación evita sobrescribir la anterior.
Las respuestas de un simulacro activo no se incluyen en estadísticas hasta finalizar.

Para una copia **restaurable**, detén el servidor limpiamente y copia el archivo
SQLite. Para restaurar, con el servidor detenido coloca la copia en el mismo
`DB_PATH`. No copies solo el archivo principal mientras el servidor escribe: SQLite
usa WAL y puede tener archivos `-wal` y `-shm` asociados.

La exportación JSON contiene el historial y snapshots completos (incluidas claves
de respuesta); es para portabilidad/inspección, no un mecanismo de examen supervisado.
No borres `data/` si quieres conservar tu avance.

## Método adaptativo

Después de cada respuesta:

- Incorrecta o valorada difícil: caja 0, vuelve en **10 minutos**.
- Correcta/media: caja 1 como máximo, vuelve al **día siguiente**.
- Correcta/fácil: avanza una caja: **1, 3, 7, 14 y 30 días**.

Prioridad descendente:
`(1 - aciertos/intentos) × 60 + última_dificultad × 20 + (última_incorrecta ? 30 : 0)`.
Las nuevas tienen prioridad 0; los empates mantienen el orden del banco.
«Difíciles o falladas» usa la última dificultad o último resultado, no cualquier
error remoto ya superado. El histórico completo sigue visible por sesión y en SQLite.
Los repasos vencidos solo incluyen preguntas ya vistas; las nuevas tienen su filtro.
Es una heurística transparente tipo Leitner, no FSRS ni un modelo clínicamente
validado de memoria. El tiempo mide la permanencia desde cargar la pregunta hasta
confirmar; no detecta distracciones y se reinicia al recargar.

## Estructura y ampliación

```text
content/      Catálogo, lecciones, preguntas y fuentes versionadas
server/       API Express, SQLite y selección/repaso
src/          Interfaz React + TypeScript
tests/        Pruebas API, persistencia, contenido y selección
```

Consulta **[AGENTS.md](AGENTS.md)** para la metodología editorial, criterios de
calidad y pasos para añadir otra certificación, por ejemplo AB-100. No se «entrena»
un modelo con tu información: se conserva una metodología explícita y versionada,
y el algoritmo ajusta tu repaso con datos locales.

Repositorio Git inicializado localmente; no hay remoto ni publicación automática.

## Registro editorial

- **2026-11-18 · contenido 2026-11-18.3:** cada diapositiva muestra un foco
  visible en una lista breve con uno a tres conceptos o resultados concretos que
  anticipan qué trabajar. Las respuestas orientativas también usan viñetas para
  separar las ideas. Se asignaron a las 73 diapositivas sin reemplazar sus
  explicaciones ni ejercicios. Se actualizan las doce versiones de lección; se
  conservan IDs, orden de secciones y progreso.
- **2026-11-18 · contenido 2026-11-18.2:** la ayuda de «Recuperación activa»
  ahora muestra una respuesta orientativa concreta para cada ejercicio, en vez
  de la instrucción genérica de revisar el temario. Se aclaró el escenario del
  agente para distinguir la política consultada, las herramientas, la condición
  de cancelación, la confirmación y la comprobación de permisos en el servicio.
  El botón indica que abre una respuesta explicada; se conservan los IDs, las
  secciones y el progreso, y se actualizan las versiones de las doce lecciones.
- **2026-11-18 · contenido 2026-11-18.1:** añadidos ejemplos breves y originales
  en explicaciones que se beneficiaban de una situación concreta: vistas y
  formularios; asincronía y resúmenes; páginas generativas y permisos; delegación,
  fórmulas con nombre y errores; agentes y seguridad; manejo de errores y
  diagnóstico de flujos; evaluación de prompts; integración de IA; límites de
  columnas y procesos. No se añadieron ejemplos por rutina donde ya había uno,
  ni se alteraron recuperación activa, laboratorios, preguntas, IDs o referencias.
  Versiones de lección actualizadas conservando su identidad e historial.
- **2026-11-16 · contenido 2026-11-16.8:** identificado Agent builder de Power
  Apps y aclarado que su creación desde aplicaciones de lienzo no limita las
  otras formas de crear agentes en Copilot Studio. Introducido el nombre completo
  «aplicación de lienzo de Power Apps (canvas app)» y aclarado el título del módulo
  de canvas. Versiones `agents` 7 y `canvas` 4; IDs y progreso sin cambios.
- **2026-11-16 · contenido 2026-11-16.7:** segunda revisión pedagógica de fondo.
  Se reescribieron los bloques de concepto que seguían siendo listas de
  imperativos o definiciones con «=» (abstractos pese a pasadas previas), en
  diez lecciones: `architecture`, `dataverse`, `model-apps`, `canvas`, `flows`,
  `reliability`, `prompts`, `ai-integration`, `columns` y `process`. Cada término
  clave se define ahora con qué es, cómo se usa o un ejemplo, y por qué elegirlo
  frente a su alternativa, separando definición, ejemplo y recomendación con
  **negrita** y saltos. Se añadió el dato concreto del **Data row limit** de
  delegación (500 por defecto, ampliable hasta 10 000) y los nombres reales de
  los tipos de aprobación, contrastados hoy con Microsoft Learn (delegación y
  aprobaciones). Se conserva la fuente `delegation` y se añaden `approval-actions`
  y `approval-types` a la lección de aprobaciones para enlazar el respaldo específico.
  No se tocaron `agents` (reescrita recientemente), `ai-data` ni las capturas.
  Se conservan IDs, número y orden de secciones, rutas y preguntas; cada lección
  modificada sube de versión (prompts e integración a 4; el resto a 3).
- **2026-11-16 · contenido 2026-11-16.6:** sustituida la referencia vaga a
  «la guía» por una explicación de Agent builder: qué genera, dónde iniciarlo,
  recorrido, ejemplo y límites. Se distingue crear un agente de insertar un chat.
  Guía de aptitudes y documentación de Agent builder consultadas hoy; añadida
  la fuente oficial a la lección. Lección `agents` versión 6; conserva su ID,
  número y orden de secciones, preguntas y avance.
- **2026-11-16 · contenido 2026-11-16.5:** aclarado en «Temas y orquestación»
  que clásica y generativa son modos de orquestación del agente, no tipos de tema.
  Contrastado con Microsoft Learn. Lección `agents` versión 5; sin cambios en
  IDs, secciones, preguntas ni progreso.
- **2026-11-16 · contenido 2026-11-16.4:** revisadas las doce lecciones para
  aclarar explicaciones abstractas con definiciones, ejemplos y recomendaciones
  diferenciadas. Incluye la ubicación del editor de temas, ALM, permisos,
  asincronía, conexiones, reintentos y elección de columnas. Se conservan IDs,
  orden de secciones, preguntas y avance; se incrementa la versión de cada
  lección modificada. Se mantiene la revisión de fuentes anterior, salvo las
  páginas de temas, orquestación, creación de prompts, columnas de prompt, rollup
  y reglas de negocio, consultadas de nuevo hoy. Añadidas tres capturas originales
  de la documentación, contrastadas visualmente y byte a byte con Microsoft Learn.
  Proceden de `MicrosoftDocs/powerapps-docs`, bajo
  [CC BY 4.0](https://github.com/MicrosoftDocs/powerapps-docs/blob/main/LICENSE):
  `prompt-input-columns.png`, `prompt-status.png` y `business-rule-condition.png`
  en `public/study-media/ab410/`. Autoría Microsoft, sin cambios. Las URL originales,
  licencia y fecha de consulta quedan en los metadatos de cada imagen.
- **2026-11-16 · contenido 2026-11-16.3:** definidos y destacados «tema (topic)»
  y «orquestación», con ejemplo y ubicación del editor. Se sustituye «experiencias
  compatibles» por un alcance concreto y se añaden las dos referencias oficiales
  consultadas sobre temas y orquestación. La lección de agentes pasa a versión 3,
  conservando su ID y el orden de las secciones.
- **2026-11-16 · contenido 2026-11-16.2:** aclaradas cinco secciones de agentes,
  prompts e integración para distinguir explicaciones, recomendaciones y ejemplos
  de instrucciones para la IA. Las tres lecciones pasan a versión 2; se mantienen
  IDs, ejercicios y preguntas, sin alterar el progreso ni las sesiones históricas.
  Es una revisión de redacción, no una nueva consulta de las fuentes.
