import { Component, computed, input } from '@angular/core';
import { knowledgeTextParts } from '@ideologies/utils/knowledge-text-parts';
import { KnowledgeContextDirective } from '@shared/directives/knowledge-context/knowledge-context.directive';
@Component({
  selector: 'app-knowledge-text',
  imports: [KnowledgeContextDirective],
  templateUrl: './knowledge-text.component.html',
  styleUrl: './knowledge-text.component.scss',
})
export class KnowledgeTextComponent {
  readonly text = input.required<string>();
  readonly parts = computed(() => knowledgeTextParts(this.text()));
}
