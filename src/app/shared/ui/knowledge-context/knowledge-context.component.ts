import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ContentMediaPipe } from '@core/content/media/content-media.pipe';
import {
  type ContextConnection,
  type ContextStop,
  type KnowledgeContext,
} from '@core/content/models/knowledge-context';
import { entityContext } from '@core/content/queries/entity-context';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { RecordCardComponent } from '@shared/ui/record-card/record-card.component';

import { keepScrollAnchor } from './keep-scroll';

/** How many earlier sheets stay visible behind the current one. */
const VISIBLE_SHEETS = 3;
/** Room for a pinned sheet beside the current one. */
const COMPARE = '(min-width: 72rem)';
/** Docked beside the page from this width; below it the panel is a full-width pane. */
const WIDE = '(min-width: 64rem)';

export interface ContextPanelData {
  record: KnowledgeContext;
  /** Reading order the previous and next buttons step through. */
  stops: ContextStop[];
  index: number;
}

function toneOf(kind: string): string {
  if (/^Pensador|^Pessoa/.test(kind)) return 'person';
  if (/^Obra|^Artigo/.test(kind)) return 'work';
  if (/^Conceito/.test(kind)) return 'concept';
  if (/^Acontecimento|^Lugar/.test(kind)) return 'event';
  if (/^Tradição|^Instituição|^Partido|^Regime|^País|^Governo/.test(kind)) return 'idea';
  return 'reading';
}

/**
 * Reading panel for a record. It sits at the side of the page and pushes the page aside
 * while open, so nothing is covered; on narrow screens it takes the full width. Following a
 * relation lays a new sheet on the pile; the button, Esc and the browser's back button lift
 * it again. Previous and next step through the reading order; one sheet can be pinned
 * to compare it with the next.
 */
@Component({
  selector: 'app-knowledge-context',
  imports: [RouterLink, RecordCardComponent, ContentMediaPipe],
  templateUrl: './knowledge-context.component.html',
  styleUrl: './knowledge-context.component.scss',
  host: {
    '[attr.data-tone]': 'tone()',
    '[style.--depth]': 'depth()',
    '[class.has-pinned]': '!!pinned()',
  },
})
export class KnowledgeContextComponent {
  private readonly initial = inject<ContextPanelData>(DIALOG_DATA);
  private readonly ref = inject(DialogRef);
  private readonly repository = inject(ContentRepository);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly window = inject(DOCUMENT).defaultView;
  /** Browser history entries this dialog added and has not yet consumed. */
  private pushed = 0;
  /** Pops triggered by the dialog itself, which the popstate listener must ignore. */
  private ownPops = 0;
  readonly record = signal(this.initial.record);
  readonly stops = signal(this.initial.stops);
  readonly index = signal(this.initial.index);
  /** Sheet kept open in its own column while the reader moves on to the next one. */
  readonly pinned = signal<KnowledgeContext | null>(null);
  readonly canCompare = signal(false);
  readonly history = signal<
    {
      record: KnowledgeContext;
      scroll: number;
      focusId: string;
      expanded: string[];
    }[]
  >([]);
  /** Colour family by record kind, so each opened context is recognisable at a glance. */
  readonly tone = computed(() => toneOf(this.record().kind));
  readonly pinnedTone = computed(() => toneOf(this.pinned()?.kind ?? ''));
  /** Where the reader is in the reading order; steps are hidden inside a followed relation. */
  readonly position = computed(() => {
    const total = this.stops().length;
    const at = this.index();
    return total > 1 && at >= 0 && !this.history().length
      ? { at: at + 1, total, hasPrevious: at > 0, hasNext: at < total - 1 }
      : null;
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
      attribution: record.media?.attribution ?? record.media?.creator,
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
      this.keepPlace();
      // The browser went back: lift sheets until the pile matches the restored entry.
      const target = Number(event.state?.atlasSheet ?? 0);
      this.pushed = target;
      while (this.history().length > target) this.lift();
    };
    this.window?.addEventListener('popstate', onPop);
    inject(DestroyRef).onDestroy(() => this.window?.removeEventListener('popstate', onPop));
    this.watchLayout();
  }

  /** Replaces what the open panel shows, as when another record is opened from the page. */
  show(record: KnowledgeContext, stops: ContextStop[], index: number): void {
    this.unwind(this.pushed);
    this.history.set([]);
    this.record.set(record);
    this.stops.set(stops);
    this.index.set(index);
    this.present(0);
  }
  /** Previous (-1) or next (+1) record in the reading order. */
  step(delta: -1 | 1): void {
    const at = this.index() + delta;
    const stop = this.stops()[at];
    if (!stop) return;
    const record =
      'record' in stop.request
        ? stop.request.record
        : entityContext(this.repository, stop.request.entityId);
    this.show(record, this.stops(), at);
  }
  pin(): void {
    this.pinned.set(this.record());
    this.present(0);
  }
  unpin(): void {
    this.pinned.set(null);
    this.present(0);
  }
  permanentPath(): string | undefined {
    return this.record().entityId
      ? this.repository.discoveryIndex.find((entry) => entry.id === this.record().entityId)?.path
      : undefined;
  }
  follow(connection: ContextConnection): void {
    const scroll = this.host.nativeElement.querySelector('.sheet .context-body')?.scrollTop ?? 0;
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

  /**
   * Keeps panel behaviour in step with the viewport: no focus trap or modal role while
   * docked, and the compare column only where it fits.
   */
  private watchLayout(): void {
    const win = this.window;
    if (!win?.matchMedia) return;
    const wide = win.matchMedia(WIDE);
    const compare = win.matchMedia(COMPARE);
    const sync = () => {
      this.canCompare.set(compare.matches);
      if (!compare.matches) this.pinned.set(null);
      const container = this.host.nativeElement.closest<HTMLElement>('.cdk-dialog-container');
      container?.setAttribute('aria-modal', String(!wide.matches));
      const trap = (this.ref as { containerInstance?: { _focusTrap?: { enabled: boolean } } })
        .containerInstance?._focusTrap;
      if (trap) trap.enabled = !wide.matches;
    };
    wide.addEventListener('change', sync);
    compare.addEventListener('change', sync);
    afterNextRender(sync, { injector: this.injector });
    const root = win.document.documentElement;
    effect(() =>
      root.style.setProperty('--atlas-panel-width', this.pinned() ? 'min(60rem, 62vw)' : ''),
    );
    inject(DestroyRef).onDestroy(() => {
      wide.removeEventListener('change', sync);
      compare.removeEventListener('change', sync);
      root.style.removeProperty('--atlas-panel-width');
    });
  }
  /** Keeps the reader's place in the page across the router's reaction to a history pop. */
  private keepPlace(): void {
    if (!this.window) return;
    const trigger = this.window.document.querySelector(
      '[data-context-trigger][aria-expanded="true"]',
    );
    keepScrollAnchor(this.router, this.window, trigger);
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
    this.keepPlace();
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
        const body = this.host.nativeElement.querySelector<HTMLElement>('.sheet .context-body');
        if (body) body.scrollTop = scroll;
        // The newest step is the last crumb; keep it in view when the trail overflows.
        const trail = this.host.nativeElement.querySelector<HTMLElement>('.context-trail');
        if (trail) trail.scrollLeft = trail.scrollWidth;
        const target = focusId
          ? this.host.nativeElement.querySelector<HTMLElement>(`[data-connection="${focusId}"]`)
          : this.host.nativeElement.querySelector<HTMLElement>('#knowledge-context-title');
        target?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }
}
