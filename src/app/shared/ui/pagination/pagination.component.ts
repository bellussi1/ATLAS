import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AtlasChevronComponent } from '@shared/ui/chevron/chevron.component';

/** Page numbers to show: always the first and last, the current one and its neighbours. */
export function pageWindow(page: number, pageCount: number): (number | null)[] {
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages]
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);
  const result: (number | null)[] = [];
  for (const value of sorted) {
    const previous = result.at(-1);
    if (typeof previous === 'number' && value - previous === 2) result.push(value - 1);
    else if (typeof previous === 'number' && value - previous > 2) result.push(null);
    result.push(value);
  }
  return result;
}

/**
 * Pager for lists split into pages. Presentational: the parent owns the page (URL or signal)
 * and decides where focus and scroll go after a change.
 */
@Component({
  selector: 'app-pagination',
  imports: [AtlasChevronComponent],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtlasPaginationComponent {
  readonly page = input.required<number>();
  readonly pageCount = input.required<number>();
  /** Accessible name of the navigation landmark, e.g. "Páginas de leituras". */
  readonly label = input('Paginação');
  readonly pageChange = output<number>();

  readonly pages = computed(() => pageWindow(this.page(), this.pageCount()));

  go(target: number): void {
    if (target < 1 || target > this.pageCount() || target === this.page()) return;
    this.pageChange.emit(target);
  }
}
