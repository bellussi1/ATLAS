import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { editorialStatusLabel } from '@core/content/editorial/editorial-status';
import { type KnowledgeContext } from '@core/content/models/knowledge-context';
import { entityContext } from '@core/content/queries/entity-context';
import {
  catalogueForKind,
  explorerCatalogues,
  safeExplorerReturn,
} from '@core/content/queries/knowledge-explorer';
import { contentLanguageLabels, localizedEntity } from '@core/content/queries/localized-content';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { EntityProfileComponent } from '@exploration/components/entity-profile/entity-profile.component';
import { AtlasClaimReferencesComponent } from '@shared/ui/claim-references/claim-references.component';
import { AtlasLicensedAssetComponent } from '@shared/ui/licensed-asset/licensed-asset.component';
import { NotFoundMessageComponent } from '@shared/ui/not-found-message/not-found-message.component';

@Component({
  selector: 'app-record',
  imports: [
    RouterLink,
    AtlasLicensedAssetComponent,
    AtlasClaimReferencesComponent,
    EntityProfileComponent,
    NotFoundMessageComponent,
  ],
  templateUrl: './record.component.html',
  styleUrl: './record.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly doc = inject(DOCUMENT);
  readonly repository = inject(ContentRepository);
  readonly copyStatus = signal('');
  readonly statusLabel = editorialStatusLabel;
  readonly precisionLabel: Record<string, string> = {
    year: 'ano',
    approximate: 'data aproximada',
    range: 'intervalo',
    unknown: 'data desconhecida',
  };
  readonly uncertaintyLabel: Record<string, string> = {
    low: 'baixa',
    moderate: 'moderada',
    high: 'alta',
    unknown: 'não determinada',
  };
  readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly origin = computed(() => safeExplorerReturn(this.query().get('origem')));
  readonly returnTree = computed(() =>
    this.origin() ? this.router.parseUrl(this.origin()!) : null,
  );
  readonly originalEntity = computed(() =>
    this.repository.findEntityBySlug(this.params().get('slug')),
  );
  readonly presentation = computed(() => {
    const entity = this.originalEntity();
    return entity
      ? localizedEntity(
          entity,
          this.query().get('idioma'),
          this.repository.discoveryIndex.find((e) => e.id === entity.id)?.translations,
        )
      : undefined;
  });
  readonly entity = computed(() => this.presentation()?.entity);
  readonly languages = contentLanguageLabels;
  readonly context = computed(() =>
    this.entity() ? entityContext(this.repository, this.entity()!.id) : undefined,
  );
  readonly atlas = computed(() =>
    this.entity() ? this.repository.atlasForEntity(this.entity()!.id) : undefined,
  );
  readonly entry = computed(() =>
    this.repository.discoveryIndex.find((e) => e.id === this.entity()?.id),
  );
  readonly dossier = computed(
    () =>
      (
        ({ 'ideology-marxism': '/marxismo', 'ideology-liberalism': '/liberalismo' }) as Record<
          string,
          string
        >
      )[this.entity()?.id ?? ''],
  );
  readonly claims = computed(() =>
    this.repository.knowledgeGraph.atlases.flatMap((atlas) =>
      atlas.claims
        .filter((c) => c.entityId === this.entity()?.id)
        .map((claim) => ({ claim, atlas })),
    ),
  );
  /** Connections gathered under the relation that links them to this record. */
  readonly connectionGroups = computed(() => {
    const groups = new Map<string, KnowledgeContext['connections']>();
    for (const connection of this.context()?.connections ?? []) {
      const label = connection.relation?.label ?? 'Relacionado';
      groups.set(label, [...(groups.get(label) ?? []), connection]);
    }
    return [...groups].map(([label, items]) => ({ label, items }));
  });
  /** Other records of the same kind, as a way to keep reading. */
  readonly related = computed(() => {
    const current = this.entry();
    if (!current) return [];
    return this.repository.discoveryIndex
      .filter(
        (item) =>
          item.kind === current.kind && item.id !== current.id && item.path.startsWith('/verbete/'),
      )
      .slice(0, 6);
  });
  readonly catalogue = computed(() => {
    const kind = this.entry()?.kind;
    const catalogue = kind
      ? explorerCatalogues.find((item) => item.path === catalogueForKind(kind))
      : undefined;
    return catalogue ? { title: catalogue.title, path: '/' + catalogue.path } : undefined;
  });
  readonly facts = computed(() => {
    const entity = this.entity();
    if (!entity) return [];
    const period = entity.temporalExtent;
    return [
      { label: 'Tipo', value: this.entry()?.kindLabel ?? '' },
      ...(period
        ? [{ label: 'Período', value: period.label ?? this.precisionLabel[period.precision] }]
        : []),
      { label: 'Afirmações', value: String(this.claims().length) },
      { label: 'Conexões', value: String(this.context()?.connections.length ?? 0) },
      { label: 'Fontes', value: String(this.context()?.sources.length ?? 0) },
    ];
  });
  readonly toc = computed(() => {
    const entity = this.entity();
    if (!entity) return [];
    return [
      ...entity.sections.map((section, index) => ({
        id: 'section-' + index,
        label: section.heading,
      })),
      { id: 'claims-title', label: 'Afirmações e evidências' },
      { id: 'connections-title', label: 'Conexões' },
      { id: 'sources-title', label: 'Fontes e proveniência' },
    ];
  });
  pathFor(id: string): string {
    return this.repository.discoveryIndex.find((e) => e.id === id)?.path ?? '/entidades';
  }
  /** Copies the record's permanent address; the button replaces the link to the page itself. */
  async copyLink(): Promise<void> {
    const url = new URL(this.entry()?.path ?? this.doc.location.pathname, this.doc.location.origin);
    const clipboard = this.doc.defaultView?.navigator.clipboard;
    if (!clipboard) {
      this.copyStatus.set('Copie o endereço da barra do navegador.');
      return;
    }
    try {
      await clipboard.writeText(url.href);
      this.copyStatus.set('Link copiado.');
    } catch {
      this.copyStatus.set('Copie o endereço da barra do navegador.');
    }
  }
}
