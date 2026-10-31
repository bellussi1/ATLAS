import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <section class="page" aria-labelledby="page-title">
      <p class="eyebrow">Erro 404</p>
      <h1 id="page-title">Esta página não existe</h1>
      <p class="page__lead">O endereço pode ter mudado ou não fazer parte do ATLAS.</p>
      <a class="home-link" routerLink="/">Voltar à página inicial <span aria-hidden="true">↗</span></a>
      <nav aria-label="Outros caminhos do ATLAS">
        <a routerLink="/conhecimento">Pesquisar nos registros disponíveis</a>
        <a routerLink="/explorar">Percorrer os formatos editoriais</a>
        <a routerLink="/sobre">Conhecer o projeto</a>
      </nav>
    </section>
  `,
  styles: `
    :host { display: block; }
    .page { max-width: var(--grid-max); margin: 0 auto; padding: clamp(4rem, 12vw, 9rem) var(--grid-gutter); }
    .eyebrow { color: var(--signal); font-size: .72rem; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; }
    h1 { max-width: 12ch; margin: 1.5rem 0; font-size: clamp(3rem, 8vw, 6rem); letter-spacing: -.07em; line-height: .98; }
    .page__lead { max-width: 38rem; color: var(--ink-muted); font: 1.35rem/1.55 var(--serif); }
    .home-link { display: inline-flex; gap: .7rem; margin-top: 1.5rem; color: var(--signal); font-weight: 700; text-decoration-thickness: .08em; text-underline-offset: .2em; }
    nav { display: flex; flex-wrap: wrap; gap: .5rem 1.5rem; margin-top: 2.5rem; }
    nav a { display: inline-flex; align-items: center; min-height: 2.75rem; color: var(--ink); text-underline-offset: .2em; }
    a:focus-visible { outline: 3px solid var(--signal); outline-offset: 3px; }
  `,
})
export class NotFoundPage {}
