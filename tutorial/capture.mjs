import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer as createViteServer } from 'vite';
import { createApp } from '../server/app.mjs';
import { readStory } from './render.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const assets = join(directory, 'assets');
const { scenes } = readStory();
const selected = new Set(process.argv.slice(2));
for (const id of selected) {
  if (!scenes.some(scene => scene.id === id)) throw new Error(`Escena desconocida: ${id}`);
}
mkdirSync(assets, { recursive: true });
const layoutPath = join(assets, 'layout.js');
const layout = existsSync(layoutPath)
  ? JSON.parse(readFileSync(layoutPath, 'utf8').replace(/^window\.TUTORIAL_LAYOUT\s*=\s*/, '').replace(/;\s*$/, ''))
  : {};
const { app, db } = createApp(':memory:');
const server = createServer(app);
let vite, browser;
try {
  vite = await createViteServer({
    root: resolve(directory, '..'), server: { middlewareMode: true, hmr: { server } }, appType: 'spa',
  });
  app.use(vite.middlewares);
  await new Promise((resolve, reject) => {
    server.once('error', reject); server.listen(0, '127.0.0.1', resolve);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const exact = name => page.getByRole('button', { name, exact: true });
  async function navigate(route, selector) {
    await page.goto(`${base}/#${route}`);
    await page.locator(selector).waitFor();
    await page.evaluate(() => document.fonts.ready);
  }
  async function capture(id, target) {
    if (selected.size && !selected.has(id)) return;
    const box = await target.boundingBox();
    if (!box || box.y >= 800 || box.x >= 1280 || box.y + box.height <= 0) throw new Error(`Foco fuera de pantalla: ${id}`);
    const left = Math.max(4, box.x - 6), top = Math.max(4, box.y - 6);
    layout[id] = {
      left: left / 1280, top: top / 800,
      width: (Math.min(1276, box.x + box.width + 6) - left) / 1280,
      height: (Math.min(796, box.y + box.height + 6) - top) / 800,
    };
    await page.screenshot({ path: join(assets, `${id}.png`) });
    console.log(`Capturada: ${id}`);
  }
  await navigate('home', '.home-primary');
  await capture('01-empezar', page.locator('.home-primary'));
  await exact('Comenzar primera lección').click();
  await page.locator('.reading-card').waitFor();
  await exact('Modo enfoque').click();
  await exact('Siguiente sección').scrollIntoViewIfNeeded();
  await capture('02-estudiar', exact('Siguiente sección'));
  await page.getByRole('button', { name: /Salir del modo enfoque/ }).click();
  await page.getByRole('link', { name: 'Practicar este módulo', exact: true }).click();
  await page.getByLabel('Preguntas por sesión').selectOption('5');
  await exact('Comenzar práctica').scrollIntoViewIfNeeded();
  await capture('03-practicar', exact('Comenzar práctica'));
  await exact('Comenzar práctica').click();
  await page.locator('.question-card').waitFor();
  await page.locator('.option').first().click();
  await exact('Difícil').click();
  await exact('Confirmar respuesta').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 40));
  await capture('04-responder', page.locator('.difficulty-row'));
  await exact('Confirmar respuesta').click();
  await page.locator('.feedback-panel').waitFor();
  await page.locator('.feedback-panel').evaluate(element => element.scrollIntoView({ block: 'start' }));
  await capture('05-entender', page.locator('.feedback-title'));
  await exact('Finalizar sesión ahora').click();
  await exact('Sí, finalizar').click();
  await page.locator('.result-hero').waitFor();
  await navigate('practice/difficult', '.form-grid');
  await page.getByLabel('Orden de las preguntas').selectOption('hardest');
  await page.getByLabel('Preguntas por sesión').selectOption('5');
  await page.locator('.form-grid').scrollIntoViewIfNeeded();
  await capture('06-reforzar', page.locator('.form-grid'));
  await navigate('stats', '.metric-grid');
  await capture('07-progreso', page.locator('.metric-grid'));
  await navigate('practice', '.mode-grid');
  await page.getByRole('button', { name: /Simulacro de examen/ }).click();
  await page.getByLabel('Número de preguntas').selectOption('10');
  await page.getByLabel('Tiempo de entrenamiento').selectOption('15');
  await exact('Comenzar simulacro').click();
  await page.locator('.timer').waitFor();
  await capture('08-simulacro', page.locator('.timer'));
  await exact('Finalizar sesión ahora').click();
  await exact('Sí, finalizar').click();
  await page.locator('.result-hero').waitFor();
  await navigate('practice', '.form-grid');
  await page.getByLabel('Preguntas por sesión').selectOption('5');
  await exact('Comenzar práctica').click();
  await page.locator('.question-card').waitFor();
  await page.getByRole('link', { name: 'Pausar y salir', exact: true }).click();
  await navigate('home', '.home-primary');
  const resumePractice = page.getByRole('link', { name: 'Retomar práctica guardada', exact: true });
  await resumePractice.waitFor();
  await capture('09-retomar', resumePractice);
  if (errors.length) throw new Error(errors.join('\n'));
  writeFileSync(layoutPath, `window.TUTORIAL_LAYOUT=${JSON.stringify(layout, null, 2)};\n`);
  console.log('Capturas listas. Solo se usó una base SQLite de demostración en memoria.');
} finally {
  await browser?.close();
  await vite?.close();
  if (server.listening) await new Promise(resolve => server.close(resolve));
  db.close();
}
