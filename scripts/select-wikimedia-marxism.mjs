import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { marxismBaseEntities } from './ingestion/wikimedia/configurations.mjs';
import { selectCandidates, toConfigEntities } from './ingestion/wikimedia/selection.mjs';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'ingestion/wikimedia/discovery');
const snapshot = JSON.parse(await readFile(join(dir, 'marxismo.json'), 'utf8'));
const decisions = JSON.parse(await readFile(join(dir, 'marxismo.decisions.json'), 'utf8'));
const { included, excluded } = selectCandidates(snapshot.candidates, decisions);
const entities = toConfigEntities(included, new Set(marxismBaseEntities.map((row) => row[4])));
const selection = {
  tradition: 'marxismo',
  basedOn: 'marxismo.json',
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
await writeFile(join(dir, 'marxismo.selection.json'), `${JSON.stringify(selection, null, 2)}\n`);
console.log(
  JSON.stringify({
    included: included.length,
    configEntities: entities.length,
    excluded: excluded.length,
  }),
);
