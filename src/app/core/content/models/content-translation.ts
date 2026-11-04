import { z } from 'zod';

import type { Entity } from './content-schema';

export const contentLocaleSchema = z.enum(['pt-BR', 'en']);
const text = z.string().trim().min(1);
export const translatedTextSchema = z.object({
  title: text,
  summary: text,
  context: text,
  sections: z.array(z.object({ heading: text, paragraphs: z.array(text).min(1) })).min(1),
});
export const contentTranslationSchema = z.object({
  entityId: text,
  locale: contentLocaleSchema,
  sourceLocale: z.enum(['pt-BR', 'pt-PT', 'en', 'und', 'mul']),
  sourceRevision: z.number().int().positive(),
  sourceDigest: z.string().regex(/^[a-f0-9]{64}$/),
  preparedBy: text,
  preparedAt: z.iso.date(),
  text: translatedTextSchema,
  review: z.discriminatedUnion('status', [
    z.object({ status: z.literal('pending'), note: text }),
    z.object({
      status: z.literal('approved'),
      method: z.enum(['human', 'assistant']),
      reviewer: text,
      reviewedAt: z.iso.date(),
      reference: text,
      note: text,
    }),
  ]),
});
export const translationCatalogueSchema = z
  .object({
    schemaVersion: z.literal(1),
    defaultLocale: z.literal('pt-BR'),
    locales: z.array(contentLocaleSchema).min(1),
    entries: z.array(contentTranslationSchema),
  })
  .superRefine((catalogue, context) => {
    if (!catalogue.locales.includes(catalogue.defaultLocale))
      context.addIssue({ code: 'custom', message: 'O idioma padrão deve estar habilitado.' });
    const keys = catalogue.entries.map((e) => `${e.entityId}:${e.locale}`);
    if (
      new Set(keys).size !== keys.length ||
      new Set(catalogue.locales).size !== catalogue.locales.length
    )
      context.addIssue({
        code: 'custom',
        message: 'Idiomas e traduções por entidade devem ser únicos.',
      });
    for (const entry of catalogue.entries) {
      if (!catalogue.locales.includes(entry.locale) || entry.locale === entry.sourceLocale)
        context.addIssue({
          code: 'custom',
          message: 'Idioma da tradução deve ser habilitado e diferente da origem.',
        });
      if (entry.review.status === 'approved' && entry.review.reviewedAt < entry.preparedAt)
        context.addIssue({ code: 'custom', message: 'Revisão não pode anteceder a preparação.' });
    }
  });
export type ContentTranslation = z.infer<typeof contentTranslationSchema>;
export type TranslatedText = z.infer<typeof translatedTextSchema>;
export function entityTranslationSource(entity: Entity): TranslatedText {
  return {
    title: entity.title,
    summary: entity.summary,
    context: entity.context,
    sections: entity.sections,
  };
}
