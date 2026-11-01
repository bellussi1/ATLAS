import { Component, input } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  templateUrl: './button.component.html',
})
export class AtlasButtonComponent {
  readonly variant = input<'primary' | 'secondary' | 'quiet'>('primary');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly busy = input(false);
}
