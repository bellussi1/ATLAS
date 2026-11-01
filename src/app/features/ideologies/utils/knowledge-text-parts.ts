import { terms } from '@ideologies/data/knowledge-vocabulary';
import { type KnowledgeTerm, type TextPart } from '@ideologies/models/knowledge-term';

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
