import { Directive, input } from '@angular/core';

@Directive({
  selector: '[appHeading]',
  standalone: true,
  host: {
    class: 'atlas-heading',
    '[class.atlas-heading--display]': "variant() === 'display'",
    '[class.atlas-heading--page]': "variant() === 'page'",
    '[class.atlas-heading--section]': "variant() === 'section'",
  },
})
export class AtlasHeadingDirective {
  readonly variant = input<'display' | 'page' | 'section', 'display' | 'page' | 'section' | ''>(
    'page',
    { alias: 'appHeading', transform: (value) => value || 'page' },
  );
}
