import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { findEditorialEntry, getEntryPath } from '../content/editorial-entries';
import { getEditorialType } from '../content/content-types';

@Component({
  selector: 'app-content-type-page',
  imports: [RouterLink],
  template: `
    @if (category(); as item) {
      <section class="page" aria-labelledby="page-title">
        <h1 id="page-title">{{ item.plural }}</h1>
        <p class="page__lead">{{ item.summary }}</p>

        @if (entry(); as example) {
          <section class="entry" aria-labelledby="entry-title">
            <p class="entry__status">{{ example.statusLabel }}</p>
            <h2 id="entry-title">{{ example.title }}</h2>
            <p>{{ example.summary }}</p>
            <a data-detail-link [routerLink]="entryPath()">
              Abrir {{ item.label.toLocaleLowerCase('pt-BR') }}
              <span aria-hidden="true">↗</span>
            </a>
          </section>
        }
      </section>
    } @else {
      <section class="page" aria-labelledby="page-title">
        <h1 id="page-title">Categoria não encontrada</h1>
        <p class="page__lead">Esta categoria não faz parte do índice do ATLAS.</p>
        <a class="back-link" routerLink="/explorar">Voltar ao índice de conteúdos</a>
      </section>
    }
  `,
  styles: `
    :host { display: block; }
    .page { max-width: 72rem; margin: 0 auto; padding: clamp(3.5rem, 8vw, 7rem) clamp(1.25rem, 8vw, 8rem); }
    h1 { max-width: 14ch; margin: 0; font-size: clamp(3rem, 7vw, 5.75rem); letter-spacing: -.065em; line-height: .98; }
    .page__lead { max-width: 42rem; margin: 1.5rem 0 0; color: var(--ink-muted); font: clamp(1.15rem, 2vw, 1.4rem)/1.55 var(--serif); }
    .entry { max-width: 50rem; margin-top: clamp(3rem, 8vw, 6rem); padding: 1.5rem 0 0 1.5rem; border-left: .25rem solid var(--signal); }
    .entry__status { margin: 0 0 .75rem; color: var(--ink-muted); font-size: .9rem; }
    h2 { margin: 0; font: 500 clamp(1.8rem, 4vw, 2.6rem)/1.1 var(--serif); }
    .entry > p:not(.entry__status) { max-width: 38rem; color: var(--ink-muted); line-height: 1.65; }
    a { display: inline-flex; gap: .65rem; align-items: center; min-height: 2.75rem; margin-top: .6rem; color: var(--signal); font-weight: 700; text-underline-offset: .2em; }
    a:focus-visible { outline: 3px solid var(--signal); outline-offset: 3px; }
    @media (max-width: 48rem) { h1 { max-width: none; font-size: clamp(2rem, 8.5vw, 2.75rem); line-height: 1.05; } }
  `,
})
export class ContentTypePage {
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly category = computed(() => getEditorialType(this.params().get('tipo')));
  readonly entry = computed(() => {
    const category = this.category();
    return category
      ? findEditorialEntry(category.slug, category.exampleSlug)
      : undefined;
  });
  readonly entryPath = computed(() => {
    const category = this.category();
    return category ? getEntryPath(category.slug, category.exampleSlug) : '/explorar';
  });
}
