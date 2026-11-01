import { Component, input } from '@angular/core';
import { AtlasHeadingDirective } from '@shared/directives/heading/heading.directive';

@Component({
  selector: 'app-content-summary',
  standalone: true,
  imports: [AtlasHeadingDirective],
  templateUrl: './content-summary.component.html',
})
export class AtlasContentSummaryComponent {
  readonly headingId = input.required<string>();
  readonly label = input('Resumo');
}
