import { readingPath } from '@core/routing/reading-routes';

export interface LinkedReading {
  slug: string;
  title: string;
  path: string;
}

export interface LinkedItinerary {
  slug: string;
  title: string;
  path: string;
  kindLabel: string;
}

const READINGS_BY_SLUG: Readonly<Record<string, LinkedReading>> = {
  marxismo: { slug: 'marxismo', title: 'Marxismo', path: readingPath('marxismo') },
  liberalismo: { slug: 'liberalismo', title: 'Liberalismo', path: readingPath('liberalismo') },
  'social-democracia': {
    slug: 'social-democracia',
    title: 'Social-democracia',
    path: readingPath('social-democracia'),
  },
  anarquismo: { slug: 'anarquismo', title: 'Anarquismo', path: readingPath('anarquismo') },
  nazismo: { slug: 'nazismo', title: 'Nazismo', path: readingPath('nazismo') },
  stalinismo: { slug: 'stalinismo', title: 'Stalinismo', path: readingPath('stalinismo') },
  trabalhismo: { slug: 'trabalhismo', title: 'Trabalhismo', path: readingPath('trabalhismo') },
};

const ROOT_NODE_BY_READING: Readonly<Record<string, string>> = {
  marxismo: 'ideology-marxism',
  liberalismo: 'ideology-liberalism',
  'social-democracia': 'wiki-topic-social-democracia',
  anarquismo: 'wiki-topic-anarquismo',
  nazismo: 'wiki-topic-nazismo',
  stalinismo: 'wiki-topic-stalinismo',
  trabalhismo: 'wiki-topic-trabalhismo',
};

const READINGS_BY_ENTITY_ID: Readonly<Record<string, readonly string[]>> = {
  'ideology-marxism': ['marxismo'],
  'person-karl-marx': ['marxismo'],
  'person-friedrich-engels': ['marxismo'],
  'work-capital-volume-i': ['marxismo'],
  'work-communist-manifesto': ['marxismo'],
  'wiki-topic-o-capital': ['marxismo'],
  'ideology-liberalism': ['liberalismo'],
  'person-john-locke': ['liberalismo'],
  'person-adam-smith': ['liberalismo'],
  'person-john-stuart-mill': ['liberalismo'],
  'person-montesquieu': ['liberalismo'],
  'ideology-social-democracy': ['social-democracia'],
  'wiki-topic-social-democracia': ['social-democracia'],
  'ideology-anarchism': ['anarquismo'],
  'wiki-topic-anarquismo': ['anarquismo'],
  'person-mikhail-bakunin': ['anarquismo'],
  'wiki-topic-mikhail-bakunin': ['anarquismo'],
  'person-piotr-kropotkin': ['anarquismo'],
  'wiki-topic-piotr-kropotkin': ['anarquismo'],
  'wiki-topic-nazismo': ['nazismo'],
  'wiki-topic-adolf-hitler': ['nazismo'],
  'wiki-topic-stalinismo': ['stalinismo'],
  'person-joseph-stalin': ['stalinismo'],
  'wiki-topic-trabalhismo': ['trabalhismo'],
  'wiki-ideologia-trabalhismo-brasileiro': ['trabalhismo'],
  'wiki-topic-getulio-vargas': ['trabalhismo'],
  'wiki-topic-era-vargas': ['trabalhismo'],
  'wiki-topic-consolidacao-das-leis-do-trabalho': ['trabalhismo'],
};

const READINGS_BY_SLUG_PARAM: Readonly<Record<string, readonly string[]>> = {
  marxism: ['marxismo'],
  'karl-marx': ['marxismo'],
  'friedrich-engels': ['marxismo'],
  'o-capital-volume-i': ['marxismo'],
  'work-communist-manifesto': ['marxismo'],
  liberalism: ['liberalismo'],
  'john-locke': ['liberalismo'],
  'adam-smith': ['liberalismo'],
  'john-stuart-mill': ['liberalismo'],
  montesquieu: ['liberalismo'],
  'social-democracia': ['social-democracia'],
  anarquismo: ['anarquismo'],
  'mikhail-bakunin': ['anarquismo'],
  'piotr-kropotkin': ['anarquismo'],
  nazismo: ['nazismo'],
  'adolf-hitler': ['nazismo'],
  stalinismo: ['stalinismo'],
  'joseph-stalin': ['stalinismo'],
  trabalhismo: ['trabalhismo'],
  'trabalhismo-brasileiro': ['trabalhismo'],
  'getulio-vargas': ['trabalhismo'],
  'era-vargas': ['trabalhismo'],
};

const READINGS_BY_ATLAS_ID: Readonly<Record<string, readonly string[]>> = {
  'atlas-marxismo': ['marxismo'],
  'atlas-marx-valor': ['marxismo'],
  'atlas-karl-marx': ['marxismo'],
  'atlas-liberalismo': ['liberalismo'],
  'atlas-liberalism': ['liberalismo'],
  'atlas-adam-smith': ['liberalismo'],
  'atlas-social-democracia': ['social-democracia'],
  'atlas-anarquismo': ['anarquismo'],
  'atlas-nazismo': ['nazismo'],
  'atlas-stalinismo': ['stalinismo'],
  'atlas-trabalhismo': ['trabalhismo'],
  'atlas-era-vargas': ['trabalhismo'],
};

interface StaticItineraryEntry {
  slug: string;
  title: string;
  kindLabel: string;
  readingSlugs: readonly string[];
  entityIds: readonly string[];
  stopSlugs: readonly string[];
}

const ITINERARY_KIND_LABELS: Readonly<Record<string, string>> = {
  historico: 'Itinerário histórico',
  comparativo: 'Itinerário comparativo',
  conceitual: 'Itinerário conceitual',
  institucional: 'Itinerário institucional',
};

const PUBLISHED_ITINERARIES: readonly StaticItineraryEntry[] = [
  {
    slug: 'comparativo-liberdade',
    title: 'Liberalismo e socialismo: liberdade, propriedade e Estado',
    kindLabel: 'Itinerário comparativo',
    readingSlugs: ['liberalismo', 'marxismo', 'social-democracia', 'anarquismo'],
    entityIds: ['ideology-liberalism', 'person-adam-smith', 'person-karl-marx'],
    stopSlugs: ['liberalism', 'adam-smith', 'karl-marx'],
  },
  {
    slug: 'capitalismo-trabalho-e-industrializacao',
    title: 'Capitalismo, industrialização e movimento operário',
    kindLabel: 'Itinerário histórico',
    readingSlugs: ['marxismo', 'anarquismo'],
    entityIds: [
      'wiki-topic-capitalismo',
      'wiki-topic-industrializacao',
      'wiki-topic-greve-geral-de-1917',
      'wiki-topic-max-weber',
      'person-karl-marx',
    ],
    stopSlugs: ['capitalismo', 'industrializacao', 'greve-geral-de-1917', 'max-weber', 'karl-marx'],
  },
  {
    slug: 'constituicoes-e-republica-no-brasil',
    title: 'República, rupturas e Constituição de 1988 no Brasil',
    kindLabel: 'Itinerário institucional',
    readingSlugs: ['trabalhismo'],
    entityIds: [
      'wiki-topic-primeira-republica-brasileira',
      'wiki-topic-justica-do-trabalho',
      'wiki-topic-periodo-populista',
      'wiki-topic-golpe-de-estado-no-brasil-em-1964',
      'wiki-topic-constituicao-brasileira-de-1988',
      'wiki-topic-tenentismo',
      'wiki-topic-assembleia-nacional-constituinte-de-1987',
    ],
    stopSlugs: [
      'primeira-republica-brasileira',
      'justica-do-trabalho',
      'periodo-populista',
      'golpe-de-estado-no-brasil-em-1964',
      'constituicao-brasileira-de-1988',
      'tenentismo',
      'assembleia-nacional-constituinte-de-1987',
    ],
  },
  {
    slug: 'criticas-aos-autoritarismos',
    title: 'Totalitarismo, partido único e crítica pluralista',
    kindLabel: 'Itinerário conceitual',
    readingSlugs: ['nazismo', 'anarquismo', 'liberalismo'],
    entityIds: ['wiki-topic-totalitarismo', 'wiki-topic-esquerda-antistalinista'],
    stopSlugs: ['totalitarismo', 'esquerda-antistalinista'],
  },
  {
    slug: 'ditadura-militar-e-redemocratizacao',
    title: 'Ditadura Militar no Brasil (1964-1985): Da Repressão à Redemocratização',
    kindLabel: 'Itinerário histórico',
    readingSlugs: [],
    entityIds: [
      'wiki-topic-golpe-de-estado-no-brasil-em-1964',
      'wiki-topic-ditadura-militar-brasileira',
      'wiki-topic-humberto-castelo-branco',
      'wiki-topic-assembleia-nacional-constituinte-de-1987',
      'wiki-topic-dissidencia',
      'wiki-topic-comando-de-libertacao-nacional',
    ],
    stopSlugs: [
      'golpe-de-estado-no-brasil-em-1964',
      'ditadura-militar-brasileira',
      'humberto-castelo-branco',
      'assembleia-nacional-constituinte-de-1987',
      'dissidencia',
      'comando-de-libertacao-nacional',
    ],
  },
  {
    slug: 'estado-democracia-e-representacao',
    title: 'Estado Moderno: Soberania, Democracia e Republicanismo',
    kindLabel: 'Itinerário conceitual',
    readingSlugs: [],
    entityIds: [
      'wiki-topic-estado',
      'wiki-topic-soberania',
      'wiki-topic-democracia-representativa',
      'wiki-topic-republicanismo',
      'wiki-topic-separacao-de-poderes',
      'wiki-topic-federalismo',
    ],
    stopSlugs: [
      'estado',
      'soberania',
      'democracia-representativa',
      'republicanismo',
      'separacao-de-poderes',
      'federalismo',
    ],
  },
  {
    slug: 'guerra-fria-e-ordem-internacional',
    title: 'A Guerra Fria e o Mundo em Transformação',
    kindLabel: 'Itinerário histórico',
    readingSlugs: [],
    entityIds: [
      'wiki-topic-guerra-fria',
      'wiki-topic-organizacao-das-nacoes-unidas',
      'wiki-topic-aliados-da-segunda-guerra-mundial',
      'wiki-topic-ruptura-sino-sovietica',
      'wiki-topic-crise-de-suez',
      'wiki-topic-guerra-da-coreia',
    ],
    stopSlugs: [
      'guerra-fria',
      'organizacao-das-nacoes-unidas',
      'aliados-da-segunda-guerra-mundial',
      'ruptura-sino-sovietica',
      'crise-de-suez',
      'guerra-da-coreia',
    ],
  },
  {
    slug: 'socialismo-reforma-e-revolucao',
    title: 'Socialismo Revolucionário, Reformismo Social-Democrata e Autogestão Anarquista',
    kindLabel: 'Itinerário comparativo',
    readingSlugs: ['marxismo', 'social-democracia', 'anarquismo'],
    entityIds: [
      'wiki-topic-socialismo-revolucionario',
      'wiki-topic-reformismo-marxismo',
      'wiki-topic-anarcossindicalismo',
      'wiki-topic-socialismo-libertario',
      'wiki-topic-comunismo-de-conselhos',
      'wiki-topic-socialismo-democratico',
    ],
    stopSlugs: [
      'socialismo-revolucionario',
      'reformismo-marxismo',
      'anarcossindicalismo',
      'socialismo-libertario',
      'comunismo-de-conselhos',
      'socialismo-democratico',
    ],
  },
  {
    slug: 'trabalhismo-e-estado-social',
    title: 'Trabalhismo, Estado social e reformas no século XX',
    kindLabel: 'Itinerário histórico',
    readingSlugs: ['trabalhismo', 'social-democracia'],
    entityIds: [
      'wiki-topic-era-vargas',
      'wiki-topic-getulio-vargas',
      'wiki-topic-joao-goulart',
      'wiki-topic-john-maynard-keynes',
      'wiki-topic-leonel-brizola',
      'wiki-topic-trabalhismo',
      'wiki-ideologia-trabalhismo-brasileiro',
    ],
    stopSlugs: [
      'era-vargas',
      'getulio-vargas',
      'joao-goulart',
      'john-maynard-keynes',
      'leonel-brizola',
      'trabalhismo',
      'trabalhismo-brasileiro',
    ],
  },
];

export function readingRootNodeId(readingSlug: string): string | null {
  return ROOT_NODE_BY_READING[readingSlug] ?? null;
}

export function readingsForEntity(
  entityId: string,
  slug?: string,
  atlasId?: string | readonly string[],
): readonly LinkedReading[] {
  const atlasIds = Array.isArray(atlasId) ? atlasId : atlasId ? [atlasId] : [];
  const readingSlugs = new Set<string>([
    ...(READINGS_BY_ENTITY_ID[entityId] ?? []),
    ...(slug ? (READINGS_BY_SLUG_PARAM[slug] ?? []) : []),
    ...atlasIds.flatMap((id) => READINGS_BY_ATLAS_ID[id] ?? []),
  ]);
  return [...readingSlugs].flatMap((readingSlug) => {
    const reading = READINGS_BY_SLUG[readingSlug];
    return reading ? [reading] : [];
  });
}

function toLinkedItinerary(entry: {
  slug: string;
  title: string;
  kindLabel: string;
}): LinkedItinerary {
  return {
    slug: entry.slug,
    title: entry.title,
    path: `/itinerario/${entry.slug}`,
    kindLabel: entry.kindLabel,
  };
}

export function itinerariesForReading(readingSlug: string): readonly LinkedItinerary[] {
  if (!readingSlug) return [];
  return PUBLISHED_ITINERARIES.filter((item) => item.readingSlugs.includes(readingSlug)).map(
    toLinkedItinerary,
  );
}

interface RawDestination {
  type?: string;
  slug?: string;
  nodeId?: string;
}

interface RawStopOrBranch {
  contextEntityId?: string;
  destination?: RawDestination;
}

interface RawItineraryLike {
  slug?: string;
  title?: string;
  kind?: string;
  stops?: readonly RawStopOrBranch[];
  branches?: readonly RawStopOrBranch[];
}

export function itinerariesForEntity(
  entityId: string,
  slug?: string,
  bundledItineraries?: Readonly<Record<string, unknown>>,
): readonly LinkedItinerary[] {
  const bySlug = new Map<string, LinkedItinerary>();
  const matchesDynamic = (item: RawItineraryLike): boolean => {
    const nodes = [...(item.stops ?? []), ...(item.branches ?? [])];
    return nodes.some(
      (node) =>
        node.contextEntityId === entityId ||
        node.destination?.nodeId === entityId ||
        (slug !== undefined &&
          node.destination?.type === 'verbete' &&
          node.destination.slug === slug),
    );
  };

  if (bundledItineraries) {
    for (const raw of Object.values(bundledItineraries)) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as RawItineraryLike;
      if (!item.slug || !item.title || !matchesDynamic(item)) continue;
      bySlug.set(
        item.slug,
        toLinkedItinerary({
          slug: item.slug,
          title: item.title,
          kindLabel: ITINERARY_KIND_LABELS[item.kind ?? ''] ?? 'Itinerário',
        }),
      );
    }
  }

  for (const entry of PUBLISHED_ITINERARIES) {
    if (
      entry.entityIds.includes(entityId) ||
      (slug !== undefined && entry.stopSlugs.includes(slug))
    ) {
      if (!bySlug.has(entry.slug)) {
        bySlug.set(entry.slug, toLinkedItinerary(entry));
      }
    }
  }

  return [...bySlug.values()];
}
