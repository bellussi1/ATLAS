import { canonicalChapters } from '@ideologies/models/ideology-chapters';
import type { IdeologyPage } from '@ideologies/models/ideology-page.schema';

export interface IdeologyDraftInput {
  slug: string;
  title: string;
  kind: IdeologyPage['kind'];
  classificationNote: string;
  atlasId: string;
}

/**
 * Starting point for a new reading: the twelve canonical chapters, all `pending` with
 * the reason "pesquisa pendente", unpublished and with no blocks. It never invents
 * content; research fills each chapter and flips its coverage. Used by the
 * atlas-create-ideology skill and its dry-run test.
 */
export function ideologyDraft(input: IdeologyDraftInput): IdeologyPage {
  return {
    schemaVersion: 1,
    id: `ideology-page-${input.slug}`,
    slug: input.slug,
    kind: input.kind,
    classificationNote: input.classificationNote,
    title: input.title,
    kicker: 'Rascunho',
    summary: `Rascunho de ${input.title}: estrutura sem conteúdo verificado.`,
    published: false,
    atlasId: input.atlasId,
    review: {
      status: 'rascunho',
      reviewer: null,
      updatedAt: new Date().toISOString().slice(0, 10),
    },
    identity: { accent: 'teal', signature: 'Rascunho estrutural', keyVisualization: 'timeline' },
    portrait: null,
    chapters: canonicalChapters.map((chapter) => ({
      id: chapter.id,
      anchor: chapter.id,
      title: chapter.label,
      kicker: chapter.label,
      minutes: 1,
      narrative: ['Capítulo reservado; o conteúdo depende de pesquisa com fontes.'],
      question: null,
      bridge: null,
      sourceIds: [],
      gap: 'Pesquisa pendente: nenhuma afirmação foi verificada para este capítulo.',
      coverage: 'pending',
      layout: chapter.id === 'introducao' ? 'introduction' : 'documents',
      blocks: [],
    })),
  };
}
