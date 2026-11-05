import type { KnowledgeGraph } from '@core/content/models/content-schema';
import { methodologyKnowledgeGraph } from '@testing/content-fixture';

import {
  atlasOf,
  composeIllustration,
  illustrationPalette,
  illustrationSeed,
  needsIllustration,
} from './illustration';

const signature = (tiles: ReturnType<typeof composeIllustration>) => JSON.stringify(tiles);

describe('geometric illustration', () => {
  it('is deterministic: same id, kind and palette give the same drawing', () => {
    expect(signature(composeIllustration('aceleracionismo', 'ideology', 'liberal'))).toBe(
      signature(composeIllustration('aceleracionismo', 'ideology', 'liberal')),
    );
  });

  it('differs between records', () => {
    expect(signature(composeIllustration('quilombismo', 'ideology'))).not.toBe(
      signature(composeIllustration('peronismo', 'ideology')),
    );
    expect(illustrationSeed('a', 'person')).not.toBe(illustrationSeed('a', 'work'));
  });

  it('composes a 3 x 3 grid whose centre signals the kind', () => {
    const person = composeIllustration('x', 'person');
    const work = composeIllustration('x', 'work');
    expect(person).toHaveLength(9);
    expect(person[4].motif).toBe('disc');
    expect(work[4].motif).toBe('stripes');
    expect(composeIllustration('x', 'historical-polity')[4].motif).toBe('half');
    expect(composeIllustration('x', 'desconhecido')[4].motif).toBe('eye');
  });

  it('uses the colours of the tradition palette', () => {
    const colours = (palette: Parameters<typeof composeIllustration>[2]) =>
      new Set(composeIllustration('x', 'person', palette).flatMap((t) => [t.ground, t.figure]));
    expect(colours('ecologismo')).toContain('var(--color-moss)');
    expect(colours('marx')).not.toContain('var(--color-moss)');
  });

  it('maps atlas ids to palettes and falls back to the neutral one', () => {
    expect(illustrationPalette('atlas-marxismo')).toBe('marx');
    expect(illustrationPalette('atlas-liberalism')).toBe('liberal');
    expect(illustrationPalette('atlas-social-democracia')).toBe('social-democracia');
    expect(illustrationPalette('atlas-marx-valor')).toBe('marx');
    expect(illustrationPalette('atlas-methodology')).toBe('atlas');
    expect(illustrationPalette(undefined)).toBe('atlas');
  });

  it('is only a fallback: absent when a licensed picture exists', () => {
    const graph = structuredClone(methodologyKnowledgeGraph) as KnowledgeGraph;
    const atlas = graph.atlases.find((a) => a.entities.length > 0)!;
    const id = atlas.entities[0].id;
    expect(atlasOf(graph, id)?.id).toBe(atlas.id);
    expect(needsIllustration(graph, id)).toBe(true);

    atlas.assetLicenses.push({
      assetPath: '/media/x.jpg',
      entityId: id,
      status: 'known',
      reproduction: 'allowed',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      attribution: 'Autor',
      filePageUrl: 'https://commons.wikimedia.org/wiki/File:X.jpg',
    } as never);
    expect(needsIllustration(graph, id)).toBe(false);

    atlas.assetLicenses[atlas.assetLicenses.length - 1].reproduction = 'forbidden' as never;
    expect(needsIllustration(graph, id)).toBe(true);
  });
});
