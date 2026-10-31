import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Atlas, Citation, Claim, Evidence, Review, Source } from '../core/content-schema';

@Component({
  selector: 'app-claim-references',
  imports: [RouterLink],
  template: `
    <section class="claim-reference" [attr.aria-labelledby]="'claim-' + claim().id">
      <h3 [id]="'claim-' + claim().id">Afirmação e evidência</h3>
      <p class="claim-reference__text">{{ claim().text }}</p>
      <p class="claim-reference__status">
        Classificação: {{ classificationLabel(claim()) }} ·
        {{ statusLabel(review()?.status ?? claim().editorialStatus) }}
      </p>
      @if (review()?.reviewer && review()?.reviewedAt) {
        <p class="claim-reference__review">
          Revisado por {{ review()?.reviewer }} em {{ formatDate(review()?.reviewedAt) }}
        </p>
      } @else {
        <p class="claim-reference__review">Sem revisão humana registrada.</p>
      }
      @for (citation of citations(); track citation.id) {
        @if (evidence(citation); as item) {
          @if (source(item); as reference) {
            <div class="claim-reference__source">
              <p>
                <strong>{{ relationLabel(citation) }}:</strong> {{ reference.title }}
              </p>
              <p>
                <a [routerLink]="'/fontes'" [fragment]="'source-' + reference.id"
                  >Abrir esta fonte no índice</a
                >
              </p>
              @if (reference.url) {
                <p>
                  <a [href]="reference.url" target="_blank" rel="noopener noreferrer"
                    >Consultar fonte original</a
                  >
                </p>
              }
              <p>Edição: {{ reference.edition }}</p>
              @if (reference.publicationDate) {
                <p>Publicação: {{ formatDate(reference.publicationDate) }}</p>
              }
              <p>Localizador: {{ item.locator }}</p>
              <p>Consulta: {{ formatDate(item.accessedAt) }}</p>
              @if (item.note) {
                <p>{{ item.note }}</p>
              }
            </div>
          }
        }
      }
      <a class="source-library-link" routerLink="/fontes">Abrir biblioteca de fontes</a>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .claim-reference {
      margin-top: 1rem;
      padding: 1.1rem 1.25rem;
      border-left: 0.25rem solid var(--color-accent, var(--signal));
      background: color-mix(
        in srgb,
        var(--color-surface, var(--paper)) 90%,
        var(--color-accent, var(--signal))
      );
    }
    h3 {
      margin: 0 0 0.6rem;
      font: 600 1.1rem/1.3 var(--font-sans, var(--sans));
    }
    p {
      margin: 0.45rem 0;
      line-height: 1.55;
    }
    .claim-reference__text {
      font-family: var(--font-serif, var(--serif));
    }
    .claim-reference__status,
    .claim-reference__review {
      font-size: 0.88rem;
    }
    .claim-reference__source {
      margin-top: 0.8rem;
      font-size: 0.88rem;
    }
    a {
      color: var(--color-accent, var(--signal));
      font-weight: 650;
      text-underline-offset: 0.2em;
    }
    .source-library-link {
      display: inline-flex;
      align-items: center;
      min-height: 2.75rem;
      margin-top: 0.6rem;
    }
    a:focus-visible {
      outline: 3px solid var(--color-accent, var(--signal));
      outline-offset: 3px;
    }
  `,
})
export class AtlasClaimReferencesComponent {
  readonly claim = input.required<Claim>();
  readonly atlas = input.required<Atlas>();

  citations(): Citation[] {
    return this.atlas().citations.filter((item) => this.claim().citationIds.includes(item.id));
  }
  evidence(citation: Citation): Evidence | undefined {
    return this.atlas().evidences.find((item) => item.id === citation.evidenceId);
  }
  source(evidence: Evidence): Source | undefined {
    return this.atlas().sources.find((item) => item.id === evidence.sourceId);
  }
  review(): Review | undefined {
    return this.atlas().reviews.find((item) => item.claimId === this.claim().id);
  }
  formatDate(value: string | null | undefined): string {
    return value
      ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
      : '';
  }
  statusLabel(status: string): string {
    return (
      (
        {
          draft: 'Rascunho',
          pending: 'Revisão editorial pendente',
          verified: 'Verificada após revisão humana',
          contested: 'Contestada',
          'needs-update': 'Precisa de atualização',
        } as Record<string, string>
      )[status] ?? status
    );
  }
  classificationLabel(claim: Claim): string {
    return (
      {
        'documented-fact': 'Fato documentado',
        'attributed-thesis': 'Tese atribuída',
        interpretation: 'Interpretação',
        hypothesis: 'Hipótese',
        inference: 'Inferência',
        'contested-claim': 'Alegação contestada',
        unverified: 'Não verificado',
      } as Record<string, string>
    )[claim.classification];
  }
  relationLabel(citation: Citation): string {
    return (
      { supports: 'Sustenta', contests: 'Contesta', contextualizes: 'Contextualiza' } as const
    )[citation.relation];
  }
}
