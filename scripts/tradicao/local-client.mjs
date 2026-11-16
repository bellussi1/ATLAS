/**
 * Adaptador Ollama com interface compatível com `client.messages.create` do extrator rico.
 * Permite rodar os estágios de extração e conferência de texto/relações a custo US$ 0,00
 * na GPU local, mantendo integralmente as travas de `guards.mjs`.
 */
export const DEFAULT_LOCAL_MODEL = 'qwen3:8b-q4_K_M';

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
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== 'function')
    throw new Error('fetch indisponível para o cliente Ollama local.');
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/api/chat`;
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
        const response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            stream: false,
            format,
            options: { temperature: 0, num_ctx: 16384 },
            messages,
          }),
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
