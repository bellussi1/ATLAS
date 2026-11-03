// Traditions the Wikimedia discovery knows how to query. Adding one is data only:
// its Wikidata root, the founders whose influence (P737) is searched, the Commons
// category and the pt.wikipedia article used for the introduction.
export const traditions = {
  marxismo: {
    configuration: 'marxism',
    rootQid: 'Q7264',
    founderQids: ['Q9061'],
    commonsCategory: 'Category:Marxism',
    ptTitle: 'Marxismo',
  },
  liberalismo: {
    configuration: 'liberalism',
    rootQid: 'Q6216',
    founderQids: ['Q9353', 'Q9381', 'Q50020'],
    commonsCategory: 'Category:Liberalism',
    ptTitle: 'Liberalismo',
  },
};

export function traditionFor(slug) {
  const tradition = traditions[slug];
  if (!tradition)
    throw new Error(`Tradição desconhecida: ${slug}. Conhecidas: ${Object.keys(traditions)}`);
  return { slug, ...tradition };
}
