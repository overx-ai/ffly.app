// npm run preview: the built site as Vercel serves it, the prerendered pages plus the sign-in function. `astro preview`
// does not support the Vercel adapter (spec 014). Run `npm run build` first.
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { VERCEL_OUTPUT, functionRoutes } from './vercel-output.mjs';

const OUTPUT = fileURLToPath(VERCEL_OUTPUT);
const STATIC = join(OUTPUT, 'static');
const FUNCTION = join(OUTPUT, 'functions', '_render.func');
// `npm run preview -- --port 4329`. Like `astro preview`, it answers on this machine only (docs/000-tasks T-002).
const { port: PORT } = parseArgs({ options: { port: { type: 'string', default: process.env.PORT ?? '4321' } } }).values;
const HOST = 'localhost';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const config = JSON.parse(await readFile(join(OUTPUT, 'config.json'), 'utf8'));
const { handler } = JSON.parse(await readFile(join(FUNCTION, '.vc-config.json'), 'utf8'));
const { default: render } = await import(pathToFileURL(join(FUNCTION, handler)).href);
const serverRoutes = functionRoutes(config).map((route) => new RegExp(route.src));

const fileAt = (path) => stat(path).then((s) => (s.isFile() ? path : undefined), () => undefined);

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (serverRoutes.some((route) => route.test(pathname))) return render(req, res);
  let base;
  try {
    base = normalize(join(STATIC, decodeURIComponent(pathname)));
  } catch {
    return res.writeHead(400).end();
  }
  if (base !== STATIC && !base.startsWith(STATIC + sep)) return res.writeHead(400).end();
  const found = (await fileAt(base)) ?? (await fileAt(join(base, 'index.html')));
  const path = found ?? join(STATIC, '404.html');
  res.writeHead(found ? 200 : 404, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream' });
  res.end(await readFile(path));
}).listen(Number(PORT), HOST, () => console.log(`preview: http://${HOST}:${PORT}`));
