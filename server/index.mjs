import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import express from 'express';
import { createApp } from './app.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT ?? 4100);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT debe ser un puerto válido.');
const { app, db } = createApp(process.env.DB_PATH ?? resolve(root, 'data/progress.sqlite'));
const server = createServer(app);
const dev = process.argv.includes('--dev');
let vite;
if (dev) {
  const { createServer: createViteServer } = await import('vite');
  vite = await createViteServer({ root, server: { middlewareMode: true, hmr: { server } }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  const dist = resolve(root, 'dist');
  if (!existsSync(resolve(dist, 'index.html'))) throw new Error('Falta el frontend compilado. Ejecuta npm run build.');
  app.use(express.static(dist));
  app.get('/{*path}', (req, res) => res.sendFile(resolve(dist, 'index.html')));
}
server.listen(port, '127.0.0.1', () => {
  console.log(`Certifica disponible en http://127.0.0.1:${port}`);
  console.log(`SQLite: ${process.env.DB_PATH ?? resolve(root, 'data/progress.sqlite')}`);
});
server.on('error', async error => { console.error(error); await vite?.close(); db.close(); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    server.close(async () => { await vite?.close(); db.close(); process.exit(0); });
    server.closeIdleConnections();
  });
}
