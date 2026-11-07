import { readingPath } from '@core/routing/reading-routes';

// Public reading destinations; actual page implementations remain feature-owned.
export const publicReadings = [
  {
    slug: 'marxismo',
    title: 'Marxismo',
    summary: 'Uma tradição, muitas leituras: conceitos, pensadores e divergências.',
    path: readingPath('marxismo'),
  },
  {
    slug: 'liberalismo',
    title: 'Liberalismo',
    summary: 'Explore pessoas, ideias, obras e acontecimentos na leitura do liberalismo.',
    path: readingPath('liberalismo'),
  },
  {
    slug: 'social-democracia',
    title: 'Social-democracia',
    summary: 'Reformas, Estado de bem-estar e disputas com o socialismo e o liberalismo.',
    path: readingPath('social-democracia'),
  },
  {
    slug: 'anarquismo',
    title: 'Anarquismo',
    summary: 'Origens, correntes, experiências históricas e debates do anarquismo.',
    path: readingPath('anarquismo'),
  },
] as const;
