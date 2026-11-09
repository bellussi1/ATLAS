import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type {
  Atlas,
  Citation,
  Claim,
  Evidence,
  Review,
  Source,
} from '@core/content/models/content-schema';

@Component({
  selector: 'app-claim-references',
  imports: [RouterLink],
  templateUrl: './claim-references.component.html',
  styleUrl: './claim-references.component.scss',
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
          draft: 'Versão preliminar',
          pending: 'Revisão editorial pendente',
          verified: 'Verificada após revisão registrada',
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
