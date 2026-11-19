import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

interface SectionLink {
  readonly path: string;
  readonly label: string;
  readonly glyph: 'square' | 'half' | 'circle' | 'diamond' | 'ring' | 'page';
}

/** Main destinations, in the same order as the site header. */
const SECTIONS: readonly SectionLink[] = [
  { path: '/', label: 'Início', glyph: 'page' },
  { path: '/leituras', label: 'Leituras', glyph: 'square' },
  { path: '/itinerarios', label: 'Itinerários', glyph: 'half' },
  { path: '/acervo', label: 'Acervo', glyph: 'square' },
  { path: '/grafos', label: 'Grafo', glyph: 'circle' },
  { path: '/mapa', label: 'Mapa', glyph: 'diamond' },
];

/**
 * Compact menu for full-window tools (graph, map) that hide the site header: one button
 * opens the main destinations in a native popover, with light dismiss and Escape.
 */
@Component({
  selector: 'app-section-switcher',
  imports: [RouterLink],
  templateUrl: './section-switcher.component.html',
  styleUrl: './section-switcher.component.scss',
})
export class AtlasSectionSwitcherComponent {
  /** Path of the page that hosts the menu; it is marked as current. */
  readonly current = input.required<string>();
  readonly sections = SECTIONS;
  readonly menuId = computed(() => `section-menu${this.current().replace(/[^a-z]+/g, '-')}`);
}
