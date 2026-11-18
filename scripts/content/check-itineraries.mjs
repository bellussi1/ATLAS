#!/usr/bin/env node
/**
 * Valida todos os itinerários em `content/itineraries/*.json` e `content/itineraries/examples/*.json`
 * contra o grafo canônico e as leituras publicadas.
 */
import './register-source-modules.mjs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { readSourceGraph } from './source-graph.mjs';

const { publishedIdeologies } =
  await import('../../src/app/features/ideologies/data/published-ideologies.ts');
const { validateItinerary } =
  await import('../../src/app/features/itineraries/models/itinerary.schema.ts');

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

export async function checkItineraries(root = projectRoot) {
  const graph = await readSourceGraph(join(root, 'content/knowledge'));
  const readings = new Map(
    Object.entries(publishedIdeologies).map(([slug, entry]) => [
      slug,
      { listed: !entry?.unlisted },
    ]),
  );
  const dirs = ['content/itineraries', 'content/itineraries/examples'];
  const report = { checked: 0, verified: 0, reviewedAi: 0, warnings: [], errors: [] };

  for (const rel of dirs) {
    const dir = join(root, rel);
    const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith('.json')).sort();
    for (const file of files) {
      const raw = JSON.parse(await readFile(join(dir, file), 'utf8'));
      const res = validateItinerary(raw, { graph, readings });
      report.checked += 1;
      if (!res.ok) {
        report.errors.push(`${rel}/${file}: ${res.errors.join('; ')}`);
        continue;
      }
      if (res.value.status === 'verified') report.verified += 1;
      else if (res.value.status === 'reviewed-ai') report.reviewedAi += 1;
      if (res.value.stops.length > 9)
        report.warnings.push(`${rel}/${file}: ${res.value.stops.length} paradas (> 9).`);
      if (res.value.branches.length > 3)
        report.warnings.push(`${rel}/${file}: ${res.value.branches.length} ramos (> 3).`);
    }
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await checkItineraries();
  for (const warning of report.warnings) console.warn(`[aviso] ${warning}`);
  if (report.errors.length) {
    for (const err of report.errors) console.error(`[erro] ${err}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Itinerários conferidos: ${report.checked} arquivo(s), ${report.verified} verificado(s), ${report.reviewedAi} por IA.`,
    );
  }
}
