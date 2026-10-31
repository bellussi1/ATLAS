import { AtlasEditorialTextComponent } from '../../shared/editorial-text';
import { AtlasClaimReferencesComponent } from '../../shared/claim-references';
import { AtlasReadingOutlineComponent } from '../../shared/reading-outline';
import { AtlasContinueReadingComponent } from '../../shared/continue-reading';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ContentRepository } from '../../core/content-repository';

@Component({
  selector: 'app-entry-page',
  imports: [RouterLink, AtlasReadingOutlineComponent, AtlasContinueReadingComponent, AtlasEditorialTextComponent, AtlasClaimReferencesComponent],
  template: `
    @if (graph() === null) {
      <section class="page" aria-labelledby="page-title" role="alert">
        <h1 id="page-title">Este verbete está temporariamente indisponível</h1>
        <p class="page__lead">Não foi possível carregar o registro estático do ATLAS.</p>
        <a class="back-link" routerLink="/explorar/verbete">Voltar ao índice de verbetes</a>
      </section>
    } @else if (entity(); as entry) {
      <article class="page" aria-labelledby="page-title">
        <p class="eyebrow">{{ kindLabel(entry.kind) }}</p>
        <h1 id="page-title">{{ entry.title }}</h1>
        <p class="page__lead">{{ entry.summary }}</p>

        <app-reading-outline [sections]="entry.sections" />

        @for (section of entry.sections; track section.heading) {
          <section class="article-section" [attr.aria-labelledby]="'section-' + $index">
            <h2 tabindex="-1" [id]="'section-' + $index">{{ section.heading }}</h2>
            @for (paragraph of section.paragraphs; track paragraph) {
              <p><app-editorial-text [text]="paragraph" [currentPath]="'/verbete/' + entry.slug" /></p>
            }
          </section>
        }

        @for (claim of claims(); track claim.id) { <app-claim-references [claim]="claim" [atlas]="atlas()!" /> }

        <app-continue-reading [currentPath]="'/verbete/' + entry.slug" />
        <a class="back-link" routerLink="/explorar/verbete">Voltar ao índice de verbetes</a>
      </article>
    } @else {
      <section class="page" aria-labelledby="page-title">
        <h1 id="page-title">Este verbete não existe</h1>
        <p class="page__lead">O ATLAS não tem um verbete com este endereço.</p>
        <a class="back-link" routerLink="/explorar/verbete">Voltar ao índice de verbetes</a>
      </section>
    }
  `,
  styles: `
    :host { display: block; }
    .page { max-width: var(--grid-max); margin: 0 auto; padding: clamp(3.5rem, 8vw, 7rem) var(--grid-gutter); }
    .eyebrow { margin: 0 0 .8rem; color: var(--signal); font-size: .75rem; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; }
    h1 { max-width: 17ch; margin: 0; font-size: clamp(2.7rem, 6.8vw, 5.5rem); letter-spacing: -.065em; line-height: 1; }
    .page__lead { max-width: 43rem; margin: 1.5rem 0 0; color: var(--ink-muted); font: clamp(1.15rem, 2vw, 1.4rem)/1.55 var(--serif); }
    .article-section, app-claim-references { max-width: 43rem; margin-top: clamp(2.5rem, 6vw, 4rem); }
    h2 { margin: 0 0 .8rem; font: 500 clamp(1.6rem, 3.4vw, 2.1rem)/1.15 var(--serif); }
    .article-section p { margin: .75rem 0 0; line-height: 1.75; }
    .back-link { display: inline-flex; align-items: center; min-height: 2.75rem; margin-top: 3rem; color: var(--signal); font-weight: 700; text-underline-offset: .2em; }
    a:focus-visible { outline: 3px solid var(--signal); outline-offset: 3px; }
    @media (max-width: 40rem) { h1 { max-width: none; font-size: clamp(1.9rem, 8.5vw, 2.5rem); line-height: 1.05; } }
  `,
})
export class EntryPage {
  private readonly route = inject(ActivatedRoute);
  private readonly repository = inject(ContentRepository);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly graph = toSignal(
    this.repository.loadKnowledgeGraph().pipe(catchError(() => of(null))),
    { initialValue: this.repository.knowledgeGraph },
  );
  readonly entity = computed(() => this.graph() ? this.repository.findEntityBySlug(this.params().get('slug'), this.graph()!) : undefined);
  readonly atlas = computed(() => {
    const entity = this.entity();
    return entity && this.graph() ? this.repository.atlasForEntity(entity.id, this.graph()!) : undefined;
  });
  readonly claims = computed(() => {
    const entity = this.entity();
    return (this.atlas()?.claims ?? []).filter((claim) => claim.entityId === entity?.id);
  });

  kindLabel(kind: string): string {
    return ({
      person: 'Pessoa', ideology: 'Ideologia', concept: 'Conceito', work: 'Obra', event: 'Evento',
      'historical-polity': 'Formação política histórica', place: 'Lugar', party: 'Partido',
      institution: 'Instituição', government: 'Governo', policy: 'Política pública', article: 'Artigo',
    } as Record<string, string>)[kind] ?? 'Conteúdo';
  }

}
