import { prefersReducedMotion } from './prefers-reduced-motion';

describe('prefersReducedMotion', () => {
  afterEach(() => document.documentElement.classList.remove('atlas-reduced-motion'));

  it('is off by default', () => {
    expect(prefersReducedMotion(document)).toBe(false);
  });

  it('follows the in-page reduced motion switch', () => {
    document.documentElement.classList.add('atlas-reduced-motion');

    expect(prefersReducedMotion(document)).toBe(true);
  });
});
