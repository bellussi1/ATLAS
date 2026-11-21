import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/**
 * Carries the tour's stylesheet. Created the first time a tour starts and kept alive, so the
 * library styles and the ATLAS theme load only for readers who ask for a tour.
 */
@Component({
  selector: 'app-tour-styles',
  template: '',
  styleUrl: './tour.styles.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TourStylesComponent {}
