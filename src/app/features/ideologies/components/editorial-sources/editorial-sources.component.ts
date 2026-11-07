import { Component, computed, input, signal } from '@angular/core';
import type { EditorialReference } from '@ideologies/models/editorial-reference';

interface ShownReference extends EditorialReference {
  /** Stable key for the visible record; the same source can keep distinct locators. */
  key: string;
}

let nextSourcesId = 0;

@Component({
  selector: 'app-editorial-sources',
  templateUrl: './editorial-sources.component.html',
  styleUrl: './editorial-sources.component.scss',
})
export class EditorialSourcesComponent {
  readonly references = input.required<readonly EditorialReference[]>();
  readonly variant = input<'chapter' | 'bibliography' | 'inline'>('chapter');
  readonly newWindow = input(false);
  readonly emptyText = input('Nenhuma referência registrada.');
  /** Folds long lists after this many entries (0 shows everything). */
  readonly limit = input(0);
  readonly expanded = signal(false);
  readonly uid = `editorial-sources-${nextSourcesId++}`;
  /**
   * Groups records with the same visible reference. Two entries with different locators or
   * editions stay apart, so evidence is not lost by deduplication.
   */
  readonly unique = computed<ShownReference[]>(() => {
    const seen = new Set<string>();
    const unique: ShownReference[] = [];
    for (const source of this.references()) {
      const key = [source.title, source.url ?? '', source.edition ?? '', source.locator ?? ''].join(
        '\u0000',
      );
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push({ ...source, key });
    }
    return unique;
  });
  readonly shown = computed(() => {
    const limit = this.limit();
    return limit && !this.expanded() ? this.unique().slice(0, limit) : this.unique();
  });
  readonly foldable = computed(() => this.limit() > 0 && this.unique().length > this.limit());
}
