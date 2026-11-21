export type TourId =
  'leituras' | 'leitura' | 'itinerarios' | 'itinerario' | 'acervo' | 'mapa' | 'grafo';

export interface TourStep {
  /** CSS selector of the thing being explained; a step whose target is absent or hidden is skipped. */
  readonly selector: string;
  readonly title: string;
  /** Plain prose: what it is and what to do with it. */
  readonly body: string;
  readonly side?: 'top' | 'bottom' | 'left' | 'right';
  /**
   * Control that opens the target when it is folded away (a drawer on a phone). It is clicked before
   * the tour starts and the tour folds it again at the end.
   */
  readonly reveal?: string;
  /** The target fills the screen (the globe, the network): explain it in a centred card, no spotlight. */
  readonly centered?: boolean;
}

export interface TourDefinition {
  readonly id: TourId;
  /** Where the reader is, as the invitation says it ("nas leituras"). */
  readonly page: string;
  readonly steps: readonly TourStep[];
}
