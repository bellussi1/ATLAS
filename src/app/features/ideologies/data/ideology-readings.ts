import type { IdeologyPage } from '@ideologies/models/ideology-page.schema';
import type { MosaicPalette } from '@shared/ui/geometric-mosaic/mosaic-tiles';

/** One curated path to another continuous reading, with the reason it is worth following. */
export interface ReadingConnection {
  slug: string;
  reason: string;
}

export interface IdeologyReading {
  slug: string;
  label: string;
  metaDescription: string;
  /** At most five curated neighbours; the reading page shows them after the last chapter. */
  connections: readonly ReadingConnection[];
}

export interface ResolvedReadingConnection extends ReadingConnection {
  label: string;
}

/**
 * Public readings, in reading order: routes and the "next reading" link derive from this list.
 * Publishing a reading adds one entry here and one in `published-ideologies.ts`.
 */
export const ideologyReadings: readonly IdeologyReading[] = [
  {
    slug: 'marxismo',
    label: 'Marxismo',
    metaDescription: 'Conceitos, pensadores, cronologia, divergências e fontes do marxismo.',
    connections: [
      {
        slug: 'liberalismo',
        reason:
          'Compara a crítica da propriedade e do mercado com a defesa liberal da liberdade individual.',
      },
      {
        slug: 'anarquismo',
        reason: 'Confronta duas respostas socialistas sobre o Estado, o partido e a revolução.',
      },
      {
        slug: 'social-democracia',
        reason: 'Segue a disputa entre reforma e revolução dentro da tradição socialista.',
      },
    ],
  },
  {
    slug: 'liberalismo',
    label: 'Liberalismo',
    metaDescription:
      'Conceitos, pensadores, épocas, lugares, vertentes, críticas e fontes do liberalismo.',
    connections: [
      {
        slug: 'marxismo',
        reason: 'Examina a crítica socialista à liberdade formal e à propriedade privada.',
      },
      {
        slug: 'social-democracia',
        reason: 'Mostra como direitos sociais e intervenção estatal reformulam o programa liberal.',
      },
      {
        slug: 'anarquismo',
        reason:
          'Contrasta a limitação do Estado com a recusa anarquista de toda autoridade estatal.',
      },
    ],
  },
  {
    slug: 'social-democracia',
    label: 'Social-democracia',
    metaDescription:
      'Reformas, Estado de bem-estar e disputas da social-democracia com o socialismo e o liberalismo.',
    connections: [
      {
        slug: 'marxismo',
        reason:
          'Recupera a polêmica revisionista sobre reformas, revolução e organização da classe.',
      },
      {
        slug: 'liberalismo',
        reason: 'Compara o Estado de bem-estar com a tradição liberal de limitação do poder.',
      },
      {
        slug: 'anarquismo',
        reason: 'Confronta a estratégia eleitoral e sindical com a recusa anarquista do Estado.',
      },
    ],
  },
  {
    slug: 'anarquismo',
    label: 'Anarquismo',
    metaDescription: 'Origens, correntes, experiências históricas e debates do anarquismo.',
    connections: [
      {
        slug: 'marxismo',
        reason:
          'Retoma a ruptura entre Bakunin e Marx sobre Estado, partido e ditadura do proletariado.',
      },
      {
        slug: 'social-democracia',
        reason: 'Contrasta a ação direta e a autogestão com a via parlamentar e o Estado social.',
      },
      {
        slug: 'liberalismo',
        reason: 'Distingue a liberdade anarquista da liberdade liberal e do problema da coerção.',
      },
    ],
  },
];

const readingBySlug = new Map(ideologyReadings.map((reading) => [reading.slug, reading]));

export function readingOf(slug: string): IdeologyReading | undefined {
  return readingBySlug.get(slug);
}

/** Resolves only published targets, keeps the curated order and caps the list at five. */
export function connectionsOf(slug: string): ResolvedReadingConnection[] {
  const reading = readingBySlug.get(slug);
  if (!reading) return [];
  return reading.connections
    .flatMap((connection) => {
      const target = readingBySlug.get(connection.slug);
      return target && target.slug !== slug ? [{ ...connection, label: target.label }] : [];
    })
    .slice(0, 5);
}

/** Palette of snapshots released before `identity.palette` existed. */
const releasedPalettes: Readonly<Record<string, MosaicPalette | undefined>> = {
  marxismo: 'marx',
  liberalismo: 'liberal',
  'social-democracia': 'social-democracia',
  anarquismo: 'anarquismo',
};

export function paletteOf(page: IdeologyPage): MosaicPalette {
  return page.identity.palette ?? releasedPalettes[page.slug] ?? 'atlas';
}

/** The reading after this one, wrapping around; none when it is the only one published. */
export function companionOf(slug: string): IdeologyReading | null {
  const index = ideologyReadings.findIndex((reading) => reading.slug === slug);
  const next = ideologyReadings[(index + 1) % ideologyReadings.length];
  return next && next.slug !== slug ? next : null;
}
