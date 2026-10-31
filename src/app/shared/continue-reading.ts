import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { getEntryPath } from '../content/editorial-entries';

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
  template: `
    <nav class="continue-reading" aria-label="Continuar a investigação">
      <p class="eyebrow">Uma leitura abre outra</p>
      <h2>Por onde seguir?</h2>
      @for (item of suggestions(); track item.path) {
        <a [routerLink]="item.path"
          ><strong>{{ item.title }} <span aria-hidden="true">→</span></strong
          ><span>{{ item.reason }}</span></a
        >
      }
      <a class="network-link" routerLink="/relacoes"
        >Investigar as relações entre conceito, afirmação e fonte ↗</a
      >
    </nav>
  `,
  styles: `
    :host {
      display: block;
      margin-top: 3rem;
    }
    .continue-reading {
      border-top: 2px solid var(--color-ink);
      padding-top: 1.5rem;
    }
    .eyebrow {
      color: var(--color-accent);
      font: 0.75rem/1.5 var(--font-mono);
    }
    h2 {
      font: 500 2rem/1.15 var(--font-serif);
      margin: 0.75rem 0;
    }
    a {
      display: grid;
      gap: 0.5rem;
      padding: 1.25rem 0;
      border-bottom: 1px solid var(--color-border);
      color: var(--color-ink);
      text-decoration: none;
      min-height: 2.75rem;
    }
    @media (hover: hover) and (pointer: fine) {
      a:hover strong {
        color: var(--color-accent);
        text-decoration: underline;
      }
    }
    strong {
      font-size: 1.25rem;
      font-weight: 600;
    }
    a > span {
      color: var(--color-ink-muted);
      font: 1rem/1.5 var(--font-serif);
    }
    .network-link {
      color: var(--color-accent);
      font-size: 0.85rem;
    }
  `,
})
export class AtlasContinueReadingComponent {
  readonly currentPath = input.required<string>();
  readonly suggestions = computed(() =>
    methodologyReadingPath.filter((item) => item.path !== this.currentPath()),
  );
}
