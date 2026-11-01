import { methodologyKnowledgeGraph } from '@core/content/repositories/content-repository.service';
import { demonstrationPath } from '@study/data/demonstration-path';

import { emptyProgress, parseProgress, recordAttempt } from './study-progress';

describe('study progress', () => {
  it('uses a demonstrative path whose lesson and feedback point to existing records', () => {
    const graph = methodologyKnowledgeGraph.atlases;
    const lesson = demonstrationPath.lessons[0];
    expect(
      graph.some((atlas) => atlas.entities.some((entity) => entity.id === lesson.entityId)),
    ).toBe(true);
    expect(
      graph.some((atlas) =>
        atlas.sources.some((source) => source.id === lesson.exercises[0].feedback.sourceId),
      ),
    ).toBe(true);
  });
  it('round-trips exported progress and schedules retries', () => {
    const wrong = recordAttempt(emptyProgress(), false, '2026-10-31');
    expect(wrong.reviewItems[0]).toMatchObject({ dueAt: '2026-11-01', intervalDays: 1 });
    const correct = recordAttempt(wrong, true, '2026-11-01');
    expect(correct.reviewItems[0]).toMatchObject({ dueAt: '2026-11-03', intervalDays: 2 });
    expect(parseProgress(JSON.stringify(correct))).toEqual(correct);
  });

  it('rejects unknown versions and paths', () => {
    expect(() => parseProgress(JSON.stringify({ ...emptyProgress(), version: 2 }))).toThrow();
    expect(() =>
      parseProgress(JSON.stringify({ ...emptyProgress(), pathId: 'outra-trilha' })),
    ).toThrow();
  });
});
