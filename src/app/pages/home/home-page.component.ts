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
import { explorerCatalogues } from '@core/content/queries/explorer-catalogues';
import { readingPath } from '@core/routing/reading-routes';
import { AtlasHeadingDirective } from '@shared/directives/heading/heading.directive';
import { AtlasRevealDirective } from '@shared/directives/reveal/reveal.directive';
import { AtlasGeometricMosaicComponent } from '@shared/ui/geometric-mosaic/geometric-mosaic.component';
import { AtlasTextFieldComponent } from '@shared/ui/text-field/text-field.component';

import { HomeHowtoComponent } from './howto/howto.component';

@Component({
  selector: 'app-home-page',
  imports: [
    AtlasHeadingDirective,
    AtlasTextFieldComponent,
    AtlasGeometricMosaicComponent,
    AtlasRevealDirective,
    HomeHowtoComponent,
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
      summary: 'Explore pessoas, ideias, obras e acontecimentos na leitura do liberalismo.',
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
    {
      slug: 'social-democracia',
      type: 'atlas' as const,
      title: 'Social-democracia',
      tagline: 'Reforma, Estado e bem-estar',
      palette: 'atlas' as const,
      seed: 41,
      summary:
        'Do debate entre reforma e revolução às disputas sobre Estado, mercado e direitos sociais.',
      statusLabel: 'Conteúdo em revisão',
      sections: [
        {
          heading: 'Reforma ou ruptura',
          paragraphs: [
            'Siga pessoas, partidos e obras que defenderam transformar a sociedade por meios democráticos, e veja onde essa leitura se separa do marxismo e do liberalismo.',
          ],
        },
      ],
    },
    {
      slug: 'anarquismo',
      type: 'atlas' as const,
      title: 'Anarquismo',
      tagline: 'Autoridade, autonomia e apoio mútuo',
      palette: 'atlas' as const,
      seed: 53,
      summary: 'Uma tradição que questiona a autoridade e propõe formas de organização sem Estado.',
      statusLabel: 'Conteúdo em revisão',
      sections: [
        {
          heading: 'Contra a autoridade imposta',
          paragraphs: [
            'Conheça correntes, pensadores e acontecimentos do anarquismo, com as fontes e as divergências internas à vista.',
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
      const host = this.host.nativeElement;
      let sections: HTMLElement[] = [];
      let offsets: number[] = [];
      let frame = 0;
      // Reading the section rectangles is reserved for layout changes. Scroll only compares
      // against cached offsets, so it never forces a synchronous reflow.
      const update = () => {
        frame = 0;
        let active = 0;
        const line = win.scrollY + 150;
        for (let index = 0; index < offsets.length; index++)
          if (offsets[index] < line) active = index;
        this.tone.set(active % 6);
      };
      const scheduleUpdate = () => {
        if (!frame) frame = win.requestAnimationFrame(update);
      };
      const measure = () => {
        frame = 0;
        sections = [...host.querySelectorAll<HTMLElement>('[data-tone-section]')];
        const y = win.scrollY;
        offsets = sections.map((section) => section.getBoundingClientRect().top + y);
        update();
      };
      const scheduleMeasure = () => {
        if (!frame) frame = win.requestAnimationFrame(measure);
      };
      win.addEventListener('scroll', scheduleUpdate, { passive: true });
      win.addEventListener('resize', scheduleMeasure);
      const observer =
        typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(scheduleMeasure) : null;
      observer?.observe(host);
      measure();
      void this.document.fonts?.ready.then(scheduleMeasure);
      this.destroyRef.onDestroy(() => {
        win.removeEventListener('scroll', scheduleUpdate);
        win.removeEventListener('resize', scheduleMeasure);
        win.cancelAnimationFrame(frame);
        observer?.disconnect();
      });
    });
  }

  readonly entryPath = (_type: string, slug: string) => readingPath(slug);

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
    void this.router.navigate(['/acervo'], {
      queryParams: { q: this.query().trim() || null },
    });
  }
}
