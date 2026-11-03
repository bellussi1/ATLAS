import { Component, computed, inject, input } from '@angular/core';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { terms } from '@ideologies/data/knowledge-vocabulary';
import { graphVocabulary } from '@ideologies/utils/graph-vocabulary';
import { knowledgeTextParts } from '@ideologies/utils/knowledge-text-parts';
import { KnowledgeContextDirective } from '@shared/directives/knowledge-context/knowledge-context.directive';

let nextId = 0;

/**
 * Paragraph whose words that exist in the graph become explorable: hover or focus shows
 * the record's own short summary, and activating the word opens its sheet with sources.
 */
@Component({
  selector: 'app-knowledge-text',
  imports: [KnowledgeContextDirective],
  templateUrl: './knowledge-text.component.html',
  styleUrl: './knowledge-text.component.scss',
})
export class KnowledgeTextComponent {
  private readonly repository = inject(ContentRepository);
  readonly text = input.required<string>();
  readonly id = `term-${nextId++}`;
  private readonly vocabulary = computed(() =>
    graphVocabulary(this.repository.knowledgeGraph, terms),
  );
  readonly parts = computed(() => knowledgeTextParts(this.text(), this.vocabulary()));
}
