#!/usr/bin/env node
/**
 * Gera itinerários (`content/itineraries/<slug>.json`) a partir de um tópico ou fila JSON,
 * aterrando todas as paradas, ramos e conexões exclusivamente em entidades, leituras e catálogos
 * reais do `KnowledgeGraph`, via Ollama local (`gemma2:9b-instruct-q4_K_M`), e validando com
 * `validateItinerary` antes de gravar.
 *
 * Uso:
 *   node scripts/content/generate-itinerary-llm.mjs --topic "Tema" --kind historico --slug meu-slug
 *   node scripts/content/generate-itinerary-llm.mjs --queue content/itineraries/queue.json
 */
import './register-source-modules.mjs';
import { access, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { readSourceGraph } from './source-graph.mjs';

const { explorerCatalogues } =
  await import('../../src/app/core/content/queries/explorer-catalogues.ts');
const { publishedIdeologies } =
  await import('../../src/app/features/ideologies/data/published-ideologies.ts');
const { validateItinerary } =
  await import('../../src/app/features/itineraries/models/itinerary.schema.ts');

const MODEL = process.env.ATLAS_OLLAMA_MODEL || 'gemma2:9b-instruct-q4_K_M';
const OLLAMA_URL = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
}

const slugify = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const tokenize = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function selectGroundingEntities(graph, topic, keywords = []) {
  const terms = [...new Set([...tokenize(topic), ...keywords.flatMap(tokenize)])];
  const entities = graph.atlases
    .filter((a) => a.id !== 'atlas-methodology')
    .flatMap((a) => a.entities);
  const relations = graph.atlases.flatMap((a) => a.relations);
  const degree = new Map();
  for (const r of relations) {
    degree.set(r.fromEntityId, (degree.get(r.fromEntityId) ?? 0) + 1);
    degree.set(r.toEntityId, (degree.get(r.toEntityId) ?? 0) + 1);
  }

  return entities
    .map((entity) => {
      const hay = `${entity.slug} ${entity.title} ${entity.summary ?? ''}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      let hits = 0;
      for (const term of terms) {
        if (hay.includes(term)) hits += 1;
      }
      const deg = degree.get(entity.id) ?? 0;
      return { entity, deg, score: hits * 12 + Math.min(deg, 25) * 0.4 };
    })
    .filter((item) => item.score >= 12)
    .sort((a, b) => b.score - a.score || b.deg - a.deg)
    .slice(0, 22)
    .map((item) => item.entity);
}

async function askOllama(prompt) {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      format: 'json',
      stream: false,
      options: { temperature: 0.2, num_predict: 2400 },
    }),
  });
  if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
  const payload = await response.json();
  return JSON.parse(payload.response);
}

function buildPrompt({ topic, kind, grounding, readingsList, cataloguePaths, repairErrors = [] }) {
  const entityLines = grounding
    .map(
      (e) =>
        `- slug="${e.slug}" | id="${e.id}" | tipo="${e.kind}" | título="${e.title}" | resumo="${(e.summary || '').slice(0, 140)}"`,
    )
    .join('\n');

  const repairBlock = repairErrors.length
    ? `\nCORRIJA ESTES ERROS DE VALIDAÇÃO DA TENTATIVA ANTERIOR:\n${repairErrors.map((e) => `- ${e}`).join('\n')}\n`
    : '';

  return [
    'Você é um editor-pesquisador do ATLAS, uma enciclopédia histórica e política.',
    'Crie um itinerário de estudo em português do Brasil, rigoroso e sem opinião como fato.',
    'Responda APENAS com um objeto JSON válido seguindo exatamente esta estrutura:',
    '{',
    '  "title": "título editorial claro",',
    '  "question": "pergunta central investigativa?",',
    '  "deck": "subtítulo em 1-2 frases explicando o percurso",',
    '  "summary": "síntese do itinerário em 1-2 frases",',
    '  "stops": [',
    '    {',
    '      "id": "identificador-kebab-case",',
    '      "title": "título da parada",',
    '      "reason": "o que esta parada mostra (2 frases objetivas)",',
    '      "question": "pergunta-guia da parada?",',
    '      "justification": "por que vem nesta posição do roadmap",',
    '      "destination": { "type": "verbete", "slug": "slug-exato-da-lista" },',
    '      "sourceIds": ["src-1"]',
    '    }',
    '  ],',
    '  "branches": [',
    '    {',
    '      "id": "ramo-kebab-case",',
    '      "fromStop": "id-de-uma-parada-existente",',
    '      "title": "título do desvio",',
    '      "reason": "por que abrir este desvio",',
    '      "question": "pergunta do desvio?",',
    '      "justification": "sentido no percurso",',
    '      "destination": { "type": "verbete", "slug": "slug-exato-da-lista" },',
    '      "convergesAt": "id-de-parada-posterior"',
    '    }',
    '  ],',
    '  "connections": [',
    '    { "destination": { "type": "catalogo", "path": "acontecimentos" }, "reason": "motivo" }',
    '  ],',
    '  "sources": [',
    '    { "id": "src-1", "title": "Referência documental/enciclopédica usada" }',
    '  ]',
    '}',
    '',
    'REGRAS OBRIGATÓRIAS:',
    `- Tema: "${topic}" | kind: "${kind}"`,
    '- Crie exatamente 5 ou 6 paradas (`stops`). A última parada DEVE ser `{ "type": "grafo" }`.',
    '- Crie exatamente 2 ramos (`branches`): pelo menos 1 com `convergesAt` apontando para uma parada POSTERIOR a `fromStop`, e o outro com `convergesAt` posterior ou `exit` explicando a saída.',
    '- Não repita o mesmo destino entre paradas e ramos.',
    '- Use SOMENTE slugs existentes abaixo para `verbete`, `leitura` e `catalogo` (NUNCA invente slugs):',
    `  * Leituras publicadas (\`type: "leitura"\`): ${readingsList.join(', ')}`,
    `  * Catálogos válidos (\`type: "catalogo"\`): ${cataloguePaths.join(', ')}`,
    '  * Entidades reais disponíveis para `type: "verbete"`:',
    entityLines,
    '- Todos os `id` devem seguir `^[a-z][a-z0-9-]*$` (sem maiúsculas, sem espaços, sem acentos).',
    '- Todo `sourceIds` usado em `stops` deve existir em `sources[].id`.',
    repairBlock,
  ].join('\n');
}

function normalizeCandidate(raw, { slug, kind, groundingBySlug, readingsSet, knownSourceIds }) {
  const today = new Date().toISOString().slice(0, 10);
  const cleanId = (val, fallback) => {
    const s = slugify(String(val || fallback));
    return /^[a-z]/.test(s) ? s : `p-${s || fallback}`;
  };
  const fixDestination = (dest) => {
    if (dest?.type === 'verbete' && !groundingBySlug.has(dest.slug) && readingsSet.has(dest.slug)) {
      return { type: 'leitura', slug: dest.slug };
    }
    return dest;
  };

  const fallbackSource = {
    id: 'src-acervo',
    title: 'ATLAS — Registros e verbetes compilados no acervo',
  };
  const sources =
    Array.isArray(raw.sources) && raw.sources.length
      ? raw.sources
          .map((s, idx) => ({
            id: cleanId(s.id, `src-${idx + 1}`),
            title: String(s.title || `Fonte ${idx + 1}`).trim(),
          }))
          .filter((source) => knownSourceIds.has(source.id))
      : [];
  if (sources.length === 0) sources.push(fallbackSource);
  const validSourceIds = new Set(sources.map((s) => s.id));

  const stops = (Array.isArray(raw.stops) ? raw.stops : []).map((stop, idx) => {
    const dest = fixDestination(stop?.destination);
    const entity = dest?.type === 'verbete' ? groundingBySlug.get(dest.slug) : null;
    const filteredSourceIds = (Array.isArray(stop?.sourceIds) ? stop.sourceIds : [])
      .map((id) => cleanId(id, 'src-1'))
      .filter((id) => validSourceIds.has(id));
    return {
      id: cleanId(stop?.id, `parada-${idx + 1}`),
      title: String(stop?.title || `Parada ${idx + 1}`).trim(),
      reason: String(stop?.reason || '').trim(),
      question: String(stop?.question || '').trim(),
      ...(stop?.justification ? { justification: String(stop.justification).trim() } : {}),
      destination: dest,
      ...(entity ? { contextEntityId: entity.id } : {}),
      sourceIds: filteredSourceIds.length ? filteredSourceIds : [sources[0].id],
    };
  });

  const stopIds = stops.map((s) => s.id);
  const stopIndex = new Map(stopIds.map((id, idx) => [id, idx]));

  if (stops.length >= 2 && new Set(stops.map((s) => s.destination?.type)).size < 2) {
    stops[stops.length - 1] = {
      ...stops[stops.length - 1],
      destination: { type: 'grafo' },
    };
  }

  const branches = (Array.isArray(raw.branches) ? raw.branches : []).map((b, idx) => {
    const rawFrom = cleanId(b?.fromStop, stops[0]?.id || 'parada-1');
    const fromIdx = stopIndex.has(rawFrom) ? stopIndex.get(rawFrom) : 0;
    const fromStop = stopIds[fromIdx] || stops[0]?.id || 'parada-1';
    let convergesAt = b?.convergesAt ? cleanId(b.convergesAt, '') : undefined;
    let exit = b?.exit ? String(b.exit).trim() : undefined;
    if (convergesAt) {
      const targetIdx = stopIndex.get(convergesAt);
      if (targetIdx === undefined || targetIdx <= fromIdx) {
        if (fromIdx + 1 < stopIds.length) {
          convergesAt = stopIds[fromIdx + 1];
        } else {
          convergesAt = undefined;
          exit = exit || 'Saída paralela para aprofundamento no verbete.';
        }
      }
    } else if (!exit) {
      exit = 'Saída paralela para aprofundamento no verbete.';
    }
    return {
      id: cleanId(b?.id, `ramo-${idx + 1}`),
      fromStop,
      title: String(b?.title || `Ramo ${idx + 1}`).trim(),
      reason: String(b?.reason || '').trim(),
      question: String(b?.question || '').trim(),
      ...(b?.justification ? { justification: String(b.justification).trim() } : {}),
      destination: fixDestination(b?.destination),
      ...(convergesAt ? { convergesAt } : {}),
      ...(exit ? { exit } : {}),
    };
  });

  return {
    schemaVersion: 1,
    id: `itinerary-${slug}`,
    slug,
    kind,
    title: String(raw.title || slug).trim(),
    question: String(raw.question || '').trim(),
    deck: String(raw.deck || '').trim(),
    summary: String(raw.summary || '').trim(),
    status: 'reviewed-ai',
    coverage: 'complete',
    review: {
      status: 'assistant',
      notes:
        '[conferência de IA] Gerado automaticamente com aterramento no grafo canônico; aguarda revisão humana para promoção a verified.',
    },
    stops,
    branches,
    connections: Array.isArray(raw.connections) ? raw.connections.slice(0, 3) : [],
    sources,
    updatedAt: today,
    version: '1.0.0',
  };
}

async function generateOne(
  entry,
  { graph, readings, readingsList, cataloguePaths, dryRun, overwrite },
) {
  const slug = entry.slug || slugify(entry.topic);
  const outPath = join(resolve('content/itineraries'), `${slug}.json`);
  if (!overwrite && (await fileExists(outPath))) {
    return { slug, status: 'skipped_existing' };
  }

  const grounding = selectGroundingEntities(graph, entry.topic, entry.keywords || []);
  const groundingBySlug = new Map(grounding.map((e) => [e.slug, e]));
  const knownSourceIds = new Set([
    'src-acervo',
    ...graph.atlases.flatMap((atlas) => (atlas.sources ?? []).map((source) => source.id)),
  ]);

  let repairErrors = [];
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const prompt = buildPrompt({
      topic: entry.topic,
      kind: entry.kind,
      grounding,
      readingsList,
      cataloguePaths,
      repairErrors,
    });
    const raw = await askOllama(prompt);
    const candidate = normalizeCandidate(raw, {
      slug,
      kind: entry.kind,
      groundingBySlug,
      readingsSet: new Set(readingsList),
      knownSourceIds,
    });
    const check = validateItinerary(candidate, { graph, readings });
    if (check.ok) {
      if (!dryRun) {
        await writeFile(outPath, `${JSON.stringify(check.value, null, 2)}\n`, 'utf8');
      }
      return {
        slug,
        status: dryRun ? 'valid_dry_run' : 'written',
        stops: check.value.stops.length,
        branches: check.value.branches.length,
        attempt,
      };
    }
    repairErrors = check.errors;
  }
  return { slug, status: 'failed_validation', errors: repairErrors };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const overwrite = process.argv.includes('--overwrite');
  const queueArg = argValue('--queue');
  const topicArg = argValue('--topic');

  let jobs = [];
  if (queueArg) {
    const rawQueue = JSON.parse(await readFile(resolve(queueArg), 'utf8'));
    jobs = Array.isArray(rawQueue) ? rawQueue : rawQueue.items || [];
  } else if (topicArg) {
    jobs = [
      {
        topic: topicArg,
        kind: argValue('--kind') || 'historico',
        slug: argValue('--slug') || slugify(topicArg),
      },
    ];
  } else {
    throw new Error('Informe `--topic "..."` ou `--queue <arquivo.json>`.');
  }

  const graph = await readSourceGraph(resolve('content/knowledge'));
  const readings = new Map(
    Object.entries(publishedIdeologies).map(([slug, entry]) => [
      slug,
      { listed: !entry?.unlisted },
    ]),
  );
  const readingsList = [...readings.entries()]
    .filter(([, meta]) => meta.listed)
    .map(([slug]) => slug);
  const cataloguePaths = explorerCatalogues.map((c) => c.path);

  const results = [];
  for (const job of jobs) {
    const res = await generateOne(job, {
      graph,
      readings,
      readingsList,
      cataloguePaths,
      dryRun,
      overwrite,
    });
    results.push(res);
    console.log(JSON.stringify(res));
  }
}

await main();
