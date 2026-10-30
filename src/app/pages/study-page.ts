import { Component } from '@angular/core';

@Component({
  selector: 'app-study-page',
  template: `
    <section class="page" aria-labelledby="page-title">
      <p class="eyebrow">Aprender por etapas</p>
      <h1 id="page-title">Seguir uma trilha</h1>
      <p class="page__lead">
        Trilhas vão organizar leituras e perguntas em uma sequência clara, que você poderá percorrer no seu ritmo.
      </p>
      <p class="page__note" role="status">
        Nenhuma trilha está publicada ainda. As primeiras serão preparadas com objetivos e referências explícitos.
      </p>
    </section>
  `,
  styles: `
    :host { display: block; }
    .page { max-width: 68rem; margin: 0 auto; padding: clamp(4rem, 12vw, 9rem) clamp(1.25rem, 8vw, 8rem); }
    .eyebrow { color: var(--signal); font-size: .72rem; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; }
    h1 { max-width: 12ch; margin: 1.5rem 0; font-size: clamp(3rem, 8vw, 6rem); letter-spacing: -.07em; line-height: .98; }
    .page__lead { max-width: 38rem; color: var(--ink-muted); font: 1.35rem/1.55 var(--serif); }
    .page__note { max-width: 42rem; margin-top: 3rem; padding: 1rem 1.2rem; border-left: 3px solid var(--signal); background: var(--paper-shade); color: var(--ink-muted); line-height: 1.55; }
  `,
})
export class StudyPage {}
