# Certifica

Web local para preparar **certificaciones de Microsoft** en español: lecciones
condensadas, preguntas originales con explicación, repaso espaciado y simulacros
cronometrados. Sin cuenta, suscripción ni claves de IA.

| Código | Certificación | Estado |
| --- | --- | --- |
| **AB-410** | Microsoft Certified: Intelligent Applications Builder Associate | Disponible: 12 módulos y 60 preguntas |
| GH-300 | GitHub Copilot | De interés, aún sin material |
| AB-100 | Agentic AI Business Solutions Architect Expert | De interés, aún sin material |

> Proyecto personal de estudio, **no afiliado, patrocinado ni respaldado por
> Microsoft**. Los nombres de productos y certificaciones son marcas de Microsoft y
> se usan solo para identificar los exámenes y su documentación.

## Arrancar

Requiere **Node.js 24 o superior** y Git. Los comandos están pensados para
**PowerShell** (incluido en Windows; en macOS o Linux, PowerShell 7 `pwsh`).

```powershell
git clone https://github.com/coviedo194/certifica.git
cd certifica
npm install
npm run start
```

Abre **http://127.0.0.1:4100** en el navegador. Para detener el servidor, pulsa
`Ctrl+C` en la terminal. Para desarrollar con recarga automática, usa `npm run dev`.

Opcional: otro puerto u otra base de datos.

```powershell
$env:PORT = '4200'; $env:DB_PATH = './data/otro-progreso.sqlite'; npm run start
```

Por defecto solo se accede desde el propio equipo. Para usarla desde otros
dispositivos de tu red, en Windows ejecuta `start-app.ps1`. No hay autenticación:
hazlo solo en una red de confianza y nunca lo publiques en Internet.

## Qué ofrece

- **Estudio** por módulos con recuperación activa, laboratorios, modo enfoque y
  lectura en voz alta con voces locales del navegador.
- **Práctica** configurable (nuevas, falladas, difíciles o repasos vencidos), con
  las opciones en orden aleatorio y explicación de cada alternativa tras responder.
- **Repaso espaciado**: las preguntas falladas o difíciles vuelven antes; las fáciles,
  cada vez más tarde.
- **Simulacro** cronometrado, sin feedback hasta terminar, con preguntas repartidas
  según el peso oficial de cada área.
- **Estadísticas** por área y pregunta, temas claro/oscuro y exportación JSON.

Todas las preguntas son **originales y no oficiales**: no proceden de dumps ni de
exámenes reales, y no garantizan lo que aparecerá en el examen. El porcentaje local
no equivale a la puntuación escalada (700) de Microsoft.

## Cómo funciona

- **Tecnología**: React + TypeScript + Vite, servidor Express y `node:sqlite`.
  Un solo proceso y un puerto.
- **Tus datos**: todo se guarda en `data/progress.sqlite`, en tu equipo y fuera de
  Git. No se envía nada a terceros ni se ejecutan modelos de IA.
- **Copia de seguridad**: detén el servidor y copia `data/progress.sqlite` (con sus
  archivos `-wal` y `-shm` si existen). Para restaurar, vuelve a colocarlo con el
  servidor detenido.
- **Contenido**: cada certificación es un módulo en `content/` con lecciones,
  preguntas y fuentes de Microsoft Learn. El progreso se separa por certificación.

```text
content/   Certificaciones: lecciones, preguntas y fuentes
server/    API, SQLite y lógica de repaso
src/       Interfaz
tests/     Pruebas (npm test)
tutorial/  Guía narrada de uso de la aplicación
```

La metodología editorial, las reglas de datos y cómo añadir una certificación están
en [AGENTS.md](AGENTS.md). Los cambios de contenido, en [CHANGELOG.md](CHANGELOG.md).

## Licencia

Código y material original bajo [licencia MIT](LICENSE). Se excluyen las tres
capturas de `public/study-media/ab410/` (`prompt-input-columns.png`,
`prompt-status.png`, `business-rule-condition.png`): son obra de Microsoft,
proceden de `MicrosoftDocs/powerapps-docs` y se distribuyen sin cambios bajo
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), con su atribución en
los metadatos de cada imagen.
