import { Component, input } from '@angular/core';
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
}
