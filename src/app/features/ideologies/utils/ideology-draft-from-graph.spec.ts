import { ideologyPageSchema } from '@ideologies/models/ideology-page.schema';
import { ideologyDraftFromGraph } from '@ideologies/utils/ideology-draft-from-graph';
import { methodologyKnowledgeGraph } from '@testing/content-fixture';

describe('ideologyDraftFromGraph', () => {
  const atlas = methodologyKnowledgeGraph.atlases[0];
  const draft = ideologyDraftFromGraph(
    {
      slug: 'rascunho-do-grafo',
      title: 'Rascunho',
      kind: 'tradicao',
      classificationNote: 'Teste estrutural; sem conteúdo histórico.',
      atlasId: atlas.id,
    },
    atlas,
  );

  it('derives blocks from record kinds and never marks a chapter complete', () => {
    expect(ideologyPageSchema.safeParse(draft).success).toBe(true);
    for (const c of draft.chapters)
      expect(c.coverage).toBe(c.blocks.length ? 'partial' : 'pending');
    const known = new Set(atlas.entities.map((e) => e.id));
    for (const block of draft.chapters.flatMap((c) => c.blocks))
      if (block.type === 'timeline')
        expect(block.entityIds.every((id) => known.has(id))).toBe(true);
    expect(draft.chapters.some((c) => c.blocks.length)).toBe(true);
  });
});
