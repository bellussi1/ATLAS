import { methodologyKnowledgeGraph } from './content-repository';
import { buildDiscoveryIndex, filterDiscoveryIndex, safeDiscoveryOrigin, validateDiscoveryDestinations } from './discovery-index';

describe('static discovery index', () => {
  const index = buildDiscoveryIndex(methodologyKnowledgeGraph);

  it('indexes entities and sources with distinct facets, aliases, and editorial states', () => {
    expect(index.find((item) => item.path === '/verbete/ulysses-guimaraes')).toMatchObject({
      kind: 'pessoa', kindLabel: 'Pessoa', aliases: ['Ulysses Silveira Guimarães'], state: 'registered',
    });
    expect(index.find((item) => item.kind === 'evento')?.kindLabel).toBe('Evento');
    expect(index.find((item) => item.kind === 'work')?.kindLabel).toBe('Obra');
    expect(index.find((item) => item.kind === 'fonte')).toMatchObject({ path: '/fontes', fragment: expect.stringMatching(/^source-/) });
    expect(filterDiscoveryIndex(index, { query: 'silveira guimaraes' }).map((item) => item.title))
      .toContain('Ulysses Guimarães');
    expect(filterDiscoveryIndex(index, { query: 'CF/88' }).map((item) => item.title))
      .toContain('Constituição da República Federativa do Brasil de 1988');
    expect(filterDiscoveryIndex(index, { kind: 'artigo', state: 'pending' }).map((item) => item.title))
      .toEqual(['O caput do artigo 5º da Constituição de 1988']);
  });

  it('builds directional backlinks with registered labels and rejects missing destinations', () => {
    const concept = index.find((item) => item.path === '/verbete/igualdade-perante-a-lei')!;
    expect(concept.backlinks).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/verbete/constituicao-federal-1988', label: 'é enunciada por' }),
    ]));
    expect(validateDiscoveryDestinations(index, methodologyKnowledgeGraph)).toEqual([]);
    expect(validateDiscoveryDestinations([...index, { ...index[0], path: '/verbete/pagina-inexistente' }], methodologyKnowledgeGraph))
      .toContain('Destino inexistente: /verbete/pagina-inexistente');
  });

  it('accepts only a same-site knowledge search as a contextual return destination', () => {
    expect(safeDiscoveryOrigin('/conhecimento?q=ulysses&tipo=person&estado=registered'))
      .toBe('/conhecimento?q=ulysses&tipo=person&estado=registered');
    expect(safeDiscoveryOrigin('https://example.org/conhecimento')).toBeNull();
    expect(safeDiscoveryOrigin('/verbete/ulysses-guimaraes')).toBeNull();
  });
});
