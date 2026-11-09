import { contentFixture } from '@testing/content-fixture';

import {
  explorerContentGroup,
  explorerEntries,
  explorerFacets,
  explorerMatchKind,
  explorerPage,
  explorerRecordGroups,
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
  it('returns names before the passages that merely mention them', () => {
    const results = explorerEntries(discoveryIndex, { query: 'lula' });
    expect(results[0].title).toBe('Luiz Inácio Lula da Silva');
    expect(results.map((e) => e.title)).not.toContain('Partido dos Trabalhadores');
    expect(explorerMatchKind(discoveryIndex, { query: 'lula' })).toBe('name');
    // A query that names no record still finds the translation that cites it.
    expect(explorerMatchKind(discoveryIndex, { query: 'federative' })).toBe('text');
    expect(explorerEntries(discoveryIndex, { query: 'federative' }).map((e) => e.title)).toContain(
      'Brasil',
    );
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
  it('filters the universal archive by layer and keeps the layer counts', () => {
    const records = explorerEntries(discoveryIndex, { catalogue: 'acervo', layer: 'registros' });
    const sources = explorerEntries(discoveryIndex, { catalogue: 'acervo', layer: 'fontes' });
    const readings = explorerEntries(discoveryIndex, { catalogue: 'acervo', layer: 'editorial' });
    expect(records.length).toBeGreaterThan(0);
    expect(records.every((entry) => entry.path.startsWith('/verbete/'))).toBe(true);
    expect(sources.every((entry) => entry.kind === 'fonte')).toBe(true);
    expect(readings.every((entry) => entry.kind === 'leitura')).toBe(true);
    const facets = explorerFacets(discoveryIndex, 'acervo', 'registros');
    expect(facets.total).toBe(records.length);
    expect(facets.layers.map((layer) => layer.id)).toEqual([
      '',
      'registros',
      'fontes',
      'editorial',
    ]);
    const all = explorerEntries(discoveryIndex, { catalogue: 'acervo' }).length;
    expect(facets.layers[0].count).toBe(all);
    expect(
      facets.layers.filter((layer) => layer.id).reduce((sum, layer) => sum + layer.count, 0),
    ).toBe(all);
    expect(facets.kinds.every((kind) => kind.group === 'registros')).toBe(true);
  });
  it('groups record kinds into reader-facing categories', () => {
    const grouped = explorerRecordGroups.flatMap((group) => group.kinds);
    for (const kind of ['pessoa', 'ideology', 'concept', 'work', 'evento', 'institution'])
      expect(grouped).toContain(kind);
  });
  it('routes each place category to its own catalogue', () => {
    const countries = explorerEntries(discoveryIndex, { catalogue: 'paises' });
    const cities = explorerEntries(discoveryIndex, { catalogue: 'cidades' });
    const states = explorerEntries(discoveryIndex, { catalogue: 'estados' });
    const sites = explorerEntries(discoveryIndex, { catalogue: 'locais' });
    const regions = explorerEntries(discoveryIndex, { catalogue: 'lugares' });
    expect(countries.length).toBeGreaterThan(10);
    expect(countries.every((entry) => entry.kind === 'country')).toBe(true);
    expect(cities.length).toBeGreaterThan(0);
    expect(cities.every((entry) => entry.kind === 'city')).toBe(true);
    expect(states.every((entry) => entry.kind === 'state')).toBe(true);
    expect(sites.every((entry) => entry.kind === 'site')).toBe(true);
    expect(
      regions.every((entry) => ['region', 'continent', 'other', 'place'].includes(entry.kind)),
    ).toBe(true);
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
    expect(safeExplorerReturn('/acervo/pessoas?q=marx&estado=pending')).toBe(
      '/acervo/pessoas?q=marx&estado=pending',
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
