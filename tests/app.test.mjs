import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { get as httpGet } from 'node:http';
import { createApp } from '../server/app.mjs';
import { ab410 } from '../content/ab410.mjs';
import { validateContent } from '../content/index.mjs';
import { questionProgress, selectQuestions, shuffleOptions } from '../server/learning.mjs';

async function fixture(t, path = ':memory:') {
  const { app, db } = createApp(path);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  let closed = false;
  const stop = async () => {
    if (closed) return;
    closed = true;
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); db.close();
  };
  t.after(stop);
  const request = async (path, method = 'GET', body, expected = 200, headers = {}) => {
    const response = await fetch(`${base}/api${path}`, {
      method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    assert.equal(response.status, expected, JSON.stringify(data));
    return data;
  };
  const start = (overrides = {}, expected = 201) => request('/sessions', 'POST', {
    certification: 'ab-410', mode: 'practice', filter: 'all', order: 'stable', count: 5, ...overrides,
  }, expected);
  return { db, request, start, stop, base };
}
// Session options are shuffled, so locate the bank's correct option by its text.
const correctIndex = shown => {
  const bank = ab410.questions.find(q => q.id === shown.id);
  return shown.options.indexOf(bank.options[bank.answer]);
};
const answerFor = (session, overrides = {}) => ({
  questionId: session.questions[session.cursor].id,
  selected: correctIndex(session.questions[session.cursor]),
  difficulty: 2, durationMs: 1200, ...overrides,
});
const wrongFor = (session, overrides = {}) =>
  answerFor(session, { selected: correctIndex(session.questions[session.cursor]) === 0 ? 1 : 0, ...overrides });

test('las certificaciones de interés son recordatorios, no paquetes disponibles', async t => {
  const { request, start } = await fixture(t);
  const before = await request('/state');
  assert.deepEqual(before.interests.map(item => item.id), ['gh-300', 'ab-100']);
  assert.deepEqual(before.catalog.map(item => item.id), ['ab-410']);
  for (const { id } of before.interests) {
    await request('/settings', 'PATCH', { certification: id }, 404);
    await start({ certification: id }, 404);
    await request(`/study/${id}/agents`, 'PUT', { blockIndex: 0, completed: false }, 404);
  }
  const after = await request('/state');
  assert.deepEqual(after.settings, before.settings);
  assert.deepEqual(after.study, before.study);
  assert.deepEqual(after.active, before.active);
});

test('el contenido vincula cada pregunta y aptitud a lecciones y fuentes existentes', () => {
  validateContent();
  for (const lesson of ab410.lessons) {
    assert.ok(lesson.blocks.some(b => b.kind === 'recall'), `${lesson.id}: falta recuperación activa`);
    for (const recall of lesson.blocks.filter(b => b.kind === 'recall')) {
      assert.ok(Array.isArray(recall.guidance) && recall.guidance.length >= 2 &&
        recall.guidance.every(point => point.trim()), `${lesson.id}: falta una explicación útil para recuperación activa`);
    }
    for (const block of lesson.blocks) {
      assert.ok(block.concepts.length > 0 && block.concepts.length <= 3,
        `${lesson.id}/${block.title}: indica el foco de aprendizaje`);
    }
    assert.ok(lesson.blocks.some(b => b.kind === 'lab'), `${lesson.id}: falta aplicación práctica`);
    assert.ok(ab410.questions.some(q => q.lessonId === lesson.id), `${lesson.id}: sin preguntas`);
  }
  assert.equal(ab410.domains.reduce((n, d) => n + d.share, 0), 1);
  const invalid = structuredClone(ab410);
  invalid.questions[0].explanations = [];
  assert.throws(() => validateContent([invalid]), /Pregunta inválida/);
  const invalidRecall = structuredClone(ab410);
  invalidRecall.lessons[0].blocks.find(b => b.kind === 'recall').guidance = '';
  assert.throws(() => validateContent([invalidRecall]), /Guía de recuperación inválida/);
  const invalidConcepts = structuredClone(ab410);
  invalidConcepts.lessons[0].blocks[0].concepts = [];
  assert.throws(() => validateContent([invalidConcepts]), /Conceptos de diapositiva inválidos/);
  const lengthCue = structuredClone(ab410);
  const cued = lengthCue.questions[0];
  cued.options[cued.answer] += ' con una explicación mucho más detallada que las demás';
  assert.throws(() => validateContent([lengthCue]), /Pista por longitud/);
  const lengthBias = structuredClone(ab410);
  for (const question of lengthBias.questions) {
    const longest = Math.max(...question.options.filter((_, i) => i !== question.answer).map(o => o.length));
    question.options[question.answer] = question.options[question.answer].padEnd(longest + 1, '.');
  }
  assert.throws(() => validateContent([lengthBias]), /Sesgo de longitud/);
});

test('las capturas tienen archivo local íntegro, dimensiones y referencias válidas', async () => {
  const images = ab410.lessons.flatMap(lesson => lesson.blocks.flatMap(block => block.image ? [block.image] : []));
  assert(images.length > 0);
  for (const image of images) {
    const bytes = await readFile(new URL(`../public${image.src}`, import.meta.url));
    assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16), image.width);
    assert.equal(bytes.readUInt32BE(20), image.height);
    assert.equal(new URL(image.originalUrl).hostname, 'learn.microsoft.com');
  }
  for (const changes of [{ alt: '' }, { source: 'no-existe' }, { src: 'https://example.com/image.png' }]) {
    const invalid = structuredClone(ab410);
    const block = invalid.lessons.flatMap(lesson => lesson.blocks).find(block => block.image);
    Object.assign(block.image, changes);
    assert.throws(() => validateContent([invalid]), /Ilustración inválida/);
  }
});

test('el simulacro de 40 respeta 11/11/18 y no repite preguntas; el orden fijo es estable', () => {
  const progress = questionProgress(ab410.questions, []);
  const exam = selectQuestions(ab410, progress, { mode: 'exam', count: 40 });
  assert.equal(new Set(exam.map(q => q.id)).size, 40);
  assert.deepEqual(ab410.domains.map(d => exam.filter(q => ab410.lessons.find(l => l.id === q.lessonId).domain === d.id).length), [11, 11, 18]);
  const config = { mode: 'practice', order: 'stable', filter: 'all', count: 10 };
  assert.deepEqual(selectQuestions(ab410, progress, config).map(q => q.id), ab410.questions.slice(0, 10).map(q => q.id));
});

test('las opciones se barajan por sesión conservando respuesta y explicaciones', async t => {
  const question = ab410.questions[0];
  const positions = new Set();
  for (let i = 0; i < 40; i++) {
    const shown = shuffleOptions(question);
    assert.deepEqual([...shown.options].sort(), [...question.options].sort());
    assert.equal(shown.options[shown.answer], question.options[question.answer]);
    shown.options.forEach((option, j) =>
      assert.equal(shown.explanations[j], question.explanations[question.options.indexOf(option)]));
    positions.add(shown.answer);
  }
  assert.ok(positions.size > 1, 'la respuesta correcta debe cambiar de posición');
  assert.equal(question.answer, ab410.questions[0].answer, 'el banco no se modifica');
  const f = await fixture(t);
  const s = await f.start({ count: 3 });
  assert.ok(s.questions.every(q => !('optionOrder' in q)), 'el orden original no se expone');
  const answered = await f.request(`/sessions/${s.id}/answer`, 'POST', answerFor(s));
  assert.equal(answered.questions[0].feedback.correct, true);
});

test('repaso combina acierto y esfuerzo: 10 minutos, 1/3/7/14/30 días y retroceso', () => {
  const q = ab410.questions[0];
  const start = Date.parse('2026-01-01T10:00:00Z');
  const history = [];
  const push = (correct, difficulty, at = start) => {
    history.push({ question_id: q.id, correct, difficulty, created_at: new Date(at).toISOString() });
    return questionProgress([q], history, at)[0];
  };
  let p = push(0, 1);
  assert.equal(Date.parse(p.dueAt) - start, 600000);
  assert.equal(p.due, false);
  assert.equal(questionProgress([q], history, start + 600000)[0].due, true);
  for (const days of [1, 3, 7, 14, 30, 30]) {
    p = push(1, 1); assert.equal(Date.parse(p.dueAt) - start, days * 86400000);
  }
  p = push(1, 2); assert.equal(p.box, 1); assert.equal(Date.parse(p.dueAt) - start, 86400000);
  p = push(1, 3); assert.equal(p.box, 0); assert.equal(Date.parse(p.dueAt) - start, 600000);
  p = push(0, 2); assert.equal(p.lastCorrect, false);
});

test('filtros y orden descendente no inventan repasos ni mezclan nuevas con errores', () => {
  const attempts = [
    { question_id: 'arch-01', correct: 0, difficulty: 3, created_at: '2026-01-01T00:00:00Z' },
    { question_id: 'arch-02', correct: 1, difficulty: 1, created_at: '2026-01-01T00:00:00Z' },
    { question_id: 'arch-03', correct: 1, difficulty: 3, created_at: '2026-01-01T00:00:00Z' },
  ];
  const progress = questionProgress(ab410.questions, attempts, Date.parse('2026-01-03T00:00:00Z'));
  const select = filter => selectQuestions(ab410, progress, { mode: 'practice', order: 'hardest', filter, count: 60 }).map(q => q.id);
  assert.deepEqual(select('mistakes'), ['arch-01']);
  assert.deepEqual(select('difficult'), ['arch-01', 'arch-03']);
  assert.equal(select('unseen').length, 57);
  assert.equal(select('due').length, 3);
  assert.equal(select('all')[0], 'arch-01');
  assert.equal(selectQuestions(ab410, progress, { mode: 'practice', order: 'stable', filter: 'all', lessonId: 'agents', count: 60 }).length, 5);
});

test('práctica guarda respuesta/dificultad, rechaza cambios y avanza con cursor protegido', async t => {
  const f = await fixture(t);
  const s = await f.start({ count: 2 });
  assert.ok(s.questions.every(q => q.feedback === null && !('answer' in q) && !('explanations' in q)));
  await f.request(`/sessions/${s.id}/next`, 'POST', { cursor: 0 }, 400);
  await f.request(`/sessions/${s.id}/answer`, 'POST', answerFor(s, { difficulty: 0 }), 400);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM attempts').get().n, 0);
  const answered = await f.request(`/sessions/${s.id}/answer`, 'POST', answerFor(s));
  assert.equal(answered.questions[0].feedback.correct, true);
  assert.equal(answered.questions[0].attempt.difficulty, 2);
  assert.equal(answered.questions[1].feedback, null);
  await f.request(`/sessions/${s.id}/answer`, 'POST', answerFor(s));
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM attempts').get().n, 1);
  await f.request(`/sessions/${s.id}/answer`, 'POST', answerFor(s, { difficulty: 3 }), 409);
  const next = await f.request(`/sessions/${s.id}/next`, 'POST', { cursor: 0 });
  assert.equal(next.cursor, 1);
  await f.request(`/sessions/${s.id}/next`, 'POST', { cursor: 0 }, 409);
  await f.request(`/sessions/${s.id}/answer`, 'POST', answerFor(next, { difficulty: 3 }));
  const completed = await f.request(`/sessions/${s.id}/next`, 'POST', { cursor: 1 });
  assert.equal(completed.status, 'completed');
  assert.equal(completed.score, 2);
  const stats = await f.request('/stats/ab-410');
  assert.equal(stats.attempts, 2); assert.equal(stats.difficult, 1);
});

test('simulacro no revela feedback ni aciertos en estadísticas hasta finalizar; cuenta omitidas', async t => {
  const f = await fixture(t);
  const s = await f.start({ mode: 'exam', count: 40 });
  const answered = await f.request(`/sessions/${s.id}/answer`, 'POST', answerFor(s));
  assert.equal(answered.score, null);
  assert.ok(answered.questions.every(q => q.feedback === null));
  const stats = await f.request('/stats/ab-410');
  assert.equal(stats.attempts, 0);
  assert.equal(stats.questions.find(q => q.id === s.questions[0].id).attempts, 0);
  const done = await f.request(`/sessions/${s.id}/finish`, 'POST');
  assert.equal(done.questions.length, 40); assert.equal(done.score, 1); assert.equal(done.answered, 1);
  assert.equal(done.questions.filter(q => q.feedback.correct).length, 1);
  assert.ok(done.questions.every(q => q.feedback !== null));
  const after = await f.request('/stats/ab-410');
  assert.equal(after.attempts, 1); assert.equal(after.history[0].total, 40);
  await f.request(`/sessions/${s.id}/answer`, 'POST', answerFor(s), 409);
});

test('plazo de examen persiste y se aplica en servidor incluso si la página estuvo cerrada', async t => {
  const f = await fixture(t);
  const s = await f.start({ mode: 'exam', count: 10, minutes: 1 });
  const past = new Date(Date.now() - 1000).toISOString();
  f.db.prepare('UPDATE sessions SET deadline=? WHERE id=?').run(past, s.id);
  await f.request(`/sessions/${s.id}/answer`, 'POST', answerFor(s), 409);
  const expired = await f.request(`/sessions/${s.id}`);
  assert.equal(expired.status, 'completed'); assert.equal(expired.completedAt, past);
  assert.equal(expired.score, 0);
  assert.equal((await f.request('/state')).active.length, 0);
});

test('preferencias, lectura, snapshots y respuestas sobreviven al reinicio de SQLite', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'certifica-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, 'progress.sqlite');
  const f = await fixture(t, path);
  await f.request('/settings', 'PATCH', { theme: 'dark' });
  await f.request('/study/ab-410/agents', 'PUT', { blockIndex: 3, completed: false });
  const s = await f.start();
  await f.request(`/sessions/${s.id}/answer`, 'POST', wrongFor(s, { difficulty: 3 }));
  await f.request(`/sessions/${s.id}/next`, 'POST', { cursor: 0 });
  const snapshot = f.db.prepare('SELECT questions FROM sessions WHERE id=?').get(s.id).questions;
  await f.stop();
  const reopened = await fixture(t, path);
  const state = await reopened.request('/state');
  assert.equal(state.settings.theme, 'dark');
  assert.equal(state.lastStudy, 'agents');
  assert.equal(state.study[0].blockIndex, 3);
  assert.equal(state.study[0].completed, 0);
  const resumed = await reopened.request(`/sessions/${s.id}`);
  assert.equal(resumed.cursor, 1); assert.equal(resumed.answered, 1);
  assert.equal(resumed.questions[0].attempt.selected, wrongFor(s).selected);
  assert.equal(reopened.db.prepare('SELECT questions FROM sessions WHERE id=?').get(s.id).questions, snapshot);
  const exported = await reopened.request('/export');
  assert.equal(exported.version, 1); assert.equal(exported.attempts.length, 1);
  // Cerrar antes de que t.after borre el directorio: en Windows el SQLite abierto bloquea el rm.
  await reopened.stop();
});

test('validación rechaza filtros vacíos, temas, secciones y cantidades inválidas', async t => {
  const f = await fixture(t);
  await f.request('/settings', 'PATCH', { theme: 'neon' }, 400);
  await f.request('/settings', 'PATCH', { certification: 'ab-100' }, 404);
  await f.request('/study/ab-410/agents', 'PUT', { blockIndex: 999, completed: true }, 400);
  await f.request('/study/ab-410/agents', 'PUT', { blockIndex: 0, completed: 'yes' }, 400);
  await f.start({ filter: 'difficult' }, 400);
  await f.start({ mode: 'exam', count: 60 }, 400);
  await f.start({ count: -1 }, 400);
  await f.start({ order: 'arbitrary' }, 400);
  await f.start({ lessonId: 'missing' }, 400);
  await f.start({ mode: 'exam', filter: 'mistakes' }, 400);
});

test('mantiene una sesión activa por modo sin impedir práctica y examen separados', async t => {
  const f = await fixture(t);
  const p = await f.start();
  await f.start({}, 409);
  await f.start({ mode: 'exam', count: 10 });
  await f.request(`/sessions/${p.id}/finish`, 'POST');
  await f.start();
  assert.equal((await f.request('/state')).active.length, 2);
});

test('Host y Origin impiden escritura cross-origin y DNS rebinding básico', async t => {
  const f = await fixture(t);
  await f.request('/settings', 'PATCH', { theme: 'dark' }, 403, { Origin: 'https://other.invalid' });
  const status = await new Promise((resolve, reject) => {
    httpGet(`${f.base}/api/state`, { headers: { Host: 'attacker.invalid' } }, response => {
      response.resume(); response.on('end', () => resolve(response.statusCode));
    }).on('error', reject);
  });
  assert.equal(status, 403);
  assert.equal((await f.request('/state')).settings.theme, 'system');
});

test('extraHosts admite solo los nombres de red indicados', async t => {
  const { app, db } = createApp(':memory:', { extraHosts: ['192.168.0.50', 'MiEquipo'] });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => {
    server.close(() => { db.close(); resolve(); });
    server.closeAllConnections();
  }));
  const statusFor = host => new Promise((resolve, reject) => {
    httpGet(`http://127.0.0.1:${server.address().port}/api/state`, { headers: { Host: host } }, response => {
      response.resume(); response.on('end', () => resolve(response.statusCode));
    }).on('error', reject);
  });
  assert.equal(await statusFor('192.168.0.50:4100'), 200);
  assert.equal(await statusFor('miequipo:4100'), 200);
  assert.equal(await statusFor('attacker.invalid'), 403);
});

test('estadísticas separan el histórico de aciertos de la última dificultad/resultado', async t => {
  const f = await fixture(t);
  let s = await f.start({ count: 1 });
  await f.request(`/sessions/${s.id}/answer`, 'POST', wrongFor(s, { difficulty: 3 }));
  await f.request(`/sessions/${s.id}/next`, 'POST', { cursor: 0 });
  s = await f.start({ count: 1 });
  await f.request(`/sessions/${s.id}/answer`, 'POST', answerFor(s, { difficulty: 1 }));
  const stats = await f.request('/stats/ab-410');
  const q = stats.questions[0];
  assert.equal(q.attempts, 2); assert.equal(q.correct, 1); assert.equal(q.accuracy, 50);
  assert.equal(q.lastCorrect, true); assert.equal(q.difficulty, 1); assert.equal(q.averageDifficulty, 2);
  assert.equal(stats.difficult, 0);
  assert.deepEqual(stats.ratings.map(r => r.count), [1, 0, 1]);
  assert.equal(stats.domains[0].attempts, 2);
});
