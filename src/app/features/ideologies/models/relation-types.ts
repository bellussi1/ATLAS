import type { IdeologyEdge } from './ideology-page.schema';

export type RelationType = IdeologyEdge['type'];

/**
 * Reader-facing vocabulary for graph lines. `historical` separates documented links
 * between people and texts from analytic or discovery links; none implies causation.
 */
export const relationTypes: Record<
  RelationType,
  {
    label: string;
    short: string;
    verb: string;
    meaning: string;
    historical: boolean;
    line: 'solid' | 'dashed' | 'dotted';
  }
> = {
  'influencia-documentada': {
    label: 'Influência documentada',
    short: 'Influência',
    verb: 'influencia',
    meaning: 'Uma fonte registra que um autor leu, citou ou retomou o outro.',
    historical: true,
    line: 'solid',
  },
  desenvolvimento: {
    label: 'Desenvolvimento',
    short: 'Desenvolvimento',
    verb: 'contribui para o desenvolvimento de',
    meaning:
      'Um autor transforma ou amplia uma formulação anterior; não é cópia nem herança direta.',
    historical: true,
    line: 'solid',
  },
  continuidade: {
    label: 'Continuidade',
    short: 'Continuidade',
    verb: 'tem continuidade em',
    meaning: 'Uma fonte aponta permanência de um problema ou programa entre os dois.',
    historical: true,
    line: 'solid',
  },
  'divergencia-ou-critica': {
    label: 'Crítica ou divergência',
    short: 'Crítica',
    verb: 'critica',
    meaning: 'Um autor contesta explicitamente o outro; a linha não diz quem tem razão.',
    historical: true,
    line: 'dashed',
  },
  'associacao-tematica': {
    label: 'Associação temática',
    short: 'Associação',
    verb: 'associa-se a',
    meaning: 'Os dois tratam de um mesmo tema; não há contato histórico registrado.',
    historical: false,
    line: 'dotted',
  },
  'descoberta-enciclopedica': {
    label: 'Link de descoberta',
    short: 'Descoberta',
    verb: 'liga-se a',
    meaning:
      'Ligação vinda de enciclopédias abertas, útil para explorar, sem validação historiográfica.',
    historical: false,
    line: 'dotted',
  },
};

/**
 * Reads an edge as a sentence between its two records. Labels written as a verb phrase
 * (lowercase, e.g. "critica o programa de reformas de") are the predicate itself; labels
 * written as a topic (capitalised, e.g. "Separação dos poderes") are shown as the subject
 * of the link, with the verb taken from the relation type.
 */
export function relationSentence(edge: Pick<IdeologyEdge, 'type' | 'label'>): {
  predicate: string;
  topic: string | null;
} {
  const label = edge.label.trim();
  const isPredicate = label !== '' && label === label.charAt(0).toLowerCase() + label.slice(1);
  return isPredicate
    ? { predicate: label, topic: null }
    : { predicate: relationTypes[edge.type].verb, topic: label || null };
}
