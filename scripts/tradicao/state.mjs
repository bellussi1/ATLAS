/**
 * Estado do pipeline em `generated/pipeline/<slug>/STATE.json`: por estágio, o hash das entradas,
 * o hash das saídas e o resultado da porta. Serve para retomar sem refazer: um estágio cujas
 * entradas não mudaram desde a última passagem não roda de novo.
 */
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';

import { format, resolveConfig } from 'prettier';

/**
 * Fonte única de progresso: estágios, entidades (por passada), lotes abertos e razão de gasto.
 * Em Windows `STATE.json` e o antigo `state.json` são o mesmo arquivo; em Linux o antigo é lido uma vez.
 */
export const statePath = (root, slug) => join(root, 'generated/pipeline', slug, 'STATE.json');

const legacyStatePath = (root, slug) => join(root, 'generated/pipeline', slug, 'state.json');

/** Fills what older files or fresh runs lack; an existing value is never overwritten. */
export function withStateDefaults(state) {
  return {
    version: 2,
    ...state,
    stages: state.stages ?? {},
    entities: state.entities ?? {},
    batches: state.batches ?? [],
    spend: {
      usd: 0,
      inputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 0,
      byPhase: {},
      byModel: {},
      ...state.spend,
    },
  };
}

async function childDirectories(path) {
  try {
    return (await readdir(path, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

/** Everything spent so far, in every STATE.json of this checkout: the account has one balance. */
export async function totalSpent(root) {
  const files = [];
  const pipeline = join(root, 'generated/pipeline');
  for (const name of await childDirectories(pipeline))
    files.push(join(pipeline, name, 'STATE.json'));
  const evals = join(root, 'generated/eval');
  for (const id of await childDirectories(evals))
    for (const name of await childDirectories(join(evals, id)))
      files.push(join(evals, id, name, 'STATE.json'));
  let usd = 0;
  for (const file of files) usd += (await loadStateFile(file)).spend.usd;
  return usd;
}

/** State kept outside a tradition, as the evaluation harness does for each arm. */
export async function loadStateFile(path, base = {}) {
  try {
    return withStateDefaults(JSON.parse(await readFile(path, 'utf8')));
  } catch (error) {
    if (error.code === 'ENOENT') return withStateDefaults(base);
    throw error;
  }
}

export async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const pending = `${path}.${process.pid}.tmp`;
  await writeFile(pending, `${JSON.stringify(value, null, 2)}\n`);
  await rename(pending, path);
}

export async function loadState(root, slug) {
  for (const path of [statePath(root, slug), legacyStatePath(root, slug)]) {
    try {
      return withStateDefaults(JSON.parse(await readFile(path, 'utf8')));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return withStateDefaults({ slug });
}

async function feed(hash, root, path) {
  const label = relative(root, path).split(sep).join('/');
  let info;
  try {
    info = await stat(path);
  } catch (error) {
    if (error.code === 'ENOENT') return hash.update(`${label}\0absent\0`);
    throw error;
  }
  if (info.isDirectory()) {
    hash.update(`${label}\0dir\0`);
    for (const name of (await readdir(path)).sort()) await feed(hash, root, join(path, name));
    return hash;
  }
  return hash
    .update(`${label}\0`)
    .update(await readFile(path))
    .update('\0');
}

/** Content hash of files and directories (recursive, sorted, relative to `root`); missing = absent. */
export async function hashPaths(root, paths) {
  const hash = createHash('sha256');
  for (const path of [...paths].sort()) await feed(hash, root, path);
  return hash.digest('hex').slice(0, 16);
}

/** Writes JSON formatted by the repository's Prettier config, so reruns leave no formatting noise. */
export async function writeFormattedJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const options = (await resolveConfig(path)) ?? {};
  await writeFile(path, await format(JSON.stringify(value), { ...options, filepath: path }));
}
