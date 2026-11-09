import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import {
  adjacencySchema,
  type ContentBundle,
  contentBundleSchema,
  type ContentManifest,
  contentManifestSchema,
  type ContentPackage,
  type IdeologyBundle,
  ideologyBundleSchema,
  layoutsSchema,
  networkBundleSchema,
  networkGraphSchema,
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

import { CONTENT_ASSET_READER, CONTENT_INITIAL_PACKAGE, CONTENT_PREFETCH } from './content-assets';

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
  private readonly prefetchEnabled = inject(CONTENT_PREFETCH);
  private state = inject(CONTENT_INITIAL_PACKAGE);
  private readonly requests = new Map<string, Promise<string>>();
  private pointer?: Promise<ContentPointer>;
  private pinned?: ContentPointer;
  private manifest?: Promise<ContentManifest>;
  private pending?: Promise<KnowledgeGraph>;
  private networkPending?: Promise<KnowledgeGraph>;
  /** True when only the graph and layouts were loaded for /grafos. */
  private networkOnly = false;
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
      reading = (async () => {
        // The bundle already carries every reading, so opening one costs no extra request.
        if (!this.state || this.networkOnly) await this.prepare();
        const bundled = this.state?.ideologies?.[id];
        if (bundled) return bundled;
        const manifest = await this.getManifest();
        const entry = manifest.ideologies.find((ideology) => ideology.id === id);
        if (!entry) return null;
        return ideologyBundleSchema.parse(await this.resource(entry, entry.file));
      })();
      this.readings.set(id, reading);
      reading.catch(() => this.readings.delete(id));
    }
    return reading;
  }

  loadKnowledgeGraph(): Observable<KnowledgeGraph> {
    return defer(() => from(this.prepare()));
  }
  /** The full-screen graph only needs the collections and the compiled positions. */
  loadNetworkGraph(): Observable<KnowledgeGraph> {
    return defer(() => from(this.prepareNetwork()));
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
    if (this.state && !this.networkOnly) return this.state.graph;
    if (this.networkPending) await this.networkPending.catch(() => undefined);
    if (this.state && !this.networkOnly) return this.state.graph;
    // A network-only package is upgraded in place when a route needs search or adjacency.
    if (this.state && this.networkOnly) this.state = null;
    this.pending ??= (async () => {
      const pointer = await this.getPointer();
      if (this.browser) {
        this.state = pointer.bundle
          ? await this.buildBundleState(pointer.bundle)
          : await this.buildState(await this.getManifest());
        this.networkOnly = false;
      } else {
        let snapshots = ContentRepository.serverSnapshots.get(this.read);
        if (!snapshots) {
          snapshots = new Map();
          ContentRepository.serverSnapshots.set(this.read, snapshots);
        }
        const hash = pointer.bundle?.sha256 ?? pointer.manifest.sha256;
        let snapshot = snapshots.get(hash);
        if (!snapshot) {
          snapshots.clear();
          snapshot = (async () => {
            const state = pointer.bundle
              ? await this.buildBundleState(pointer.bundle)
              : await this.buildState(await this.getManifest());
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
        this.networkOnly = false;
        for (const [key, text] of cached.assets) {
          this.requests.set(key, Promise.resolve(text));
          this.transfer.set(makeStateKey<string>(`content:${key}`), text);
        }
      }
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
  private async prepareNetwork(): Promise<KnowledgeGraph> {
    if (this.state) return this.state.graph;
    if (this.pending) return this.pending;
    this.networkPending ??= (async () => {
      const pointer = await this.getPointer();
      this.state = pointer.networkBundle
        ? await this.buildNetworkBundleState(pointer.networkBundle)
        : await this.buildNetworkState(await this.getManifest());
      this.networkOnly = true;
      this.schedulePrefetch(pointer);
      return this.state.graph;
    })().catch((error: unknown) => {
      this.networkPending = undefined;
      this.manifest = undefined;
      this.pointer = undefined;
      this.requests.delete('pointer.json');
      throw error;
    });
    return this.networkPending;
  }
  /**
   * The graph is often the entry point. Warm the complete package while the reader explores it,
   * so leaving for a catalogue does not download and verify the bundle again. Skipped on
   * save-data, slow connections and low-memory devices.
   */
  private schedulePrefetch(pointer: ContentPointer): void {
    if (!this.browser || !this.prefetchEnabled || !pointer.bundle) return;
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (connection?.saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? ''))
      return;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (typeof memory === 'number' && memory < 8) return;
    const key = artifactKey(pointer.bundle.sha256);
    if (this.requests.has(key)) return;
    const run = () => {
      if (document.visibilityState === 'visible') void this.asset(key).catch(() => undefined);
    };
    if (typeof globalThis.requestIdleCallback === 'function')
      globalThis.requestIdleCallback(run, { timeout: 3000 });
    else setTimeout(run, 1500);
  }
  private async buildBundleState(resource: {
    sha256: string;
    bytes: number;
  }): Promise<ContentPackage> {
    const value = await this.resource(resource, 'bundle.json');
    this.requests.delete(artifactKey(resource.sha256));
    // `content:build` validates this shape before publishing and the digest pins the bytes. The
    // browser trusts both instead of validating the whole release a second time.
    const bundle = this.browser ? (value as ContentBundle) : contentBundleSchema.parse(value);
    return {
      graph: bundle.graph,
      search: bundle.search,
      adjacency: bundle.adjacency,
      layouts: bundle.layouts,
      ideologies: bundle.ideologies,
    };
  }
  private async buildNetworkBundleState(resource: {
    sha256: string;
    bytes: number;
  }): Promise<ContentPackage> {
    const bundle = networkBundleSchema.parse(await this.resource(resource, 'network-bundle.json'));
    this.requests.delete(artifactKey(resource.sha256));
    return {
      // The graph page only reads the projected fields; a later full load upgrades this state.
      graph: bundle.graph as unknown as KnowledgeGraph,
      search: [],
      adjacency: {},
      layouts: bundle.layouts,
    };
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
  private async buildNetworkState(manifest: ContentManifest): Promise<ContentPackage> {
    const layouts = layoutsSchema.parse(
      await this.resource(manifest.layouts, manifest.layouts.file),
    );
    if (manifest.network) {
      const graph = networkGraphSchema.parse(
        await this.resource(manifest.network, manifest.network.file),
      );
      // The graph page only reads the projected fields; a later full load upgrades this state.
      return {
        graph: graph as unknown as KnowledgeGraph,
        search: [],
        adjacency: {},
        layouts,
      };
    }
    const atlases = await Promise.all(
      manifest.collections.map((entry) => this.resource(entry, entry.file)),
    );
    const graph = knowledgeGraphSchema.parse({ ...manifest.graph, atlases });
    if (graph.atlases.some((atlas, index) => atlas.id !== manifest.collections[index].id))
      throw new Error('Identidade da coleção incompatível com o manifesto.');
    return {
      graph,
      search: [],
      adjacency: {},
      layouts,
    };
  }
}
