# Guía de mantenimiento de Certifica

## Propósito y límites

Aplicación local, monousuario, sin autenticación: React + TypeScript + Vite,
Express en Node.js 24 y `node:sqlite`. Una terminal y un puerto. No convertirla en
Power App ni incorporar servicios de IA, telemetría o dependencias de nube sin
petición explícita. Servir por defecto en loopback; la red local solo con `HOST`
explícito (`start-app.ps1`), sin quitar la validación de Host/Origin ni habilitar CORS.

El usuario tiene experiencia en Power Platform y menos en Copilot Studio; la ruta
recomendada prioriza esas brechas. No inferir dominio ni inventar intentos. UI y
material en español, conservando la terminología de producto para reconocer el
examen y encontrar documentación. El README es breve y para usuarios: los detalles
de mantenimiento van aquí y los cambios de contenido en `CHANGELOG.md`.

## Comandos

Documentar comandos en sintaxis de PowerShell (Windows y `pwsh` en macOS).

```powershell
npm install
npm run dev       # API + Vite en http://127.0.0.1:4100
npm run start     # prestart compila; luego sirve API + dist
npm run build
npm test
npm run test:ui   # portada en navegador, SQLite en memoria; requiere Chromium de Playwright
```

`PORT`, `DB_PATH` y `HOST` son opcionales. No ejecutar `dev` y `start` a la vez en
el mismo puerto; no se terminan otros procesos. En pruebas, nunca sobrescribir ni
borrar el SQLite del usuario: usar memoria o un directorio temporal explícito. No
guardar datos personales, sesiones reales ni archivos SQLite en Git.

**Tutorial** (`tutorial/index.html`, abrible directamente o en `/tutorial/index.html`):
`npm run tutorial:capture [-- <escena>]` recaptura pantallas con una instancia
temporal en loopback y SQLite en memoria; `npm run tutorial:video` genera el MP4
(requiere macOS, voz española local —`Paulina` por defecto—, `ffmpeg`, `ffprobe` y
Chromium de Playwright). Editar la `narration` del bloque `tutorial-data` regenera
solo las escenas afectadas; conservar `tutorial/.cache/`, `tutorial/generated/` y
`tutorial/assets/`. `TUTORIAL_VOICE` y `TUTORIAL_RATE` (80–250 ppm) son opcionales.

## Método editorial

1. **Verificar alcance**: leer la página de certificación y la guía de aptitudes
   vigentes; registrar URL, fecha real de consulta y versión del paquete. No adivinar
   contenidos por el código de examen ni por etiquetas de productos.
2. **Mapear objetivos**: dominio → aptitud → lección → preguntas, con pesos oficiales.
   Distinguir prerrequisitos de objetivos medidos y registrar huecos en vez de
   anunciar cobertura inexistente.
3. **Contrastar fuentes**: Microsoft Learn primero, sobre todo en capacidades nuevas,
   límites y seguridad. La comunidad aporta perspectivas, nunca prueba que algo
   «cae en el examen». Marcar oficial/no oficial y no inventar fechas de consulta.
   Si dos fuentes oficiales se contradicen, señalarlo y no basar preguntas en ello.
4. **Condensar** (ver «Redacción de lecciones»): explicar qué elegir, por qué y cuándo
   no. Cada módulo tiene decisiones clave, comparación, error frecuente, recuperación
   activa y laboratorio con criterio de éxito. Los minutos son de lectura estimada.
5. **Crear preguntas originales**: escenarios nuevos, una única mejor respuesta y
   distractores plausibles. Explicar cada alternativa; indicar objetivo, módulo,
   fuentes, procedencia `original` y versión. Las fuentes respaldan conceptos, no la
   autoría ni el carácter oficial de la pregunta.
6. **No usar dumps**: no copiar ni parafrasear preguntas reales, filtraciones,
   ExamTopics ni evaluaciones oficiales. «No oficial» no concede derechos. Enlazar la
   evaluación oficial y mantener sus resultados separados.
7. **Verificar**: contrastar contratos y límites en su fuente; una sola opción
   defendible por pregunta; sin absolutos, pistas por longitud, distractores absurdos
   ni repetición. El banco es introductorio: ampliarlo con casos más discriminantes,
   sin prometer equivalencia con el examen.
8. **Versionar**: IDs estables y `version` por lección/pregunta más versión global.
   No reutilizar IDs ni romper referencias históricas. Registrar cambios editoriales
   significativos en `CHANGELOG.md` con fecha de revisión.

Es una metodología reproducible, **no entrenamiento de un modelo**. No enviar datos
del alumno a terceros ni generar contenido automático sin validación.

### Redacción de lecciones

- Una idea por párrafo: primero definición, después ejemplo y, aparte, la
  recomendación (etiquetada como tal). Destacar con `**negrita**` el término definido.
- Un bloque de concepto no es una lista de imperativos ni definiciones con «=»:
  cada término dice qué es, cómo se usa o un ejemplo, por qué elegirlo frente a su
  alternativa y sus límites.
- Aclarar jerga al introducirla (asíncrono, determinista, idempotencia, alcance).
  Mantener nombres de producto y controles, explicando qué hacen. Sustituir
  expresiones vagas («experiencias compatibles») por el producto o alcance concreto.
- Decir «aplicación de lienzo de Power Apps (canvas app)» antes de abreviar a
  «canvas». Especificar «Agent builder de Power Apps» y no extender sus límites a
  Copilot Studio ni a otras funciones con el mismo nombre.
- Ejemplos breves y originales solo cuando aclaran una decisión; no forzarlos ni
  presentarlos como preguntas oficiales.
- Advertencias junto al caso afectado, sin quitar limitaciones importantes. No
  sobreexplicar ni desviarse a otros productos que no cambian la decisión.
- No sustituir la enseñanza por «la guía incluye»: explicar la capacidad con un
  ejemplo o recorrido verificado e identificar la guía si se cita.
- Cada diapositiva muestra en lista de uno a tres conceptos concretos, distintos del
  título y coherentes con su contenido. La respuesta orientativa de cada recuperación
  activa explica una respuesta posible y por qué, en viñetas.
- Imágenes: preferir capturas reales de documentación con permiso verificable,
  copia local, texto alternativo, ampliación y metadatos de fuente, autoría,
  licencia y fecha. No inventar interfaces ni presentar capturas antiguas como UI
  garantizada.

## Añadir una certificación (por ejemplo AB-100)

- Verificar existencia, nombre y guía vigente; no crear entradas vacías.
- Los recordatorios van solo como metadatos en `certificationInterests` de
  `content/index.mjs`: al seleccionarlos se avisa de que no tienen material, sin
  activar cursos vacíos. GH-300 y AB-100 quedan pendientes hasta petición explícita.
- Crear `content/<codigo>.mjs` siguiendo `ab410.mjs` (metadatos, dominios con
  `share` que sumen 1, referencias, lecciones, ruta y preguntas) y registrarlo en
  `content/index.mjs`. No codificar datos de AB-410 en la lógica de selección.
- Antes del segundo paquete, convertir en metadatos por certificación los textos
  propios de AB-410 (ruta inicial, bienvenida, «Punto de partida», método en
  Fuentes) y el límite de 40 preguntas del simulacro, actualizando texto y pruebas.
- Añadir la fila a la tabla del README y validar: independencia del progreso,
  cuota de dominios, referencias y sesiones congeladas.

## AB-410: alcance actual

- Guía: <https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ab-410>,
  consultada el 2026-11-16. 12 módulos (103 min de lectura) y 60 preguntas.
- Áreas: foundation 25–30 %, intelligent applications 25–30 %, business logic and
  automation 40–45 %. El simulacro de 40 toma 11/11/18; los más pequeños usan restos
  mayores y pueden salir de las bandas. No reproduce el algoritmo oficial.
- Fuente comunitaria usada: estándares de canvas de Matthew Devaney (no oficial).
- La evaluación oficial (AI Skills Navigator) se enlaza desde el catálogo; requiere
  sesión de Microsoft, no se extrae ni se sincroniza.
- Las tres capturas de `public/study-media/ab410/` son de `MicrosoftDocs/powerapps-docs`
  (CC BY 4.0), sin cambios, con atribución en sus metadatos y excluidas de MIT.
- AI Hub/AI Builder y Copilot cambian de nombre y despliegue: priorizar conceptos y
  no memorizar precios, límites o rutas de UI sin revisión.

## Datos y comportamiento

- SQLite es la fuente de verdad (`data/progress.sqlite`): `settings` (certificación
  activa, tema), `study` (módulo, sección, completado), `sessions` (modo, orden
  materializado, cursor, plazo, estado) y `attempts` (respuesta, acierto, dificultad
  1–3, tiempo). No sustituirlo por localStorage para el progreso.
- Guardar la dificultad **antes de conocer el resultado**. Los intentos confirmados
  son inmutables; un reintento de la misma petición no duplica filas y una respuesta
  distinta en el mismo intento se rechaza. Una sesión activa por modo y certificación.
- Cada sesión guarda una instantánea versionada de sus preguntas: nunca recalificar
  históricos ni eliminar en silencio referencias usadas.
- Simulacro: no revelar claves, explicaciones ni estadísticas antes de terminar. El
  plazo se valida en el servidor y no se reinicia al recargar; las no contestadas
  cuentan en el total. La exportación JSON incluye claves y no es un examen supervisado.
- No confundir el porcentaje local con el umbral escalado 700 de Microsoft.
- Repaso tipo Leitner: incorrecta o difícil → caja 0, vuelve en 10 min; correcta y
  media → caja 1 como máximo, al día siguiente; correcta y fácil → avanza (1, 3, 7, 14
  y 30 días). «Difíciles o falladas» usa la última respuesta; los vencidos solo
  incluyen preguntas vistas. El tiempo va de cargar a confirmar y se reinicia al recargar.
- Órdenes: fijo determinista; aleatorio con Fisher–Yates; mayor dificultad con
  `(1 - aciertos/intentos) × 60 + última_dificultad × 20 + (última_incorrecta ? 30 : 0)`,
  nuevas con prioridad 0 y empates en orden del banco.
- Errores visibles: no inventar éxitos, estadísticas, materiales ni datos de respaldo.
- Migraciones que conserven datos con `PRAGMA user_version`, rechazando versiones
  más nuevas. No cambiar el esquema sin migración.
- Copias: con el servidor detenido, copiar el SQLite junto con `-wal`/`-shm`.

## Interfaz

- Portada con una acción principal (empezar, retomar, practicar lo leído, repasar).
  El simulacro activo tiene prioridad porque su reloj sigue, pero nunca se oculta el
  acceso al estudio. Completar una lectura no marca dominio.
- Lectura primero: al estudiar se oculta la ruta y el módulo e índice quedan plegados.
  **Modo enfoque** deja sección, progreso y avance; se sale con botón visible o `Esc`,
  no altera el punto de lectura ni persiste al recargar.
- **Lectura en voz alta** solo con voces españolas locales del navegador; un botón
  reproducir/pausar y velocidades 1x, 1,25x y 1,5x de un clic. Cambiar velocidad
  reinicia la sección; avanzar o salir detiene. Si no hay voz, explicar cómo activarla.
- Priorizar contenido sobre cabeceras decorativas, sin reducir la letra de lectura.
  El enfoque aprovecha hasta 1480 px, se ajusta en móvil y evita scroll horizontal.
  En 1920×1080, la ruta empieza antes de 260 px y muestra al menos siete módulos.

## Validación de cambios

`npm test` y `npm run build`. Probar persistencia tras cerrar/abrir SQLite, validación
de entrada, exclusión de respuestas activas del simulacro y fin de sesión. Si cambia
la UI, comprobar en navegador con un SQLite separado: práctica → respuesta +
dificultad → feedback → siguiente → reanudar → finalizar; simulacro sin feedback;
estudio reanudable; estadísticas; los tres temas; 1920×1080, portátil y móvil en
ambas orientaciones. No añadir infraestructura solo por cobertura.
