#!/usr/bin/env node
// Retains the current pointer and the three previous distinct releases. Everything in c/ and m/
// that no retained pointer names is removed; pointer.json, raw/ and atlas-drafts are untouched.
//   node scripts/infra/prune-releases.mjs
//   node scripts/infra/prune-releases.mjs --keep 4 --apply
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

import {
  deleteR2Objects,
  listR2Objects,
  loadR2Config,
  pointerPath,
} from '../content/r2-content.mjs';
import { keepPointers, keysForPointers } from './release-retention.mjs';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const keepIndex = args.indexOf('--keep');
const keep = keepIndex >= 0 ? Number(args[keepIndex + 1]) : 4;
if (!Number.isInteger(keep) || keep < 1) throw new Error('--keep deve ser um inteiro positivo.');

const current = JSON.parse(await readFile(pointerPath, 'utf8'));
const commits = execFileSync('git', ['log', '--format=%H', '--', 'content/content-pointer.json'], {
  encoding: 'utf8',
})
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);
const history = [];
for (const commit of commits) {
  try {
    history.push(
      JSON.parse(
        execFileSync('git', ['show', `${commit}:content/content-pointer.json`], {
          encoding: 'utf8',
        }),
      ),
    );
  } catch {
    // A pointer file that did not exist in an older commit is not a release.
  }
}
const retained = keepPointers(current, history, keep);
const required = keysForPointers(retained);
const config = await loadR2Config();
const objects = (await listR2Objects(config, 'c/')).concat(await listR2Objects(config, 'm/'));
const removable = objects.filter((object) => !required.has(object.key));
const bytes = removable.reduce((sum, object) => sum + object.size, 0);
console.log(
  `${retained.length} releases retidos (${retained.map((pointer) => pointer.release).join(', ')}); ` +
    `${removable.length} objetos removíveis (${(bytes / 1024 / 1024).toFixed(1)} MB).`,
);
if (!apply) {
  console.log('Plano apenas. Use --apply para apagar.');
  process.exitCode = 0;
} else {
  const deleted = await deleteR2Objects(
    config,
    removable.map((object) => object.key),
  );
  console.log(`${deleted} objetos apagados de c/ e m/.`);
}
