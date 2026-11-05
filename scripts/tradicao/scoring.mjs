/**
 * Descoberta por expansão (estágio 2): sem sementes escolhidas por pessoa. O ponto de partida é o
 * Wikidata (a ideologia raiz do registro e as subclasses); cada nó aceito abre vizinhos em anéis de
 * 1 a 3 saltos, com teto por anel. A importância é global primeiro (idiomas, nós já aceitos que
 * citam o candidato, posição do link no artigo); o bônus regional é regra explícita, com limiar
 * menor. Acima do limite alto aceita sozinho; a faixa do meio vira lista curta para decisão
 * humana; abaixo, descarta. Reconcilia por QID: um grafo único, tradições são lentes (etiquetas).
 *
 * Este módulo é puro: a rede entra por `neighbors`, injetada, e a função não conhece Wikidata.
 */

import { mentionTypes } from '../ingestion/wiki-extract/discovery.mjs';

export const maxRing = 3;

/** Pesos e limites padrão; o registro da tradição pode sobrescrever `thresholds` e `ringCaps`. */
export const defaults = {
  weights: { languages: 1, citedBy: 4, position: 6, regional: 15 },
  thresholds: { accept: 60, review: 30, regionalReview: 20 },
  ringCaps: { 1: 40, 2: 30, 3: 20 },
  /** Vagas à parte por anel para o nicho regional: sem isso, páginas famosas tomam todo o teto. */
  regionalCap: 15,
  /** Lista curta para a pessoa decidir: passou disso, o excedente é descartado com motivo. */
  reviewCap: 30,
  /** Link mais adiante que isto, citado por um nó só, não é aceito sozinho: vai para a lista curta. */
  relevantPosition: 0.3,
};

/** Tipos que quase todo artigo cita ("Política", "Estado"): link no texto não basta para aceitar. */
export const broadTypes = new Set(['conceito', 'acontecimento', 'movimento', 'lugar']);
const textLink = 'link no texto';

/** Brasil, América Latina e países da região; Guerra Fria como período. A regra é dado, não palpite. */
export const regionalRules = {
  regions: [
    'Q155', // Brasil
    'Q12585', // América Latina
    'Q18', // América do Sul
    'Q414', // Argentina
    'Q298', // Chile
    'Q750', // Bolívia
    'Q739', // Colômbia
    'Q241', // Cuba
    'Q736', // Equador
    'Q96', // México
    'Q811', // Nicarágua
    'Q733', // Paraguai
    'Q419', // Peru
    'Q77', // Uruguai
    'Q717', // Venezuela
    'Q774', // Guatemala
    'Q792', // El Salvador
    'Q783', // Honduras
    'Q800', // Costa Rica
    'Q804', // Panamá
    'Q786', // República Dominicana
    'Q790', // Haiti
  ],
  periods: ['Q8683'], // Guerra Fria
};

/** Títulos que nunca são entidade: listas, desambiguações, anos e séculos genéricos. */
const genericTitle = [
  /^(lista|list|listas|anexo|categoria|category|portal|wikipedia)\b/i,
  /\((desambigua[cç][aã]o|disambiguation|desambiguaci[oó]n)\)$/i,
  /^\d{1,4}( (a\.?\s?c\.?|bc|ad))?$/i,
  /^(s[eé]culo|century|siglo)\b/i,
  /^\d{4}s?$/,
];
export const isGenericTitle = (title) => genericTitle.some((pattern) => pattern.test(title.trim()));

/** `linkPosition` is 0 (first paragraph) to 1 (end of article); earlier links weigh more. */
export function scoreCandidate(candidate, weights = defaults.weights) {
  const languages = Math.min(candidate.languages ?? 0, 80);
  const citedBy = Math.min(candidate.citedByAccepted ?? 0, 10);
  const position = 1 - Math.min(Math.max(candidate.linkPosition ?? 1, 0), 1);
  return Math.round(
    languages * weights.languages + citedBy * weights.citedBy + position * weights.position * 10,
  );
}

/**
 * Regional rule: an article tied to Brazil or Latin America, or to the Cold War context, counts
 * with the lower threshold. The rule is data, so a reader can see why a candidate was kept.
 */
export function regionalReason(candidate, rules = {}) {
  const regions = rules.regions ?? regionalRules.regions;
  const periods = rules.periods ?? regionalRules.periods;
  const tagged = new Set(candidate.regions ?? []);
  if (regions.some((qid) => tagged.has(qid))) return 'América Latina ou Brasil';
  if (periods.some((qid) => tagged.has(qid))) return 'contexto da Guerra Fria';
  return null;
}

export function decide(candidate, { thresholds = defaults.thresholds, regional } = {}) {
  if (isGenericTitle(candidate.title)) return { decision: 'discard', reason: 'título genérico' };
  // Catalogues and authority records lead rankings by being linked everywhere; their type gives them away.
  if (candidate.type && !mentionTypes.has(candidate.type))
    return { decision: 'discard', reason: `tipo fora do escopo: ${candidate.type}` };
  const score = candidate.score;
  if (score >= thresholds.accept) return { decision: 'accept', reason: `pontuação ${score}` };
  const reason = regional ?? null;
  if (reason && score >= thresholds.regionalReview)
    return {
      decision: score >= thresholds.review ? 'accept' : 'review',
      reason: `regional: ${reason}`,
    };
  if (score >= thresholds.review)
    return { decision: 'review', reason: `faixa intermediária ${score}` };
  return { decision: 'discard', reason: `pontuação ${score}` };
}

/**
 * Breadth-first expansion. `roots` are QIDs already accepted (the root ideology and subclasses).
 * `neighbors(qid)` returns candidates `{ qid, title, languages, linkPosition, regions, via }` for
 * links of the text and properties (influenciado por, parte de, participante, país). Returns every
 * candidate seen once (by QID), with ring, score, decision and reason.
 */
export async function expand(roots, neighbors, options = {}) {
  const thresholds = { ...defaults.thresholds, ...options.thresholds };
  const ringCaps = { ...defaults.ringCaps, ...options.ringCaps };
  const weights = { ...defaults.weights, ...options.weights };
  const reviewCap = options.reviewCap ?? defaults.reviewCap;
  const regionalCap = options.regionalCap ?? defaults.regionalCap;
  const relevantPosition = options.relevantPosition ?? defaults.relevantPosition;
  const expandable = options.expandable ?? (() => true);
  let reviews = 0;
  const seen = new Map(
    roots.map((qid) => [qid, { qid, ring: 0, decision: 'accept', reason: 'raiz' }]),
  );
  let frontier = [...roots];
  for (let ring = 1; ring <= (options.maxRing ?? maxRing); ring += 1) {
    const found = new Map();
    for (const from of frontier) {
      for (const neighbor of await neighbors(from)) {
        if (seen.has(neighbor.qid)) continue;
        const entry = found.get(neighbor.qid) ?? { ...neighbor, citers: new Set() };
        entry.citers.add(from);
        entry.linkPosition = Math.min(entry.linkPosition ?? 1, neighbor.linkPosition ?? 1);
        found.set(neighbor.qid, entry);
      }
    }
    const ranked = [...found.values()]
      .map((entry) => {
        const citedByAccepted = entry.citers.size;
        const regional = regionalReason(entry, options.regional);
        const score =
          scoreCandidate({ ...entry, citedByAccepted }, weights) +
          (regional ? weights.regional : 0);
        const decided = decide({ ...entry, score }, { thresholds, regional });
        const declared = (entry.via ?? []).some((via) => via !== textLink);
        const relevant =
          regional ||
          declared ||
          citedByAccepted >= 2 ||
          (!broadTypes.has(entry.type) && (entry.linkPosition ?? 1) <= relevantPosition);
        return {
          ...entry,
          citers: undefined,
          citedByAccepted,
          ring,
          score,
          // Fame alone is not relevance: a famous page linked once, deep in an article, waits for a person.
          ...(decided.decision === 'accept' && !relevant
            ? { decision: 'review', reason: `sem sinal de relevância; pontuação ${score}` }
            : decided),
          ...(regional ? { regional } : {}),
        };
      })
      .sort((a, b) => b.score - a.score || a.qid.localeCompare(b.qid, 'en'));
    // The ring cap bounds what is opened further: review and discard keep their decision.
    const kept = [
      ...ranked.filter((entry) => !entry.regional).slice(0, ringCaps[ring]),
      ...ranked.filter((entry) => entry.regional).slice(0, regionalCap),
    ];
    for (const entry of ranked) {
      if (!kept.includes(entry)) {
        seen.set(entry.qid, {
          ...entry,
          decision: 'discard',
          reason: `acima do teto do anel ${ring}`,
        });
        continue;
      }
      if (entry.decision === 'review') reviews += 1;
      seen.set(
        entry.qid,
        entry.decision === 'review' && reviews > reviewCap
          ? {
              ...entry,
              decision: 'discard',
              reason: `acima do teto de ${reviewCap} da lista curta`,
            }
          : entry,
      );
    }
    frontier = kept
      .filter((entry) => entry.decision === 'accept' && expandable(entry))
      .map((entry) => entry.qid);
    if (!frontier.length) break;
  }
  return [...seen.values()].filter((entry) => entry.ring > 0);
}

/** Summary used by the gate and the report: what each band holds, per ring. */
export function summarize(candidates) {
  const byDecision = { accept: 0, review: 0, discard: 0 };
  const byRing = {};
  for (const candidate of candidates) {
    byDecision[candidate.decision] += 1;
    byRing[candidate.ring] ??= { accept: 0, review: 0, discard: 0 };
    byRing[candidate.ring][candidate.decision] += 1;
  }
  return { byDecision, byRing };
}
