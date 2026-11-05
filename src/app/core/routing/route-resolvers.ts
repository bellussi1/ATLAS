import { inject, Injector } from '@angular/core';
import { type ResolveFn } from '@angular/router';
import { catalogueForKind, explorerCatalogues } from '@core/content/queries/knowledge-explorer';
import { localizedEntity } from '@core/content/queries/localized-content';
import { firstValueFrom } from 'rxjs';

async function loadedRepository() {
  const injector = inject(Injector);
  const { ContentRepository } =
    await import('@core/content/repositories/content-repository.service');
  const repository = injector.get(ContentRepository);
  await firstValueFrom(repository.loadKnowledgeGraph());
  return repository;
}

async function knowledgeEntity(slug: string | null, locale: string | null) {
  const repository = await loadedRepository();
  const entity = repository.findEntityBySlug(slug);
  return entity
    ? localizedEntity(
        entity,
        locale,
        repository.discoveryIndex.find((e) => e.id === entity.id)?.translations,
      ).entity
    : undefined;
}

export const knowledgeEntryTitleResolver: ResolveFn<string> = async (route) => {
  const entity = await knowledgeEntity(
    route.paramMap.get('slug'),
    route.queryParamMap.get('idioma'),
  );
  return entity ? `${entity.title} — ATLAS` : 'Verbete não encontrado — ATLAS';
};
export const knowledgeEntryBreadcrumbResolver: ResolveFn<string> = async (route) =>
  (await knowledgeEntity(route.paramMap.get('slug'), route.queryParamMap.get('idioma')))?.title ??
  'Verbete não encontrado';
export const knowledgeEntryDescriptionResolver: ResolveFn<string> = async (route) =>
  (await knowledgeEntity(route.paramMap.get('slug'), route.queryParamMap.get('idioma')))?.summary ??
  'Este endereço não corresponde a um verbete do acervo.';

/** The catalogue that lists the record, as a breadcrumb crumb; `undefined` when the record is unknown. */
export const knowledgeEntryCatalogueResolver: ResolveFn<
  { label: string; url: string } | undefined
> = async (route) => {
  const repository = await loadedRepository();
  const entity = repository.findEntityBySlug(route.paramMap.get('slug'));
  const kind = entity
    ? repository.discoveryIndex.find((item) => item.id === entity.id)?.kind
    : undefined;
  if (!kind) return undefined;
  const catalogue = explorerCatalogues.find((item) => item.path === catalogueForKind(kind));
  return catalogue ? { label: catalogue.title, url: `/${catalogue.path}` } : undefined;
};
