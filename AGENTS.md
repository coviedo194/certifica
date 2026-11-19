# Guía de mantenimiento de Certifica

## Propósito y límites

Aplicación local, monousuario, sin autenticación: React + TypeScript + Vite,
Express en Node.js 24 y `node:sqlite`. Una terminal y un puerto. No convertirla en
Power App, no incorporar servicios de IA, telemetría ni dependencias de nube sin
una petición explícita. Servir por defecto en loopback; la red local solo con `HOST` explícito
(`start-app.ps1`), sin quitar la validación de Host/Origin.

El usuario tiene experiencia en Power Platform y menos en Copilot Studio.
La ruta recomendada prioriza esas brechas; no inferir dominio ni inventar intentos.
UI y material en español; conservar terminología de producto para reconocer el
examen y encontrar documentación.

## Comandos

```powershell
npm install
npm run dev       # API + Vite en http://127.0.0.1:4100
npm run start     # prestart compila; luego sirve API + dist
npm run build
npm test
```

`PORT` y `DB_PATH` son opcionales. No sobrescribir ni borrar el SQLite del usuario
en pruebas: usar memoria o un directorio temporal explícito. No guardar datos
personales, sesiones reales ni archivos de SQLite en Git.

## Método editorial repetible

1. **Verificar alcance**: leer la página de certificación y la guía de aptitudes
   actuales. Registrar URL, fecha real de consulta y versión del paquete. No
   adivinar contenidos por el código de examen ni por etiquetas de productos.
2. **Mapear objetivos**: dominio → aptitud → lección → preguntas. Conservar pesos
   oficiales y distinguir prerrequisitos de objetivos medidos. Cubrir cada objetivo
   con contenido y registrar huecos en vez de anunciar cobertura inexistente.
3. **Contrastar fuentes**: Microsoft Learn primero, especialmente capacidades nuevas,
   límites y seguridad. La comunidad puede aportar perspectivas, nunca demostrar
   que algo «cae en el examen». Identificar fuente oficial o no oficial; no inventar
   fecha de consulta. Si dos secciones oficiales se contradicen, señalarlo y evitar
   una pregunta que dependa de la ambigüedad hasta resolverla.
4. **Condensar**: explicar qué elegir, por qué y cuándo no. Un módulo contiene
   decisiones clave, comparación, error frecuente, recuperación activa y laboratorio
   con criterio de éxito. No copiar capítulos ni hacer un resumen tan corto que
   obligue a memorizar una respuesta sin entenderla. Los minutos son estimados
   de lectura; no incluyen laboratorio, repaso o experiencia práctica.
   Distinguir explicaciones, recomendaciones de diseño y ejercicios. Etiquetar
   los consejos como recomendaciones y aclarar la jerga antes de usarla.
   Introducir «aplicación de lienzo de Power Apps (canvas app)» antes de abreviar
   a «canvas»; no asumir que identifica el producto por sí solo. Especificar
   «Agent builder de Power Apps» y no extender sus límites a Copilot Studio
   ni a otras funciones que compartan el nombre Agent builder.
   Destacar con `**negrita**` el término que se define y separar definición,
   ejemplo y recomendación cuando se mezclen. Sustituir expresiones vagas como
   «experiencias compatibles» por el producto, editor o alcance concreto.
   Añadir un ejemplo breve y original cuando una explicación abstracta se entienda
   mejor con una situación concreta; usarlo para aclarar la decisión o el resultado,
   no para repetir el laboratorio o la recuperación activa. No forzar ejemplos en
   cada bloque ni presentarlos como preguntas o material oficial del examen.
   La ayuda de cada recuperación activa debe explicar una respuesta posible para ese
   caso y por qué; no sustituirla por una invitación genérica a revisar el temario.
   Cada diapositiva debe mostrar entre uno y tres conceptos o resultados de
   aprendizaje concretos, distintos del título y coherentes con su explicación,
   repaso o laboratorio, en una lista breve. La respuesta orientativa de cada
   recuperación activa también debe separar las ideas en viñetas.
   Revisar también el resto del material cuando una explicación cause confusión:
   una idea por párrafo, primero definición y después ejemplo. Aclarar términos
   como asíncrono, determinista, idempotencia o alcance al introducirlos. Mantener
   los nombres de producto/controles, pero explicar qué hacen. Colocar las
   advertencias junto al caso al que afectan, sin sustituir la explicación por
   cautelas abstractas ni quitar limitaciones importantes para simplificar.
   No sobreexplicar: eliminar incisos que desvíen a otros productos o asuntos
   cuando no cambien la decisión que se está enseñando. Una ubicación de menú
   no necesita una explicación adicional sobre dónde puede mostrarse el chat.
   No sustituir la enseñanza por «la guía incluye»: explicar la capacidad y un
   ejemplo o recorrido verificado. Identificar la guía de aptitudes si se cita;
   no dar a entender que existe un tutorial que el material no ofrece.
   Un bloque de concepto no es una lista de imperativos ni de definiciones con
   «=» o comas encadenadas: cada término clave se define con qué es, cómo se usa
   o un ejemplo, y por qué elegirlo frente a su alternativa, con sus límites. Si
   un bloque solo dice qué hacer sin explicar qué es aquello, reescribirlo.
   Para imágenes: preferir capturas reales de documentación con permiso verificable,
   revisar lo que muestran y explicar solo el detalle relevante. Conservar fuente,
   autoría, licencia y fecha; servir copias locales, texto alternativo y ampliación.
   No inventar interfaces con IA ni presentar una captura antigua como UI garantizada.
5. **Crear preguntas originales**: escenarios nuevos, una mejor respuesta y
   distractores plausibles. Explicar cada alternativa, indicar objetivo, módulo,
   fuentes, procedencia `original` y versión. No presentar documentación oficial
   como si validara la autoría o el carácter oficial de nuestra pregunta.
6. **No usar dumps**: no copiar ni parafrasear preguntas reales, filtraciones,
   bancos de ExamTopics o evaluaciones oficiales cerradas. Etiquetar «no oficial»
   no concede derechos de reproducción. Enlazar la evaluación oficial y mantener
   sus resultados separados, salvo integración autorizada y soportada.
7. **Verificar**: revisar contratos y limitaciones en su fuente; probar que cada
   pregunta tiene una sola opción defendible. Evitar absolutos, pistas por longitud,
   distractores absurdos y repetición. Usar material comunitario solo con atribución
   y contraste. El banco inicial es introductorio: ampliarlo con casos de mayor
   discriminación, no prometer equivalencia con el examen.
8. **Versionar**: IDs estables, `version` por lección/pregunta y versión global.
   No reutilizar un ID para otro concepto. Preservar compatibilidad de referencias
   históricas. Registrar cambios editoriales significativos y nueva fecha de revisión.

Esto es una definición reproducible, **no entrenamiento de un modelo**. No enviar
datos del alumno a terceros ni generar contenido automático sin validación.

## Añadir una certificación (por ejemplo AB-100)

- Verificar primero su existencia, nombre y guía vigente. No crear una entrada vacía
  ni simular disponibilidad.
- Los recordatorios de interés pueden registrarse solo con metadatos en
  `certificationInterests` de `content/index.mjs`, fuera de los paquetes disponibles.
  Seleccionarlos debe mostrar que no tienen material, sin activar cursos vacíos
  ni generar contenido. GH-300 y AB-100 quedan pendientes hasta una petición explícita.
- Añadir un módulo `content/<codigo>.mjs` siguiendo `ab410.mjs`: metadatos,
  dominios con `share` que sumen 1, referencias, lecciones, ruta y preguntas.
- Registrar el objeto en `content/index.mjs`; la UI usa el catálogo y el progreso
  se separa por certificación. No codificar datos de AB-410 en la lógica de selección.
- Revisar tamaño y distribución de preguntas del nuevo banco. Los límites actuales
  del formulario y API de simulacro (hasta 40) responden al banco inicial: si cambian,
  derivarlos de metadatos por certificación y actualizar su texto y pruebas juntos.
- La descripción inicial/ruta y varios textos de bienvenida son específicos de la
  experiencia actual AB-410. Hacerlos metadatos por certificación antes de añadir
  el segundo paquete; no dejar mensajes de AB-410 en un estudio de AB-100.
- Ejecutar validación de contenido y añadir casos para independencia del progreso,
  cuota de dominios, referencias y sesiones congeladas.

## Invariantes de datos y comportamiento

- SQLite es la fuente de verdad: preferencias, lectura, sesiones e intentos.
  No sustituirlo por localStorage para el progreso.
- Guardar la dificultad **antes de conocer el resultado**, independiente del acierto.
  No cambiar intentos confirmados. Un reintento de la misma petición no crea filas
  duplicadas; una respuesta distinta en el mismo intento debe rechazarse.
- Mantener snapshots de preguntas por sesión. Nunca recalificar históricos con
  un banco actualizado ni eliminar silenciosamente referencias usadas.
- No revelar claves/explicaciones del simulacro por sus endpoints de preguntas ni
  estadísticas antes de terminar. La exportación local es una copia completa,
  no una interfaz de simulacro; no es una aplicación de examen supervisado.
- La fecha límite se valida en el servidor y no se reinicia al salir/recargar.
  Las no contestadas cuentan en el total al finalizar.
- No confundir el porcentaje local con el umbral escalado 700 de Microsoft.
- El orden fijo es determinista. Mayor dificultad usa la fórmula documentada.
  Aleatorio utiliza Fisher–Yates. Repaso espaciado es una heurística tipo Leitner.
- Los errores deben ser visibles. No inventar éxitos, estadísticas, materiales,
  respuestas o datos de respaldo cuando algo falla.
- Las migraciones deben conservar datos, usar `PRAGMA user_version` y rechazar
  versiones más nuevas no soportadas. No modificar esquema sin migración.
- Probar persistencia tras cerrar/abrir SQLite, validación de entrada, exclusión
  de respuestas activas de examen y las rutas de fin de sesión.

## Validación de cambios

Usar `npm test` y `npm run build`. Si se modifica UI, comprobar en navegador:
práctica → respuesta + dificultad → feedback → siguiente → reanudar → finalizar;
simulacro sin feedback; estudio reanudable; estadísticas; los tres temas y móvil.
Usar un SQLite de prueba separado para no contaminar el progreso del usuario.
No agregar herramientas de infraestructura solo por cobertura. El modo enfoque
debe aprovechar el ancho disponible hasta 1480 px, ajustarse al viewport en móvil
y evitar desplazamiento horizontal.
Priorizar contenido sobre cabeceras decorativas: comprobar 1920×1080
(ancho × alto), portátil y móvil en ambas orientaciones. La primera fila de la
ruta debe empezar antes de 260 px y mostrar al menos siete módulos completos en
1080 px de alto. Mantener el reproductor junto al enfoque, velocidades de un clic
y contexto plegable, sin reducir la letra de lectura para hacer encajar la UI.
