import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createServer as createViteServer } from 'vite';
import { chromium } from 'playwright';
import { createApp } from '../server/app.mjs';

let browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });

async function fixture(t) {
  const { app, db } = createApp(':memory:');
  const server = createServer(app);
  let vite, page;
  t.after(async () => {
    await page?.unrouteAll({ behavior: 'wait' });
    await page?.close(); await vite?.close();
    if (server.listening) await new Promise(resolve => server.close(resolve));
    db.close();
  });
  vite = await createViteServer({ server: { middlewareMode: true, hmr: { server } }, appType: 'spa' });
  app.use(vite.middlewares);
  await new Promise((resolve, reject) => {
    server.once('error', reject); server.listen(0, '127.0.0.1', resolve);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const request = async (path, method = 'GET', body) => {
    const response = await fetch(`${base}/api${path}`, {
      method, headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    assert(response.ok, JSON.stringify(data)); return data;
  };
  let visits = 0;
  const home = async () => {
    await page.goto(`${base}/?home-test=${++visits}#home`);
    await page.locator('.home-primary').waitFor();
    assert.equal(await page.locator('.home-focus .primary').count(), 1);
  };
  const start = (mode = 'practice') => request('/sessions', 'POST', {
    certification: 'ab-410', mode, filter: 'all', order: 'stable', count: mode === 'exam' ? 10 : 5, minutes: 15,
  });
  return { page, request, home, start };
}

test('una práctica pendiente no desplaza el estudio y se puede retomar intacta', async t => {
  const { page, request, home, start } = await fixture(t);
  const practice = await start();
  await home();
  assert.equal(await page.locator('.home-primary').innerText(), 'Comenzar primera lección');
  const resume = page.getByRole('link', { name: 'Retomar práctica guardada', exact: true });
  assert.equal(await resume.getAttribute('href'), `#quiz/${practice.id}`);
  await page.locator('.home-primary').click();
  await page.locator('.reading-card').waitFor();
  await page.getByText('Punto de lectura guardado', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Siguiente sección', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.reading-meta')?.textContent?.includes('SECCIÓN 2'));
  await home();
  assert.equal(await page.locator('.home-primary').innerText(), 'Continuar mi estudio');
  await page.locator('.home-primary').click();
  await page.waitForFunction(() => document.querySelector('.reading-meta')?.textContent?.includes('SECCIÓN 2'));
  await home();
  for (const [width, height, theme] of [[360, 740, 'light'], [844, 390, 'dark'], [1440, 1000, 'system']]) {
    await request('/settings', 'PATCH', { theme });
    await page.setViewportSize({ width, height });
    await home();
    assert.equal(await page.locator('.home-primary').innerText(), 'Continuar mi estudio');
    assert(await resume.isVisible());
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await resume.click();
  await page.locator('.question-card').waitFor();
  assert.equal(new URL(page.url()).hash, `#quiz/${practice.id}`);
  const saved = await request(`/sessions/${practice.id}`);
  assert.equal(saved.status, 'active');
  assert.equal(saved.answered, 0);
  assert.equal(saved.cursor, 0);
});

test('el simulacro conserva prioridad y plazo sin impedir entrar al estudio', async t => {
  const { page, request, home, start } = await fixture(t);
  await start();
  const exam = await start('exam');
  await home();
  assert.equal(await page.locator('.home-primary').innerText(), 'Retomar simulacro');
  assert.match(await page.locator('.home-description').innerText(), /tiempo sigue contando/);
  await page.getByRole('link', { name: 'Quiero estudiar primero', exact: true }).click();
  await page.locator('.reading-card').waitFor();
  await page.getByText('Punto de lectura guardado', { exact: true }).waitFor();
  const saved = await request(`/sessions/${exam.id}`);
  assert.equal(saved.deadline, exam.deadline);
  assert.equal(saved.status, 'active');
});

test('las recomendaciones de práctica y repaso mantienen una salida al estudio', async t => {
  const { page, request, home } = await fixture(t);
  await request('/study/ab-410/agents', 'PUT', { blockIndex: 6, completed: true });
  await home();
  assert.equal(await page.locator('.home-primary').innerText(), 'Practicar esta lección');
  await page.getByRole('link', { name: 'Quiero estudiar primero', exact: true }).click();
  await page.locator('.reading-card').waitFor();
  await page.getByText('Punto de lectura guardado', { exact: true }).waitFor();
  assert.match(new URL(page.url()).hash, /^#study\//);
  await page.route('**/api/stats/ab-410', async route => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({ response, json: { ...data, due: 1 } });
  });
  await home();
  assert.equal(await page.locator('.home-primary').innerText(), 'Comenzar repaso');
  await page.getByRole('link', { name: 'Continuar mi estudio', exact: true }).click();
  await page.locator('.reading-card').waitFor();
});

test('el modo enfoque permite leer y avanzar, y Esc restaura la vista sin perder la sección', async t => {
  const { page, request, home } = await fixture(t);
  await home();
  await page.locator('.home-primary').click();
  await page.getByText('Punto de lectura guardado', { exact: true }).waitFor();
  const enter = page.getByRole('button', { name: 'Modo enfoque', exact: true });
  await enter.click();
  for (const selector of ['.sidebar', '.topbar', '.study-outline', '.study-heading', '.study-extras', '.page-footer']) {
    assert.equal(await page.locator(selector).isVisible(), false, selector);
  }
  assert(await page.locator('.reading-card').isVisible());
  await page.getByRole('button', { name: 'Siguiente sección', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.reading-meta')?.textContent?.includes('SECCIÓN 2'));
  assert.match(await page.locator('.reading-card').innerText(), /Recomendación de diseño/);
  await page.keyboard.press('Escape');
  assert(await page.locator('.sidebar').isVisible());
  assert.equal(await page.locator('.study-outline').isVisible(), false);
  assert.equal(await enter.getAttribute('aria-pressed'), 'false');
  assert(await enter.evaluate(button => button === document.activeElement));
  await page.getByLabel('Módulo e índice', { exact: true }).click();
  assert(await page.locator('.study-outline').isVisible());
  await page.getByLabel('Módulo e índice', { exact: true }).click();
  assert(await page.locator('.study-extras').isVisible());
  assert.match(await page.locator('.reading-meta').innerText(), /SECCIÓN 2/);
  const state = await request('/state');
  assert.equal(state.study.find(progress => progress.lessonId === 'agents').blockIndex, 1);
  await page.getByRole('button', { name: 'Siguiente sección', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.reading-meta')?.textContent?.includes('SECCIÓN 3'));
  assert.match(await page.locator('.reading-card > p strong').first().innerText(), /^Tema \(topic\)/);
});

test('la ayuda de recuperación muestra una respuesta concreta para el caso', async t => {
  const { page, request, home } = await fixture(t);
  await request('/study/ab-410/agents', 'PUT', { blockIndex: 5, completed: false });
  await home();
  await page.evaluate(() => { location.hash = 'study/agents'; });
  await page.locator('.reading-card h1').waitFor();
  assert.equal(await page.locator('.reading-card h1').innerText(), 'Recuperación activa');
  assert.match(await page.locator('.slide-concepts').innerText(), /Foco de esta diapositiva/);
  assert.match(await page.locator('.slide-concepts').innerText(), /Verificar identidad y estado en el servicio/);
  assert.equal(await page.locator('.slide-concepts li').count(), 3);

  await page.getByRole('button', { name: 'Ver respuesta explicada', exact: true }).click();
  const explanation = page.locator('.recall-guide');
  await explanation.waitFor();
  assert.match(await explanation.innerText(), /Una respuesta posible/);
  assert.match(await explanation.innerText(), /Conocimiento: la política/);
  assert.match(await explanation.innerText(), /sigue pendiente/);
  assert.match(await explanation.innerText(), /identidad/);
  assert.equal(await explanation.locator('li').count(), 5);
});

test('el modo enfoque aprovecha el ancho disponible sin desbordarse en móvil', async t => {
  const { page, home } = await fixture(t);
  await home();
  await page.locator('.home-primary').click();
  await page.locator('.reading-card').waitFor();
  await page.getByRole('button', { name: 'Modo enfoque', exact: true }).click();

  for (const [width, height, minCardWidth] of [[1920, 1080, 1400], [1440, 900, 1200], [360, 740, 0]]) {
    await page.setViewportSize({ width, height });
    const card = await page.locator('.reading-card').boundingBox();
    assert(card && card.width >= minCardWidth && card.width <= width,
      `Ancho inesperado del contenido en enfoque a ${width}×${height}: ${JSON.stringify(card)}`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
});

test('la lectura aparece arriba, con el contexto plegado y el enfoque dentro de la tarjeta', async t => {
  const { page, request, home } = await fixture(t);
  await request('/study/ab-410/agents', 'PUT', { blockIndex: 2, completed: false });
  for (const [width, height] of [[1440, 900], [360, 740], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await home();
    await page.locator('.home-primary').click();
    const card = page.locator('.reading-card');
    await card.waitFor();
    assert.equal(await page.locator('.topbar').isVisible(), false);
    assert.equal(await page.locator('.study-context').getAttribute('open'), null);
    const bounds = await card.locator('h1').boundingBox();
    assert(bounds && bounds.y < 240 && bounds.y + bounds.height < height,
      `Título fuera de la zona de lectura inicial a ${width}×${height}: ${JSON.stringify(bounds)}`);
    assert(await card.getByRole('button', { name: 'Modo enfoque', exact: true }).isVisible());
    await page.getByLabel('Módulo e índice', { exact: true }).click();
    await page.getByRole('navigation', { name: 'Secciones del módulo' })
      .getByRole('button', { name: /Mapa mental mínimo/ }).click();
    await page.waitForFunction(() => document.querySelector('.reading-meta')?.textContent?.includes('SECCIÓN 1'));
    await request('/study/ab-410/agents', 'PUT', { blockIndex: 2, completed: false });
  }
});

test('la salida del enfoque sigue visible al desplazar en móvil y se conserva al pasar de módulo', async t => {
  const { page, request, home } = await fixture(t);
  await request('/study/ab-410/agents', 'PUT', { blockIndex: 6, completed: false });
  for (const [width, height, theme] of [[1440, 1000, 'light'], [360, 740, 'dark'], [844, 390, 'system']]) {
    await request('/settings', 'PATCH', { theme });
    await page.setViewportSize({ width, height });
    await home();
    await page.locator('.home-primary').click();
    await page.locator('.reading-card').waitFor();
    await page.getByRole('button', { name: 'Modo enfoque', exact: true }).click();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const exit = page.getByRole('button', { name: /Salir del modo enfoque/ });
    const box = await exit.boundingBox();
    assert(box && box.y >= 0 && box.y + box.height <= height, `Salida fuera de vista a ${width} × ${height}`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await exit.click();
    assert(await page.locator('.sidebar').isVisible());
    assert.match(await page.locator('.reading-meta').innerText(), /SECCIÓN 7/);
  }
  await page.getByRole('button', { name: 'Modo enfoque', exact: true }).click();
  await page.getByRole('button', { name: 'Completar módulo y seguir', exact: true }).click();
  await page.waitForFunction(() => location.hash === '#study/prompts' && document.querySelector('.reading-meta')?.textContent?.includes('SECCIÓN 1'));
  assert(await page.getByRole('button', { name: /Salir del modo enfoque/ }).isVisible());
  await page.evaluate(() => { location.hash = 'study'; });
  await page.getByRole('heading', { name: 'Tu ruta de estudio', exact: true }).waitFor();
  assert(await page.locator('.sidebar').isVisible());
  await page.locator('a[href="#study/agents"]').click();
  await page.locator('.reading-card').waitFor();
  assert.equal(await page.getByRole('button', { name: 'Modo enfoque', exact: true }).getAttribute('aria-pressed'), 'false');
});

test('el texto de lectura muestra negritas sin interpretar HTML ni perder texto sin cerrar', async t => {
  const { page, home } = await fixture(t);
  await page.route('**/api/state', async route => {
    const response = await route.fetch();
    const data = await response.json();
    data.certification.lessons.find(lesson => lesson.id === 'agents').blocks[0].body =
      'Concepto **destacado** y <em>literal</em>.\n\nEjemplo **adicional**. Marcador sin cerrar: **pendiente';
    await route.fulfill({ response, json: data });
  });
  await home();
  await page.locator('.home-primary').click();
  const body = page.locator('.reading-card > p');
  await body.waitFor();
  assert.deepEqual(await body.locator('strong').allTextContents(), ['destacado', 'adicional']);
  assert.equal(await body.locator('em').count(), 0);
  assert.match(await body.innerText(), /<em>literal<\/em>/);
  assert.match(await body.innerText(), /\*\*pendiente$/);
});

test('consultar certificaciones pendientes no cambia la certificación ni el progreso', async t => {
  const { page, request, home, start } = await fixture(t);
  await start();
  await request('/study/ab-410/agents', 'PUT', { blockIndex: 2, completed: false });
  const before = await request('/state');
  await home();
  await page.evaluate(() => { location.hash = 'settings'; });
  const select = page.getByLabel('Qué quieres estudiar');
  for (const id of ['gh-300', 'ab-100']) {
    await select.selectOption(id);
    await page.getByText(`${id.toUpperCase()} · Contenido pendiente`, { exact: true }).waitFor();
    assert.match(await page.getByRole('status').innerText(), /no se generará contenido automáticamente/);
    assert.match(await page.getByRole('link', { name: 'Ver información oficial' }).getAttribute('href'), /^https:\/\/learn.microsoft.com\//);
  }
  const after = await request('/state');
  assert.deepEqual(after.study, before.study);
  assert.deepEqual(after.settings, before.settings);
  assert.deepEqual(after.active, before.active);
  await select.selectOption('ab-410');
  await page.getByText('Contenido pendiente', { exact: false }).waitFor({ state: 'hidden' });
});

async function mockSpeech(page, voices) {
  await page.addInitScript(voices => {
    let current, paused = false;
    const calls = [];
    window.__speech = {
      calls,
      fail() { current?.onerror?.({ error: 'synthesis-failed' }); },
      finish() { current?.onend?.(); current = null; },
    };
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true, value: class { constructor(text) { this.text = text; } },
    });
    const synth = new EventTarget();
    Object.assign(synth, {
      getVoices: () => voices,
      speak(next) {
        current = next;
        calls.push({ action: 'speak', text: next.text, rate: next.rate, voice: next.voice.name });
        if (!paused) next.onstart?.();
      },
      pause() { paused = true; calls.push({ action: 'pause' }); },
      resume() { paused = false; calls.push({ action: 'resume' }); },
      cancel() { const old = current; current = null; calls.push({ action: 'cancel' }); old?.onerror?.({ error: 'canceled' }); },
    });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
  }, voices);
}

test('la lectura local permite pausar, detener, cambiar velocidad y se cancela al navegar', async t => {
  const { page, home } = await fixture(t);
  await mockSpeech(page, [
    { name: 'Remota', lang: 'es-MX', localService: false, default: true },
    { name: 'Local', lang: 'es-ES', localService: true, default: false },
  ]);
  await home();
  await page.locator('.home-primary').click();
  const audio = page.getByRole('region', { name: 'Lectura en voz alta' });
  const play = () => audio.getByRole('button', { name: /Reproducir|Reanudar/ }).click();
  const spoken = () => page.evaluate(() => window.__speech.calls.filter(call => call.action === 'speak'));
  await play();
  assert.equal((await spoken())[0].voice, 'Local');
  assert.equal((await spoken())[0].rate, 1);
  assert(!((await spoken())[0].text.includes('**')));
  await audio.getByRole('button', { name: 'Pausar' }).click();
  await audio.getByText('Lectura en pausa.', { exact: true }).waitFor();
  await play();
  assert.equal((await spoken()).length, 1);
  await audio.getByRole('radio', { name: '1,25x', exact: true }).check();
  assert.equal((await spoken()).at(-1).rate, 1.25);
  await audio.getByRole('button', { name: 'Pausar' }).click();
  await audio.getByRole('radio', { name: '1,5x', exact: true }).check();
  await play();
  assert.equal((await spoken()).at(-1).rate, 1.5);
  await audio.getByRole('button', { name: 'Detener' }).click();
  await audio.getByText('Lista para escuchar esta sección.', { exact: true }).waitFor();
  assert.equal(await audio.getByRole('alert').count(), 0);
  await play();
  await page.getByRole('button', { name: 'Modo enfoque', exact: true }).click();
  for (const [width, height] of [[320, 740], [360, 740], [844, 390], [1440, 1000]]) {
    await page.setViewportSize({ width, height });
    assert(await audio.isVisible());
    const box = await audio.boundingBox();
    assert(box && box.height <= 64, `La barra ocupa ${box?.height}px a ${width}px`);
    const controls = await audio.locator('.reading-audio-controls').boundingBox();
    for (const button of await audio.getByRole('button').all()) {
      const bounds = await button.boundingBox();
      assert(bounds && controls && Math.abs(bounds.y + bounds.height / 2 - controls.y - controls.height / 2) <= 1);
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  const beforeInfo = await audio.boundingBox();
  await audio.getByLabel('Información de lectura').click();
  await audio.getByText(/Voz local: Local/).waitFor();
  assert.equal((await audio.boundingBox()).height, beforeInfo.height);
  await audio.getByLabel('Información de lectura').click();
  await audio.getByRole('radio', { name: '1x', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  assert(await audio.getByRole('radio', { name: '1,25x', exact: true }).isChecked());
  await page.getByRole('button', { name: 'Siguiente sección', exact: true }).click();
  await audio.getByText('Lista para escuchar esta sección.', { exact: true }).waitFor();
  await play();
  await page.evaluate(() => window.__speech.fail());
  await audio.getByRole('alert').filter({ hasText: 'synthesis-failed' }).waitFor();
  await play();
  await page.evaluate(() => window.__speech.finish());
  await audio.getByText('Lista para escuchar esta sección.', { exact: true }).waitFor();
  await play();
  const cancels = await page.evaluate(() => window.__speech.calls.filter(call => call.action === 'cancel').length);
  await page.evaluate(() => { location.hash = 'study'; });
  await audio.waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => window.__speech.calls.filter(call => call.action === 'cancel').length), cancels + 1);
});

test('sin voces locales españolas no se usa una voz remota ni se bloquea el estudio', async t => {
  const { page, home } = await fixture(t);
  await mockSpeech(page, [{ name: 'Remota', lang: 'es-MX', localService: false }]);
  await home();
  await page.locator('.home-primary').click();
  const audio = page.getByRole('region', { name: 'Lectura en voz alta' });
  await audio.getByText(/No hay una voz local en español/).waitFor();
  assert(await audio.getByRole('button', { name: 'Reproducir' }).isDisabled());
  assert.equal(await page.evaluate(() => window.__speech.calls.length), 0);
  await page.getByRole('button', { name: 'Siguiente sección', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.reading-meta')?.textContent?.includes('SECCIÓN 2'));
});

test('el estudio sigue accesible cuando el navegador no ofrece síntesis de voz', async t => {
  const { page, home } = await fixture(t);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
  });
  await home();
  await page.locator('.home-primary').click();
  const audio = page.getByRole('region', { name: 'Lectura en voz alta' });
  await audio.getByText(/Este navegador no permite lectura en voz alta/).waitFor();
  assert(await audio.getByRole('button', { name: 'Reproducir' }).isDisabled());
  assert(await page.locator('.reading-card').isVisible());
});

test('las capturas se cargan localmente y mantienen fuente, ampliación y lectura en móvil', async t => {
  const { page, home } = await fixture(t);
  await home();
  for (const [lesson, index] of [['ai-data', 1], ['ai-data', 2], ['process', 0]]) {
    await page.evaluate(lesson => { location.hash = `study/${lesson}`; }, lesson);
    await page.locator('.reading-card').waitFor();
    await page.getByLabel('Módulo e índice', { exact: true }).click();
    await page.getByRole('navigation', { name: 'Secciones del módulo' }).getByRole('button').nth(index).click();
    const figure = page.locator('.study-figure');
    await figure.waitFor();
    const image = figure.getByRole('img');
    await image.evaluate(image => image.decode());
    assert.match(await image.getAttribute('src'), /^\/study-media\//);
    assert((await image.getAttribute('alt')).length > 20);
    assert.match(await figure.getByRole('link', { name: 'Fuente oficial' }).getAttribute('href'), /^https:\/\/learn.microsoft.com\//);
    assert.match(await figure.getByRole('link', { name: 'CC BY 4.0' }).getAttribute('href'), /^https:\/\/creativecommons.org\//);
    const [popup] = await Promise.all([
      page.waitForEvent('popup'), figure.getByRole('link', { name: 'Abrir captura a tamaño original' }).click(),
    ]);
    assert.equal(new URL(popup.url()).origin, new URL(page.url()).origin);
    await popup.close();
    for (const [width, height] of [[360, 740], [844, 390]]) {
      await page.setViewportSize({ width, height });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.evaluate(() => { location.hash = 'study'; });
    await page.getByRole('heading', { name: 'Tu ruta de estudio', exact: true }).waitFor();
  }
});

test('una captura que falla muestra el error sin sustituir el material ni impedir avanzar', async t => {
  const { page, request, home } = await fixture(t);
  await request('/study/ab-410/ai-data', 'PUT', { blockIndex: 1, completed: false });
  await page.route('**/study-media/**', route => route.abort());
  await home();
  await page.locator('.home-primary').click();
  await page.locator('.study-figure').getByRole('alert').filter({ hasText: 'No se pudo cargar la captura' }).waitFor();
  assert(await page.locator('.reading-card > p').isVisible());
  await page.getByRole('button', { name: 'Siguiente sección', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.reading-meta')?.textContent?.includes('SECCIÓN 3'));
});

test('las vistas principales priorizan contenido en 1920×1080 y no desbordan en móvil', async t => {
  const { page, home } = await fixture(t);
  await home();
  const views = [
    ['study', '.lesson-row', 260],
    ['practice', '.config-card', 350],
    ['stats', '.metric-grid', 220],
    ['sources', '.source-grid', 350],
    ['settings', '.settings-panel', 220],
  ];
  for (const [width, height] of [[1920, 1080], [1366, 768], [360, 740], [844, 390]]) {
    await page.setViewportSize({ width, height });
    for (const [route, selector, limit] of views) {
      await page.evaluate(route => { location.hash = route; }, route);
      const content = page.locator(selector).first();
      await content.waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route}: desbordamiento a ${width}`);
      if (width === 1920) {
        const bounds = await content.boundingBox();
        assert(bounds && bounds.y <= limit, `${route}: el contenido comienza a ${bounds?.y}px`);
        if (route === 'study') {
          const visible = await page.locator('.lesson-row').evaluateAll(rows =>
            rows.filter(row => row.getBoundingClientRect().bottom <= innerHeight).length);
          assert(visible >= 7, `Solo hay ${visible} módulos completos visibles en 1080px de alto`);
        }
      }
    }
  }
});

test('el diseño compacto conserva práctica, reanudación, resultados, simulacro y estadísticas', async t => {
  const { page, home, start } = await fixture(t);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await home();
  const practice = await start();
  await page.evaluate(id => { location.hash = `quiz/${id}`; }, practice.id);
  await page.locator('.question-card').waitFor();
  const confirm = page.getByRole('button', { name: 'Confirmar respuesta', exact: true });
  const bounds = await confirm.boundingBox();
  assert(bounds && bounds.y + bounds.height < 1080);
  await page.locator('.option').first().click();
  await page.getByRole('button', { name: 'Fácil', exact: true }).click();
  await confirm.click();
  await page.locator('.feedback-panel').waitFor();
  await page.getByRole('button', { name: 'Siguiente pregunta', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.question-count strong')?.textContent === '2');
  await page.getByRole('link', { name: 'Pausar y salir', exact: true }).click();
  await page.getByRole('button', { name: 'Retomar sesión', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.question-count strong')?.textContent === '2');
  await page.getByRole('button', { name: 'Finalizar sesión ahora', exact: true }).click();
  await page.getByRole('button', { name: 'Sí, finalizar', exact: true }).click();
  await page.locator('.result-hero').waitFor();
  const exam = await start('exam');
  await page.evaluate(id => { location.hash = `quiz/${id}`; }, exam.id);
  await page.locator('.question-card').waitFor();
  await page.locator('.option').first().click();
  await page.getByRole('button', { name: 'Media', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar respuesta', exact: true }).click();
  await page.getByText('Respuesta guardada', { exact: true }).waitFor();
  assert.equal(await page.locator('.feedback-panel').count(), 0);
  await page.getByRole('button', { name: 'Finalizar sesión ahora', exact: true }).click();
  await page.getByRole('button', { name: 'Sí, finalizar', exact: true }).click();
  await page.locator('.result-hero').waitFor();
  await page.evaluate(() => { location.hash = 'stats'; });
  await page.locator('.table-scroll tbody tr').first().waitFor();
  assert.equal(await page.locator('.metric-grid > .metric').first().locator('strong').innerText(), '2');
});
