import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WORLD_MAP_ERA_PRESETS } from '@core/content/queries/world-map-eras';
import { AtlasRevealDirective } from '@shared/directives/reveal/reveal.directive';
import { AtlasIconComponent } from '@shared/ui/icon/icon.component';

import homeStats from '../../../../../generated/home-stats.json';

const { counts, readings } = homeStats;
const era = WORLD_MAP_ERA_PRESETS.find((item) => item.id === '1914-1945');
const format = (value: number) => new Intl.NumberFormat('pt-BR').format(value);
const leadTitles = readings.slice(0, 2).map((item) => item.title);

interface HowtoPath {
  readonly id: string;
  readonly tone: 'vermelho' | 'jenipapo' | 'ocre' | 'rosa';
  readonly shape: 'square' | 'circle' | 'ring' | 'half';
  readonly verb: string;
  readonly text: string;
  readonly example: string;
  readonly path: string;
  readonly queryParams?: Record<string, number | null>;
}

/** What to do in the archive: one real destination per gesture, with an example from the data. */
@Component({
  selector: 'app-home-howto',
  imports: [AtlasIconComponent, AtlasRevealDirective, RouterLink],
  templateUrl: './howto.component.html',
  styleUrl: './howto.component.scss',
})
export class HomeHowtoComponent {
  readonly purpose = [
    { term: 'Contexto', shape: 'quarter', text: 'Quando e onde cada ideia ou fato aparece.' },
    { term: 'Relações', shape: 'circle', text: 'Quem influenciou quem e quem participou do quê.' },
    {
      term: 'Evidência',
      shape: 'square',
      text: 'Fato, interpretação e controvérsia, cada um com a fonte.',
    },
  ] as const;

  readonly lead: HowtoPath = {
    id: 'ler',
    tone: 'vermelho',
    shape: 'square',
    verb: 'Ler uma leitura contínua',
    text: 'Um assunto de ponta a ponta, em capítulos. Termos sublinhados abrem a ficha sem tirar você do texto.',
    example: `${leadTitles.join(', ')} e mais ${counts.readings - leadTitles.length} leituras, com ${format(counts.chapters)} capítulos no total.`,
    path: '/leituras',
  };

  readonly others: readonly HowtoPath[] = [
    {
      id: 'seguir',
      tone: 'jenipapo',
      shape: 'circle',
      verb: 'Seguir as ligações',
      text: 'Busque um nome e isole a vizinhança dele em um ou dois saltos.',
      example: `${format(counts.links)} ligações entre ${format(counts.nodes)} pontos do acervo.`,
      path: '/grafos',
    },
    {
      id: 'situar',
      tone: 'ocre',
      shape: 'ring',
      verb: 'Situar no mapa',
      text: 'Países e impérios em cada época, com recorte de datas.',
      example: era ? `${era.label}: ${era.note}` : 'Escolha uma época na linha do tempo.',
      path: '/mapa',
      queryParams: era ? { anoDe: era.yearFrom, anoAte: era.yearTo } : undefined,
    },
    {
      id: 'percorrer',
      tone: 'rosa',
      shape: 'half',
      verb: 'Percorrer um itinerário',
      text: 'Roteiros passo a passo que partem de uma pergunta.',
      example:
        'Como o trabalhismo combinou legislação social e nacionalismo desenvolvimentista no Brasil?',
      path: '/itinerarios',
    },
  ];

  readonly archive = {
    verbetes: format(counts.verbetes),
    sources: format(counts.sources),
  };
}
