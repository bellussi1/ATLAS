/**
 * One decision for every animated surface: the OS preference and the in-page
 * "Reduzir movimento" switch (`html.atlas-reduced-motion`) both count.
 */
export const prefersReducedMotion = (doc: Document): boolean =>
  doc.documentElement.classList.contains('atlas-reduced-motion') ||
  doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
