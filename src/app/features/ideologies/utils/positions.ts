import type { PositionClaim } from '@ideologies/models/ideology-page.schema';
import { positionAxes, type PositionAxisId } from '@ideologies/models/position-axes';

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
