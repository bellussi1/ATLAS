import { type ProgressVersion, progressVersionSchema } from '@core/content/models/study-schema';
import { demonstrationPath } from '@study/data/demonstration-path';

export const STUDY_PATH_ID = demonstrationPath.id;
export const STUDY_LESSON_ID = demonstrationPath.lessons[0].id;
export const STUDY_EXERCISE_ID = demonstrationPath.lessons[0].exercises[0].id;
export const STORAGE_KEY = 'atlas-study-progress-v1';

export function emptyProgress(): ProgressVersion {
  return { version: 1, pathId: STUDY_PATH_ID, completedLessonIds: [], reviewItems: [] };
}

export function parseProgress(json: string): ProgressVersion {
  const progress = progressVersionSchema.parse(JSON.parse(json));
  if (
    progress.pathId !== STUDY_PATH_ID ||
    progress.completedLessonIds.some((id) => id !== STUDY_LESSON_ID) ||
    progress.reviewItems.some((item) => item.exerciseId !== STUDY_EXERCISE_ID) ||
    new Set(progress.completedLessonIds).size !== progress.completedLessonIds.length ||
    new Set(progress.reviewItems.map((item) => item.exerciseId)).size !==
      progress.reviewItems.length
  ) {
    throw new Error('O progresso não pertence a esta trilha ou contém registros inválidos.');
  }
  return progress;
}

export function recordAttempt(
  progress: ProgressVersion,
  correct: boolean,
  today: string,
): ProgressVersion {
  const prior = progress.reviewItems.find((item) => item.exerciseId === STUDY_EXERCISE_ID);
  const intervalDays = correct ? Math.min(30, Math.max(1, (prior?.intervalDays ?? 0) * 2)) : 1;
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + intervalDays);
  return {
    ...progress,
    completedLessonIds: correct ? [STUDY_LESSON_ID] : progress.completedLessonIds,
    reviewItems: [
      { exerciseId: STUDY_EXERCISE_ID, intervalDays, dueAt: date.toISOString().slice(0, 10) },
    ],
  };
}
