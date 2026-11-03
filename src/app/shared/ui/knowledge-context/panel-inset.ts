/** Breathing room kept between the reading column and the docked panel. */
const PANEL_GAP = 16;

/** Marks the text column whose right edge the docked panel must not cover. */
export const READING_COLUMN = '[data-reading-column] p';

/**
 * Width the page must give up for the docked panel: the free margin beside the reading
 * column is used first, and only the shortfall becomes padding (so text reflows less).
 */
export function panelInset(panelWidth: number, viewportWidth: number, readingEdge: number): number {
  const free = Math.max(0, viewportWidth - readingEdge);
  return Math.max(0, Math.ceil(panelWidth + PANEL_GAP - free));
}

/**
 * Typical right edge of the visible reading paragraphs (the median, so a single larger lead
 * paragraph does not decide for the whole page), or null when the page has none.
 */
export function readingEdge(doc: Document): number | null {
  const edges: number[] = [];
  for (const element of doc.querySelectorAll(READING_COLUMN)) {
    const { right, width } = element.getBoundingClientRect();
    if (width > 0) edges.push(right);
  }
  if (!edges.length) return null;
  edges.sort((a, b) => a - b);
  return edges[Math.floor(edges.length / 2)];
}
