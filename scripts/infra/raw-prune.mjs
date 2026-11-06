#!/usr/bin/env node
// Keeps only the raw captures referenced by the newest N capture manifests (or by captures inside
// a day window). Raw objects are content-addressed and shared by digests, so the union of the
// retained manifests is what stays. Default is a dry run; deletion requires --apply.
//   node scripts/infra/raw-prune.mjs --keep 20
//   node scripts/infra/raw-prune.mjs --days 90 --apply
import { relative, sep } from 'node:path';

import { deleteR2Objects, listR2Objects, loadR2Config } from '../content/r2-content.mjs';
import { listJsonResponses, rawRoot } from '../ingestion/wikimedia/raw-store.mjs';
import { wikiRawRoot } from '../ingestion/wiki-extract/raw.mjs';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const keepIndex = args.indexOf('--keep');
const daysIndex = args.indexOf('--days');
const keep = keepIndex >= 0 ? Number(args[keepIndex + 1]) : daysIndex >= 0 ? null : 20;
const days = daysIndex >= 0 ? Number(args[daysIndex + 1]) : null;
if (keep !== null && (!Number.isInteger(keep) || keep < 1))
  throw new Error('--keep deve ser um inteiro positivo.');
if (days !== null && (!Number.isInteger(days) || days < 1))
  throw new Error('--days deve ser um inteiro positivo.');

const roots = [rawRoot, wikiRawRoot];
function captureOf(directory) {
  for (const root of roots) {
    const path = relative(root, directory);
    if (!path.startsWith('..')) return path.split(sep).slice(0, 2).join('/');
  }
  return directory;
}

const responses = await listJsonResponses();
const captures = new Map();
for (const [sha256, response] of responses) {
  const capture = captureOf(response.directory);
  captures.set(capture, [...(captures.get(capture) ?? []), sha256]);
}
const ordered = [...captures.keys()].sort().reverse();
let retained;
if (keep !== null) {
  retained = new Set(ordered.slice(0, keep));
} else {
  const cutoff = Date.now() - days * 86_400_000;
  retained = new Set(
    ordered.filter((capture) => {
      const stamp = capture.split('/')[1] ?? '';
      const date = new Date(stamp.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, 'T$1:$2:$3.$4Z'));
      return Number.isNaN(date.getTime()) || date.getTime() >= cutoff;
    }),
  );
}
const keepShas = new Set([...retained].flatMap((capture) => captures.get(capture) ?? []));

const config = await loadR2Config();
const objects = await listR2Objects(config, 'raw/');
const removable = objects.filter(({ key }) => {
  const sha256 = key.match(/^raw\/([a-f0-9]{64})\.bin$/)?.[1];
  return sha256 ? !keepShas.has(sha256) : false;
});
const bytes = removable.reduce((sum, object) => sum + object.size, 0);
console.log(
  `${objects.length} capturas no R2; ${retained.size} recortes retidos; ` +
    `${removable.length} objetos removíveis (${(bytes / 1024 / 1024).toFixed(1)} MB).`,
);
console.log(
  `Retendo: ${[...retained].sort().slice(0, 8).join(', ')}${retained.size > 8 ? ', …' : ''}`,
);
if (!apply) {
  console.log('Plano apenas. Use --apply para apagar.');
  process.exit(0);
}
const deleted = await deleteR2Objects(
  config,
  removable.map((object) => object.key),
);
console.log(`${deleted} objetos apagados do prefixo raw/.`);
