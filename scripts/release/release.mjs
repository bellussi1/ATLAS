#!/usr/bin/env node
// Single entry point for a production release (see docs/operations/PRODUCAO.md).
//   npm run release                plan only (default): runs the checks, changes nothing
//   npm run release -- --apply     on develop: publishes new content when the compiled hash changed,
//                                  bumps the version and commits; on master: creates tag vX.Y.Z
// Never pushes and never deploys: the next step is printed. Flags:
//   --bump minor|patch   overrides the suggested bump
//   --skip a,b           skips checks by name (lint, typecheck, test, test:content, test:ingestion,
//                        build, check:links); a skipped check is reported as a warning
import { execFileSync, spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  bumpVersion,
  contentDecision,
  isValidCommitSubject,
  latestTag,
  phaseForBranch,
  suggestBump,
} from './release-lib.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const skip = new Set((option('--skip') ?? '').split(',').filter(Boolean));
const forcedBump = option('--bump');
if (forcedBump && !['minor', 'patch'].includes(forcedBump))
  throw new Error('--bump aceita minor ou patch.');

const git = (...gitArgs) => execFileSync('git', gitArgs, { cwd: root, encoding: 'utf8' }).trim();
const problems = [];
const warnings = [];
const log = (message) => console.log(message);
const fail = (message) => {
  problems.push(message);
  log(`  falhou: ${message}`);
};

function runNpm(name, scriptArgs) {
  if (skip.has(name)) {
    log(`- ${name}: ignorado (--skip)`);
    warnings.push(`${name} ignorado`);
    return true;
  }
  const started = Date.now();
  const result = spawnSync(`npm ${scriptArgs.join(' ')}`, {
    cwd: root,
    encoding: 'utf8',
    shell: true,
    maxBuffer: 256 * 1024 * 1024,
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(0);
  if (result.status === 0) {
    log(`- ${name}: ok (${seconds}s)`);
    return true;
  }
  const tail = `${result.stdout}\n${result.stderr}`.trim().split(/\r?\n/).slice(-25).join('\n');
  log(`- ${name}: FALHOU (${seconds}s)\n${tail}`);
  problems.push(`${name} falhou`);
  return false;
}

const readJson = async (path) => JSON.parse(await readFile(join(root, path), 'utf8'));

function commitSubjectsSince(tag) {
  const output = git('log', '--no-merges', '--format=%s', tag ? `${tag}..HEAD` : 'HEAD');
  return output ? output.split(/\r?\n/) : [];
}

function tagPhase(version) {
  const tag = `v${version}`;
  log(`\nFase: tag na master (versão ${version})`);
  if (git('tag', '--list', tag)) return fail(`a tag ${tag} já existe; suba a versão no develop.`);
  const parents = git('rev-list', '--parents', '-n', '1', 'HEAD').split(' ').length - 1;
  if (parents < 2) warnings.push('HEAD da master não é um commit de merge');
  log(`- commit alvo: ${git('rev-parse', '--short', 'HEAD')} (${git('log', '-1', '--format=%s')})`);
  if (!apply) return log(`[dry-run] criaria a tag anotada ${tag} neste commit.`);
  git('tag', '-a', tag, '-m', tag);
  log(`tag ${tag} criada localmente.\n\nPróximo passo (não executado): git push origin ${tag}`);
}

async function preparePhase(branch, version) {
  log(`\nFase: preparar release a partir de ${branch}`);
  const pointer = await readJson('content/content-pointer.json');
  const manifest = await readJson('generated/content/manifest.json');
  const decision = contentDecision({
    compiledRelease: manifest.release,
    pinnedRelease: pointer.release,
  });
  log(
    decision === 'publish'
      ? `- conteúdo: release novo (${manifest.release.slice(0, 8)} ≠ ${pointer.release.slice(0, 8)})`
      : `- conteúdo: inalterado (${pointer.release.slice(0, 8)}); content:publish não é necessário`,
  );

  const tag = latestTag(git('tag', '--list').split(/\r?\n/).filter(Boolean));
  const subjects = commitSubjectsSince(tag);
  for (const subject of subjects)
    if (!isValidCommitSubject(subject)) warnings.push(`assunto fora do hook: ${subject}`);
  const suggestion = suggestBump(subjects);
  log(`- commits desde ${tag ?? 'o início'}: ${subjects.length}; bump sugerido: ${suggestion}`);

  const alreadyBumped = Boolean(tag) && tag.slice(1) !== version;
  const bump =
    forcedBump ?? (suggestion === 'none' ? (decision === 'publish' ? 'minor' : null) : suggestion);
  if (!bump && !alreadyBumped)
    return log('- nada a publicar: sem commits relevantes nem conteúdo novo.');
  const next = alreadyBumped ? version : bumpVersion(version, bump);
  log(`- próxima versão: ${next}${alreadyBumped ? ' (já em package.json)' : ''}`);

  if (!apply) {
    if (decision === 'publish')
      log('[dry-run] rodaria `npm run content:publish` e commitaria o ponteiro.');
    if (!alreadyBumped) log(`[dry-run] subiria a versão para ${next} e commitaria.`);
    log('[dry-run] nenhuma alteração foi feita.');
  } else {
    if (decision === 'publish') {
      if (!runNpm('content:publish', ['run', 'content:publish'])) return;
      git('add', 'content/content-pointer.json');
      git('commit', '-m', `chore(content): publica release ${manifest.release.slice(0, 8)}`);
    }
    if (!alreadyBumped) {
      if (!runNpm('version', ['version', next, '--no-git-tag-version'])) return;
      git('add', 'package.json', 'package-lock.json');
      git('commit', '-m', 'chore(release): sobe a versao do app');
    }
    log(`\nrelease ${next} preparado em ${branch}.`);
  }
  log(`\nPróximos passos (não executados):
  1. git push origin ${branch}
  2. gh pr create --base master --head ${branch} --title "release v${next}"
  3. depois do merge: git switch master && git pull && npm run release -- --apply  (cria a tag v${next})
  4. git push origin v${next}; o CI publica o Pages a partir da master.`);
}

async function main() {
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  const phase = phaseForBranch(branch);
  const { version } = await readJson('package.json');
  log(`ATLAS release (${apply ? 'APLICAR' : 'dry-run'}): branch ${branch}, versão ${version}`);
  if (phase === 'unsupported')
    return fail(`branch ${branch} não é develop nem master; troque de branch.`);

  const dirty = git('status', '--porcelain', '--untracked-files=no');
  if (!dirty) log('- árvore: limpa');
  else {
    const message = `árvore com alterações não commitadas (${dirty.split(/\r?\n/).length} arquivos)`;
    if (apply) fail(message);
    else {
      warnings.push(message);
      log(`- árvore: aviso, ${message}`);
    }
  }

  if (phase === 'prepare') {
    log('\nVerificações');
    const checks = [
      ['lint', ['run', 'lint']],
      ['typecheck', ['run', 'typecheck']],
      ['test', ['test']],
      ['test:content', ['run', 'test:content']],
      ['test:ingestion', ['run', 'test:ingestion']],
      ['build', ['run', 'build']],
      ['check:links', ['run', 'check:links']],
    ];
    for (const [name, scriptArgs] of checks) runNpm(name, scriptArgs);
    if (!runNpm('content:build', ['run', 'content:build'])) return;
    if (apply && problems.length) return log('\nCorrija as falhas antes de aplicar.');
    await preparePhase(branch, version);
  } else {
    if (apply && problems.length) return;
    tagPhase(version);
  }
}

await main();
log(`\nResumo: ${problems.length} falha(s), ${warnings.length} aviso(s).`);
for (const warning of warnings) log(`  aviso: ${warning}`);
process.exitCode = problems.length ? 1 : 0;
