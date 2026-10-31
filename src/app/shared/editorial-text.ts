import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AtlasEditorialLinkDirective } from './ui-primitives';

interface TextPart {
  text: string;
  path?: string;
  fragment?: string;
}
const destinations: Record<string, { path: string; fragment?: string }> = {
  contexto: { path: '/explorar/artigo/conhecimento-com-contexto' },
  fonte: { path: '/verbete/metodologia-do-atlas', fragment: 'section-0' },
  fontes: { path: '/verbete/metodologia-do-atlas', fragment: 'section-0' },
  evidencia: { path: '/verbete/metodologia-do-atlas', fragment: 'section-0' },
  evidencias: { path: '/verbete/metodologia-do-atlas', fragment: 'section-0' },
  metodologia: { path: '/verbete/metodologia-do-atlas' },
  verbete: { path: '/explorar/verbete' },
  verbetes: { path: '/explorar/verbete' },
};
@Component({
  selector: 'app-editorial-text',
  imports: [RouterLink, AtlasEditorialLinkDirective],
  // Keep this interpolation compact so formatting cannot add text whitespace around linked fragments.
  // prettier-ignore
  template: `@for (part of parts(); track $index) {@if (part.path) {<a appEditorialLink [routerLink]="part.path" [fragment]="part.fragment" [class.inverse]="inverse()">{{ part.text }}</a>} @else {{{ part.text }}}}`,
  styles: `
    :host {
      display: contents;
    }
    a {
      text-decoration: underline;
      text-underline-offset: 0.18em;
    }
    a.inverse {
      color: var(--color-on-strong-surface);
    }
    a.inverse:focus-visible {
      outline-color: var(--color-on-strong-surface);
    }
    a:focus-visible {
      outline-offset: 2px;
    }
    @media (hover: hover) and (pointer: fine) {
      a:hover {
        text-decoration-thickness: 0.15em;
      }
    }
  `,
})
export class AtlasEditorialTextComponent {
  readonly text = input.required<string>();
  readonly currentPath = input('');
  readonly inverse = input(false);
  readonly parts = computed(() => {
    const text = this.text();
    const pattern =
      /(?<![\p{L}\p{N}])(contexto|fontes?|evidências?|metodologia|verbetes?)(?![\p{L}\p{N}])/giu;
    const parts: TextPart[] = [];
    const used = new Set<string>();
    let offset = 0;
    for (const match of text.matchAll(pattern)) {
      const key = match[0]
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      const destination = destinations[key];
      if (
        !destination ||
        destination.path === this.currentPath() ||
        used.has(destination.path) ||
        used.size >= 2
      )
        continue;
      parts.push({ text: text.slice(offset, match.index) }, { text: match[0], ...destination });
      used.add(destination.path);
      offset = match.index + match[0].length;
    }
    parts.push({ text: text.slice(offset) });
    return parts;
  });
}
