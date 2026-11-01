import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import type { Atlas, Entity, KnowledgeGraph } from '@core/content/models/content-schema';
import { knowledgeGraphSchema } from '@core/content/models/content-schema';
import { buildDiscoveryIndex } from '@core/content/queries/discovery-index';
import type {
  KnowledgeEntityQuery,
  KnowledgeRelationQuery,
} from '@core/content/queries/knowledge-graph';
import {
  queryKnowledgeEntities,
  queryKnowledgeRelations,
} from '@core/content/queries/knowledge-graph';
import { map, type Observable, of, shareReplay } from 'rxjs';

import methodologyAtlasData from '../../../../content/atlas.json';

export const methodologyKnowledgeGraph = knowledgeGraphSchema.parse(methodologyAtlasData);
export const methodologyAtlas = methodologyKnowledgeGraph.atlases[0];

@Injectable({ providedIn: 'root' })
export class ContentRepository {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private graphRequest?: Observable<KnowledgeGraph>;
  readonly knowledgeGraph = methodologyKnowledgeGraph;
  readonly atlas = methodologyAtlas;
  readonly discoveryIndex = buildDiscoveryIndex(this.knowledgeGraph);

  loadKnowledgeGraph(): Observable<KnowledgeGraph> {
    if (!isPlatformBrowser(this.platformId)) return of(this.knowledgeGraph);
    this.graphRequest ??= this.http.get<unknown>('/content/atlas.json').pipe(
      map((data) => knowledgeGraphSchema.parse(data)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.graphRequest;
  }

  loadAtlas(): Observable<Atlas> {
    return this.loadKnowledgeGraph().pipe(map((graph) => graph.atlases[0]));
  }

  findBySlug(slug: string | null, atlas: Atlas = this.atlas): Entity | undefined {
    if (!slug) return undefined;
    return atlas.entities.find((entity) => entity.slug === slug);
  }

  findEntityBySlug(
    slug: string | null,
    graph: KnowledgeGraph = this.knowledgeGraph,
  ): Entity | undefined {
    if (!slug) return undefined;
    return graph.atlases.flatMap((atlas) => atlas.entities).find((entity) => entity.slug === slug);
  }

  atlasForEntity(entityId: string, graph: KnowledgeGraph = this.knowledgeGraph): Atlas | undefined {
    return graph.atlases.find((atlas) => atlas.entities.some((entity) => entity.id === entityId));
  }

  queryEntities(query: KnowledgeEntityQuery) {
    return queryKnowledgeEntities(this.knowledgeGraph, query);
  }
  queryRelations(entityId: string, query: KnowledgeRelationQuery = {}) {
    return queryKnowledgeRelations(this.knowledgeGraph, entityId, query);
  }
}
