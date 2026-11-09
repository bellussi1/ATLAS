import { type KnowledgeGraph, placeTypeOf } from '@core/content/models/content-schema';
import type { KnowledgeTerm } from '@ideologies/models/knowledge-term';
import { kindLabel } from '@ideologies/utils/desk-graph';

/** Labels shorter than this are too ambiguous to link automatically. */
const MIN_LABEL = 4;
const MAX_DEFINITION = 170;
const NO_MANUAL: readonly KnowledgeTerm[] = [];
/** The graph is immutable per release; every paragraph on a page shares the same vocabulary. */
const vocabularyCache = new WeakMap<
  KnowledgeGraph,
  Map<readonly KnowledgeTerm[], KnowledgeTerm[]>
>();

/** Cuts a summary at a word boundary so the hover explanation stays one short line. */
export function shortDefinition(summary: string, max = MAX_DEFINITION): string {
  const text = summary.trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '')}…`;
}

/**
 * Explorable words derived from the graph: each record's title and aliases, explained by
 * its own summary. Hand-written terms add labels (a surname, a variant) for the same
 * records, but the explanation always comes from the graph when the record exists there.
 */
export function graphVocabulary(
  graph: KnowledgeGraph,
  manual: readonly KnowledgeTerm[] = NO_MANUAL,
): KnowledgeTerm[] {
  let perGraph = vocabularyCache.get(graph);
  if (!perGraph) {
    perGraph = new Map();
    vocabularyCache.set(graph, perGraph);
  }
  const cached = perGraph.get(manual);
  if (cached) return cached;
  const byId = new Map<string, KnowledgeTerm>();
  const result: KnowledgeTerm[] = [];
  const seen = new Set<string>();
  const add = (term: KnowledgeTerm) => {
    const key = term.label.toLocaleLowerCase('pt-BR');
    if (term.label.length < MIN_LABEL || seen.has(key)) return;
    seen.add(key);
    result.push(term);
  };
  for (const entity of graph.atlases.flatMap((a) => a.entities)) {
    if (byId.has(entity.id)) continue;
    const base = {
      entityId: entity.id,
      kind: kindLabel(entity.kind, placeTypeOf(entity)),
      definition: shortDefinition(entity.summary),
    };
    byId.set(entity.id, { ...base, label: entity.title });
    for (const label of [entity.title, ...entity.aliases]) add({ ...base, label });
  }
  for (const term of manual) {
    const fromGraph = byId.get(term.entityId);
    add(fromGraph ? { ...fromGraph, label: term.label } : term);
  }
  perGraph.set(manual, result);
  return result;
}
