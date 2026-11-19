import { readingPath } from '@core/routing/reading-routes';

export interface ReadingRegistryEntry {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  /** Compiled and reachable by direct URL, but excluded from home, search, links and sitemap. */
  readonly unlisted?: boolean;
}

export const readingRegistry: readonly ReadingRegistryEntry[] = [
  {
    slug: 'marxismo',
    title: 'Marxismo',
    summary: 'Uma tradição, muitas leituras: conceitos, pensadores e divergências.',
  },
  {
    slug: 'liberalismo',
    title: 'Liberalismo',
    summary: 'Explore pessoas, ideias, obras e acontecimentos na leitura do liberalismo.',
  },
  {
    slug: 'social-democracia',
    title: 'Social-democracia',
    summary: 'Reformas, Estado de bem-estar e disputas com o socialismo e o liberalismo.',
  },
  {
    slug: 'anarquismo',
    title: 'Anarquismo',
    summary: 'Origens, correntes, experiências históricas e debates do anarquismo.',
  },
  {
    slug: 'nazismo',
    title: 'Nazismo',
    summary:
      'Origens, ideias, pessoas, experiências e debates críticos sobre o nacional-socialismo.',
  },
  {
    slug: 'stalinismo',
    title: 'Stalinismo',
    summary: 'Ideologia, Estado soviético, industrialização forçada, repressão e interpretações.',
    unlisted: true,
  },
  {
    slug: 'trabalhismo',
    title: 'Trabalhismo',
    summary: 'Tradição política brasileira: Vargas, PTB, legislação trabalhista e debates.',
  },
  {
    slug: 'era-vargas',
    title: 'Era Vargas',
    summary:
      'Do Estado oligárquico ao Estado social: revolução de 1930, Estado Novo, CLT e legado.',
  },
  {
    slug: 'golpe-de-1964',
    title: 'Golpe de 1964',
    summary:
      'A ruptura democrática de 1964: crise política, atores, justificativas e consequências.',
  },
];

export const unlistedReadingSlugs: ReadonlySet<string> = new Set(
  readingRegistry.filter((entry) => entry.unlisted).map((entry) => entry.slug),
);

export function isUnlistedReading(slug: string): boolean {
  return unlistedReadingSlugs.has(slug);
}

// Public reading destinations shown on curated cards; actual page implementations remain feature-owned.
export const publicReadings = readingRegistry
  .filter(
    (entry) =>
      !entry.unlisted &&
      ['marxismo', 'liberalismo', 'social-democracia', 'anarquismo'].includes(entry.slug),
  )
  .map((entry) => ({
    slug: entry.slug,
    title: entry.title,
    summary: entry.summary,
    path: readingPath(entry.slug),
  }));
