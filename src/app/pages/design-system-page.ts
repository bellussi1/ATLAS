import { DOCUMENT } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AtlasButtonComponent,
  AtlasContentSummaryComponent,
  AtlasDisclosureComponent,
  AtlasEditorialLinkDirective,
  AtlasHeadingDirective,
  AtlasMenuComponent,
  AtlasNoticeComponent,
  AtlasPageTemplateComponent,
  AtlasTextFieldComponent,
} from '../shared/ui-primitives';

@Component({
  selector: 'app-design-system-page',
  imports: [
    AtlasButtonComponent,
    AtlasContentSummaryComponent,
    AtlasDisclosureComponent,
    AtlasEditorialLinkDirective,
    AtlasHeadingDirective,
    AtlasMenuComponent,
    AtlasNoticeComponent,
    AtlasPageTemplateComponent,
    AtlasTextFieldComponent,
    RouterLink,
  ],
  template: `
    <section class="showroom" aria-labelledby="showroom-title">
      <header class="showroom__intro">
        <p class="showroom__eyebrow">Fundamentos · Prompt 05</p>
        <h1 appHeading="display" id="showroom-title">Sistema visual do ATLAS</h1>
        <p class="showroom__lead">
          Componentes editoriais, cartográficos e de arquivo organizados para leitura,
          navegação por teclado e ampliação de conteúdo.
        </p>
        <app-notice tone="info" accessibleRole="status">
          Esta é uma meta de projeto alinhada a WCAG 2.2 AA. A página não declara conformidade
          integral nem substitui avaliação com pessoas e tecnologias assistivas.
        </app-notice>
      </header>

      <div class="showroom__layout">
        <aside class="showroom__toc" aria-label="Índice do showroom">
          <app-menu label="Nesta página" orientation="vertical">
            <a [routerLink]="[]" [fragment]="'tokens'" (click)="focusSection('tokens', $event)">Tokens</a>
            <a [routerLink]="[]" [fragment]="'tipografia'" (click)="focusSection('tipografia', $event)">Tipografia e templates</a>
            <a [routerLink]="[]" [fragment]="'controles'" (click)="focusSection('controles', $event)">Links, botões e campos</a>
            <a [routerLink]="[]" [fragment]="'estados'" (click)="focusSection('estados', $event)">Menus, sumários e estados</a>
          </app-menu>
        </aside>

        <div class="showroom__content">
          <section tabindex="-1" id="tokens" class="showroom__section" aria-labelledby="tokens-title">
            <p class="showroom__kicker">01 / Fundações</p>
            <h2 appHeading="section" id="tokens-title">Cor por função, não por decoração</h2>
            <p>Os nomes semânticos separam superfície, leitura, ação, foco e estados de mensagem.</p>
            <ul class="palette" aria-label="Paleta semântica do sistema">
              <li class="swatch swatch--canvas"><span>Fundo · canvas</span><code>#FBFAF7</code></li>
              <li class="swatch swatch--surface"><span>Superfície</span><code>#FBFAF7</code></li>
              <li class="swatch swatch--ink"><span>Texto principal</span><code>#1C1C1A</code></li>
              <li class="swatch swatch--muted"><span>Texto de apoio</span><code>#57544D</code></li>
              <li class="swatch swatch--accent"><span>Ação / foco</span><code>#B4231D</code></li>
              <li class="swatch swatch--teal"><span>Verde de suporte</span><code>#85BDB5</code></li>
              <li class="swatch swatch--ochre"><span>Ocre de suporte</span><code>#EDC45B</code></li>
              <li class="swatch swatch--rose"><span>Rosa de suporte</span><code>#E9B4BF</code></li>
              <li class="swatch swatch--indigo"><span>Índigo de exposição</span><code>#37395E</code></li>
              <li class="swatch swatch--map"><span>Cartografia</span><code>#315F54</code></li>
              <li class="swatch swatch--archive"><span>Arquivo</span><code>#176176</code></li>
            </ul>
            <p class="showroom__contrast">
              As combinações de texto, foco, controles e superfícies são verificadas por contraste sRGB.
              A documentação registra as razões medidas, o método e os limites desta revisão.
            </p>
          </section>

          <section tabindex="-1" id="tipografia" class="showroom__section" aria-labelledby="type-title">
            <p class="showroom__kicker">02 / Leitura</p>
            <h2 appHeading="section" id="type-title">Uma escala para cada camada</h2>
            <p class="type-sample__display">Título de exposição em Plex Sans</p>
            <p class="type-sample__reading">A Source Serif 4 distingue a leitura longa e o texto de apoio editorial.</p>
            <p class="type-sample__metadata">ATLAS · METADADO · 2026</p>
            <app-content-summary headingId="showroom-summary-title">
              <p>Um sumário condensa a ideia principal e mantém sua relação com o conteúdo desenvolvido.</p>
            </app-content-summary>

            <div class="template-examples" aria-label="Variantes do template editorial">
              <app-page-template kind="editorial" labelledBy="template-editorial-title">
                <p class="showroom__kicker">ARTIGO</p>
                <h3 appHeading="section" id="template-editorial-title">Template de leitura</h3>
                <p>Coluna de leitura com largura confortável e margem para contexto.</p>
              </app-page-template>
              <app-page-template kind="index" labelledBy="template-index-title">
                <p class="showroom__kicker">ÍNDICE</p>
                <h3 appHeading="section" id="template-index-title">Template de índice</h3>
                <p>Faixa ampla para percorrer entradas e comparar categorias.</p>
              </app-page-template>
              <app-page-template kind="profile" labelledBy="template-profile-title">
                <p class="showroom__kicker">PERFIL</p>
                <h3 appHeading="section" id="template-profile-title">Template de perfil</h3>
                <p>Coluna mais estreita para biografia, fontes e metadados.</p>
              </app-page-template>
            </div>
          </section>

          <section tabindex="-1" id="controles" class="showroom__section" aria-labelledby="controls-title">
            <p class="showroom__kicker">03 / Ações</p>
            <h2 appHeading="section" id="controls-title">Links, botões e campos</h2>
            <p><a appEditorialLink routerLink="/explorar">Link editorial para explorar o acervo</a></p>
            <div class="button-examples" aria-label="Variantes de botão">
              <app-button>Continuar leitura</app-button>
              <app-button variant="secondary">Ação secundária</app-button>
              <app-button variant="quiet">Ação discreta</app-button>
              <app-button [disabled]="true">Indisponível</app-button>
              <app-button [busy]="true">Preparando conteúdo</app-button>
            </div>
            <div class="field-examples" aria-label="Estados de campo">
              <app-text-field
                controlId="demo-topic"
                label="Tema de interesse"
                placeholder="Ex.: migrações"
                hint="Campo opcional; a demonstração não envia dados."
              />
              <app-text-field
                controlId="demo-email"
                label="Endereço de e-mail"
                type="email"
                value="endereco-invalido"
                error="Revise o endereço e use o formato nome@exemplo.com."
                [required]="true"
              />
              <app-text-field
                controlId="demo-disabled"
                label="Campo indisponível"
                value="Exemplo desativado"
                hint="O estado também é indicado pelo atributo disabled."
                [disabled]="true"
              />
              <app-text-field controlId="demo-readonly" label="Campo somente leitura" value="Texto consultável" hint="Permite foco e cópia; não permite edição." [readonly]="true" />
            </div>
          </section>

          <section tabindex="-1" id="estados" class="showroom__section" aria-labelledby="states-title">
            <p class="showroom__kicker">04 / Navegação e estados</p>
            <h2 appHeading="section" id="states-title">Menus, sumários e respostas</h2>
            <app-disclosure label="Como usar os componentes">
              <p>Use rótulos curtos, associe instruções aos campos e mantenha links identificáveis fora do contexto.</p>
            </app-disclosure>
            <div class="state-examples">
              <app-notice accessibleRole="status">Nenhum resultado para esta seleção. Tente outro ponto de partida.</app-notice>
              <app-notice tone="warning">Este aviso demonstra uma mensagem de atenção.</app-notice>
              <app-notice tone="critical" accessibleRole="alert">Revise o endereço antes de continuar.</app-notice>
              @if (successVisible()) {
                <app-notice tone="success" accessibleRole="status">Ação demonstrativa concluída.</app-notice>
              }
              <app-button (click)="showSuccess()">Mostrar feedback de sucesso</app-button>
            </div>
          </section>

          <p class="showroom__return"><a appEditorialLink routerLink="/">Voltar à página inicial</a></p>
        </div>
      </div>
    </section>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .showroom { width: min(100%, 96rem); min-width: 0; margin-inline: auto; padding: clamp(2rem, 6vw, 5rem) var(--grid-gutter) var(--space-16); }
    .showroom__intro { max-width: 66rem; }
    .showroom__eyebrow, .showroom__kicker { margin: 0 0 var(--space-3); color: var(--color-accent); font: 700 var(--text-caption)/1.4 var(--font-mono); letter-spacing: .08em; text-transform: uppercase; }
    h1 { max-width: 14ch; margin: 0; line-height: .98; letter-spacing: -.06em; }
    .showroom__lead { max-width: 60ch; margin: var(--space-6) 0 var(--space-8); color: var(--color-ink-muted); font: var(--text-lead)/1.55 var(--font-serif); }
    .showroom__layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-6); align-items: start; margin-top: clamp(var(--space-12), 7vw, 6rem); }
    .showroom__toc { position: static; padding-block: var(--space-3); border-block: 1px solid var(--color-border); }
    .showroom__toc .atlas-menu { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr)); gap: 0 var(--space-3); }
    .showroom__content { min-width: 0; }
    .showroom__section { min-width: 0; margin-bottom: clamp(var(--space-12), 8vw, 7rem); scroll-margin-top: var(--space-8); }
    h2 { margin: 0 0 var(--space-4); }
    .showroom__section > p:not(.showroom__kicker) { max-width: 68ch; color: var(--color-ink-muted); }
    .palette { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr)); gap: var(--space-2); margin: var(--space-6) 0; padding: 0; list-style: none; }
    .swatch { display: grid; min-height: 5.5rem; align-content: space-between; gap: var(--space-3); padding: var(--space-3); border: 1px solid var(--color-border); }
    .swatch span, .swatch code { color: inherit; font: 600 var(--text-small)/1.3 var(--font-mono); }
    .swatch--canvas { background: var(--color-canvas); color: var(--color-ink); }
    .swatch--surface { background: var(--color-surface); color: var(--color-ink); }
    .swatch--ink { background: var(--color-ink); color: var(--color-on-strong-surface); }
    .swatch--muted { background: var(--color-ink-muted); color: var(--color-on-strong-surface); }
    .swatch--accent { background: var(--color-accent); color: var(--color-on-strong-surface); }
    .swatch--teal { background: var(--color-teal-paper); color: var(--color-ink); }
    .swatch--ochre { background: var(--color-ochre-paper); color: var(--color-ink); }
    .swatch--rose { background: var(--color-rose-paper); color: var(--color-ink); }
    .swatch--indigo { background: var(--color-indigo); color: var(--color-on-strong-surface); }
    .swatch--map { background: var(--color-cartographic); color: var(--color-on-strong-surface); }
    .swatch--archive { background: var(--color-archive); color: var(--color-on-strong-surface); }
    .showroom__contrast { padding-top: var(--space-3); border-top: 1px solid var(--color-border); font-size: var(--text-small); }
    .type-sample__display { font-size: clamp(1.6rem, 3.5vw, 2.6rem); font-weight: 650; letter-spacing: -.04em; }
    .type-sample__reading { max-width: 52ch; font: var(--text-lead)/1.6 var(--font-serif); }
    .type-sample__metadata { color: var(--color-ink-muted); font: var(--text-caption)/1.5 var(--font-mono); letter-spacing: .06em; }
    .template-examples { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr)); gap: var(--space-3); margin-top: var(--space-8); }
    app-page-template { min-width: 0; border-block: 1px solid var(--color-border-strong); background: var(--color-surface); }
    app-page-template p:last-child { margin-bottom: 0; color: var(--color-ink-muted); }
    .button-examples, .state-examples { display: flex; flex-wrap: wrap; align-items: stretch; flex-direction: column; gap: var(--space-3); margin-block: var(--space-6); }
    .button-examples app-button { width: 100%; }
    .field-examples { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr)); gap: var(--space-6); margin-top: var(--space-8); }
    .showroom__return { margin-top: var(--space-12); }
    @media (min-width: 24rem) { .button-examples { align-items: flex-start; flex-direction: row; } .button-examples app-button { width: auto; } }
    @media (min-width: 40rem) { .showroom { padding-block: clamp(var(--space-12), 6vw, 5rem) var(--space-16); } }
    @media (min-width: 48rem) { .showroom__layout { grid-template-columns: minmax(10rem, .28fr) minmax(0, 1fr); gap: clamp(var(--space-8), 7vw, 6rem); } .showroom__toc { position: sticky; top: var(--space-4); } .showroom__toc .atlas-menu { display: flex; } .button-examples, .state-examples { align-items: center; } }
  `,
})
export class DesignSystemPage {
  private readonly document = inject(DOCUMENT);
  readonly successVisible = signal(false);

  focusSection(id: string, event: MouseEvent): void {
    if (event.button || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    this.document.getElementById(id)?.focus({ preventScroll: true });
  }

  showSuccess(): void {
    this.successVisible.set(true);
  }
}
