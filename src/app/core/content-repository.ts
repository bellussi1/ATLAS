import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { forkJoin, from, map, type Observable, of, shareReplay, tap } from 'rxjs';

import methodologyAtlasData from '../../content/atlas.json';
import type { Atlas, Entity, KnowledgeGraph } from './content-schema';
import { knowledgeGraphSchema } from './content-schema';
import { buildDiscoveryIndex } from './discovery-index';
import { type IdeologyDossier, validateIdeologyDossier } from './ideology-page-schema';
import type { KnowledgeEntityQuery, KnowledgeRelationQuery } from './knowledge-graph';
import { queryKnowledgeEntities, queryKnowledgeRelations } from './knowledge-graph';

export const methodologyKnowledgeGraph = knowledgeGraphSchema.parse(methodologyAtlasData);
export const methodologyAtlas = methodologyKnowledgeGraph.atlases[0];

@Injectable({ providedIn: 'root' })
export class ContentRepository {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly transferState = inject(TransferState);
  private graphRequest?: Observable<KnowledgeGraph>;
  readonly knowledgeGraph = methodologyKnowledgeGraph;
  readonly atlas = methodologyAtlas;
  readonly discoveryIndex = buildDiscoveryIndex(this.knowledgeGraph);

  loadIdeology(slug: string): Observable<IdeologyDossier | null> {
    // Only published snapshots are routable; draft examples stay outside the registry.
    if (slug !== 'marxismo') return of(null);
    const stateKey = makeStateKey<IdeologyDossier | null>('ideology-' + slug);
    const transferred = this.transferState.get(stateKey, null);
    if (transferred) {
      this.transferState.remove(stateKey);
      return of(
        validateIdeologyDossier(transferred.page, transferred.supplement, this.knowledgeGraph),
      );
    }
    if (!isPlatformBrowser(this.platformId)) {
      return from(
        Promise.all([
          import('../../content/ideologies/marxismo/page.json'),
          import('../../content/graph/marxismo.json'),
        ]),
      ).pipe(
        map(([page, supplement]) =>
          validateIdeologyDossier(page.default, supplement.default, this.knowledgeGraph),
        ),
        tap((dossier) => this.transferState.set(stateKey, dossier)),
      );
    }
    return forkJoin({
      page: this.http.get<unknown>('/content/ideologies/marxismo/page.json'),
      supplement: this.http.get<unknown>('/content/graph/marxismo.json'),
    }).pipe(
      map(({ page, supplement }) => validateIdeologyDossier(page, supplement, this.knowledgeGraph)),
    );
  }

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
