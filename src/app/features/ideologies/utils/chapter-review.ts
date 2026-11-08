import type { Atlas, Source } from '@core/content/models/content-schema';
import type { IdeologyPage } from '@ideologies/models/ideology-page.schema';

export interface ChapterReview {
  question: string;
  answer: string;
  /** What the question asks the reader to do, shown before the answer. */
  rationale: string;
  sources: Source[];
  /** Earlier records that gain a new meaning here, with the connection to perceive. */
  revisit: { entityId: string; label: string; why: string }[];
}

/**
 * End-of-chapter review read from the dossier, not assembled from graph relations. A chapter
 * without an explicit review stays without one; the editor decides when a question is worth asking.
 */
export function chapterReviews(
  chapters: IdeologyPage['chapters'],
  atlas: Atlas | undefined,
  resolveSources: (ids: string[]) => Source[],
): (ChapterReview | null)[] {
  const titles = new Map(atlas?.entities.map((entity) => [entity.id, entity.title]));
  return chapters.map((chapter) => {
    const review = chapter.review;
    if (!review) return null;
    return {
      question: review.question,
      answer: review.answer,
      rationale: review.rationale,
      sources: resolveSources(review.sourceIds),
      revisit: review.revisit.map((item) => ({
        entityId: item.entityId,
        label: titles.get(item.entityId) ?? item.entityId,
        why: item.why,
      })),
    };
  });
}
