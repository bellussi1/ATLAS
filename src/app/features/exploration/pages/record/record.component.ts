import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  editorialSeal,
  readerDate,
  readerProse,
  relationGroups,
} from '@core/content/editorial/reader-voice';
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
import { RelationEntryComponent } from '@shared/ui/relation-entry/relation-entry.component';

@Component({
  selector: 'app-record',
  imports: [
    RouterLink,
    AtlasLicensedAssetComponent,
    AtlasClaimReferencesComponent,
    EntityProfileComponent,
    NotFoundMessageComponent,
    RelationEntryComponent,
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
  readonly precisionLabel: Record<string, string> = {
    year: 'ano',
    approximate: 'data aproximada',
    range: 'intervalo',
    unknown: 'data desconhecida',
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
  /** The hero repeats the context only when it is prose and no section already carries it. */
  readonly heroContext = computed(() => {
    const entity = this.entity();
    const prose = readerProse(entity?.context);
    if (!entity || !prose || prose === entity.summary) return null;
    return entity.sections.some((section) => section.paragraphs.includes(prose)) ? null : prose;
  });
  /** Sections keep their source index, the public `section-N` anchor; ones equal to the lead or with only process notes are skipped. */
  readonly readableSections = computed(() => {
    const entity = this.entity();
    return (entity?.sections ?? [])
      .map((section, index) => ({
        index,
        section: {
          heading: section.heading,
          paragraphs: section.paragraphs.flatMap((paragraph) => readerProse(paragraph) ?? []),
        },
      }))
      .filter(
        ({ section }) =>
          section.paragraphs.length && section.paragraphs.join(' ') !== entity?.summary,
      );
  });
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
        ({
          'ideology-marxism': '/marxismo',
          'ideology-liberalism': '/liberalismo',
          'wiki-topic-social-democracia': '/social-democracia',
          'wiki-topic-anarquismo': '/anarquismo',
        }) as Record<string, string>
      )[this.entity()?.id ?? ''],
  );
  readonly claims = computed(() =>
    this.repository.knowledgeGraph.atlases.flatMap((atlas) =>
      atlas.claims
        .filter((c) => c.entityId === this.entity()?.id)
        .map((claim) => ({ claim, atlas })),
    ),
  );
  /** Connections by weight of evidence, each read as a sentence. */
  readonly connectionGroups = computed(() => relationGroups(this.context()?.connections ?? []));
  /** Editorial state as a discreet seal, away from the running text. */
  readonly seal = computed(() => {
    const context = this.context();
    return context ? editorialSeal(context) : '';
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
    const count = (label: string, total: number, target: string) => ({
      label,
      value: String(total),
      target: total ? target : undefined,
    });
    return [
      ...(period
        ? [
            {
              label: 'Período',
              value: period.label ?? this.precisionLabel[period.precision],
              target: undefined,
            },
          ]
        : []),
      count('Afirmações', this.claims().length, 'claims-title'),
      count('Conexões', this.context()?.connections.length ?? 0, 'connections-title'),
      count('Fontes', this.context()?.sources.length ?? 0, 'sources-title'),
    ];
  });
  readonly toc = computed(() => {
    const entity = this.entity();
    if (!entity) return [];
    return [
      ...this.readableSections().map(({ section, index }) => ({
        id: 'section-' + index,
        label: section.heading,
      })),
      { id: 'claims-title', label: 'Afirmações e evidências' },
      { id: 'connections-title', label: 'Como se liga às demais' },
      { id: 'sources-title', label: 'Fontes e licença' },
    ];
  });
  readonly consulted = readerDate;
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
