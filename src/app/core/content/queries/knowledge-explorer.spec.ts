import { contentFixture } from '@testing/content-fixture';

import {
  explorerContentGroup,
  explorerEntries,
  explorerFacets,
  explorerPage,
  parseExplorerPage,
  safeExplorerReturn,
} from './knowledge-explorer';

const discoveryIndex = contentFixture.search;

describe('Knowledge Explorer', () => {
  it('includes public readings and respects the explicit pending status of imported records', () => {
    expect(discoveryIndex.find((e) => e.id === 'reading-marxismo')?.path).toBe('/leitura/marxismo');
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
  it('counts each category so the filters can show how many records they hold', () => {
    const facets = explorerFacets(discoveryIndex, 'acervo');
    expect(facets.total).toBe(explorerEntries(discoveryIndex, { catalogue: 'acervo' }).length);
    expect(facets.kinds.reduce((sum, kind) => sum + kind.count, 0)).toBe(facets.total);
  });
  it('separates records, sources and editorial pages into their own content groups', () => {
    expect(explorerContentGroup('pessoa')).toBe('registros');
    expect(explorerContentGroup('fonte')).toBe('fontes');
    expect(explorerContentGroup('leitura')).toBe('editorial');
  });
  it('paginates results, clamps out-of-range pages and parses only positive integers', () => {
    const items = Array.from({ length: 45 }, (_, index) => index);
    expect(explorerPage(items, 1, 20)).toMatchObject({ page: 1, pageCount: 3, start: 1, end: 20 });
    expect(explorerPage(items, 3, 20)).toMatchObject({ page: 3, start: 41, end: 45 });
    expect(explorerPage(items, 9, 20)).toMatchObject({ page: 3, start: 41, end: 45 });
    expect(explorerPage([], 4, 20)).toMatchObject({ page: 1, pageCount: 1, total: 0, start: 0 });
    expect(parseExplorerPage('2')).toBe(2);
    for (const value of [null, '', '0', '-1', '2x', '1.5'])
      expect(parseExplorerPage(value)).toBe(1);
  });
  it('pages the archive by a fixed size of 24 records (6 columns of 4 rows)', () => {
    const items = Array.from({ length: 50 }, (_, index) => index);
    expect(explorerPage(items, 1)).toMatchObject({ pageCount: 3, start: 1, end: 24 });
    expect(explorerPage(items, 3)).toMatchObject({ page: 3, start: 49, end: 50 });
  });
  it('accepts shareable catalog returns and rejects external or arbitrary destinations', () => {
    expect(safeExplorerReturn('/pessoas?q=marx&estado=pending')).toBe(
      '/pessoas?q=marx&estado=pending',
    );
    expect(safeExplorerReturn('/acervo?q=marx&pagina=2')).toBe('/acervo?q=marx&pagina=2');
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
