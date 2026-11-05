import type { Atlas } from '@core/content/models/content-schema';
import type { IdeologyPage } from '@ideologies/models/ideology-page.schema';
import { ideologyDraft, type IdeologyDraftInput } from '@ideologies/utils/ideology-draft';

type Block = IdeologyPage['chapters'][number]['blocks'][number];
type Kind = Atlas['entities'][number]['kind'];

/** Which record kinds feed each canonical chapter, in reading order. */
const chapterKinds: Partial<Record<string, Kind[]>> = {
  epocas: ['event', 'person', 'work', 'party', 'institution'],
  pensadores: ['person'],
  vertentes: ['ideology'],
  experiencias: ['event', 'party', 'institution', 'government'],
  leituras: ['work'],
};
/** Chapters must show enough records to be worth a block; fewer stays pending. */
const MIN_RECORDS = 2;

const dated = (atlas: Atlas, kinds: Kind[]) =>
  atlas.entities
    .filter((e) => kinds.includes(e.kind) && e.temporalExtent?.startYear != null)
    .sort((a, b) => a.temporalExtent!.startYear! - b.temporalExtent!.startYear!)
    .map((e) => e.id);

/**
 * Draft whose structure comes from the graph: each chapter receives the blocks its record
 * kinds and relations support (timelines of dated people, works and events, the relation
 * graph among currents, the source list). Those chapters are `partial` (text pending);
 * nothing is invented, and a chapter without enough records stays `pending` with no block.
 */
export function ideologyDraftFromGraph(input: IdeologyDraftInput, atlas: Atlas): IdeologyPage {
  const draft = ideologyDraft(input);
  const ideologies = new Set(atlas.entities.filter((e) => e.kind === 'ideology').map((e) => e.id));
  const blocksFor = (id: string): Block[] => {
    const kinds = chapterKinds[id];
    if (kinds) {
      const entityIds = dated(atlas, kinds);
      if (entityIds.length >= MIN_RECORDS) return [{ type: 'timeline', entityIds }];
      // Without dates a timeline would say nothing: the records still deserve a gallery.
      const records = atlas.entities.filter((e) => kinds.includes(e.kind)).map((e) => e.id);
      return records.length >= MIN_RECORDS
        ? [
            {
              type: 'entities',
              entityIds: records,
              mode: id === 'leituras' ? 'documents' : 'thinkers',
              notes: {},
            },
          ]
        : [];
    }
    if (id === 'conexoes') {
      const edgeIds = atlas.relations
        .filter((r) => ideologies.has(r.fromEntityId) || ideologies.has(r.toEntityId))
        .map((r) => r.id);
      return edgeIds.length >= MIN_RECORDS ? [{ type: 'graph', edgeIds }] : [];
    }
    if (id === 'fontes' && atlas.sources.length)
      return [{ type: 'sources', sourceIds: atlas.sources.map((s) => s.id) }];
    return [];
  };
  return {
    ...draft,
    chapters: draft.chapters.map((chapter) => {
      const blocks = blocksFor(chapter.id);
      return blocks.length
        ? {
            ...chapter,
            blocks,
            // Records exist but the text does not: partial, never complete.
            coverage: 'partial' as const,
            gap: 'Texto pendente: os registros ainda não têm revisão editorial.',
          }
        : chapter;
    }),
  };
}
