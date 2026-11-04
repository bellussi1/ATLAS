import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Traditions the Wikimedia discovery knows how to query. Adding one is data only:
// its Wikidata root, the founders whose influence (P737) is searched, the Commons
// category and the pt.wikipedia article used for the introduction.
// Traditions declared in `content/traditions/<slug>.json` (pipeline stage 1) are added below, so a
// new tradition needs no edit here; the explicit entries keep their curated `configuration`.
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
  'social-democracia': {
    configuration: 'social-democracy',
    rootQid: 'Q121254',
    founderQids: ['Q75784', 'Q75786'],
    commonsCategory: 'Category:Social democracy',
    ptTitle: 'Social-democracia',
  },
};

const registryDirectory = fileURLToPath(new URL('../../../content/traditions/', import.meta.url));

/** Entries declared in the registry that the table above does not already carry. */
function declaredTraditions() {
  let names;
  try {
    names = readdirSync(registryDirectory).filter((name) => name.endsWith('.json'));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
  const declared = {};
  for (const name of names) {
    const entry = JSON.parse(readFileSync(join(registryDirectory, name), 'utf8'));
    if (traditions[entry.slug]) continue;
    declared[entry.slug] = {
      rootQid: entry.rootQid,
      founderQids: entry.discovery?.founderQids ?? [],
      commonsCategory: entry.discovery?.commonsCategory,
      ptTitle: entry.titles.pt,
    };
  }
  return declared;
}

export function traditionFor(slug) {
  const tradition = traditions[slug] ?? declaredTraditions()[slug];
  if (!tradition)
    throw new Error(
      `Tradição desconhecida: ${slug}. Conhecidas: ${Object.keys({ ...traditions, ...declaredTraditions() })}`,
    );
  return { slug, ...tradition };
}
