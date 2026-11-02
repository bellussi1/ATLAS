import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { Exercise } from '@core/content/models/study-schema';

@Component({
  selector: 'app-study-exercise',
  imports: [RouterLink],
  templateUrl: './study-exercise.component.html',
  styleUrl: './study-exercise.component.scss',
})
export class AtlasStudyExerciseComponent {
  readonly exercise = input.required<Exercise>();
  readonly origin = input<string | null>(null);
  private readonly router = inject(Router);
  /** The source link returns to the page that opened the exercise, at its sources section. */
  readonly sourceLink = computed(() => {
    const link = this.router.parseUrl(this.origin() ?? '/marxismo');
    link.fragment = 'fontes';
    return link;
  });
  readonly attempted = output<boolean>();
  readonly choice = signal('');
  readonly feedback = signal('');
  check(event: Event): void {
    event.preventDefault();
    if (!this.choice()) {
      this.feedback.set('Escolha uma resposta.');
      return;
    }
    const correct = this.choice() === this.exercise().correctOptionId;
    this.feedback.set(
      `${correct ? 'Correto.' : 'Tente novamente.'} ${this.exercise().feedback.explanation}`,
    );
    this.attempted.emit(correct);
  }
}
