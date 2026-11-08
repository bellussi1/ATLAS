/**
 * Amazon Associates tag for the Brazilian marketplace. The tag is public because it travels in
 * every URL; keep it empty until the account is approved so no purchase is credited to someone
 * else. Set the approved tag here to start earning on qualifying purchases.
 */
export const AMAZON_ASSOCIATE_TAG = '';

/**
 * Works that are books with a known author. The catalogue also holds topics, periodicals and a
 * film, so a purchase link only exists for records listed here. Authors are part of the search
 * query; they are not copied from any external catalogue.
 */
const bookAuthors: Readonly<Record<string, string>> = {
  'a-desobediencia-civil': 'Henry David Thoreau',
  'a-etica-protestante-e-o-espirito-do-capitalismo': 'Max Weber',
  'a-riqueza-das-nacoes': 'Adam Smith',
  'agrarian-justice': 'Thomas Paine',
  'discursos-sobre-a-primeira-decada-de-tito-livio': 'Nicolau Maquiavel',
  'economia-e-sociedade': 'Max Weber',
  'era-dos-extremos': 'Eric Hobsbawm',
  'l-asino-d-oro': 'Nicolau Maquiavel',
  'ludwig-feuerbach-e-o-fim-da-filosofia-classica-alema': 'Friedrich Engels',
  'o-capital': 'Karl Marx',
  'o-capital-volume-i': 'Karl Marx',
  'o-principe': 'Nicolau Maquiavel',
  'principia-mathematica': 'Alfred North Whitehead e Bertrand Russell',
  'rights-of-man': 'Thomas Paine',
  'tao-te-ching': 'Laozi',
  walden: 'Henry David Thoreau',
  'work-anti-duhring': 'Friedrich Engels',
  'work-communist-manifesto': 'Karl Marx e Friedrich Engels',
  'work-critique-of-the-gotha-program': 'Karl Marx',
  'work-imperialism-the-highest-stage-of-capitalism': 'Vladimir Lênin',
  'work-materialism-and-empirio-criticism': 'Vladimir Lênin',
  'work-the-work-of-art-in-the-age-of-mechanical-reproduction': 'Walter Benjamin',
};

export interface AmazonBookLink {
  readonly url: string;
  readonly affiliate: boolean;
}

/**
 * Direct Amazon search restricted to books. Amazon requires direct links instead of redirects or
 * shorteners. The link exists without a tag so readers can still find the work; the commission
 * only applies after an approved tag is set.
 */
export function amazonBookLink(
  slug: string,
  title: string,
  tag: string = AMAZON_ASSOCIATE_TAG,
): AmazonBookLink | null {
  const author = bookAuthors[slug];
  if (!author) return null;
  const query = new URLSearchParams({ k: `${title} ${author}`.trim(), i: 'stripbooks' });
  const affiliate = tag.trim();
  if (affiliate) query.set('tag', affiliate);
  return {
    url: `https://www.amazon.com.br/s?${query.toString()}`,
    affiliate: Boolean(affiliate),
  };
}
