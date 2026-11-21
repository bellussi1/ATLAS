import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { IdeologyReadingSection } from '@ideologies/models/ideology-reading-section';
import { AtlasIconComponent } from '@shared/ui/icon/icon.component';

const sheetStateKey = 'atlasReadingSheet';

@Component({
  selector: 'app-ideology-reading-index',
  imports: [AtlasIconComponent, NgTemplateOutlet],
  templateUrl: './reading-index.component.html',
  styleUrl: './reading-index.component.scss',
})
export class IdeologyReadingIndexComponent {
  readonly sections = input<readonly IdeologyReadingSection[]>([]);
  readonly active = input('');
  readonly progress = input(0);
  readonly tone = input(0);
  readonly reducedMotion = input(false);
  readonly hasPrevious = input(false);

  /** Consecutive sections sharing a group; ungrouped sections form an unlabeled run. */
  readonly groups = computed(() =>
    this.sections().reduce<
      { label: string; items: { section: IdeologyReadingSection; index: number }[] }[]
    >((groups, section, index) => {
      const label = section.group ?? '';
      const last = groups.at(-1);
      if (last && last.label === label) last.items.push({ section, index });
      else groups.push({ label, items: [{ section, index }] });
      return groups;
    }, []),
  );

  /** Where the reader is, and the chapters on either side of it. */
  readonly position = computed(() => {
    const sections = this.sections();
    const found = sections.findIndex((s) => s.anchor === this.active());
    const index = Math.max(0, found);
    return {
      index,
      total: sections.length,
      current: sections[index] as IdeologyReadingSection | undefined,
      previous: index > 0 ? sections[index - 1] : undefined,
      next: index < sections.length - 1 ? sections[index + 1] : undefined,
    };
  });

  readonly chapterSelected = output<string>();
  readonly previousRequested = output<void>();
  readonly motionToggleRequested = output<void>();

  protected readonly sheetOpen = signal(false);
  private afterClose: (() => void) | null = null;
  private closedByHistory = false;
  private readonly view = inject(DOCUMENT).defaultView;
  private readonly desktopList = viewChild<ElementRef<HTMLElement>>('desktopList');
  private readonly injector = inject(Injector);
  private readonly sheet = viewChild<ElementRef<HTMLDialogElement>>('sheet');

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const doc = inject(DOCUMENT);
    const view = doc.defaultView;

    // The sidebar scrolls itself, so the current chapter must stay inside its viewport.
    effect(() => {
      this.active();
      const list = this.desktopList()?.nativeElement;
      if (list) this.revealCurrent(list);
    });

    // A tap on the dimmed area outside the sheet dismisses it.
    effect((onCleanup) => {
      const dialog = this.sheet()?.nativeElement;
      if (!dialog) return;
      const dismiss = (event: Event) => {
        if (event.target === dialog) this.closeSheet();
      };
      dialog.addEventListener('click', dismiss);
      onCleanup(() => dialog.removeEventListener('click', dismiss));
    });

    // On phones the index is a sticky bar below the site header: chapters scroll under it.
    if (!view?.ResizeObserver) return;
    const compact = view.matchMedia('(max-width: 900px)');
    const sync = () => {
      if (compact.matches) {
        // The consumers use this as a scroll margin, so it covers the header gap and the bar.
        doc.documentElement.style.setProperty(
          '--reading-bar-h',
          `calc(var(--header-offset, 0px) - 0.5rem + ${element.offsetHeight}px)`,
        );
      } else {
        doc.documentElement.style.removeProperty('--reading-bar-h');
        this.closeSheet();
      }
    };
    const observer = new view.ResizeObserver(sync);
    observer.observe(element);
    compact.addEventListener('change', sync);
    sync();
    inject(DestroyRef).onDestroy(() => {
      observer.disconnect();
      compact.removeEventListener('change', sync);
      doc.documentElement.style.removeProperty('--reading-bar-h');
    });
  }

  openSheet(): void {
    const dialog = this.sheet()?.nativeElement;
    if (!dialog || dialog.open) return;
    // The list is rendered only while the sheet is open, so it is measured after that render.
    this.sheetOpen.set(true);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    // The browser's back gesture closes the sheet instead of leaving the page.
    const view = this.view;
    if (view) {
      view.history.pushState({ ...view.history.state, [sheetStateKey]: true }, '');
      view.addEventListener('popstate', this.onPopState);
    }
    afterNextRender(
      () => {
        const list = dialog.querySelector<HTMLElement>('.sheet-list');
        if (list) this.revealCurrent(list, true);
      },
      { injector: this.injector },
    );
  }

  closeSheet(): void {
    this.leaveSheet();
  }

  /** The dialog closed (button, Escape, backdrop, back gesture or a pick): settle state and history. */
  onSheetClosed(): void {
    this.sheetOpen.set(false);
    const view = this.view;
    const action = this.afterClose;
    this.afterClose = null;
    view?.removeEventListener('popstate', this.onPopState);
    if (view && !this.closedByHistory && view.history.state?.[sheetStateKey]) {
      // Drop the entry pushed on open; chained navigation waits until it is gone.
      if (action) view.addEventListener('popstate', action, { once: true });
      view.history.back();
      return;
    }
    this.closedByHistory = false;
    action?.();
  }

  followChapter(event: MouseEvent, anchor: string): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    this.leaveSheet(() => this.chapterSelected.emit(anchor));
  }

  goTo(anchor: string | undefined): void {
    if (!anchor) return;
    this.leaveSheet(() => this.chapterSelected.emit(anchor));
  }

  returnToPrevious(): void {
    this.leaveSheet(() => this.previousRequested.emit());
  }

  private readonly onPopState = (): void => {
    const dialog = this.sheet()?.nativeElement;
    if (!dialog?.open) return;
    this.closedByHistory = true;
    this.closeDialog(dialog);
  };

  private leaveSheet(action?: () => void): void {
    const dialog = this.sheet()?.nativeElement;
    if (!dialog?.open) {
      action?.();
      return;
    }
    this.afterClose = action ?? null;
    this.closeDialog(dialog);
  }

  private closeDialog(dialog: HTMLDialogElement): void {
    if (typeof dialog.close === 'function') dialog.close();
    else {
      dialog.removeAttribute('open');
      this.onSheetClosed();
    }
  }

  private revealCurrent(list: HTMLElement, center = false): void {
    const current = list.querySelector<HTMLElement>('[aria-current="location"]');
    if (!current || list.clientHeight === 0) return;
    const top = current.offsetTop - list.offsetTop;
    const bottom = top + current.offsetHeight;
    if (center) list.scrollTop = top - (list.clientHeight - current.offsetHeight) / 2;
    else if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight)
      list.scrollTop = bottom - list.clientHeight;
  }
}
