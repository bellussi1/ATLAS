import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AtlasRevealDirective } from '@shared/directives/reveal/reveal.directive';

/** "Quatro gestos, uma descoberta": the four-step guide on the home page. */
@Component({
  selector: 'app-home-howto',
  imports: [AtlasRevealDirective, RouterLink],
  templateUrl: './howto.component.html',
  styleUrl: './howto.component.scss',
})
export class HomeHowtoComponent {
  readonly howTo = [
    {
      id: 'procurar',
      verb: 'Procurar',
      short: 'Um nome, um conceito, uma pergunta',
      title: 'Comece por uma palavra',
      body: 'Digite um nome, conceito ou pergunta na busca. Ela percorre o acervo inteiro e separa o que é pessoa, obra, conceito ou acontecimento.',
      action: 'Abrir o acervo',
      path: '/acervo',
      fragment: undefined,
    },
    {
      id: 'abrir',
      verb: 'Abrir',
      short: 'Termos em vermelho abrem fichas',
      title: 'Abra o termo sem sair do texto',
      body: 'Nas leituras, palavras sublinhadas em vermelho abrem uma ficha com resumo e fontes. Feche e você volta exatamente ao ponto onde estava.',
      action: 'Ler uma tradição',
      path: '/',
      fragment: 'leituras',
    },
    {
      id: 'seguir',
      verb: 'Seguir',
      short: 'Cada ficha leva à próxima',
      title: 'Siga as ligações',
      body: 'Toda ficha mostra com quem e com o que ela se liga: influências, autores, obras e acontecimentos. A rede apresenta tudo isso de uma vez.',
      action: 'Abrir a rede',
      path: '/grafos',
      fragment: undefined,
    },
    {
      id: 'conferir',
      verb: 'Conferir',
      short: 'Fonte e tipo de afirmação à vista',
      title: 'Confira a evidência',
      body: 'Cada trecho indica se é fato documentado, interpretação, controvérsia ou lacuna, com a fonte por perto. Compare as tradições antes de concluir.',
      action: 'Ver como lemos o acervo',
      path: '/',
      fragment: 'metodo',
    },
  ];
  readonly step = signal(this.howTo[0]);
  readonly stepNumber = computed(() => this.howTo.indexOf(this.step()) + 1);
  nextStep(): void {
    this.step.set(this.howTo[this.stepNumber() % this.howTo.length]);
  }
}
