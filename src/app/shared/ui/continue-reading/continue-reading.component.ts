import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getEntryPath } from '@core/content/editorial/editorial-entries';

export const methodologyReadingPath = [
  {
    path: '/verbete/metodologia-do-atlas',
    title: 'O que sustenta uma afirmação?',
    reason: 'Examine o vínculo entre uma afirmação e sua fonte.',
  },
  {
    path: getEntryPath('artigo', 'conhecimento-com-contexto'),
    title: 'Por que o contexto importa?',
    reason: 'Amplie a leitura dos princípios editoriais em um artigo.',
  },
  {
    path: getEntryPath('atlas', 'atlas-de-metodo'),
    title: 'Como encontrar outros caminhos?',
    reason: 'Percorra os formatos do acervo e entenda como se conectam.',
  },
];

@Component({
  selector: 'app-continue-reading',
  imports: [RouterLink],
  templateUrl: './continue-reading.component.html',
  styleUrl: './continue-reading.component.scss',
})
export class AtlasContinueReadingComponent {
  readonly currentPath = input.required<string>();
  readonly suggestions = computed(() =>
    methodologyReadingPath.filter((item) => item.path !== this.currentPath()),
  );
}
