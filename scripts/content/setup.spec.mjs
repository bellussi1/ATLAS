import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { buildRagCommand, resolveRagPython } from '../rag-runner.mjs';
import {
  buildSetupSummary,
  checkCredentialStatus,
  checkHuggingFaceModels,
  classifyOllamaModels,
  inspectEnvironment,
  parseOllamaList,
} from '../setup.mjs';

test('parseOllamaList parses model names, ids and sizes cleanly', () => {
  const sample = [
    'NAME                                                     ID              SIZE      MODIFIED',
    'qwen3:8b-q4_K_M                                          500a1f067a9f    5.2 GB    4 hours ago',
    'hf.co/bartowski/EuroLLM-9B-Instruct-GGUF:Q4_K_M          112233445566    5.6 GB    3 hours ago',
  ].join('\n');
  const parsed = parseOllamaList(sample);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, 'qwen3:8b-q4_K_M');
  assert.equal(parsed[0].size, '5.2 GB');
  assert.equal(parsed[1].name, 'hf.co/bartowski/EuroLLM-9B-Instruct-GGUF:Q4_K_M');
});

test('classifyOllamaModels matches recommended roles and reports missing models', () => {
  const classified = classifyOllamaModels([
    { name: 'qwen3:8b-q4_K_M', size: '5.2 GB' },
    { name: 'hf.co/bartowski/EuroLLM-9B-Instruct-GGUF:Q4_K_M', size: '5.6 GB' },
  ]);
  assert.equal(classified.matchedRoles.length, 2);
  assert.equal(classified.missingRecommended.length, 4);
});

test('checkCredentialStatus verifies keys without ever exposing secret values', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'atlas-setup-creds-'));
  const r2Path = join(dir, 'r2.env');
  const dotEnvPath = join(dir, '.env');
  await writeFile(
    r2Path,
    [
      'R2_ENDPOINT=https://account.r2.cloudflarestorage.com',
      'R2_BUCKET=atlas-public',
      'R2_PUBLIC_URL=https://pub.example.test',
      'R2_ACCESS_KEY_ID=super-secret-id',
      'R2_SECRET_ACCESS_KEY=super-secret-value',
    ].join('\n'),
  );
  await writeFile(dotEnvPath, 'ANTHROPIC_API_KEY=sk-ant-secret\n');

  const status = checkCredentialStatus({
    env: {},
    r2EnvPath: r2Path,
    dotEnvPath,
  });
  assert.equal(status.r2Configured, true);
  assert.deepEqual(status.r2MissingKeys, []);
  assert.equal(status.paidApis.anthropic, true);
  assert.equal(status.paidApis.gemini, false);
  const serialized = JSON.stringify(status);
  assert.equal(serialized.includes('super-secret'), false);
  assert.equal(serialized.includes('sk-ant-secret'), false);
});

test('checkHuggingFaceModels detects cached embedding and reranker directories', async () => {
  const hubDir = await mkdtemp(join(tmpdir(), 'atlas-hf-hub-'));
  await mkdir(join(hubDir, 'models--BAAI--bge-m3'));
  const models = checkHuggingFaceModels(hubDir);
  const bge = models.find((m) => m.id === 'BAAI/bge-m3');
  const reranker = models.find((m) => m.id === 'BAAI/bge-reranker-v2-m3');
  assert.equal(bge?.cached, true);
  assert.equal(reranker?.cached, false);
});

test('resolveRagPython and buildRagCommand construct valid CLI invocation', () => {
  const root = join('C:', 'atlas');
  const expectedWin = join(root, 'experiments', 'rag', '.venv', 'Scripts', 'python.exe');
  const expectedPosix = join(root, 'experiments', 'rag', '.venv', 'bin', 'python');
  const found = resolveRagPython(root, (p) => p === expectedWin || p === expectedPosix);
  assert.ok(found === expectedWin || found === expectedPosix);
  const cmd = buildRagCommand(found, ['ingest-public', '--topic', 'trabalhismo']);
  assert.equal(cmd.command, found);
  assert.deepEqual(cmd.args, ['-m', 'atlas_rag.cli', 'ingest-public', '--topic', 'trabalhismo']);
});

test('inspectEnvironment and buildSetupSummary report workspace and 1-command shortcuts', () => {
  const report = inspectEnvironment({ probeGpu: false });
  assert.equal(report.content.pointerReady, true);
  const summary = buildSetupSummary(report);
  assert.match(summary, /npm run setup/);
  assert.match(summary, /npm run content:publish/);
  assert.match(summary, /npm run rag:ingest/);
});
