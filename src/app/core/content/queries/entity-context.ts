import { reproducibleAsset } from '@core/content/media/asset-license';
import { type KnowledgeContext } from '@core/content/models/knowledge-context';
import { type ContentRepository } from '@core/content/repositories/content-repository.service';

export function entityContext(repository: ContentRepository, id: string): KnowledgeContext {
  const graph = repository.knowledgeGraph;
  const atlas = graph.atlases.find((a) => a.entities.some((e) => e.id === id));
  const entity = atlas?.entities.find((e) => e.id === id);
  if (!entity || !atlas)
    return {
      title: 'Registro indisponível',
      kind: 'Acervo',
      summary: 'Este contexto não foi encontrado.',
      paragraphs: [],
      sources: [],
      connections: [],
    };
  const labels: Record<string, string> = {
    person: 'Pensador',
    concept: 'Conceito',
    ideology: 'Tradição / ideia',
    work: 'Obra',
    event: 'Acontecimento',
    institution: 'Instituição',
  };
  const sources = graph.atlases.flatMap((a) => a.sources);
  const evidenceIds = graph.atlases
    .flatMap((a) => a.claims.filter((c) => c.entityId === id).flatMap((c) => c.citationIds))
    .flatMap(
      (citationId) =>
        graph.atlases.flatMap((a) => a.citations).find((c) => c.id === citationId)?.evidenceId ??
        [],
    );
  const sourceIds = graph.atlases.flatMap((a) =>
    a.evidences.filter((e) => evidenceIds.includes(e.id)).map((e) => e.sourceId),
  );
  const references = sources.filter((s) => sourceIds.includes(s.id));
  if (entity.discoveryMetadata)
    references.push({
      id: 'context-origin',
      title: entity.discoveryMetadata.attribution,
      url: entity.discoveryMetadata.wikipediaUrl,
      edition: entity.discoveryMetadata.contentLicense,
      publicationDate: null,
    });
  const connections = [
    ...new Map(
      graph.atlases
        .flatMap((a) => a.relations)
        .filter((r) => r.fromEntityId === id || r.toEntityId === id)
        .map((r) => {
          const target = r.fromEntityId === id ? r.toEntityId : r.fromEntityId;
          const title = graph.atlases
            .flatMap((a) => a.entities)
            .find((e) => e.id === target)?.title;
          return [
            target,
            {
              entityId: target,
              label: `${title ?? target} · ${r.type === 'encyclopedic-link' ? 'descoberta enciclopédica' : 'relação registrada, em revisão'}`,
            },
          ];
        }),
    ).values(),
  ].slice(0, 8);
  const asset =
    atlas.assetLicenses.find((a) => a.entityId === id) ??
    atlas.assetLicenses.find(
      (a) =>
        (id === 'person-karl-marx' && a.id === 'asset-marx-portrait') ||
        (id === 'person-adam-smith' && a.id === 'asset-smith-portrait'),
    );
  return {
    title: entity.title,
    kind: labels[entity.kind] ?? 'Registro',
    summary: entity.summary,
    paragraphs: [entity.context, ...entity.sections.flatMap((s) => s.paragraphs)],
    sources: references,
    connections,
    media: asset && reproducibleAsset(atlas, asset.assetPath),
  };
}
