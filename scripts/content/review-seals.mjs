/**
 * Editorial seal audit. The UI can only show a seal that the data supports: a reviewed item
 * needs a reviewer and a date, an assistant review needs an explicit AI marker, and a human
 * review cannot be attributed to an assistant. Used by `content:build` and `test:content`.
 */
const AI_MARKER = /assistid[ao] por ia|s[íi]ntese por ia|revis[ãa]o por ia/i;
const AI_REVIEWER = /(?:^|[\s(])(?:ia|assistant|assistente|codex \(ia\))(?:$|[\s).])/i;

const isPending = (status) => status === 'pending' || status === 'draft';

export function auditReviewSeals({ graph = { atlases: [] }, translations = [], readings = [] }) {
  const issues = [];
  for (const entry of translations) {
    const review = entry.review;
    if (!review) {
      issues.push(`Tradução ${entry.entityId}:${entry.locale} sem registro de revisão.`);
      continue;
    }
    if (review.status !== 'approved') continue;
    if (!review.reviewer || !review.reviewedAt || !review.reference)
      issues.push(
        `Tradução ${entry.entityId}:${entry.locale} aprovada sem revisor, data ou referência.`,
      );
    if (review.method === 'assistant' && !AI_MARKER.test(review.note ?? ''))
      issues.push(
        `Tradução ${entry.entityId}:${entry.locale} assistida por IA sem marca de IA na nota.`,
      );
    if (review.method === 'human' && AI_REVIEWER.test(review.reviewer))
      issues.push(
        `Tradução ${entry.entityId}:${entry.locale} declarada humana, mas o revisor é de IA.`,
      );
  }
  for (const atlas of graph.atlases ?? []) {
    for (const review of atlas.reviews ?? []) {
      if (isPending(review.status)) continue;
      if (!review.reviewer || !review.reviewedAt)
        issues.push(`Revisão ${review.id} (${atlas.id}) concluída sem revisor ou data.`);
    }
  }
  for (const page of readings) {
    if (page.review?.status !== 'revisado') continue;
    if (!page.review.reviewer)
      issues.push(`Leitura ${page.slug ?? page.id} marcada como revisada sem revisor.`);
  }
  return issues;
}
