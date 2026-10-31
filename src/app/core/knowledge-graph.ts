import type { EntityKind, KnowledgeGraph, Relation } from './content-schema';

export interface KnowledgeEntityQuery {
  entityId?: string;
  atlasId?: string;
  type?: EntityKind;
  fromYear?: number;
  toYear?: number;
  term?: string;
}

export interface KnowledgeRelationQuery {
  atlasId?: string;
  direction?: 'outgoing' | 'incoming' | 'both';
  type?: Relation['type'];
  fromYear?: number;
  toYear?: number;
}

export interface KnowledgeEntityResult {
  atlasId: string;
  entity: KnowledgeGraph['atlases'][number]['entities'][number];
}

export interface KnowledgeRelationResult {
  atlasId: string;
  relationId: string;
  relationType: Relation['type'];
  direction: 'outgoing' | 'incoming';
  relatedEntityId: string;
  label: string;
  context: string;
  uncertainty: Relation['uncertainty'];
  temporalExtent: Relation['temporalExtent'];
  evidenceIds: string[];
}

function overlapsPeriod(
  extent: { startYear: number | null; endYear: number | null } | null,
  fromYear?: number,
  toYear?: number,
): boolean {
  if (fromYear === undefined && toYear === undefined) return true;
  if (!extent || (extent.startYear === null && extent.endYear === null)) return false;
  const start = extent.startYear ?? Number.NEGATIVE_INFINITY;
  const end = extent.endYear ?? Number.POSITIVE_INFINITY;
  return (toYear === undefined || start <= toYear) && (fromYear === undefined || end >= fromYear);
}

export function queryKnowledgeEntities(graph: KnowledgeGraph, query: KnowledgeEntityQuery = {}): KnowledgeEntityResult[] {
  const term = query.term?.trim().toLocaleLowerCase('pt-BR');
  return graph.atlases.flatMap((atlas) => atlas.id === query.atlasId || query.atlasId === undefined
    ? atlas.entities
      .filter((entity) => query.entityId === undefined || entity.id === query.entityId)
      .filter((entity) => query.type === undefined || entity.kind === query.type)
      .filter((entity) => overlapsPeriod(entity.temporalExtent, query.fromYear, query.toYear))
      .filter((entity) => !term || [entity.title, entity.slug, ...entity.aliases].some((value) => value.toLocaleLowerCase('pt-BR').includes(term)))
      .map((entity) => ({ atlasId: atlas.id, entity }))
    : []);
}

export function queryKnowledgeRelations(
  graph: KnowledgeGraph,
  entityId: string,
  query: KnowledgeRelationQuery = {},
): KnowledgeRelationResult[] {
  const direction = query.direction ?? 'both';
  return graph.atlases.flatMap((atlas) => atlas.id === query.atlasId || query.atlasId === undefined
    ? atlas.relations.flatMap((relation) => {
      if (query.type && relation.type !== query.type) return [];
      if (!overlapsPeriod(relation.temporalExtent, query.fromYear, query.toYear)) return [];
      const outgoing = relation.fromEntityId === entityId && direction !== 'incoming';
      const incoming = relation.toEntityId === entityId && direction !== 'outgoing';
      if (!outgoing && !incoming) return [];
      return [{
        atlasId: atlas.id,
        relationId: relation.id,
        relationType: relation.type,
        direction: outgoing ? 'outgoing' as const : 'incoming' as const,
        relatedEntityId: outgoing ? relation.toEntityId : relation.fromEntityId,
        label: outgoing ? relation.label : relation.reverseLabel,
        context: relation.context,
        uncertainty: relation.uncertainty,
        temporalExtent: relation.temporalExtent,
        evidenceIds: relation.evidenceIds,
      }];
    })
    : []);
}
