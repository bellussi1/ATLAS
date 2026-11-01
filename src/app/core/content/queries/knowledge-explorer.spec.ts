import { contentFixture } from '@testing/content-fixture';

import { explorerEntries, explorerFacets, safeExplorerReturn } from './knowledge-explorer';

const discoveryIndex = contentFixture.search;

describe('Knowledge Explorer', () => {
  it('includes public readings and respects the explicit pending status of imported records', () => {
    expect(discoveryIndex.find((e) => e.id === 'reading-marxismo')?.path).toBe('/marxismo');
    expect(discoveryIndex.find((e) => e.id === 'ideology-liberalism')?.state).toBe('pending');
  });
  it('finds aliases without accents and requires every search term', () => {
    expect(
      explorerEntries(discoveryIndex, { query: 'guimaraes silveira' }).map((e) => e.title),
    ).toContain('Ulysses Guimarães');
    expect(explorerEntries(discoveryIndex, { query: 'guimaraes impossivel' })).toEqual([]);
  });
  it('keeps catalogues limited to graph records rather than methodological examples', () => {
    const people = explorerEntries(discoveryIndex, { catalogue: 'pessoas' });
    expect(people.length).toBeGreaterThan(0);
    expect(people.every((e) => e.path.startsWith('/verbete/') && e.kind === 'pessoa')).toBe(true);
    expect(
      explorerEntries(discoveryIndex, { catalogue: 'obras' }).every((e) => e.kind === 'work'),
    ).toBe(true);
    expect(
      explorerEntries(discoveryIndex, { catalogue: 'ideologias' }).every(
        (e) => e.kind === 'ideology',
      ),
    ).toBe(true);
  });
  it('combines state/type filters and exposes real available facets', () => {
    const entries = explorerEntries(discoveryIndex, {
      catalogue: 'entidades',
      kind: 'artigo',
      state: 'pending',
    });
    expect(entries.map((e) => e.title)).toEqual(['O caput do artigo 5º da Constituição de 1988']);
    expect(explorerFacets(discoveryIndex, 'pessoas').kinds.map((k) => k.value)).toEqual(['pessoa']);
    expect(explorerEntries(discoveryIndex, { kind: 'desconhecido' })).toEqual([]);
  });
  it('accepts shareable catalog returns and rejects external or arbitrary destinations', () => {
    expect(safeExplorerReturn('/pessoas?q=marx&estado=pending')).toBe(
      '/pessoas?q=marx&estado=pending',
    );
    for (const value of [
      'https://evil.test/pessoas',
      '//evil.test/pessoas',
      '/verbete/karl-marx',
      '/pessoas?next=https://evil.test',
      '/pessoas#bad',
    ])
      expect(safeExplorerReturn(value)).toBeNull();
  });
});
