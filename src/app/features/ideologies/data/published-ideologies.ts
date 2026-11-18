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
  nazismo: {
    page: 'content/ideologies/nazismo/page.json',
    supplement: 'content/graph/nazismo.json',
  },
  stalinismo: {
    page: 'content/ideologies/stalinismo/page.json',
    supplement: 'content/graph/stalinismo.json',
    unlisted: true,
  },
  trabalhismo: {
    page: 'content/ideologies/trabalhismo/page.json',
    supplement: 'content/graph/trabalhismo.json',
  },
  'era-vargas': {
    page: 'content/ideologies/era-vargas/page.json',
    supplement: 'content/graph/era-vargas.json',
    unlisted: true,
  },
  'golpe-de-1964': {
    page: 'content/ideologies/golpe-de-1964/page.json',
    supplement: 'content/graph/golpe-de-1964.json',
    unlisted: true,
  },
  'ditadura-militar-brasileira': {
    page: 'content/ideologies/ditadura-militar-brasileira/page.json',
    supplement: 'content/graph/ditadura-militar-brasileira.json',
    unlisted: true,
  },
  'segunda-guerra-mundial': {
    page: 'content/ideologies/segunda-guerra-mundial/page.json',
    supplement: 'content/graph/segunda-guerra-mundial.json',
    unlisted: true,
  },
  revolucao: {
    page: 'content/ideologies/revolucao/page.json',
    supplement: 'content/graph/revolucao.json',
    unlisted: true,
  },
  estado: {
    page: 'content/ideologies/estado/page.json',
    supplement: 'content/graph/estado.json',
    unlisted: true,
  },
  'karl-marx': {
    page: 'content/ideologies/karl-marx/page.json',
    supplement: 'content/graph/karl-marx.json',
    unlisted: true,
  },
  'adam-smith': {
    page: 'content/ideologies/adam-smith/page.json',
    supplement: 'content/graph/adam-smith.json',
    unlisted: true,
  },
};
