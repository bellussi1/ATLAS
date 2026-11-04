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
  'social-democracia': {
    page: 'content/ideologies/social-democracia/page.json',
    supplement: 'content/graph/social-democracia.json',
  },
  anarquismo: {
    page: 'content/ideologies/anarquismo/page.json',
    supplement: 'content/graph/anarquismo.json',
  },
};
