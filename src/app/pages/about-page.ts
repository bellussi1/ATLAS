import { Component } from '@angular/core';

@Component({
  selector: 'app-about-page',
  template: `
    <section class="page" aria-labelledby="page-title">
      <p class="eyebrow">Por que existe</p>
      <h1 id="page-title">Sobre o ATLAS</h1>
      <p class="page__lead">
        O ATLAS é uma plataforma educacional pública e gratuita sobre história, política, economia e sociedade, com perspectiva mundial e brasileira.
      </p>
      <p class="page__note">
        Nosso propósito é tornar ideias e processos mais compreensíveis por meio de contexto, conexões e fontes identificáveis.
      </p>
    </section>
  `,
  styles: `
    :host { display: block; }
    .page { max-width: 68rem; margin: 0 auto; padding: clamp(4rem, 12vw, 9rem) clamp(1.25rem, 8vw, 8rem); }
    .eyebrow { color: var(--signal); font-size: .72rem; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; }
    h1 { max-width: 12ch; margin: 1.5rem 0; font-size: clamp(3rem, 8vw, 6rem); letter-spacing: -.07em; line-height: .98; }
    .page__lead { max-width: 42rem; color: var(--ink-muted); font: 1.35rem/1.55 var(--serif); }
    .page__note { max-width: 42rem; margin-top: 3rem; padding-top: 1.2rem; border-top: 1px solid var(--rule-strong); color: var(--ink-muted); line-height: 1.65; }
  `,
})
export class AboutPage {}
