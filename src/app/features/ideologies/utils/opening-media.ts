import { entityMedia } from '@core/content/media/asset-license';
import type {
  AssetLicense,
  Atlas,
  Entity,
  KnowledgeGraph,
} from '@core/content/models/content-schema';
import type { IdeologyPage } from '@ideologies/models/ideology-page.schema';

export const posterFrames = ['disc', 'arch', 'quarter', 'square'] as const;
export type PosterFrame = (typeof posterFrames)[number];

export interface OpeningFigure {
  entity: Entity;
  /** Licensed asset, already checked for reproduction and credit. */
  asset: AssetLicense;
  /** Atlas that owns the asset and carries its licence record. */
  atlas: Atlas;
  frame: PosterFrame;
  /** Short identification under the picture. */
  label: string;
  /** Why this record opens the reading; shown with the credits. */
  note: string | null;
  /** True only for figures selected in the page's editorial data. */
  curated: boolean;
}

/** Same contract used by record cards and the context sheet. */
function reproducible(asset: AssetLicense): boolean {
  return (
    asset.status === 'known' &&
    asset.reproduction === 'allowed' &&
    !!asset.license &&
    !!asset.licenseUrl &&
    !!asset.attribution &&
    !!asset.filePageUrl
  );
}

function ownerOf(graph: KnowledgeGraph, asset: AssetLicense): Atlas | undefined {
  return graph.atlases.find((atlas) => atlas.assetLicenses.includes(asset));
}

function resolveCurated(page: IdeologyPage, graph: KnowledgeGraph): OpeningFigure[] {
  const entries = page.poster?.figures ?? [];
  if (!entries.length) return [];
  const entities = new Map(graph.atlases.flatMap((atlas) => atlas.entities.map((e) => [e.id, e])));
  const assets = new Map(
    graph.atlases.flatMap((atlas) =>
      atlas.assetLicenses.map((asset) => [asset.id, { atlas, asset }] as const),
    ),
  );
  const used = new Set<string>();
  return entries.flatMap((entry, index) => {
    const entity = entities.get(entry.entityId);
    const found = assets.get(entry.assetId);
    if (!entity || !found || found.asset.entityId !== entity.id) return [];
    if (!reproducible(found.asset)) return [];
    if (used.has(found.asset.assetPath)) return [];
    used.add(found.asset.assetPath);
    return [
      {
        entity,
        asset: found.asset,
        atlas: found.atlas,
        frame: entry.frame ?? posterFrames[index % posterFrames.length],
        label: entry.label ?? entity.title,
        note: entry.note,
        curated: true,
      },
    ];
  });
}

/** How often the page names a record; the first chapters carry the opening argument. */
function pageMentions(page: IdeologyPage): Map<string, number> {
  const mentions = new Map<string, number>();
  const add = (ids: readonly string[] | undefined) => {
    for (const id of ids ?? []) mentions.set(id, (mentions.get(id) ?? 0) + 1);
  };
  if (page.portrait) add([page.portrait.entityId]);
  for (const chapter of page.chapters)
    for (const block of chapter.blocks) {
      if ('entityIds' in block) add(block.entityIds);
      if (block.type === 'atlas') add([block.rootEntityId]);
      if (block.type === 'reading-path')
        add(block.works.flatMap((work) => (work.entityId ? [work.entityId] : [])));
      if (block.type === 'chronology') add(block.markerIds);
      if (block.type === 'explorations') for (const item of block.items) add(item.entityIds);
      if (block.type === 'debate')
        for (const topic of block.topics)
          for (const item of [topic.defence, topic.criticism, topic.response, topic.limits])
            add(item.entityIds);
    }
  return mentions;
}

function relationDegree(atlas: Atlas): Map<string, number> {
  const degree = new Map<string, number>();
  const touch = (id: string) => degree.set(id, (degree.get(id) ?? 0) + 1);
  for (const relation of atlas.relations) {
    touch(relation.fromEntityId);
    touch(relation.toEntityId);
  }
  return degree;
}

/**
 * Safe fallback for a page without editorial selection: the most cited records in the page,
 * broken by their place in the network, at most two people and one record of each other kind.
 * It is deliberately conservative and never claims to be a curated selection.
 */
function fallbackFigures(page: IdeologyPage, graph: KnowledgeGraph): OpeningFigure[] {
  const atlas = graph.atlases.find((candidate) => candidate.id === page.atlasId);
  if (!atlas) return [];
  const mentions = pageMentions(page);
  const degree = relationDegree(atlas);
  const candidates = atlas.entities
    .flatMap((entity) => {
      const asset = entityMedia(graph, entity);
      const owner = asset ? ownerOf(graph, asset) : undefined;
      return asset && owner ? [{ entity, asset, atlas: owner }] : [];
    })
    .sort(
      (a, b) =>
        (mentions.get(b.entity.id) ?? 0) - (mentions.get(a.entity.id) ?? 0) ||
        (degree.get(b.entity.id) ?? 0) - (degree.get(a.entity.id) ?? 0) ||
        a.entity.title.localeCompare(b.entity.title, 'pt-BR'),
    );
  const picked: typeof candidates = [];
  const kindCount = new Map<string, number>();
  for (const candidate of candidates) {
    if (picked.length >= posterFrames.length) break;
    const kind = candidate.entity.kind;
    const maximum = kind === 'person' ? 2 : 1;
    if ((kindCount.get(kind) ?? 0) >= maximum) continue;
    kindCount.set(kind, (kindCount.get(kind) ?? 0) + 1);
    picked.push(candidate);
  }
  return picked.map((candidate, index) => ({
    ...candidate,
    frame: posterFrames[index % posterFrames.length],
    label: candidate.entity.title,
    note: null,
    curated: false,
  }));
}

/** What the opening shows: explicit editorial figures first, a safe fallback otherwise. */
export function resolveOpeningFigures(page: IdeologyPage, graph: KnowledgeGraph): OpeningFigure[] {
  const curated = resolveCurated(page, graph);
  return curated.length ? curated : fallbackFigures(page, graph);
}

/** Opening assets reserved before chapter cards, so the same picture is not used twice by accident. */
export function curatedOpeningAssets(page: IdeologyPage, graph: KnowledgeGraph): Set<string> {
  return new Set(resolveCurated(page, graph).map((figure) => figure.asset.assetPath));
}
