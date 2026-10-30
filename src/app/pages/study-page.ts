import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
    </section>
  `,
  styles: `
    :host { display: block; }
    .page { max-width: 68rem; margin: 0 auto; padding: clamp(4rem, 12vw, 9rem) clamp(1.25rem, 8vw, 8rem); }
    h1 { max-width: 12ch; margin: 0; font-size: clamp(3rem, 8vw, 6rem); letter-spacing: -.07em; line-height: .98; }
    .page__lead { max-width: 38rem; color: var(--ink-muted); font: 1.35rem/1.55 var(--serif); }
    .study-path { max-width: 42rem; margin-top: clamp(3rem, 7vw, 5rem); padding-left: 1.25rem; border-left: .25rem solid var(--signal); }
    h2 { margin: 0; font: 500 clamp(1.65rem, 3vw, 2.2rem)/1.15 var(--serif); }
    .study-path p { color: var(--ink-muted); line-height: 1.65; }
    a { display: inline-flex; gap: .65rem; align-items: center; min-height: 2.75rem; color: var(--signal); font-weight: 700; text-underline-offset: .2em; }
    a:focus-visible { outline: 3px solid var(--signal); outline-offset: 3px; }
    @media (max-width: 40rem) { h1 { max-width: none; font-size: clamp(2rem, 8.5vw, 2.75rem); line-height: 1.05; } }
  `,
})
export class StudyPage {}
