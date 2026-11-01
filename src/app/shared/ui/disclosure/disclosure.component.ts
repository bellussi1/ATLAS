import { Component, input } from '@angular/core';

@Component({
  selector: 'app-disclosure',
  standalone: true,
  templateUrl: './disclosure.component.html',
})
export class AtlasDisclosureComponent {
  readonly label = input.required<string>();
  readonly open = input(false);
}
