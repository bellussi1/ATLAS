import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { type EditorialType, getEditorialType } from '../content/content-types';
import { findEditorialEntry, getEntryPath } from '../content/editorial-entries';
import { AtlasContinueReadingComponent } from '../shared/continue-reading';
import { AtlasEditorialTextComponent } from '../shared/editorial-text';
import { AtlasReadingOutlineComponent } from '../shared/reading-outline';
import {
  AtlasContentSummaryComponent,
  AtlasEditorialLinkDirective,
  AtlasHeadingDirective,
  AtlasPageTemplateComponent,
} from '../shared/ui-primitives';

@Component({
  selector: 'app-editorial-detail-page',
  imports: [
    AtlasContentSummaryComponent,
    AtlasEditorialLinkDirective,
    AtlasHeadingDirective,
    AtlasPageTemplateComponent,
    AtlasReadingOutlineComponent,
    AtlasContinueReadingComponent,
    AtlasEditorialTextComponent,
    RouterLink,
  ],
  template: `
    @if (entry(); as page) {
      <app-page-template labelledBy="page-title">
        <h1 appHeading="page" id="page-title">{{ page.title }}</h1>
        <app-content-summary headingId="page-summary-title">
          <p class="page__lead">{{ page.summary }}</p>
        </app-content-summary>
        <p class="page__type" [attr.data-editorial-status]="page.status">{{ page.statusLabel }}</p>
        <p class="page__scope">
          @if (page.status === 'previsto') {
            Este formato está previsto. A página descreve sua função editorial; ainda não há
            publicação temática neste registro.
          } @else {
            Este é um exemplo de metodologia do ATLAS, não uma publicação histórica. O estado
            editorial acima identifica a natureza desta página.
          }
        </p>

        @if (type() === 'verbete') {
          <a class="related-entry" appEditorialLink routerLink="/verbete/metodologia-do-atlas">
            Abrir o verbete estruturado e validado da metodologia
          </a>
        }

        <app-reading-outline [sections]="page.sections" />

        @for (section of page.sections; track section.heading) {
          <section class="article-section" [attr.aria-labelledby]="'section-' + $index">
            <h2 tabindex="-1" [id]="'section-' + $index">{{ section.heading }}</h2>
            @for (paragraph of section.paragraphs; track paragraph) {
              <p>
                <app-editorial-text
                  [text]="paragraph"
                  [currentPath]="entryPath(page.type, page.slug)"
                />
              </p>
            }
          </section>
        }

        <app-continue-reading [currentPath]="entryPath(page.type, page.slug)" />
        <a class="back-link" appEditorialLink [routerLink]="backLink()"
          >Voltar para {{ categoryLabel() }}</a
        >
      </app-page-template>
    } @else {
      <app-page-template labelledBy="page-title">
        <h1 appHeading="page" id="page-title">Este conteúdo não existe</h1>
        <p class="page__lead">O ATLAS não tem uma página com este endereço.</p>
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
    .page__type {
      margin: 0.75rem 0 0;
      color: var(--ink-muted);
      font-size: 0.9rem;
    }
    h1 {
      max-width: 17ch;
      margin: 0;
      letter-spacing: -0.065em;
      line-height: 1;
    }
    .page__lead {
      max-width: 43rem;
      margin: 0;
      color: var(--ink-muted);
      font: clamp(1.15rem, 2vw, 1.4rem)/1.55 var(--serif);
    }
    .page__scope {
      max-width: 43rem;
      margin: 1.5rem 0 0;
      padding-left: 1rem;
      border-left: 0.25rem solid var(--signal);
      color: var(--ink-muted);
      line-height: 1.6;
    }
    .related-entry {
      display: inline-flex;
      align-items: center;
      min-height: 2.75rem;
      margin-top: 1rem;
      color: var(--signal);
      font-weight: 700;
      text-underline-offset: 0.2em;
    }
    .article-section {
      max-width: 43rem;
      margin-top: clamp(2.5rem, 6vw, 4rem);
    }
    h2 {
      margin: 0 0 0.8rem;
      font: 500 clamp(1.6rem, 3.4vw, 2.1rem)/1.15 var(--serif);
    }
    .article-section p {
      margin: 0.75rem 0 0;
      line-height: 1.75;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      min-height: 2.75rem;
      margin-top: 3rem;
      color: var(--signal);
      font-weight: 700;
      text-underline-offset: 0.2em;
    }
    @media (max-width: 40rem) {
      h1 {
        max-width: none;
        line-height: 1.05;
      }
    }
  `,
})
export class EditorialDetailPage {
  readonly entryPath = getEntryPath;
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly routeData = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  });
  readonly type = computed(() => {
    const dataType = this.routeData()['editorialType'] as EditorialType | undefined;
    return dataType ?? getEditorialType(this.params().get('tipo'))?.slug;
  });
  readonly entry = computed(() => findEditorialEntry(this.type(), this.params().get('slug')));
  readonly categoryLabel = computed(() => {
    const type = this.type();
    return type === 'trilha'
      ? 'trilhas'
      : (getEditorialType(type ?? null)?.plural.toLocaleLowerCase('pt-BR') ?? 'conteúdos');
  });
  readonly backLink = computed(() => {
    const type = this.type();
    return type === 'trilha' ? '/estudar' : `/explorar/${type ?? ''}`;
  });
}
