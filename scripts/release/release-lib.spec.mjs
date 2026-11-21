import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  bumpVersion,
  contentDecision,
  isValidCommitSubject,
  latestTag,
  phaseForBranch,
  suggestBump,
} from './release-lib.mjs';

test('o bump segue feat/perf e ignora commits de release', () => {
  assert.equal(suggestBump(['fix(mapa): corrige zoom', 'docs: ajusta texto']), 'patch');
  assert.equal(suggestBump(['fix(mapa): corrige zoom', 'feat(grafo): nova camada']), 'minor');
  assert.equal(suggestBump(['refactor(api)!: troca contrato']), 'minor');
  assert.equal(suggestBump(['chore(release): sobe a versao do app', 'Merge branch x']), 'none');
});

test('bumpVersion calcula minor e patch', () => {
  assert.equal(bumpVersion('0.3.0', 'minor'), '0.4.0');
  assert.equal(bumpVersion('0.3.9', 'patch'), '0.3.10');
  assert.throws(() => bumpVersion('0.3', 'patch'));
});

test('o assunto do commit respeita o hook', () => {
  assert.ok(isValidCommitSubject('chore(release): sobe a versao do app'));
  assert.ok(isValidCommitSubject('Merge pull request #1'));
  assert.ok(!isValidCommitSubject('chore(release): sobe a versao do app.'));
  assert.ok(!isValidCommitSubject('Chore: Maiusculo'));
});

test('so publica conteudo quando o hash muda', () => {
  assert.equal(contentDecision({ compiledRelease: 'a', pinnedRelease: 'a' }), 'unchanged');
  assert.equal(contentDecision({ compiledRelease: 'b', pinnedRelease: 'a' }), 'publish');
  assert.throws(() => contentDecision({ compiledRelease: '', pinnedRelease: 'a' }));
});

test('latestTag ordena semanticamente e a fase depende da branch', () => {
  assert.equal(latestTag(['v0.1.0', 'v0.10.0', 'v0.3.0', 'x']), 'v0.10.0');
  assert.equal(latestTag([]), null);
  assert.equal(phaseForBranch('master'), 'tag');
  assert.equal(phaseForBranch('develop'), 'prepare');
  assert.equal(phaseForBranch('wip'), 'unsupported');
});
