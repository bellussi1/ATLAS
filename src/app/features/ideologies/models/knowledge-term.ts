export interface KnowledgeTerm {
  label: string;
  entityId: string;
  kind: string;
  definition: string;
}

export interface TextPart {
  text: string;
  term?: KnowledgeTerm;
}
