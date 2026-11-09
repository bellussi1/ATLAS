/**
 * Lente de pertencimento de uma tradição.
 *
 * O registro guarda os QIDs aceitos na descoberta (`belonging.qids`) e a raiz (`rootQid`). A
 * lente resolve esses QIDs contra o grafo inteiro: as entidades continuam nas coleções onde já
 * estavam, sem cópia, movimentação ou coleção paralela. Cobertura, glossário e leitura usam a
 * mesma resolução, para não divergirem sobre o que pertence à tradição.
 */

/** Primeiro registro de cada QID, com a coleção que o contém. */
export function entitiesByQid(atlases) {
  const byQid = new Map();
  for (const atlas of atlases)
    for (const entity of atlas.entities) {
      const qid = entity.externalIds?.wikidata;
      if (qid && !byQid.has(qid)) byQid.set(qid, { atlas, entity });
    }
  return byQid;
}

/** QIDs da lente: a raiz sempre entra, mesmo que o registro só liste os aceitos. */
export function lensQids(registry) {
  return [...new Set([registry.rootQid, ...(registry.belonging?.qids ?? [])])];
}

/** Uma lente só existe quando o registro declara ao menos um aceito; sem isso, vale a coleção. */
export function hasLens(registry) {
  return (registry.belonging?.qids?.length ?? 0) > 0;
}

/**
 * Resolve a lente no grafo. `missing` preserva a ordem dos QIDs para o relatório; `ids` é o
 * conjunto usado pelo escopo de cobertura, glossário e leitura.
 */
export function resolveLens(atlases, qids) {
  const byQid = entitiesByQid(atlases);
  const entities = [];
  const missing = [];
  for (const qid of new Set(qids)) {
    const hit = byQid.get(qid);
    if (hit) entities.push({ qid, ...hit });
    else missing.push(qid);
  }
  return {
    qids: [...new Set(qids)],
    entities,
    ids: new Set(entities.map(({ entity }) => entity.id)),
    missing,
  };
}
