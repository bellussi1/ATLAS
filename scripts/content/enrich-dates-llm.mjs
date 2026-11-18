#!/usr/bin/env node
/**
 * Preenche `temporalExtent` em entidades ainda sem data no grafo (`content/knowledge/`)
 * a partir de afirmações já citadas que contenham anos explícitos, com verificação via LLM local.
 */
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { readSourceGraph, writeSourceGraph } from './source-graph.mjs';

const MODEL = process.env.ATLAS_OLLAMA_MODEL || 'gemma2:9b-instruct-q4_K_M';
const OLLAMA_URL = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const YEAR_RE = /\b(1[0-9]{3}|20[0-2][0-9])\b/;

function parseLimit() {
  const idx = process.argv.indexOf('--limit');
  if (idx >= 0 && process.argv[idx + 1]) {
    const n = Number(process.argv[idx + 1]);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return 150;
}

async function extractDateWithOllama(entity, claims) {
  const prompt = [
    'Você extrai o período histórico principal (ano de início e fim) de uma entidade com base APENAS nas passagens citadas.',
    'Regras:',
    '- Só responda `has_date: true` se as passagens informarem explicitamente o ano de nascimento/fundação/início (ou morte/fim/acontecimento) da própria entidade.',
    '- Para pessoa viva ou instituição/ideologia sem fim definido, use `end: null`.',
    '- Para acontecimento pontual em um único ano, use `start == end`.',
    '- Responda APENAS JSON válido: {"has_date": true|false, "start": <int|null>, "end": <int|null>, "label": "<rótulo curto, ex: 1930–1945>", "reason": "<frase curta>"}',
    '',
    `Entidade (${entity.kind}): ${entity.title}`,
    'Passagens:',
    ...claims.slice(0, 4).map((c, i) => `${i + 1}. ${c.text}`),
  ].join('\n');

  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      format: 'json',
      stream: false,
      options: { temperature: 0, num_predict: 160 },
    }),
  });
  if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
  const payload = await response.json();
  return JSON.parse(payload.response);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limit = parseLimit();
  const graph = await readSourceGraph(resolve('content/knowledge'));

  const claimsByEntity = new Map();
  const candidates = [];

  for (const atlas of graph.atlases) {
    if (atlas.id === 'atlas-methodology') continue;
    for (const claim of atlas.claims) {
      const list = claimsByEntity.get(claim.entityId) ?? [];
      list.push(claim);
      claimsByEntity.set(claim.entityId, list);
    }
  }

  for (const atlas of graph.atlases) {
    if (atlas.id === 'atlas-methodology') continue;
    for (const entity of atlas.entities) {
      if (entity.temporalExtent) continue;
      const claims = (claimsByEntity.get(entity.id) ?? []).filter((c) => YEAR_RE.test(c.text));
      if (!claims.length) continue;
      candidates.push({ entity, claims });
    }
  }

  const batch = candidates.slice(0, limit);
  let updated = 0;
  let skipped = 0;
  const audit = [];

  for (const { entity, claims } of batch) {
    const res = await extractDateWithOllama(entity, claims);
    const start = Number.isInteger(res.start) ? res.start : null;
    const end = Number.isInteger(res.end) ? res.end : null;
    const valid =
      Boolean(res.has_date) &&
      start !== null &&
      start >= 500 &&
      start <= 2026 &&
      (end === null || (end >= start && end <= 2026));

    if (!valid) {
      skipped += 1;
      audit.push({ id: entity.id, title: entity.title, status: 'skipped', ...res });
      continue;
    }

    const label = String(res.label || (end ? `${start}–${end}` : `${start}–`)).trim();
    const extent = {
      startYear: start,
      endYear: end,
      precision: 'year',
      label,
    };

    if (!dryRun) {
      entity.temporalExtent = extent;
    }
    updated += 1;
    audit.push({
      id: entity.id,
      title: entity.title,
      status: 'updated',
      extent,
      reason: res.reason,
    });
  }

  if (!dryRun && updated > 0) {
    await writeSourceGraph(graph, resolve('content/knowledge'));
  }

  await writeFile(
    join(resolve('experiments/rag/eval/runs'), 'enrich_dates_llm.json'),
    `${JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        model: MODEL,
        dry_run: dryRun,
        total_undated_with_year_claims: candidates.length,
        evaluated: batch.length,
        updated,
        skipped,
        results: audit,
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    JSON.stringify(
      {
        total_undated_with_year_claims: candidates.length,
        evaluated: batch.length,
        updated,
        skipped,
      },
      null,
      2,
    ),
  );
}

await main();
