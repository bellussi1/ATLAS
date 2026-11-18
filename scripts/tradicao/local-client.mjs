import http from 'node:http';
import https from 'node:https';

/**
 * Adaptador Ollama com interface compatível com `client.messages.create` do extrator rico.
 * Permite rodar os estágios de extração e conferência de texto/relações a custo US$ 0,00
 * na GPU local, mantendo integralmente as travas de `guards.mjs`.
 */
export const DEFAULT_LOCAL_MODEL = 'gemma2:9b-instruct-q4_K_M';

function postJsonNoTimeout(urlString, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const transport = url.protocol === 'https:' ? https : http;
    const data = JSON.stringify(body);
    const req = transport.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 0,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve({
            ok: (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300,
            status: res.statusCode ?? 0,
            text: async () => text,
            json: async () => JSON.parse(text),
          });
        });
      },
    );
    req.setTimeout(0);
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

export const isLocalModel = (model) =>
  typeof model === 'string' && (model.startsWith('local:') || model.startsWith('ollama/'));

export const stripLocalPrefix = (model) => String(model ?? '').replace(/^(local:|ollama\/)/, '');

function flattenContent(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return String(content ?? '');
  return content.map((part) => (typeof part === 'string' ? part : (part?.text ?? ''))).join('\n\n');
}

export function createOllamaClient({
  baseUrl = process.env.ATLAS_OLLAMA_URL || 'http://localhost:11434',
  fetchImpl,
} = {}) {
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/api/chat`;
  const send =
    typeof fetchImpl === 'function'
      ? (body) =>
          fetchImpl(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
      : (body) => postJsonNoTimeout(endpoint, body);
  return {
    messages: {
      async create(params) {
        const model = stripLocalPrefix(params.model || DEFAULT_LOCAL_MODEL);
        const system = flattenContent(params.system);
        const messages = [];
        if (system) messages.push({ role: 'system', content: system });
        for (const msg of params.messages ?? []) {
          messages.push({ role: msg.role ?? 'user', content: flattenContent(msg.content) });
        }
        const format = params.output_config?.format?.schema ?? 'json';
        const response = await send({
          model,
          stream: false,
          format,
          options: { temperature: 0, num_ctx: 12288, num_predict: 8192 },
          messages,
        });
        if (!response.ok) {
          const detail = await response.text().catch(() => '');
          throw new Error(
            `Ollama local retornou HTTP ${response.status} (${model}): ${detail.slice(0, 200)}`,
          );
        }
        const payload = await response.json();
        const text = payload?.message?.content ?? '';
        return {
          id: `local-${Date.now()}`,
          model: params.model,
          stop_reason: payload?.done_reason === 'length' ? 'max_tokens' : 'end_turn',
          content: [{ type: 'text', text }],
          usage: {
            input_tokens: payload?.prompt_eval_count ?? 0,
            output_tokens: payload?.eval_count ?? 0,
          },
        };
      },
    },
  };
}
