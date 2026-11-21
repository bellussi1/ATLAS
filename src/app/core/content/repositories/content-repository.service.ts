import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { mirrorIndexSchema, mirrorSlot } from '@core/content/media/mirror-index';
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
  type NetworkBundle,
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

/** How much of the release the loaded state carries; a deeper state satisfies a shallower one. */
type ContentDepth = 'network' | 'reading' | 'full';
const DEPTH_RANK: Record<ContentDepth, number> = { network: 0, reading: 1, full: 2 };

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
  private mirror: ReadonlyMap<string, string> | null = null;
  private mirrorPending?: Promise<void>;
  private manifest?: Promise<ContentManifest>;
  private readonly loads = new Map<'reading' | 'full', Promise<KnowledgeGraph>>();
  private networkPending?: Promise<KnowledgeGraph>;
  /** What the current state holds: the projection for /grafos, the lean bundle or everything. */
  private depth: ContentDepth = 'full';
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
  get bundledItineraries(): Readonly<Record<string, unknown>> | undefined {
    return this.state?.itineraries;
  }
  manifestSnapshot(): Promise<ContentManifest> {
    return this.getManifest();
  }
  async hasPublishedArtifacts(resources: readonly { sha256: string }[]): Promise<boolean> {
    if (!resources.length) return false;
    const pointer = await this.getPointer();
    const available = new Set(pointer.artifacts.map((item) => item.sha256));
    return resources.every((resource) => available.has(resource.sha256));
  }
  verifiedResource(resource: { sha256: string; bytes: number }, label: string): Promise<unknown> {
    return this.resource(resource, label);
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
        await this.prepare('reading');
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

  /** The explorer needs the whole package, including the full-text index and backlinks. */
  loadKnowledgeGraph(): Observable<KnowledgeGraph> {
    return defer(() => from(this.prepare('full')));
  }
  /** Readings and records skip the explorer-only index weight when the release has the lean bundle. */
  loadReadingGraph(): Observable<KnowledgeGraph> {
    return defer(() => from(this.prepare('reading')));
  }
  /** The full-screen graph only needs the collections and the compiled positions. */
  loadNetworkGraph(): Observable<KnowledgeGraph> {
    return defer(() => from(this.prepareNetwork()));
  }
  loadAtlas(): Observable<Atlas> {
    return defer(async () => {
      await this.prepare('full');
      return this.atlas;
    });
  }
  /** Public R2 address of a licensed file in the pinned release; null when the release lacks it. */
  mediaUrl(assetPath: string): string | null {
    const entry = this.pinned?.media.find((item) => item.path === assetPath);
    return this.pinned && entry ? `${this.pinned.baseUrl}/${entry.key}` : null;
  }
  /** Mirrored copy of a Commons thumbnail in the pinned release; null when it was not mirrored. */
  mirrorUrl(assetPath: string): string | null {
    const object = this.mirror?.get(mirrorSlot(assetPath));
    return this.pinned && object ? `${this.pinned.baseUrl}/m/${object}` : null;
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
  /**
   * Starts fetching the full bundle into the in-flight request cache before the user navigates.
   * Safe to call repeatedly; skipped on SSR, save-data or slow connections when `idle` is true.
   */
  warmBundle(idle = false): void {
    this.warm('full', idle);
  }
  /** Same as `warmBundle` for what a reading or a record needs: the lean bundle when published. */
  warmReading(idle = false): void {
    this.warm('reading', idle);
  }
  /** Starts fetching the network bundle into the in-flight request cache before opening `/grafos`. */
  warmNetwork(): void {
    if (
      !this.browser ||
      !this.prefetchEnabled ||
      this.state ||
      this.networkPending ||
      this.loads.size
    )
      return;
    void this.getPointer()
      .then((pointer) => {
        if (!pointer.networkBundle) return;
        const key = artifactKey(pointer.networkBundle.sha256);
        if (!this.requests.has(key)) void this.asset(key).catch(() => undefined);
      })
      .catch(() => undefined);
  }
  private warm(want: 'reading' | 'full', idle: boolean): void {
    if (!this.browser || !this.prefetchEnabled || this.loads.has(want)) return;
    if (this.state && DEPTH_RANK[this.depth] >= DEPTH_RANK[want]) return;
    if (idle && !this.canAutoPrefetch()) return;
    void this.getPointer()
      .then((pointer) => {
        const target = this.bundleFor(pointer, want);
        if (!target) return;
        const key = artifactKey(target.sha256);
        if (!this.requests.has(key)) void this.asset(key).catch(() => undefined);
      })
      .catch(() => undefined);
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
  /** Best effort: a missing or invalid mirror index leaves the original Commons addresses. */
  private loadMirror(pointer: ContentPointer): Promise<void> {
    const resource = pointer.mirror;
    if (!resource) return Promise.resolve();
    this.mirrorPending ??= this.resource(resource, 'media-mirror')
      .then((value) => {
        this.mirror = new Map(Object.entries(mirrorIndexSchema.parse(value).entries));
      })
      .catch(() => {
        this.mirrorPending = undefined;
      });
    return this.mirrorPending;
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

  /** The lean bundle serves readings when the release has it; otherwise the full one does. */
  private bundleFor(pointer: ContentPointer, want: 'reading' | 'full') {
    return want === 'reading' ? (pointer.readingBundle ?? pointer.bundle) : pointer.bundle;
  }
  private satisfies(want: 'reading' | 'full'): boolean {
    return !!this.state && DEPTH_RANK[this.depth] >= DEPTH_RANK[want];
  }
  private async prepare(want: 'reading' | 'full'): Promise<KnowledgeGraph> {
    if (this.satisfies(want)) return this.requireState().graph;
    if (this.networkPending) await this.networkPending.catch(() => undefined);
    if (this.satisfies(want)) return this.requireState().graph;
    // The full package already holds everything the lean one does; do not download both.
    const full = this.loads.get('full');
    if (want === 'reading' && full) return full;
    // A network-only package is upgraded in place when a route needs search or adjacency.
    if (this.state && this.depth === 'network') this.state = null;
    let load = this.loads.get(want);
    if (!load) {
      load = this.load(want).catch((error: unknown) => {
        this.loads.delete(want);
        this.manifest = undefined;
        this.pointer = undefined;
        this.requests.delete('pointer.json');
        throw error;
      });
      this.loads.set(want, load);
    }
    return load;
  }
  private async load(want: 'reading' | 'full'): Promise<KnowledgeGraph> {
    const pointer = await this.getPointer();
    const mirror = this.loadMirror(pointer);
    const target = this.bundleFor(pointer, want);
    // Without a bundle the manifest path loads every collection, which is the full package.
    const depth: ContentDepth = want === 'reading' && pointer.readingBundle ? 'reading' : 'full';
    let state: ContentPackage;
    if (this.browser) {
      state = target
        ? await this.buildBundleState(target)
        : await this.buildState(await this.getManifest());
    } else {
      let snapshots = ContentRepository.serverSnapshots.get(this.read);
      if (!snapshots) {
        snapshots = new Map();
        ContentRepository.serverSnapshots.set(this.read, snapshots);
      }
      const hash = target?.sha256 ?? pointer.manifest.sha256;
      let snapshot = snapshots.get(hash);
      if (!snapshot) {
        // Prerendering alternates between the lean and the full package; keep both parsed.
        if (snapshots.size >= 2) snapshots.clear();
        snapshot = (async () => {
          const built = target
            ? await this.buildBundleState(target)
            : await this.buildState(await this.getManifest());
          const assets = await Promise.all(
            [...this.requests]
              .filter(([key]) => key !== 'pointer.json')
              .map(async ([key, request]) => [key, await request] as const),
          );
          return {
            state: built,
            assets: new Map(assets.filter(([, text]) => isTransferable(text))),
          };
        })();
        snapshots.set(hash, snapshot);
        snapshot.catch(() => {
          if (snapshots.get(hash) === snapshot) snapshots.delete(hash);
        });
      }
      const cached = await snapshot;
      state = cached.state;
      for (const [key, text] of cached.assets) {
        this.requests.set(key, Promise.resolve(text));
        this.transfer.set(makeStateKey<string>(`content:${key}`), text);
      }
    }
    // A slower lean load must not replace a full package that finished first.
    if (!this.state || DEPTH_RANK[depth] >= DEPTH_RANK[this.depth]) {
      this.state = state;
      this.depth = depth;
    }
    await mirror;
    return this.requireState().graph;
  }
  private async prepareNetwork(): Promise<KnowledgeGraph> {
    if (this.state) return this.state.graph;
    const loading = this.loads.get('full') ?? this.loads.get('reading');
    if (loading) return loading;
    this.networkPending ??= (async () => {
      const pointer = await this.getPointer();
      const mirror = this.loadMirror(pointer);
      this.state = pointer.networkBundle
        ? await this.buildNetworkBundleState(pointer.networkBundle)
        : await this.buildNetworkState(await this.getManifest());
      this.depth = 'network';
      await mirror;
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
  private canAutoPrefetch(): boolean {
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (connection?.saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? ''))
      return false;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    return typeof memory !== 'number' || memory >= 4;
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
      itineraries: bundle.itineraries,
    };
  }
  private async buildNetworkBundleState(resource: {
    sha256: string;
    bytes: number;
  }): Promise<ContentPackage> {
    const value = await this.resource(resource, 'network-bundle.json');
    this.requests.delete(artifactKey(resource.sha256));
    // Same release/SHA-256 contract as `buildBundleState`: skip redundant Zod validation in the
    // browser so `/grafos` mounts immediately after digest verification.
    const bundle = this.browser ? (value as NetworkBundle) : networkBundleSchema.parse(value);
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
