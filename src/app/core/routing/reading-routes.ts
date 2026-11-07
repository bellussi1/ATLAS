/** Canonical prefix for the continuous readings. */
export const READING_ROOT = 'leitura';

/** Canonical URL of a continuous reading. */
export const readingPath = (slug: string) => `/${READING_ROOT}/${slug}`;
