import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { getEditorialType } from '../content/content-types';
import { findEditorialEntry, getEntryPath } from '../content/editorial-entries';
import { ContentRepository } from '../core/content-repository';
import {
  AtlasContentSummaryComponent,
  AtlasEditorialLinkDirective,
  AtlasHeadingDirective,
  AtlasPageTemplateComponent,
} from '../shared/ui-primitives';

@Component({
  selector: 'app-content-type-page',
  imports: [
    AtlasContentSummaryComponent,
    AtlasEditorialLinkDirective,
    AtlasHeadingDirective,
    AtlasPageTemplateComponent,
    RouterLink,
  ],
  template: `
    @if (category(); as item) {
      <app-page-template kind="index" labelledBy="page-title">
        <h1 appHeading="page" id="page-title">{{ item.plural }}</h1>
        <app-content-summary headingId="category-summary-title" label="Sobre esta categoria">
          <p class="page__lead">{{ item.summary }}</p>
        </app-content-summary>

        @if (registeredEntries().length) {
          <section class="registered-entries" aria-labelledby="registered-title">
            <h2 appHeading="section" id="registered-title">Registros disponíveis</h2>
            @for (record of registeredEntries(); track record.entity.id) {
              <article>
                <p class="record-collection">{{ record.atlasTitle }}</p>
                <h3>{{ record.entity.title }}</h3>
                <p>{{ record.entity.summary }}</p>
                <a appEditorialLink [routerLink]="'/verbete/' + record.entity.slug"
                  >Abrir registro de {{ record.label.toLocaleLowerCase('pt-BR') }}</a
                >
              </article>
            }
          </section>
        }

        @if (entry(); as example) {
          @if (!registeredEntries().length || example.status === 'exemplar') {
            <section class="entry" aria-labelledby="entry-title">
              <p class="entry__status">{{ example.statusLabel }}</p>
              <h2 appHeading="section" id="entry-title">{{ example.title }}</h2>
              <p>{{ example.summary }}</p>
              <a appEditorialLink data-detail-link [routerLink]="entryPath()">
                Abrir {{ item.label.toLocaleLowerCase('pt-BR') }}
                <span aria-hidden="true">↗</span>
              </a>
            </section>
          }
        }
      </app-page-template>
    } @else {
      <app-page-template kind="index" labelledBy="page-title">
        <h1 appHeading="page" id="page-title">Categoria não encontrada</h1>
        <p class="page__lead">Esta categoria não faz parte do índice do ATLAS.</p>
        <a class="back-link" appEditorialLink routerLink="/explorar"
          >Voltar ao índice de conteúdos</a
        >
      </app-page-template>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    h1 {
      max-width: 14ch;
      margin: 0;
      letter-spacing: -0.065em;
      line-height: 0.98;
    }
    .page__lead {
      max-width: 42rem;
      margin: 0;
      color: var(--ink-muted);
      font: clamp(1.15rem, 2vw, 1.4rem)/1.55 var(--serif);
    }
    .entry {
      max-width: 50rem;
      margin-top: clamp(3rem, 8vw, 6rem);
      padding: 1.5rem 0 0 1.5rem;
      border-left: 0.25rem solid var(--signal);
    }
    .registered-entries {
      max-width: 50rem;
      margin-top: clamp(3rem, 8vw, 6rem);
      border-top: 2px solid var(--color-ink);
    }
    .registered-entries > h2 {
      margin-top: 1rem;
      font: 500 1.6rem/1.2 var(--font-serif);
    }
    .registered-entries article {
      padding-block: 1.25rem;
      border-bottom: 1px solid var(--color-border);
    }
    .registered-entries h3 {
      margin: 0.25rem 0;
      font: 500 1.35rem/1.2 var(--font-serif);
    }
    .registered-entries article > p:not(.record-collection) {
      max-width: 40rem;
      line-height: 1.6;
    }
    .record-collection {
      margin: 0;
      color: var(--color-ink-muted);
      font: 0.72rem/1.5 var(--font-mono);
    }
    .registered-entries a {
      display: inline-flex;
      align-items: center;
      min-height: 2.75rem;
      color: var(--signal);
      text-underline-offset: 0.2em;
    }
    .entry__status {
      margin: 0 0 0.75rem;
      color: var(--ink-muted);
      font-size: 0.9rem;
    }
    h2 {
      margin: 0;
      font: 500 clamp(1.8rem, 4vw, 2.6rem)/1.1 var(--serif);
    }
    .entry > p:not(.entry__status) {
      max-width: 38rem;
      color: var(--ink-muted);
      line-height: 1.65;
    }
    a {
      display: inline-flex;
      gap: 0.65rem;
      align-items: center;
      min-height: 2.75rem;
      margin-top: 0.6rem;
      color: var(--signal);
      font-weight: 700;
      text-underline-offset: 0.2em;
    }
    @media (max-width: 48rem) {
      h1 {
        max-width: none;
        line-height: 1.05;
      }
    }
  `,
})
export class ContentTypePage {
  private readonly route = inject(ActivatedRoute);
  private readonly graph = inject(ContentRepository).knowledgeGraph;
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  readonly category = computed(() => getEditorialType(this.params().get('tipo')));
  readonly registeredEntries = computed(() => {
    const category = this.category();
    if (!category) return [];
    const kinds: Record<string, readonly string[]> = {
      verbete: ['concept'],
      artigo: ['article'],
      pessoa: ['person'],
      evento: ['event'],
    };
    const acceptedKinds = kinds[category.slug] ?? [];
    return this.graph.atlases.flatMap((atlas) =>
      atlas.entities
        .filter((entity) => acceptedKinds.includes(entity.kind))
        .map((entity) => ({ atlasTitle: atlas.title, entity, label: category.label })),
    );
  });
  readonly entry = computed(() => {
    const category = this.category();
    return category ? findEditorialEntry(category.slug, category.exampleSlug) : undefined;
  });
  readonly entryPath = computed(() => {
    const category = this.category();
    return category ? getEntryPath(category.slug, category.exampleSlug) : '/explorar';
  });
}
