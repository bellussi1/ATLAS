import { Directive, input } from '@angular/core';

@Directive({
  selector: 'a[appEditorialLink]',
  standalone: true,
  host: {
    class: 'atlas-link',
    '[class.atlas-link--feature]': "variant() === 'feature'",
  },
})
export class AtlasEditorialLinkDirective {
  readonly variant = input<'inline' | 'feature' | ''>('inline', { alias: 'appEditorialLink' });
}
