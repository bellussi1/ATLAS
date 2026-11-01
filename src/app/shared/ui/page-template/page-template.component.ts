import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-template',
  standalone: true,
  templateUrl: './page-template.component.html',
})
export class AtlasPageTemplateComponent {
  readonly kind = input<'editorial' | 'index' | 'profile'>('editorial');
  readonly labelledBy = input('page-title');
}
