import { Component, input } from '@angular/core';
import { type EditorialType } from '@core/content/editorial/content-types';
@Component({
  selector: 'app-editorial-mark',
  templateUrl: './editorial-mark.component.html',
  styleUrl: './editorial-mark.component.scss',
})
export class AtlasEditorialMarkComponent {
  readonly kind = input<EditorialType>('atlas');
}
