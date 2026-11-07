import { Component, computed, input, output } from '@angular/core';
import type { ContextTerm } from '@core/content/queries/context-vocabulary';

import { contextTextParts } from './context-text-parts';

/**
 * Prose whose graph terms become buttons. It is used inside the context sheet, so a reader can
 * follow "meios de produção" or "Bakunin" without closing the sheet and losing the trail.
 */
@Component({
  selector: 'app-context-text',
  templateUrl: './context-text.component.html',
  styleUrl: './context-text.component.scss',
})
export class ContextTextComponent {
  readonly text = input.required<string>();
  readonly vocabulary = input.required<readonly ContextTerm[]>();
  readonly termClick = output<ContextTerm>();
  readonly parts = computed(() => contextTextParts(this.text(), this.vocabulary()));
}
