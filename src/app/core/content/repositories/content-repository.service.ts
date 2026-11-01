import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import {
  adjacencySchema,
  type ContentManifest,
  contentManifestSchema,
  type ContentPackage,
  layoutsSchema,
  searchIndexSchema,
} from '@core/content/models/content-artifacts';
import {
  type Atlas,
  atlasSchema,
  type Entity,
  type KnowledgeGraph,
  knowledgeGraphSchema,
} from '@core/content/models/content-schema';
import {
  filterKnowledgeRelations,
  type KnowledgeEntityQuery,
  type KnowledgeRelationQuery,
  queryKnowledgeEntities,
} from '@core/content/queries/knowledge-graph';
import { defer, from, type Observable } from 'rxjs';

import { CONTENT_ASSET_READER, CONTENT_INITIAL_PACKAGE } from './content-assets';

@Injectable({ providedIn: 'root' })
export class ContentRepository {
  private readonly read = inject(CONTENT_ASSET_READER);
  private readonly transfer = inject(TransferState);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private state = inject(CONTENT_INITIAL_PACKAGE);
  private readonly requests = new Map<string, Promise<string>>();
  private manifest?: Promise<ContentManifest>;
  private pending?: Promise<KnowledgeGraph>;

  get knowledgeGraph(): KnowledgeGraph {
    if (!this.state) throw new Error('Carregue o conteúdo antes de criar a página.');
    return this.state.graph;
  }
  get atlas(): Atlas {
    return this.knowledgeGraph.atlases[0];
  }
  get discoveryIndex() {
    return this.requireState().search;
  }
  get layouts() {
    return this.requireState().layouts;
  }

  async loadCollection(id: string): Promise<Atlas | undefined> {
    const manifest = await this.getManifest();
    const entry = manifest.collections.find((collection) => collection.id === id);
    if (!entry) return undefined;
    const atlas = atlasSchema.parse(await this.resource(entry));
    if (atlas.id !== id) throw new Error('Identidade da coleção incompatível com o manifesto.');
    return atlas;
  }

  loadKnowledgeGraph(): Observable<KnowledgeGraph> {
    return defer(() => from(this.prepare()));
  }
  loadAtlas(): Observable<Atlas> {
    return defer(async () => {
      await this.prepare();
      return this.atlas;
    });
  }
  findBySlug(slug: string | null, atlas: Atlas = this.atlas): Entity | undefined {
    return atlas.entities.find((entity) => entity.slug === slug);
  }
  findEntityBySlug(
    slug: string | null,
    graph: KnowledgeGraph = this.knowledgeGraph,
  ): Entity | undefined {
    return graph.atlases.flatMap((atlas) => atlas.entities).find((entity) => entity.slug === slug);
  }
  atlasForEntity(id: string, graph: KnowledgeGraph = this.knowledgeGraph): Atlas | undefined {
    return graph.atlases.find((atlas) => atlas.entities.some((entity) => entity.id === id));
  }
  queryEntities(query: KnowledgeEntityQuery) {
    return queryKnowledgeEntities(this.knowledgeGraph, query);
  }
  queryRelations(id: string, query: KnowledgeRelationQuery = {}) {
    return filterKnowledgeRelations(this.requireState().adjacency[id] ?? [], query);
  }
  private requireState(): ContentPackage {
    if (!this.state) throw new Error('Índices de conteúdo indisponíveis.');
    return this.state;
  }
  private asset(path: string): Promise<string> {
    const previous = this.requests.get(path);
    if (previous) return previous;
    const key = makeStateKey<string>(`content:${path}`);
    const request = (async () => {
      if (this.browser && this.transfer.hasKey(key)) {
        const value = this.transfer.get(key, '');
        this.transfer.remove(key);
        return value;
      }
      const value = await this.read(path);
      if (!this.browser) this.transfer.set(key, value);
      return value;
    })().catch((error: unknown) => {
      this.requests.delete(path);
      throw error;
    });
    this.requests.set(path, request);
    return request;
  }
  private getManifest(): Promise<ContentManifest> {
    this.manifest ??= this.asset('/content/manifest.json')
      .then((text) => contentManifestSchema.parse(JSON.parse(text)))
      .catch((error: unknown) => {
        this.manifest = undefined;
        this.requests.delete('/content/manifest.json');
        throw error;
      });
    return this.manifest;
  }
  private async resource(resource: ContentManifest['search']): Promise<unknown> {
    const path = `/content/${resource.file}`;
    try {
      const text = await this.asset(path);
      const bytes = new TextEncoder().encode(text);
      const hash = Array.from(
        new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes)),
      )
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('');
      if (bytes.byteLength !== resource.bytes || hash !== resource.sha256)
        throw new Error(`Falha de integridade: ${resource.file}`);
      return JSON.parse(text);
    } catch (error) {
      this.requests.delete(path);
      throw error;
    }
  }

  private async prepare(): Promise<KnowledgeGraph> {
    if (this.state) return this.state.graph;
    this.pending ??= (async () => {
      const manifest = await this.getManifest();
      const [atlases, search, adjacency, layouts] = await Promise.all([
        Promise.all(manifest.collections.map((entry) => this.loadCollection(entry.id))),
        this.resource(manifest.search),
        this.resource(manifest.adjacency),
        this.resource(manifest.layouts),
      ]);
      const graph = knowledgeGraphSchema.parse({ ...manifest.graph, atlases });
      this.state = {
        graph,
        search: searchIndexSchema.parse(search),
        adjacency: adjacencySchema.parse(adjacency),
        layouts: layoutsSchema.parse(layouts),
      };
      return graph;
    })().catch((error: unknown) => {
      this.pending = undefined;
      this.manifest = undefined;
      this.requests.delete('/content/manifest.json');
      throw error;
    });
    return this.pending;
  }
}
