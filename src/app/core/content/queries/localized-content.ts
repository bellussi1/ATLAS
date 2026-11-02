import type { Entity } from '@core/content/models/content-schema';
import type { ContentTranslation } from '@core/content/models/content-translation';

export const contentLanguageLabels: Partial<Record<string, string>> = {
  'pt-BR': 'Português (Brasil)',
  'pt-PT': 'Português (Portugal)',
  en: 'English',
  und: 'Idioma não identificado',
  mul: 'Idiomas mistos',
};
export function localizedEntity(
  entity: Entity,
  requested: string | null,
  translations: readonly ContentTranslation[] = [],
) {
  const translation = translations.find(
    (t) =>
      t.entityId === entity.id &&
      t.locale === requested &&
      t.review.status === 'approved' &&
      t.sourceRevision === entity.revision,
  );
  return {
    entity: translation ? { ...entity, ...translation.text } : entity,
    locale: translation?.locale ?? entity.textLocale ?? 'und',
    translation,
    fallback: !!requested && requested !== (entity.textLocale ?? 'und') && !translation,
  };
}
