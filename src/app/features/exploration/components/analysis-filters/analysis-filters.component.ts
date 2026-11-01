import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { KnowledgeGraph } from '@core/content/models/content-schema';
import type { AnalysisFilters } from '@core/content/queries/exploration-analysis';

@Component({
  selector: 'app-analysis-filters',
  templateUrl: './analysis-filters.component.html',
  styleUrl: './analysis-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysisFiltersComponent {
  readonly graph = input.required<KnowledgeGraph>();
  readonly value = input.required<AnalysisFilters>();
  readonly changed = output<Record<string, string | null>>();
  readonly cleared = output<void>();
  readonly kinds = computed<string[]>(() =>
    [...new Set(this.graph().atlases.flatMap((a) => a.entities.map((e) => e.kind)))].sort(),
  );
  readonly relations = computed<string[]>(() =>
    [...new Set(this.graph().atlases.flatMap((a) => a.relations.map((r) => r.type)))].sort(),
  );
  readonly unknownCollection = computed(
    () =>
      !!this.value().collection &&
      !this.graph().atlases.some((a) => a.id === this.value().collection),
  );
  readonly kindLabels: Partial<Record<string, string>> = {
    person: 'Pessoa',
    concept: 'Conceito',
    ideology: 'Ideologia',
    work: 'Obra',
    event: 'Acontecimento',
    institution: 'Instituição',
    place: 'Lugar',
    article: 'Artigo',
    country: 'País',
    regime: 'Regime',
    party: 'Partido',
    government: 'Governo',
    policy: 'Política pública',
    'historical-polity': 'Formação política histórica',
  };
  readonly relationLabels: Partial<Record<string, string>> = {
    'editorial-link': 'Ligação editorial',
    'encyclopedic-link': 'Link enciclopédico',
    'documented-association': 'Associação documentada',
    influence: 'Influência documentada',
    'causal-claim': 'Alegação causal',
    influenced: 'Influência atribuída',
    influenced_by: 'Influenciado por (atribuição)',
    associated_with: 'Associação',
    related_to: 'Relação temática',
    reacted_against: 'Reação atribuída',
    developed_into: 'Desenvolvimento atribuído',
    participated_in: 'Participação',
    wrote: 'Escrita de obra',
    authored: 'Autoria atribuída',
    event_influenced_ideology: 'Acontecimento e ideologia',
  };
  apply(form: HTMLFormElement): void {
    const data = new FormData(form);
    const values: Record<string, string | null> = {};
    for (const key of ['colecao', 'tipo', 'relacao', 'de', 'ate'])
      values[key] = String(data.get(key) ?? '').trim() || null;
    values['semData'] = data.has('semData') ? null : 'nao';
    this.changed.emit(values);
  }
}
