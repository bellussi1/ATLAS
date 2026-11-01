import { Component, type ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AtlasHeadingDirective } from '@shared/directives/heading/heading.directive';
import { AtlasGeometricMosaicComponent } from '@shared/ui/geometric-mosaic/geometric-mosaic.component';
import { AtlasTextFieldComponent } from '@shared/ui/text-field/text-field.component';

import { ExplorationToolsComponent } from './exploration-tools/exploration-tools.component';

@Component({
  selector: 'app-home-page',
  imports: [
    AtlasHeadingDirective,
    AtlasTextFieldComponent,
    AtlasGeometricMosaicComponent,
    ExplorationToolsComponent,
    RouterLink,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePage {
  private readonly router = inject(Router);
  readonly query = signal('');
  readonly seed = signal(7);
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
