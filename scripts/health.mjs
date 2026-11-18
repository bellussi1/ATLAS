import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const stats = JSON.parse(await readFile('generated/home-stats.json', 'utf8'));
let release = null;
try {
  release = JSON.parse(await readFile('generated/content-cache/pointer.json', 'utf8')).release;
} catch {}

const health = {
  status: 'ok',
  builtAt: new Date().toISOString(),
  release,
  entities: stats.counts.entities,
  relations: stats.counts.relations,
  sources: stats.counts.sources,
  readings: stats.counts.readings,
};

await writeFile(resolve('dist/atlas/browser/health.json'), `${JSON.stringify(health, null, 2)}\n`);
console.log(
  `Health: ${health.entities} entidades, ${health.relations} relações, release ${release ?? 'local'}.`,
);
