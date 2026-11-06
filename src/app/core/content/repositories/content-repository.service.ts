import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import {
  adjacencySchema,
  type ContentManifest,
  contentManifestSchema,
  type ContentPackage,
  type IdeologyBundle,
  ideologyBundleSchema,
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

/** Largest object, in characters, that the server hands to the browser through TransferState. */
const TRANSFER_LIMIT_CHARS = 16_000;

/** Large immutable artifacts stay on R2 instead of repeating in every prerendered HTML. */
export const isTransferable = (value: string): boolean => value.length <= TRANSFER_LIMIT_CHARS;

interface ServerSnapshot {
  state: ContentPackage;
  assets: ReadonlyMap<string, string>;
}

@Injectable({ providedIn: 'root' })
export class ContentRepository {
  // Static builds reuse immutable, digest-verified packages between route renders.
  private static readonly serverSnapshots = new WeakMap<
    (key: string) => Promise<string>,
    Map<string, Promise<ServerSnapshot>>
  >();
  private readonly read = inject(CONTENT_ASSET_READER);
  private readonly transfer = inject(TransferState);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private state = inject(CONTENT_INITIAL_PACKAGE);
  private readonly requests = new Map<string, Promise<string>>();
  private pointer?: Promise<ContentPointer>;
  private pinned?: ContentPointer;
  private manifest?: Promise<ContentManifest>;
  private pending?: Promise<KnowledgeGraph>;
  private readonly readings = new Map<string, Promise<IdeologyBundle | null>>();

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

  /** A published reading's page and supplement from the release; null when the release lacks it. */
  loadIdeology(id: string): Promise<IdeologyBundle | null> {
    let reading = this.readings.get(id);
    if (!reading) {
      reading = this.getManifest().then(async (manifest) => {
        const entry = manifest.ideologies.find((ideology) => ideology.id === id);
        if (!entry) return null;
        return ideologyBundleSchema.parse(await this.resource(entry, entry.file));
      });
      this.readings.set(id, reading);
      reading.catch(() => this.readings.delete(id));
    }
    return reading;
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
  /** Public R2 address of a licensed file in the pinned release; null when the release lacks it. */
  mediaUrl(assetPath: string): string | null {
    const entry = this.pinned?.media.find((item) => item.path === assetPath);
    return this.pinned && entry ? `${this.pinned.baseUrl}/${entry.key}` : null;
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
  /** Small assets hydrate directly. Larger objects use the browser cache and verified R2 release. */
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
      if (!this.browser && isTransferable(value)) this.transfer.set(transferKey, value);
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
      .then((pointer) => {
        this.pinned = pointer;
        return pointer;
      })
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
      if (this.browser) {
        this.state = await this.buildState(manifest);
      } else {
        let snapshots = ContentRepository.serverSnapshots.get(this.read);
        if (!snapshots) {
          snapshots = new Map();
          ContentRepository.serverSnapshots.set(this.read, snapshots);
        }
        const hash = this.pinned!.manifest.sha256;
        let snapshot = snapshots.get(hash);
        if (!snapshot) {
          snapshots.clear();
          snapshot = (async () => {
            const state = await this.buildState(manifest);
            const assets = await Promise.all(
              [...this.requests]
                .filter(([key]) => key !== 'pointer.json')
                .map(async ([key, request]) => [key, await request] as const),
            );
            return { state, assets: new Map(assets.filter(([, text]) => isTransferable(text))) };
          })();
          snapshots.set(hash, snapshot);
          snapshot.catch(() => {
            if (snapshots.get(hash) === snapshot) snapshots.delete(hash);
          });
        }
        const cached = await snapshot;
        this.state = cached.state;
        for (const [key, text] of cached.assets) {
          this.requests.set(key, Promise.resolve(text));
          this.transfer.set(makeStateKey<string>(`content:${key}`), text);
        }
      }
      // Readings start with the graph but do not hold it: opening a reading awaits its request.
      void Promise.all(manifest.ideologies.map((entry) => this.loadIdeology(entry.id))).catch(
        () => undefined,
      );
      return this.state.graph;
    })().catch((error: unknown) => {
      this.pending = undefined;
      this.manifest = undefined;
      this.pointer = undefined;
      this.requests.delete('pointer.json');
      throw error;
    });
    return this.pending;
  }
  private async buildState(manifest: ContentManifest): Promise<ContentPackage> {
    const [atlases, search, adjacency, layouts] = await Promise.all([
      Promise.all(manifest.collections.map((entry) => this.resource(entry, entry.file))),
      this.resource(manifest.search, manifest.search.file),
      this.resource(manifest.adjacency, manifest.adjacency.file),
      this.resource(manifest.layouts, manifest.layouts.file),
    ]);
    const graph = knowledgeGraphSchema.parse({ ...manifest.graph, atlases });
    if (graph.atlases.some((atlas, index) => atlas.id !== manifest.collections[index].id))
      throw new Error('Identidade da coleção incompatível com o manifesto.');
    return {
      graph,
      search: searchIndexSchema.parse(search),
      adjacency: adjacencySchema.parse(adjacency),
      layouts: layoutsSchema.parse(layouts),
    };
  }
}
