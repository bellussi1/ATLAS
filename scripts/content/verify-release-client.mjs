#!/usr/bin/env node
/**
 * Reproduz, no Node, o caminho do navegador: HTTP até o R2 + validação Zod do release.
 *   node scripts/content/verify-release-client.mjs [baseUrl]
 */
import './register-source-modules.mjs';
import { readFile } from 'node:fs/promises';

const base = process.argv[2] ?? 'https://atlas-content-delivery.atlas-bellussi.workers.dev';

const { contentPointerSchema, artifactKey } =
  await import('../../src/app/core/content/models/content-pointer.ts');
const { contentBundleSchema, contentManifestSchema } =
  await import('../../src/app/core/content/models/content-artifacts.ts');

async function asset(key) {
  const response = await fetch(`${base}/${key}`);
  if (!response.ok) throw new Error(`HTTP ${response.status} em ${key}`);
  return response.text();
}

const pointerText = await asset('pointer.json');
const pointer = contentPointerSchema.parse(JSON.parse(pointerText));
console.log(
  `pointer ok: release ${pointer.release}, ${pointer.artifacts.length} artefatos, ${pointer.media.length} mídias`,
);

const manifestRaw = JSON.parse(await asset(artifactKey(pointer.manifest.sha256)));
const manifest = contentManifestSchema.parse(manifestRaw);
console.log(
  `manifest ok: ${manifest.collections.length} coleções, ${manifest.ideologies.length} leituras, ${(manifest.itineraries ?? []).length} itinerários`,
);

if (!pointer.bundle) throw new Error('pointer sem bundle');
const bundleBytes = (await fetch(`${base}/${artifactKey(pointer.bundle.sha256)}`)).headers.get(
  'content-length',
);
const bundleRaw = JSON.parse(await asset(artifactKey(pointer.bundle.sha256)));
const bundle = contentBundleSchema.parse(bundleRaw);
console.log(
  `bundle ok: ${bundleBytes} bytes, ${bundle.graph.atlases.length} atlas, ${bundle.search.length} buscas, ${Object.keys(bundle.ideologies).length} leituras, ${Object.keys(bundle.itineraries ?? {}).length} itinerários`,
);

for (const [slug, entry] of Object.entries(bundle.ideologies)) {
  const page = entry.page;
  const status = page?.review?.status ?? 'sem-status';
  if (!page?.chapters?.length) throw new Error(`leituras: ${slug} sem capítulos no bundle`);
  console.log(`  leitura ${slug}: ${page.chapters.length} capítulos, revisão ${status}`);
}

for (const itinerary of manifest.itineraries ?? []) {
  const slug = itinerary.slug;
  const value = (bundle.itineraries ?? {})[slug];
  if (!value) throw new Error(`itinerário ${slug} no manifesto mas ausente do bundle`);
  if (value.stops.length < 4)
    throw new Error(`itinerário ${slug} com ${value.stops.length} paradas`);
}
console.log('verificação cliente concluída: release íntegro no R2');
