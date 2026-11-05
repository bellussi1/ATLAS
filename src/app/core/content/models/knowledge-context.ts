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

/** Why a record matters where it was opened; the page knows this, the graph does not. */
export interface ContextRelevance {
  note?: string | null;
  chapter?: string | null;
}

export interface KnowledgeContext {
  entityId?: string;
  editorialStatus?: Entity['editorialStatus'];
  /** The record contains text synthesised by AI; shown as a seal, never in the prose. */
  aiAssisted?: boolean;
  partialCoverage?: boolean;
  title: string;
  kind: string;
  /** One line saying what the record is. */
  description?: string | null;
  aliases?: string[];
  summary: string;
  relevance?: ContextRelevance;
  paragraphs: string[];
  sections?: { heading: string; paragraphs: string[] }[];
  sources: Source[];
  /** License of the record's text, for the sources area. */
  contentLicense?: { name: string; url: string };
  connections: ContextConnection[];
  media?: AssetLicense;
}

export type ContextRequest =
  { entityId: string; relevance?: ContextRelevance } | { record: KnowledgeContext };

/** One record of the reading order the context panel steps through with previous and next. */
export interface ContextStop {
  key: string;
  request: ContextRequest;
}
