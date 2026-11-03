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
  artifactKey,
  type ContentPointer,
  contentPointerSchema,
} from '@core/content/models/content-pointer';
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
  private pointer?: Promise<ContentPointer>;
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
    const atlas = atlasSchema.parse(await this.resource(entry, entry.file));
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
  /** Reads one object key from the base URL once; browser reads reuse the server's TransferState. */
  private asset(key: string): Promise<string> {
    const previous = this.requests.get(key);
    if (previous) return previous;
    const transferKey = makeStateKey<string>(`content:${key}`);
    const request = (async () => {
      if (this.browser && this.transfer.hasKey(transferKey)) {
        const value = this.transfer.get(transferKey, '');
        this.transfer.remove(transferKey);
        return value;
      }
      const value = await this.read(key);
      if (!this.browser) this.transfer.set(transferKey, value);
      return value;
    })().catch((error: unknown) => {
      this.requests.delete(key);
      throw error;
    });
    this.requests.set(key, request);
    return request;
  }
  /** The live pointer is the only mutable object; everything it names is verified by digest. */
  private getPointer(): Promise<ContentPointer> {
    this.pointer ??= this.asset('pointer.json')
      .then((text) => contentPointerSchema.parse(JSON.parse(text)))
      .catch((error: unknown) => {
        this.pointer = undefined;
        this.requests.delete('pointer.json');
        throw error;
      });
    return this.pointer;
  }
  private getManifest(): Promise<ContentManifest> {
    this.manifest ??= this.getPointer()
      .then((pointer) => this.resource(pointer.manifest, 'manifest.json'))
      .then((value) => contentManifestSchema.parse(value))
      .catch((error: unknown) => {
        this.manifest = undefined;
        this.pointer = undefined;
        this.requests.delete('pointer.json');
        throw error;
      });
    return this.manifest;
  }
  private async resource(
    resource: { sha256: string; bytes: number },
    label: string,
  ): Promise<unknown> {
    const key = artifactKey(resource.sha256);
    try {
      const text = await this.asset(key);
      const bytes = new TextEncoder().encode(text);
      const hash = Array.from(
        new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes)),
      )
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('');
      if (bytes.byteLength !== resource.bytes || hash !== resource.sha256)
        throw new Error(`Falha de integridade: ${label}`);
      return JSON.parse(text);
    } catch (error) {
      this.requests.delete(key);
      throw error;
    }
  }

  private async prepare(): Promise<KnowledgeGraph> {
    if (this.state) return this.state.graph;
    this.pending ??= (async () => {
      const manifest = await this.getManifest();
      const [atlases, search, adjacency, layouts] = await Promise.all([
        Promise.all(manifest.collections.map((entry) => this.loadCollection(entry.id))),
        this.resource(manifest.search, manifest.search.file),
        this.resource(manifest.adjacency, manifest.adjacency.file),
        this.resource(manifest.layouts, manifest.layouts.file),
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
      this.pointer = undefined;
      this.requests.delete('pointer.json');
      throw error;
    });
    return this.pending;
  }
}
