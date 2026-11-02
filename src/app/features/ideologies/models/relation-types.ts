import type { IdeologyEdge } from './ideology-page.schema';

export type RelationType = IdeologyEdge['type'];

/**
 * Reader-facing vocabulary for graph lines. `historical` separates documented links
 * between people and texts from analytic or discovery links; none implies causation.
 */
export const relationTypes: Record<
  RelationType,
  { label: string; meaning: string; historical: boolean; line: 'solid' | 'dashed' | 'dotted' }
> = {
  'influencia-documentada': {
    label: 'Influência documentada',
    meaning: 'Uma fonte registra que um autor leu, citou ou retomou o outro.',
    historical: true,
    line: 'solid',
  },
  desenvolvimento: {
    label: 'Desenvolvimento',
    meaning:
      'Um autor transforma ou amplia uma formulação anterior; não é cópia nem herança direta.',
    historical: true,
    line: 'solid',
  },
  continuidade: {
    label: 'Continuidade',
    meaning: 'Uma fonte aponta permanência de um problema ou programa entre os dois.',
    historical: true,
    line: 'solid',
  },
  'divergencia-ou-critica': {
    label: 'Crítica ou divergência',
    meaning: 'Um autor contesta explicitamente o outro; a linha não diz quem tem razão.',
    historical: true,
    line: 'dashed',
  },
  'associacao-tematica': {
    label: 'Associação temática',
    meaning: 'Os dois tratam de um mesmo tema; não há contato histórico registrado.',
    historical: false,
    line: 'dotted',
  },
  'descoberta-enciclopedica': {
    label: 'Link de descoberta',
    meaning:
      'Ligação vinda de enciclopédias abertas, útil para explorar, sem validação historiográfica.',
    historical: false,
    line: 'dotted',
  },
};
