import { type ResolveFn } from '@angular/router';
import { type EditorialType, getEditorialType } from '@core/content/editorial/content-types';
import { findEditorialEntry } from '@core/content/editorial/editorial-entries';

export const editorialTypeResolver: ResolveFn<EditorialType | undefined> = (route) =>
  getEditorialType(route.paramMap.get('tipo'))?.slug;

export const contentTypeTitleResolver: ResolveFn<string> = (route) => {
  const category = getEditorialType(route.paramMap.get('tipo'));
  return category ? `${category.plural} — ATLAS` : 'Categoria não encontrada — ATLAS';
};

export const contentTypeBreadcrumbResolver: ResolveFn<string> = (route) =>
  getEditorialType(route.paramMap.get('tipo'))?.plural ?? 'Categoria não encontrada';

export const editorialEntryTitleResolver: ResolveFn<string> = (route) => {
  const category = getEditorialType(route.paramMap.get('tipo'));
  return (
    findEditorialEntry(category?.slug, route.paramMap.get('slug'))?.title ??
    'Conteúdo não encontrado'
  );
};

export const trailTitleResolver: ResolveFn<string> = (route) =>
  findEditorialEntry('trilha', route.paramMap.get('slug'))?.title ?? 'Conteúdo não encontrado';

export const knowledgeEntryTitleResolver: ResolveFn<string> = async (route) => {
  const { methodologyKnowledgeGraph } =
    await import('@core/content/repositories/content-repository.service');
  const slug = route.paramMap.get('slug');
  const entity = methodologyKnowledgeGraph.atlases
    .flatMap((atlas) => atlas.entities)
    .find((item) => item.slug === slug);
  return entity ? `${entity.title} — ATLAS` : 'Verbete não encontrado — ATLAS';
};

export const knowledgeEntryBreadcrumbResolver: ResolveFn<string> = async (route) => {
  const { methodologyKnowledgeGraph } =
    await import('@core/content/repositories/content-repository.service');
  const slug = route.paramMap.get('slug');
  return (
    methodologyKnowledgeGraph.atlases
      .flatMap((atlas) => atlas.entities)
      .find((item) => item.slug === slug)?.title ?? 'Verbete não encontrado'
  );
};

export const knowledgeEntryDescriptionResolver: ResolveFn<string> = async (route) => {
  const { methodologyKnowledgeGraph } =
    await import('@core/content/repositories/content-repository.service');
  const slug = route.paramMap.get('slug');
  return (
    methodologyKnowledgeGraph.atlases
      .flatMap((atlas) => atlas.entities)
      .find((item) => item.slug === slug)?.summary ??
    'Este endereço não corresponde a um verbete cadastrado no ATLAS.'
  );
};
