import type { ContextTerm } from '@core/content/queries/context-vocabulary';

export interface ContextTextPart {
  text: string;
  term?: ContextTerm;
}

/** Maximum linked terms in one paragraph; the context sheet is focused, so six is enough. */
const MAX_TERMS = 6;

/**
 * Splits a paragraph into plain and explorable parts. The regex is case-insensitive and keeps
 * multi-word labels (for example "meios de produção") together; each record is linked once.
 */
export function contextTextParts(
  text: string,
  vocabulary: readonly ContextTerm[],
): ContextTextPart[] {
  const escaped = vocabulary
    .map((term) => term.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length);
  if (!escaped.length) return [{ text }];
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${escaped.join('|')})(?![\\p{L}\\p{N}])`, 'giu');
  const byLabel = new Map(vocabulary.map((term) => [term.label.toLocaleLowerCase('pt-BR'), term]));
  const parts: ContextTextPart[] = [];
  const used = new Set<string>();
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    const term = byLabel.get(match[0].toLocaleLowerCase('pt-BR'));
    if (!term || used.has(term.entityId) || used.size >= MAX_TERMS) continue;
    parts.push({ text: text.slice(offset, match.index) }, { text: match[0], term });
    used.add(term.entityId);
    offset = match.index + match[0].length;
  }
  parts.push({ text: text.slice(offset) });
  return parts;
}
