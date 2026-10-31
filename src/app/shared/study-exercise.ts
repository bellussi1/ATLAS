import { Component, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Exercise } from '../core/study-schema';

@Component({
  selector: 'app-study-exercise', imports: [RouterLink],
  template: `
    <form (submit)="check($event)"><fieldset><legend>{{ exercise().prompt }}</legend>
      @for (option of exercise().options; track option.id) { <label><input type="radio" name="answer" [value]="option.id" (change)="choice.set(option.id)"> {{ option.text }}</label> }
    </fieldset><button type="submit">Conferir resposta</button></form>
    @if (feedback()) { <p class="feedback" role="status">{{ feedback() }} <a routerLink="/fontes" [fragment]="'source-' + exercise().feedback.sourceId" [queryParams]="origin() ? { origem: origin() } : {}">Conferir fonte</a></p> }
  `,
  styles: `
    :host { display:block; } fieldset { display:grid; gap:.7rem; margin:1rem 0; padding:1rem; border:1px solid var(--color-border-strong); }
    label { display:block; padding:.35rem 0; } button { min-height:2.75rem; padding:.6rem 1rem; border:1px solid var(--color-ink); background:var(--color-surface); color:var(--color-ink); font:inherit; cursor:pointer; }
    .feedback { padding:.75rem 1rem; border-left:.25rem solid var(--color-accent); background:var(--color-surface-subtle); color:var(--color-ink); line-height:1.6; }
    a { color:var(--color-accent); text-decoration:underline; text-underline-offset:.2em; }
    button:focus-visible,input:focus-visible,a:focus-visible { outline:3px solid var(--color-accent); outline-offset:3px; }
  `,
})
export class AtlasStudyExerciseComponent {
  readonly exercise = input.required<Exercise>();
  readonly origin = input<string | null>(null);
  readonly attempted = output<boolean>();
  readonly choice = signal('');
  readonly feedback = signal('');
  check(event: Event): void {
    event.preventDefault();
    if (!this.choice()) { this.feedback.set('Escolha uma resposta.'); return; }
    const correct = this.choice() === this.exercise().correctOptionId;
    this.feedback.set(`${correct ? 'Correto.' : 'Tente novamente.'} ${this.exercise().feedback.explanation}`);
    this.attempted.emit(correct);
  }
}
