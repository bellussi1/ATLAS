import { routes } from '@app/app.routes';
import { safeDiscoveryOrigin } from '@core/content/queries/discovery-index';
import { methodologyKnowledgeGraph } from '@testing/content-fixture';

import supplement from '../../../../content/graph/marxismo.json';
import anarquismo from '../../../../content/ideologies/examples/anarquismo.json';
import liberalismo from '../../../../content/ideologies/examples/liberalismo.json';
import socialDemocracia from '../../../../content/ideologies/examples/social-democracia.json';
import publishedLiberalismo from '../../../../content/ideologies/liberalismo/page.json';
import marxismo from '../../../../content/ideologies/marxismo/page.json';
import { canonicalChapters, legacyChapterAnchors } from './ideology-chapters';
import { ideologyPageSchema, validateIdeologyDossier } from './ideology-page.schema';

describe('Public pages', () => {
  it('keeps readings and exposes the knowledge explorer with permanent records', () => {
    expect(routes.filter((r) => r.loadComponent).map((r) => r.path)).toEqual([
      '',
      'marxismo',
      'liberalismo',
      'conhecimento',
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
      'explorar/:tipo/:slug',
    ]);
    expect(routes.find((r) => r.path === '**')?.redirectTo).toBe('');
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
