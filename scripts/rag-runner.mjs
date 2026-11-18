#!/usr/bin/env node
// Wrapper multiplataforma para executar a CLI do pipeline RAG local (experiments/rag)
// sem exigir ativacao manual do virtualenv.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Localiza o interpretador Python dentro de experiments/rag/.venv. */
export function resolveRagPython(rootDir = projectRoot, exists = existsSync) {
  const candidates =
    process.platform === 'win32'
      ? [
          join(rootDir, 'experiments', 'rag', '.venv', 'Scripts', 'python.exe'),
          join(rootDir, 'experiments', 'rag', '.venv', 'bin', 'python'),
        ]
      : [
          join(rootDir, 'experiments', 'rag', '.venv', 'bin', 'python'),
          join(rootDir, 'experiments', 'rag', '.venv', 'Scripts', 'python.exe'),
        ];
  for (const candidate of candidates) {
    if (exists(candidate)) return candidate;
  }
  return null;
}

/** Monta comando e argumentos para chamar `python -m atlas_rag.cli ...`. */
export function buildRagCommand(pythonExe, args = []) {
  return {
    command: pythonExe,
    args: ['-m', 'atlas_rag.cli', ...args],
  };
}

export function runRagCli(args = process.argv.slice(2), { rootDir = projectRoot } = {}) {
  const pythonExe = resolveRagPython(rootDir);
  if (!pythonExe) {
    console.error(
      'Ambiente Python do RAG nao encontrado em experiments/rag/.venv. Rode `npm run setup` primeiro.',
    );
    return 1;
  }
  const { command, args: cmdArgs } = buildRagCommand(pythonExe, args);
  const result = spawnSync(command, cmdArgs, {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      PYTHONUTF8: '1',
      PYTHONIOENCODING: 'utf-8',
    },
  });
  if (result.error) {
    console.error(`Falha ao executar atlas-rag: ${result.error.message}`);
    return 1;
  }
  return result.status ?? 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = runRagCli();
}
