import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  afterNextRender,
  Component,
  Directive,
  ElementRef,
  HostListener,
  inject,
  Injector,
  input,
  signal,
} from '@angular/core';

import { ContentRepository } from '../core/content-repository';
import type { AssetLicense, Source } from '../core/content-schema';
import { reproducibleAsset } from './licensed-asset';

export interface KnowledgeContext {
  title: string;
  kind: string;
  summary: string;
  paragraphs: string[];
  sources: Source[];
  connections: { entityId: string; label: string }[];
  media?: AssetLicense;
}
export type ContextRequest = { entityId: string } | { record: KnowledgeContext };

export function entityContext(repository: ContentRepository, id: string): KnowledgeContext {
  const graph = repository.knowledgeGraph;
  const atlas = graph.atlases.find((a) => a.entities.some((e) => e.id === id));
  const entity = atlas?.entities.find((e) => e.id === id);
  if (!entity || !atlas)
    return {
      title: 'Registro indisponível',
      kind: 'Acervo',
      summary: 'Este contexto não foi encontrado.',
      paragraphs: [],
      sources: [],
      connections: [],
    };
  const labels: Record<string, string> = {
    person: 'Pensador',
    concept: 'Conceito',
    ideology: 'Tradição / ideia',
    work: 'Obra',
    event: 'Acontecimento',
    institution: 'Instituição',
  };
  const sources = graph.atlases.flatMap((a) => a.sources);
  const evidenceIds = graph.atlases
    .flatMap((a) => a.claims.filter((c) => c.entityId === id).flatMap((c) => c.citationIds))
    .flatMap(
      (citationId) =>
        graph.atlases.flatMap((a) => a.citations).find((c) => c.id === citationId)?.evidenceId ??
        [],
    );
  const sourceIds = graph.atlases.flatMap((a) =>
    a.evidences.filter((e) => evidenceIds.includes(e.id)).map((e) => e.sourceId),
  );
  const references = sources.filter((s) => sourceIds.includes(s.id));
  if (entity.discoveryMetadata)
    references.push({
      id: 'context-origin',
      title: entity.discoveryMetadata.attribution,
      url: entity.discoveryMetadata.wikipediaUrl,
      edition: entity.discoveryMetadata.contentLicense,
      publicationDate: null,
    });
  const connections = [
    ...new Map(
      graph.atlases
        .flatMap((a) => a.relations)
        .filter((r) => r.fromEntityId === id || r.toEntityId === id)
        .map((r) => {
          const target = r.fromEntityId === id ? r.toEntityId : r.fromEntityId;
          const title = graph.atlases
            .flatMap((a) => a.entities)
            .find((e) => e.id === target)?.title;
          return [
            target,
            {
              entityId: target,
              label: `${title ?? target} · ${r.type === 'encyclopedic-link' ? 'descoberta enciclopédica' : 'relação registrada, em revisão'}`,
            },
          ];
        }),
    ).values(),
  ].slice(0, 8);
  const asset =
    atlas.assetLicenses.find((a) => a.entityId === id) ??
    atlas.assetLicenses.find(
      (a) =>
        (id === 'person-karl-marx' && a.id === 'asset-marx-portrait') ||
        (id === 'person-adam-smith' && a.id === 'asset-smith-portrait'),
    );
  return {
    title: entity.title,
    kind: labels[entity.kind] ?? 'Registro',
    summary: entity.summary,
    paragraphs: [entity.context, ...entity.sections.flatMap((s) => s.paragraphs)],
    sources: references,
    connections,
    media: asset && reproducibleAsset(atlas, asset.assetPath),
  };
}

@Component({
  selector: 'app-knowledge-context',
  template: `
    <header>
      <div>
        <p>{{ record().kind }} · contexto em revisão</p>
        <h2 id="knowledge-context-title" tabindex="-1">{{ record().title }}</h2>
      </div>
      <button type="button" (click)="close()" aria-label="Fechar contexto">Fechar ×</button>
    </header>
    <div class="context-body">
      @if (history().length) {
        <button type="button" class="context-back" (click)="back()">← Contexto anterior</button>
      }
      @if (record().media; as media) {
        <figure>
          <img
            [src]="media.assetPath"
            [alt]="'Imagem associada a ' + record().title"
            width="480"
            height="480"
          />
          <figcaption>
            {{ media.attribution ?? media.creator }} ·
            <a [href]="media.filePageUrl ?? media.licenseUrl">{{ media.license }}</a>
          </figcaption>
        </figure>
      }
      <p class="context-summary">{{ record().summary }}</p>
      @for (paragraph of record().paragraphs; track $index) {
        <p>{{ paragraph }}</p>
      }
      @if (record().connections.length) {
        <section aria-label="Conexões deste contexto">
          <h3>Continue por uma conexão</h3>
          <p>
            Os vínculos importados são caminhos de investigação; não comprovam influência por si
            sós.
          </p>
          <div class="context-connections">
            @for (connection of record().connections; track connection.entityId) {
              <button
                type="button"
                [attr.data-connection]="connection.entityId"
                (click)="follow(connection.entityId)"
              >
                {{ connection.label }} <span aria-hidden="true">↗</span>
              </button>
            }
          </div>
        </section>
      }
      <section aria-label="Fontes do contexto">
        <h3>Fontes e proveniência</h3>
        @for (source of record().sources; track source.id) {
          <p>
            <a [href]="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }}</a
            ><small>{{ source.edition }}</small>
          </p>
        } @empty {
          <p>
            Não há referência específica registrada neste recorte. Não tratar o resumo como
            afirmação validada.
          </p>
        }
      </section>
    </div>
  `,
  styleUrl: './knowledge-context.scss',
})
export class KnowledgeContextComponent {
  private readonly initial = inject<KnowledgeContext>(DIALOG_DATA);
  private readonly ref = inject(DialogRef);
  private readonly repository = inject(ContentRepository);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  readonly record = signal(this.initial);
  readonly history = signal<{ record: KnowledgeContext; scroll: number; focusId: string }[]>([]);
  follow(id: string): void {
    const scroll = this.host.nativeElement.querySelector('.context-body')?.scrollTop ?? 0;
    this.history.update((items) => [...items, { record: this.record(), scroll, focusId: id }]);
    this.record.set(entityContext(this.repository, id));
    this.present(0);
  }
  back(): void {
    const previous = this.history().at(-1);
    if (previous) {
      this.record.set(previous.record);
      this.history.update((items) => items.slice(0, -1));
      this.present(previous.scroll, previous.focusId);
    }
  }
  close(): void {
    this.ref.close();
  }

  private present(scroll: number, focusId?: string): void {
    afterNextRender(
      () => {
        const body = this.host.nativeElement.querySelector<HTMLElement>('.context-body');
        if (body) body.scrollTop = scroll;
        const target = focusId
          ? this.host.nativeElement.querySelector<HTMLElement>(`[data-connection="${focusId}"]`)
          : this.host.nativeElement.querySelector<HTMLElement>('h2');
        target?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }
}

@Directive({
  selector: 'button[appKnowledgeContext]',
  host: {
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'expanded()',
    '[class.is-expanded]': 'expanded()',
  },
})
export class KnowledgeContextDirective {
  readonly request = input.required<ContextRequest>({ alias: 'appKnowledgeContext' });
  readonly expanded = signal(false);
  private readonly dialog = inject(Dialog);
  private readonly repository = inject(ContentRepository);
  @HostListener('click', ['$event'])
  open(event: MouseEvent): void {
    const request = this.request();
    const record =
      'record' in request ? request.record : entityContext(this.repository, request.entityId);
    this.expanded.set(true);
    const ref = this.dialog.open(KnowledgeContextComponent, {
      data: record,
      ariaLabelledBy: 'knowledge-context-title',
      autoFocus: 'first-tabbable',
      restoreFocus: event.currentTarget as HTMLElement,
      width: 'min(56rem, calc(100vw - 2rem))',
      height: 'min(44rem, calc(100dvh - 2rem))',
      panelClass: event.detail ? 'atlas-context-panel' : 'atlas-context-panel--instant',
    });
    ref.closed.subscribe(() => this.expanded.set(false));
  }
}
