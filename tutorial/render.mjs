import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const directory = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(directory, 'index.html');
const cache = join(directory, '.cache');
const generated = join(directory, 'generated');
const hash = value => createHash('sha256').update(value).digest('hex');
const run = (command, args) => execFileSync(command, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();

export function readStory() {
  const html = readFileSync(htmlPath, 'utf8');
  const match = html.match(/<script id="tutorial-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Falta el guion tutorial-data en tutorial/index.html.');
  const scenes = JSON.parse(match[1]);
  if (!Array.isArray(scenes) || !scenes.length) throw new Error('El guion necesita al menos una escena.');
  const ids = new Set();
  for (const scene of scenes) {
    if (!/^[a-z0-9-]+$/.test(scene.id) || ids.has(scene.id)) throw new Error(`ID no válido o repetido: ${scene.id}`);
    ids.add(scene.id);
    for (const field of ['title', 'instruction', 'tip', 'caption', 'narration', 'focusLabel']) {
      if (typeof scene[field] !== 'string' || !scene[field].trim()) throw new Error(`Falta ${field} en ${scene.id}.`);
    }
  }
  return { html, scenes, template: html.replace(match[1], '') };
}

async function main() {
  const { scenes, template } = readStory();
  const voice = process.env.TUTORIAL_VOICE ?? 'Paulina';
  const rate = process.env.TUTORIAL_RATE ?? '160';
  if (!/^\d+$/.test(rate) || Number(rate) < 80 || Number(rate) > 250) throw new Error('TUTORIAL_RATE debe estar entre 80 y 250.');
  for (const tool of ['say', 'ffmpeg', 'ffprobe']) {
    try { run('/usr/bin/which', [tool]); }
    catch { throw new Error(`Falta ${tool}. La generación requiere macOS con say, ffmpeg y ffprobe.`); }
  }
  for (const scene of scenes) {
    if (!existsSync(join(directory, 'assets', `${scene.id}.png`))) {
      throw new Error(`Falta la captura ${scene.id}. Ejecuta npm run tutorial:capture.`);
    }
  }
  const layoutText = readFileSync(join(directory, 'assets/layout.js'), 'utf8');
  const layout = JSON.parse(layoutText.replace(/^window\.TUTORIAL_LAYOUT\s*=\s*/, '').replace(/;\s*$/, ''));
  mkdirSync(cache, { recursive: true }); mkdirSync(generated, { recursive: true });
  let browser;
  const clips = [];
  const chapters = [];
  let total = 0;
  try {
    for (const scene of scenes) {
      const statePath = join(cache, `${scene.id}.json`);
      const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : {};
      const audio = join(generated, `${scene.id}.m4a`);
      const frame = join(cache, `${scene.id}.png`);
      const clip = join(cache, `${scene.id}.mp4`);
      const audioHash = hash(JSON.stringify({ narration: scene.narration, voice, rate }));
      const { narration, ...visual } = scene;
      const frameHash = hash(JSON.stringify({
        template, visual, layout: layout[scene.id],
        capture: hash(readFileSync(join(directory, 'assets', `${scene.id}.png`))),
        size: [1920, 1080],
      }));
      const clipHash = hash(JSON.stringify({ audioHash, frameHash, fps: 24, padding: 0.8, encoding: 'h264-aac-v1' }));
      if (state.clipHash === clipHash && existsSync(clip) && existsSync(audio) && existsSync(frame)) {
        console.log(`Reutilizada: ${scene.id}`);
      } else {
        if (state.audioHash !== audioHash || !existsSync(audio)) {
          const text = join(cache, `${scene.id}.txt`);
          const aiff = join(cache, `${scene.id}.aiff`);
          writeFileSync(text, narration);
          run('say', ['-v', voice, '-r', rate, '-f', text, '-o', aiff]);
          run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', aiff, '-c:a', 'aac', '-b:a', '160k', audio]);
          state.audioHash = audioHash;
        }
        const audioDuration = Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', audio]).trim());
        if (!Number.isFinite(audioDuration) || audioDuration <= 0) throw new Error(`Audio vacío o no válido: ${scene.id}`);
        state.duration = Math.ceil((audioDuration + 0.8) * 24) / 24;
        if (state.frameHash !== frameHash || !existsSync(frame)) {
          browser ??= await chromium.launch({ headless: true });
          const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
          try {
            const url = pathToFileURL(htmlPath); url.searchParams.set('render', '1'); url.searchParams.set('scene', scene.id);
            await page.goto(url.href);
            await page.evaluate(async () => {
              await document.fonts.ready;
              await Promise.all([...document.images].map(image => image.decode()));
            });
            await page.screenshot({ path: frame });
          } finally { await page.close(); }
          state.frameHash = frameHash;
        }
        run('ffmpeg', [
          '-hide_banner', '-loglevel', 'error', '-y', '-loop', '1', '-framerate', '24', '-i', frame, '-i', audio,
          '-af', 'apad', '-t', String(state.duration), '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'stillimage',
          '-crf', '21', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', clip,
        ]);
        state.clipHash = clipHash;
        writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
        console.log(`Generada: ${scene.id} (${state.duration.toFixed(1)} s)`);
      }
      clips.push(scene.id);
      chapters.push({ id: scene.id, title: scene.title, start: total, duration: state.duration });
      total += state.duration;
    }
  } finally { await browser?.close(); }
  const listPath = join(cache, 'clips.txt');
  writeFileSync(listPath, clips.map(id => `file '${id}.mp4'`).join('\n'));
  const video = join(directory, 'certifica-guia.mp4');
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', '-movflags', '+faststart', video]);
  writeFileSync(join(generated, 'chapters.json'), `${JSON.stringify(chapters, null, 2)}\n`);
  console.log(`Vídeo listo: ${video} · ${Math.round(total)} segundos · 1920 × 1080 · voz ${voice}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.stderr?.toString() || error.message);
    process.exitCode = 1;
  });
}
