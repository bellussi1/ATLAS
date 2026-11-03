import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';

export interface SelectMenuOption {
  value: string;
  label: string;
  count?: number;
}

let nextId = 0;

/** Single choice menu in the editorial style. Follows the ARIA listbox pattern for keyboard use. */
@Component({
  selector: 'app-select-menu',
  templateUrl: './select-menu.component.html',
  styleUrl: './select-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectMenuComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly items = viewChildren<ElementRef<HTMLLIElement>>('item');
  protected readonly triggerId = `select-menu-${++nextId}`;

  /** Id of the visible label, used as the accessible name together with the value. */
  readonly labelledBy = input.required<string>();
  readonly options = input.required<readonly SelectMenuOption[]>();
  readonly value = input('');
  readonly changed = output<string>();

  protected readonly open = signal(false);
  protected readonly activeIndex = signal(0);
  protected readonly selected = computed(
    () => this.options().find((option) => option.value === this.value()) ?? this.options()[0],
  );

  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: EventTarget | null): void {
    if (this.open() && !this.host.nativeElement.contains(target as Node)) this.open.set(false);
  }

  protected toggle(): void {
    if (this.open()) this.close(false);
    else this.openMenu();
  }

  protected onTriggerKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.openMenu();
    }
  }

  protected onListKey(event: KeyboardEvent): void {
    const last = this.options().length - 1;
    const move = (index: number) => {
      event.preventDefault();
      this.activeIndex.set(index);
      this.items()[index]?.nativeElement.focus();
    };
    switch (event.key) {
      case 'ArrowDown':
        move(Math.min(this.activeIndex() + 1, last));
        break;
      case 'ArrowUp':
        move(Math.max(this.activeIndex() - 1, 0));
        break;
      case 'Home':
        move(0);
        break;
      case 'End':
        move(last);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.choose(this.activeIndex());
        break;
      case 'Escape':
        event.preventDefault();
        this.close(true);
        break;
      case 'Tab':
        this.close(false);
        break;
    }
  }

  protected choose(index: number): void {
    const option = this.options()[index];
    this.close(true);
    if (option && option.value !== this.value()) this.changed.emit(option.value);
  }

  private openMenu(): void {
    const index = this.options().findIndex((option) => option.value === this.value());
    this.activeIndex.set(Math.max(index, 0));
    this.open.set(true);
    afterNextRender(() => this.items()[this.activeIndex()]?.nativeElement.focus(), {
      injector: this.injector,
    });
  }

  private close(returnFocus: boolean): void {
    this.open.set(false);
    if (returnFocus) this.trigger().nativeElement.focus();
  }
}
