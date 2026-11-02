import { digest } from './archive.mjs';
import { claimItem, statementReferences, datesFor, entityType } from './normalize.mjs';
import { reconcileRequests, titleIndex, uniqueLabels, mergeRecords } from './reconcile.mjs';

const ownerPriority = ['person', 'work', 'event', 'institution', 'place', 'concept', 'ideology'];

/**
 * In remote mode a Commons file becomes one URL, and asset paths must be unique. When several
 * records cite the same file (a portrait reused by an ideology), the most specific record owns it.
 */
export function remoteMediaOwners(records) {
  const rank = (kind) => {
    const index = ownerPriority.indexOf(kind);
    return index === -1 ? ownerPriority.length : index;
  };
  const owners = new Map();
  for (const record of records) {
    const file = record.item.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (!file) continue;
    const current = records.find((r) => r.entity.id === owners.get(file));
    const better =
      !current ||
      rank(record.entity.kind) < rank(current.entity.kind) ||
      (rank(record.entity.kind) === rank(current.entity.kind) &&
        record.entity.id < current.entity.id);
    if (better) owners.set(file, record.entity.id);
  }
  return owners;
}

export async function transformGraph({
  graph,
  config,
  atlasKey,
  retrievedAt,
  getJson,
  getImage,
  mediaMode,
  onProgress = () => {},
}) {
  const mediaWrites = [];
  const oldAtlas = graph.atlases.find((atlas) => atlas.id === config.id);
  const existingEntities = graph.atlases.flatMap((atlas) => atlas.entities);
  const reconciled = reconcileRequests(graph, config.entities);
  const searchResults = reconciled.records;
  const itemUrl = new URL('https://www.wikidata.org/w/api.php');
  itemUrl.search = new URLSearchParams({
    action: 'wbgetentities',
    ids: searchResults.map((item) => item.wikidataId).join('|'),
    props: 'labels|descriptions|aliases|claims|sitelinks',
    languages: 'en|pt',
    sitefilter: 'enwiki|ptwiki',
    format: 'json',
  });
  const wikidata = await getJson(itemUrl);
  const records = [];

  for (const requested of searchResults) {
    const item = wikidata.entities?.[requested.wikidataId];
    if (!item || item.missing !== undefined || item.id !== requested.wikidataId)
      throw Error(`Resposta Wikidata ausente ou incompatível: ${requested.wikidataId}`);
    const sitelink = item.sitelinks?.ptwiki ?? item.sitelinks?.enwiki;
    const language = item.sitelinks?.ptwiki ? 'pt' : 'en';
    const wikiTitle = sitelink?.title ?? requested.search;
    const wikiUrl = `https://${language}.wikipedia.org/wiki/${encodeURIComponent(wikiTitle.replaceAll(' ', '_'))}`;
    const apiUrl = new URL(`https://${language}.wikipedia.org/w/api.php`);
    apiUrl.search = new URLSearchParams({
      action: 'query',
      format: 'json',
      redirects: '1',
      prop: 'categories|links',
      cllimit: '20',
      clshow: '!hidden',
      pllimit: '60',
      titles: wikiTitle,
    });
    const wikiData = await getJson(apiUrl);
    const page = Object.values(wikiData.query?.pages ?? {})[0];
    if (!page || page.missing !== undefined || page.invalid !== undefined)
      throw Error(`Página Wikipedia ausente ou inválida: ${wikiTitle}`);
    const description = item.descriptions?.pt?.value ?? item.descriptions?.en?.value ?? null;
    const title = wikiTitle;
    const kind = requested.kind;
    const wikiNames = [
      wikiTitle,
      item.sitelinks?.enwiki?.title,
      item.sitelinks?.ptwiki?.title,
    ].filter(Boolean);
    const idAliases = [
      ...(item.aliases?.pt ?? []).map((alias) => alias.value),
      ...(item.aliases?.en ?? []).map((alias) => alias.value),
    ];
    const pageCategories = (page?.categories ?? [])
      .map((category) => category.title.replace(/^(?:Category|Categoria):/i, ''))
      .filter(
        (category) =>
          !/^(CS1|Pages? (with|containing|using)|Articles? (with|containing|using)|Wikipedia|Webarchive|Use dmy|All articles|Short description)/i.test(
            category,
          ),
      );
    const primarySummary = description || 'Descrição estruturada indisponível no Wikidata.';
    const context = `A página “${wikiTitle}” na Wikipedia foi consultada para descobrir categorias e links internos. Essas conexões são caminhos de navegação, não relações historiográficas validadas.`;
    const sections = [{ heading: 'Contexto de descoberta', paragraphs: [context] }];
    const entity = {
      id: requested.id,
      slug: requested.id.replace(/^(person|ideology|event)-/, ''),
      kind: entityType(kind),
      title,
      summary: primarySummary,
      aliases: uniqueLabels(idAliases),
      context,
      editorialStatus: 'pending',
      temporalExtent: datesFor(item, kind),
      uncertainty: 'unknown',
      revision: 1,
      sections,
      externalIds: { wikidata: requested.wikidataId, wikipedia: wikiTitle },
      discoveryMetadata: {
        description,
        wikipediaTitle: wikiTitle,
        wikipediaUrl: wikiUrl,
        wikipediaLanguage: language,
        categories: pageCategories,
        fetchedAt: retrievedAt,
        contentLicense:
          'CC0 1.0 (descrições estruturadas do Wikidata); metadados de descoberta da Wikipedia',
        contentLicenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
        attribution: `Categorias e links consultados na página “${wikiTitle}”, Wikipedia (${language}). Descrição estruturada do Wikidata (${requested.wikidataId}), sob CC0.`,
      },
    };
    records.push({
      ...requested,
      item,
      entity,
      wikiTitle,
      wikiUrl,
      language,
      links: page?.links ?? [],
      wikiNames,
    });
    onProgress(
      `Processado ${records.length}/${searchResults.length}: ${title} (${requested.wikidataId}, ${language}wiki).`,
    );
  }

  for (const record of records) {
    const existing = existingEntities.find((entity) => entity.id === record.entity.id);
    if (existing) {
      record.entity.slug = existing.slug;
      existing.externalIds = record.entity.externalIds;
      existing.discoveryMetadata = record.entity.discoveryMetadata;
      existing.editorialStatus ??= 'pending';
      existing.aliases = uniqueLabels([...existing.aliases, ...record.entity.aliases]);
    }
  }
  const targetTitles = titleIndex([
    ...existingEntities,
    ...records.map((record) => ({
      ...record.entity,
      aliases: [...record.entity.aliases, ...record.wikiNames],
    })),
  ]);
  const recordIdByQid = new Map([
    ...existingEntities.flatMap((entity) =>
      entity.externalIds?.wikidata ? [[entity.externalIds.wikidata, entity.id]] : [],
    ),
    ...records.map((record) => [record.item.id, record.entity.id]),
  ]);
  const addedEntities = records
    .filter((record) => !existingEntities.some((entity) => entity.id === record.entity.id))
    .map((record) => record.entity);
  const sources = [];
  const evidences = [];
  const assetLicenses = [];
  const relations = [];
  const mediaOwners = remoteMediaOwners(records);
  for (const record of records) {
    const shortId = record.entity.id;
    sources.push({
      id: `${atlasKey}-source-wikipedia-${shortId}`,
      title: `${record.wikiTitle} — Wikipedia`,
      url: record.wikiUrl,
      edition: `Wikipedia (${record.language}); categorias e links usados para descoberta`,
      publicationDate: null,
    });
    sources.push({
      id: `${atlasKey}-source-wikidata-${shortId}`,
      title: `${record.item.id} — Wikidata`,
      url: `https://www.wikidata.org/wiki/${record.item.id}`,
      edition: 'Wikidata; dados estruturados sob CC0',
      publicationDate: null,
    });
    const imageName = record.item.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    // remote: keep licence metadata and the Commons thumbnail URL; no bytes enter the repository.
    if (
      imageName &&
      (mediaMode === 'refresh' ||
        (mediaMode === 'remote' && mediaOwners.get(imageName) === record.entity.id))
    ) {
      const commonsUrl = new URL('https://commons.wikimedia.org/w/api.php');
      commonsUrl.search = new URLSearchParams({
        action: 'query',
        format: 'json',
        titles: `File:${imageName}`,
        prop: 'imageinfo',
        iiprop: 'url|extmetadata',
        iiurlwidth: '1000',
      });
      const commons = await getJson(commonsUrl);
      const filePage = Object.values(commons.query?.pages ?? {})[0];
      const info = filePage?.imageinfo?.[0];
      const meta = info?.extmetadata ?? {};
      const clean = (value) =>
        value?.value
          ?.replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim() || null;
      const license = clean(meta.LicenseShortName);
      const filePageUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(`File:${imageName}`).replaceAll('%3A', ':').replaceAll('%20', '_')}`;
      // Public-domain files carry their rationale on the file page instead of a licence URL.
      const licenseUrl =
        meta.LicenseUrl?.value || (/^public domain$/i.test(license ?? '') ? filePageUrl : null);
      const creator = clean(meta.Artist);
      const licensePage = licenseUrl?.toLocaleLowerCase('en') ?? '';
      const reusableLicense =
        /creativecommons\.org\/licenses\/(?:by|by-sa|zero)(?:\/|$)/.test(licensePage) ||
        /creativecommons\.org\/publicdomain\/(?:zero|mark)(?:\/|$)/.test(licensePage) ||
        /gnu\.org\/copyleft\/fdl\.html/.test(licensePage) ||
        /^public domain$/i.test(license);
      if (info?.thumburl && license && licenseUrl && reusableLicense) {
        const attribution =
          clean(meta.Attribution) ||
          `${imageName}, ${creator ?? 'autor não identificado'}, ${license}`;
        const extension =
          new URL(info.thumburl).pathname.match(/\.(jpe?g|png|webp|gif)$/i)?.[1]?.toLowerCase() ??
          'jpg';
        let assetPath = info.thumburl;
        if (mediaMode === 'refresh') {
          const bytes = await getImage(info.thumburl, imageName);
          const filename = `${record.entity.id}-${digest(bytes).slice(0, 16)}.${extension}`;
          assetPath = `/assets/${config.mediaDirectory}/${filename}`;
          mediaWrites.push({ assetPath, bytes });
        }
        assetLicenses.push({
          id: `${atlasKey}-asset-${shortId}`,
          entityId: record.entity.id,
          assetPath,
          sourceUrl: info.url,
          creator,
          license,
          licenseUrl,
          status: 'known',
          reproduction: 'allowed',
          fileTitle: imageName,
          filePageUrl,
          attribution,
          retrievedAt,
        });
      }
    }
  }

  // Keep Wikipedia navigation as a discovery relation; it does not assert historical causation.
  const existingIdSet = new Set(existingEntities.map((entity) => entity.id));
  for (const record of records) {
    const fromEntityId = record.entity.id;
    const targets = new Set(
      record.links.map((link) => targetTitles.resolve(link.title)).filter(Boolean),
    );
    for (const toEntityId of targets) {
      if (
        fromEntityId === toEntityId ||
        (!existingIdSet.has(toEntityId) &&
          !records.some((target) => target.entity.id === toEntityId))
      )
        continue;
      relations.push({
        id: `${atlasKey}-discovery-${fromEntityId}-${toEntityId}`,
        fromEntityId,
        toEntityId,
        type: 'encyclopedic-link',
        label: 'link de descoberta na Wikipedia',
        reverseLabel: 'mencionado por link de descoberta na Wikipedia',
        context:
          'Conexão de navegação entre páginas da Wikipedia; não constitui relação historiográfica validada.',
        temporalExtent: null,
        uncertainty: 'unknown',
        evidenceIds: [],
        editorialStatus: 'pending',
        provenance: { source: 'wikipedia', url: record.wikiUrl, retrievedAt },
      });
    }
  }

  // Map only explicit Wikidata statements to typed links, and leave editorial review pending.
  const propertyMappings = [
    [
      'P737',
      'influenced_by',
      'é listado no Wikidata como influenciado por',
      'é listado no Wikidata como influência para',
    ],
    [
      'P1344',
      'participated_in',
      'participou de (afirmação estruturada no Wikidata)',
      'inclui participação de (afirmação estruturada no Wikidata)',
    ],
    [
      'P50',
      'authored',
      'é listado como autor de (afirmação estruturada no Wikidata)',
      'tem autoria atribuída a (afirmação estruturada no Wikidata)',
    ],
    [
      'P279',
      'related_to',
      'é classificado no Wikidata como subtipo de',
      'tem como subtipo registrado no Wikidata',
    ],
    [
      'P1269',
      'related_to',
      'é listado no Wikidata como faceta de',
      'tem como faceta registrada no Wikidata',
    ],
  ];
  for (const record of records) {
    for (const [property, type, label, reverseLabel] of propertyMappings) {
      const statementsByTarget = new Map();
      for (const statement of record.item.claims?.[property] ?? []) {
        if (statement.rank === 'deprecated') continue;
        const qid = claimItem(statement);
        if (!qid) continue;
        if (!statementsByTarget.has(qid)) statementsByTarget.set(qid, []);
        statementsByTarget.get(qid).push(statement);
      }
      for (const [targetQid, statements] of statementsByTarget) {
        const references = [...new Set(statements.map(statementReferences).filter(Boolean))]
          .sort()
          .join(' | ');
        const targetId = recordIdByQid.get(targetQid);
        if (!targetId || targetId === record.entity.id) continue;
        const evidenceId = `${atlasKey}-evidence-${record.entity.id}-${property.toLowerCase()}-${targetId}`;
        const sourceId = `${atlasKey}-source-wikidata-${record.entity.id}`;
        evidences.push({
          id: evidenceId,
          sourceId,
          locator: `${record.item.id} ${property} ${targetQid}`,
          accessedAt: retrievedAt,
          note: `Declaração estruturada do Wikidata; pendente de avaliação editorial e historiográfica. Referências registradas na declaração: ${references || 'nenhuma referência anexada no registro consultado.'}`,
        });
        relations.push({
          id: `${atlasKey}-statement-${record.entity.id}-${property.toLowerCase()}-${targetId}`,
          fromEntityId: property === 'P50' ? targetId : record.entity.id,
          toEntityId: property === 'P50' ? record.entity.id : targetId,
          type,
          label,
          reverseLabel,
          context: `Mapeado da declaração ${property} em ${record.item.id}; a declaração estruturada precisa de revisão editorial e não é, por si, validação historiográfica.`,
          temporalExtent: null,
          uncertainty: 'moderate',
          evidenceIds: [evidenceId],
          editorialStatus: 'pending',
          provenance: {
            source: 'wikidata',
            url: `https://www.wikidata.org/wiki/${record.item.id}`,
            retrievedAt,
          },
        });
      }
    }
  }

  const atlasEntities = [
    ...(oldAtlas?.entities ?? []),
    ...addedEntities.filter(
      (entity) => !(oldAtlas?.entities ?? []).some((old) => old.id === entity.id),
    ),
  ];
  const entityIds = atlasEntities.map((entity) => entity.id);
  const allAtlases = graph.atlases;
  const claimCitationIds = new Set(
    allAtlases.flatMap((atlas) => atlas.claims).flatMap((claim) => claim.citationIds),
  );
  const protectedEvidence = new Set([
    ...allAtlases
      .flatMap((atlas) => atlas.relations)
      .filter((relation) => relation.editorialStatus !== 'pending')
      .flatMap((relation) => relation.evidenceIds),
    ...allAtlases
      .flatMap((atlas) => atlas.citations)
      .filter((citation) => claimCitationIds.has(citation.id))
      .map((citation) => citation.evidenceId),
  ]);
  const protectedSources = new Set(
    allAtlases
      .flatMap((atlas) => atlas.evidences)
      .filter((evidence) => protectedEvidence.has(evidence.id))
      .map((evidence) => evidence.sourceId),
  );
  const uniqueRelations = mergeRecords([], relations).flatMap((relation) => {
    const previous = oldAtlas?.relations.find((old) => old.id === relation.id);
    if (
      (previous && previous.editorialStatus !== 'pending') ||
      relation.evidenceIds.some((id) => protectedEvidence.has(id))
    )
      return previous ? [previous] : [];
    return [relation];
  });
  const atlas = {
    id: config.id,
    slug: config.slug,
    title: config.title,
    description: config.description,
    version: oldAtlas?.version ?? '1.0.0',
    updatedAt: retrievedAt,
    entityIds,
    entities: atlasEntities,
    sources: mergeRecords(
      oldAtlas?.sources ?? [],
      sources.filter((source) => !protectedSources.has(source.id)),
    ),
    evidences: mergeRecords(
      oldAtlas?.evidences ?? [],
      evidences.filter((evidence) => !protectedEvidence.has(evidence.id)),
    ),
    citations: oldAtlas?.citations ?? [],
    claims: oldAtlas?.claims ?? [],
    reviews: oldAtlas?.reviews ?? [],
    assetLicenses: mergeRecords(oldAtlas?.assetLicenses ?? [], assetLicenses),
    relations: mergeRecords(oldAtlas?.relations ?? [], uniqueRelations),
    learningPaths: oldAtlas?.learningPaths ?? [],
  };
  if (oldAtlas) graph.atlases.splice(graph.atlases.indexOf(oldAtlas), 1, atlas);
  else graph.atlases.push(atlas);
  graph.updatedAt = retrievedAt;
  return {
    graph,
    mediaWrites,
    mapping: reconciled.mapping,
    ambiguousAliases: targetTitles.ambiguous,
    counts: {
      records: records.length,
      added: addedEntities.length,
      relations: uniqueRelations.length,
      media: mediaWrites.length,
    },
  };
}
