import { networkKinds } from '@core/content/queries/knowledge-network';
import { describe, expect, it } from 'vitest';

import { shapePath } from './network-shapes';

describe('shapePath', () => {
  it('draws a distinct closed path for every node family', () => {
    const paths = networkKinds.map((kind) => shapePath(kind.shape, 10));
    expect(new Set(paths).size).toBe(networkKinds.length);
    for (const path of paths) expect(path).toMatch(/^M.*Z$/);
  });

  it('scales with the radius', () => {
    expect(shapePath('square', 20)).not.toBe(shapePath('square', 10));
  });
});
