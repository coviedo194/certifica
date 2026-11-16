import { randomInt } from 'node:crypto';

export function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function questionProgress(questions, attempts, now = Date.now()) {
  const byId = new Map(questions.map(q => [q.id, []]));
  for (const a of attempts) byId.get(a.question_id)?.push(a);
  return questions.map(q => {
    const history = byId.get(q.id);
    let box = 0;
    let dueAt = null;
    for (const a of history) {
      box = !a.correct || a.difficulty === 3 ? 0 : a.difficulty === 2 ? Math.min(1, box) : Math.min(5, box + 1);
      const interval = [10 / 1440, 1, 3, 7, 14, 30][box];
      dueAt = new Date(Date.parse(a.created_at) + interval * 86400000).toISOString();
    }
    const last = history.at(-1);
    const correct = history.reduce((n, a) => n + a.correct, 0);
    return {
      id: q.id, lessonId: q.lessonId, stem: q.stem, attempts: history.length, correct,
      accuracy: history.length ? Math.round(correct / history.length * 100) : null,
      lastCorrect: last ? Boolean(last.correct) : null,
      difficulty: last?.difficulty ?? null,
      averageDifficulty: history.length ? history.reduce((n, a) => n + a.difficulty, 0) / history.length : null,
      dueAt, due: dueAt !== null && Date.parse(dueAt) <= now, box,
      priority: last ? (1 - correct / history.length) * 60 + last.difficulty * 20 + (!last.correct ? 30 : 0) : 0,
    };
  });
}

export function selectQuestions(cert, progress, { mode, filter, order, lessonId, count }) {
  const stats = new Map(progress.map(p => [p.id, p]));
  let pool = cert.questions.filter(q => !lessonId || q.lessonId === lessonId);
  if (mode === 'practice') {
    pool = pool.filter(q => {
      const p = stats.get(q.id);
      if (filter === 'mistakes') return p.lastCorrect === false;
      if (filter === 'difficult') return p.difficulty === 3 || p.lastCorrect === false;
      if (filter === 'unseen') return !p.attempts;
      if (filter === 'due') return p.due;
      return true;
    });
  }
  if (mode === 'exam') {
    // Largest remainder allocation keeps a 40-item exam at 11/11/18, inside the official ranges.
    const allocations = cert.domains.map(d => {
      const exact = count * d.share;
      return { id: d.id, n: Math.floor(exact), remainder: exact % 1 };
    });
    const remaining = count - allocations.reduce((n, a) => n + a.n, 0);
    const ranked = [...allocations].sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; i < remaining; i++) ranked[i].n++;
    const lessons = new Map(cert.lessons.map(l => [l.id, l]));
    const selected = allocations.flatMap(a => shuffle(pool.filter(q => lessons.get(q.lessonId).domain === a.id)).slice(0, a.n));
    if (selected.length !== count) throw new Error('Banco insuficiente para mantener la distribución del simulacro.');
    return shuffle(selected);
  }
  if (order === 'random') pool = shuffle(pool);
  if (order === 'hardest') pool.sort((a, b) => stats.get(b.id).priority - stats.get(a.id).priority);
  if (order === 'due') pool.sort((a, b) => {
    const x = stats.get(a.id); const y = stats.get(b.id);
    return Number(y.due) - Number(x.due) || (x.dueAt ?? '9999').localeCompare(y.dueAt ?? '9999');
  });
  return pool.slice(0, count);
}
