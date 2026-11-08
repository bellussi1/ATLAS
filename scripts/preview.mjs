import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';

const root = resolve('dist/atlas/browser');
const port = Number(process.env.ATLAS_PREVIEW_PORT ?? 4305);

// Mirrors the subset of `_headers` that Pages implements: path blocks, splats and placeholders.
const toPattern = (pattern) =>
  new RegExp(
    '^' +
      pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/:[a-zA-Z]\w*/g, '[^/]+') +
      '$',
  );
function parseRules(text) {
  const rules = [];
  let current;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (/^\s/.test(raw)) {
      const separator = line.indexOf(':');
      if (!current || separator < 0) continue;
      const name = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim();
      current.headers[name] = current.headers[name] ? `${current.headers[name]}, ${value}` : value;
    } else {
      current = { patterns: line.split(/\s+/).map(toPattern), headers: {} };
      rules.push(current);
    }
  }
  return rules;
}
const rules = parseRules(await readFile(resolve(root, '_headers'), 'utf8'));
const headersFor = (pathname) => {
  const result = {};
  for (const rule of rules)
    if (rule.patterns.some((pattern) => pattern.test(pathname)))
      Object.assign(result, rule.headers);
  return result;
};

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};
const compressible = new Set(['.html', '.js', '.css', '.json', '.svg', '.xml', '.txt']);
// Pages serves brotli or gzip; compressing here keeps Lighthouse and link checks close to production.
const compressed = new Map();
const encode = (file, body) => {
  const cached = compressed.get(file);
  if (cached) return cached;
  const result = { br: brotliCompressSync(body), gzip: gzipSync(body) };
  compressed.set(file, result);
  return result;
};
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + sep)) throw new Error('invalid path');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const body = await readFile(file);
    const type = types[extname(file)] ?? 'application/octet-stream';
    const common = { ...headersFor(pathname), 'Content-Type': type };
    const accepts = request.headers['accept-encoding'] ?? '';
    const canCompress = compressible.has(extname(file)) && body.length > 1024;
    const encoding = !canCompress
      ? ''
      : /\bbr\b/.test(accepts)
        ? 'br'
        : /\bgzip\b/.test(accepts)
          ? 'gzip'
          : '';
    if (!encoding) {
      response.writeHead(200, common);
      response.end(body);
      return;
    }
    response.writeHead(200, {
      ...common,
      'Content-Encoding': encoding,
      Vary: 'Accept-Encoding',
    });
    response.end(encode(file, body)[encoding]);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Preview local: http://127.0.0.1:${port}`));
