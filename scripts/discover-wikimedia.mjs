import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  commonsCategoryTree,
  discoverWikidataCandidates,
  ptWikipediaIntro,
  searchesFor,
} from './ingestion/wikimedia/discovery.mjs';
import { traditionFor } from './ingestion/wikimedia/traditions.mjs';

// Usage: node scripts/discover-wikimedia.mjs <tradição>  (marxismo, liberalismo…)
const tradition = traditionFor(process.argv[2] ?? 'marxismo');
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = join(
  projectRoot,
  `scripts/ingestion/wikimedia/discovery/${tradition.slug}.json`,
);

const candidates = await discoverWikidataCandidates(
  searchesFor(tradition),
  undefined,
  tradition.rootQid,
);
const commonsCategories = await commonsCategoryTree(tradition.commonsCategory, {
  depth: 2,
  limit: 80,
});
const ptIntro = await ptWikipediaIntro(tradition.ptTitle);
const snapshot = {
  tradition: tradition.slug,
  rootQid: tradition.rootQid,
  retrievedAt: new Date().toISOString().slice(0, 10),
  sources: [
    `https://www.wikidata.org/wiki/${tradition.rootQid}`,
    `https://commons.wikimedia.org/wiki/${tradition.commonsCategory}`,
    `https://pt.wikipedia.org/wiki/${encodeURIComponent(tradition.ptTitle)}`,
  ],
  ptWikipediaIntro: ptIntro,
  commonsCategories,
  candidates: candidates.sort((a, b) => a.qid.localeCompare(b.qid, 'en', { numeric: true })),
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
const byKind = Object.fromEntries(
  [...new Set(candidates.map((c) => c.kind))].map((k) => [
    k,
    candidates.filter((c) => c.kind === k).length,
  ]),
);
console.log(JSON.stringify({ candidates: candidates.length, byKind }));
