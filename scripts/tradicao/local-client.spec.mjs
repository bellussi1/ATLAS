import assert from 'node:assert/strict';
import test from 'node:test';

import { costOfUsage, estimateRun } from './cost.mjs';
import { createOllamaClient, isLocalModel, stripLocalPrefix } from './local-client.mjs';

test('reconhece e normaliza modelos locais e zera o custo estimado e real', () => {
  assert.equal(isLocalModel('local:qwen3:8b-q4_K_M'), true);
  assert.equal(isLocalModel('ollama/gemma2:9b-instruct-q4_K_M'), true);
  assert.equal(isLocalModel('claude-haiku-5-5'), false);
  assert.equal(stripLocalPrefix('local:qwen3:8b-q4_K_M'), 'qwen3:8b-q4_K_M');

  const estimate = estimateRun(
    [{ fixedChars: 3000, variableChars: 6000, maxOutputTokens: 2000, expectedOutputTokens: 800 }],
    { model: 'local:qwen3:8b-q4_K_M', batch: false },
  );
  assert.equal(estimate.expectedUsd, 0);
  assert.equal(estimate.worstCaseUsd, 0);
  assert.equal(
    costOfUsage({ input_tokens: 1200, output_tokens: 450 }, { model: 'local:qwen3:8b-q4_K_M' }),
    0,
  );
});

test('adaptador Ollama converte system/messages/schema e devolve formato Anthropic', async () => {
  let capturedUrl = '';
  let capturedBody = null;
  const client = createOllamaClient({
    baseUrl: 'http://127.0.0.1:11434/',
    fetchImpl: async (url, init) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        async json() {
          return {
            message: { content: '{"oneLine":"Resumo"}' },
            prompt_eval_count: 111,
            eval_count: 22,
          };
        },
      };
    },
  });

  const result = await client.messages.create({
    model: 'local:qwen3:8b-q4_K_M',
    system: [{ type: 'text', text: 'Sistema' }],
    messages: [{ role: 'user', content: 'Texto fonte' }],
    output_config: { format: { type: 'json_schema', schema: { type: 'object' } } },
  });

  assert.equal(capturedUrl, 'http://127.0.0.1:11434/api/chat');
  assert.equal(capturedBody.model, 'qwen3:8b-q4_K_M');
  assert.deepEqual(capturedBody.format, { type: 'object' });
  assert.equal(capturedBody.messages[0].role, 'system');
  assert.equal(capturedBody.messages[1].content, 'Texto fonte');
  assert.equal(result.content[0].text, '{"oneLine":"Resumo"}');
  assert.deepEqual(result.usage, { input_tokens: 111, output_tokens: 22 });
});
