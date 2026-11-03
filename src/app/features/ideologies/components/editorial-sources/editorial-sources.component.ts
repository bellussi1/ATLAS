import { Component, computed, input, signal } from '@angular/core';
import type { EditorialReference } from '@ideologies/models/editorial-reference';

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
  readonly shown = computed(() => {
    const limit = this.limit();
    return limit && !this.expanded() ? this.references().slice(0, limit) : this.references();
  });
  readonly foldable = computed(() => this.limit() > 0 && this.references().length > this.limit());
}
