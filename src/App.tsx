import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowDownUp, ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight,
  CircleHelp, Clock3, Database, Download, ExternalLink, Flame, GraduationCap,
  LayoutDashboard, Layers3, ListChecks, LoaderCircle, Monitor, Moon, Play,
  RotateCcw, Settings2, ShieldCheck, Sparkles, Sun, Target, TrendingUp, X, XCircle,
  BookmarkCheck, ChartNoAxesCombined, LibraryBig, Maximize2, Minimize2,
} from 'lucide-react';
import { api } from './api';
import ReadingAudio from './ReadingAudio';
import type { AppState, Mode, PracticeConfig, Session, Source, Stats, StudyImage, Theme } from './types';

const navigation = [
  { id: 'home', title: 'Mi espacio', icon: LayoutDashboard },
  { id: 'study', title: 'Ruta de estudio', icon: BookOpen },
  { id: 'practice', title: 'Practicar', icon: ListChecks },
  { id: 'stats', title: 'Mi progreso', icon: ChartNoAxesCombined },
  { id: 'sources', title: 'Biblioteca de fuentes', icon: LibraryBig },
];
const ratingLabels = ['Fácil', 'Media', 'Difícil'];
const percent = (n: number | null) => n === null ? '—' : `${n}%`;
const date = (value: string) => new Date(value).toLocaleDateString('es', { day: 'numeric', month: 'short' });
function go(route: string) { window.location.hash = route; }
function Progress({ value, color }: { value: number; color?: string }) {
  return <div className="progress-track"><span style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} /></div>;
}
function Tag({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={`tag ${tone}`}>{children}</span>;
}
function Empty({ title, children }: { title: string; children: ReactNode }) {
  return <div className="empty"><CircleHelp size={27} /><h3>{title}</h3><p>{children}</p></div>;
}
function SourceLinks({ ids, sources }: { ids: string[]; sources: Source[] }) {
  return <div className="source-links">{ids.map(id => {
    const source = sources.find(s => s.id === id);
    return source && <a key={id} href={source.url} target="_blank" rel="noreferrer">
      <ExternalLink size={13} /><span>{source.title}</span><small>{source.kind === 'official' ? 'Oficial' : 'Comunidad · no oficial'}</small>
    </a>;
  })}</div>;
}

export default function App() {
  const [route, setRoute] = useState(location.hash.slice(1) || 'home');
  const [state, setState] = useState<AppState | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [readingFocus, setReadingFocus] = useState(false);
  const refresh = useCallback(async () => {
    const next = await api<AppState>('/state');
    const metrics = await api<Stats>(`/stats/${next.certification.id}`);
    setState(next); setStats(metrics);
  }, []);
  useEffect(() => {
    const onHash = () => { setRoute(location.hash.slice(1) || 'home'); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    if (!route.startsWith('study/')) setReadingFocus(false);
  }, [route]);
  useEffect(() => {
    const update = () => refresh().catch(error => setError(error.message));
    update();
    const timer = setInterval(update, 60000);
    window.addEventListener('focus', update);
    return () => { clearInterval(timer); window.removeEventListener('focus', update); };
  }, [route, refresh]);
  const act = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); } catch (error) { setError(error instanceof Error ? error.message : 'Error desconocido.'); }
    finally { setBusy(false); }
  };
  const theme = state?.settings.theme ?? 'system';
  useEffect(() => {
    const query = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = theme === 'system' ? (query.matches ? 'dark' : 'light') : theme; };
    apply(); query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [theme]);
  const saveTheme = (value: Theme) => act(async () => { await api('/settings', 'PATCH', { theme: value }); await refresh(); });
  const section = route.split('/')[0];
  const start = (config: PracticeConfig) => act(async () => {
    const session = await api<Session>('/sessions', 'POST', { certification: state!.certification.id, ...config });
    await refresh(); go(`quiz/${session.id}`);
  });
  if (!state || !stats) return <div className="boot"><Layers3 size={36} /><h1>Certifica</h1>
    {error ? <><p role="alert">{error}</p><button onClick={() => act(refresh)}>Reintentar</button></> : <p><LoaderCircle className="spin" size={16} /> Preparando tu espacio…</p>}</div>;
  const cert = state.certification;
  const reading = section === 'study' && cert.lessons.some(lesson => lesson.id === route.split('/')[1]);
  const focused = readingFocus && reading;
  const title = section === 'quiz' ? 'Sesión de práctica' : section === 'settings' ? 'Configuración' : navigation.find(n => n.id === section)?.title ?? 'Mi espacio';
  return <div className={`app-shell${reading ? ' reading-session' : ''}${focused ? ' reading-focus' : ''}`}>
    <aside className="sidebar">
      <a className="brand" href="#home"><span className="brand-icon"><Layers3 size={24} /></span>certifica<span className="brand-dot">.</span></a>
      <div className="sidebar-cert"><span className="eyebrow">TU OBJETIVO</span><strong><GraduationCap size={19} />{cert.code}<span className="tiny-dot" /></strong><span>Intelligent Applications<br />Builder Associate</span></div>
      <span className="nav-label">APRENDE A TU RITMO</span>
      <nav aria-label="Navegación principal">{navigation.map(item => <a href={`#${item.id}`} key={item.id} aria-label={item.title} title={item.title} className={(section === item.id || section === 'quiz' && item.id === 'practice') ? 'active' : ''}>
        <item.icon size={18} /><span>{item.title}</span>{item.id === 'practice' && stats.due > 0 && <span className="nav-count">{stats.due}</span>}
      </a>)}</nav>
      <div className="sidebar-bottom">
        <div className="local-note"><ShieldCheck size={18} /><div><strong>Tu progreso, solo tuyo</strong><span>Guardado en SQLite local</span></div></div>
        <a href="#settings" className={`settings-link ${section === 'settings' ? 'active' : ''}`}><Settings2 size={17} />Configuración</a>
        <div className="theme-switch" aria-label="Tema de la aplicación">{([{ id: 'light', icon: Sun, name: 'Claro' }, { id: 'dark', icon: Moon, name: 'Oscuro' }, { id: 'system', icon: Monitor, name: 'Sistema' }] as const).map(item =>
          <button key={item.id} title={item.name} aria-label={`Tema ${item.name.toLowerCase()}`} aria-pressed={theme === item.id} disabled={busy} onClick={() => saveTheme(item.id)} className={theme === item.id ? 'selected' : ''}><item.icon size={15} /><span>{item.name}</span></button>)}</div>
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div><span className="muted">Mi aprendizaje</span><ChevronRight size={13} /><strong>{title}</strong></div><div className="topbar-right"><span className="status-dot" />Espacio personal<a className="avatar" href="#settings" aria-label="Abrir configuración">TÚ</a></div></header>
      <main>
        {error && <div className="error-banner" role="alert"><XCircle size={19} /><span>{error}</span><button aria-label="Cerrar error" onClick={() => setError(null)}><X size={17} /></button></div>}
        {section === 'home' && <Home state={state} stats={stats} start={start} busy={busy} />}
        {section === 'study' && <Study key={route} state={state} lessonId={route.split('/')[1]} busy={busy} act={act} refresh={refresh} focused={focused} onFocusChange={setReadingFocus} />}
        {section === 'practice' && <Practice key={route} state={state} stats={stats} initialFilter={route.split('/')[1]} start={start} busy={busy} />}
        {section === 'quiz' && <Quiz key={route} id={route.split('/')[1]} state={state} busy={busy} act={act} refresh={refresh} />}
        {section === 'stats' && <Statistics stats={stats} state={state} />}
        {section === 'sources' && <Sources state={state} />}
        {section === 'settings' && <Settings state={state} busy={busy} act={act} refresh={refresh} />}
        {!['home', 'study', 'practice', 'quiz', 'stats', 'sources', 'settings'].includes(section) && <Empty title="Esta página no existe"><a href="#home">Volver a mi espacio</a></Empty>}
        <footer className="page-footer"><span><Layers3 size={13} /> Hecho para aprender, no para memorizar respuestas.</span><span>{cert.code} · Contenido no oficial · Revisado {date(cert.reviewed)}</span></footer>
      </main>
    </div>
  </div>;
}

function Home({ state, stats, start, busy }: { state: AppState; stats: Stats; start: (c: PracticeConfig) => void; busy: boolean }) {
  const cert = state.certification;
  const active = state.active.find(s => s.mode === 'exam') ?? state.active[0];
  const nextId = state.lastStudy && !state.study.find(s => s.lessonId === state.lastStudy)?.completed
    ? state.lastStudy : cert.recommended.find(id => !state.study.find(s => s.lessonId === id)?.completed);
  const pendingPractice = [...state.study]
    .filter(s => s.completed && !stats.questions.some(q => q.lessonId === s.lessonId && q.attempts > 0))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const next = cert.lessons.find(l => l.id === nextId);
  const progress = state.study.find(s => s.lessonId === next?.id);
  const firstVisit = !state.study.length && !stats.attempts && !active;
  const practice = (filter: string, lessonId = '') => start({
    mode: 'practice', filter, order: filter === 'due' ? 'due' : filter === 'difficult' ? 'hardest' : 'random',
    lessonId, count: lessonId ? 5 : 10, minutes: 45,
  });
  let step = {
    title: !state.study.length ? 'Empieza por Copilot Studio.' : 'Tu siguiente paso, sin rodeos.',
    description: !state.study.length
      ? 'Ya conoces Power Platform. Vamos a conectar esa experiencia con agentes e IA.'
      : 'Sigue con una lectura breve y una idea concreta para poner en práctica.',
    label: progress ? 'CONTINÚA TU LECCIÓN' : 'TU PRÓXIMA LECCIÓN',
    detail: next?.blocks[progress?.blockIndex ?? 0].title ?? '',
    context: next ? `${next.title} · ${next.minutes} min de lectura estimada` : '',
    button: progress ? 'Continuar mi estudio' : state.study.length ? 'Comenzar siguiente lección' : 'Comenzar primera lección',
    stage: 0,
    action: () => go(`study/${next!.id}`),
  };
  if (active && (active.mode === 'exam' || !next)) {
    step = {
      title: active.mode === 'exam' ? 'Tu simulacro sigue en marcha.' : 'Retoma tu práctica.',
      description: active.mode === 'exam'
        ? 'El tiempo sigue contando aunque salgas de la página. Vuelve a tu sesión para continuar o finalizarla.'
        : 'Tu sesión está guardada. Continúa en la misma pregunta, sin perder tus respuestas.',
      label: 'SESIÓN EN CURSO',
      detail: active.mode === 'exam' ? 'Simulacro sin pistas' : 'Práctica con explicaciones',
      context: `Pregunta ${active.cursor + 1} · iniciada el ${date(active.createdAt)}`,
      button: active.mode === 'exam' ? 'Retomar simulacro' : 'Retomar práctica', stage: 1,
      action: () => go(`quiz/${active.id}`),
    };
  } else if (active) {
    step.description = `Puedes ${progress ? 'seguir estudiando' : 'empezar a estudiar'}. Tu práctica seguirá guardada para retomarla cuando quieras.`;
  } else if (stats.due > 0) {
    step = {
      title: 'Un pequeño repaso, antes de seguir.',
      description: 'Vuelve a lo que te costó para afianzarlo. La siguiente lección puede esperar.',
      label: 'TOCA REFORZAR', detail: 'Repaso de preguntas pendientes',
      context: `${Math.min(10, stats.due)} ${stats.due === 1 ? 'pregunta' : 'preguntas'} · a tu ritmo`,
      button: 'Comenzar repaso', stage: 2, action: () => practice('due'),
    };
  } else if (pendingPractice) {
    step = {
      title: 'Ahora, ponlo en práctica.',
      description: 'Ya recorriste la lección. Unas preguntas te ayudarán a comprobar qué has entendido y qué conviene repasar.',
      label: 'DE LEER A RECORDAR',
      detail: cert.lessons.find(l => l.id === pendingPractice.lessonId)!.title,
      context: '5 preguntas del módulo · con explicaciones',
      button: 'Practicar esta lección', stage: 1, action: () => practice('all', pendingPractice.lessonId),
    };
  } else if (!next) {
    step = {
      title: 'Sigue afianzando lo aprendido.',
      description: 'Has recorrido los módulos. Ahora practica y vuelve a los conceptos que necesiten más atención.',
      label: 'TU SIGUIENTE PRÁCTICA',
      detail: stats.difficult ? 'Preguntas que te cuestan más' : 'Práctica de todo el temario',
      context: 'Hasta 10 preguntas · a tu ritmo',
      button: 'Comenzar práctica', stage: 1, action: () => practice(stats.difficult ? 'difficult' : 'all'),
    };
  }
  return <section className="home-focus" aria-labelledby="home-title">
    <span className="eyebrow">{cert.code} · UN PASO CADA VEZ</span>
    <h1 id="home-title">{step.title}</h1>
    <p className="home-description">{step.description}</p>
    <div className="home-next">
      <span className="card-icon">{step.stage === 0 ? <BookOpen size={22} /> : step.stage === 2 ? <RotateCcw size={22} /> : <ListChecks size={22} />}</span>
      <div><span className="eyebrow">{step.label}</span><h2>{step.detail}</h2><p>{step.context}</p></div>
    </div>
    <button className="primary home-primary" disabled={busy} onClick={step.action}>{step.button}<ArrowRight size={18} /></button>
    <p className="home-save"><Database size={13} />Tu avance se guarda en este equipo.</p>
    {active?.mode === 'practice' && step.stage === 0 && <p className="home-alternative"><a href={`#quiz/${active.id}`}>Retomar práctica guardada</a></p>}
    {step.stage !== 0 && <p className="home-alternative"><a href={next ? `#study/${next.id}` : '#study'}>{next ? progress ? 'Continuar mi estudio' : 'Quiero estudiar primero' : 'Volver a la ruta de estudio'}</a></p>}
    {firstVisit && <p className="home-alternative">¿Prefieres probarte primero? <button disabled={busy} onClick={() => practice('all')}>Hacer un diagnóstico breve</button></p>}
    <ol className="home-method" aria-label="Método de estudio">{['Entender', 'Practicar', 'Repasar'].map((label, i) => <li key={label} aria-current={step.stage === i ? 'step' : undefined}><span>{i + 1}</span>{label}{i < 2 && <ChevronRight size={13} aria-hidden="true" />}</li>)}</ol>
  </section>;
}
function Metric({ icon, title, value, detail }: { icon: ReactNode; title: string; value: string; detail: string }) {
  return <div className="metric"><div>{icon}<span>{title}</span></div><strong>{value}</strong><small>{detail}</small></div>;
}
type Action = (fn: () => Promise<void>) => Promise<void>;
function LessonText({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*\n]+\*\*)/g).map((part, i) => i % 2
    ? <strong key={i}>{part.slice(2, -2)}</strong> : part)}</>;
}
function StudyFigure({ image, sources }: { image: StudyImage; sources: Source[] }) {
  const [failed, setFailed] = useState(false);
  const source = sources.find(item => item.id === image.source)!;
  return <figure className="study-figure">
    {failed ? <p role="alert">No se pudo cargar la captura. Puedes consultarla en la fuente oficial.</p>
      : <a className="study-figure-preview" href={image.src} target="_blank" rel="noreferrer" aria-label="Abrir captura a tamaño original">
        <img src={image.src} width={image.width} height={image.height} alt={image.alt} loading="lazy" onError={() => setFailed(true)} />
      </a>}
    <figcaption><p>{image.caption}</p><small>
      Captura de {image.attribution} · <a href={source.url} target="_blank" rel="noreferrer">Fuente oficial</a>
      {' · '}<a href={image.licenseUrl} target="_blank" rel="noreferrer">{image.license}</a>
      {' · '}Consultada {date(image.reviewed)}. La interfaz puede variar en tu entorno.
    </small></figcaption>
  </figure>;
}
function Study({ state, lessonId, busy, act, refresh, focused, onFocusChange }: { state: AppState; lessonId?: string; busy: boolean; act: Action; refresh: () => Promise<void>; focused: boolean; onFocusChange: (value: boolean) => void }) {
  const cert = state.certification;
  const [recommended, setRecommended] = useState(true);
  const lesson = cert.lessons.find(l => l.id === lessonId);
  const saved = state.study.find(s => s.lessonId === lesson?.id);
  const [index, setIndex] = useState(saved?.blockIndex ?? 0);
  const [showRecall, setShowRecall] = useState(false);
  const [readingError, setReadingError] = useState('');
  const focusButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!focused) return;
    const exit = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onFocusChange(false);
      focusButton.current?.focus();
    };
    window.addEventListener('keydown', exit);
    return () => window.removeEventListener('keydown', exit);
  }, [focused, onFocusChange]);
  useEffect(() => {
    if (!lesson || saved) return;
    api(`/study/${cert.id}/${lesson.id}`, 'PUT', { blockIndex: 0, completed: false })
      .then(refresh).catch(e => setReadingError(e.message));
  }, [lesson?.id, saved?.lessonId, cert.id, refresh]);
  const save = async (blockIndex: number, completed: boolean) => {
    await api(`/study/${cert.id}/${lesson!.id}`, 'PUT', { blockIndex, completed });
    await refresh(); setIndex(blockIndex); setShowRecall(false);
  };
  if (!lesson) {
    const ordered = recommended ? cert.recommended.map(id => cert.lessons.find(l => l.id === id)!) : cert.lessons;
    return <><PageTitle eyebrow="CONOCIMIENTO QUE SE QUEDA" title="Tu ruta de estudio" text="Doce módulos cortos. Decisiones claras, trampas frecuentes y un reto para pasar de entender a saber hacerlo." />
      <details className="compact-help"><summary>Por qué este orden de estudio</summary><p>Power Platform como base; agentes, AI Hub e integración como prioridad. El orden recomendado no marca ningún tema como dominado.</p></details>
      <div className="section-heading"><span className="muted">{state.study.filter(s => s.completed).length} / {cert.lessons.length} completados · {cert.lessons.reduce((n, l) => n + l.minutes, 0)} min de lectura estimada</span><button className="subtle" onClick={() => setRecommended(!recommended)}><ArrowDownUp size={15} />{recommended ? 'Ruta recomendada' : 'Orden del temario'}</button></div>
      <div className="lesson-list">{ordered.map((l, i) => {
        const p = state.study.find(s => s.lessonId === l.id);
        const domain = cert.domains.find(d => d.id === l.domain)!;
        return <a href={`#study/${l.id}`} className="lesson-row" key={l.id}><span className={`lesson-index ${p?.completed ? 'done' : ''}`}>{p?.completed ? <Check size={18} /> : String(i + 1).padStart(2, '0')}</span><div className="lesson-name"><span className="eyebrow" style={{ color: domain.color }}>{domain.title}</span><h3>{l.title}</h3><p>{l.objectives.slice(0, 2).join(' · ')}</p></div><div className="lesson-end">{l.focus && <Tag tone="green">Foco IA</Tag>}<span><Clock3 size={13} />{l.minutes} min</span>{p && <small>{p.completed ? 'Completado' : `Sección ${p.blockIndex + 1}/${l.blocks.length}`}</small>}</div><ChevronRight size={18} /></a>;
      })}</div></>;
  }
  const b = lesson.blocks[index];
  const nextLesson = cert.recommended[cert.recommended.indexOf(lesson.id) + 1];
  return <>
    {readingError && <div className="error-banner" role="alert">No se pudo guardar el punto de lectura: {readingError}</div>}
    <details className="study-context"><summary aria-label="Módulo e índice"><ChevronRight size={15} aria-hidden="true" /><span>Módulo e índice</span><strong>{lesson.title}</strong></summary>
      <div className="study-context-body">
        <div className="study-heading"><span className="eyebrow">{cert.domains.find(d => d.id === lesson.domain)?.title} · {lesson.minutes} MIN</span>{Boolean(saved?.completed) && <Tag tone="green"><CheckCircle2 size={14} />Completado</Tag>}</div>
        <a className="text-link back-link" href="#study"><ArrowLeft size={15} />Toda la ruta</a>
        <nav className="study-outline" aria-label="Secciones del módulo">{lesson.blocks.map((block, i) => <button key={i} disabled={busy} aria-current={i === index ? 'step' : undefined} className={i === index ? 'current' : ''} onClick={() => act(() => save(i, Boolean(saved?.completed)))}><span>{String(i + 1).padStart(2, '0')}</span>{block.title}{block.kind === 'lab' && <Flame size={13} />}</button>)}</nav>
      </div>
    </details>
    <div className="study-content">
        <article className={`reading-card ${b.kind}`}>
          <div className="reading-toolbar reading-card-toolbar">
            <span className="reading-symbol">{b.kind === 'lab' ? <Flame size={23} /> : b.kind === 'recall' ? <CircleHelp size={23} /> : b.kind === 'trap' ? <ShieldCheck size={23} /> : <BookOpen size={23} />}</span>
            <ReadingAudio title={b.title} body={b.body} />
            <button ref={focusButton} className="subtle" aria-label={focused ? 'Salir del modo enfoque' : 'Modo enfoque'} title={focused ? 'Salir del modo enfoque' : 'Modo enfoque'} aria-pressed={focused} aria-keyshortcuts={focused ? 'Escape' : undefined} onClick={() => onFocusChange(!focused)}>
              {focused ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              <span>{focused ? 'Salir del modo enfoque' : 'Modo enfoque'}</span>{focused && <kbd>Esc</kbd>}
            </button>
          </div>
          <Tag>{b.kind === 'lab' ? 'APLICA LO QUE SABES' : b.kind === 'recall' ? 'RECUERDA SIN MIRAR' : b.kind === 'trap' ? 'ERROR FRECUENTE' : 'LO ESENCIAL'}</Tag><h1>{b.title}</h1><p><LessonText text={b.body} /></p>
          {b.image && <StudyFigure key={b.image.src} image={b.image} sources={cert.sources} />}
          {b.kind === 'recall' && <><button className="subtle" onClick={() => setShowRecall(!showRecall)}>{showRecall ? 'Ocultar guía' : 'Ya lo pensé · ver cómo comprobarlo'}<ChevronRight size={15} /></button>{showRecall && <div className="recall-guide">Comprueba tu explicación contra los conceptos anteriores y sus fuentes. Debes poder justificar la elección, descartar otra alternativa y describir un caso en el que tu decisión cambiaría. Si no puedes, repasa antes de avanzar.</div>}</>}
        </article>
        <div className="reading-progress"><div className="reading-meta"><span>SECCIÓN {index + 1} DE {lesson.blocks.length}</span><span>{Math.round((index + 1) / lesson.blocks.length * 100)}%</span></div><Progress value={(index + 1) / lesson.blocks.length * 100} /></div>
        <div className="reading-actions"><button disabled={busy || index === 0} onClick={() => act(() => save(index - 1, Boolean(saved?.completed)))}><ArrowLeft size={16} />Anterior</button>{index < lesson.blocks.length - 1
          ? <button className="primary" disabled={busy} onClick={() => act(() => save(index + 1, Boolean(saved?.completed)))}>Siguiente sección<ArrowRight size={16} /></button>
          : <button className="primary" disabled={busy} onClick={() => act(async () => { await save(index, true); if (nextLesson) go(`study/${nextLesson}`); else go('study'); })}><BookmarkCheck size={16} />Completar módulo{nextLesson && ' y seguir'}</button>}</div>
        <div className="reading-save"><Database size={14} />{saved ? 'Punto de lectura guardado' : 'Se guarda al avanzar'}</div>
        <div className="study-extras"><details className="objectives"><summary>Aptitudes que cubre este módulo</summary><ul>{lesson.objectives.map(o => <li key={o}>{o}</li>)}</ul></details>
        <h4>Comprueba en la fuente</h4><SourceLinks ids={lesson.sources} sources={cert.sources} />
        <p className="fine-print">Síntesis original no oficial. Lectura completada no equivale a dominio demostrado.</p>
        <a className="text-link" href={`#practice/lesson-${lesson.id}`}>Practicar este módulo<ArrowRight size={16} /></a></div>
    </div>
  </>;
}
function PageTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <div className="page-title"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>;
}

function Practice({ state, stats, initialFilter, start, busy }: { state: AppState; stats: Stats; initialFilter?: string; start: (c: PracticeConfig) => void; busy: boolean }) {
  const [mode, setMode] = useState<Mode>('practice');
  const [filter, setFilter] = useState(['all', 'mistakes', 'difficult', 'unseen', 'due'].includes(initialFilter ?? '') ? initialFilter! : 'all');
  const [order, setOrder] = useState(initialFilter === 'difficult' ? 'hardest' : 'stable');
  const [lessonId, setLessonId] = useState(initialFilter?.startsWith('lesson-') ? initialFilter.slice(7) : '');
  const [count, setCount] = useState(10);
  const [minutes, setMinutes] = useState(45);
  const active = state.active.find(s => s.mode === mode);
  const available = stats.questions.filter(q => {
    if (lessonId && lessonId !== q.lessonId) return false;
    if (filter === 'mistakes') return q.lastCorrect === false;
    if (filter === 'difficult') return q.difficulty === 3 || q.lastCorrect === false;
    if (filter === 'unseen') return !q.attempts;
    if (filter === 'due') return q.due;
    return true;
  }).length;
  return <><PageTitle eyebrow="SABERLO ES PODER EXPLICARLO" title="Ponte a prueba" text="Equivocarte aquí es parte del plan. Cada respuesta afina tu siguiente sesión." />
    <div className="mode-grid"><button className={`mode-card ${mode === 'practice' ? 'chosen' : ''}`} onClick={() => setMode('practice')}><span className="card-icon"><Sparkles size={23} /></span><div><h3>Práctica a tu ritmo</h3><p>Feedback inmediato, explicaciones y filtros para trabajar justo lo que necesitas.</p></div><span className="radio-dot" /></button><button className={`mode-card ${mode === 'exam' ? 'chosen' : ''}`} onClick={() => { setMode('exam'); setCount(40); }}><span className="card-icon"><Clock3 size={23} /></span><div><h3>Simulacro de examen</h3><p>Con tiempo y sin pistas. Resultados y explicaciones solo al finalizar.</p></div><span className="radio-dot" /></button></div>
    {active ? <div className="config-card"><Tag tone="green">SESIÓN GUARDADA</Tag><h2>Lo que empezaste sigue aquí.</h2><p>Tienes una sesión de {mode === 'exam' ? 'simulacro' : 'práctica'} en curso, iniciada el {date(active.createdAt)}. Reanúdala o finalízala antes de iniciar otra de este modo.</p><button className="primary" onClick={() => go(`quiz/${active.id}`)}>Retomar sesión<ArrowRight size={16} /></button></div>
      : <section className="config-card"><div className="section-heading"><h2>Diseña tu sesión</h2><Tag>{mode === 'exam' ? 'DISTRIBUCIÓN POR ÁREAS' : `${available} DISPONIBLES`}</Tag></div>
        {mode === 'practice' && <div className="form-grid"><label>Qué quieres practicar<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Todo el banco</option><option value="difficult">Lo que me cuesta (difíciles o falladas)</option><option value="mistakes">Mi última respuesta fue incorrecta</option><option value="due">Repasos vencidos</option><option value="unseen">Solo preguntas nuevas</option></select></label><label>Orden de las preguntas<select value={order} onChange={e => setOrder(e.target.value)}><option value="stable">Orden fijo del temario</option><option value="hardest">Mayor dificultad primero</option><option value="random">Aleatorio</option><option value="due">Vencimiento del repaso</option></select></label><label>Tema<select value={lessonId} onChange={e => setLessonId(e.target.value)}><option value="">Todos los módulos</option>{state.certification.lessons.map(l => <option value={l.id} key={l.id}>{l.title}</option>)}</select></label><label>Preguntas por sesión<select value={count} onChange={e => setCount(Number(e.target.value))}>{[5, 10, 20, 40, 60].map(n => <option key={n} value={n}>{n} preguntas</option>)}</select></label></div>}
        {mode === 'exam' && <><div className="info-banner"><ShieldCheck size={20} /><p>Simulacro local no oficial. Con 40 preguntas se eligen 11 de fundamentos, 11 de aplicaciones y 18 de automatización. La duración es de entrenamiento, no una afirmación sobre el examen real. Las preguntas no contestadas cuentan en el total.</p></div><div className="form-grid"><label>Número de preguntas<select value={count} onChange={e => setCount(Number(e.target.value))}>{[10, 20, 40].map(n => <option key={n} value={n}>{n} preguntas</option>)}</select></label><label>Tiempo de entrenamiento<select value={minutes} onChange={e => setMinutes(Number(e.target.value))}>{[15, 30, 45, 60, 90].map(n => <option key={n} value={n}>{n} minutos</option>)}</select></label></div></>}
        <div className="config-bottom"><span className="muted">{mode === 'practice' ? `${Math.min(count, available)} preguntas · sin límite de tiempo` : `${count} preguntas · ${minutes} minutos · sin feedback hasta el final`}</span><button className="primary" disabled={busy || mode === 'practice' && !available} onClick={() => start({ mode, filter: mode === 'exam' ? 'all' : filter, order, lessonId: mode === 'exam' ? '' : lessonId, count, minutes })}><Play size={16} />Comenzar {mode === 'exam' ? 'simulacro' : 'práctica'}</button></div>
        {mode === 'practice' && !available && <p className="fine-print">No hay coincidencias. Si estás empezando, prueba «Todo el banco» o «Solo preguntas nuevas».</p>}
      </section>}
    <div className="two-col"><div className="note-card"><RotateCcw size={21} /><h3>El repaso no es al azar</h3><p>Error o difícil: vuelve en 10 minutos. Acierto con esfuerzo medio: al día siguiente. Aciertos fáciles consecutivos: 1, 3, 7, 14 y 30 días. Es una heurística simple, no un diagnóstico de preparación.</p></div><div className="note-card"><GraduationCap size={21} /><h3>Complementa con Microsoft</h3><p>Usa también la evaluación oficial. Es externa y requiere iniciar sesión; sus resultados no se sincronizan con esta web.</p><a className="text-link" href={state.certification.assessmentUrl} target="_blank" rel="noreferrer">Ir a la práctica oficial<ExternalLink size={14} /></a></div></div>
  </>;
}

function Quiz({ id, state, busy, act, refresh }: { id: string; state: AppState; busy: boolean; act: Action; refresh: () => Promise<void> }) {
  const [session, setSession] = useState<Session | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [loadingError, setLoadingError] = useState('');
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [time, setTime] = useState(Date.now());
  const started = useRef(performance.now());
  const expiring = useRef(false);
  const load = useCallback(async () => {
    const s = await api<Session>(`/sessions/${id}`); setSession(s); return s;
  }, [id]);
  useEffect(() => {
    load().catch(e => setLoadingError(e.message));
    const timer = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [load]);
  useEffect(() => { setSelected(null); setDifficulty(null); started.current = performance.now(); }, [session?.cursor]);
  const expired = session?.status === 'active' && session.deadline && Date.parse(session.deadline) <= time;
  useEffect(() => {
    if (!expired || expiring.current) return;
    expiring.current = true;
    load().then(refresh).catch(e => { setLoadingError(e.message); expiring.current = false; });
  }, [expired, load, refresh, time]);
  if (!session) return <Empty title={loadingError ? 'No se pudo abrir la sesión' : 'Cargando sesión…'}>{loadingError || 'Recuperando tu punto exacto.'}{loadingError && <button onClick={() => act(async () => { await load(); setLoadingError(''); })}>Reintentar</button>}</Empty>;
  const cert = state.certification;
  const exam = session.mode === 'exam';
  const finish = () => act(async () => {
    setSession(await api<Session>(`/sessions/${id}/finish`, 'POST'));
    setConfirmFinish(false); await refresh();
  });
  if (session.status === 'completed') {
    const accuracy = Math.round((session.score ?? 0) / session.questions.length * 100);
    const weak = [...new Set(session.questions.filter(q => !q.feedback?.correct || q.attempt?.difficulty === 3).map(q => q.lessonId))];
    return <><a className="text-link back-link" href="#practice"><ArrowLeft size={16} />Volver a practicar</a><section className="result-hero"><span className="card-icon"><CheckCircle2 size={28} /></span><span className="eyebrow">SESIÓN COMPLETADA · {exam ? 'SIMULACRO' : 'PRÁCTICA'}</span><h1>Una sesión más.<br /><em>Un paso adelante.</em></h1><div className="result-numbers"><strong>{accuracy}<small>%</small></strong><div><b>{session.score} de {session.questions.length} correctas</b><span>{session.answered} contestadas · {session.questions.length - session.answered} sin contestar</span></div></div><p>Es un resultado de práctica, no una predicción de aprobado ni una conversión a la escala 700 de Microsoft.</p><div className="button-row"><a href="#practice/difficult" className="button primary"><RotateCcw size={16} />Reforzar lo que cuesta</a><a href="#stats" className="text-link">Ver mi progreso<ArrowRight size={15} /></a></div></section>
      {weak.length > 0 && <section className="recommendations"><h3>Una lectura que puede ayudarte</h3><div className="chip-row">{weak.map(id => <a key={id} href={`#study/${id}`}>{cert.lessons.find(l => l.id === id)?.title}<ArrowRight size={13} /></a>)}</div></section>}
      <div className="section-heading"><h2>Aprende de cada respuesta</h2><span className="muted">Pregunta y respuesta · no oficiales</span></div>
      <div className="review-list">{session.questions.map((q, i) => <details key={q.id} className="review-item"><summary><span className={q.feedback?.correct ? 'correct-text' : 'wrong-text'}>{q.feedback?.correct ? <CheckCircle2 size={19} /> : <XCircle size={19} />}</span><span><small>PREGUNTA {i + 1} · {q.attempt ? ratingLabels[q.attempt.difficulty - 1] : 'Sin contestar'}</small>{q.stem}</span><ChevronRight size={18} /></summary><div className="review-body"><AnswerExplanation question={q} sources={cert.sources} /><a className="text-link" href={`#study/${q.lessonId}`}>Repasar el módulo<ArrowRight size={14} /></a></div></details>)}</div></>;
  }
  const question = session.questions[session.cursor];
  const attempt = question.attempt;
  const left = session.deadline ? Math.max(0, Math.ceil((Date.parse(session.deadline) - time) / 1000)) : null;
  const advance = () => act(async () => {
    setSession(await api<Session>(`/sessions/${id}/next`, 'POST', { cursor: session.cursor }));
    await refresh();
  });
  return <div className="quiz-wrap">
    <div className="quiz-top"><a className="text-link" href="#practice"><ArrowLeft size={16} />Pausar y salir</a><div className="chip-row"><Tag>{exam ? 'SIMULACRO' : 'PRÁCTICA'}</Tag>{left !== null && <span className={`timer ${left < 120 ? 'wrong-text' : ''}`} role="timer"><Clock3 size={16} />{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span>}</div></div>
    {exam && <p className="fine-print">El reloj continúa al salir. No se muestran pistas ni resultados hasta finalizar. Una respuesta confirmada no se puede cambiar.</p>}
    {loadingError && <div role="alert" className="error-banner">{loadingError}</div>}
    <div className="question-count"><span>Pregunta <strong>{session.cursor + 1}</strong> / {session.questions.length}</span><span>{session.answered} registradas</span></div><Progress value={session.answered / session.questions.length * 100} />
    <section className="question-card"><div className="question-meta"><Tag>{cert.code}</Tag><span>Pregunta original · no oficial</span>{!exam && <span>{cert.lessons.find(l => l.id === question.lessonId)?.title}</span>}</div><h1>{question.stem}</h1>
      <fieldset className="options" disabled={busy || Boolean(attempt) || Boolean(expired)}><legend className="sr-only">Selecciona una respuesta</legend>{question.options.map((option, i) => {
        const chosen = attempt ? attempt.selected === i : selected === i;
        const feedbackClass = question.feedback && (question.feedback.answer === i ? 'right-answer' : chosen ? 'wrong-answer' : '');
        return <label className={`option ${chosen ? 'picked' : ''} ${feedbackClass || ''}`} key={i}><input type="radio" name="answer" checked={chosen} onChange={() => setSelected(i)} /><span className="option-letter">{String.fromCharCode(65 + i)}</span><span>{option}</span>{question.feedback?.answer === i && <CheckCircle2 size={19} />}{question.feedback && chosen && !question.feedback.correct && <XCircle size={19} />}</label>;
      })}</fieldset>
      <div className="difficulty-row"><div><strong>¿Cuánto te costó?</strong><span>Independiente de si acertaste o no.</span></div><div className="rating-buttons">{ratingLabels.map((label, i) => <button key={label} disabled={busy || Boolean(attempt) || Boolean(expired)} aria-pressed={(attempt?.difficulty ?? difficulty) === i + 1} className={(attempt?.difficulty ?? difficulty) === i + 1 ? 'selected' : ''} onClick={() => setDifficulty(i + 1)}><span className={`difficulty-dot d${i + 1}`} />{label}</button>)}</div></div>
      {!attempt ? <div className="question-actions"><span className="muted"><Database size={14} />Se guarda al confirmar</span><button className="primary" disabled={busy || selected === null || difficulty === null || Boolean(expired)} onClick={() => act(async () => {
        const s = await api<Session>(`/sessions/${id}/answer`, 'POST', { questionId: question.id, selected, difficulty, durationMs: Math.min(86400000, Math.round(performance.now() - started.current)) });
        setSession(s); await refresh();
      })}>{busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Confirmar respuesta</button></div>
        : <div className="question-actions"><span className="correct-text"><Database size={14} />Respuesta guardada</span><button className="primary" disabled={busy} onClick={advance}>{session.cursor === session.questions.length - 1 ? 'Ver resultados' : 'Siguiente pregunta'}<ArrowRight size={16} /></button></div>}
    </section>
    {question.feedback && <div className="feedback-panel" aria-live="polite"><div className={`feedback-title ${question.feedback.correct ? 'correct-text' : 'wrong-text'}`}>{question.feedback.correct ? <CheckCircle2 size={22} /> : <XCircle size={22} />}<h3>{question.feedback.correct ? 'Bien conectado.' : 'Aquí hay una oportunidad de aprender.'}</h3></div><AnswerExplanation question={question} sources={cert.sources} /><a className="text-link" href={`#study/${question.lessonId}`}>Repasar este concepto<ArrowRight size={14} /></a></div>}
    <div className="finish-row">{confirmFinish ? <div className="confirm-inline" role="alert"><span>¿Finalizar? Quedarán {session.questions.length - session.answered} preguntas sin contestar.</span><button onClick={() => setConfirmFinish(false)} disabled={busy}>Continuar sesión</button><button className="danger" disabled={busy} onClick={finish}>Sí, finalizar</button></div> : <button className="text-button" disabled={busy} onClick={() => setConfirmFinish(true)}>Finalizar sesión ahora</button>}</div>
  </div>;
}
function AnswerExplanation({ question: q, sources }: { question: Session['questions'][number]; sources: Source[] }) {
  if (!q.feedback) return null;
  const feedback = q.feedback;
  return <><div className="answer-explanations">{q.options.map((option, i) => <div key={i} className={feedback.answer === i ? 'explanation-right' : ''}><span className="explanation-letter">{String.fromCharCode(65 + i)}</span><div><strong>{option}{feedback.answer === i && <Tag tone="green">CORRECTA</Tag>}{q.attempt?.selected === i && <small> Tu elección</small>}</strong><p>{feedback.explanations[i]}</p></div></div>)}</div><SourceLinks ids={feedback.sources} sources={sources} /></>;
}

function Statistics({ stats, state }: { stats: Stats; state: AppState }) {
  const [filter, setFilter] = useState('all');
  const [order, setOrder] = useState('hardest');
  const [lesson, setLesson] = useState('');
  const [rating, setRating] = useState('');
  const [search, setSearch] = useState('');
  const rows = stats.questions.filter(q => q.attempts && (!lesson || q.lessonId === lesson) && (!rating || q.difficulty === Number(rating)) &&
    (filter !== 'mistakes' || q.lastCorrect === false) && (filter !== 'correct' || q.lastCorrect === true) &&
    (filter !== 'due' || q.due) && q.stem.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));
  if (order === 'hardest') rows.sort((a, b) => b.priority - a.priority);
  if (order === 'accuracy') rows.sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0));
  const accuracy = stats.attempts ? Math.round(stats.correct / stats.attempts * 100) : null;
  return <><PageTitle eyebrow="EL PROGRESO, CON PERSPECTIVA" title="Mira cómo avanzas" text="Aciertos y esfuerzo son señales diferentes. Aquí puedes ver ambas y decidir dónde poner tu atención." />
    <div className="metric-grid"><Metric icon={<ListChecks size={18} />} title="Respuestas registradas" value={String(stats.attempts)} detail={`${stats.seen} de ${stats.total} preguntas distintas`} /><Metric icon={<Target size={18} />} title="Precisión global" value={percent(accuracy)} detail={`${stats.correct} respuestas correctas`} /><Metric icon={<Clock3 size={18} />} title="Tiempo respondiendo" value={`${Math.round(stats.timeMs / 60000)} min`} detail="tiempo activo registrado al confirmar" /><Metric icon={<TrendingUp size={18} />} title="Precisión reciente" value={percent(stats.recentAccuracy)} detail="últimas 20 respuestas registradas" /></div>
    <div className="two-col"><section className="panel"><div className="section-heading"><h3>Por área del examen</h3><Tag>PESO OFICIAL</Tag></div>{stats.domains.map(d => <div className="domain-stat" key={d.id}><div><strong>{d.title}</strong><span>{percent(d.accuracy)}</span></div><Progress value={d.accuracy ?? 0} color={d.color} /><small>{d.weight} del examen · {d.attempts} respuestas · {d.seen}/{d.total} preguntas vistas</small></div>)}</section><section className="panel"><h3>Cómo te está resultando</h3><p className="muted">Tu valoración al responder, no una dificultad impuesta.</p><div className="rating-stats">{stats.ratings.map(r => <div key={r.difficulty}><span className={`difficulty-dot d${r.difficulty}`} /><span>{ratingLabels[r.difficulty - 1]}</span><div className="rating-bar"><span style={{ width: `${stats.attempts ? r.count / stats.attempts * 100 : 0}%` }} /></div><strong>{r.count}</strong></div>)}</div><a href="#practice/difficult" className="text-link">Practicar lo que me cuesta<ArrowRight size={15} /></a></section></div>
    <section className="panel activity"><div className="section-heading"><h3>Actividad reciente</h3><span className="muted">Últimos 14 días con respuestas · fechas UTC</span></div>{stats.days.length ? <div className="activity-chart">{stats.days.map(d => <div key={d.day} title={`${d.day}: ${d.correct}/${d.attempts} correctas`}><strong>{d.attempts}</strong><div className="activity-bar"><span style={{ height: `${Math.max(4, d.attempts / Math.max(...stats.days.map(x => x.attempts)) * 100)}%` }} /></div><small>{date(`${d.day}T12:00:00Z`)}</small></div>)}</div> : <p className="muted">Todavía no hay actividad. Tu primer cuestionario pondrá esto en marcha.</p>}</section>
    <div className="section-heading"><div><span className="eyebrow">TU BANCO PERSONAL DE REPASO</span><h2>Pregunta a pregunta</h2></div><a className="text-link" href="#practice">Nueva sesión<ArrowRight size={15} /></a></div>
    <div className="table-filters"><label className="sr-only" htmlFor="question-search">Buscar preguntas</label><input id="question-search" placeholder="Buscar por enunciado…" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Filtrar por resultado" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Todos los resultados</option><option value="mistakes">Última incorrecta</option><option value="correct">Última correcta</option><option value="due">Repaso vencido</option></select><select aria-label="Filtrar por dificultad" value={rating} onChange={e => setRating(e.target.value)}><option value="">Toda dificultad</option>{ratingLabels.map((r, i) => <option key={r} value={i + 1}>{r}</option>)}</select><select aria-label="Filtrar por módulo" value={lesson} onChange={e => setLesson(e.target.value)}><option value="">Todos los módulos</option>{state.certification.lessons.map(l => <option value={l.id} key={l.id}>{l.title}</option>)}</select><select aria-label="Ordenar estadísticas" value={order} onChange={e => setOrder(e.target.value)}><option value="hardest">Mayor dificultad primero</option><option value="stable">Orden fijo del temario</option><option value="accuracy">Menor precisión primero</option></select></div>
    {rows.length ? <div className="table-scroll"><table><thead><tr><th>Pregunta / módulo</th><th>Intentos</th><th>Aciertos</th><th>Última</th><th>Dificultad</th><th>Repaso</th></tr></thead><tbody>{rows.map(q => <tr key={q.id}><td><strong>{q.stem}</strong><a href={`#study/${q.lessonId}`}>{state.certification.lessons.find(l => l.id === q.lessonId)?.title}</a></td><td>{q.attempts}</td><td>{q.correct}/{q.attempts}<small>{q.accuracy}%</small></td><td><span className={q.lastCorrect ? 'correct-text' : 'wrong-text'}>{q.lastCorrect ? 'Correcta' : 'Incorrecta'}</span></td><td><span className={`difficulty-dot d${q.difficulty}`} />{ratingLabels[(q.difficulty ?? 1) - 1]}<small>Media histórica: {q.averageDifficulty?.toFixed(1)}/3</small></td><td>{q.due ? <Tag tone="amber">Pendiente</Tag> : q.dueAt ? new Date(q.dueAt).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</td></tr>)}</tbody></table></div> : <Empty title={stats.attempts ? 'Sin coincidencias' : 'Tu progreso empieza con una pregunta'}>{stats.attempts ? 'Prueba otros filtros.' : <a className="text-link" href="#practice">Empezar a practicar<ArrowRight size={15} /></a>}</Empty>}
    <div className="section-heading"><h2>Sesiones finalizadas</h2><span className="muted">Las 20 más recientes</span></div>{stats.history.length ? <div className="history-list">{stats.history.map(s => <a href={`#quiz/${s.id}`} key={s.id}><span className="card-icon">{s.mode === 'exam' ? <Clock3 size={18} /> : <ListChecks size={18} />}</span><div><strong>{s.mode === 'exam' ? 'Simulacro' : 'Práctica'}</strong><span>{date(s.completedAt)} · {s.answered}/{s.total} contestadas</span></div><strong>{s.correct}/{s.total}<small> correctas</small></strong><ChevronRight size={17} /></a>)}</div> : <p className="muted">Las sesiones aparecerán aquí al finalizarlas. Los simulacros activos no revelan sus aciertos en estadísticas.</p>}
    <p className="fine-print">Prioridad = tasa histórica de error × 60 + dificultad de la última respuesta × 20 + 30 si la última fue incorrecta. Los empates conservan el orden del temario. No es una estimación de tu nota de examen.</p>
  </>;
}

function Sources({ state }: { state: AppState }) {
  const cert = state.certification;
  return <><PageTitle eyebrow="APRENDE CON CRITERIO" title="Fuentes, no respuestas mágicas" text="El temario oficial manda. La comunidad aporta perspectiva. El material de esta web es una síntesis original y trazable." />
    <div className="info-banner"><ShieldCheck size={23} /><div><strong>No es un banco oficial de examen</strong><p>{cert.notice}</p></div></div>
    <details className="compact-help"><summary>Cómo se preparó el material y qué cubre</summary><div className="two-col"><section className="panel"><h3>Cómo está construido el material</h3><ol className="method-list"><li>Mapear las aptitudes de la guía AB-410.</li><li>Resumir decisiones y diferencias, no copiar capítulos.</li><li>Convertir conceptos en escenarios originales con distractores explicados.</li><li>Practicar recuperación activa y un laboratorio breve.</li><li>Volver a errores y esfuerzo con repaso espaciado.</li></ol></section><section className="panel"><h3>Lo que cubre esta primera versión</h3><p>{cert.lessons.length} módulos y {cert.questionCount} preguntas de opción única. El simulacro es una aproximación de práctica: no reproduce todos los formatos, profundidad o experiencia del examen.</p><p>La guía menciona Power Pages y agentes como contexto de integración. El foco de estudio sigue las tres áreas de aptitudes medidas, no todas las tecnologías listadas en la página de certificación.</p><p>Las funciones de IA, licencias y rutas de interfaz cambian. Revisión: <strong>{cert.reviewed}</strong>. Versión: {cert.version}.</p></section></div></details>
    <div className="section-heading"><h2>Referencias oficiales</h2><Tag>MICROSOFT LEARN</Tag></div><div className="source-grid">{cert.sources.filter(s => s.kind === 'official').map(s => <a href={s.url} target="_blank" rel="noreferrer" className="source-card" key={s.id}><span className="source-icon"><BookOpen size={19} /></span><div><Tag tone="green">OFICIAL · FUENTE</Tag><h3>{s.title}</h3><small>Consultada {s.reviewed}</small></div><ExternalLink size={16} /></a>)}</div>
    <div className="section-heading"><h2>Perspectiva de la comunidad</h2><Tag>NO OFICIAL</Tag></div>{cert.sources.filter(s => s.kind === 'community').map(s => <div className="panel" key={s.id}><h3>{s.title}</h3><p>Referencia complementaria para patrones y criterios de canvas. No es documentación de Microsoft ni evidencia de que una pregunta aparezca en AB-410. Las recomendaciones se contrastan con Learn; no se ha copiado su contenido.</p><SourceLinks ids={[s.id]} sources={cert.sources} /></div>)}
    <div className="note-card"><h3>Sobre ExamTopics y otros bancos</h3><p>No se han importado preguntas de ExamTopics, de exámenes reales ni del simulacro de Microsoft. No podemos verificar autoría, vigencia o fidelidad de un banco por su popularidad. Marcar algo «no oficial» no resuelve permisos de reproducción ni convierte un dump en material fiable. Aquí se crean casos propios y se justifican con fuentes.</p></div>
    <details className="objectives"><summary>Mapa de cobertura por aptitudes</summary>{cert.lessons.map(l => <div key={l.id}><h4><a href={`#study/${l.id}`}>{l.title}</a></h4><ul>{l.objectives.map(o => <li key={o}>{o}</li>)}</ul></div>)}</details>
  </>;
}
function Settings({ state, busy, act, refresh }: { state: AppState; busy: boolean; act: Action; refresh: () => Promise<void> }) {
  const [interestId, setInterestId] = useState<string | null>(null);
  const interest = state.interests.find(item => item.id === interestId);
  return <><PageTitle eyebrow="A TU MANERA" title="Tu espacio de aprendizaje" text="Una persona, una base de datos local y todo el foco en aprender." />
    <section className="panel settings-panel"><h3>Certificaciones</h3><p>Elige material disponible o consulta las certificaciones que quieres preparar más adelante.</p><label>Qué quieres estudiar<select disabled={busy} value={interest?.id ?? state.settings.certification} onChange={e => {
      const id = e.target.value;
      if (state.interests.some(item => item.id === id)) { setInterestId(id); return; }
      act(async () => { await api('/settings', 'PATCH', { certification: id }); await refresh(); setInterestId(null); });
    }}><optgroup label="Disponible para estudiar">{state.catalog.map(c => <option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}</optgroup><optgroup label="De interés · sin material">{state.interests.map(c => <option key={c.id} value={c.id}>{c.code} · {c.title} · pendiente</option>)}</optgroup></select></label>
      {interest && <div className="info-banner" role="status"><BookmarkCheck size={21} /><div><strong>{interest.code} · Contenido pendiente</strong><p>Aún no se ha generado el material de estudio. Es solo un recordatorio: no se generará contenido automáticamente.</p><a className="text-link" href={interest.url} target="_blank" rel="noreferrer">Ver información oficial<ExternalLink size={14} /></a></div></div>}
      <p className="fine-print">Tu certificación activa sigue siendo {state.certification.code}. Consultar una pendiente no cambia tu estudio ni tu progreso.</p>
    </section>
    <section className="panel settings-panel"><h3>Punto de partida</h3><p>Experiencia en Power Platform; menos experiencia en Copilot Studio. La ruta recomendada empieza por agentes, prompts e integración. No se presupone que hayas dominado ningún módulo.</p><h3>Datos y privacidad</h3><p>Las respuestas, dificultad, temas y avance se guardan en <code>data/progress.sqlite</code>, en este equipo. Sin cuenta, analítica externa ni llamadas a modelos de IA. Los enlaces a fuentes se abren fuera de la aplicación.</p><p>La exportación JSON sirve para inspección y portabilidad; esta versión no incluye importación. Para una copia restaurable, detén el servidor y copia el archivo SQLite (consulta README).</p><a className="button" href="/api/export" download><Download size={16} />Exportar progreso en JSON</a></section>
    <section className="panel settings-panel"><h3>Apariencia</h3><p>La preferencia queda guardada en SQLite y «Sistema» sigue los cambios del dispositivo.</p><div className="button-row">{([{ id: 'light', label: 'Claro', icon: Sun }, { id: 'dark', label: 'Oscuro', icon: Moon }, { id: 'system', label: 'Sistema', icon: Monitor }] as const).map(t => <button key={t.id} className={state.settings.theme === t.id ? 'primary' : ''} disabled={busy} aria-pressed={state.settings.theme === t.id} onClick={() => act(async () => { await api('/settings', 'PATCH', { theme: t.id }); await refresh(); })}><t.icon size={16} />{t.label}</button>)}</div></section>
  </>;
}
