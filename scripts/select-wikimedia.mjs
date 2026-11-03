import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { baseEntities } from './ingestion/wikimedia/configurations.mjs';
import { selectCandidates, toConfigEntities } from './ingestion/wikimedia/selection.mjs';
import { traditionFor } from './ingestion/wikimedia/traditions.mjs';

// Usage: node scripts/select-wikimedia.mjs <tradição>
const tradition = traditionFor(process.argv[2] ?? 'marxismo');
const dir = join(dirname(fileURLToPath(import.meta.url)), 'ingestion/wikimedia/discovery');
const snapshot = JSON.parse(await readFile(join(dir, `${tradition.slug}.json`), 'utf8'));
const decisionsPath = join(dir, `${tradition.slug}.decisions.json`);
const decisions = existsSync(decisionsPath)
  ? JSON.parse(await readFile(decisionsPath, 'utf8'))
  : { include: [], exclude: {} };
const { included, excluded } = selectCandidates(snapshot.candidates, decisions);
const base = baseEntities[tradition.configuration];
const entities = toConfigEntities(included, new Set(base.map((row) => row[4])));
const selection = {
  tradition: tradition.slug,
  basedOn: `${tradition.slug}.json`,
  retrievedAt: snapshot.retrievedAt,
  entities,
  included: included.map(({ qid, kind, label, sitelinks, roles }) => ({
    qid,
    kind,
    label,
    sitelinks: sitelinks.count,
    roles,
  })),
  excluded,
};
await writeFile(
  join(dir, `${tradition.slug}.selection.json`),
  `${JSON.stringify(selection, null, 2)}\n`,
);
console.log(
  JSON.stringify({
    included: included.length,
    configEntities: entities.length,
    excluded: excluded.length,
  }),
);
