import { readerPredicate, readerProse } from '@core/content/editorial/reader-voice';
import type { Atlas } from '@core/content/models/content-schema';
import type { KnowledgeTerm } from '@ideologies/models/knowledge-term';
import { knowledgeTextParts } from '@ideologies/utils/knowledge-text-parts';

export interface ChapterReview {
  /** Retrieval question built from a documented relation between two records of the chapter. */
  recall: { question: string; answer: string; context: string } | null;
  /** Records met two chapters earlier and not since: spaced re-encounter. */
  revisit: { entityId: string; label: string }[];
}

const REVISIT_LIMIT = 3;

function mentioned(paragraphs: readonly string[], vocabulary: readonly KnowledgeTerm[]) {
  const found = new Map<string, string>();
  for (const paragraph of paragraphs)
    for (const part of knowledgeTextParts(paragraph, vocabulary))
      if (part.term && !found.has(part.term.entityId))
        found.set(part.term.entityId, part.term.label);
  return found;
}

/**
 * End-of-chapter review derived only from data: a recall question from a relation the
 * graph documents between two records named in the chapter, and the records to revisit
 * from two chapters before. Chapters without such data get no exercise.
 */
export function chapterReviews(
  chapters: readonly { narrative: readonly string[] }[],
  atlas: Atlas | undefined,
  vocabulary: readonly KnowledgeTerm[],
): ChapterReview[] {
  const titles = new Map(atlas?.entities.map((e) => [e.id, e.title]));
  const seen = chapters.map((c) => mentioned(c.narrative, vocabulary));
  return seen.map((names, index) => {
    const relation = (atlas?.relations ?? []).find(
      (r) =>
        names.has(r.fromEntityId) &&
        names.has(r.toEntityId) &&
        titles.has(r.fromEntityId) &&
        titles.has(r.toEntityId) &&
        r.type !== 'encyclopedic-link' &&
        r.context,
    );
    const recall = relation
      ? {
          question: `Que relação o capítulo estabelece entre ${titles.get(relation.fromEntityId)} e ${titles.get(relation.toEntityId)}?`,
          answer: `${titles.get(relation.fromEntityId)} ${readerPredicate(relation.label)} ${titles.get(relation.toEntityId)}.`,
          context: readerProse(relation.context) ?? '',
        }
      : null;
    const earlier = index >= 2 ? seen[index - 2] : new Map<string, string>();
    const since = new Set([...(seen[index - 1]?.keys() ?? []), ...names.keys()]);
    const revisit = [...earlier]
      .filter(([id]) => !since.has(id) && titles.has(id))
      .slice(0, REVISIT_LIMIT)
      .map(([entityId]) => ({ entityId, label: titles.get(entityId) ?? entityId }));
    return { recall, revisit };
  });
}
