import { routes } from '@app/app.routes';
import { publishedIdeologies } from '@ideologies/data/published-ideologies';
import { canonicalChapters } from '@ideologies/models/ideology-chapters';
import { ideologyPageSchema } from '@ideologies/models/ideology-page.schema';

import { ideologyDraft } from './ideology-draft';

// Dry run of the atlas-create-ideology skill: a new tradition starts as data only.
describe('ideologyDraft (dry run of a new reading)', () => {
  const draft = ideologyDraft({
    slug: 'social-democracia-dry-run',
    title: 'Social-democracia',
    kind: 'tradicao',
    classificationNote: 'Recorte provisório para teste estrutural; sem conteúdo histórico.',
    atlasId: 'atlas-methodology',
  });

  it('follows the canonical contract and would pass the published check without content', () => {
    expect(draft.chapters.map((c) => c.id)).toEqual(canonicalChapters.map((c) => c.id));
    expect(ideologyPageSchema.safeParse({ ...draft, published: true }).success).toBe(true);
  });

  it('declares every chapter as pending research and claims no review or sources', () => {
    const page = ideologyPageSchema.parse(draft);
    expect(page.published).toBe(false);
    expect(page.review).toMatchObject({ status: 'rascunho', reviewer: null });
    for (const chapter of page.chapters) {
      expect(chapter.coverage).toBe('pending');
      expect(chapter.blocks).toEqual([]);
      expect(chapter.sourceIds).toEqual([]);
    }
  });

  it('adds no public route and no published snapshot', () => {
    const paths = JSON.stringify(routes);
    expect(paths).not.toContain(draft.slug);
    expect(publishedIdeologies[draft.slug]).toBeUndefined();
  });
});
