import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-text-field',
  standalone: true,
  templateUrl: './text-field.component.html',
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
  readonly describedBy = () =>
    [this.hint() ? `${this.controlId()}-hint` : '', this.error() ? `${this.controlId()}-error` : '']
      .filter(Boolean)
      .join(' ');

  onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
