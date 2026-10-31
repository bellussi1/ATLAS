import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { findEditorialEntry } from '../content/editorial-entries';
import { EditorialType, getEditorialType } from '../content/content-types';

@Component({
  selector: 'app-editorial-detail-page',
  imports: [RouterLink],
  template: `
    @if (entry(); as page) {
      <article class="page" aria-labelledby="page-title">
        <h1 id="page-title">{{ page.title }}</h1>
        <p class="page__lead">{{ page.summary }}</p>
        <p class="page__type">{{ page.statusLabel }}</p>
        <p class="page__scope">
          Esta página apresenta a metodologia e os formatos do próprio ATLAS. Ela não contém uma
          publicação histórica nem substitui revisão editorial.
        </p>

        @if (type() === 'verbete') {
          <a class="related-entry" routerLink="/verbete/metodologia-do-atlas">
            Abrir o verbete estruturado e validado da metodologia
          </a>
        }

        @for (section of page.sections; track section.heading) {
          <section class="article-section" [attr.aria-labelledby]="'section-' + $index">
            <h2 [id]="'section-' + $index">{{ section.heading }}</h2>
            @for (paragraph of section.paragraphs; track paragraph) {
              <p>{{ paragraph }}</p>
            }
          </section>
        }

        <a class="back-link" [routerLink]="backLink()">Voltar para {{ categoryLabel() }}</a>
      </article>
    } @else {
      <section class="page" aria-labelledby="page-title">
        <h1 id="page-title">Este conteúdo não existe</h1>
        <p class="page__lead">O ATLAS não tem uma página com este endereço.</p>
        <a class="back-link" routerLink="/explorar">Voltar ao índice de conteúdos</a>
      </section>
    }
  `,
  styles: `
    :host { display: block; }
    .page { max-width: 72rem; margin: 0 auto; padding: clamp(3.5rem, 8vw, 7rem) clamp(1.25rem, 8vw, 8rem); }
    .page__type { margin: .75rem 0 0; color: var(--ink-muted); font-size: .9rem; }
    h1 { max-width: 17ch; margin: 0; font-size: clamp(2.7rem, 6.8vw, 5.5rem); letter-spacing: -.065em; line-height: 1; }
    .page__lead { max-width: 43rem; margin: 1.5rem 0 0; color: var(--ink-muted); font: clamp(1.15rem, 2vw, 1.4rem)/1.55 var(--serif); }
    .page__scope { max-width: 43rem; margin: 1.5rem 0 0; padding-left: 1rem; border-left: .25rem solid var(--signal); color: var(--ink-muted); line-height: 1.6; }
    .related-entry { display: inline-flex; align-items: center; min-height: 2.75rem; margin-top: 1rem; color: var(--signal); font-weight: 700; text-underline-offset: .2em; }
    .article-section { max-width: 43rem; margin-top: clamp(2.5rem, 6vw, 4rem); }
    h2 { margin: 0 0 .8rem; font: 500 clamp(1.6rem, 3.4vw, 2.1rem)/1.15 var(--serif); }
    .article-section p { margin: .75rem 0 0; line-height: 1.75; }
    .back-link { display: inline-flex; align-items: center; min-height: 2.75rem; margin-top: 3rem; color: var(--signal); font-weight: 700; text-underline-offset: .2em; }
    a:focus-visible { outline: 3px solid var(--signal); outline-offset: 3px; }
    @media (max-width: 40rem) { h1 { max-width: none; font-size: clamp(1.9rem, 8.5vw, 2.5rem); line-height: 1.05; } }
  `,
})
export class EditorialDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  private readonly routeData = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  readonly type = computed(() => {
    const dataType = this.routeData()['editorialType'] as EditorialType | undefined;
    return dataType ?? getEditorialType(this.params().get('tipo'))?.slug;
  });
  readonly entry = computed(() => findEditorialEntry(this.type(), this.params().get('slug')));
  readonly categoryLabel = computed(() => {
    const type = this.type();
    return type === 'trilha' ? 'trilhas' : getEditorialType(type ?? null)?.plural.toLocaleLowerCase('pt-BR') ?? 'conteúdos';
  });
  readonly backLink = computed(() => {
    const type = this.type();
    return type === 'trilha' ? '/estudar' : `/explorar/${type ?? ''}`;
  });
}
