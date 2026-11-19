// Classifica com um modelo local (Ollama) as relações genéricas que as regras de rótulo de
// `relation-category.ts` não resolvem, e grava as decisões em
// `src/app/core/content/editorial/relation-categories.ts`.
//
// Uso:
//   node scripts/content/classify-relations.mjs --dry-run      # só conta o resíduo
//   node scripts/content/classify-relations.mjs [--model gemma2:9b-instruct-q4_K_M] [--limit N]
//
// Revisão de IA: não substitui revisão humana; o registro original permanece no grafo.
import './register-source-modules.mjs';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { guardDecision } from './relation-guard.mjs';
import { readSourceGraph } from './source-graph.mjs';

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
const model = option('--model', 'gemma2:9b-instruct-q4_K_M');
const limit = Number(option('--limit', 'Infinity'));
const endpoint = option('--endpoint', 'http://localhost:11434');
const target = fileURLToPath(
  new URL('../../src/app/core/content/editorial/relation-categories.ts', import.meta.url),
);

const OMITTED_TYPES = new Set([
  'encyclopedic-link',
  'encyclopedic_link',
  'editorial-link',
  'editorial_link',
]);
const CATEGORY_TO_FAMILY = {
  influencia: 'influenced',
  ruptura: 'rupture',
  atuacao: 'participation',
  criacao: 'creation',
  continuidade: 'continuity',
  filiacao: 'affiliation',
  lugar: 'location',
  omitir: 'omit',
};

const graph = await readSourceGraph();
const entities = new Map(graph.atlases.flatMap((atlas) => atlas.entities).map((e) => [e.id, e]));
const seen = new Set();
const residue = [];
for (const atlas of graph.atlases) {
  for (const relation of atlas.relations) {
    if (seen.has(relation.id)) continue;
    seen.add(relation.id);
    if (OMITTED_TYPES.has(relation.type)) continue;
    if (relation.id in relationCategoryDecisions) continue;
    if (classifyRelation(relation) !== null) continue;
    residue.push(relation);
  }
}
console.log(`Relações genéricas sem família por regra: ${residue.length}`);
if (dryRun) process.exit(0);

function prompt(relation) {
  const from = entities.get(relation.fromEntityId);
  const to = entities.get(relation.toEntityId);
  const context = (relation.context ?? '').replace(/\[conferência de IA\]\s*/g, '').slice(0, 500);
  return `Você classifica relações de um grafo educacional de história, política, filosofia e sociologia.

Origem: ${from?.title} (${from?.kind})
Destino: ${to?.title} (${to?.kind})
Rótulo atual: "${relation.label}"
Contexto da fonte: ${context || '(sem contexto)'}

Escolha UMA categoria:
- influencia: uma pessoa, obra, corrente ou acontecimento influenciou outro de forma historicamente documentada (não use para ideias que uma corrente apenas defende).
- ruptura: a origem se formou contra o destino, opôs-se ou rompeu com ele.
- atuacao: participação, militância, cargo, governo, membro de organização.
- criacao: fundação, autoria, criação de obra, instituição ou conceito.
- continuidade: sucessão, desdobramento, vertente, subtipo ou forma posterior.
- filiacao: pertencimento a uma corrente, ideologia ou movimento, ou defesa de uma ideia, política ou programa (ex.: uma ideologia que defende a desregulamentação).
- lugar: onde algo ocorreu, está sediado ou se insere geograficamente.
- omitir: coocorrência vaga, ligação trivial ou sem impacto para entender a história.

Seja exigente: se a relação não ajuda o leitor a entender um vínculo histórico concreto, responda omitir.
Diga também se a seta deve ir do destino para a origem ("inverter": true).
Responda só JSON: {"categoria": "...", "inverter": false}`;
}

async function classify(relation) {
  const response = await fetch(`${endpoint}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: prompt(relation),
      format: 'json',
      stream: false,
      options: { temperature: 0, num_ctx: 2048 },
    }),
  });
  if (!response.ok) throw new Error(`Ollama ${response.status}`);
  const body = await response.json();
  const parsed = JSON.parse(body.response);
  const family = CATEGORY_TO_FAMILY[String(parsed.categoria ?? '').toLowerCase()];
  if (!family) return 'omit';
  if (family === 'omit') return 'omit';
  return parsed.inverter === true ? `${family}:reverse` : family;
}

const decisions = { ...relationCategoryDecisions };
let done = 0;
const tally = {};

async function save() {
  const sorted = Object.fromEntries(
    Object.entries(decisions).sort(([a], [b]) => a.localeCompare(b)),
  );
  const lines = Object.entries(sorted).map(([id, value]) => `  '${id}': '${value}',`);
  const source = `// Gerado por scripts/content/classify-relations.mjs. Não editar à mão.
// Revisão: conferência de IA (modelo local ${model}, ${new Date().toISOString().slice(0, 10)}), sem revisão humana.

/** Decisão por relação: família (\`creation\`, \`participation\`…, \`:reverse\` inverte a seta) ou \`omit\`. */
export const relationCategoryDecisions: Readonly<Record<string, string>> = {
${lines.join('\n')}
};
`;
  await writeFile(target, source, 'utf8');
}

if (flag('--guard-only')) {
  const relationById = new Map(
    graph.atlases.flatMap((atlas) => atlas.relations).map((r) => [r.id, r]),
  );
  const guarded = {};
  const counts = {};
  for (const [id, value] of Object.entries(relationCategoryDecisions)) {
    const relation = relationById.get(id);
    if (!relation || /-p737-/i.test(id)) continue;
    const next = guardDecision(
      value,
      entities.get(relation.fromEntityId)?.kind,
      entities.get(relation.toEntityId)?.kind,
      entities.get(relation.fromEntityId),
      entities.get(relation.toEntityId),
    );
    guarded[id] = next;
    counts[next] = (counts[next] ?? 0) + 1;
  }
  for (const key of Object.keys(decisions)) if (!(key in guarded)) delete decisions[key];
  Object.assign(decisions, guarded);
  await save();
  console.log('Travas aplicadas', counts);
  process.exit(0);
}

for (const relation of residue.slice(0, limit)) {
  try {
    const decision = guardDecision(
      await classify(relation),
      entities.get(relation.fromEntityId)?.kind,
      entities.get(relation.toEntityId)?.kind,
      entities.get(relation.fromEntityId),
      entities.get(relation.toEntityId),
    );
    decisions[relation.id] = decision;
    tally[decision] = (tally[decision] ?? 0) + 1;
  } catch (error) {
    console.error(`Falha em ${relation.id}: ${error.message}`);
  }
  done++;
  if (done % 25 === 0) {
    await save();
    console.log(`${done}/${Math.min(residue.length, limit)}`, tally);
  }
}
await save();
console.log('Concluído', tally);
