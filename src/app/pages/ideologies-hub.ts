import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-ideologies-hub',
  imports: [RouterLink],
  template: `
    <article class="hub">
      <header>
        <p>História das ideias</p>
        <h1>Ideologias<br />e tradições.</h1>
        <p class="lead">
          Ideias têm história. Seguir suas conexões é uma maneira de começar a entendê-las.
        </p>
      </header>
      <section aria-labelledby="hub-map">
        <h2 id="hub-map">Escolha um ponto de partida</h2>
        <p>
          Dois percursos disponíveis, com formatos e recortes distintos. A aproximação é editorial:
          não afirma origem comum nem influência histórica.
        </p>
        <div class="constellation" role="group" aria-label="Selecionar tradição">
          <button
            class="marx"
            type="button"
            [attr.aria-pressed]="selected() === 'marxismo'"
            aria-controls="hub-context"
            (click)="selected.set('marxismo')"
          >
            <small>Tradição político-intelectual</small>Marxismo
          </button>
          <div class="bridge">
            <span aria-hidden="true">⟷</span>
            <p>Ligação de descoberta,<br />não afirmação histórica</p>
          </div>
          <button
            class="liberal"
            type="button"
            [attr.aria-pressed]="selected() === 'liberalismo'"
            aria-controls="hub-context"
            (click)="selected.set('liberalismo')"
          >
            <small>Família de tradições</small>Liberalismo
          </button>
        </div>
        <section id="hub-context" aria-live="polite" class="hub-context">
          @if (selected() === 'marxismo') {
            <h3>Marxismo: uma tradição em disputa</h3>
            <p>
              Uma leitura contínua de conceitos, pensadores, textos e divergências. Conteúdo com
              fontes, revisão humana pendente.
            </p>
            <a routerLink="/ideologias/marxismo">Ler o Marxismo</a>
          } @else {
            <h3>Liberalismo: explorar o acervo</h3>
            <p>
              Rede de pessoas, conceitos e obras, com cronologia e imagens. O atlas existente
              preserva seu formato exploratório e os estados de revisão.
            </p>
            <a routerLink="/atlas/liberalismos">Abrir o Atlas do Liberalismo</a>
          }
        </section>
      </section>
      <footer>
        <p>O acervo cresce com fontes, não com páginas vazias.</p>
        <p>
          Novas tradições precisam de recorte e bibliografia antes da publicação.
          <a routerLink="/fontes">Conheça as fontes do ATLAS</a>.
        </p>
      </footer>
    </article>
  `,
  styles: `
    .hub {
      max-width: var(--grid-max);
      margin: auto;
      padding: 1rem var(--grid-gutter) 5rem;
    }
    header {
      border-block: 3px solid var(--ink);
      padding-block: 1.5rem 2rem;
    }
    h1 {
      font: 700 clamp(3rem, 8vw, 7.5rem)/0.95 var(--font-sans);
      letter-spacing: -0.055em;
      margin: 1rem 0;
    }
    .lead {
      max-width: 45ch;
      font: 1.5rem/1.5 var(--font-serif);
    }
    section {
      padding-block: 1.5rem;
    }
    h2 {
      font-size: clamp(1.7rem, 3vw, 2.5rem);
      letter-spacing: -0.03em;
    }
    .constellation {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 13rem minmax(0, 1fr);
      align-items: center;
      margin-block: 2rem;
    }
    button {
      min-height: 210px;
      border: 2px solid var(--ink);
      font-size: clamp(1.7rem, 4vw, 3rem);
      font-weight: 700;
      text-align: left;
      padding: 1.5rem;
      cursor: pointer;
      color: var(--ink);
    }
    button[aria-pressed='true'] {
      outline: 4px solid var(--color-accent);
      outline-offset: 5px;
    }
    button small {
      display: block;
      font: 0.8rem var(--font-mono);
      margin-bottom: 1.5rem;
    }
    .marx {
      background: var(--color-rose-paper);
      border-radius: 50% 50% 0 0;
      padding-top: 3rem;
    }
    .liberal {
      background: var(--color-teal-paper);
    }
    .bridge {
      text-align: center;
      font-size: 0.75rem;
    }
    .bridge span {
      display: block;
      font-size: 3rem;
    }
    .hub-context {
      border-left: 8px solid var(--color-indigo);
      padding: 1rem 1.5rem;
      background: var(--paper-shade);
      max-width: 50rem;
    }
    h3 {
      font-size: 1.6rem;
      margin-top: 0;
    }
    .hub-context p {
      font: 1.2rem/1.6 var(--font-serif);
    }
    a {
      color: var(--color-accent);
      text-decoration: underline;
      display: inline-block;
      padding-block: 0.65rem;
      text-underline-offset: 0.2em;
    }
    footer {
      border-top: 2px solid var(--ink);
      padding-top: 1.5rem;
    }
    @media (max-width: 700px) {
      .constellation {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      button {
        min-height: 140px;
      }
      .bridge span {
        display: none;
      }
    }
  `,
})
export class IdeologiesHubComponent {
  readonly selected = signal('marxismo');
}
