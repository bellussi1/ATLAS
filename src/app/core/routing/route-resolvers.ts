import { inject, Injector } from '@angular/core';
import { type ResolveFn } from '@angular/router';
import { type EditorialType, getEditorialType } from '@core/content/editorial/content-types';
import { findEditorialEntry } from '@core/content/editorial/editorial-entries';
import { firstValueFrom } from 'rxjs';

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

async function knowledgeEntity(slug: string | null) {
  const injector = inject(Injector);
  const { ContentRepository } =
    await import('@core/content/repositories/content-repository.service');
  const repository = injector.get(ContentRepository);
  await firstValueFrom(repository.loadKnowledgeGraph());
  return repository.findEntityBySlug(slug);
}

export const knowledgeEntryTitleResolver: ResolveFn<string> = async (route) => {
  const entity = await knowledgeEntity(route.paramMap.get('slug'));
  return entity ? `${entity.title} — ATLAS` : 'Verbete não encontrado — ATLAS';
};
export const knowledgeEntryBreadcrumbResolver: ResolveFn<string> = async (route) =>
  (await knowledgeEntity(route.paramMap.get('slug')))?.title ?? 'Verbete não encontrado';
export const knowledgeEntryDescriptionResolver: ResolveFn<string> = async (route) =>
  (await knowledgeEntity(route.paramMap.get('slug')))?.summary ??
  'Este endereço não corresponde a um verbete cadastrado no ATLAS.';
