import { AtlasEditorialTextComponent } from '../../shared/editorial-text';
import { AtlasClaimReferencesComponent } from '../../shared/claim-references';
import { AtlasReadingOutlineComponent } from '../../shared/reading-outline';
import { AtlasContinueReadingComponent } from '../../shared/continue-reading';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ContentRepository } from '../../core/content-repository';
import { queryKnowledgeRelations } from '../../core/knowledge-graph';
import { AtlasEditorialLinkDirective } from '../../shared/ui-primitives';

@Component({
  selector: 'app-entry-page',
  imports: [RouterLink, AtlasReadingOutlineComponent, AtlasContinueReadingComponent, AtlasEditorialTextComponent, AtlasClaimReferencesComponent, AtlasEditorialLinkDirective],
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
        <section class="entry-context" aria-labelledby="context-title">
          <h2 id="context-title">Contexto</h2>
          <p>{{ entry.context }}</p>
          @if (entry.temporalExtent?.label) { <p class="entry-detail"><strong>Período:</strong> {{ entry.temporalExtent?.label }}</p> }
          @if (entry.aliases.length) { <p class="entry-detail"><strong>Outros nomes registrados:</strong> {{ entry.aliases.join(', ') }}</p> }
        </section>

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

        @if (relatedEntries().length) {
          <section class="related-records" aria-labelledby="related-title">
            <h2 id="related-title">Relações registradas</h2>
            @for (item of relatedEntries(); track item.relationId) {
              <article>
                <a appEditorialLink [routerLink]="'/verbete/' + item.entity.slug">{{ item.entity.title }}</a>
                <p class="relation-label">{{ item.label }}</p>
                <p>{{ item.context }}</p>
                @if (item.evidence.length) {
                  <p class="relation-evidence">Evidência: @for (evidence of item.evidence; track evidence.id) { {{ evidence.locator }}@if (!$last) {; } } · <a appEditorialLink routerLink="/fontes">Consultar biblioteca de fontes</a></p>
                }
              </article>
            }
          </section>
        }

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
    .entry-context, .related-records { max-width: 43rem; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--color-border-strong); }
    .entry-context h2, .related-records h2 { margin: 0 0 .6rem; font: 500 1.35rem/1.25 var(--serif); }
    .entry-context p, .related-records p { line-height: 1.65; }
    .entry-detail { color: var(--color-ink-muted); font-size: .9rem; }
    .related-records article { padding-block: .75rem; border-top: 1px solid var(--color-border); }
    .related-records article > a { color: var(--color-accent); font-weight: 650; text-underline-offset: .2em; }
    .relation-label { margin-bottom: .25rem; font-weight: 650; }
    .relation-evidence { color: var(--color-ink-muted); font-size: .88rem; }
    .relation-evidence a { color: var(--color-accent); text-underline-offset: .2em; }
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
  readonly relatedEntries = computed(() => {
    const entry = this.entity();
    const graph = this.graph();
    if (!entry || !graph) return [];
    return queryKnowledgeRelations(graph, entry.id).flatMap((relation) => {
      const atlas = graph.atlases.find((item) => item.id === relation.atlasId);
      const related = atlas?.entities.find((item) => item.id === relation.relatedEntityId);
      if (!atlas || !related) return [];
      return [{
        ...relation,
        entity: related,
        evidence: relation.evidenceIds.flatMap((id) => {
          const evidence = atlas.evidences.find((item) => item.id === id);
          return evidence ? [evidence] : [];
        }),
      }];
    });
  });

  kindLabel(kind: string): string {
    return ({
      person: 'Pessoa', ideology: 'Ideologia', concept: 'Conceito', work: 'Obra', event: 'Evento',
      'historical-polity': 'Formação política histórica', place: 'Lugar', party: 'Partido',
      institution: 'Instituição', government: 'Governo', policy: 'Política pública', article: 'Artigo',
    } as Record<string, string>)[kind] ?? 'Conteúdo';
  }

}
