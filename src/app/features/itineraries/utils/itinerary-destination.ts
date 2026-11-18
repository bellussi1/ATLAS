import { catalogueUrl } from '@core/content/queries/explorer-catalogues';
import { readingPath } from '@core/routing/reading-routes';
import type { ItineraryDestination } from '@itineraries/models/itinerary.schema';

export interface ResolvedDestination {
  commands: string[];
  queryParams?: Record<string, string>;
  fragment?: string;
  kindLabel: string;
}

/** Maps a typed itinerary destination into Angular Router link arguments and an accessible label. */
export function resolveItineraryDestination(
  destination: ItineraryDestination,
): ResolvedDestination {
  switch (destination.type) {
    case 'leitura':
      return {
        commands: [readingPath(destination.slug)],
        fragment: destination.anchor,
        kindLabel: 'Leitura contínua',
      };
    case 'verbete':
      return {
        commands: ['/verbete', destination.slug],
        fragment: destination.anchor,
        kindLabel: 'Verbete',
      };
    case 'grafo':
      return {
        commands: ['/grafos'],
        queryParams: destination.nodeId ? { no: destination.nodeId } : undefined,
        kindLabel: 'Mapa de relações',
      };
    case 'catalogo': {
      const normalized = destination.path.replace(/^\/?acervo\/?/, '') || 'acervo';
      return {
        commands: [catalogueUrl(normalized)],
        queryParams: destination.query ? { q: destination.query } : undefined,
        kindLabel: 'Catálogo',
      };
    }
    case 'roteiro':
      return {
        commands: [readingPath(destination.slug)],
        kindLabel: 'Roteiro',
      };
  }
}
