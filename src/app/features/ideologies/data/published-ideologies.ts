interface PublishedIdeology {
  pageUrl: string;
  supplementUrl: string;
  loadPage: () => Promise<{ default: unknown }>;
  loadSupplement: () => Promise<{ default: unknown }>;
}
export const publishedIdeologies: Readonly<Record<string, PublishedIdeology | undefined>> = {
  marxismo: {
    pageUrl: '/content/ideologies/marxismo/page.json',
    supplementUrl: '/content/graph/marxismo.json',
    loadPage: () => import('../../../../content/ideologies/marxismo/page.json'),
    loadSupplement: () => import('../../../../content/graph/marxismo.json'),
  },
};
