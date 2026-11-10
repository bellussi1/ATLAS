import type { IdeologyPage } from '@ideologies/models/ideology-page.schema';
import type { MosaicPalette } from '@shared/ui/geometric-mosaic/mosaic-tiles';

/** How another reading relates to the one just finished. */
export type ReadingRelation = 'contraste' | 'continuidade' | 'divergencia' | 'aprofundamento';

/** Reader-facing name of each relation; the card says why the path belongs here. */
export const readingRelationLabels: Readonly<Record<ReadingRelation, string>> = {
  contraste: 'Contraste',
  continuidade: 'Continuidade',
  divergencia: 'Divergência',
  aprofundamento: 'Aprofundamento',
};

/** One curated path to another continuous reading, with the reason it is worth following. */
export interface ReadingConnection {
  slug: string;
  /** Kind of relation the target has with the reading that closes. */
  relation: ReadingRelation;
  /** A question the target helps answer, not a summary of the other tradition. */
  question: string;
  reason: string;
  /** The card that receives the wider composition; one per reading. */
  lead?: boolean;
  /** Licensed image attached to the target; resolved from the graph, never a repeated portrait. */
  imageEntityId?: string;
}

export interface IdeologyReading {
  slug: string;
  label: string;
  metaDescription: string;
  /** Palette used by the closing cards and the geometric fallback. */
  palette: MosaicPalette;
  /** Three to five curated neighbours, each with its relation and reason. */
  connections: readonly ReadingConnection[];
}

export interface ResolvedReadingConnection extends ReadingConnection {
  label: string;
}

/**
 * Public readings. Publishing a reading adds one entry here and one in `published-ideologies.ts`;
 * the closing cards read the curated paths below, never the position of the reading in this list.
 */
export const ideologyReadings: readonly IdeologyReading[] = [
  {
    slug: 'marxismo',
    label: 'Marxismo',
    metaDescription: 'Conceitos, pensadores, cronologia, divergências e fontes do marxismo.',
    palette: 'marx',
    connections: [
      {
        slug: 'liberalismo',
        relation: 'contraste',
        lead: true,
        question: 'O que separa a crítica da propriedade da defesa da liberdade individual?',
        reason:
          'Compara a crítica da propriedade e do mercado com a defesa liberal da liberdade individual.',
        imageEntityId: 'ideology-liberalism',
      },
      {
        slug: 'anarquismo',
        relation: 'divergencia',
        question:
          'Por que duas críticas ao Estado chegam a respostas opostas sobre o partido e a revolução?',
        reason: 'Confronta duas respostas socialistas sobre o Estado, o partido e a revolução.',
        imageEntityId: 'wiki-topic-sindicato',
      },
      {
        slug: 'social-democracia',
        relation: 'continuidade',
        question: 'O que muda quando a disputa socialista passa pela urna?',
        reason: 'Segue a disputa entre reforma e revolução dentro da tradição socialista.',
        imageEntityId: 'wiki-topic-grande-depressao',
      },
    ],
  },
  {
    slug: 'liberalismo',
    label: 'Liberalismo',
    metaDescription:
      'Conceitos, pensadores, épocas, lugares, vertentes, críticas e fontes do liberalismo.',
    palette: 'liberal',
    connections: [
      {
        slug: 'marxismo',
        relation: 'contraste',
        lead: true,
        question: 'A liberdade formal basta para enfrentar a desigualdade material?',
        reason: 'Examina a crítica socialista à liberdade formal e à propriedade privada.',
        imageEntityId: 'work-communist-manifesto',
      },
      {
        slug: 'social-democracia',
        relation: 'aprofundamento',
        question: 'Como direitos sociais e intervenção estatal reformulam o programa liberal?',
        reason: 'Mostra como direitos sociais e intervenção estatal reformulam o programa liberal.',
        imageEntityId: 'wiki-topic-grande-depressao',
      },
      {
        slug: 'anarquismo',
        relation: 'contraste',
        question:
          'Onde termina a limitação do Estado e começa a recusa de toda autoridade estatal?',
        reason:
          'Contrasta a limitação do Estado com a recusa anarquista de toda autoridade estatal.',
        imageEntityId: 'wiki-topic-sindicato',
      },
    ],
  },
  {
    slug: 'social-democracia',
    label: 'Social-democracia',
    metaDescription:
      'Reformas, Estado de bem-estar e disputas da social-democracia com o socialismo e o liberalismo.',
    palette: 'social-democracia',
    connections: [
      {
        slug: 'marxismo',
        relation: 'divergencia',
        lead: true,
        question: 'Reforma e revolução ainda dividem a tradição socialista?',
        reason:
          'Recupera a polêmica revisionista sobre reformas, revolução e organização da classe.',
        imageEntityId: 'work-communist-manifesto',
      },
      {
        slug: 'liberalismo',
        relation: 'contraste',
        question: 'O Estado de bem-estar cabe na tradição de limitação do poder?',
        reason: 'Compara o Estado de bem-estar com a tradição liberal de limitação do poder.',
        imageEntityId: 'ideology-liberalism',
      },
      {
        slug: 'anarquismo',
        relation: 'divergencia',
        question: 'A via eleitoral e sindical responde à recusa anarquista do Estado?',
        reason: 'Confronta a estratégia eleitoral e sindical com a recusa anarquista do Estado.',
        imageEntityId: 'wiki-topic-sindicato',
      },
    ],
  },
  {
    slug: 'anarquismo',
    label: 'Anarquismo',
    metaDescription: 'Origens, correntes, experiências históricas e debates do anarquismo.',
    palette: 'anarquismo',
    connections: [
      {
        slug: 'marxismo',
        relation: 'divergencia',
        lead: true,
        question:
          'O que a ruptura com Marx revela sobre Estado, partido e ditadura do proletariado?',
        reason:
          'Retoma a ruptura entre Bakunin e Marx sobre Estado, partido e ditadura do proletariado.',
        imageEntityId: 'work-communist-manifesto',
      },
      {
        slug: 'social-democracia',
        relation: 'contraste',
        question: 'Ação direta e autogestão contra a via parlamentar e o Estado social?',
        reason: 'Contrasta a ação direta e a autogestão com a via parlamentar e o Estado social.',
        imageEntityId: 'wiki-topic-grande-depressao',
      },
      {
        slug: 'liberalismo',
        relation: 'contraste',
        question: 'Liberdade anarquista e liberdade liberal partem do mesmo problema da coerção?',
        reason: 'Distingue a liberdade anarquista da liberdade liberal e do problema da coerção.',
        imageEntityId: 'ideology-liberalism',
      },
    ],
  },
  {
    slug: 'nazismo',
    label: 'Nazismo',
    metaDescription:
      'Ideologia e regime nacional-socialista: origens, ideias, pessoas, experiências e críticas.',
    palette: 'fascismo',
    connections: [
      {
        slug: 'liberalismo',
        relation: 'contraste',
        lead: true,
        question: 'O que o nazismo rejeita na democracia liberal e no pluralismo?',
        reason: 'Confronta a recusa nazista da democracia liberal com a tradição liberal.',
      },
      {
        slug: 'stalinismo',
        relation: 'divergencia',
        question: 'O que separa dois regimes autoritários do século XX?',
        reason: 'Distingue projetos, bases sociais e inimigos dos dois regimes.',
      },
      {
        slug: 'social-democracia',
        relation: 'contraste',
        question: 'Como a social-democracia resistiu ao avanço nazista?',
        reason: 'Situa a resistência social-democrata diante da destruição do regime.',
      },
    ],
  },
  {
    slug: 'stalinismo',
    label: 'Stalinismo',
    metaDescription:
      'Ideologia e políticas de Stalin na URSS: industrialização, repressão, vertentes e legado.',
    palette: 'marx',
    connections: [
      {
        slug: 'marxismo',
        relation: 'continuidade',
        lead: true,
        question: 'Como o stalinismo se apresenta como herdeiro do marxismo?',
        reason: 'Segue a disputa sobre o que o marxismo deveria ser depois de Lenin.',
      },
      {
        slug: 'nazismo',
        relation: 'contraste',
        question: 'O que aproxima e o que separa stalinismo e nazismo?',
        reason: 'Compara dois regimes autoritários com projetos e inimigos distintos.',
      },
      {
        slug: 'anarquismo',
        relation: 'divergencia',
        question: 'Por que a crítica anarquista ao Estado atinge o stalinismo?',
        reason: 'Confronta a crítica libertária com a centralização stalinista.',
      },
    ],
  },
  {
    slug: 'trabalhismo',
    label: 'Trabalhismo',
    metaDescription:
      'Tradição política brasileira: Vargas, PTB, legislação trabalhista, sindicatos e legado.',
    palette: 'social-democracia',
    connections: [
      {
        slug: 'social-democracia',
        relation: 'continuidade',
        lead: true,
        question: 'O que o trabalhismo compartilha com a social-democracia?',
        reason: 'Aproxima a aposta no Estado social e nos direitos do trabalho.',
      },
      {
        slug: 'marxismo',
        relation: 'aprofundamento',
        question: 'Por que o trabalhismo não se confunde com o socialismo?',
        reason: 'Distingue a integração da classe trabalhadora ao Estado do projeto socialista.',
      },
      {
        slug: 'liberalismo',
        relation: 'contraste',
        question: 'Como o trabalhismo disputa a agenda liberal no Brasil?',
        reason: 'Contrasta a centralidade do Estado social com a agenda liberal.',
      },
    ],
  },
];

const readingBySlug = new Map(ideologyReadings.map((reading) => [reading.slug, reading]));

export function readingOf(slug: string): IdeologyReading | undefined {
  return readingBySlug.get(slug);
}

/** Palette of a published reading, used by the closing cards before the target dossier loads. */
export function readingPalette(slug: string): MosaicPalette {
  return readingBySlug.get(slug)?.palette ?? 'atlas';
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
export function paletteOf(page: IdeologyPage): MosaicPalette {
  return page.identity.palette ?? readingPalette(page.slug);
}

/**
 * The reading that leads the closing composition: selected by the curated `lead` flag, never by
 * the position of the target in `ideologyReadings`.
 */
export function companionOf(slug: string): ResolvedReadingConnection | null {
  const connections = connectionsOf(slug);
  return connections.find((connection) => connection.lead) ?? connections[0] ?? null;
}
