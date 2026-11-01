import { routes } from '@app/app.routes';
import { safeDiscoveryOrigin } from '@core/content/queries/discovery-index';
import { methodologyKnowledgeGraph } from '@testing/content-fixture';

import supplement from '../../../../content/graph/marxismo.json';
import anarquismo from '../../../../content/ideologies/examples/anarquismo.json';
import liberalismo from '../../../../content/ideologies/examples/liberalismo.json';
import socialDemocracia from '../../../../content/ideologies/examples/social-democracia.json';
import marxismo from '../../../../content/ideologies/marxismo/page.json';
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
      'verbete/:slug',
      'explorar/:tipo/:slug',
    ]);
    expect(routes.find((r) => r.path === '**')?.redirectTo).toBe('');
  });
});

describe('V4 page contract and editorial integrity', () => {
  it('resolves all published chapter, entity, edge and source references', () => {
    const dossier = validateIdeologyDossier(marxismo, supplement, methodologyKnowledgeGraph);
    expect(dossier.page.chapters).toHaveLength(8);
    expect(dossier.page.chapters.map((c) => c.anchor)).toEqual([
      'introducao',
      'origens',
      'conceitos',
      'pensadores',
      'historia',
      'correntes',
      'criticas',
      'fontes',
    ]);
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
