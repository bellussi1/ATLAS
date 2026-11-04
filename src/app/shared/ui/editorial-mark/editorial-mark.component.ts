import { Component, input } from '@angular/core';

export type EditorialMarkKind = 'verbete' | 'artigo' | 'atlas';

@Component({
  selector: 'app-editorial-mark',
  templateUrl: './editorial-mark.component.html',
  styleUrl: './editorial-mark.component.scss',
})
export class AtlasEditorialMarkComponent {
  readonly kind = input<EditorialMarkKind>('atlas');
}
