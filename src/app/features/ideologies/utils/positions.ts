import type { PositionClaim } from '@ideologies/models/ideology-page.schema';
import { positionAxes, positionAxis, type PositionAxisId } from '@ideologies/models/position-axes';

/**
 * Estimates positions from sourced claims. A claim is one attributed statement with a
 * value on one axis. No claim, no position: a missing axis is reported as insufficient
 * evidence, never filled with a neutral value that looks like a finding.
 */

export const confidenceWeight: Record<PositionClaim['confidence'], number> = {
  alta: 1,
  média: 0.6,
  baixa: 0.3,
};

/** Values inside this band are described as "between the poles", not as a side. */
const NEAR_CENTRE = 0.15;
/** A range up to this width is described as narrow; above it, the sources spread out. */
const NARROW_RANGE = 0.3;

export type AxisStatus = 'estimada' | 'divergente' | 'indicativa' | 'insuficiente';

export interface AxisEstimate {
  axisId: PositionAxisId;
  status: AxisStatus;
  value: number | null;
  low: number | null;
  high: number | null;
  claims: number;
  sources: number;
}

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * - `insuficiente`: no claim on the axis.
 * - `indicativa`: one claim, or claims that rest on a single source.
 * - `divergente`: two or more claims from two or more sources whose range is at least 1.
 * - `estimada`: two or more claims from two or more sources within a narrower range.
 */
export function estimateAxis(
  claims: readonly PositionClaim[],
  entityId: string,
  axisId: PositionAxisId,
): AxisEstimate {
  const own = claims.filter((claim) => claim.entityId === entityId && claim.axisId === axisId);
  if (!own.length)
    return {
      axisId,
      status: 'insuficiente',
      value: null,
      low: null,
      high: null,
      claims: 0,
      sources: 0,
    };
  const sources = new Set(own.flatMap((claim) => claim.sourceIds)).size;
  const weight = own.reduce((sum, claim) => sum + confidenceWeight[claim.confidence], 0);
  const value = round(
    own.reduce((sum, claim) => sum + claim.value * confidenceWeight[claim.confidence], 0) / weight,
  );
  const values = own.map((claim) => claim.value);
  const low = round(Math.min(...values));
  const high = round(Math.max(...values));
  const status: AxisStatus =
    own.length < 2 || sources < 2 ? 'indicativa' : high - low >= 1 ? 'divergente' : 'estimada';
  return { axisId, status, value, low, high, claims: own.length, sources };
}

export function estimateEntity(claims: readonly PositionClaim[], entityId: string): AxisEstimate[] {
  return positionAxes.map((axis) => estimateAxis(claims, entityId, axis.id));
}

export interface PairDifference {
  first: string;
  second: string;
  axisId: PositionAxisId;
  difference: number;
}

/** The largest difference between two entities on any axis where both have a value. */
export function largestPairDifference(
  rows: readonly { id: string; axes: readonly AxisEstimate[] }[],
): PairDifference | null {
  let best: PairDifference | null = null;
  for (let i = 0; i < rows.length; i += 1)
    for (let j = i + 1; j < rows.length; j += 1)
      for (const a of rows[i].axes) {
        const b = rows[j].axes.find((axis) => axis.axisId === a.axisId);
        if (a.value === null || b?.value == null) continue;
        const difference = round(Math.abs(a.value - b.value));
        if (!best || difference > best.difference)
          best = {
            first: rows[i].id,
            second: rows[j].id,
            axisId: a.axisId,
            difference,
          };
      }
  return best;
}

/** Reader-facing status with the evidence count; never a single confidence score. */
export function statusLabel(axis: AxisEstimate): string {
  switch (axis.status) {
    case 'insuficiente':
      return 'Sem evidência';
    case 'indicativa':
      return axis.claims === 1
        ? 'Indicativa · 1 afirmação'
        : `Indicativa · ${axis.sources} ${axis.sources === 1 ? 'fonte' : 'fontes'}`;
    case 'divergente':
      return `Divergente · ${axis.sources} fontes`;
    case 'estimada':
      return `Estimada · ${axis.sources} fontes`;
  }
}

/** A short direction phrase, always in words and never a single headline number. */
export function positionPhrase(value: number | null, axisId: PositionAxisId): string {
  const axis = positionAxis(axisId);
  if (value === null) return 'sem posição definida';
  if (value >= NEAR_CENTRE) return `mais perto de ${axis.high}`;
  if (value <= -NEAR_CENTRE) return `mais perto de ${axis.low}`;
  return `entre ${axis.low} e ${axis.high}, sem lado claro`;
}

/**
 * Explains the interval in words. Divergence is never averaged into a centre: the text
 * says whether the sources split across the poles or only in intensity.
 */
export function axisInterpretation(axis: AxisEstimate): string {
  const config = positionAxis(axis.axisId);
  if (axis.status === 'insuficiente') return 'Nenhuma afirmação com fonte sobre este eixo.';
  const direction = positionPhrase(axis.value, axis.axisId);
  if (axis.status === 'divergente') {
    const low = axis.low ?? 0;
    const high = axis.high ?? 0;
    if (low >= NEAR_CENTRE)
      return `As fontes se dividem, mas ambas ficam do lado de ${config.high}.`;
    if (high <= -NEAR_CENTRE)
      return `As fontes se dividem, mas ambas ficam do lado de ${config.low}.`;
    return `As fontes se dividem entre ${config.low} e ${config.high}; não há um centro que represente o conjunto.`;
  }
  if (axis.status === 'indicativa') {
    if (axis.claims === 1)
      return `Uma única afirmação indica uma posição ${direction}; é uma pista de leitura, não uma estimativa.`;
    return `As afirmações vêm de uma só fonte e indicam uma posição ${direction}; é uma pista de leitura, não uma estimativa.`;
  }
  const low = axis.low ?? 0;
  const high = axis.high ?? 0;
  if (low < 0 && high > 0)
    return `A faixa atravessa o centro: as fontes não concordam sobre o lado. ${capitalize(direction)}.`;
  const range = high - low;
  const opening =
    range <= NARROW_RANGE
      ? 'Faixa estreita: as fontes ficam próximas'
      : 'Faixa ampla: as fontes concordam na direção, mas não na intensidade';
  return `${opening}. ${capitalize(direction)}.`;
}

/** Compact phrase for chips and the comparison rows; the full sentence stays in the axis. */
export function axisShortInterpretation(axis: AxisEstimate): string {
  if (axis.status === 'divergente') return 'Fontes divergem';
  if (axis.status === 'insuficiente') return 'Sem evidência';
  return capitalize(positionPhrase(axis.value, axis.axisId));
}

/** How much confidence the reader actually has, listed claim by claim. */
export function confidenceSummary(claims: readonly PositionClaim[]): string {
  if (!claims.length) return '';
  const counts = new Map<PositionClaim['confidence'], number>();
  for (const claim of claims) {
    counts.set(claim.confidence, (counts.get(claim.confidence) ?? 0) + 1);
  }
  const order: PositionClaim['confidence'][] = ['alta', 'média', 'baixa'];
  const parts = order
    .filter((confidence) => counts.has(confidence))
    .map((confidence) => `${confidence} (${counts.get(confidence)})`);
  return `Confiança: ${parts.join(', ')}.`;
}

/** Accessible name of the track: entity, axis, status, interval and scale in one sentence. */
export function axisDescription(entityTitle: string, axis: AxisEstimate): string {
  const config = positionAxis(axis.axisId);
  return `${entityTitle}, ${config.label}: ${statusLabel(axis)}. ${axisInterpretation(axis)} Escala de ${config.low} a ${config.high}; o centro é posição mista ou não determinada.`;
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1);
}
