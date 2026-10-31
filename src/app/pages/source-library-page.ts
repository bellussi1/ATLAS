import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentRepository } from '../core/content-repository';
import { AtlasEditorialLinkDirective, AtlasHeadingDirective, AtlasPageTemplateComponent } from '../shared/ui-primitives';

@Component({
  selector: 'app-source-library-page',
  imports: [RouterLink, AtlasEditorialLinkDirective, AtlasHeadingDirective, AtlasPageTemplateComponent],
  template: `
    <app-page-template labelledBy="page-title">
      <h1 appHeading="page" id="page-title">Biblioteca de fontes</h1>
      <p class="lead">Consulte as referências cadastradas e siga para os verbetes e afirmações que as utilizam.</p>
      <p class="scope">A presença de uma fonte não significa, por si só, que todas as afirmações associadas passaram por revisão humana. O estado registrado aparece junto a cada afirmação.</p>
      @for (item of sources; track item.atlasId + item.source.id) {
        <article class="source-entry" [attr.aria-labelledby]="'source-' + item.source.id">
          <p class="collection">{{ item.atlasTitle }}</p>
          <h2 [id]="'source-' + item.source.id">{{ item.source.title }}</h2>
          <p class="edition">{{ item.source.edition }}</p>
          @if (item.source.publicationDate) { <p>Data da publicação: {{ item.source.publicationDate }}</p> }
          @if (item.source.url) {
            <a class="source-link" [href]="item.source.url" target="_blank" rel="noopener noreferrer">Abrir referência original</a>
          } @else {
            <p class="local-source">Referência interna do projeto; não há URL externa cadastrada.</p>
          }
          @if (item.evidence.length) {
            <h3>Localizadores cadastrados</h3>
            <ul>
              @for (evidence of item.evidence; track evidence.id) {
                <li>{{ evidence.locator }} <span>— consultada em {{ evidence.accessedAt }}</span></li>
              }
            </ul>
          }
          @if (item.entities.length) {
            <h3>Leituras relacionadas</h3>
            <ul class="related">
              @for (entity of item.entities; track entity.id) {
                <li><a appEditorialLink [routerLink]="'/verbete/' + entity.slug">{{ entity.title }}</a></li>
              }
            </ul>
          }
        </article>
      } @empty {
        <p role="status" class="empty">Ainda não há fontes cadastradas no acervo.</p>
      }
      <a class="back-link" appEditorialLink routerLink="/explorar">Voltar aos formatos editoriais</a>
    </app-page-template>
  `,
  styles: `
    :host { display: block; }
    h1 { max-width: 15ch; margin: 0; letter-spacing: -.06em; line-height: 1; }
    .lead { max-width: 43rem; margin: 0; color: var(--color-ink-muted); font: clamp(1.15rem, 2vw, 1.4rem)/1.55 var(--font-serif); }
    .scope { max-width: 43rem; margin: 1.5rem 0 0; padding-left: 1rem; border-left: .25rem solid var(--color-accent); color: var(--color-ink-muted); line-height: 1.6; }
    .source-entry { max-width: 48rem; margin-top: clamp(2.5rem, 6vw, 4rem); padding-top: 1.2rem; border-top: 1px solid var(--color-border-strong); }
    .collection { color: var(--color-ink-muted); font: .75rem/1.5 var(--font-mono); }
    h2 { margin: .4rem 0; font: 500 clamp(1.5rem, 3vw, 2rem)/1.2 var(--font-serif); }
    h3 { margin: 1.5rem 0 .5rem; font-size: 1rem; }
    p, li { line-height: 1.65; }
    .edition, .local-source { color: var(--color-ink-muted); }
    .source-link, .related a, .back-link { color: var(--color-accent); text-underline-offset: .2em; }
    .source-link, .back-link { display: inline-flex; align-items: center; min-height: 2.75rem; }
    ul { padding-left: 1.25rem; }
    li + li { margin-top: .35rem; }
    li span { color: var(--color-ink-muted); }
    .empty { margin-top: 2rem; }
    .back-link { margin-top: 2.5rem; font-weight: 650; }
    a:focus-visible { outline: 3px solid var(--color-accent); outline-offset: 3px; }
  `,
})
export class SourceLibraryPage {
  private readonly repository = inject(ContentRepository);
  readonly sources = this.repository.knowledgeGraph.atlases.flatMap((atlas) => atlas.sources.map((source) => {
    const evidence = atlas.evidences.filter((item) => item.sourceId === source.id);
    const evidenceIds = new Set(evidence.map((item) => item.id));
    const citationIds = new Set(atlas.citations.filter((citation) => evidenceIds.has(citation.evidenceId)).map((citation) => citation.id));
    const entityIds = new Set(atlas.claims.filter((claim) => claim.citationIds.some((id) => citationIds.has(id))).map((claim) => claim.entityId));
    return {
      atlasId: atlas.id,
      atlasTitle: atlas.title,
      source,
      evidence,
      entities: atlas.entities.filter((entity) => entityIds.has(entity.id)),
    };
  }));
}
