import { z } from 'zod';

const id = z.string().regex(/^[a-z][a-z0-9-]*$/);
export const feedbackSchema = z.object({ explanation: z.string().trim().min(1), sourceId: id });
export const exerciseSchema = z
  .object({
    id,
    prompt: z.string().trim().min(1),
    options: z.array(z.object({ id, text: z.string().trim().min(1) })).min(2),
    correctOptionId: id,
    feedback: feedbackSchema,
  })
  .superRefine((exercise, context) => {
    const ids = exercise.options.map((option) => option.id);
    if (new Set(ids).size !== ids.length || !ids.includes(exercise.correctOptionId)) {
      context.addIssue({
        code: 'custom',
        message: 'As opções devem ter IDs únicos e incluir a resposta correta.',
      });
    }
  });
export const lessonSchema = z.object({
  id,
  title: z.string().trim().min(1),
  entityId: id,
  exercises: z.array(exerciseSchema).min(1),
});
export const studyPathSchema = z.object({
  id,
  slug: id,
  title: z.string().trim().min(1),
  objectives: z.array(z.string().trim().min(1)).min(1),
  prerequisites: z.array(z.string().trim().min(1)),
  lessons: z.array(lessonSchema).min(1),
});
export const reviewItemSchema = z.object({
  exerciseId: id,
  dueAt: z.iso.date(),
  intervalDays: z.number().int().nonnegative(),
});
export const progressVersionSchema = z.object({
  version: z.literal(1),
  pathId: id,
  completedLessonIds: z.array(id),
  reviewItems: z.array(reviewItemSchema),
});
export type Lesson = z.infer<typeof lessonSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type Feedback = z.infer<typeof feedbackSchema>;
export type ReviewItem = z.infer<typeof reviewItemSchema>;
export type ProgressVersion = z.infer<typeof progressVersionSchema>;
