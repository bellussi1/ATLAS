import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-chevron',
  template: `<svg
    viewBox="0 0 16 16"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    stroke-width="2.2"
    stroke-linecap="square"
    stroke-linejoin="miter"
    aria-hidden="true"
  >
    <path d="M5.75 3.25 10.5 8 5.75 12.75" />
  </svg>`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: none;
    }

    svg {
      display: block;
      inline-size: 0.95em;
      block-size: 0.95em;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtlasChevronComponent {}
