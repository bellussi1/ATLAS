import { methodologyKnowledgeGraph } from '@testing/content-fixture';

import {
  buildDiscoveryIndex,
  filterDiscoveryIndex,
  safeDiscoveryOrigin,
  validateDiscoveryDestinations,
} from './discovery-index';

describe('static discovery index', () => {
  const index = buildDiscoveryIndex(methodologyKnowledgeGraph);

  it('indexes entities and sources with distinct facets, aliases, and editorial states', () => {
    expect(index.find((item) => item.path === '/verbete/ulysses-guimaraes')).toMatchObject({
      kind: 'pessoa',
      kindLabel: 'Pessoa',
      aliases: ['Ulysses Silveira Guimarães'],
      state: 'registered',
    });
    expect(index.find((item) => item.kind === 'evento')?.kindLabel).toBe('Evento');
    expect(index.find((item) => item.kind === 'work')?.kindLabel).toBe('Obra');
    expect(index.find((item) => item.path === '/verbete/brasil')).toMatchObject({
      kind: 'country',
      kindLabel: 'País',
    });
    expect(
      index.find((item) => item.path === '/verbete/brasil-recorte-constitucional-1988'),
    ).toMatchObject({ kind: 'regime', kindLabel: 'Regime' });
    expect(index.find((item) => item.kind === 'place')?.kindLabel).toBe('Lugar');
    expect(index.find((item) => item.kind === 'fonte')).toMatchObject({
      path: '/acervo/fontes',
      fragment: expect.stringMatching(/^source-/),
    });
    expect(
      filterDiscoveryIndex(index, { query: 'silveira guimaraes' }).map((item) => item.title),
    ).toContain('Ulysses Guimarães');
    expect(filterDiscoveryIndex(index, { query: 'CF/88' }).map((item) => item.title)).toContain(
      'Constituição da República Federativa do Brasil de 1988',
    );
    const lula = filterDiscoveryIndex(index, { query: 'lula' }).map((item) => item.title);
    expect(lula[0]).toBe('Luiz Inácio Lula da Silva');
    expect(lula).not.toContain('Partido dos Trabalhadores');
    expect(lula.every((title) => title.toLowerCase().includes('lula'))).toBe(true);
    expect(
      filterDiscoveryIndex(index, { kind: 'artigo', state: 'pending' }).map((item) => item.title),
    ).toEqual(['O caput do artigo 5º da Constituição de 1988']);
  });

  it('indexes topic-like records as concepts and named events as events', () => {
    for (const id of [
      'wiki-topic-aborto',
      'wiki-topic-casamento',
      'wiki-topic-casamento-entre-pessoas-do-mesmo-sexo',
      'wiki-topic-desigualdade-economica',
      'wiki-topic-estado-de-direito',
      'wiki-topic-irreligiao',
      'wiki-topic-violencia',
    ])
      expect(index.find((item) => item.id === id)?.kind).toBe('concept');
    expect(index.find((item) => item.id === 'wiki-topic-primeira-guerra-mundial')?.kind).toBe(
      'evento',
    );
  });

  it('builds directional backlinks with registered labels and rejects missing destinations', () => {
    const concept = index.find((item) => item.path === '/verbete/igualdade-perante-a-lei')!;
    expect(concept.backlinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/verbete/constituicao-federal-1988',
          label: 'é enunciada por',
        }),
      ]),
    );
    expect(validateDiscoveryDestinations(index, methodologyKnowledgeGraph)).toEqual([]);
    expect(
      validateDiscoveryDestinations(
        [...index, { ...index[0], path: '/verbete/pagina-inexistente' }],
        methodologyKnowledgeGraph,
      ),
    ).toContain('Destino inexistente: /verbete/pagina-inexistente');
  });

  it('accepts only a same-site knowledge search as a contextual return destination', () => {
    expect(safeDiscoveryOrigin('/acervo?q=ulysses&tipo=person&estado=registered')).toBe(
      '/acervo?q=ulysses&tipo=person&estado=registered',
    );
    expect(safeDiscoveryOrigin('https://example.org/acervo')).toBeNull();
    expect(safeDiscoveryOrigin('/verbete/ulysses-guimaraes')).toBeNull();
  });
});
