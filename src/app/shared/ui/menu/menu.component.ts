import { Component, input } from '@angular/core';

@Component({
  selector: 'app-menu',
  standalone: true,
  templateUrl: './menu.component.html',
})
export class AtlasMenuComponent {
  readonly label = input.required<string>();
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
}
