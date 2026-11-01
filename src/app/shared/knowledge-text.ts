import { Component, computed, input } from '@angular/core';

import { KnowledgeContextDirective } from './knowledge-context';

export interface KnowledgeTerm {
  label: string;
  entityId: string;
  kind: string;
  definition: string;
}
const terms: KnowledgeTerm[] = [
  {
    label: 'Materialismo histórico',
    entityId: 'concept-historical-materialism',
    kind: 'Conceito',
    definition: 'Abrir contexto, fontes e conexões desta abordagem da história.',
  },
  {
    label: 'tempo de trabalho socialmente necessário',
    entityId: 'concept-trabalho-socialmente-necessario',
    kind: 'Conceito',
    definition: 'Investigar o conceito na análise do valor em Marx.',
  },
  {
    label: 'Karl Marx',
    entityId: 'person-karl-marx',
    kind: 'Pensador',
    definition: 'Abrir trajetória, contexto e registros relacionados.',
  },
  {
    label: 'Friedrich Engels',
    entityId: 'person-friedrich-engels',
    kind: 'Pensador',
    definition: 'Abrir registro biográfico e suas conexões.',
  },
  {
    label: 'Manifesto Comunista',
    entityId: 'work-communist-manifesto',
    kind: 'Obra',
    definition: 'Abrir o documento e sua proveniência.',
  },
  {
    label: 'O capital',
    entityId: 'work-capital-volume-i',
    kind: 'Obra',
    definition: 'Investigar o primeiro volume e os conceitos relacionados.',
  },
  {
    label: 'Bernstein',
    entityId: 'person-eduard-bernstein',
    kind: 'Pensador',
    definition: 'Consultar o registro e o contexto do debate.',
  },
  {
    label: 'Luxemburg',
    entityId: 'person-rosa-luxemburg',
    kind: 'Pensadora',
    definition: 'Consultar o registro e o contexto da crítica.',
  },
  {
    label: 'Kautsky',
    entityId: 'person-karl-kautsky',
    kind: 'Pensador',
    definition: 'Consultar registro e relações, em revisão.',
  },
  {
    label: 'Lenin',
    entityId: 'person-vladimir-lenin',
    kind: 'Pensador',
    definition: 'Consultar registro e contexto do debate sobre Estado.',
  },
];
interface TextPart {
  text: string;
  term?: KnowledgeTerm;
}
export function knowledgeTextParts(
  text: string,
  vocabulary: readonly KnowledgeTerm[] = terms,
): TextPart[] {
  const escaped = vocabulary
    .map((t) => t.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length);
  if (!escaped.length) return [{ text }];
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${escaped.join('|')})(?![\\p{L}\\p{N}])`, 'giu');
  const parts: TextPart[] = [];
  const used = new Set<string>();
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    const term = vocabulary.find(
      (t) => t.label.toLocaleLowerCase('pt-BR') === match[0].toLocaleLowerCase('pt-BR'),
    );
    if (!term || used.has(term.entityId) || used.size >= 4) continue;
    parts.push({ text: text.slice(offset, match.index) }, { text: match[0], term });
    used.add(term.entityId);
    offset = match.index + match[0].length;
  }
  parts.push({ text: text.slice(offset) });
  return parts;
}
@Component({
  selector: 'app-knowledge-text',
  imports: [KnowledgeContextDirective],
  template: `@for (part of parts(); track $index) {
    @if (part.term; as term) {
      <span class="term-wrap"
        ><button
          type="button"
          class="knowledge-term"
          [attr.data-kind]="term.kind"
          [attr.aria-label]="part.text + ': abrir contexto de ' + term.kind"
          [appKnowledgeContext]="{ entityId: term.entityId }"
        >
          {{ part.text }}<span aria-hidden="true" class="term-cue">+</span></button
        ><span class="term-preview" aria-hidden="true"
          ><strong>{{ term.kind }}</strong
          >{{ term.definition }}</span
        ></span
      >
    } @else {
      {{ part.text }}
    }
  }`,
  styleUrl: './knowledge-text.scss',
})
export class KnowledgeTextComponent {
  readonly text = input.required<string>();
  readonly parts = computed(() => knowledgeTextParts(this.text()));
}
