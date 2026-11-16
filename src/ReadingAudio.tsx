import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Info, Pause, Play, Square, Volume2 } from 'lucide-react';

type Playback = 'idle' | 'playing' | 'paused';

export default function ReadingAudio({ title, body }: { title: string; body: string }) {
  const supported = typeof window.speechSynthesis?.getVoices === 'function' && typeof SpeechSynthesisUtterance !== 'undefined';
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voicesReady, setVoicesReady] = useState(false);
  const [rate, setRate] = useState(1);
  const [playback, setPlayback] = useState<Playback>('idle');
  const [error, setError] = useState('');
  const speedGroup = useId();
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const paused = useRef(false);
  const text = `${title}. ${body.replace(/\*\*/g, '')}`;

  const cancel = useCallback(() => {
    const owned = utterance.current;
    utterance.current = null;
    paused.current = false;
    if (owned) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    }
  }, []);

  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const updateVoices = () => {
      try {
        const all = synth.getVoices();
        const spanish = all.filter(item => item.localService && /^es(?:[-_]|$)/i.test(item.lang));
        const preferred = navigator.language.toLowerCase().replace('_', '-');
        setVoice(spanish.find(item => item.lang.toLowerCase().replace('_', '-') === preferred)
          ?? spanish.find(item => item.default) ?? spanish[0] ?? null);
        if (all.length) setVoicesReady(true);
      } catch (reason) {
        setError(`No se pudieron consultar las voces: ${reason instanceof Error ? reason.message : String(reason)}`);
      }
    };
    updateVoices();
    synth.addEventListener('voiceschanged', updateVoices);
    const timer = setTimeout(() => setVoicesReady(true), 2000);
    return () => { clearTimeout(timer); synth.removeEventListener('voiceschanged', updateVoices); };
  }, [supported]);

  useEffect(() => {
    cancel(); setPlayback('idle'); setError('');
    return cancel;
  }, [text, cancel]);

  const stop = () => { cancel(); setPlayback('idle'); };
  const read = (speed = rate) => {
    if (!voice) return;
    cancel(); setError('');
    const next = new SpeechSynthesisUtterance(text);
    next.voice = voice; next.lang = voice.lang; next.rate = speed;
    utterance.current = next;
    next.onstart = () => {
      if (utterance.current !== next) return;
      if (paused.current) window.speechSynthesis.pause();
      else setPlayback('playing');
    };
    next.onend = () => {
      if (utterance.current !== next) return;
      utterance.current = null; paused.current = false; setPlayback('idle');
    };
    next.onerror = event => {
      if (utterance.current !== next) return;
      utterance.current = null; paused.current = false; setPlayback('idle');
      setError(`No se pudo leer esta sección (${event.error}). Comprueba la voz instalada y vuelve a intentarlo.`);
    };
    try { setPlayback('playing'); window.speechSynthesis.speak(next); }
    catch (reason) {
      cancel(); setPlayback('idle');
      setError(`No se pudo iniciar la lectura: ${reason instanceof Error ? reason.message : String(reason)}`);
    }
  };
  const play = () => {
    if (playback === 'paused' && utterance.current) {
      try { paused.current = false; window.speechSynthesis.resume(); setPlayback('playing'); }
      catch (reason) { stop(); setError(`No se pudo reanudar: ${reason instanceof Error ? reason.message : String(reason)}`); }
    } else read();
  };
  const pause = () => {
    try { paused.current = true; window.speechSynthesis.pause(); setPlayback('paused'); }
    catch (reason) { stop(); setError(`No se pudo pausar: ${reason instanceof Error ? reason.message : String(reason)}`); }
  };
  const changeRate = (speed: number) => {
    setRate(speed);
    if (playback === 'playing') read(speed);
    else if (playback === 'paused') { cancel(); setPlayback('paused'); }
  };
  const status = !supported ? 'Este navegador no permite lectura en voz alta. Puedes seguir leyendo el texto.'
    : !voice ? voicesReady
      ? 'No hay una voz local en español disponible. Instala o activa una en tu sistema y vuelve a abrir el navegador.'
      : 'Buscando una voz local en español…'
    : playback === 'playing' ? 'Reproduciendo esta sección.'
    : playback === 'paused' ? 'Lectura en pausa.'
    : 'Lista para escuchar esta sección.';
  const playLabel = playback === 'playing' ? 'Pausar' : playback === 'paused' ? 'Reanudar' : 'Reproducir';

  return <section className="reading-audio" aria-label="Lectura en voz alta">
    <div className="reading-audio-controls">
      <span className="reading-audio-label"><Volume2 size={16} aria-hidden="true" /><span>Escuchar</span></span>
      <button aria-label={playLabel} title={playLabel} disabled={!voice || !supported} onClick={playback === 'playing' ? pause : play}>
        {playback === 'playing' ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
      </button>
      <button aria-label="Detener" title="Detener" disabled={playback === 'idle'} onClick={stop}><Square size={16} aria-hidden="true" /></button>
      <div className="reading-audio-speed" role="radiogroup" aria-label="Velocidad de lectura">
        {[{ value: 1, label: '1x' }, { value: 1.25, label: '1,25x' }, { value: 1.5, label: '1,5x' }].map(speed =>
          <label key={speed.value}><input type="radio" name={speedGroup} value={speed.value}
            checked={rate === speed.value} disabled={!supported || !voice} onChange={() => changeRate(speed.value)} /><span>{speed.label}</span></label>)}
      </div>
      {voice && <details className="reading-audio-info"><summary aria-label="Información de lectura" title="Información de lectura"><Info size={16} aria-hidden="true" /></summary>
        <small>Voz local: {voice.name}. Cambiar la velocidad reinicia la sección; avanzar detiene la lectura.</small>
      </details>}
    </div>
    <p className={voice && !error ? 'sr-only' : undefined} role={error ? 'alert' : 'status'}>{error || status}</p>
  </section>;
}
