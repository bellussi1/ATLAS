import { existsSync, readFileSync } from 'node:fs';

// Entities selected from Wikidata discovery (discovery/<tradição>.selection.json,
// produced by scripts/select-wikimedia.mjs). Curated base entries come first.
function discovered(slug) {
  const url = new URL(`./discovery/${slug}.selection.json`, import.meta.url);
  return existsSync(url) ? JSON.parse(readFileSync(url, 'utf8')).entities : [];
}
export const discoveredMarxismEntities = discovered('marxismo');

export const marxismBaseEntities = [
  ['ideology-marxism', 'Marxism', 'Marxism', 'ideology', 'Q7264'],
  ['person-karl-marx', 'Karl Marx', 'Karl Marx', 'person', 'Q9061'],
  ['person-friedrich-engels', 'Friedrich Engels', 'Friedrich Engels', 'person', 'Q34787'],
  ['person-vladimir-lenin', 'Vladimir Lenin', 'Vladimir Lenin', 'person', 'Q1394'],
  ['person-rosa-luxemburg', 'Rosa Luxemburg', 'Rosa Luxemburg', 'person', 'Q7231'],
  ['person-eduard-bernstein', 'Eduard Bernstein', 'Eduard Bernstein', 'person', 'Q75786'],
  ['person-karl-kautsky', 'Karl Kautsky', 'Karl Kautsky', 'person', 'Q76586'],
  ['person-antonio-gramsci', 'Antonio Gramsci', 'Antonio Gramsci', 'person', 'Q83003'],
  ['person-leon-trotsky', 'Leon Trotsky', 'Leon Trotsky', 'person', 'Q33391'],
  ['person-joseph-stalin', 'Joseph Stalin', 'Joseph Stalin', 'person', 'Q855'],
  ['person-mao-zedong', 'Mao Zedong', 'Mao Zedong', 'person', 'Q5816'],
  ['person-caio-prado-junior', 'Caio Prado Júnior', 'Caio Prado Júnior', 'person', 'Q1789931'],
  ['person-luiz-carlos-prestes', 'Luís Carlos Prestes', 'Luís Carlos Prestes', 'person', 'Q742047'],
  [
    'person-florestan-fernandes',
    'Florestan Fernandes',
    'Florestan Fernandes',
    'person',
    'Q2387448',
  ],
  [
    'person-jose-carlos-mariategui',
    'José Carlos Mariátegui',
    'José Carlos Mariátegui',
    'person',
    'Q335544',
  ],
  ['ideology-communism', 'Communism', 'Communism', 'ideology', 'Q6186'],
  ['ideology-socialism', 'Socialism', 'Socialism', 'ideology', 'Q7272'],
  [
    'concept-scientific-socialism',
    'Scientific socialism',
    'Scientific socialism',
    'concept',
    'Q865354',
  ],
  [
    'concept-historical-materialism',
    'Historical materialism',
    'Historical materialism',
    'concept',
    'Q190004',
  ],
  [
    'work-communist-manifesto',
    'The Communist Manifesto',
    'The Communist Manifesto',
    'work',
    'Q40591',
  ],
  ['event-paris-commune', 'Paris Commune', 'Paris Commune', 'event', 'Q133132'],
  ['event-russian-revolution', 'Russian Revolution', 'Russian Revolution', 'event', 'Q8729'],
  [
    'institution-second-international',
    'Second International',
    'Second International',
    'institution',
    'Q188592',
  ],
];

export const liberalismBaseEntities = [
  ['ideology-liberalism', 'liberalism', 'Liberalism', 'ideology', 'Q6216'],
  ['person-john-locke', 'John Locke', 'John Locke', 'person', 'Q9353'],
  ['person-adam-smith', 'Adam Smith', 'Adam Smith', 'person', 'Q9381'],
  ['person-john-stuart-mill', 'John Stuart Mill', 'John Stuart Mill', 'person', 'Q50020'],
  ['person-montesquieu', 'Charles-Louis de Secondat', 'Montesquieu', 'person', 'Q15975'],
  [
    'person-alexis-de-tocqueville',
    'Alexis de Tocqueville',
    'Alexis de Tocqueville',
    'person',
    'Q140694',
  ],
  ['person-friedrich-hayek', 'Friedrich Hayek', 'Friedrich Hayek', 'person', 'Q1325'],
  ['person-isaiah-berlin', 'Isaiah Berlin', 'Isaiah Berlin', 'person', 'Q205162'],
  [
    'ideology-classical-liberalism',
    'classical liberalism',
    'Classical liberalism',
    'ideology',
    'Q794394',
  ],
  ['ideology-social-liberalism', 'social liberalism', 'Social liberalism', 'ideology', 'Q201712'],
  ['ideology-neoliberalism', 'neoliberalism', 'Neoliberalism', 'ideology', 'Q162719'],
  ['event-glorious-revolution', 'Glorious Revolution', 'Glorious Revolution', 'event', 'Q189508'],
  ['event-american-revolution', 'American Revolution', 'American Revolution', 'event', 'Q192769'],
  ['event-french-revolution', 'French Revolution', 'French Revolution', 'event', 'Q6534'],
];
// Curated start of the social-democracy collection. Names in English are the Wikidata labels, used
// where the pt-BR label was not checked. Discovery adds the rest; Wikidata P1142/P737 are labels.
export const socialDemocracyBaseEntities = [
  ['ideology-social-democracy', 'Social-democracia', 'Social democracy', 'ideology', 'Q121254'],
  [
    'ideology-democratic-socialism',
    'Democratic socialism',
    'Democratic socialism',
    'ideology',
    'Q189280',
  ],
  [
    'institution-socialist-international',
    'Socialist International',
    'Socialist International',
    'institution',
    'Q159454',
  ],
  [
    'institution-party-of-european-socialists',
    'Party of European Socialists',
    'Party of European Socialists',
    'institution',
    'Q220945',
  ],
  [
    'institution-progressive-alliance-socialists-democrats',
    'Progressive Alliance of Socialists and Democrats',
    'Progressive Alliance of Socialists and Democrats',
    'institution',
    'Q507343',
  ],
  [
    'institution-spd',
    'Social Democratic Party of Germany',
    'Social Democratic Party of Germany',
    'institution',
    'Q49768',
  ],
  [
    'institution-swedish-social-democratic-party',
    'Swedish Social Democratic Party',
    'Swedish Social Democratic Party',
    'institution',
    'Q105112',
  ],
  [
    'institution-spo',
    'Social Democratic Party of Austria',
    'Social Democratic Party of Austria',
    'institution',
    'Q179111',
  ],
  [
    'institution-australian-labor-party',
    'Australian Labor Party',
    'Australian Labor Party',
    'institution',
    'Q216082',
  ],
  [
    'institution-psoe',
    'Spanish Socialist Workers Party',
    'Spanish Socialist Workers Party',
    'institution',
    'Q138198',
  ],
  ['concept-welfare-state', 'Welfare state', 'Welfare state', 'concept', 'Q192451'],
  ['person-ferdinand-lassalle', 'Ferdinand Lassalle', 'Ferdinand Lassalle', 'person', 'Q75784'],
  ['person-eduard-bernstein', 'Eduard Bernstein', 'Eduard Bernstein', 'person', 'Q75786'],
  ['person-jean-jaures', 'Jean Jaurès', 'Jean Jaurès', 'person', 'Q12688'],
  ['person-willy-brandt', 'Willy Brandt', 'Willy Brandt', 'person', 'Q2514'],
  ['person-olof-palme', 'Olof Palme', 'Olof Palme', 'person', 'Q53713'],
  ['person-bruno-kreisky', 'Bruno Kreisky', 'Bruno Kreisky', 'person', 'Q44517'],
];

/** Curated entries per configuration, which discovery never duplicates. */
export const baseEntities = {
  marxism: marxismBaseEntities,
  liberalism: liberalismBaseEntities,
  'social-democracy': socialDemocracyBaseEntities,
};

export const configurations = {
  liberalism: {
    id: 'atlas-liberalism',
    slug: 'atlas-liberalismo',
    title: 'Atlas do Liberalismo',
    description:
      'Rede exploratória de pessoas, correntes e acontecimentos ligados ao liberalismo; dados enciclopédicos importados aguardam revisão editorial humana.',
    mediaDirectory: 'liberalism',
    entities: [...liberalismBaseEntities, ...discovered('liberalismo')],
  },
  'social-democracy': {
    id: 'atlas-social-democracia',
    slug: 'social-democracia',
    title: 'Atlas da Social-democracia',
    description:
      'Rede exploratória de pessoas, correntes e políticas ligadas à social-democracia; dados enciclopédicos importados aguardam revisão editorial humana. Rótulos do Wikidata (P1142, P737) não comprovam pertencimento nem influência.',
    mediaDirectory: 'social-democracy',
    entities: [...socialDemocracyBaseEntities, ...discovered('social-democracia')],
  },
  marxism: {
    id: 'atlas-marx-valor',
    slug: 'marxismo-e-economia-politica',
    title: 'Atlas de Marxismo e Comunismo',
    description:
      'Rede exploratória de autores e tradições; dados Wikimedia são camadas de descoberta e estrutura, com revisão editorial humana pendente.',
    mediaDirectory: 'marxism',
    entities: [...marxismBaseEntities, ...discoveredMarxismEntities],
  },
};
