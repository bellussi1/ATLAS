import { titleKey } from './normalize.mjs';

export function reconcileRequests(graph, requestedEntities) {
  const byId = new Map();
  const byQid = new Map();
  for (const entity of graph.atlases.flatMap((atlas) => atlas.entities)) {
    if (byId.has(entity.id)) throw Error(`Conflito de ID global: ${entity.id}`);
    byId.set(entity.id, entity);
    const qid = entity.externalIds?.wikidata;
    if (!qid) continue;
    if (byQid.has(qid)) throw Error(`Conflito global: ${qid} identifica mais de uma entidade.`);
    byQid.set(qid, entity);
  }
  const records = new Map();
  const assignedQidById = new Map();
  const mapping = {};
  for (const [requestedId, search, , kind, wikidataId] of requestedEntities) {
    if (!/^Q\d+$/.test(wikidataId)) throw Error(`QID explícito inválido: ${requestedId}`);
    const sameId = byId.get(requestedId);
    const sameQid = byQid.get(wikidataId);
    if (sameId?.externalIds?.wikidata && sameId.externalIds.wikidata !== wikidataId)
      throw Error(
        `Conflito: ${requestedId} já identifica ${sameId.externalIds.wikidata}, não ${wikidataId}.`,
      );
    if (sameId && sameQid && sameId.id !== sameQid.id)
      throw Error(`Conflito de identidade entre ${requestedId} e ${sameQid.id}.`);
    const existing = sameQid ?? sameId;
    if (existing && existing.kind !== kind) throw Error(`Conflito de tipo para ${requestedId}.`);
    const id = existing?.id ?? requestedId;
    if (assignedQidById.has(id) && assignedQidById.get(id) !== wikidataId)
      throw Error(`Conflito: ${id} solicitado para mais de um QID.`);
    assignedQidById.set(id, wikidataId);
    const previous = records.get(wikidataId);
    if (previous && (previous.id !== id || previous.kind !== kind))
      throw Error(`Conflito: escolha um ID canônico explícito para ${wikidataId}.`);
    if (Object.hasOwn(mapping, requestedId) && mapping[requestedId] !== id)
      throw Error(`Conflito: ${requestedId} solicitado para duas identidades.`);
    mapping[requestedId] = id;
    records.set(wikidataId, { id, search, wikidataId, kind, existing });
    byId.set(id, existing ?? { id, kind, externalIds: { wikidata: wikidataId } });
    byQid.set(wikidataId, byId.get(id));
  }
  return { records: [...records.values()].sort((a, b) => a.id.localeCompare(b.id, 'en')), mapping };
}

export function titleIndex(entities) {
  const candidates = new Map();
  for (const entity of entities) {
    const labels = [
      entity.title,
      ...(entity.aliases ?? []),
      entity.externalIds?.wikipedia,
      entity.discoveryMetadata?.wikipediaTitle,
    ];
    for (const label of labels.filter(Boolean)) {
      const key = titleKey(label);
      if (!candidates.has(key)) candidates.set(key, new Set());
      candidates.get(key).add(entity.id);
    }
  }
  return {
    resolve: (title) => {
      const ids = candidates.get(titleKey(title));
      return ids?.size === 1 ? [...ids][0] : undefined;
    },
    ambiguous: [...candidates]
      .filter(([, ids]) => ids.size > 1)
      .map(([key]) => key)
      .sort(),
  };
}

export function uniqueLabels(values) {
  const labels = new Map();
  for (const value of values) {
    const label = value.trim().replace(/\s+/g, ' ');
    if (label && !labels.has(titleKey(label))) labels.set(titleKey(label), label);
  }
  return [...labels.values()];
}

export function mergeRecords(existing, incoming) {
  const generated = new Map();
  for (const record of incoming) {
    if (
      generated.has(record.id) &&
      JSON.stringify(generated.get(record.id)) !== JSON.stringify(record)
    )
      throw Error(`Registros gerados conflitantes: ${record.id}`);
    generated.set(record.id, record);
  }
  return [
    ...new Map([...existing, ...generated.values()].map((record) => [record.id, record])).values(),
  ];
}
