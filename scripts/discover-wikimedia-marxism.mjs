import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  commonsCategoryTree,
  discoverWikidataCandidates,
  ptWikipediaIntro,
} from './ingestion/wikimedia/discovery.mjs';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = join(projectRoot, 'scripts/ingestion/wikimedia/discovery/marxismo.json');

const candidates = await discoverWikidataCandidates();
const commonsCategories = await commonsCategoryTree('Category:Marxism', { depth: 2, limit: 80 });
const ptIntro = await ptWikipediaIntro('Marxismo');
const snapshot = {
  tradition: 'marxismo',
  rootQid: 'Q7264',
  retrievedAt: new Date().toISOString().slice(0, 10),
  sources: [
    'https://www.wikidata.org/wiki/Q7264',
    'https://commons.wikimedia.org/wiki/Category:Marxism',
    'https://pt.wikipedia.org/wiki/Marxismo',
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
console.log(
  JSON.stringify({
    candidates: candidates.length,
    byKind,
    commonsCategories: commonsCategories.length,
  }),
);
