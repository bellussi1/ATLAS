import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  type ContextConnection,
  type KnowledgeContext,
} from '@core/content/models/knowledge-context';
import { entityContext } from '@core/content/queries/entity-context';
import { ContentRepository } from '@core/content/repositories/content-repository.service';

/** How many earlier sheets stay visible behind the current one. */
const VISIBLE_SHEETS = 3;

/**
 * Context sheet over the reading. Following a relation lays a new sheet on top of the
 * pile, slightly offset; the button, Esc and the browser's back button lift it again.
 */
@Component({
  selector: 'app-knowledge-context',
  imports: [RouterLink],
  templateUrl: './knowledge-context.component.html',
  styleUrl: './knowledge-context.component.scss',
  host: {
    '[attr.data-tone]': 'tone()',
    '[style.--depth]': 'depth()',
  },
})
export class KnowledgeContextComponent {
  private readonly initial = inject<KnowledgeContext>(DIALOG_DATA);
  private readonly ref = inject(DialogRef);
  private readonly repository = inject(ContentRepository);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly window = inject(DOCUMENT).defaultView;
  /** Browser history entries this dialog added and has not yet consumed. */
  private pushed = 0;
  /** Pops triggered by the dialog itself, which the popstate listener must ignore. */
  private ownPops = 0;
  readonly record = signal(this.initial);
  readonly history = signal<
    {
      record: KnowledgeContext;
      scroll: number;
      focusId: string;
      expanded: string[];
    }[]
  >([]);
  /** Colour family by record kind, so each opened context is recognisable at a glance. */
  readonly tone = computed(() => {
    const kind = this.record().kind;
    if (/^Pensador|^Pessoa/.test(kind)) return 'person';
    if (/^Obra|^Artigo/.test(kind)) return 'work';
    if (/^Conceito/.test(kind)) return 'concept';
    if (/^Acontecimento|^Lugar/.test(kind)) return 'event';
    if (/^Tradição|^Instituição|^Partido|^Regime|^País|^Governo/.test(kind)) return 'idea';
    return 'reading';
  });
  /** Where the reader came from: every step can be revisited without closing the dialog. */
  readonly trail = computed(() => this.history().map((step) => step.record.title));
  /** Earlier sheets drawn behind the current one, nearest last. */
  readonly pile = computed(() =>
    this.history()
      .slice(-VISIBLE_SHEETS)
      .map((step, i, all) => ({ title: step.record.title, offset: all.length - i })),
  );
  readonly depth = computed(() => Math.min(this.history().length, VISIBLE_SHEETS));
  /** First registered source and the license of the picture, for the sheet's footer. */
  readonly citation = computed(() => {
    const record = this.record();
    const source = record.sources[0] ?? record.connections[0]?.relation?.references[0]?.source;
    const provenance = record.connections.find((c) => c.relation?.provenance)?.relation?.provenance;
    return {
      source,
      extra: Math.max(0, record.sources.length - 1),
      license: record.media?.license,
      licenseUrl: record.media?.licenseUrl,
      checkUrl: source?.url ?? provenance?.url ?? record.media?.filePageUrl ?? null,
    };
  });

  constructor() {
    this.ref.keydownEvents?.subscribe((event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (this.history().length) this.back();
      else this.close();
    });
    this.ref.backdropClick?.subscribe(() => this.close());
    const onPop = (event: PopStateEvent) => {
      if (this.ownPops) {
        this.ownPops--;
        return;
      }
      // Back past the first sheet leaves the dialog, as the router would have.
      if (!this.history().length) {
        this.ref.close();
        return;
      }
      // The browser went back: lift sheets until the pile matches the restored entry.
      const target = Number(event.state?.atlasSheet ?? 0);
      this.pushed = target;
      while (this.history().length > target) this.lift();
    };
    this.window?.addEventListener('popstate', onPop);
    inject(DestroyRef).onDestroy(() => this.window?.removeEventListener('popstate', onPop));
  }
  permanentPath(): string | undefined {
    return this.record().entityId
      ? this.repository.discoveryIndex.find((entry) => entry.id === this.record().entityId)?.path
      : undefined;
  }
  follow(connection: ContextConnection): void {
    const scroll = this.host.nativeElement.querySelector('.context-body')?.scrollTop ?? 0;
    this.history.update((items) => [
      ...items,
      {
        record: this.record(),
        scroll,
        focusId: connection.id ?? connection.entityId,
        expanded: Array.from(
          this.host.nativeElement.querySelectorAll<HTMLDetailsElement>(
            'details[open][data-relation]',
          ),
        ).map((details) => details.dataset['relation']!),
      },
    ]);
    this.record.set(entityContext(this.repository, connection.entityId));
    this.pushed++;
    this.window?.history.pushState(
      { ...this.window.history.state, atlasSheet: this.history().length },
      '',
    );
    this.present(0);
  }
  backTo(index: number): void {
    const steps = this.history().length - index;
    while (this.history().length > index) this.lift();
    this.unwind(steps);
  }
  back(): void {
    if (!this.history().length) return;
    this.lift();
    this.unwind(1);
  }
  /** Closes the pile and drops the browser entries it added. */
  close(): void {
    this.unwind(this.pushed);
    this.ref.close();
  }
  /** Leaves through a link: the router navigation replaces the sheets' entries. */
  leave(): void {
    this.ref.close();
  }

  statusLabel(status: KnowledgeContext['editorialStatus']): string {
    switch (status) {
      case 'pending':
        return 'Revisão editorial pendente';
      case 'draft':
        return 'Rascunho';
      case 'verified':
        return 'Marcado como verificado';
      case 'contested':
        return 'Contestado';
      case 'needs-update':
        return 'Precisa de atualização';
      default:
        return 'Estado editorial não informado';
    }
  }

  relationKind(connection: ContextConnection): string {
    switch (connection.relation?.type) {
      case 'encyclopedic-link':
        return 'Descoberta enciclopédica';
      case 'editorial-link':
        return 'Vínculo editorial';
      case 'documented-association':
        return 'Associação documentada';
      case 'influence':
      case 'influenced':
      case 'influenced_by':
        return 'Influência registrada';
      case 'reacted_against':
        return 'Divergência registrada';
      default:
        return 'Relação registrada';
    }
  }

  uncertaintyLabel(value: NonNullable<ContextConnection['relation']>['uncertainty']): string {
    return { low: 'baixa', moderate: 'moderada', high: 'alta', unknown: 'não determinada' }[value];
  }

  private lift(): void {
    const previous = this.history().at(-1);
    if (!previous) return;
    this.record.set(previous.record);
    this.history.update((items) => items.slice(0, -1));
    this.present(previous.scroll, previous.focusId, previous.expanded);
  }
  private unwind(steps: number): void {
    const count = Math.min(steps, this.pushed);
    if (!count || !this.window) return;
    this.pushed -= count;
    this.ownPops++;
    this.window.history.go(-count);
  }

  private present(scroll: number, focusId?: string, expanded: string[] = []): void {
    afterNextRender(
      () => {
        this.host.nativeElement
          .querySelectorAll<HTMLDetailsElement>('details[data-relation]')
          .forEach((details) => {
            details.open = expanded.includes(details.dataset['relation']!);
          });
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
