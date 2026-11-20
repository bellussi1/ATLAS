import { readingRegistry } from '@core/content/editorial/public-readings';
import { catalogueUrl, explorerCatalogues } from '@core/content/queries/explorer-catalogues';
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

/** Title lookups the destination label needs from the graph; both optional. */
export interface DestinationTitleLookup {
  entityTitleBySlug?: ReadonlyMap<string, string>;
  entityTitleById?: ReadonlyMap<string, string>;
}

/**
 * Human title of a destination ("Trabalhismo", "Getúlio Vargas", "Pessoas"), from the reading
 * registry, the catalogue list or the graph; falls back to the kind label, never to a raw slug.
 */
export function itineraryDestinationTitle(
  destination: ItineraryDestination,
  lookup: DestinationTitleLookup = {},
): string {
  switch (destination.type) {
    case 'leitura':
    case 'roteiro':
      return (
        readingRegistry.find((entry) => entry.slug === destination.slug)?.title ??
        resolveItineraryDestination(destination).kindLabel
      );
    case 'verbete':
      return lookup.entityTitleBySlug?.get(destination.slug) ?? 'Verbete';
    case 'grafo': {
      const node = destination.nodeId ? lookup.entityTitleById?.get(destination.nodeId) : undefined;
      return node ? `Relações de ${node}` : 'Grafo de relações';
    }
    case 'catalogo': {
      const normalized = destination.path.replace(/^\/?acervo\/?/, '') || 'acervo';
      return explorerCatalogues.find((entry) => entry.path === normalized)?.title ?? 'Catálogo';
    }
  }
}
