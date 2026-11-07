import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { ChapterReview } from '@ideologies/utils/chapter-review';
import { KnowledgeContextDirective } from '@shared/directives/knowledge-context/knowledge-context.directive';

let nextReviewId = 0;

/**
 * End-of-chapter review: one retrieval question and up to three records met two chapters
 * earlier. The answer stays hidden until the reader asks for it, so the question works as
 * recall instead of a summary.
 */
@Component({
  selector: 'app-chapter-review',
  imports: [KnowledgeContextDirective],
  templateUrl: './chapter-review.component.html',
  styleUrl: './chapter-review.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChapterReviewComponent {
  readonly review = input.required<ChapterReview>();
  readonly chapterTitle = input.required<string>();
  readonly revealed = signal(false);
  readonly uid = nextReviewId++;
  readonly answerId = `chapter-review-answer-${this.uid}`;
  readonly hasRevisit = computed(() => this.review().revisit.length > 0);

  toggle(): void {
    this.revealed.update((value) => !value);
  }
}
