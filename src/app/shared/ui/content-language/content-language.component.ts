import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-content-language',
  templateUrl: './content-language.component.html',
  styleUrl: './content-language.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentLanguageComponent {
  readonly requested = input<string | null>(null);
  readonly changed = output<string | null>();
  readonly unavailable = computed(
    () => !!this.requested() && !['pt-BR', 'en'].includes(this.requested()!),
  );
}
