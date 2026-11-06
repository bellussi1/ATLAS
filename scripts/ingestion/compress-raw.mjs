#!/usr/bin/env node
// Recompresses raw captures already published without Content-Encoding. The key remains the
// SHA-256 of the decompressed JSON, so manifests, fetch-raw and the raw Worker are unchanged.
//   node scripts/ingestion/compress-raw.mjs --apply
import { gzipSync } from 'node:zlib';

import { listR2Objects, loadR2Config, r2 } from '../content/r2-content.mjs';

const apply = process.argv.includes('--apply');
const limitIndex = process.argv.indexOf('--limit');
const limit = limitIndex >= 0 ? Number(process.argv[limitIndex + 1]) : Infinity;
const config = await loadR2Config();
const objects = await listR2Objects(config, 'raw/');
let checked = 0;
let changed = 0;
let before = 0;
let after = 0;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function withRetry(label, run) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (!/HTTP (429|5\d\d)/.test(String(error)) || attempt >= 5) throw error;
      const pause = 1000 * 2 ** attempt;
      console.warn(`${label}: ${error.message}; nova tentativa em ${pause} ms`);
      await wait(pause);
    }
  }
}

async function compress(object) {
  if (checked >= limit) return;
  checked += 1;
  const head = await withRetry(object.key, () => r2(config, 'HEAD', object.key));
  if (head.status === 429 || head.status >= 500) throw new Error(`HEAD: HTTP ${head.status}`);
  if (!head.ok || head.headers.get('content-encoding') === 'gzip') return;
  const response = await withRetry(object.key, () => r2(config, 'GET', object.key));
  if (response.status === 429 || response.status >= 500)
    throw new Error(`GET: HTTP ${response.status}`);
  if (!response.ok) throw new Error(`Falha ao ler ${object.key}: HTTP ${response.status}`);
  const body = Buffer.from(await response.arrayBuffer());
  const packed = gzipSync(body, { level: 9 });
  if (packed.byteLength >= body.byteLength) return;
  before += body.byteLength;
  after += packed.byteLength;
  if (apply)
    await withRetry(object.key, async () => {
      const put = await r2(config, 'PUT', object.key, {
        body: packed,
        contentType: 'application/json; charset=utf-8',
        contentEncoding: 'gzip',
        cacheControl: 'public, max-age=31536000, immutable',
      });
      if (!put.ok) throw new Error(`Falha ao regravar ${object.key}: HTTP ${put.status}`);
    });
  changed += 1;
  if (checked % 200 === 0) console.log(`${checked}/${objects.length} verificados`);
}

for (let offset = 0; offset < objects.length; offset += 32) {
  await Promise.all(objects.slice(offset, offset + 32).map(compress));
}
console.log(
  `${checked} objetos verificados; ${changed} sem gzip; ` +
    `${(before / 1024 / 1024).toFixed(1)} MB -> ${(after / 1024 / 1024).toFixed(1)} MB.`,
);
if (!apply) console.log('Plano apenas. Use --apply para regravar comprimido.');
