import {
  hasPartialCoverage,
  isAiAssisted,
  readerProse,
} from '@core/content/editorial/reader-voice';
import { reproducibleAsset } from '@core/content/media/asset-license';
import { type ContextRequest, type KnowledgeContext } from '@core/content/models/knowledge-context';
import { type ContentRepository } from '@core/content/repositories/content-repository.service';

export function entityContext(
  repository: Pick<ContentRepository, 'knowledgeGraph'> &
    Partial<Pick<ContentRepository, 'queryRelations'>>,
  id: string,
): KnowledgeContext {
  const graph = repository.knowledgeGraph;
  const atlas = graph.atlases.find((a) => a.entities.some((e) => e.id === id));
  const entity = atlas?.entities.find((e) => e.id === id);
  if (!entity || !atlas)
    return {
      title: 'Registro indisponível',
      kind: 'Acervo',
      summary: 'Este registro não foi encontrado no acervo.',
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
    party: 'Partido',
    place: 'Lugar',
    government: 'Governo',
    'historical-polity': 'Formação política histórica',
    policy: 'Política pública',
    article: 'Artigo',
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
  const entities = new Map(graph.atlases.flatMap((a) => a.entities).map((e) => [e.id, e]));
  const evidences = new Map(graph.atlases.flatMap((a) => a.evidences).map((e) => [e.id, e]));
  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const indexedRelationIds = repository.queryRelations
    ? new Set(repository.queryRelations(id).map((result) => result.relationId))
    : null;
  const connections: KnowledgeContext['connections'] = graph.atlases
    .flatMap((a) => a.relations)
    .filter((r) =>
      indexedRelationIds
        ? indexedRelationIds.has(r.id)
        : r.fromEntityId === id || r.toEntityId === id,
    )
    .map((r) => {
      const outgoing = r.fromEntityId === id;
      const target = outgoing ? r.toEntityId : r.fromEntityId;
      return {
        id: r.id,
        entityId: target,
        label: entities.get(target)?.title ?? target,
        relation: {
          type: r.type,
          label: outgoing ? r.label : r.reverseLabel,
          direction: outgoing ? 'outgoing' : 'incoming',
          context: r.context,
          uncertainty: r.uncertainty,
          editorialStatus: r.editorialStatus,
          provenance: r.provenance,
          references: r.evidenceIds.flatMap((evidenceId) => {
            const evidence = evidences.get(evidenceId);
            const source = evidence && sourceById.get(evidence.sourceId);
            return evidence && source
              ? [{ id: evidence.id, locator: evidence.locator, source }]
              : [];
          }),
        },
      };
    });
  const asset =
    atlas.assetLicenses.find((a) => a.entityId === id) ??
    atlas.assetLicenses.find(
      (a) =>
        (id === 'person-karl-marx' && a.id === 'asset-marx-portrait') ||
        (id === 'person-adam-smith' && a.id === 'asset-smith-portrait'),
    );
  const seen = new Set([entity.summary]);
  const fresh = (paragraph: string) => {
    const prose = readerProse(paragraph);
    if (!prose || seen.has(prose)) return [];
    seen.add(prose);
    return [prose];
  };
  const sections = entity.sections.flatMap(({ heading, paragraphs }) => {
    const prose = paragraphs.flatMap(fresh);
    return prose.length ? [{ heading, paragraphs: prose }] : [];
  });
  const discovery = entity.discoveryMetadata;
  const kind =
    entity.kind === 'place' && entity.placeType === 'country'
      ? 'País'
      : entity.kind === 'place' && entity.placeType === 'regime'
        ? 'Regime'
        : (labels[entity.kind] ?? 'Registro');
  return {
    entityId: entity.id,
    editorialStatus: entity.editorialStatus,
    aiAssisted: isAiAssisted(references),
    partialCoverage: hasPartialCoverage(entity.context),
    title: entity.title,
    kind,
    description:
      discovery?.description && discovery.description !== entity.summary
        ? discovery.description
        : null,
    aliases: entity.aliases,
    summary: entity.summary,
    paragraphs: fresh(entity.context),
    sections,
    sources: references,
    contentLicense: discovery && {
      name: discovery.contentLicense,
      url: discovery.contentLicenseUrl,
    },
    connections,
    media: asset && reproducibleAsset(atlas, asset.assetPath),
  };
}

/** What a request shows: the entity's record, with why it matters where it was opened. */
export function contextFor(
  repository: Parameters<typeof entityContext>[0],
  request: ContextRequest,
): KnowledgeContext {
  if ('record' in request) return request.record;
  const record = entityContext(repository, request.entityId);
  return request.relevance ? { ...record, relevance: request.relevance } : record;
}
