import { Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { ContentRepository } from '../core/content-repository';
import type { Entity, Source } from '../core/content-schema';
import type { IdeologyDossier, IdeologyEdge, PageBlock } from '../core/ideology-page-schema';
import { MarxAtlasPage } from '../pages/marx-atlas-page';
import { reproducibleAsset } from './licensed-asset';

@Component({
  selector: 'app-ideology-block',
  imports: [MarxAtlasPage],
  templateUrl: './ideology-block.html',
  styleUrl: './ideology-block.scss',
})
export class IdeologyBlockComponent {
  readonly block = input.required<PageBlock>();
  readonly dossier = input.required<IdeologyDossier>();
  readonly blockId = input.required<string>();
  readonly repository = inject(ContentRepository);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly entities = computed(() => {
    const block = this.block();
    const ids = 'entityIds' in block ? block.entityIds : [];
    return ids.flatMap((id) => this.entity(id) ?? []);
  });
  readonly edges = computed(() => {
    const block = this.block();
    return block.type === 'graph'
      ? this.dossier().supplement.edges.filter((e) => block.edgeIds.includes(e.id))
      : [];
  });
  readonly selectedEdge = computed<IdeologyEdge | undefined>(
    () => this.edges().find((e) => e.id === this.params().get('relacao')) ?? this.edges()[0],
  );
  readonly graphNodes = computed(() => {
    const ids = [...new Set(this.edges().flatMap((edge) => [edge.from, edge.to]))];
    return ids.map((id, index) => ({
      id,
      x: index % 2 ? 700 : 190,
      y: 60 + Math.floor(index / 2) * 130,
      title: this.entity(id)?.title ?? id,
    }));
  });
  readonly timeline = computed(() => {
    const period = this.params().get('periodo');
    return [...this.entities()]
      .filter((e) => {
        const year = e.temporalExtent?.startYear;
        return (
          year !== null &&
          year !== undefined &&
          (period === 'antes-1850' ? year < 1850 : period === 'desde-1850' ? year >= 1850 : true)
        );
      })
      .sort((a, b) => (a.temporalExtent?.startYear ?? 0) - (b.temporalExtent?.startYear ?? 0));
  });
  readonly sourceList = computed(() => {
    const block = this.block();
    const ids = block.type === 'sources' ? block.sourceIds : [];
    const query = this.params().get('bibliografia')?.toLocaleLowerCase('pt-BR') ?? '';
    return ids
      .flatMap((id) => this.source(id) ?? [])
      .filter((s) => s.title.toLocaleLowerCase('pt-BR').includes(query));
  });
  readonly atlas = computed(() =>
    this.repository.knowledgeGraph.atlases.find((a) => a.id === this.dossier().page.atlasId)!,
  );
  entity(id: string): Entity | undefined {
    return this.repository.knowledgeGraph.atlases
      .flatMap((a) => a.entities)
      .find((e) => e.id === id);
  }
  source(id: string): Source | undefined {
    return [
      ...this.dossier().supplement.sources,
      ...this.repository.knowledgeGraph.atlases.flatMap((a) => a.sources),
    ].find((s) => s.id === id);
  }
  media(entity: Entity) {
    return this.atlas().assetLicenses.find(
      (asset) =>
        asset.entityId === entity.id &&
        asset.attribution &&
        asset.filePageUrl &&
        reproducibleAsset(this.atlas(), asset.assetPath),
    );
  }
  period(entity: Entity): string {
    const t = entity.temporalExtent;
    return (
      t?.label ??
      (t?.startYear
        ? `${t.startYear}${t.endYear && t.endYear !== t.startYear ? '–' + t.endYear : ''}`
        : 'Período não informado')
    );
  }
  update(key: string, value: string | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [key]: value },
      queryParamsHandling: 'merge',
      preserveFragment: true,
      replaceUrl: true,
      scroll: 'manual',
    });
  }
  point(id: string) {
    return this.graphNodes().find((n) => n.id === id)!;
  }
  entitySources(entity: Entity): Source[] {
    const graph = this.repository.knowledgeGraph;
    const sources = graph.atlases.flatMap((a) => a.sources);
    const evidenceIds = new Set(
      graph.atlases
        .flatMap((a) =>
          a.claims.filter((c) => c.entityId === entity.id).flatMap((c) => c.citationIds),
        )
        .flatMap(
          (id) =>
            graph.atlases.flatMap((a) => a.citations).find((c) => c.id === id)?.evidenceId ?? [],
        ),
    );
    const sourceIds = new Set(
      graph.atlases
        .flatMap((a) => a.evidences)
        .filter((e) => evidenceIds.has(e.id))
        .map((e) => e.sourceId),
    );
    return sources.filter((s) => sourceIds.has(s.id));
  }
}
