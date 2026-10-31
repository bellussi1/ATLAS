import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { editorialTypes } from '../content/content-types';

@Component({
  selector: 'app-explore-page',
  imports: [RouterLink],
  template: `
    <section class="page" aria-labelledby="page-title">
      <div class="intro">
        <h1 id="page-title">Explorar conteúdos</h1>
        <p class="page__lead">
          Percorra os formatos previstos pelo ATLAS. Os exemplos atuais explicam a metodologia do
          projeto; conteúdos históricos serão publicados após curadoria e revisão de fontes.
        </p>
      </div>

      <nav class="content-index" aria-label="Categorias de conteúdo">
        <ol>
          @for (type of editorialTypes; track type.slug) {
            <li>
              <a [attr.data-content-type]="type.slug" [routerLink]="['/explorar', type.slug]">
                <span class="content-index__title">{{ type.plural }}</span>
                <span class="content-index__summary">{{ type.summary }}</span>
                <span class="content-index__arrow" aria-hidden="true">↗</span>
              </a>
            </li>
          }
        </ol>
      </nav>
    </section>
  `,
  styles: `
    :host { display: block; }
    .page { display: grid; grid-template-columns: minmax(15rem, .8fr) minmax(22rem, 1.2fr); gap: clamp(3rem, 8vw, 8rem); max-width: var(--grid-max); margin: 0 auto; padding: clamp(3.5rem, 8vw, 7rem) var(--grid-gutter); }
    .intro { max-width: 36rem; }
    h1 { max-width: 9ch; margin: 0; font-size: clamp(3rem, 6.5vw, 5.5rem); letter-spacing: -.065em; line-height: .98; }
    .page__lead { max-width: 34rem; margin-top: 1.5rem; color: var(--ink-muted); font: clamp(1.1rem, 1.8vw, 1.35rem)/1.6 var(--serif); }
    .content-index { align-self: center; }
    ol { margin: 0; padding: 0; list-style: none; }
    li + li { margin-top: .4rem; }
    a { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .25rem 1rem; align-items: baseline; min-height: 4.5rem; padding: .85rem 0; color: var(--ink); text-decoration: none; }
    a:hover .content-index__title { color: var(--signal); text-decoration: underline; text-underline-offset: .2em; }
    a:focus-visible { outline: 3px solid var(--signal); outline-offset: 4px; }
    .content-index__title { font: 500 clamp(1.35rem, 2.2vw, 1.8rem)/1.15 var(--serif); }
    .content-index__summary { grid-column: 1; color: var(--ink-muted); font-size: .92rem; line-height: 1.45; }
    .content-index__arrow { grid-column: 2; grid-row: 1 / span 2; color: var(--signal); }
    @media (max-width: 48rem) {
      .page { grid-template-columns: minmax(0, 1fr); gap: 2.5rem; }
      h1 { max-width: none; font-size: clamp(2rem, 8.5vw, 2.75rem); line-height: 1.05; }
    }
  `,
})
export class ExplorePage {
  readonly editorialTypes = editorialTypes;
}
