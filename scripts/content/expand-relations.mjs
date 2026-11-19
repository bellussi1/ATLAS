#!/usr/bin/env node
/**
 * Amplia as relações do grafo a partir das afirmações com fonte que já existem: quando a
 * afirmação de um verbete cita literalmente outro verbete, a menção vira candidata. As
 * candidatas são priorizadas por região (Brasil > Europa > Estados Unidos > Ásia > mundo >
 * África), classificadas por modelo local (Ollama) e travadas por regras de tipo.
 *
 * Uso:
 *   node scripts/content/expand-relations.mjs --dry-run [--limit 400]
 *   node scripts/content/expand-relations.mjs [--limit 400] [--model gemma2:9b-instruct-q4_K_M]
 *
 * Cada relação nova aponta para a evidência da afirmação de origem, fica `pending` e leva o
 * marcador [conferência de IA]. A família visual é gravada em relation-categories.ts.
 */
import './register-source-modules.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { guardDecision, isWeakLabel } from './relation-guard.mjs';
import { readSourceGraph, writeSourceGraph } from './source-graph.mjs';

const { classifyRelation } =
  await import('../../src/app/core/content/queries/relation-category.ts');
const { relationCategoryDecisions } =
  await import('../../src/app/core/content/editorial/relation-categories.ts');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const dryRun = flag('--dry-run');
const limit = Number(option('--limit', '400'));
const perEntity = Number(option('--per-entity', '3'));
const model = option('--model', 'gemma2:9b-instruct-q4_K_M');
const endpoint = option('--endpoint', 'http://localhost:11434');
const cachePath = fileURLToPath(
  new URL('../../generated/relation-expansion-cache.json', import.meta.url),
);
const decisionsPath = fileURLToPath(
  new URL('../../src/app/core/content/editorial/relation-categories.ts', import.meta.url),
);

const normalize = (value) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');

const REGIONS = [
  {
    id: 'brasil',
    weight: 6,
    pattern:
      /\b(brasil|brasileir|vargas|sao paulo|rio de janeiro|minas gerais|rio grande do sul|pernambuco|bahia|lula|getulio|prestes|ptb|pcb|integralis|tenentis|castilhis|ditadura militar brasileira|estado novo)/,
  },
  {
    id: 'europa',
    weight: 5,
    pattern:
      /\b(europ|franca|frances|alemanha|alema|alemao|italia|italian|espanha|espanhol|portugal|portugues|inglaterra|reino unido|britanic|russia|russo|sovietic|urss|polonia|austria|grecia|suecia|holanda|belgica|irlanda|hungria|iugoslav)/,
  },
  {
    id: 'eua',
    weight: 4,
    pattern: /\b(estados unidos|norte-american|americano|washington|nova york|eua)\b/,
  },
  {
    id: 'asia',
    weight: 3,
    pattern:
      /\b(asia|china|chines|japao|japones|india|indian|coreia|vietna|indonesia|filipinas|camboja|iran|ira\b|turquia|israel|palestin|arabia|iraque|siria|paquistao)/,
  },
  {
    id: 'mundo',
    weight: 2,
    pattern:
      /\b(mundial|internacional|global|onu|nacoes unidas|guerra fria|america latina|argentina|chile|mexico|cuba|venezuela|uruguai|paraguai|colombia|peru|bolivia)/,
  },
  {
    id: 'africa',
    weight: 1,
    pattern:
      /\b(africa|angola|mocambique|egito|nigeria|argelia|etiopia|quenia|congo|guine|cabo verde|senegal|marrocos|tunisia)/,
  },
];

const regionOf = (text) => {
  const value = normalize(text);
  return REGIONS.find((region) => region.pattern.test(value)) ?? null;
};

const graph = await readSourceGraph();
const entities = graph.atlases.flatMap((atlas) => atlas.entities);
const entityById = new Map(entities.map((entity) => [entity.id, entity]));
const citationById = new Map();
const evidenceAtlas = new Map();
const sourceById = new Map();
const evidenceById = new Map();
const pairs = new Set();
const degree = new Map();
for (const atlas of graph.atlases) {
  for (const citation of atlas.citations) citationById.set(citation.id, citation);
  for (const evidence of atlas.evidences) {
    evidenceAtlas.set(evidence.id, atlas);
    evidenceById.set(evidence.id, evidence);
  }
  for (const source of atlas.sources) sourceById.set(source.id, source);
  for (const relation of atlas.relations) {
    pairs.add(`${relation.fromEntityId}|${relation.toEntityId}`);
    pairs.add(`${relation.toEntityId}|${relation.fromEntityId}`);
    // Degree counts only edges the network actually draws.
    if (!classifyRelation(relation)) continue;
    degree.set(relation.fromEntityId, (degree.get(relation.fromEntityId) ?? 0) + 1);
    degree.set(relation.toEntityId, (degree.get(relation.toEntityId) ?? 0) + 1);
  }
}

// Names that can be matched literally. Single-word generic terms ("Poder", "Estado") are
// skipped unless they name a person, ideology, party or place.
const NAMEABLE = new Set(['person', 'ideology', 'party', 'place', 'event', 'work']);
const names = [];
for (const entity of entities) {
  if (entity.scope === 'fora') continue;
  // Titles only: aliases and disambiguated titles ("Partido Popular (Brasil)") are too
  // ambiguous to match literally inside free text.
  for (const raw of [entity.title]) {
    if (/[()]/.test(raw)) continue;
    const name = normalize(raw.trim());
    if (name.length < 4) continue;
    if (!/\s/.test(name) && !NAMEABLE.has(entity.kind)) continue;
    names.push({ name, id: entity.id });
  }
}
names.sort((a, b) => b.name.length - a.name.length);
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const matchers = names.map((entry) => ({
  ...entry,
  pattern: new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(entry.name)}($|[^\\p{L}\\p{N}])`, 'u'),
}));

const candidates = new Map();
for (const atlas of graph.atlases) {
  if (atlas.id === 'atlas-methodology') continue;
  for (const claim of atlas.claims) {
    const from = entityById.get(claim.entityId);
    if (!from || from.scope === 'fora') continue;
    const text = normalize(claim.text);
    if (text.length < 40) continue;
    const evidenceIds = [
      ...new Set(claim.citationIds.map((id) => citationById.get(id)?.evidenceId).filter(Boolean)),
    ].filter((id) => evidenceAtlas.get(id)?.id === atlas.id);
    if (!evidenceIds.length) continue;
    const found = new Set();
    for (const matcher of matchers) {
      if (matcher.id === from.id || found.has(matcher.id)) continue;
      if (!matcher.pattern.test(text)) continue;
      found.add(matcher.id);
      const to = entityById.get(matcher.id);
      if (!to) continue;
      const fromName = normalize(from.title);
      const toName = normalize(to.title);
      if (fromName === toName || fromName.startsWith(toName) || toName.startsWith(fromName))
        continue;
      if (pairs.has(`${from.id}|${to.id}`)) continue;
      const key = [from.id, to.id].sort().join('|');
      if (candidates.has(key)) continue;
      const region = regionOf(`${from.title} ${to.title}`) ?? regionOf(claim.text);
      const lowDegree = (degree.get(from.id) ?? 0) + (degree.get(to.id) ?? 0) < 6 ? 1.5 : 0;
      candidates.set(key, {
        from,
        to,
        claim,
        atlas,
        evidenceIds,
        region: region?.id ?? 'sem-regiao',
        score:
          (region?.weight ?? 0.5) +
          lowDegree +
          (claim.classification === 'documented-fact' ? 0.5 : 0),
      });
    }
  }
}

// `--pairs file.json` ([[fromId, toId], ...]) targets essential links: any claim of one end
// that names the other (title or alias) becomes the candidate, whatever its region score.
const pairsPath = option('--pairs', null);
if (pairsPath) {
  candidates.clear();
  const wanted = JSON.parse(await readFile(pairsPath, 'utf8'));
  const claimsByEntity = new Map();
  for (const atlas of graph.atlases)
    for (const claim of atlas.claims) {
      const list = claimsByEntity.get(claim.entityId) ?? [];
      list.push({ claim, atlas });
      claimsByEntity.set(claim.entityId, list);
    }
  const namesOf = (entity) =>
    [entity.title, ...(entity.aliases ?? [])]
      .map((name) => normalize(name.replace(/\s*\(.*\)$/, '').trim()))
      .filter((name) => name.length >= 4);
  for (const [aId, bId] of wanted) {
    const a = entityById.get(aId);
    const b = entityById.get(bId);
    if (!a || !b || pairs.has(`${aId}|${bId}`)) continue;
    let hit = null;
    for (const [from, to] of [
      [a, b],
      [b, a],
    ]) {
      for (const { claim, atlas } of claimsByEntity.get(from.id) ?? []) {
        const text = normalize(claim.text);
        if (!namesOf(to).some((name) => text.includes(name))) continue;
        const evidenceIds = [
          ...new Set(
            claim.citationIds.map((id) => citationById.get(id)?.evidenceId).filter(Boolean),
          ),
        ].filter((id) => evidenceAtlas.get(id)?.id === atlas.id);
        if (!evidenceIds.length) continue;
        hit = { from, to, claim, atlas, evidenceIds, region: 'essencial', score: 10 };
        break;
      }
      if (hit) break;
    }
    if (hit) candidates.set(`${aId}|${bId}`, hit);
    else console.log(`Sem afirmação com fonte: ${a.title} — ${b.title}`);
  }
}

// `--isolated` keeps only candidates that give a first edge to a record drawn alone.
if (flag('--isolated')) {
  for (const [key, candidate] of candidates) {
    const alone = !degree.get(candidate.from.id) || !degree.get(candidate.to.id);
    if (!alone) candidates.delete(key);
  }
}

const ranked = [...candidates.values()].sort((a, b) => b.score - a.score);
const perEntityCount = new Map();
const selected = [];
for (const candidate of ranked) {
  const a = perEntityCount.get(candidate.from.id) ?? 0;
  const b = perEntityCount.get(candidate.to.id) ?? 0;
  if (a >= perEntity || b >= perEntity) continue;
  perEntityCount.set(candidate.from.id, a + 1);
  perEntityCount.set(candidate.to.id, b + 1);
  selected.push(candidate);
  if (selected.length >= limit) break;
}
const byRegion = {};
for (const candidate of selected)
  byRegion[candidate.region] = (byRegion[candidate.region] ?? 0) + 1;
console.log(`Candidatas: ${candidates.size}; selecionadas: ${selected.length}`, byRegion);
if (dryRun) {
  for (const c of selected.slice(0, 12))
    console.log(`- [${c.region}] ${c.from.title} → ${c.to.title} :: ${c.claim.text.slice(0, 110)}`);
  process.exit(0);
}

const FAMILY = {
  influencia: 'influenced',
  ruptura: 'rupture',
  atuacao: 'participation',
  criacao: 'creation',
  continuidade: 'continuity',
  filiacao: 'affiliation',
  lugar: 'location',
};
const TYPE_BY_FAMILY = {
  influenced: 'influenced',
  rupture: 'reacted_against',
  participation: 'participated_in',
  continuity: 'developed_into',
};

const cache = JSON.parse(await readFile(cachePath, 'utf8').catch(() => '{}'));
const cacheKey = (candidate) =>
  `${model}|${candidate.from.id}|${candidate.to.id}|${candidate.claim.id}`;

async function ask(candidate) {
  const key = cacheKey(candidate);
  if (cache[key]) return cache[key];
  const answer = await askModel(candidate);
  cache[key] = answer;
  return answer;
}

async function askModel(candidate) {
  const prompt = `Você descreve vínculos históricos num grafo de história, política, filosofia e sociologia.

A: ${candidate.from.title} (${candidate.from.kind})
B: ${candidate.to.title} (${candidate.to.kind})
Trecho com fonte: "${candidate.claim.text}"

Com base SOMENTE no trecho, qual é o vínculo de A com B?
- influencia: um influenciou o outro.
- ruptura: um se opôs, combateu ou rompeu com o outro.
- atuacao: participação, cargo, governo, militância, membro.
- criacao: fundação, autoria, criação.
- continuidade: sucessão, desdobramento, vertente.
- filiacao: pertence a uma corrente ou movimento, ou defende uma ideia.
- lugar: onde algo ocorreu ou está sediado.
- omitir: o trecho só menciona os dois, sem vínculo concreto entre eles.

Escreva também "rotulo": um verbo curto em português que leia "A <rotulo> B" (ex.: "fundou", "governou", "opôs-se a", "foi influenciado por"), e "rotulo_inverso" para "B <rotulo_inverso> A".
Responda só JSON: {"categoria": "...", "rotulo": "...", "rotulo_inverso": "..."}`;
  const response = await fetch(`${endpoint}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      format: 'json',
      stream: false,
      options: { temperature: 0, num_ctx: 2048 },
    }),
  });
  if (!response.ok) throw new Error(`Ollama ${response.status}`);
  return JSON.parse((await response.json()).response);
}

const decisions = { ...relationCategoryDecisions };
const tally = {};
let added = 0;
let index = 0;
for (const candidate of selected) {
  index++;
  let answer;
  try {
    answer = await ask(candidate);
  } catch (error) {
    console.error(`Falha em ${candidate.from.id}→${candidate.to.id}: ${error.message}`);
    continue;
  }
  const family = FAMILY[String(answer.categoria ?? '').toLowerCase()];
  const label = String(answer.rotulo ?? '').trim();
  const reverseLabel = String(answer.rotulo_inverso ?? '').trim();
  if (
    !family ||
    !label ||
    !reverseLabel ||
    label.length > 60 ||
    reverseLabel.length > 60 ||
    isWeakLabel(label)
  ) {
    tally.omit = (tally.omit ?? 0) + 1;
    continue;
  }
  // The label reads "A label B", so the arrow already points from A to B.
  // Essential pairs were chosen by hand, so the generic-term filter does not apply to them.
  const essential = candidate.region === 'essencial';
  const decision = guardDecision(
    family,
    candidate.from.kind,
    candidate.to.kind,
    essential ? null : candidate.from,
    essential ? null : candidate.to,
  );
  if (decision === 'omit') {
    tally.omit = (tally.omit ?? 0) + 1;
    continue;
  }
  const [finalFamily, flip] = decision.split(':');
  const reverse = flip === 'reverse';
  const fromEntity = reverse ? candidate.to : candidate.from;
  const toEntity = reverse ? candidate.from : candidate.to;
  const id = `rel-exp-${fromEntity.id}-${toEntity.id}`.slice(0, 120);
  const evidence = evidenceById.get(candidate.evidenceIds[0]);
  const source = evidence ? sourceById.get(evidence.sourceId) : undefined;
  candidate.atlas.relations.push({
    id,
    fromEntityId: fromEntity.id,
    toEntityId: toEntity.id,
    type: TYPE_BY_FAMILY[finalFamily] ?? 'documented-association',
    label: reverse ? reverseLabel : label,
    reverseLabel: reverse ? label : reverseLabel,
    context: `[conferência de IA] ${candidate.claim.text}`,
    temporalExtent: null,
    uncertainty: 'moderate',
    evidenceIds: candidate.evidenceIds,
    editorialStatus: 'pending',
    ...(source?.url && /wikipedia\.org/i.test(source.url)
      ? { provenance: { source: 'wikipedia', url: source.url, retrievedAt: evidence.accessedAt } }
      : {}),
  });
  pairs.add(`${fromEntity.id}|${toEntity.id}`);
  decisions[id] = finalFamily;
  tally[`${candidate.region}:${finalFamily}`] =
    (tally[`${candidate.region}:${finalFamily}`] ?? 0) + 1;
  added++;
  if (index % 25 === 0) {
    console.log(`${index}/${selected.length} · ${added} novas`);
    await writeFile(cachePath, JSON.stringify(cache), 'utf8');
  }
}

await writeFile(cachePath, JSON.stringify(cache), 'utf8');
await writeSourceGraph(graph);
const sorted = Object.entries(decisions).sort(([a], [b]) => a.localeCompare(b));
await writeFile(
  decisionsPath,
  `// Gerado por scripts/content/classify-relations.mjs e expand-relations.mjs. Não editar à mão.
// Revisão: conferência de IA (modelo local ${model}, ${new Date().toISOString().slice(0, 10)}), sem revisão humana.

/** Decisão por relação: família (\`creation\`, \`participation\`…, \`:reverse\` inverte a seta) ou \`omit\`. */
export const relationCategoryDecisions: Readonly<Record<string, string>> = {
${sorted.map(([key, value]) => `  '${key}': '${value}',`).join('\n')}
};
`,
  'utf8',
);
console.log(`Relações novas: ${added}`, tally);
