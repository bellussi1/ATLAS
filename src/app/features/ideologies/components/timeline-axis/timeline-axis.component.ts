import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  type ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  axisTicks,
  chronological,
  fullRange,
  itemsInRange,
  layoutTimeline,
  neighbourTrack,
  ROW_PX,
  type TimelineAxisItem,
  type TimelineAxisRange,
} from '@ideologies/utils/timeline-axis-layout';
import { centuryLabel } from '@ideologies/utils/timeline-periods';
import { prefersReducedMotion } from '@shared/motion/prefers-reduced-motion';
import {
  contextKey,
  ContextPanelService,
} from '@shared/ui/knowledge-context/context-panel.service';

const ZOOM_STEP = 1.6;
const MAX_PX_PER_YEAR = 96;
/** Below this the labels pile into too many rows, so a narrow screen scrolls instead of squeezing. */
const MIN_PX_PER_YEAR = 3;
const DRAG_THRESHOLD = 5;
const HEADER_PX = 28;
const AXIS_PX = 44;
const BRUSH_MIN_PX = 8;
const LIST_PREVIEW = 8;

let nextAxisId = 0;

/**
 * Horizontal time axis: dated records in one track per kind, lives as bars and approximate
 * dates drawn dashed. The scale is a cut (century or free interval) that can be zoomed and
 * panned; a pick is reported to the parent, which owns the shared reading panel.
 */
@Component({
  selector: 'app-timeline-axis',
  imports: [],
  templateUrl: './timeline-axis.component.html',
  styleUrl: './timeline-axis.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineAxisComponent {
  private readonly document = inject(DOCUMENT);
  private readonly panel = inject(ContextPanelService);
  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');
  readonly items = input.required<readonly TimelineAxisItem[]>();
  readonly selectedId = input<string | null>(null);
  /** Records that exist but carry no usable date; said aloud, never placed. */
  readonly undated = input(0);
  readonly picked = output<string>();

  readonly uid = `timeline-axis-${nextAxisId++}`;
  readonly rowPx = ROW_PX;
  readonly headerPx = HEADER_PX;
  readonly axisPx = AXIS_PX;
  /** Cut chosen by the reader; null shows everything. */
  readonly cut = signal<TimelineAxisRange | null>(null);
  readonly zoom = signal(0);
  readonly viewport = signal(640);
  readonly scrollLeft = signal(0);
  readonly dragging = signal(false);
  readonly announcement = signal('');
  readonly listExpanded = signal(false);
  readonly fromField = signal('');
  readonly toField = signal('');
  readonly fieldError = signal('');
  /** Span being chosen on the ruler, in years; anchor first, cursor second. */
  readonly brush = signal<{ anchor: number; cursor: number } | null>(null);
  /** Year under the keyboard cursor of the ruler; null until the ruler is focused. */
  readonly rulerYear = signal<number | null>(null);

  readonly full = computed(() => fullRange(this.items()));
  readonly range = computed(() => this.cut() ?? this.full());
  readonly visible = computed(() => chronological(itemsInRange(this.items(), this.range())));
  readonly fitPx = computed(() =>
    Math.max(MIN_PX_PER_YEAR, this.viewport() / (this.range().to - this.range().from)),
  );
  readonly pxPerYear = computed(() =>
    Math.min(MAX_PX_PER_YEAR, Math.max(this.fitPx(), this.fitPx() * ZOOM_STEP ** this.zoom())),
  );
  readonly maxZoom = computed(() =>
    Math.max(0, Math.floor(Math.log(MAX_PX_PER_YEAR / this.fitPx()) / Math.log(ZOOM_STEP))),
  );
  readonly layout = computed(() => layoutTimeline(this.visible(), this.range(), this.pxPerYear()));
  readonly ticks = computed(() => axisTicks(this.range(), this.pxPerYear()));
  readonly centuries = computed(() => {
    const seen = new Map<string, { label: string; from: number; to: number; count: number }>();
    for (const item of chronological(this.items())) {
      const label = centuryLabel(item.start);
      const century = Math.ceil(item.start / 100);
      const entry = seen.get(label) ?? {
        label,
        from: (century - 1) * 100 + 1,
        to: century * 100,
        count: 0,
      };
      entry.count++;
      seen.set(label, entry);
    }
    return [...seen.values()];
  });
  readonly selectedItem = computed(() => this.items().find((i) => i.id === this.selectedId()));
  readonly selectedIndex = computed(() =>
    this.visible().findIndex((i) => i.id === this.selectedId()),
  );
  /** The marker holding the tab stop: the selected one, or the first when it is out of the cut. */
  readonly tabStopId = computed(() =>
    this.selectedIndex() >= 0 ? this.selectedId() : (this.visible()[0]?.id ?? null),
  );
  /** Top of each track, in px, below the year ruler. */
  readonly trackTops = computed(() => {
    let top = AXIS_PX;
    return this.layout().tracks.map((track) => {
      const start = top;
      top += HEADER_PX + track.rows * ROW_PX + 6;
      return start;
    });
  });
  readonly innerHeight = computed(() => {
    const tracks = this.layout().tracks;
    const last = tracks.length - 1;
    return last < 0
      ? AXIS_PX
      : this.trackTops()[last]! + HEADER_PX + tracks[last]!.rows * ROW_PX + 6;
  });
  readonly thumb = computed(() => {
    const total = this.layout().width;
    const view = Math.min(this.viewport(), total);
    return {
      size: (view / total) * 100,
      offset: total > view ? (this.scrollLeft() / total) * 100 : 0,
    };
  });
  readonly scrollable = computed(() => this.layout().width > this.viewport() + 1);
  readonly shownList = computed(() => {
    const list = this.visible();
    if (this.listExpanded() || list.length <= LIST_PREVIEW) return list;
    const head = list.slice(0, LIST_PREVIEW);
    const selected = this.visible()[this.selectedIndex()];
    return selected && !head.some((i) => i.id === selected.id) ? [...head, selected] : head;
  });
  readonly summary = computed(() => {
    const item = this.selectedItem();
    const index = this.selectedIndex();
    if (!item) return 'Nenhum registro selecionado.';
    const years = item.start === item.end ? `${item.start}` : `${item.start}–${item.end}`;
    const place = index >= 0 ? `, ${index + 1} de ${this.visible().length} no recorte` : '';
    return `${item.title}, ${item.approximate ? 'c. ' : ''}${years}${place}`;
  });
  readonly cutLabel = computed(() => {
    const cut = this.cut();
    return cut ? `${cut.from} a ${cut.to}` : 'toda a linha do tempo';
  });

  readonly brushBox = computed(() => {
    const brush = this.brush();
    if (!brush) return null;
    const from = Math.min(brush.anchor, brush.cursor);
    const to = Math.max(brush.anchor, brush.cursor);
    return {
      left: (from - this.range().from) * this.pxPerYear(),
      width: (to - from) * this.pxPerYear(),
      label: `${Math.round(from)}–${Math.round(to)}`,
    };
  });

  private drag: { pointer: number; startX: number; startLeft: number; moved: boolean } | null =
    null;
  private suppressClick = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const el = this.scroller().nativeElement;
      const view = this.document.defaultView;
      this.viewport.set(Math.max(240, el.clientWidth));
      if (view?.ResizeObserver) {
        const observer = new view.ResizeObserver(() =>
          this.viewport.set(Math.max(240, el.clientWidth)),
        );
        observer.observe(el);
        destroyRef.onDestroy(() => observer.disconnect());
      }
      const swallow = (event: Event) => {
        if (!this.suppressClick) return;
        this.suppressClick = false;
        event.stopPropagation();
        event.preventDefault();
      };
      el.addEventListener('click', swallow, true);
      destroyRef.onDestroy(() => el.removeEventListener('click', swallow, true));
    });
  }

  /** A pick from a marker or a list row; the parent decides what the pick opens. */
  pick(id: string): void {
    this.picked.emit(id);
    this.reveal(id);
  }

  /**
   * Selects a record and opens the shared reading panel on it. The panel walks the records of
   * the cut in time order, whichever track or list row the pick came from.
   */
  open(id: string, event: Event): void {
    this.pick(id);
    const stops = this.visible().map((item) => {
      const request = { entityId: item.id };
      return { key: contextKey(request), request };
    });
    this.panel.open({ entityId: id }, event.currentTarget as HTMLElement, stops);
  }

  onScroll(): void {
    this.scrollLeft.set(this.scroller().nativeElement.scrollLeft);
  }

  setZoom(level: number): void {
    const next = Math.min(this.maxZoom(), Math.max(0, level));
    if (next === this.zoom()) return;
    const el = this.scroller().nativeElement;
    const before = this.pxPerYear();
    const centreYear = this.range().from + (el.scrollLeft + el.clientWidth / 2) / before;
    this.zoom.set(next);
    const after = this.pxPerYear();
    this.scrollTo(Math.max(0, (centreYear - this.range().from) * after - el.clientWidth / 2), true);
    this.announce(
      `Ampliação ${next} de ${this.maxZoom()}: ${this.visible().length} registros em ${this.cutLabel()}.`,
    );
  }

  /** Century chip or "Tudo": changes the cut and starts again at the widest zoom. */
  setCut(range: TimelineAxisRange | null): void {
    this.cut.set(range);
    this.zoom.set(0);
    this.listExpanded.set(false);
    this.fromField.set(range ? `${range.from}` : '');
    this.toField.set(range ? `${range.to}` : '');
    this.fieldError.set('');
    this.scrollTo(0, false);
    this.announce(`Recorte ${this.cutLabel()}: ${this.visible().length} registros.`);
  }

  applyFields(): void {
    const from = Number.parseInt(this.fromField() || `${this.range().from}`, 10);
    const to = Number.parseInt(this.toField() || `${this.range().to}`, 10);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) {
      this.fieldError.set('Informe dois anos, o primeiro anterior ao segundo.');
      return;
    }
    this.setCut({ from, to });
  }

  isCut(from: number, to: number): boolean {
    const cut = this.cut();
    return cut?.from === from && cut.to === to;
  }

  /** Keyboard on markers: time order, tracks, ends. Moving selects and keeps focus. */
  onKey(event: KeyboardEvent, id: string): void {
    const list = this.visible();
    const index = list.findIndex((i) => i.id === id);
    let target: TimelineAxisItem | null | undefined;
    switch (event.key) {
      case 'ArrowRight':
        target = list[index + 1];
        break;
      case 'ArrowLeft':
        target = list[index - 1];
        break;
      case 'ArrowDown':
        target = neighbourTrack(list, id, 1);
        break;
      case 'ArrowUp':
        target = neighbourTrack(list, id, -1);
        break;
      case 'Home':
        target = list[0];
        break;
      case 'End':
        target = list.at(-1);
        break;
      default:
        return;
    }
    event.preventDefault();
    if (!target) return;
    this.pick(target.id);
    this.focusMarker(target.id);
  }

  step(delta: 1 | -1): void {
    const list = this.visible();
    const from = this.selectedIndex() < 0 ? (delta > 0 ? -1 : list.length) : this.selectedIndex();
    const target = list[Math.min(list.length - 1, Math.max(0, from + delta))];
    if (!target) return;
    this.pick(target.id);
  }

  /** Brings a record into view when it sits near or past a side edge of the axis. */
  reveal(id: string): void {
    const tracks = this.layout().tracks;
    const placed = tracks.flatMap((t) => t.items).find((p) => p.item.id === id);
    if (!placed) return;
    const el = this.scroller().nativeElement;
    const centre = placed.left + placed.markerX;
    const margin = 48;
    if (centre < el.scrollLeft + margin || centre > el.scrollLeft + el.clientWidth - margin)
      this.scrollTo(Math.max(0, centre - el.clientWidth / 2), true);
  }

  onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'touch' || event.button !== 0) return;
    this.drag = {
      pointer: event.pointerId,
      startX: event.clientX,
      startLeft: this.scroller().nativeElement.scrollLeft,
      moved: false,
    };
  }
  onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.pointer !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
    if (!drag.moved) {
      drag.moved = true;
      this.dragging.set(true);
      this.scroller().nativeElement.setPointerCapture(event.pointerId);
    }
    this.scroller().nativeElement.scrollLeft = drag.startLeft - dx;
  }
  onPointerEnd(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.pointer !== event.pointerId) return;
    if (drag.moved) this.suppressClick = true;
    this.drag = null;
    this.dragging.set(false);
  }

  /** Mouse, pen or finger dragged across the ruler picks a span of years to cut to. */
  onRulerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.stopPropagation();
    const year = this.yearAt(event);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.brush.set({ anchor: year, cursor: year });
  }
  onRulerMove(event: PointerEvent): void {
    const brush = this.brush();
    if (brush) this.brush.set({ ...brush, cursor: this.yearAt(event) });
  }
  onRulerUp(event: PointerEvent): void {
    const brush = this.brush();
    if (!brush) return;
    this.brush.set(null);
    if (Math.abs(brush.cursor - brush.anchor) * this.pxPerYear() >= BRUSH_MIN_PX)
      this.cutBetween(brush.anchor, this.yearAt(event));
  }

  /** The same cut from the keyboard: arrows move, Enter marks the start and then applies, Esc cancels. */
  onRulerKey(event: KeyboardEvent): void {
    const brush = this.brush();
    const year = this.rulerYear() ?? Math.round((this.range().from + this.range().to) / 2);
    const step = Math.max(1, Math.round(24 / this.pxPerYear())) * (event.shiftKey ? 5 : 1);
    const move = (to: number) => {
      const next = Math.min(this.range().to, Math.max(this.range().from, to));
      this.rulerYear.set(next);
      if (brush) this.brush.set({ ...brush, cursor: next });
      this.announce(`${next}${brush ? `, trecho de ${brush.anchor} a ${next}` : ''}`);
    };
    if (event.key === 'ArrowRight') move(year + step);
    else if (event.key === 'ArrowLeft') move(year - step);
    else if (event.key === 'Escape' && brush) this.brush.set(null);
    else if (event.key === 'Enter' || event.key === ' ') {
      if (!brush) {
        this.brush.set({ anchor: year, cursor: year });
        this.announce(`Início em ${year}. Mova com as setas e confirme com Enter.`);
      } else {
        this.brush.set(null);
        if (brush.cursor !== brush.anchor) this.cutBetween(brush.anchor, brush.cursor);
      }
    } else return;
    event.preventDefault();
  }

  /** Pans by most of a screen, for the buttons beside the position bar. */
  pan(direction: 1 | -1): void {
    const el = this.scroller().nativeElement;
    this.scrollTo(Math.max(0, el.scrollLeft + direction * el.clientWidth * 0.8), true);
  }

  private yearAt(event: PointerEvent): number {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.min(box.width, Math.max(0, event.clientX - box.left));
    return this.range().from + x / this.pxPerYear();
  }

  private cutBetween(a: number, b: number): void {
    const from = Math.round(Math.min(a, b));
    this.setCut({ from, to: Math.max(from + 1, Math.round(Math.max(a, b))) });
  }

  private focusMarker(id: string): void {
    this.reveal(id);
    queueMicrotask(() =>
      this.scroller().nativeElement.querySelector<HTMLElement>(`[data-axis-id="${id}"]`)?.focus(),
    );
  }

  private scrollTo(left: number, smooth: boolean): void {
    const el = this.scroller().nativeElement;
    const behavior = smooth && !prefersReducedMotion(this.document) ? 'smooth' : 'auto';
    // The new width lands with the next render, so wait for it before moving.
    const move = () => {
      if (typeof el.scrollTo === 'function') el.scrollTo({ left, behavior });
      else el.scrollLeft = left;
    };
    const view = this.document.defaultView;
    if (view?.requestAnimationFrame) view.requestAnimationFrame(move);
    else move();
  }

  private announce(text: string): void {
    this.announcement.set('');
    queueMicrotask(() => this.announcement.set(text));
  }
}
