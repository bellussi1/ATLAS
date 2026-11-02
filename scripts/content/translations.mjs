import { createHash } from 'node:crypto';
import {
  translationCatalogueSchema,
  entityTranslationSource,
} from '../../src/app/core/content/models/content-translation.ts';

export function translationDigest(entity) {
  return createHash('sha256')
    .update(JSON.stringify(entityTranslationSource(entity)))
    .digest('hex');
}
export function compileTranslations(input, graph) {
  const catalogue = translationCatalogueSchema.parse(input);
  const entities = new Map(graph.atlases.flatMap((a) => a.entities).map((e) => [e.id, e]));
  for (const entry of catalogue.entries) {
    const entity = entities.get(entry.entityId);
    if (!entity) throw Error(`Tradução sem entidade: ${entry.entityId}`);
    if (
      entry.sourceRevision !== entity.revision ||
      entry.sourceDigest !== translationDigest(entity) ||
      entry.sourceLocale !== (entity.textLocale ?? 'und')
    )
      throw Error(`Tradução desatualizada: ${entry.entityId}`);
  }
  return catalogue.entries.filter((e) => e.review.status === 'approved');
}
