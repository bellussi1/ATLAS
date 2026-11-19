#!/usr/bin/env node
/**
 * Serve o build local e o release local no mesmo origin.
 *
 *   node scripts/content/preview-local.mjs
 *
 * `dist/atlas/browser` responde em `/`; `generated/content-cache` responde em
 * `/content/`. A página define `window.__ATLAS_CONTENT_BASE__` na porta 4305,
 * então o cliente lê o release local em vez do R2.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve('dist/atlas/browser');
const contentRoot = resolve('generated/content-cache');
const port = Number(process.env.PORT || 4305);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.pdf': 'application/pdf',
};

async function fileAt(path) {
  try {
    const info = await stat(path);
    return info.isFile() ? path : null;
  } catch {
    return null;
  }
}

async function resolveFile(pathname) {
  if (pathname === '/content' || pathname.startsWith('/content/')) {
    const relative = normalize(decodeURIComponent(pathname.slice('/content'.length))).replace(
      /^(\.\.(\/|\\|$))+/,
      '',
    );
    return fileAt(join(contentRoot, relative));
  }
  const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.(\/|\\|$))+/g, '');
  const direct = await fileAt(join(root, safe));
  if (direct) return direct;
  if (!extname(safe)) {
    const index = await fileAt(join(root, safe, 'index.html'));
    if (index) return index;
    return fileAt(join(root, 'index.html'));
  }
  return null;
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const file = await resolveFile(url.pathname);
  if (!file) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Não encontrado');
    return;
  }
  const isContent = file.startsWith(join(contentRoot));
  const isPointer = file.endsWith('pointer.json');
  response.writeHead(200, {
    'content-type': types[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'cache-control': isContent && !isPointer ? 'public, max-age=31536000, immutable' : 'no-store',
  });
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Preview local: http://127.0.0.1:${port}/`);
  console.log(`Conteúdo local: http://127.0.0.1:${port}/content/pointer.json`);
});
