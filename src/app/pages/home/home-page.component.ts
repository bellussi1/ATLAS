import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { explorerCatalogues } from '@core/content/queries/knowledge-explorer';
import { AtlasHeadingDirective } from '@shared/directives/heading/heading.directive';
import { AtlasRevealDirective } from '@shared/directives/reveal/reveal.directive';
import { AtlasGeometricMosaicComponent } from '@shared/ui/geometric-mosaic/geometric-mosaic.component';
import { AtlasTextFieldComponent } from '@shared/ui/text-field/text-field.component';

@Component({
  selector: 'app-home-page',
  imports: [
    AtlasHeadingDirective,
    AtlasTextFieldComponent,
    AtlasGeometricMosaicComponent,
    AtlasRevealDirective,
    RouterLink,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  host: {
    '[attr.data-tone]': 'tone()',
    '[style.--tint]': 'tint()',
  },
})
export class HomePage {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  /** The poster keeps the base colour; each later section tints the page, as in the readings. */
  readonly tone = signal(0);
  /** Base colour for the poster, then one tint per section step (`--tint-n` in styles.scss). */
  readonly tint = computed(() =>
    this.tone() ? `var(--tint-${this.tone()})` : 'var(--color-canvas)',
  );
  readonly query = signal('');
  readonly seed = signal(7);
  /** Catalogues offered on the home page; the search page lists the rest. */
  readonly catalogues = explorerCatalogues.filter((catalogue) =>
    ['pessoas', 'obras', 'paises', 'acontecimentos', 'conceitos', 'fontes'].includes(
      catalogue.path,
    ),
  );
  readonly readings = [
    {
      slug: 'marxismo',
      type: 'atlas' as const,
      title: 'Marxismo',
      tagline: 'Trabalho, valor e divergências',
      palette: 'marx' as const,
      seed: 11,
      summary: 'Uma tradição, muitas leituras: conceitos, pensadores e divergências.',
      statusLabel: 'Conteúdo com fontes · revisão pendente',
      sections: [
        {
          heading: 'Uma tradição em disputa',
          paragraphs: [
            'Investigue as perguntas sobre trabalho, valor, história e transformação social em uma leitura contínua com fontes identificadas.',
          ],
        },
      ],
    },
    {
      slug: 'liberalismo',
      type: 'atlas' as const,
      title: 'Liberalismo',
      tagline: 'Liberdade, propriedade e mercado',
      palette: 'liberal' as const,
      seed: 23,
      summary: 'Explore pessoas, ideias, obras e acontecimentos no Atlas do Liberalismo.',
      statusLabel: 'Acervo em revisão',
      sections: [
        {
          heading: 'Uma ideia, muitas conexões',
          paragraphs: [
            'Selecione registros para consultar contexto e proveniência. Alterne entre rede, cronologia e imagens sem sair da página.',
          ],
        },
      ],
    },
  ];
  readonly selected = signal(this.readings[0]);
  readonly sheet = viewChild<ElementRef<HTMLElement>>('sheet');
  private selectionMotion?: Animation;

  constructor() {
    afterNextRender(() => {
      const win = this.document.defaultView;
      if (!win || typeof win.requestAnimationFrame !== 'function') return;
      let frame = 0;
      const measure = () => {
        const sections =
          this.host.nativeElement.querySelectorAll<HTMLElement>('[data-tone-section]');
        let active = 0;
        sections.forEach((section, index) => {
          if (section.getBoundingClientRect().top < 150) active = index;
        });
        this.tone.set(active % 6);
      };
      const schedule = () => {
        if (!frame)
          frame = win.requestAnimationFrame(() => {
            frame = 0;
            measure();
          });
      };
      win.addEventListener('scroll', schedule, { passive: true });
      win.addEventListener('resize', schedule);
      schedule();
      this.destroyRef.onDestroy(() => {
        win.removeEventListener('scroll', schedule);
        win.removeEventListener('resize', schedule);
        win.cancelAnimationFrame(frame);
      });
    });
  }

  readonly entryPath = (_type: string, slug: string) => '/' + slug;

  selectSlug(slug: string): void {
    const entry = this.readings.find((item) => item.slug === slug);
    if (entry) {
      this.selectionMotion?.cancel();
      this.selected.set(entry);
    }
  }
  select(entry: (typeof this.readings)[number], event: MouseEvent): void {
    this.selectionMotion?.cancel();
    this.selected.set(entry);
    const element = this.sheet()?.nativeElement;
    if (
      !element ||
      typeof element.animate !== 'function' ||
      !event.detail ||
      element.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const tokens = element.ownerDocument.defaultView!.getComputedStyle(element);
    this.selectionMotion = element.animate([{ opacity: 0.45 }, { opacity: 1 }], {
      duration: parseFloat(tokens.getPropertyValue('--motion-selection')) || 180,
      easing: tokens.getPropertyValue('--ease-out').trim() || 'cubic-bezier(0.23, 1, 0.32, 1)',
    });
  }
  recompose(): void {
    this.seed.update((seed) => (seed * 31 + 17) % 9973);
  }
  search(event: Event): void {
    event.preventDefault();
    void this.router.navigate(['/conhecimento'], {
      queryParams: { q: this.query().trim() || null },
    });
  }
}
