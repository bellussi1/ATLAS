import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { emptyProgress, parseProgress, recordAttempt, STORAGE_KEY } from '../core/study-progress';
import { demonstrationPath } from '../content/demonstration-path';

@Component({
  selector: 'app-study-page',
  imports: [RouterLink],
  template: `
    <section class="page" aria-labelledby="page-title">
      <h1 id="page-title">Trilhas de estudo</h1>
      <p class="page__lead">
        As trilhas do ATLAS estão previstas para organizar leituras e perguntas em sequências com objetivos e referências explícitos.
      </p>
      <section class="study-path" aria-labelledby="study-path-title">
        <h2 id="study-path-title">Como uma trilha será organizada</h2>
        <p>Este exemplo explica o formato de estudo proposto pelo projeto; ainda não é uma trilha temática publicada.</p>
        <a data-trail-link routerLink="/estudar/como-usar-trilhas">Conhecer o formato das trilhas <span aria-hidden="true">↗</span></a>
      </section>
      <section class="study-path" aria-labelledby="practice-title">
        <h2 id="practice-title">{{ path.title }}</h2>
        <p>Trilha demonstrativa de metodologia. Objetivo: {{ path.objectives[0] }} Pré-requisito: {{ path.prerequisites[0] }} O conteúdo histórico do acervo ainda aguarda revisão humana.</p>
        <p>Uma afirmação histórica deve ser acompanhada de evidência contextual e distinguir fato, interpretação, hipótese e alegação controversa. <a routerLink="/fontes" fragment="source-source-editorial-rules">Consultar as regras editoriais</a>.</p>
        <form (submit)="answer($event)">
          <fieldset><legend>{{ exercise.prompt }}</legend>
            @for (option of exercise.options; track option.id) { <label><input type="radio" name="answer" [value]="option.id" (change)="choice.set(option.id)"> {{ option.text }}</label> }
          </fieldset>
          <button type="submit">Conferir resposta</button>
        </form>
        @if (feedback()) { <p role="status">{{ feedback() }} <a routerLink="/fontes" [fragment]="'source-' + exercise.feedback.sourceId">Ver fonte</a></p> }
        <p>{{ progress().completedLessonIds.length ? 'Atividade concluída; você pode tentar novamente.' : 'Atividade ainda não concluída.' }}</p>
        @if (progress().reviewItems[0]; as review) { <p>Próxima revisão sugerida: {{ review.dueAt }}.</p> }
        <h3>Guardar ou recuperar progresso</h3>
        <p>O progresso fica neste navegador quando o armazenamento local está disponível. Exporte o texto para guardá-lo em outro lugar.</p>
        <button type="button" (click)="exportProgress()">Exportar progresso</button>
        <label for="progress-data">Dados de progresso</label>
        <textarea id="progress-data" rows="6" [value]="transfer()" (input)="transfer.set($any($event.target).value)"></textarea>
        <button type="button" (click)="importProgress()">Importar progresso</button>
        @if (message()) { <p role="status">{{ message() }}</p> }
      </section>
    </section>
  `,
  styles: `
    :host { display: block; }
    .page { max-width: var(--grid-max); margin: 0 auto; padding: clamp(4rem, 12vw, 9rem) var(--grid-gutter); }
    h1 { max-width: 12ch; margin: 0; font-size: clamp(3rem, 8vw, 6rem); letter-spacing: -.07em; line-height: .98; }
    .page__lead { max-width: 38rem; color: var(--ink-muted); font: 1.35rem/1.55 var(--serif); }
    .study-path { max-width: 42rem; margin-top: clamp(3rem, 7vw, 5rem); padding-left: 1.25rem; border-left: .25rem solid var(--signal); }
    h2 { margin: 0; font: 500 clamp(1.65rem, 3vw, 2.2rem)/1.15 var(--serif); }
    .study-path p { color: var(--ink-muted); line-height: 1.65; }
    a { display: inline-flex; gap: .65rem; align-items: center; min-height: 2.75rem; color: var(--signal); font-weight: 700; text-underline-offset: .2em; }
    a:focus-visible { outline: 3px solid var(--signal); outline-offset: 3px; }
    fieldset { display: grid; gap: .7rem; margin: 1rem 0; padding: 1rem; border: 1px solid var(--ink-muted); }
    label { display: block; margin-block: .6rem; } button { min-height: 2.75rem; padding: .6rem 1rem; border: 1px solid var(--color-ink); background: var(--color-surface); color: var(--color-ink); cursor: pointer; } textarea { display: block; width: 100%; max-width: 100%; border: 1px solid var(--color-border-strong); background: var(--color-surface); color: var(--color-ink); font: inherit; }
    button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 3px solid var(--signal); outline-offset: 3px; }
    @media (max-width: 40rem) { h1 { max-width: none; font-size: clamp(2rem, 8.5vw, 2.75rem); line-height: 1.05; } }
  `,
})
export class StudyPage {
  readonly path = demonstrationPath;
  readonly exercise = this.path.lessons[0].exercises[0];
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly progress = signal(emptyProgress());
  readonly choice = signal('');
  readonly feedback = signal('');
  readonly transfer = signal('');
  readonly message = signal('');

  constructor() {
    if (this.browser) {
      try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) this.progress.set(parseProgress(saved)); }
      catch { this.message.set('Não foi possível carregar o progresso local.'); }
    }
  }
  private save(): boolean {
    if (!this.browser) return false;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress())); return true; }
    catch { this.message.set('Não foi possível salvar neste navegador; exporte o progresso para guardá-lo.'); return false; }
  }
  answer(event: Event): void {
    event.preventDefault();
    if (!this.choice()) { this.feedback.set('Escolha uma resposta para continuar.'); return; }
    const correct = this.choice() === this.exercise.correctOptionId;
    this.feedback.set(`${correct ? 'Correto.' : 'Tente novamente.'} ${this.exercise.feedback.explanation}`);
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.progress.set(recordAttempt(this.progress(), correct, today));
    this.save();
  }
  exportProgress(): void { this.transfer.set(JSON.stringify(this.progress(), null, 2)); this.message.set('Copie os dados de progresso exibidos abaixo.'); }
  importProgress(): void {
    try { const value = parseProgress(this.transfer()); this.progress.set(value); if (this.save()) this.message.set('Progresso importado.'); }
    catch { this.message.set('Dados inválidos ou de versão incompatível; o progresso atual foi preservado.'); }
  }
}
