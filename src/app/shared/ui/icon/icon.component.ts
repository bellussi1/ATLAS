import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideArrowUpRight,
  LucideCheck,
  LucideChevronDown,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronUp,
  LucideDynamicIcon,
  LucideMaximize2,
  LucideMenu,
  LucideMinus,
  LucidePlus,
  LucideSearch,
  LucideShuffle,
  LucideX,
} from '@lucide/angular';

/**
 * The interface vocabulary: every arrow, close, plus/minus or search glyph goes through
 * this set instead of a text character. Add a name here before using a new icon.
 */
const icons = {
  'arrow-left': LucideArrowLeft.icon,
  'arrow-right': LucideArrowRight.icon,
  external: LucideArrowUpRight.icon,
  check: LucideCheck.icon,
  'chevron-down': LucideChevronDown.icon,
  'chevron-left': LucideChevronLeft.icon,
  'chevron-right': LucideChevronRight.icon,
  'chevron-up': LucideChevronUp.icon,
  expand: LucideMaximize2.icon,
  menu: LucideMenu.icon,
  minus: LucideMinus.icon,
  plus: LucidePlus.icon,
  search: LucideSearch.icon,
  shuffle: LucideShuffle.icon,
  close: LucideX.icon,
} as const;

export type AtlasIconName = keyof typeof icons;

/**
 * Lucide icon at text size with the ATLAS stroke. Decorative by default (aria-hidden);
 * pass `label` only when the icon stands alone without visible text.
 */
@Component({
  selector: 'app-icon',
  imports: [LucideDynamicIcon],
  template: `<svg
    [lucideIcon]="data()"
    [size]="size()"
    [strokeWidth]="2.25"
    [absoluteStrokeWidth]="true"
    [title]="label()"
  ></svg>`,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
      vertical-align: -0.125em;
    }

    svg {
      display: block;
      inline-size: 1em;
      block-size: 1em;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtlasIconComponent {
  readonly name = input.required<AtlasIconName>();
  /** Accessible name for an icon that stands alone; omitted, the icon is hidden from assistive tech. */
  readonly label = input<string | null>(null);
  readonly size = input<string | number>('1em');
  protected readonly data = computed(() => icons[this.name()]);
}
