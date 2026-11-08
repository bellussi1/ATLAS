import type { PositionClaim } from '@ideologies/models/ideology-page.schema';

import {
  axisInterpretation,
  axisShortInterpretation,
  confidenceSummary,
  estimateAxis,
  estimateEntity,
  largestPairDifference,
  positionPhrase,
  statusLabel,
} from './positions';

const claim = (
  id: string,
  entityId: string,
  value: number,
  confidence: PositionClaim['confidence'],
  sourceIds: string[],
  axisId: PositionClaim['axisId'] = 'revolucao',
): PositionClaim => ({
  id,
  entityId,
  axisId,
  value,
  confidence,
  classification: 'tese atribuída',
  statement: 'afirmação de teste',
  sourceIds,
  editorialStatus: 'pending',
});

describe('positions estimates', () => {
  it('reports insufficient evidence when no claim sustains an axis', () => {
    expect(estimateAxis([], 'person-x', 'revolucao')).toMatchObject({
      status: 'insuficiente',
      value: null,
      claims: 0,
    });
  });

  it('keeps a single claim or a single source as indicative, never as an estimate', () => {
    const single = [claim('a', 'person-x', 0.8, 'alta', ['s1'])];
    expect(estimateAxis(single, 'person-x', 'revolucao')).toMatchObject({
      status: 'indicativa',
      value: 0.8,
      claims: 1,
      sources: 1,
    });
    const sameSource = [
      claim('a', 'person-x', 0.8, 'alta', ['s1']),
      claim('b', 'person-x', 0.6, 'média', ['s1']),
    ];
    expect(estimateAxis(sameSource, 'person-x', 'revolucao').status).toBe('indicativa');
  });

  it('weights claims by confidence and estimates only from two sources within a narrow range', () => {
    const claims = [
      claim('a', 'person-x', 0.8, 'alta', ['s1']),
      claim('b', 'person-x', 0.7, 'média', ['s2']),
    ];
    expect(estimateAxis(claims, 'person-x', 'revolucao')).toMatchObject({
      status: 'estimada',
      value: 0.76,
      low: 0.7,
      high: 0.8,
      sources: 2,
    });
  });

  it('shows divergent sources as divergent, with their range, instead of averaging them away', () => {
    const claims = [
      claim('a', 'person-x', -0.8, 'alta', ['s1']),
      claim('b', 'person-x', 0.4, 'alta', ['s2']),
    ];
    expect(estimateAxis(claims, 'person-x', 'revolucao')).toMatchObject({
      status: 'divergente',
      low: -0.8,
      high: 0.4,
    });
  });

  it('estimates each axis separately and ignores claims about other entities', () => {
    const claims = [
      claim('a', 'person-x', 0.5, 'alta', ['s1'], 'propriedade'),
      claim('b', 'person-y', -0.9, 'alta', ['s1'], 'propriedade'),
    ];
    const axes = estimateEntity(claims, 'person-x');
    expect(axes.find((axis) => axis.axisId === 'propriedade')).toMatchObject({
      value: 0.5,
      claims: 1,
    });
    expect(axes.find((axis) => axis.axisId === 'mercado')?.status).toBe('insuficiente');
    expect(axes).toHaveLength(6);
  });

  it('finds the largest difference on a shared axis and nothing when no axis is shared', () => {
    const rows = [
      { id: 'a', axes: [{ axisId: 'revolucao', value: 0.76 }] as never },
      { id: 'b', axes: [{ axisId: 'revolucao', value: -0.8 }] as never },
      { id: 'c', axes: [{ axisId: 'propriedade', value: 0.1 }] as never },
    ];
    expect(largestPairDifference(rows)).toEqual({
      first: 'a',
      second: 'b',
      axisId: 'revolucao',
      difference: 1.56,
    });
    expect(largestPairDifference([rows[0], rows[2]])).toBeNull();
  });

  it('phrases a position by its side instead of a bare headline number', () => {
    expect(positionPhrase(0.8, 'revolucao')).toBe('mais perto de reforma gradual');
    expect(positionPhrase(-0.8, 'revolucao')).toBe('mais perto de ruptura revolucionária');
    expect(positionPhrase(0, 'revolucao')).toBe(
      'entre ruptura revolucionária e reforma gradual, sem lado claro',
    );
    expect(positionPhrase(null, 'revolucao')).toBe('sem posição definida');
  });

  it('labels the status with the number of sources, never with one confidence score', () => {
    const estimated = estimateAxis(
      [claim('a', 'person-x', 0.8, 'alta', ['s1']), claim('b', 'person-x', 0.7, 'média', ['s2'])],
      'person-x',
      'revolucao',
    );
    expect(statusLabel(estimated)).toBe('Estimada · 2 fontes');
    const indicative = estimateAxis(
      [claim('a', 'person-x', 0.8, 'alta', ['s1'])],
      'person-x',
      'revolucao',
    );
    expect(statusLabel(indicative)).toBe('Indicativa · 1 afirmação');
  });

  it('explains narrow, wide and divergent intervals in words', () => {
    const narrow = estimateAxis(
      [claim('a', 'person-x', 0.8, 'alta', ['s1']), claim('b', 'person-x', 0.7, 'média', ['s2'])],
      'person-x',
      'revolucao',
    );
    expect(axisInterpretation(narrow)).toContain('Faixa estreita');
    expect(axisInterpretation(narrow)).toContain('Mais perto de reforma gradual');

    const wide = estimateAxis(
      [claim('a', 'person-x', -0.2, 'alta', ['s1']), claim('b', 'person-x', 0.6, 'média', ['s2'])],
      'person-x',
      'revolucao',
    );
    expect(axisInterpretation(wide)).toContain('atravessa o centro');

    const divergent = estimateAxis(
      [claim('a', 'person-x', -0.8, 'alta', ['s1']), claim('b', 'person-x', 0.4, 'alta', ['s2'])],
      'person-x',
      'revolucao',
    );
    expect(axisInterpretation(divergent)).toContain('As fontes se dividem');
    expect(axisShortInterpretation(divergent)).toBe('Fontes divergem');

    const oneClaim = estimateAxis(
      [claim('a', 'person-x', 0.5, 'alta', ['s1'])],
      'person-x',
      'revolucao',
    );
    expect(axisInterpretation(oneClaim)).toContain('Uma única afirmação');
    const oneSource = estimateAxis(
      [claim('a', 'person-x', 0.5, 'alta', ['s1']), claim('b', 'person-x', 0.6, 'média', ['s1'])],
      'person-x',
      'revolucao',
    );
    expect(axisInterpretation(oneSource)).toContain('vêm de uma só fonte');
  });

  it('summarises the confidence claim by claim', () => {
    const claims = [
      claim('a', 'person-x', 0.8, 'alta', ['s1']),
      claim('b', 'person-x', 0.7, 'média', ['s2']),
      claim('c', 'person-x', 0.6, 'alta', ['s2']),
    ];
    expect(confidenceSummary(claims)).toBe('Confiança: alta (2), média (1).');
    expect(confidenceSummary([])).toBe('');
  });
});
