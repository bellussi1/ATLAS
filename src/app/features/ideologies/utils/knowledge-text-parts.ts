import { terms } from '@ideologies/data/knowledge-vocabulary';
import { type KnowledgeTerm, type TextPart } from '@ideologies/models/knowledge-term';

interface CompiledVocabulary {
  pattern: RegExp | null;
  byLabel: Map<string, KnowledgeTerm>;
}

/**
 * A reading renders every paragraph with the same vocabulary. Building the alternation and the
 * lookup table once per vocabulary turns a per-paragraph cost into a per-page one.
 */
const compiledCache = new WeakMap<readonly KnowledgeTerm[], CompiledVocabulary>();

function compile(vocabulary: readonly KnowledgeTerm[]): CompiledVocabulary {
  const byLabel = new Map<string, KnowledgeTerm>();
  for (const term of vocabulary) {
    const key = term.label.toLocaleLowerCase('pt-BR');
    if (!byLabel.has(key)) byLabel.set(key, term);
  }
  const escaped = vocabulary
    .map((term) => term.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length);
  return {
    pattern: escaped.length
      ? new RegExp(`(?<![\\p{L}\\p{N}])(${escaped.join('|')})(?![\\p{L}\\p{N}])`, 'giu')
      : null,
    byLabel,
  };
}

function compiledVocabulary(vocabulary: readonly KnowledgeTerm[]): CompiledVocabulary {
  let compiled = compiledCache.get(vocabulary);
  if (!compiled) {
    compiled = compile(vocabulary);
    compiledCache.set(vocabulary, compiled);
  }
  return compiled;
}

export function knowledgeTextParts(
  text: string,
  vocabulary: readonly KnowledgeTerm[] = terms,
): TextPart[] {
  const { pattern, byLabel } = compiledVocabulary(vocabulary);
  if (!pattern) return [{ text }];
  // matchAll clones the expression, so the shared instance keeps its own cursor at zero.
  pattern.lastIndex = 0;
  const parts: TextPart[] = [];
  const used = new Set<string>();
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    const term = byLabel.get(match[0].toLocaleLowerCase('pt-BR'));
    if (!term || used.has(term.entityId) || used.size >= 4) continue;
    parts.push({ text: text.slice(offset, match.index) }, { text: match[0], term });
    used.add(term.entityId);
    offset = match.index + match[0].length;
  }
  parts.push({ text: text.slice(offset) });
  return parts;
}
