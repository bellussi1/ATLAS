import { Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, type Params, Router, RouterLink } from '@angular/router';
import type { Atlas } from '@core/content/models/content-schema';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import type { IdeologyPage } from '@ideologies/models/ideology-page.schema';
import {
  deskEntities,
  type DeskKind,
  deskLinks,
  eraBuckets,
  filterDesk,
  kindCounts,
  kindLabel,
  linkBetween,
  parseChain,
} from '@ideologies/utils/desk-graph';
import { entityMedia } from '@ideologies/utils/page-media-plan';
import { chapterDeskKind } from '@ideologies/utils/reading-trails';
import { AtlasLicensedAssetComponent } from '@shared/ui/licensed-asset/licensed-asset.component';

/**
 * Exploration desk over the tradition's graph: search, kind and era filters, and a
 * chain of records joined by documented relations. The whole state lives in the URL,
 * including the chapter the reader came from, so it can be shared and undone.
 */
@Component({
  selector: 'app-ideology-desk',
  imports: [RouterLink, AtlasLicensedAssetComponent],
  templateUrl: './ideology-desk.component.html',
  styleUrl: './ideology-desk.component.scss',
})
export class IdeologyDeskComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repository = inject(ContentRepository);
  readonly page = input.required<IdeologyPage>();
  readonly basePath = input.required<string>();

  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly kindLabel = kindLabel;

  private readonly atlas = computed(() =>
    this.repository.knowledgeGraph.atlases.find((a) => a.id === this.page().atlasId),
  );
  readonly entities = computed(() => deskEntities(this.atlas()));
  /** Licensed picture per record id, so cards and the chain can show the person or work. */
  readonly media = computed(() => {
    const graph = this.repository.knowledgeGraph;
    const pictures = new Map<string, { assetPath: string; owner: Atlas }>();
    for (const entity of this.atlas()?.entities ?? []) {
      const asset = entityMedia(graph, entity);
      const owner = asset && graph.atlases.find((a) => a.assetLicenses.includes(asset));
      if (asset && owner) pictures.set(entity.id, { assetPath: asset.assetPath, owner });
    }
    return pictures;
  });
  readonly origin = computed(() => {
    const anchor = this.params().get('de');
    return this.page().chapters.find((c) => c.anchor === anchor) ?? null;
  });
  readonly text = computed(() => this.params().get('q') ?? '');
  readonly kind = computed<DeskKind | null>(() => {
    const value = this.params().get('tipo');
    if (value) return this.counts().some((c) => c.kind === value) ? (value as DeskKind) : null;
    const fromChapter = this.origin() && chapterDeskKind(this.origin()!);
    return fromChapter && this.counts().some((c) => c.kind === fromChapter) ? fromChapter : null;
  });
  readonly era = computed(() => {
    const value = Number(this.params().get('epoca'));
    return this.eras().some((e) => e.start === value) ? value : null;
  });
  readonly counts = computed(() => kindCounts(this.entities()));
  readonly eras = computed(() => eraBuckets(this.entities()));
  readonly eraMax = computed(() => Math.max(1, ...this.eras().map((e) => e.count)));
  readonly results = computed(() =>
    filterDesk(this.entities(), { text: this.text(), kind: this.kind(), era: this.era() }),
  );

  readonly chain = computed(() => {
    const byId = new Map(this.entities().map((e) => [e.id, e]));
    const ids = parseChain(this.params().get('cadeia'), this.entities());
    return ids.map((id, index) => ({
      entity: byId.get(id)!,
      via: index ? linkBetween(this.atlas(), ids[index - 1], id) : undefined,
    }));
  });
  readonly current = computed(() => this.chain().at(-1)?.entity ?? null);
  readonly links = computed(() => {
    const current = this.current();
    if (!current) return [];
    const inChain = new Set(this.chain().map((s) => s.entity.id));
    const byId = new Map(this.entities().map((e) => [e.id, e]));
    return deskLinks(this.atlas(), current.id)
      .filter((link) => !inChain.has(link.otherId))
      .map((link) => ({ ...link, other: byId.get(link.otherId)! }));
  });

  setText(value: string): void {
    this.update({ q: value.trim() || null });
  }
  setKind(kind: DeskKind | null): void {
    this.update({ tipo: kind ?? (this.origin() ? 'todos' : null) });
  }
  setEra(start: number): void {
    this.update({ epoca: this.era() === start ? null : start });
  }
  clearFilters(): void {
    this.update({ q: null, tipo: this.origin() ? 'todos' : null, epoca: null });
  }
  /** Picking a record from the results starts a new chain. */
  start(id: string): void {
    this.update({ cadeia: id });
  }
  follow(id: string): void {
    this.update({ cadeia: [...this.chain().map((s) => s.entity.id), id].join(',') });
  }
  /** Returns to an earlier step, dropping what came after it. */
  truncate(index: number): void {
    this.update({
      cadeia:
        this.chain()
          .slice(0, index + 1)
          .map((s) => s.entity.id)
          .join(',') || null,
    });
  }

  private update(queryParams: Params): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: !('cadeia' in queryParams),
      // Filters and selections change the desk in place; only chapter links should scroll.
      scroll: 'manual',
    });
  }
}
