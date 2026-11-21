import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { AtlasIconComponent } from '../icon/icon.component';

/** The one Tour button of the pages that have no toolbar of their own: small, fixed, labelled. */
@Component({
  selector: 'app-tour-launcher',
  imports: [AtlasIconComponent],
  template: `
    @if (visible()) {
      <button type="button" class="launcher" (click)="pressed.emit()">
        <app-icon name="help" />Tour guiado
      </button>
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    .launcher {
      position: fixed;
      z-index: 60;
      inset-block-end: max(1rem, env(safe-area-inset-bottom));
      inset-inline-start: 1rem;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      min-height: 2.75rem;
      padding: 0 0.9rem;
      border: 2px solid var(--color-ink);
      border-radius: var(--radius-tight);
      background: var(--color-surface-raised);
      color: var(--color-ink);
      box-shadow: 3px 3px 0 var(--color-ink);
      font: 650 var(--text-small) / 1 var(--font-primary);
      cursor: pointer;
      &:hover {
        background: var(--color-surface-subtle);
      }
    }

    @media print {
      .launcher {
        display: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TourLauncherComponent {
  readonly visible = input(false);
  readonly pressed = output<void>();
}
