import { relationCategoryDecisions } from '@core/content/editorial/relation-categories';

/**
 * Relation families: one colour and one dash pattern each, so colour is never the only cue.
 * Generic buckets ("connection", "documented association") were removed: every relation is
 * either assigned a concrete family or omitted from the network views.
 */
export type RelationFamilyId =
  | 'influenced'
  | 'rupture'
  | 'participation'
  | 'creation'
  | 'continuity'
  | 'affiliation'
  | 'location';

export interface RelationCategory {
  readonly family: RelationFamilyId;
  /** True when the arrow must point from `toEntityId` to `fromEntityId`. */
  readonly reverse: boolean;
}

export interface ClassifiableRelation {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly provenance?: { readonly url?: string | null } | null;
}

/** Relation `type` values that already name a concrete family. `reverse` flips the arrow. */
const familyByType: Readonly<Record<string, RelationCategory>> = {
  influenced: { family: 'influenced', reverse: false },
  influence: { family: 'influenced', reverse: false },
  causal_claim: { family: 'influenced', reverse: false },
  'causal-claim': { family: 'influenced', reverse: false },
  event_influenced_ideology: { family: 'influenced', reverse: false },
  influenced_by: { family: 'influenced', reverse: true },
  reacted_against: { family: 'rupture', reverse: false },
  participated_in: { family: 'participation', reverse: false },
  member_of: { family: 'participation', reverse: false },
  governed: { family: 'participation', reverse: false },
  founded: { family: 'creation', reverse: false },
  founded_by: { family: 'creation', reverse: true },
  wrote: { family: 'creation', reverse: false },
  authored: { family: 'creation', reverse: false },
  developed_into: { family: 'continuity', reverse: false },
  succeeded: { family: 'continuity', reverse: false },
  preceded_by: { family: 'continuity', reverse: false },
  occurred_in: { family: 'location', reverse: false },
  located_in: { family: 'location', reverse: false },
};

/** Navigation-only types: they never become a visible edge. */
const omittedTypes: ReadonlySet<string> = new Set([
  'encyclopedic_link',
  'encyclopedic-link',
  'editorial_link',
  'editorial-link',
]);

/**
 * Ordered verb rules for generic types (`documented-association`, `associated_with`,
 * `related_to`). The label already carries the historical verb; the first match wins.
 */
const labelRules: readonly { readonly pattern: RegExp; readonly category: RelationCategory }[] = [
  {
    pattern: /\b(sucedeu|suceder|assumiu a (presid|candidat)|subtipo|vertente|derivou|desdobr)/,
    category: { family: 'continuity', reverse: false },
  },
  {
    pattern: /\b(fundou|fundador|criou|escreveu|redigiu|publicou|promulgou|enuncia|apresenta\b)/,
    category: { family: 'creation', reverse: false },
  },
  {
    pattern: /\b(analisa criticamente|opôs-se|combateu|rompeu|reagiu contra)/,
    category: { family: 'rupture', reverse: false },
  },
  {
    pattern:
      /\b(membro|filiad|governou|presidiu|exerceu|cargo|lutou|dirigente|aliado|eleito|vice-presidente|militou|participou|integrou|cadastrad)/,
    category: { family: 'participation', reverse: false },
  },
  {
    pattern: /\b(ocorreu em|sediad|recorte estatal|localiza|situad)/,
    category: { family: 'location', reverse: false },
  },
  {
    pattern:
      /\b(classificado com a ideologia|associado ao movimento|associou-se a pautas|definido constitucionalmente|documento de referência|registra a aprovação)/,
    category: { family: 'affiliation', reverse: false },
  },
];

const overrideFamilies: ReadonlySet<string> = new Set<RelationFamilyId>([
  'influenced',
  'rupture',
  'participation',
  'creation',
  'continuity',
  'affiliation',
  'location',
]);

const overrides: Readonly<Record<string, string>> = relationCategoryDecisions;

function fromOverride(id: string): RelationCategory | null | undefined {
  const decision = overrides[id];
  if (decision === undefined) return undefined;
  if (decision === 'omit') return null;
  const reverse = decision.endsWith(':reverse');
  const family = reverse ? decision.slice(0, -':reverse'.length) : decision;
  return overrideFamilies.has(family) ? { family: family as RelationFamilyId, reverse } : undefined;
}

/**
 * Assigns a concrete family to a relation, or returns `null` when the relation has no
 * historical weight of its own (navigation links, vague co-occurrence) and must be omitted
 * from the network and map views. The underlying record is preserved in the content graph.
 */
export function classifyRelation(relation: ClassifiableRelation): RelationCategory | null {
  const override = fromOverride(relation.id);
  if (override !== undefined) return override;
  const byType = familyByType[relation.type];
  if (byType) return byType;
  if (omittedTypes.has(relation.type)) return null;
  const label = relation.label.trim().toLocaleLowerCase('pt-BR');
  // Wikidata P737 ("influenced by") is published as a catalogue association.
  if (relation.provenance?.url?.includes('#P737') || /-p737-/i.test(relation.id))
    return { family: 'influenced', reverse: true };
  for (const rule of labelRules) {
    if (rule.pattern.test(label)) return rule.category;
  }
  return null;
}
