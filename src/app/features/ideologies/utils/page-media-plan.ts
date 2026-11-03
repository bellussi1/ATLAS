import { entityMedia } from '@core/content/media/asset-license';
import type { KnowledgeGraph } from '@core/content/models/content-schema';
import type { IdeologyPage } from '@ideologies/models/ideology-page.schema';

export interface PageMedia {
  assetPath: string;
  entityId: string;
  title: string;
}

const cardPriority = ['event', 'work', 'institution', 'ideology', 'concept', 'person'];

/**
 * Image uniqueness for one reading: each picture appears once in the narrative.
 * Portraits belong to the thinkers gallery; other entity cards and then exploration
 * cards take only pictures nobody shows yet, in reading order. The `atlas` gallery is
 * a catalogue and may repeat images on purpose. Keys are `<blockId>/<itemId or
 * entityId>`, where blockId is `<chapterId>-<blockIndex>`.
 */
export function planPageMedia(page: IdeologyPage, graph: KnowledgeGraph): Map<string, PageMedia> {
  const entities = new Map(graph.atlases.flatMap((a) => a.entities).map((e) => [e.id, e]));
  const picture = (id: string): PageMedia | undefined => {
    const entity = entities.get(id);
    const asset = entity && entityMedia(graph, entity);
    return asset && entity
      ? { assetPath: asset.assetPath, entityId: id, title: entity.title }
      : undefined;
  };
  const used = new Set<string>();
  const plan = new Map<string, PageMedia>();
  const claim = (key: string, id: string): boolean => {
    const media = picture(id);
    if (!media || used.has(media.assetPath)) return false;
    used.add(media.assetPath);
    plan.set(key, media);
    return true;
  };
  for (const thinkers of [true, false])
    for (const chapter of page.chapters)
      chapter.blocks.forEach((block, index) => {
        if (block.type === 'entities' && (block.mode === 'thinkers') === thinkers)
          for (const id of block.entityIds) claim(`${chapter.id}-${index}/${id}`, id);
      });
  for (const chapter of page.chapters)
    chapter.blocks.forEach((block, index) => {
      if (block.type !== 'explorations') return;
      for (const item of block.items) {
        const candidates = item.entityIds
          .flatMap((id) => entities.get(id) ?? [])
          .sort((a, b) => cardPriority.indexOf(a.kind) - cardPriority.indexOf(b.kind));
        candidates.some((entity) => claim(`${chapter.id}-${index}/${item.id}`, entity.id));
      }
    });
  return plan;
}
