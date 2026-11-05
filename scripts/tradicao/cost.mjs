/**
 * Controle de custo, sem rede: estimativa antes de rodar, teto que aborta e custo real por resposta.
 * Preços da tabela da API em 2026-10; confira antes de orçar valores grandes.
 * Cache: leitura 0,1×, escrita 1,25× (5 min) ou 2× (1 h). Lote: 50% em tudo.
 */
export const prices = {
  'claude-haiku-5-5': {
    input: 0.1,
    output: 0.5,
    longPrompt: { aboveTokens: 100_000, input: 0.5, output: 2.5 },
  },
  'claude-sonnet-5-5': { input: 2, output: 10 },
};
export const batchFactor = 0.5;
export const cacheFactors = { read: 0.1, write5m: 1.25, write1h: 2 };

/**
 * Sem chamada à API não há contagem exata. Haiku 5.5 conta cerca de 30% mais tokens que a geração
 * anterior para o mesmo texto, então o divisor fica do lado que superestima a entrada.
 */
export const charsPerToken = 2.7;
export const estimateTokens = (chars) => Math.ceil(chars / charsPerToken);

/** Saída típica por pedido, com pensamento. Hipótese até a primeira medição; o teto usa max_tokens. */
export const assumedOutputTokens = {
  extract: { low: 5_000, medium: 7_000 },
  verify: { low: 500, medium: 800 },
};

function rates(model, promptTokens) {
  const price = prices[model];
  if (!price) throw new Error(`Modelo sem preço na tabela: ${model}`);
  const long = price.longPrompt;
  return long && promptTokens > long.aboveTokens ? long : price;
}

/** Real cost of one response, from the `usage` the API returned. */
export function costOfUsage(usage, { model, batch = false }) {
  const read = usage.cache_read_input_tokens ?? 0;
  const write1h = usage.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  const write5m =
    usage.cache_creation?.ephemeral_5m_input_tokens ??
    (usage.cache_creation_input_tokens ?? 0) - write1h;
  const prompt = (usage.input_tokens ?? 0) + read + write1h + write5m;
  const rate = rates(model, prompt);
  const inputEquivalent =
    (usage.input_tokens ?? 0) +
    read * cacheFactors.read +
    write5m * cacheFactors.write5m +
    write1h * cacheFactors.write1h;
  const usd = (inputEquivalent * rate.input + (usage.output_tokens ?? 0) * rate.output) / 1e6;
  return batch ? usd * batchFactor : usd;
}

/**
 * `requests`: `{ fixedChars, variableChars, maxOutputTokens, expectedOutputTokens }`. `expectedUsd`
 * assumes the typical output and cache hits after the first request. `worstCaseUsd` assumes every
 * request writes the cache and uses all of `max_tokens`: the API cannot charge more than this for
 * these requests, which is what makes the cap a guarantee and not a hope.
 */
export function estimateRun(requests, { model, batch = true, cached = true }) {
  const totals = {
    requests: requests.length,
    inputTokens: 0,
    expectedOutputTokens: 0,
    maxOutputTokens: 0,
  };
  let expected = 0;
  let worst = 0;
  const factor = batch ? batchFactor : 1;
  requests.forEach((request, position) => {
    const fixed = estimateTokens(request.fixedChars);
    const variable = estimateTokens(request.variableChars);
    const rate = rates(model, fixed + variable);
    totals.inputTokens += fixed + variable;
    totals.expectedOutputTokens += request.expectedOutputTokens;
    totals.maxOutputTokens += request.maxOutputTokens;
    const fixedFactor = !cached ? 1 : position === 0 ? cacheFactors.write1h : cacheFactors.read;
    expected +=
      ((fixed * fixedFactor + variable) * rate.input + request.expectedOutputTokens * rate.output) /
      1e6;
    worst +=
      ((fixed * (cached ? cacheFactors.write1h : 1) + variable) * rate.input +
        request.maxOutputTokens * rate.output) /
      1e6;
  });
  return { ...totals, model, batch, expectedUsd: expected * factor, worstCaseUsd: worst * factor };
}

export const formatUsd = (usd) => `US$ ${usd < 0.01 ? usd.toFixed(4) : usd.toFixed(3)}`;

export class BudgetExceeded extends Error {
  name = 'BudgetExceeded';
}

/**
 * Teto de gasto. `maxUsd` vale para esta execução; `maxTotalUsd` soma o que o razão já registrou
 * (a conta tem US$ 10). `reserve` é chamado antes de enviar e aborta se o pior caso não couber.
 */
export function createBudget({ maxUsd, maxTotalUsd = 10, spentBefore = 0 }) {
  let spent = 0;
  let reserved = 0;
  const check = (extra, what) => {
    if (spent + reserved + extra > maxUsd)
      throw new BudgetExceeded(
        `${what}: pior caso ${formatUsd(extra)} estoura o teto da execução de ${formatUsd(maxUsd)} (já comprometido ${formatUsd(spent + reserved)}). Nada foi enviado.`,
      );
    if (spentBefore + spent + reserved + extra > maxTotalUsd)
      throw new BudgetExceeded(
        `${what}: pior caso ${formatUsd(extra)} estoura o teto total de ${formatUsd(maxTotalUsd)} (razão: ${formatUsd(spentBefore)}). Nada foi enviado.`,
      );
  };
  return {
    reserve(extra, what) {
      check(extra, what);
      reserved += extra;
    },
    release(extra) {
      reserved = Math.max(0, reserved - extra);
    },
    charge(usd) {
      spent += usd;
    },
    get spent() {
      return spent;
    },
  };
}
