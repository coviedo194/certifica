import express from 'express';
import { randomUUID } from 'node:crypto';
import { certifications, certificationInterests, validateContent } from '../content/index.mjs';
import { openDatabase, transaction } from './db.mjs';
import { questionProgress, selectQuestions } from './learning.mjs';

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function check(condition, message, status = 400) {
  if (!condition) throw new HttpError(status, message);
}
const now = () => new Date().toISOString();

export function createApp(databasePath) {
  validateContent();
  const db = openDatabase(databasePath);
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const host = req.headers.host ?? '';
    if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) return res.status(403).json({ error: 'Solo se admite acceso local.' });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin &&
        req.headers.origin !== `http://${host}`) return res.status(403).json({ error: 'Origen no permitido.' });
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' });
    if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '16kb' }));

  const certById = id => {
    const cert = certifications.find(c => c.id === id);
    check(cert, 'Certificación no disponible.', 404);
    return cert;
  };
  const getAttempts = certId => db.prepare(`
    SELECT a.* FROM attempts a JOIN sessions s ON s.id=a.session_id
    WHERE s.certification=? AND (s.mode='practice' OR s.status='completed')
    ORDER BY a.created_at, a.id
  `).all(certId);
  const expire = () => db.prepare("UPDATE sessions SET status='completed', completed_at=deadline WHERE status='active' AND deadline IS NOT NULL AND deadline <= ?").run(now());
  const getSession = id => {
    expire();
    const session = db.prepare('SELECT * FROM sessions WHERE id=?').get(id);
    check(session, 'Sesión no encontrada.', 404);
    return session;
  };
  const publicSession = session => {
    const attempts = db.prepare('SELECT * FROM attempts WHERE session_id=? ORDER BY id').all(session.id);
    const questions = JSON.parse(session.questions);
    const reveal = session.mode === 'practice' || session.status === 'completed';
    const completed = session.status === 'completed';
    return {
      id: session.id, certification: session.certification, mode: session.mode,
      status: session.status, cursor: session.cursor, createdAt: session.created_at,
      deadline: session.deadline, completedAt: session.completed_at,
      answered: attempts.length,
      score: completed ? attempts.reduce((n, a) => n + a.correct, 0) : null,
      questions: questions.map(q => {
        const a = attempts.find(a => a.question_id === q.id);
        const { answer, explanations, sources, ...safe } = q;
        return {
          ...safe,
          attempt: a ? { selected: a.selected, difficulty: a.difficulty, durationMs: a.duration_ms } : null,
          feedback: reveal && (a || completed) ? { answer, explanations, sources, correct: Boolean(a?.correct) } : null,
        };
      }),
    };
  };

  app.get('/api/state', (req, res) => {
    expire();
    const settings = db.prepare('SELECT certification, theme FROM settings WHERE id=1').get();
    const cert = certById(settings.certification);
    const { questions, ...content } = cert;
    const study = db.prepare('SELECT lesson_id AS lessonId, block_index AS blockIndex, completed, updated_at AS updatedAt FROM study WHERE certification=?').all(cert.id);
    const active = db.prepare("SELECT id, mode, cursor, created_at AS createdAt FROM sessions WHERE certification=? AND status='active' ORDER BY created_at DESC").all(cert.id);
    const lastStudy = [...study].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.lessonId ?? null;
    res.json({
      settings, catalog: certifications.map(c => ({ id: c.id, code: c.code, title: c.title })),
      interests: certificationInterests,
      certification: { ...content, questionCount: questions.length }, study, lastStudy, active,
    });
  });
  app.patch('/api/settings', (req, res) => {
    const { theme, certification } = req.body ?? {};
    check(theme !== undefined || certification !== undefined, 'No hay ajustes para guardar.');
    if (theme !== undefined) check(['system', 'dark', 'light'].includes(theme), 'Tema inválido.');
    if (certification !== undefined) certById(certification);
    transaction(db, () => {
      if (theme !== undefined) db.prepare('UPDATE settings SET theme=? WHERE id=1').run(theme);
      if (certification !== undefined) db.prepare('UPDATE settings SET certification=? WHERE id=1').run(certification);
    });
    res.json({ ok: true });
  });
  app.put('/api/study/:certification/:lesson', (req, res) => {
    const cert = certById(req.params.certification);
    const lesson = cert.lessons.find(l => l.id === req.params.lesson);
    check(lesson, 'Lección no encontrada.', 404);
    const { blockIndex, completed } = req.body ?? {};
    check(Number.isInteger(blockIndex) && blockIndex >= 0 && blockIndex < lesson.blocks.length, 'Sección de estudio inválida.');
    check(typeof completed === 'boolean', 'Estado de lectura inválido.');
    db.prepare(`INSERT INTO study VALUES(?,?,?,?,?)
      ON CONFLICT(certification,lesson_id) DO UPDATE SET block_index=excluded.block_index, completed=excluded.completed, updated_at=excluded.updated_at`)
      .run(cert.id, lesson.id, blockIndex, Number(completed), now());
    res.json({ ok: true });
  });
  app.get('/api/stats/:certification', (req, res) => {
    expire();
    const cert = certById(req.params.certification);
    const attempts = getAttempts(cert.id);
    const progress = questionProgress(cert.questions, attempts);
    const history = db.prepare(`
      SELECT s.id,s.mode,s.created_at AS createdAt,s.completed_at AS completedAt,
        json_array_length(s.questions) AS total, COUNT(a.id) AS answered, COALESCE(SUM(a.correct),0) AS correct
      FROM sessions s LEFT JOIN attempts a ON a.session_id=s.id
      WHERE s.certification=? AND s.status='completed'
      GROUP BY s.id ORDER BY s.completed_at DESC LIMIT 20
    `).all(cert.id);
    const domains = cert.domains.map(d => {
      const ids = new Set(cert.lessons.filter(l => l.domain === d.id).map(l => l.id));
      const rows = progress.filter(p => ids.has(p.lessonId));
      const total = rows.reduce((n, p) => n + p.attempts, 0);
      const correct = rows.reduce((n, p) => n + p.correct, 0);
      return { ...d, attempts: total, correct, accuracy: total ? Math.round(correct / total * 100) : null, seen: rows.filter(p => p.attempts).length, total: rows.length };
    });
    const recent = attempts.slice(-20);
    const days = new Map();
    for (const a of attempts) {
      const day = a.created_at.slice(0, 10);
      const row = days.get(day) ?? { day, attempts: 0, correct: 0 };
      row.attempts++; row.correct += a.correct; days.set(day, row);
    }
    res.json({
      attempts: attempts.length, correct: attempts.reduce((n, a) => n + a.correct, 0),
      seen: progress.filter(p => p.attempts).length, total: progress.length,
      due: progress.filter(p => p.due).length,
      difficult: progress.filter(p => p.difficulty === 3 || p.lastCorrect === false).length,
      recentAccuracy: recent.length ? Math.round(recent.reduce((n, a) => n + a.correct, 0) / recent.length * 100) : null,
      timeMs: attempts.reduce((n, a) => n + a.duration_ms, 0),
      ratings: [1, 2, 3].map(difficulty => ({ difficulty, count: attempts.filter(a => a.difficulty === difficulty).length })),
      domains, questions: progress, history, days: [...days.values()].slice(-14),
    });
  });
  app.post('/api/sessions', (req, res) => {
    expire();
    const { certification, mode, filter = 'all', order = 'stable', lessonId = '', count = 10, minutes = 45 } = req.body ?? {};
    const cert = certById(certification);
    check(['practice', 'exam'].includes(mode), 'Modo inválido.');
    check(['all', 'mistakes', 'difficult', 'unseen', 'due'].includes(filter), 'Filtro inválido.');
    check(['stable', 'hardest', 'random', 'due'].includes(order), 'Orden inválido.');
    check(Number.isInteger(count) && count >= 1 && count <= 60, 'Cantidad inválida (1–60).');
    check(mode !== 'exam' || count <= 40, 'El banco inicial permite simulacros de hasta 40 preguntas manteniendo la distribución.');
    check(Number.isInteger(minutes) && minutes >= 1 && minutes <= 180, 'Duración inválida.');
    check(!lessonId || cert.lessons.some(l => l.id === lessonId), 'Tema inválido.');
    check(mode !== 'exam' || (!lessonId && filter === 'all'), 'El simulacro debe abarcar todos los temas.');
    const active = db.prepare("SELECT id FROM sessions WHERE certification=? AND status='active' AND mode=?").get(cert.id, mode);
    check(!active, 'Ya tienes una sesión activa de este modo. Reanúdala o finalízala antes de crear otra.', 409);
    const selected = selectQuestions(cert, questionProgress(cert.questions, getAttempts(cert.id)), { mode, filter, order, lessonId, count });
    check(selected.length, 'No hay preguntas que coincidan. Prueba otro filtro o realiza un diagnóstico inicial.');
    const id = randomUUID();
    const created = now();
    const deadline = mode === 'exam' ? new Date(Date.now() + minutes * 60000).toISOString() : null;
    db.prepare('INSERT INTO sessions(id,certification,mode,questions,created_at,deadline) VALUES(?,?,?,?,?,?)')
      .run(id, cert.id, mode, JSON.stringify(selected), created, deadline);
    res.status(201).json(publicSession(getSession(id)));
  });
  app.get('/api/sessions/:id', (req, res) => res.json(publicSession(getSession(req.params.id))));
  app.post('/api/sessions/:id/answer', (req, res) => {
    const session = getSession(req.params.id);
    check(session.status === 'active', 'La sesión ya terminó.', 409);
    const question = JSON.parse(session.questions)[session.cursor];
    check(question, 'No hay una pregunta pendiente.', 409);
    const { questionId, selected, difficulty, durationMs } = req.body ?? {};
    check(questionId === question.id, 'La pregunta cambió; recarga la sesión.', 409);
    check(Number.isInteger(selected) && selected >= 0 && selected < question.options.length, 'Elige una respuesta válida.');
    check([1, 2, 3].includes(difficulty), 'Indica si te resultó fácil, media o difícil.');
    check(Number.isInteger(durationMs) && durationMs >= 0 && durationMs <= 86400000, 'Tiempo de respuesta inválido.');
    const existing = db.prepare('SELECT * FROM attempts WHERE session_id=? AND question_id=?').get(session.id, question.id);
    if (existing) {
      check(existing.selected === selected && existing.difficulty === difficulty, 'Esta respuesta ya está registrada.', 409);
      return res.json(publicSession(session));
    }
    db.prepare('INSERT INTO attempts(session_id,question_id,selected,difficulty,correct,duration_ms,created_at) VALUES(?,?,?,?,?,?,?)')
      .run(session.id, question.id, selected, difficulty, Number(selected === question.answer), durationMs, now());
    res.json(publicSession(getSession(session.id)));
  });
  app.post('/api/sessions/:id/next', (req, res) => {
    const session = getSession(req.params.id);
    check(session.status === 'active', 'La sesión ya terminó.', 409);
    const { cursor } = req.body ?? {};
    check(cursor === session.cursor, 'La sesión avanzó en otra pestaña. Recárgala.', 409);
    const questions = JSON.parse(session.questions);
    check(db.prepare('SELECT id FROM attempts WHERE session_id=? AND question_id=?').get(session.id, questions[cursor].id), 'Responde antes de continuar.');
    if (cursor === questions.length - 1) {
      db.prepare("UPDATE sessions SET status='completed', completed_at=? WHERE id=?").run(now(), session.id);
    } else {
      db.prepare('UPDATE sessions SET cursor=cursor+1 WHERE id=?').run(session.id);
    }
    res.json(publicSession(getSession(session.id)));
  });
  app.post('/api/sessions/:id/finish', (req, res) => {
    const session = getSession(req.params.id);
    if (session.status === 'active') db.prepare("UPDATE sessions SET status='completed', completed_at=? WHERE id=?").run(now(), session.id);
    res.json(publicSession(getSession(session.id)));
  });
  app.get('/api/export', (req, res) => {
    expire();
    res.set('Content-Disposition', 'attachment; filename="certifica-progreso.json"').json({
      version: 1, exportedAt: now(),
      settings: db.prepare('SELECT * FROM settings').all(),
      study: db.prepare('SELECT * FROM study').all(),
      sessions: db.prepare('SELECT * FROM sessions').all(),
      attempts: db.prepare('SELECT * FROM attempts').all(),
    });
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
  const errorHandler = (error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Solicitud demasiado grande.' });
    console.error(error);
    res.status(500).json({ error: 'No se pudo completar la operación. Revisa el registro del servidor.' });
  };
  app.use(errorHandler);
  return { app, db };
}
