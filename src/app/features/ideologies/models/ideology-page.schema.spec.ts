import { routes } from '@app/app.routes';
import { safeDiscoveryOrigin } from '@core/content/queries/discovery-index';
import { estimateAxis, estimateEntity } from '@ideologies/utils/positions';
import { methodologyKnowledgeGraph } from '@testing/content-fixture';

import supplement from '../../../../../content/graph/marxismo.json';
import anarquismo from '../../../../../content/ideologies/examples/anarquismo.json';
import liberalismo from '../../../../../content/ideologies/examples/liberalismo.json';
import socialDemocracia from '../../../../../content/ideologies/examples/social-democracia.json';
import publishedLiberalismo from '../../../../../content/ideologies/liberalismo/page.json';
import marxismo from '../../../../../content/ideologies/marxismo/page.json';
import { canonicalChapters, legacyChapterAnchors } from './ideology-chapters';
import {
  ideologyGraphSchema,
  ideologyPageSchema,
  validateIdeologyDossier,
} from './ideology-page.schema';

describe('Public pages', () => {
  it('keeps readings and exposes the knowledge explorer with permanent records', () => {
    expect(routes.filter((r) => r.loadComponent && r.path !== '**').map((r) => r.path)).toEqual([
      '',
      'leitura/marxismo',
      'leitura/liberalismo',
      'leitura/social-democracia',
      'leitura/anarquismo',
      'grafos',
      'acervo',
      'entidades',
      'ideologias',
      'pessoas',
      'obras',
      'fontes',
      'paises',
      'regimes',
      'partidos',
      'instituicoes',
      'acontecimentos',
      'conceitos',
      'lugares',
      'verbete/:slug',
    ]);
    expect(routes.find((r) => r.path === '**')?.title).toBe('Página não encontrada — ATLAS');
  });
});

describe('V4 page contract and editorial integrity', () => {
  it('resolves all published chapter, entity, edge and source references', () => {
    const dossier = validateIdeologyDossier(marxismo, supplement, methodologyKnowledgeGraph);
    expect(dossier.page.chapters.map((c) => c.anchor)).toEqual(canonicalChapters.map((c) => c.id));
    expect(dossier.supplement.edges.every((e) => e.sources.length > 0)).toBe(true);
    expect(dossier.page.review.reviewer).toBeNull();
  });
  it('rejects broken references and unsupported historical edges', () => {
    const bad = structuredClone(marxismo);
    bad.chapters[0].sourceIds = ['source-does-not-exist'];
    expect(() => validateIdeologyDossier(bad, supplement, methodologyKnowledgeGraph)).toThrow();
    const broken = structuredClone(supplement);
    broken.edges[0].sources = [];
    expect(() => validateIdeologyDossier(marxismo, broken, methodologyKnowledgeGraph)).toThrow();
  });
  it('rejects fake human review and duplicate chapter anchors', () => {
    const bad = structuredClone(marxismo);
    bad.review.status = 'revisado';
    expect(ideologyPageSchema.safeParse(bad).success).toBe(false);
    bad.review.status = 'com-fontes';
    bad.chapters[1].anchor = bad.chapters[0].anchor;
    expect(ideologyPageSchema.safeParse(bad).success).toBe(false);
  });
  it('holds both published readings to the same twelve canonical chapters', () => {
    for (const page of [marxismo, publishedLiberalismo]) {
      const parsed = ideologyPageSchema.parse(page);
      expect(parsed.chapters.map((c) => c.id)).toEqual(canonicalChapters.map((c) => c.id));
      expect(parsed.chapters.map((c) => c.kicker)).toEqual(canonicalChapters.map((c) => c.label));
      expect(parsed.chapters.filter((c) => !c.question).map((c) => c.id)).toEqual([]);
    }
    expect(
      Object.values(legacyChapterAnchors).every((id) => canonicalChapters.some((c) => c.id === id)),
    ).toBe(true);
  });
  it('gives both readings a structured debate and marks declared gaps as partial coverage', () => {
    for (const page of [marxismo, publishedLiberalismo].map((p) => ideologyPageSchema.parse(p))) {
      const debates = page.chapters.find((c) => c.id === 'debates')!;
      expect(debates.blocks.some((b) => b.type === 'debate')).toBe(true);
      for (const chapter of page.chapters.filter((c) => c.gap && c.layout !== 'introduction'))
        expect.soft(chapter.coverage, chapter.id).not.toBe('complete');
    }
  });
  it('rejects out-of-order chapters and pending coverage without a reason', () => {
    const swapped = structuredClone(marxismo);
    [swapped.chapters[2], swapped.chapters[3]] = [swapped.chapters[3], swapped.chapters[2]];
    expect(ideologyPageSchema.safeParse(swapped).success).toBe(false);
    const pending = structuredClone(marxismo) as typeof marxismo & {
      chapters: { coverage?: string; gap: string | null; blocks: unknown[] }[];
    };
    pending.chapters[9].coverage = 'pending';
    expect(ideologyPageSchema.safeParse(pending).success).toBe(false);
    pending.chapters[9].blocks = [];
    pending.chapters[9].gap = null;
    expect(ideologyPageSchema.safeParse(pending).success).toBe(false);
  });
  it.each([anarquismo, socialDemocracia, liberalismo])(
    'accepts unpublished configuration for $title without a new renderer',
    (example) => {
      const page = ideologyPageSchema.parse(example);
      expect(page.published).toBe(false);
      expect(page.chapters[0].blocks.length).toBeGreaterThan(0);
      expect(() =>
        validateIdeologyDossier(example, { sources: [], edges: [] }, methodologyKnowledgeGraph),
      ).not.toThrow();
    },
  );
  it('keeps a local chapter context and refuses external origins or injected parameters', () => {
    expect(
      safeDiscoveryOrigin('/ideologias/marxismo?argumento=marx&vinculo=critica#conceitos'),
    ).toBe('/ideologias/marxismo?argumento=marx&vinculo=critica#conceitos');
    expect(safeDiscoveryOrigin('https://evil.example/ideologias/marxismo#conceitos')).toBeNull();
    expect(safeDiscoveryOrigin('/ideologias/marxismo?redirect=https://evil.example')).toBeNull();
  });
});

describe('positions layer', () => {
  const claim = {
    id: 'claim-test',
    entityId: 'person-karl-marx',
    axisId: 'propriedade',
    value: -0.5,
    confidence: 'média',
    classification: 'tese atribuída',
    statement: 'afirmação de teste',
    sourceIds: ['source-marx-manifesto-1848'],
    editorialStatus: 'pending',
  };
  it('accepts sourced, pending claims on known axes and entities', () => {
    const graph = structuredClone(supplement);
    graph.positions = [claim];
    expect(() => validateIdeologyDossier(marxismo, graph, methodologyKnowledgeGraph)).not.toThrow();
  });
  it('refuses claims without a source, outside the scale, on unknown axes or already reviewed', () => {
    for (const bad of [
      { ...claim, sourceIds: [] },
      { ...claim, value: -1.5 },
      { ...claim, axisId: 'fé' },
      { ...claim, editorialStatus: 'revisado' },
    ]) {
      const graph = structuredClone(supplement);
      graph.positions = [bad as never];
      expect(() => validateIdeologyDossier(marxismo, graph, methodologyKnowledgeGraph)).toThrow();
    }
  });
  it('refuses a claim whose source does not exist', () => {
    const graph = structuredClone(supplement);
    graph.positions = [{ ...claim, sourceIds: ['source-inexistente'] }];
    expect(() => validateIdeologyDossier(marxismo, graph, methodologyKnowledgeGraph)).toThrow(
      'Referência editorial inexistente.',
    );
  });
  it('publishes the seeded Marxism claims with resolvable sources and pending review', () => {
    const page = validateIdeologyDossier(marxismo, supplement, methodologyKnowledgeGraph);
    expect(page.supplement.positions.length).toBeGreaterThan(0);
    expect(page.supplement.positions.every((c) => c.editorialStatus === 'pending')).toBe(true);
    const block = page.page.chapters
      .find((c) => c.id === 'debates')!
      .blocks.find((b) => b.type === 'positions');
    expect(block).toBeDefined();
  });
});

describe('seeded positions estimates', () => {
  const claims = ideologyGraphSchema.parse(supplement).positions;
  const axis = (entityId: string, axisId: Parameters<typeof estimateAxis>[2]) =>
    estimateAxis(claims, entityId, axisId);
  it('keeps each status tied to its distinct sources and to the spread of its claims', () => {
    expect(axis('person-karl-marx', 'propriedade')).toMatchObject({
      status: 'estimada',
      sources: 2,
    });
    expect(axis('person-karl-marx', 'igualdade')).toMatchObject({ status: 'estimada', sources: 2 });
    expect(axis('person-karl-marx', 'poder')).toMatchObject({ status: 'divergente', sources: 2 });
    expect(axis('person-friedrich-engels', 'mercado')).toMatchObject({
      status: 'estimada',
      sources: 2,
    });
    expect(axis('person-friedrich-engels', 'revolucao')).toMatchObject({ status: 'divergente' });
    expect(axis('person-eduard-bernstein', 'revolucao')).toMatchObject({
      status: 'estimada',
      value: 0.76,
    });
    expect(axis('person-rosa-luxemburg', 'revolucao')).toMatchObject({ status: 'indicativa' });
    expect(axis('person-vladimir-lenin', 'revolucao')).toMatchObject({ status: 'indicativa' });
    expect(estimateEntity(claims, 'person-karl-marx')).toHaveLength(6);
  });
});
