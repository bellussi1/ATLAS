import { Component, computed, type ElementRef, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AtlasEditorialMarkComponent } from '../shared/editorial-mark';
import {
  AtlasEditorialLinkDirective,
  AtlasHeadingDirective,
  AtlasTextFieldComponent,
} from '../shared/ui-primitives';

@Component({
  selector: 'app-home-page',
  imports: [
    AtlasEditorialLinkDirective,
    AtlasHeadingDirective,
    AtlasTextFieldComponent,
    AtlasEditorialMarkComponent,
    RouterLink,
  ],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  readonly query = signal('');
  readonly readings = [
    {
      slug: 'marxismo',
      type: 'atlas' as const,
      title: 'Marxismo',
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
  readonly searched = signal(false);
  readonly matches = computed(() => {
    const query = this.query()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    return this.readings.filter((e) =>
      (e.title + ' ' + e.summary)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .includes(query),
    );
  });
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
  search(event: Event): void {
    event.preventDefault();
    this.searched.set(true);
  }
}
