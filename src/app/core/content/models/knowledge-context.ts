import type { AssetLicense, Source } from './content-schema';

export interface KnowledgeContext {
  title: string;
  kind: string;
  summary: string;
  paragraphs: string[];
  sources: Source[];
  connections: { entityId: string; label: string }[];
  media?: AssetLicense;
}

export type ContextRequest = { entityId: string } | { record: KnowledgeContext };
