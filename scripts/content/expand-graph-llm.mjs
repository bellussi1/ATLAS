#!/usr/bin/env node
/**
 * Expande ligações no grafo canônico (`content/knowledge/`) a partir de afirmações já citadas
 * que mencionam literalmente outra entidade do grafo sem aresta existente.
 * Cada par candidato passa por verificação profunda com LLM local (Ollama) antes da promoção.
 */
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { readSourceGraph, writeSourceGraph } from './source-graph.mjs';

const MODEL = process.env.ATLAS_OLLAMA_MODEL || 'gemma2:9b-instruct-q4_K_M';
const OLLAMA_URL = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

const RELATION_LABELS = {
  'documented-association': ['associação documentada com', 'associado a'],
  influence: ['influenciou', 'recebeu influência de'],
  influenced: ['influenciou', 'foi influenciado por'],
  influenced_by: ['foi influenciado por', 'influenciou'],
  associated_with: ['associado a', 'associado a'],
  reacted_against: ['criticou / reagiu contra', 'foi criticado por'],
  developed_into: ['desenvolveu-se em', 'originou-se de'],
  participated_in: ['participou de', 'teve participação de'],
  wrote: ['escreveu', 'escrito por'],
  authored: ['foi autor de', 'teve autoria de'],
  'causal-claim': ['contribuiu para', 'decorreu de'],
  event_influenced_ideology: ['influenciou a ideologia', 'foi influenciada por'],
};

const VALID_TYPES = new Set(Object.keys(RELATION_LABELS));

function parseLimit() {
  const idx = process.argv.indexOf('--limit');
  if (idx >= 0 && process.argv[idx + 1]) {
    const n = Number(process.argv[idx + 1]);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return 200;
}

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function verifyWithOllama(pair) {
  const prompt = [
    'Você é um verificador editorial de relações históricas e políticas.',
    'Avalie se a passagem citada abaixo sustenta uma relação real, específica e não acidental entre Origem e Alvo.',
    'Rejeite (sustenta: false) se for apenas menção geográfica incidental ou homonímia.',
    'Responda APENAS com JSON válido:',
    '{"sustenta": true|false, "type": "<tipo>", "reverse_direction": true|false, "reason": "<frase curta em português>"}',
    `Tipos válidos: ${[...VALID_TYPES].join(', ')}.`,
    '',
    `Origem (${pair.from.kind}): ${pair.from.title}`,
    `Alvo (${pair.to.kind}): ${pair.to.title}`,
    `Passagem citada: "${pair.claim.text}"`,
  ].join('\n');

  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      format: 'json',
      stream: false,
      options: { temperature: 0, num_predict: 180 },
    }),
  });
  if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
  const payload = await response.json();
  const parsed = JSON.parse(payload.response);
  const type = VALID_TYPES.has(parsed.type) ? parsed.type : 'documented-association';
  return {
    sustenta: Boolean(parsed.sustenta),
    type,
    reverse_direction: Boolean(parsed.reverse_direction),
    reason: String(parsed.reason || '').trim(),
  };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limit = parseLimit();
  const graph = await readSourceGraph(resolve('content/knowledge'));

  const entityById = new Map();
  const degree = new Map();
  const existingPairs = new Set();
  const citationById = new Map();

  for (const atlas of graph.atlases) {
    for (const entity of atlas.entities) {
      entityById.set(entity.id, entity);
      degree.set(entity.id, 0);
    }
    for (const citation of atlas.citations) citationById.set(citation.id, citation);
    for (const rel of atlas.relations) {
      degree.set(rel.fromEntityId, (degree.get(rel.fromEntityId) ?? 0) + 1);
      degree.set(rel.toEntityId, (degree.get(rel.toEntityId) ?? 0) + 1);
      existingPairs.add(`${rel.fromEntityId}|${rel.toEntityId}`);
      existingPairs.add(`${rel.toEntityId}|${rel.fromEntityId}`);
    }
  }

  const targets = [...entityById.values()]
    .filter((e) => e.title.length >= 6 && e.kind !== 'place')
    .map((e) => ({
      entity: e,
      regex: new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(e.title)}(?![\\p{L}\\p{N}])`, 'iu'),
    }));

  const priorityAtlases = new Set([
    'atlas-nazismo',
    'atlas-trabalhismo',
    'atlas-stalinismo',
    'atlas-social-democracia',
    'atlas-anarquismo',
    'atlas-marxismo',
    'atlas-liberalism',
  ]);

  const candidates = [];
  const seenPair = new Set();

  for (const atlas of graph.atlases) {
    if (atlas.id === 'atlas-methodology') continue;
    for (const claim of atlas.claims) {
      const from = entityById.get(claim.entityId);
      if (!from || !claim.citationIds?.length) continue;
      const evidenceIds = [
        ...new Set(
          claim.citationIds.map((cid) => citationById.get(cid)?.evidenceId).filter(Boolean),
        ),
      ];
      if (!evidenceIds.length) continue;

      for (const { entity: to, regex } of targets) {
        if (to.id === from.id) continue;
        const key = from.id < to.id ? `${from.id}|${to.id}` : `${to.id}|${from.id}`;
        if (existingPairs.has(`${from.id}|${to.id}`) || seenPair.has(key)) continue;
        if (!regex.test(claim.text)) continue;

        seenPair.add(key);
        const minDeg = Math.min(degree.get(from.id) ?? 0, degree.get(to.id) ?? 0);
        const boost = priorityAtlases.has(atlas.id) ? -10 : 0;
        candidates.push({
          score: minDeg + boost,
          atlas,
          from,
          to,
          claim,
          evidenceIds: evidenceIds.slice(0, 2),
        });
      }
    }
  }

  candidates.sort((a, b) => a.score - b.score);
  const batch = candidates.slice(0, limit);

  let promoted = 0;
  let rejected = 0;
  const audit = [];

  for (let i = 0; i < batch.length; i += 1) {
    const pair = batch[i];
    const verdict = await verifyWithOllama(pair);
    if (!verdict.sustenta) {
      rejected += 1;
      audit.push({
        from: pair.from.id,
        to: pair.to.id,
        claimId: pair.claim.id,
        status: 'rejected_llm',
        ...verdict,
      });
      continue;
    }

    const fromId = verdict.reverse_direction ? pair.to.id : pair.from.id;
    const toId = verdict.reverse_direction ? pair.from.id : pair.to.id;
    const [label, reverseLabel] = RELATION_LABELS[verdict.type];
    const relId = `rel-ai-exp-${pair.from.id.slice(0, 24)}-${pair.to.id.slice(0, 24)}-${i}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');

    const relation = {
      id: relId,
      fromEntityId: fromId,
      toEntityId: toId,
      type: verdict.type,
      label,
      reverseLabel,
      context: `[conferência de IA] ${pair.claim.text}`,
      temporalExtent: null,
      uncertainty: 'low',
      evidenceIds: pair.evidenceIds,
      editorialStatus: 'pending',
    };

    if (!dryRun) {
      pair.atlas.relations.push(relation);
    }
    promoted += 1;
    audit.push({
      relationId: relId,
      atlas: pair.atlas.id,
      from: fromId,
      to: toId,
      claimId: pair.claim.id,
      status: 'promoted',
      ...verdict,
    });
  }

  if (!dryRun && promoted > 0) {
    await writeSourceGraph(graph, resolve('content/knowledge'));
  }

  await writeFile(
    join(resolve('experiments/rag/eval/runs'), 'expand_graph_llm.json'),
    `${JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        model: MODEL,
        dry_run: dryRun,
        total_unlinked_candidates: candidates.length,
        evaluated: batch.length,
        promoted,
        rejected,
        results: audit,
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    JSON.stringify(
      {
        total_unlinked_candidates: candidates.length,
        evaluated: batch.length,
        promoted,
        rejected,
      },
      null,
      2,
    ),
  );
}

await main();
