import { editorialStatusLabel } from '@core/content/editorial/editorial-status';
import type { ContextConnection, KnowledgeContext } from '@core/content/models/knowledge-context';

/**
 * Separates what the reader reads from what the record says about itself. Published records
 * still mix both in `context`; the process notes become a seal and the sources area, and only
 * the prose reaches the text. The voice is described in docs/design/GUIA-DE-VOZ.md.
 */
const PROCESS_NOTE = [
  /\bwikip[eé]dia\b/i,
  /\bwikidata\b/i,
  /\bwikimedia\b/i,
  /rascunho assistido/i,
  /extra[ií]do por ia/i,
  /revis[aã]o humana n[aã]o registrada/i,
  /revis[aã]o editorial pendente/i,
  /(leitura|cobertura) parcial/i,
  /fontes adicionais/i,
  /mapeado da declara[cç][aã]o/i,
  /declara[cç][aã]o estruturada/i,
  /caminhos de navega[cç][aã]o/i,
  /cat[aá]logo colaborativo/i,
  /s[ií]ntese de fonte enciclop[eé]dica/i,
];
const SENTENCE_BREAK = /(?<=[.!?…])\s+(?=[\p{Lu}“"(])/u;
const AI_ASSISTED_SOURCE = /assistida por ia/i;
const PARTIAL_COVERAGE = /(leitura|cobertura) parcial/i;
const CATALOGUE_LOCATOR = /^Q\d+\b.*\bP\d+\b/;

/** The reader's part of a text, or null when it only describes how the record was made. */
export function readerProse(text: string | null | undefined): string | null {
  const prose = (text ?? '')
    .split(SENTENCE_BREAK)
    .filter((sentence) => !PROCESS_NOTE.some((note) => note.test(sentence)))
    .join(' ')
    .trim();
  return prose || null;
}

export const hasPartialCoverage = (text: string | null | undefined): boolean =>
  PARTIAL_COVERAGE.test(text ?? '');

export const isAiAssisted = (sources: readonly { edition?: string | null }[]): boolean =>
  sources.some((source) => AI_ASSISTED_SOURCE.test(source.edition ?? ''));

/** Editorial state as a seal, outside the running text. Never implies a review that is not recorded. */
export function editorialSeal(
  record: Pick<KnowledgeContext, 'editorialStatus' | 'aiAssisted' | 'partialCoverage'>,
): string {
  const state =
    record.aiAssisted && record.editorialStatus === 'pending'
      ? 'Inclui síntese por IA · revisão humana não registrada'
      : editorialStatusLabel(record.editorialStatus);
  return record.partialCoverage ? `${state} · cobertura parcial` : state;
}

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/** `2026-11-03` as "3 de novembro de 2026"; anything else is returned as written. */
export function readerDate(iso: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!match) return iso ?? '';
  return `${Number(match[3])} de ${MONTHS[Number(match[2]) - 1]} de ${match[1]}`;
}

export type RelationTier = 'documented' | 'editorial' | 'classified' | 'lead' | 'cited';

export interface RelationEvidence {
  id: string;
  /** Literal excerpt of the source, shown as a quotation. */
  quote: string | null;
  /** Where in the source, or when it was consulted. */
  locator: string | null;
  title: string;
  url: string | null;
}

export interface RelationReading {
  tier: Exclude<RelationTier, 'cited'>;
  /** What kind of link it is, in the reader's words. */
  nature: string;
  /** The verb phrase between the two records, oriented from the record being read. */
  predicate: string;
  /** Uncertainty and review state; empty where the group already says it. */
  meta: string;
  prose: string | null;
  evidence: RelationEvidence[];
}

type Relation = NonNullable<ContextConnection['relation']>;

const NATURE: Partial<Record<Relation['type'], string>> = {
  influence: 'Influência',
  influenced: 'Influência',
  influenced_by: 'Influência',
  reacted_against: 'Reação ou divergência',
  developed_into: 'Desenvolvimento',
  participated_in: 'Participação',
  wrote: 'Autoria',
  authored: 'Autoria',
  'causal-claim': 'Alegação causal',
  event_influenced_ideology: 'Influência de acontecimento',
  associated_with: 'Associação',
  related_to: 'Classificação',
  'documented-association': 'Associação documentada',
};
const UNCERTAINTY: Record<Relation['uncertainty'], string> = {
  low: 'incerteza baixa',
  moderate: 'incerteza moderada',
  high: 'incerteza alta',
  unknown: 'incerteza não avaliada',
};
const SOURCE_NAME: Record<NonNullable<Relation['provenance']>['source'], string> = {
  wikipedia: 'Wikipédia',
  wikidata: 'Wikidata',
};

function tierOf(relation: Relation): RelationReading['tier'] {
  if (relation.type === 'encyclopedic-link') return 'lead';
  if (relation.type === 'editorial-link') return 'editorial';
  if (relation.provenance?.source === 'wikidata' || relation.type === 'associated_with')
    return 'classified';
  return 'documented';
}

/** A published relation label without the catalogue's name or property codes; the source stays cited. */
export function readerPredicate(label: string): string {
  if (/link de descoberta/i.test(label))
    return /^mencionado/i.test(label) ? 'é referido por' : 'remete a';
  return label
    .replace(/\s*\(afirmação estruturada no Wikidata\)/i, '')
    .replace(/\s*\(P\d+\)/g, '')
    .replace(/\s+n[oa] (Wikidata|Wikip[eé]dia)/gi, '')
    .trim();
}

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

function evidenceOf(relation: Relation): RelationEvidence[] {
  const quoted = relation.provenance?.source === 'wikipedia';
  const evidence = relation.references.map((reference) => ({
    id: reference.id,
    quote: quoted ? reference.locator : null,
    locator: quoted || CATALOGUE_LOCATOR.test(reference.locator) ? null : reference.locator,
    title: reference.source.title,
    url: reference.source.url,
  }));
  if (evidence.length || !relation.provenance) return evidence;
  return [
    {
      id: relation.provenance.url,
      quote: null,
      locator: `consulta em ${readerDate(relation.provenance.retrievedAt)}`,
      title: SOURCE_NAME[relation.provenance.source],
      url: relation.provenance.url,
    },
  ];
}

export function relationReading(relation: Relation): RelationReading {
  const tier = tierOf(relation);
  return {
    tier,
    nature: NATURE[relation.type] ?? 'Relação registrada',
    predicate: readerPredicate(relation.label),
    meta:
      tier === 'lead'
        ? ''
        : [
            UNCERTAINTY[relation.uncertainty],
            relation.editorialStatus && lowerFirst(editorialStatusLabel(relation.editorialStatus)),
          ]
            .filter(Boolean)
            .join(' · '),
    prose: readerProse(relation.context),
    evidence: evidenceOf(relation),
  };
}

export interface RelationGroup {
  tier: RelationTier;
  title: string;
  /** What this kind of link does and does not prove. */
  hint: string | null;
  /** Closed at first, so the links with evidence are read first. */
  collapsed: boolean;
  items: { connection: ContextConnection; reading: RelationReading | null }[];
}

const GROUPS: Record<RelationTier, { title: string; hint: string | null }> = {
  documented: { title: 'Relações documentadas', hint: null },
  editorial: {
    title: 'Vínculos editoriais',
    hint: 'Aproximações feitas para orientar a leitura. Não indicam influência histórica.',
  },
  classified: {
    title: 'Classificações de catálogo',
    hint: 'Dados de um catálogo colaborativo. Indicam associação e não documentam influência.',
  },
  lead: {
    title: 'Pistas de leitura',
    hint: 'Ligações entre verbetes de consulta. Ajudam a explorar e não comprovam influência.',
  },
  cited: { title: 'Registros citados', hint: null },
};
const TIER_ORDER: RelationTier[] = ['documented', 'cited', 'editorial', 'classified', 'lead'];

/** Connections by weight of evidence: what is documented first, reading leads last. */
export function relationGroups(connections: readonly ContextConnection[]): RelationGroup[] {
  const items = connections.map((connection) => {
    const reading = connection.relation ? relationReading(connection.relation) : null;
    return { connection, reading, tier: reading?.tier ?? ('cited' as const) };
  });
  return TIER_ORDER.flatMap((tier) => {
    const members = items.filter((item) => item.tier === tier);
    if (!members.length) return [];
    return [
      {
        tier,
        ...GROUPS[tier],
        collapsed: tier === 'lead' && members.length < items.length,
        items: members.map(({ connection, reading }) => ({ connection, reading })),
      },
    ];
  });
}
