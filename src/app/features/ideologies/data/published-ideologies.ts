/**
 * Source files of the published readings. Build-time only: `content:build` compiles them into the
 * R2 release, and the app reads them from there, never from its bundle.
 */
export interface PublishedIdeologySource {
  page: string;
  supplement: string;
}

export const publishedIdeologies: Readonly<Record<string, PublishedIdeologySource | undefined>> = {
  marxismo: {
    page: 'content/ideologies/marxismo/page.json',
    supplement: 'content/graph/marxismo.json',
  },
  liberalismo: {
    page: 'content/ideologies/liberalismo/page.json',
    supplement: 'content/graph/liberalismo.json',
  },
};
