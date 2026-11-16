#!/usr/bin/env node
/**
 * Verificação profunda com LLM local (Ollama) sobre as relações candidatas do RAG
 * (`experiments/rag/eval/queues/relacoes-candidatas.json`) e promoção segura para
 * `content/knowledge/` com `editorialStatus: 'pending'` e marcador `[conferência de IA]`.
 */
import { readFile, writeFile } from 'node:fs/promises';
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

async function verifyWithOllama(candidate) {
  const prompt = [
    'Você é um verificador editorial de relações históricas e políticas.',
    'Avalie se a citação literal abaixo sustenta uma relação real, específica e não trivial entre Origem e Alvo.',
    'Responda APENAS com um JSON válido no formato:',
    '{"sustenta": true|false, "type": "<tipo>", "reverse_direction": true|false, "reason": "<frase curta em português>"}',
    `Tipos válidos: ${[...VALID_TYPES].join(', ')}.`,
    '',
    `Origem: ${candidate.from.title}`,
    `Alvo: ${candidate.to.title}`,
    `Tipo sugerido: ${candidate.suggested_type}`,
    `Citação literal: "${candidate.literal_quote}"`,
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
  if (!response.ok) {
    throw new Error(`Ollama HTTP ${response.status}`);
  }
  const payload = await response.json();
  const parsed = JSON.parse(payload.response);
  const type = VALID_TYPES.has(parsed.type) ? parsed.type : candidate.suggested_type;
  return {
    sustenta: Boolean(parsed.sustenta),
    type: VALID_TYPES.has(type) ? type : 'documented-association',
    reverse_direction: Boolean(parsed.reverse_direction),
    reason: String(parsed.reason || '').trim(),
  };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const fromAudit = process.argv.includes('--from-audit');
  const queuePath = resolve('experiments/rag/eval/queues/relacoes-candidatas.json');
  const auditPath = join(
    resolve('experiments/rag/eval/runs'),
    'deep_llm_relation_verification.json',
  );
  const candidates = JSON.parse(await readFile(queuePath, 'utf8'));
  const cachedVerdicts = new Map();
  if (fromAudit) {
    const prev = JSON.parse(await readFile(auditPath, 'utf8'));
    for (const item of prev.results ?? []) cachedVerdicts.set(item.id, item);
  }
  const graph = await readSourceGraph(resolve('content/knowledge'));

  const entityIds = new Set();
  const claimAtlas = new Map();
  const citationById = new Map();
  const existingEdges = new Set();

  let removedFromMethodology = 0;
  for (const atlas of graph.atlases) {
    if (atlas.id === 'atlas-methodology') {
      const before = atlas.relations.length;
      atlas.relations = atlas.relations.filter((rel) => !rel.id.startsWith('rel-ai-'));
      removedFromMethodology = before - atlas.relations.length;
    }
    for (const entity of atlas.entities) entityIds.add(entity.id);
    for (const citation of atlas.citations) citationById.set(citation.id, citation);
    for (const claim of atlas.claims) claimAtlas.set(claim.id, { atlas, claim });
    for (const rel of atlas.relations) {
      existingEdges.add(`${rel.fromEntityId}->${rel.toEntityId}:${rel.type}`);
      existingEdges.add(`${rel.toEntityId}->${rel.fromEntityId}:${rel.type}`);
    }
  }

  const audit = [];
  let promoted = 0;
  let skippedExisting = 0;
  let rejectedByLlm = 0;
  let skippedMissing = 0;

  for (const cand of candidates) {
    const cached = cachedVerdicts.get(cand.id);
    const verdict = cached
      ? {
          sustenta: Boolean(cached.sustenta),
          type: VALID_TYPES.has(cached.type) ? cached.type : cand.suggested_type,
          reverse_direction: Boolean(cached.reverse_direction),
          reason: String(cached.reason || '').trim(),
        }
      : await verifyWithOllama(cand);
    const entry = {
      id: cand.id,
      from: cand.from.id,
      to: cand.to.id,
      suggested_type: cand.suggested_type,
      ...verdict,
      status: 'pending',
    };

    if (!verdict.sustenta) {
      entry.status = 'rejected_llm';
      rejectedByLlm += 1;
      audit.push(entry);
      continue;
    }

    const fromId = verdict.reverse_direction ? cand.to.id : cand.from.id;
    const toId = verdict.reverse_direction ? cand.from.id : cand.to.id;
    if (fromId === toId || !entityIds.has(fromId) || !entityIds.has(toId)) {
      entry.status = 'skipped_missing_entity';
      skippedMissing += 1;
      audit.push(entry);
      continue;
    }

    const edgeKey = `${fromId}->${toId}:${verdict.type}`;
    if (existingEdges.has(edgeKey)) {
      entry.status = 'skipped_duplicate';
      skippedExisting += 1;
      audit.push(entry);
      continue;
    }

    const origin = claimAtlas.get(cand.quote_origin);
    if (origin?.atlas.id === 'atlas-methodology') {
      entry.status = 'skipped_methodology_collection';
      skippedMissing += 1;
      audit.push(entry);
      continue;
    }
    const resolvedEvidences = origin
      ? origin.claim.evidenceIds?.length
        ? origin.claim.evidenceIds
        : (origin.claim.citationIds ?? [])
            .map((cid) => citationById.get(cid)?.evidenceId)
            .filter(Boolean)
      : [];
    if (!origin || !resolvedEvidences.length) {
      entry.status = 'skipped_no_evidence';
      skippedMissing += 1;
      audit.push(entry);
      continue;
    }

    const [label, reverseLabel] = RELATION_LABELS[verdict.type];
    const relId = `rel-ai-${cand.id.replace(/[^a-z0-9-]/gi, '').toLowerCase()}`;
    const newRelation = {
      id: relId,
      fromEntityId: fromId,
      toEntityId: toId,
      type: verdict.type,
      label,
      reverseLabel,
      context: `[conferência de IA] ${cand.literal_quote}`,
      temporalExtent: null,
      uncertainty: 'low',
      evidenceIds: [...new Set(resolvedEvidences)].slice(0, 2),
      editorialStatus: 'pending',
    };

    if (!dryRun) {
      origin.atlas.relations.push(newRelation);
    }
    existingEdges.add(edgeKey);
    entry.status = 'promoted';
    entry.relationId = relId;
    entry.atlas = origin.atlas.id;
    promoted += 1;
    audit.push(entry);
  }

  if (!dryRun && (promoted > 0 || removedFromMethodology > 0)) {
    await writeSourceGraph(graph, resolve('content/knowledge'));
  }

  const summary = {
    generated_at: new Date().toISOString(),
    model: MODEL,
    dry_run: dryRun,
    total_candidates: candidates.length,
    promoted,
    rejected_by_llm: rejectedByLlm,
    skipped_existing: skippedExisting,
    skipped_missing: skippedMissing,
    results: audit,
  };

  await writeFile(
    join(resolve('experiments/rag/eval/runs'), 'deep_llm_relation_verification.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
  );

  console.log(
    JSON.stringify(
      {
        total_candidates: summary.total_candidates,
        promoted,
        rejected_by_llm: rejectedByLlm,
        skipped_existing: skippedExisting,
        skipped_missing: skippedMissing,
      },
      null,
      2,
    ),
  );
}

await main();
