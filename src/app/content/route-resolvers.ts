import { ResolveFn } from '@angular/router';
import { findEditorialEntry } from './editorial-entries';
import { EditorialType, getEditorialType } from './content-types';

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
  return findEditorialEntry(category?.slug, route.paramMap.get('slug'))?.title ?? 'Conteúdo não encontrado';
};

export const trailTitleResolver: ResolveFn<string> = (route) =>
  findEditorialEntry('trilha', route.paramMap.get('slug'))?.title ?? 'Conteúdo não encontrado';
