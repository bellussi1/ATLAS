import './register-source-modules.mjs';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { formatJson, readSourceGraph, sha256, validateSourceGraph } from './source-graph.mjs';
import { buildExplorationLayout } from './exploration-layout.mjs';
import { compileTranslations } from './translations.mjs';
import { artifactKey, buildPointer } from './r2-content.mjs';

const { buildDiscoveryIndex } =
  await import('../../src/app/core/content/queries/discovery-index.ts');
const { buildKnowledgeNetwork, rankClaims } =
  await import('../../src/app/core/content/queries/knowledge-network.ts');
const { layoutNetwork } = await import('../../src/app/core/content/queries/network-layout.ts');
const { queryKnowledgeRelations } =
  await import('../../src/app/core/content/queries/knowledge-graph.ts');
const { graphGeometry, temporalAxis } =
  await import('../../src/app/features/ideologies/utils/visualization-geometry.ts');
const { publishedIdeologies } =
  await import('../../src/app/features/ideologies/data/published-ideologies.ts');
const { validateIdeologyDossier } =
  await import('../../src/app/features/ideologies/models/ideology-page.schema.ts');
const {
  contentBundleSchema,
  contentManifestSchema,
  networkBundleSchema,
  networkGraphSchema,
  searchIndexSchema,
  adjacencySchema,
  layoutsSchema,
} = await import('../../src/app/core/content/models/content-artifacts.ts');
const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

async function atomicFile(path, body) {
  const pending = `${path}.pending-${randomUUID()}`;
  try {
    await writeFile(pending, body, { flag: 'wx' });
    await rename(pending, path);
  } finally {
    await unlink(pending).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}

export async function buildContent({
  graph: input,
  outputDirectory = join(projectRoot, 'generated/content'),
  fixture = false,
  translationCatalogue,
} = {}) {
  const graph = validateSourceGraph(input ?? (await readSourceGraph()));
  const translations = compileTranslations(
    translationCatalogue ??
      JSON.parse(await readFile(join(projectRoot, 'content/translations/catalogue.json'), 'utf8')),
    graph,
  );
  const entities = graph.atlases.flatMap((atlas) => atlas.entities);
  const readingTexts = {};
  const adjacency = adjacencySchema.parse(
    Object.fromEntries(
      entities.map((entity) => [entity.id, queryKnowledgeRelations(graph, entity.id)]),
    ),
  );
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const network = buildKnowledgeNetwork(graph);
  const networkGraph = networkGraphSchema.parse({
    id: graph.id,
    version: graph.version,
    updatedAt: graph.updatedAt,
    atlases: graph.atlases.map((atlas) => ({
      id: atlas.id,
      title: atlas.title,
      entities: atlas.entities.map((entity) => ({
        id: entity.id,
        slug: entity.slug,
        title: entity.title,
        kind: entity.kind,
        placeType: entity.placeType,
        summary: entity.summary,
        temporalExtent: entity.temporalExtent,
        editorialStatus: entity.editorialStatus,
        discoveryMetadata: entity.discoveryMetadata
          ? { description: entity.discoveryMetadata.description }
          : undefined,
      })),
      claims: [...new Set(atlas.claims.map((claim) => claim.entityId))]
        .map((entityId) =>
          rankClaims(
            atlas.claims
              .filter((claim) => claim.entityId === entityId)
              .map((claim) => ({
                id: claim.id,
                entityId: claim.entityId,
                text: claim.text,
                classification: claim.classification,
                editorialStatus: claim.editorialStatus,
              })),
          ).slice(0, 3),
        )
        .flat(),
      assetLicenses: atlas.assetLicenses,
      relations: atlas.relations,
    })),
  });
  const networkLayout = layoutNetwork(network.nodes, network.edges);
  const layouts = {
    network: { ...networkLayout, positions: Object.fromEntries(networkLayout.positions) },
    exploration: buildExplorationLayout(graph),
    atlases: {
      center: { x: 460, y: 286 },
      order: Object.fromEntries(entities.map((entity, index) => [entity.id, index])),
      slots: entities.slice(1).map((_, position) => {
        const angle = -Math.PI / 2 + position * goldenAngle;
        return { x: 460 + Math.cos(angle) * 350, y: 286 + Math.sin(angle) * 205 };
      }),
    },
    editorial: {},
  };
  const readings = [];
  for (const [slug, source] of Object.entries(publishedIdeologies)) {
    const load = async (path) => JSON.parse(await readFile(join(projectRoot, path), 'utf8'));
    const page = await load(source.page);
    const supplement = await load(source.supplement);
    const dossier = validateIdeologyDossier(page, supplement, graph);
    readings.push({ slug, page, supplement });
    const text = (value) =>
      typeof value === 'string'
        ? value
        : value && typeof value === 'object'
          ? Object.values(value).map(text).join(' ')
          : '';
    readingTexts[slug] = text(dossier.page);
    const geometry = { graphs: {}, timelines: {} };
    for (const chapter of dossier.page.chapters) {
      chapter.blocks.forEach((block, index) => {
        const key = `${chapter.id}-${index}`;
        if (block.type === 'graph')
          geometry.graphs[key] = graphGeometry(
            dossier.supplement.edges.filter((edge) => block.edgeIds.includes(edge.id)),
          );
        if (block.type === 'timeline') {
          const dated = block.entityIds.flatMap((id) => {
            const entity = entities.find((entity) => entity.id === id);
            const year = entity?.temporalExtent?.startYear;
            return year == null ? [] : [{ id, year }];
          });
          const axis = temporalAxis(dated.map((entry) => entry.year));
          geometry.timelines[key] = axis
            ? {
                ticks: axis.ticks,
                markers: dated.map((entry, i) => ({ ...entry, x: axis.positions[i] })),
              }
            : null;
        }
      });
    }
    layouts.editorial[slug] = geometry;
  }
  layoutsSchema.parse(layouts);
  const search = searchIndexSchema.parse(buildDiscoveryIndex(graph, readingTexts, translations));
  const assets = [];
  const asset = async (name, value) => {
    const bytes = `${JSON.stringify(value)}\n`;
    const hash = sha256(bytes);
    const resource = {
      file: `${name}.${hash}.json`,
      sha256: hash,
      bytes: Buffer.byteLength(bytes),
    };
    assets.push({ ...resource, body: bytes });
    return resource;
  };
  const collections = [];
  for (const atlas of graph.atlases)
    collections.push({ id: atlas.id, ...(await asset(atlas.id, atlas)) });
  const ideologies = [];
  for (const { slug, page, supplement } of readings)
    ideologies.push({ id: slug, ...(await asset(`ideology-${slug}`, { page, supplement })) });
  const graphDocument = { id: graph.id, version: graph.version, updatedAt: graph.updatedAt };
  const bundle = contentBundleSchema.parse({
    graph: { ...graphDocument, atlases: graph.atlases },
    search,
    adjacency,
    layouts,
    ideologies: Object.fromEntries(
      readings.map(({ slug, page, supplement }) => [slug, { page, supplement }]),
    ),
  });
  const networkBundle = networkBundleSchema.parse({ graph: networkGraph, layouts });
  const resources = {
    schemaVersion: 1,
    graph: graphDocument,
    collections,
    ideologies,
    network: await asset('network', networkGraph),
    networkBundle: await asset('network-bundle', networkBundle),
    bundle: await asset('bundle', bundle),
    search: await asset('search', search),
    adjacency: await asset('adjacency', adjacency),
    layouts: await asset('layouts', layouts),
  };
  const manifest = contentManifestSchema.parse({
    ...resources,
    release: sha256(JSON.stringify(resources)),
  });
  await mkdir(outputDirectory, { recursive: true });
  for (const resource of assets)
    await atomicFile(join(outputDirectory, resource.file), resource.body);
  await atomicFile(join(outputDirectory, 'manifest.json'), await formatJson(manifest));
  if (fixture) {
    // The fixture keeps the pre-bundle path on purpose: it stays small for tests, while the
    // published release and the e2e cache exercise the packaged artifacts.
    const fixtureAssets = assets.filter(
      ({ file }) => !file.startsWith('bundle.') && !file.startsWith('network-bundle.'),
    );
    const manifestBody = `${JSON.stringify(manifest)}\n`;
    const pointer = buildPointer({
      baseUrl: 'https://fixture.invalid',
      release: manifest.release,
      manifest: { sha256: sha256(manifestBody), bytes: Buffer.byteLength(manifestBody) },
      artifacts: fixtureAssets.map(({ file, sha256: digest, bytes }) => ({
        file,
        sha256: digest,
        bytes,
      })),
      media: [],
      bundle: null,
      networkBundle: null,
    });
    await mkdir(join(projectRoot, 'generated/testing'), { recursive: true });
    await atomicFile(
      join(projectRoot, 'generated/testing/content-fixture.json'),
      await formatJson({
        graph,
        search,
        adjacency,
        layouts,
        manifest,
        assets: {
          'pointer.json': JSON.stringify(pointer),
          [artifactKey(sha256(manifestBody))]: manifestBody,
          ...Object.fromEntries(
            fixtureAssets.map((resource) => [artifactKey(resource.sha256), resource.body]),
          ),
        },
      }),
    );
  }
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const manifest = await buildContent({ fixture: true });
  console.log(
    `Conteúdo compilado: ${manifest.collections.length} coleções; release ${manifest.release}`,
  );
}
