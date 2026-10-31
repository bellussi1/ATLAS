import { Component, Directive, input, output } from '@angular/core';

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
    'page', { alias: 'appHeading', transform: (value) => value || 'page' },
  );
}

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

@Component({
  selector: 'app-button',
  standalone: true,
  template: `
    <button
      class="atlas-button"
      [class.atlas-button--secondary]="variant() === 'secondary'"
      [class.atlas-button--quiet]="variant() === 'quiet'"
      [type]="type()"
      [disabled]="disabled() || busy()"
      [attr.aria-busy]="busy() ? 'true' : null"
    >
      <ng-content />
    </button>
  `,
})
export class AtlasButtonComponent {
  readonly variant = input<'primary' | 'secondary' | 'quiet'>('primary');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly busy = input(false);
}

@Component({
  selector: 'app-text-field',
  standalone: true,
  template: `
    <div class="atlas-field">
      <label [for]="controlId()">
        {{ label() }}
        @if (required()) { <span aria-hidden="true">*</span> }
      </label>
      <input
        [id]="controlId()"
        [type]="type()"
        [value]="value()"
        [placeholder]="placeholder()"
        [required]="required()"
        [disabled]="disabled()"
        [readonly]="readonly()"
        [attr.aria-invalid]="error() ? 'true' : null"
        [attr.aria-describedby]="describedBy() || null"
        (input)="onInput($event)"
      />
      @if (hint()) { <span class="atlas-field__hint" [id]="controlId() + '-hint'">{{ hint() }}</span> }
      @if (error()) { <span class="atlas-field__error" [id]="controlId() + '-error'">{{ error() }}</span> }
    </div>
  `,
})
export class AtlasTextFieldComponent {
  readonly controlId = input.required<string>();
  readonly label = input.required<string>();
  readonly type = input<'text' | 'email' | 'search'>('text');
  readonly value = input('');
  readonly placeholder = input('');
  readonly hint = input('');
  readonly error = input('');
  readonly required = input(false);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly valueChange = output<string>();
  readonly describedBy = () => [
    this.hint() ? `${this.controlId()}-hint` : '',
    this.error() ? `${this.controlId()}-error` : '',
  ].filter(Boolean).join(' ');

  onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}

@Component({
  selector: 'app-content-summary',
  standalone: true,
  imports: [AtlasHeadingDirective],
  template: `
    <section class="atlas-content-summary" [attr.aria-labelledby]="headingId()">
      <h2 appHeading="section" [id]="headingId()">{{ label() }}</h2>
      <div class="atlas-content-summary__body"><ng-content /></div>
    </section>
  `,
})
export class AtlasContentSummaryComponent {
  readonly headingId = input.required<string>();
  readonly label = input('Resumo');
}

@Component({
  selector: 'app-disclosure',
  standalone: true,
  template: `
    <details class="atlas-disclosure" [open]="open()">
      <summary>{{ label() }}</summary>
      <div class="atlas-disclosure__body"><ng-content /></div>
    </details>
  `,
})
export class AtlasDisclosureComponent {
  readonly label = input.required<string>();
  readonly open = input(false);
}

@Component({
  selector: 'app-menu',
  standalone: true,
  template: `
    <nav
      class="atlas-menu"
      [class.atlas-menu--vertical]="orientation() === 'vertical'"
      [attr.aria-label]="label()"
    >
      <ng-content />
    </nav>
  `,
})
export class AtlasMenuComponent {
  readonly label = input.required<string>();
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
}

@Component({
  selector: 'app-notice',
  standalone: true,
  template: `
    <div
      class="atlas-notice"
      [class.atlas-notice--success]="tone() === 'success'"
      [class.atlas-notice--warning]="tone() === 'warning'"
      [class.atlas-notice--critical]="tone() === 'critical'"
      [attr.role]="accessibleRole()"
      [attr.aria-live]="accessibleRole() === 'alert' ? 'assertive' : 'polite'"
    >
      <ng-content />
    </div>
  `,
})
export class AtlasNoticeComponent {
  readonly tone = input<'info' | 'success' | 'warning' | 'critical'>('info');
  readonly accessibleRole = input<'status' | 'alert'>('status');
}

@Component({
  selector: 'app-page-template',
  standalone: true,
  template: `
    <article
      class="atlas-page-template"
      [class.atlas-page-template--index]="kind() === 'index'"
      [class.atlas-page-template--profile]="kind() === 'profile'"
      [attr.aria-labelledby]="labelledBy()"
    >
      <div class="atlas-page-template__body"><ng-content /></div>
    </article>
  `,
})
export class AtlasPageTemplateComponent {
  readonly kind = input<'editorial' | 'index' | 'profile'>('editorial');
  readonly labelledBy = input('page-title');
}
