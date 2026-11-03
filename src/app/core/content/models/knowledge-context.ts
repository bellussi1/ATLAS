import type { AssetLicense, Entity, Relation, Source } from './content-schema';

export interface ContextConnection {
  id?: string;
  entityId: string;
  label: string;
  relation?: {
    type: Relation['type'];
    label: string;
    direction: 'incoming' | 'outgoing';
    context: string;
    uncertainty: Relation['uncertainty'];
    editorialStatus: Relation['editorialStatus'];
    provenance: Relation['provenance'];
    references: { id: string; locator: string; source: Source }[];
  };
}

export interface KnowledgeContext {
  entityId?: string;
  editorialStatus?: Entity['editorialStatus'];
  title: string;
  kind: string;
  summary: string;
  paragraphs: string[];
  sources: Source[];
  connections: ContextConnection[];
  media?: AssetLicense;
}

export type ContextRequest = { entityId: string } | { record: KnowledgeContext };

/** One record of the reading order the context panel steps through with previous and next. */
export interface ContextStop {
  key: string;
  request: ContextRequest;
}
