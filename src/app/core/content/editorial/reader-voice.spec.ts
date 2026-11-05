import type { ContextConnection } from '@core/content/models/knowledge-context';

import {
  editorialSeal,
  hasPartialCoverage,
  isAiAssisted,
  readerDate,
  readerPredicate,
  readerProse,
  relationGroups,
  relationReading,
} from './reader-voice';

const relation = (
  over: Partial<NonNullable<ContextConnection['relation']>> = {},
): NonNullable<ContextConnection['relation']> => ({
  type: 'documented-association',
  label: 'escreveu',
  direction: 'outgoing',
  context: 'Smith publicou a obra em 1776.',
  uncertainty: 'low',
  editorialStatus: 'pending',
  provenance: undefined,
  references: [],
  ...over,
});
const source = {
  id: 's',
  title: 'Fonte',
  url: 'https://example.org/',
  edition: '',
  publicationDate: null,
};

describe('readerProse', () => {
  it('removes process notes and keeps what is left', () => {
    expect(
      readerProse(
        'Marx influenciou Engels. Extraído por IA (Wikipédia pt, revisão 7, CC BY-SA 4.0) e conferido contra o trecho. Revisão humana não registrada.',
      ),
    ).toBe('Marx influenciou Engels.');
  });

  it.each([
    'Rascunho assistido por IA a partir da Wikipédia (pt), revisão 73211929. Leitura parcial do artigo; cobertura incompleta. Revisão humana não registrada.',
    'A página “John Locke” na Wikipedia foi consultada para descobrir categorias e links internos. Essas conexões são caminhos de navegação, não relações historiográficas validadas.',
    'Mapeado da declaração P279 em Q794394; a declaração estruturada precisa de revisão editorial e não é, por si, validação historiográfica.',
    'Síntese de fonte enciclopédica com revisão editorial pendente. Cobertura parcial da fonte.',
  ])('leaves nothing of a text that only describes the record: %s', (text) => {
    expect(readerProse(text)).toBeNull();
  });

  it('keeps editorial prose untouched', () => {
    const text = 'A Câmara registra a presidência. O Diário registra a sessão de 1988.';
    expect(readerProse(text)).toBe(text);
  });
});

describe('editorial state stays visible outside the prose', () => {
  it('identifies AI and never implies a human review', () => {
    expect(editorialSeal({ editorialStatus: 'pending', aiAssisted: true })).toBe(
      'Inclui síntese por IA · revisão humana não registrada',
    );
    expect(editorialSeal({ editorialStatus: 'pending' })).toBe('Revisão editorial pendente');
    expect(editorialSeal({})).toBe('Situação editorial não informada');
    expect(editorialSeal({ editorialStatus: 'pending', partialCoverage: true })).toContain(
      'cobertura parcial',
    );
  });

  it('reads AI assistance and partial coverage from the record, not from a page', () => {
    expect(isAiAssisted([{ edition: 'revisão 1; extração assistida por IA (assistente)' }])).toBe(
      true,
    );
    expect(isAiAssisted([{ edition: 'Diário da ANC' }, { edition: null }])).toBe(false);
    expect(hasPartialCoverage('Leitura parcial do artigo; cobertura incompleta.')).toBe(true);
    expect(hasPartialCoverage('Texto integral.')).toBe(false);
  });
});

describe('relations', () => {
  it('drops the catalogue name and codes from a label', () => {
    expect(readerPredicate('é listado no Wikidata como influenciado por')).toBe(
      'é listado como influenciado por',
    );
    expect(readerPredicate('participou de (afirmação estruturada no Wikidata)')).toBe(
      'participou de',
    );
    expect(readerPredicate('é rotulado no Wikidata com a ideologia (P1142)')).toBe(
      'é rotulado com a ideologia',
    );
    expect(readerPredicate('link de descoberta na Wikipedia')).toBe('remete a');
    expect(readerPredicate('mencionado por link de descoberta na Wikipedia')).toBe(
      'é referido por',
    );
    expect(readerPredicate('foi escrito por')).toBe('foi escrito por');
  });

  it('classifies by the evidence, whatever the type says', () => {
    expect(
      relationReading(
        relation({
          type: 'influenced_by',
          provenance: {
            source: 'wikidata',
            url: 'https://example.org/',
            retrievedAt: '2026-11-03',
          },
        }),
      ).tier,
    ).toBe('classified');
    expect(relationReading(relation({ type: 'encyclopedic-link' })).tier).toBe('lead');
    expect(relationReading(relation({ type: 'editorial-link' })).tier).toBe('editorial');
    expect(relationReading(relation({ type: 'wrote' }))).toMatchObject({
      tier: 'documented',
      nature: 'Autoria',
      meta: 'incerteza baixa · revisão editorial pendente',
    });
  });

  it('shows a quote from the source as a quote and hides catalogue codes', () => {
    expect(
      relationReading(
        relation({
          provenance: {
            source: 'wikipedia',
            url: 'https://example.org/',
            retrievedAt: '2026-11-03',
          },
          references: [{ id: 'e', locator: 'Marx influenciou Engels', source }],
        }),
      ).evidence[0],
    ).toMatchObject({ quote: 'Marx influenciou Engels', locator: null, title: 'Fonte' });
    expect(
      relationReading(
        relation({ references: [{ id: 'e', locator: 'Q140694 P737 Q15975', source }] }),
      ).evidence[0],
    ).toMatchObject({ quote: null, locator: null });
    expect(
      relationReading(relation({ references: [{ id: 'e', locator: 'p. 14377', source }] }))
        .evidence[0].locator,
    ).toBe('p. 14377');
  });

  it('cites the place of consultation when a lead has no other evidence', () => {
    const [evidence] = relationReading(
      relation({
        type: 'encyclopedic-link',
        provenance: { source: 'wikipedia', url: 'https://example.org/', retrievedAt: '2026-11-03' },
      }),
    ).evidence;
    expect(evidence.title).toBe('Wikipédia');
    expect(evidence.locator).toBe('consulta em 3 de novembro de 2026');
  });

  it('orders groups by evidence and closes leads only below something stronger', () => {
    const lead = { entityId: 'a', label: 'A', relation: relation({ type: 'encyclopedic-link' }) };
    const documented = { entityId: 'b', label: 'B', relation: relation() };
    const groups = relationGroups([lead, documented]);
    expect(groups.map((group) => group.tier)).toEqual(['documented', 'lead']);
    expect(groups[1].collapsed).toBe(true);
    expect(relationGroups([lead])[0].collapsed).toBe(false);
    expect(relationGroups([{ entityId: 'c', label: 'C' }])[0].tier).toBe('cited');
  });
});

describe('readerDate', () => {
  it('writes the date out and keeps anything else', () => {
    expect(readerDate('2026-11-03')).toBe('3 de novembro de 2026');
    expect(readerDate('1867')).toBe('1867');
    expect(readerDate(null)).toBe('');
  });
});
