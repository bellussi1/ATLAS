import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve('dist/atlas/browser');
const headerFile = await readFile(resolve(root, '_headers'), 'utf8');
const headers = Object.fromEntries(headerFile.split(/\r?\n/).slice(1).filter(line => line.trim()).map(line => {
  const separator = line.indexOf(':');
  return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
}));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + sep)) throw new Error('invalid path');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    response.writeHead(200, { ...headers, 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(4305, '127.0.0.1', () => console.log('Preview local: http://127.0.0.1:4305'));
