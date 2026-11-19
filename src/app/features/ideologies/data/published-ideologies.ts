import { isUnlistedReading } from '@core/content/editorial/public-readings';

/**
 * Source files of the published readings. Build-time only: `content:build` compiles them into the
 * R2 release, and the app reads them from there, never from its bundle.
 */
export interface PublishedIdeologySource {
  page: string;
  supplement: string;
  /** Compiled and reachable by direct URL, but not listed on the home, search or curated paths. */
  unlisted?: boolean;
}

const readingSource = (slug: string): PublishedIdeologySource => ({
  page: `content/ideologies/${slug}/page.json`,
  supplement: `content/graph/${slug}.json`,
  ...(isUnlistedReading(slug) ? { unlisted: true } : {}),
});

export const publishedIdeologies: Readonly<Record<string, PublishedIdeologySource | undefined>> = {
  marxismo: readingSource('marxismo'),
  liberalismo: readingSource('liberalismo'),
  'social-democracia': readingSource('social-democracia'),
  anarquismo: readingSource('anarquismo'),
  nazismo: readingSource('nazismo'),
  stalinismo: readingSource('stalinismo'),
  trabalhismo: readingSource('trabalhismo'),
  'era-vargas': readingSource('era-vargas'),
  'golpe-de-1964': readingSource('golpe-de-1964'),
};
