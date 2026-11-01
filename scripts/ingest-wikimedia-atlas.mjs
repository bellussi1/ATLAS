import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';

const graphPath = new URL('../src/content/atlas.json', import.meta.url);
const graphFilename = fileURLToPath(graphPath);
const requestHeaders = { 'User-Agent': 'ATLAS educational project/1.0 (static content ingestion)' };
const liberalismEntities = [
  ['ideology-liberalism', 'liberalism', 'Liberalism', 'ideology', 'Q6216'],
  ['person-john-locke', 'John Locke', 'John Locke', 'person', 'Q9353'],
  ['person-adam-smith', 'Adam Smith', 'Adam Smith', 'person', 'Q9381'],
  ['person-john-stuart-mill', 'John Stuart Mill', 'John Stuart Mill', 'person', 'Q50020'],
  ['person-montesquieu', 'Charles-Louis de Secondat', 'Montesquieu', 'person', 'Q15975'],
  [
    'person-alexis-de-tocqueville',
    'Alexis de Tocqueville',
    'Alexis de Tocqueville',
    'person',
    'Q140694',
  ],
  ['person-friedrich-hayek', 'Friedrich Hayek', 'Friedrich Hayek', 'person', 'Q1325'],
  ['person-isaiah-berlin', 'Isaiah Berlin', 'Isaiah Berlin', 'person', 'Q205162'],
  [
    'ideology-classical-liberalism',
    'classical liberalism',
    'Classical liberalism',
    'ideology',
    'Q794394',
  ],
  ['ideology-social-liberalism', 'social liberalism', 'Social liberalism', 'ideology', 'Q201712'],
  ['ideology-neoliberalism', 'neoliberalism', 'Neoliberalism', 'ideology', 'Q162719'],
  ['event-glorious-revolution', 'Glorious Revolution', 'Glorious Revolution', 'event', 'Q189508'],
  ['event-american-revolution', 'American Revolution', 'American Revolution', 'event', 'Q192769'],
  ['event-french-revolution', 'French Revolution', 'French Revolution', 'event', 'Q6534'],
];
const configurations = {
  liberalism: {
    id: 'atlas-liberalism',
    slug: 'atlas-liberalismo',
    title: 'Atlas do Liberalismo',
    description:
      'Rede exploratória de pessoas, correntes e acontecimentos ligados ao liberalismo; dados enciclopédicos importados aguardam revisão editorial humana.',
    mediaDirectory: 'liberalism',
    entities: liberalismEntities,
  },
  marxism: {
    id: 'atlas-marx-valor',
    slug: 'marxismo-e-economia-politica',
    title: 'Atlas de Marxismo e Comunismo',
    description:
      'Rede exploratória de autores e tradições; dados Wikimedia são camadas de descoberta e estrutura, com revisão editorial humana pendente.',
    mediaDirectory: 'marxism',
    entities: [
      ['ideology-marxism', 'Marxism', 'Marxism', 'ideology', 'Q7264'],
      ['person-karl-marx', 'Karl Marx', 'Karl Marx', 'person', 'Q9061'],
      ['person-friedrich-engels', 'Friedrich Engels', 'Friedrich Engels', 'person', 'Q34787'],
      ['person-vladimir-lenin', 'Vladimir Lenin', 'Vladimir Lenin', 'person', 'Q1394'],
      ['person-rosa-luxemburg', 'Rosa Luxemburg', 'Rosa Luxemburg', 'person', 'Q7231'],
      ['person-eduard-bernstein', 'Eduard Bernstein', 'Eduard Bernstein', 'person', 'Q75786'],
      ['person-karl-kautsky', 'Karl Kautsky', 'Karl Kautsky', 'person', 'Q76586'],
      ['person-antonio-gramsci', 'Antonio Gramsci', 'Antonio Gramsci', 'person', 'Q83003'],
      ['person-leon-trotsky', 'Leon Trotsky', 'Leon Trotsky', 'person', 'Q33391'],
      ['person-joseph-stalin', 'Joseph Stalin', 'Joseph Stalin', 'person', 'Q855'],
      ['person-mao-zedong', 'Mao Zedong', 'Mao Zedong', 'person', 'Q5816'],
      ['person-caio-prado-junior', 'Caio Prado Júnior', 'Caio Prado Júnior', 'person', 'Q1789931'],
      [
        'person-luiz-carlos-prestes',
        'Luís Carlos Prestes',
        'Luís Carlos Prestes',
        'person',
        'Q742047',
      ],
      [
        'person-florestan-fernandes',
        'Florestan Fernandes',
        'Florestan Fernandes',
        'person',
        'Q2387448',
      ],
      [
        'person-jose-carlos-mariategui',
        'José Carlos Mariátegui',
        'José Carlos Mariátegui',
        'person',
        'Q335544',
      ],
      ['ideology-communism', 'Communism', 'Communism', 'ideology', 'Q6186'],
      ['ideology-socialism', 'Socialism', 'Socialism', 'ideology', 'Q7272'],
      [
        'concept-scientific-socialism',
        'Scientific socialism',
        'Scientific socialism',
        'concept',
        'Q865354',
      ],
      [
        'concept-historical-materialism',
        'Historical materialism',
        'Historical materialism',
        'concept',
        'Q190004',
      ],
      [
        'work-communist-manifesto',
        'The Communist Manifesto',
        'The Communist Manifesto',
        'work',
        'Q40591',
      ],
      ['event-paris-commune', 'Paris Commune', 'Paris Commune', 'event', 'Q133132'],
      ['event-russian-revolution', 'Russian Revolution', 'Russian Revolution', 'event', 'Q8729'],
      [
        'institution-second-international',
        'Second International',
        'Second International',
        'institution',
        'Q188592',
      ],
    ],
  },
};
const atlasKey = process.argv[2] ?? 'liberalism';
const config = configurations[atlasKey];
if (!config) throw new Error(`Unknown atlas: ${atlasKey}`);
const entitiesToFind = config.entities;
const retrievedAt = new Date().toISOString().slice(0, 10);
let lastRequestAt = 0;

async function getJson(url) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const wait = Math.max(0, 500 - (Date.now() - lastRequestAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let response;
    try {
      response = await fetch(url, { headers: requestHeaders, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (response.ok) return response.json();
    if (![429, 502, 503, 504].includes(response.status) || attempt === 5)
      throw new Error(`Wikimedia request failed (${response.status}): ${url}`);
    const retryAfter = Number(response.headers.get('retry-after'));
    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(retryAfter * 1000 || 0, 1200 * (attempt + 1))),
    );
  }
  throw new Error(`Wikimedia request retries exhausted: ${url}`);
}

function titleKey(value) {
  return value.replaceAll('_', ' ').toLocaleLowerCase('en');
}
function claimItem(claim) {
  return claim?.mainsnak?.datavalue?.value?.id;
}
function claimYear(claim) {
  const time = claim?.mainsnak?.datavalue?.value?.time;
  const match = time?.match(/[+-](\d{4,})-/);
  return match ? Number(match[1]) : null;
}

function statementReferences(statement) {
  return (statement.references ?? [])
    .flatMap((reference) =>
      Object.entries(reference.snaks ?? {}).flatMap(([property, snaks]) =>
        snaks.flatMap((snak) => {
          const value = snak.datavalue?.value;
          if (typeof value === 'string') return [`${property}: ${value}`];
          if (value?.id) return [`${property}: ${value.id}`];
          if (value?.time) return [`${property}: ${value.time}`];
          if (value?.text) return [`${property}: ${value.text}`];
          return [];
        }),
      ),
    )
    .join('; ');
}

function datesFor(item, kind) {
  const claims = item.claims ?? {};
  const starts =
    kind === 'person' ? claims.P569 : (claims.P580 ?? claims.P571 ?? claims.P577 ?? claims.P585);
  const ends = kind === 'person' ? claims.P570 : claims.P582;
  const startYear = starts?.map(claimYear).find((value) => value !== null) ?? null;
  const endYear = ends?.map(claimYear).find((value) => value !== null) ?? null;
  if (startYear === null && endYear === null) return null;
  return {
    startYear,
    endYear,
    precision: startYear !== null && endYear !== null ? 'range' : 'year',
    label: null,
  };
}

function entityType(kind) {
  return kind;
}
const graph = JSON.parse(await readFile(graphPath, 'utf8'));
const oldAtlas = graph.atlases.find((atlas) => atlas.id === config.id);
const searchResults = entitiesToFind.map(([id, search, , , wikidataId]) => {
  if (!wikidataId) throw new Error(`An explicit Wikidata ID is required for ${search}.`);
  return { id, search, wikidataId };
});
if (new Set(searchResults.map((item) => item.wikidataId)).size !== searchResults.length) {
  throw new Error('A Wikidata ID cannot identify more than one requested entity.');
}

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
const targetTitles = new Map();
const records = [];
const mediaDirectory = new URL(`../public/assets/${config.mediaDirectory}/`, import.meta.url);
await mkdir(mediaDirectory, { recursive: true });

for (const requested of searchResults) {
  const item = wikidata.entities[requested.wikidataId];
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
  const description = item.descriptions?.pt?.value ?? item.descriptions?.en?.value ?? null;
  const title = wikiTitle;
  const kind = entitiesToFind.find((record) => record[0] === requested.id)[3];
  const wikiNames = [
    wikiTitle,
    item.sitelinks?.enwiki?.title,
    item.sitelinks?.ptwiki?.title,
  ].filter(Boolean);
  for (const name of wikiNames) targetTitles.set(titleKey(name), requested.id);
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
    aliases: [...new Set(idAliases)],
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
  });
  console.log(
    `Fetched ${records.length}/${searchResults.length}: ${title} (${requested.wikidataId}, ${language}wiki).`,
  );
}

const existingEntities = graph.atlases.flatMap((atlas) => atlas.entities);
for (const entity of existingEntities) {
  for (const title of [entity.externalIds?.wikipedia, entity.discoveryMetadata?.wikipediaTitle]) {
    if (title) targetTitles.set(titleKey(title), entity.id);
  }
}
for (const record of records) {
  const existing = existingEntities.find(
    (entity) => entity.id === record.id || entity.externalIds?.wikidata === record.item.id,
  );
  if (existing) {
    record.entity.id = existing.id;
    record.entity.slug = existing.slug;
    // Merge only Wikimedia fields. Keep authored prose, claims, relationships and review state.
    existing.externalIds = record.entity.externalIds;
    existing.discoveryMetadata = record.entity.discoveryMetadata;
    existing.editorialStatus ??= 'pending';
  }
}
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
  if (imageName) {
    try {
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
      const licenseUrl = meta.LicenseUrl?.value || null;
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
        const imageResponse = await fetch(info.thumburl, { headers: requestHeaders });
        if (!imageResponse.ok || !imageResponse.headers.get('content-type')?.startsWith('image/')) {
          throw new Error(
            `Commons image download failed (${imageResponse.status}) for ${imageName}`,
          );
        }
        const extension =
          new URL(info.thumburl).pathname.match(/\.(jpe?g|png|webp|gif)$/i)?.[1]?.toLowerCase() ??
          'jpg';
        const filename = `${record.entity.id}.${extension}`;
        await writeFile(
          new URL(filename, mediaDirectory),
          Buffer.from(await imageResponse.arrayBuffer()),
        );
        assetLicenses.push({
          id: `${atlasKey}-asset-${shortId}`,
          entityId: record.entity.id,
          assetPath: `/assets/${config.mediaDirectory}/${filename}`,
          sourceUrl: info.url,
          creator,
          license,
          licenseUrl,
          status: 'known',
          reproduction: 'allowed',
          fileTitle: imageName,
          filePageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(`File:${imageName}`).replaceAll('%3A', ':').replaceAll('%20', '_')}`,
          attribution,
          retrievedAt,
        });
      }
    } catch (error) {
      console.warn(`Commons metadata skipped for ${imageName}: ${error.message}`);
    }
  }
}

// Keep Wikipedia navigation as a discovery relation; it does not assert historical causation.
const existingIdSet = new Set(existingEntities.map((entity) => entity.id));
for (const record of records) {
  const fromEntityId = record.entity.id;
  const targets = new Set(
    record.links.map((link) => targetTitles.get(titleKey(link.title))).filter(Boolean),
  );
  for (const toEntityId of targets) {
    if (
      fromEntityId === toEntityId ||
      (!existingIdSet.has(toEntityId) && !records.some((target) => target.entity.id === toEntityId))
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
    'é listado no Wikidata como influência de',
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
    for (const statement of record.item.claims?.[property] ?? []) {
      const targetId = recordIdByQid.get(claimItem(statement));
      if (!targetId || targetId === record.entity.id) continue;
      const evidenceId = `${atlasKey}-evidence-${record.entity.id}-${property.toLowerCase()}-${targetId}`;
      const sourceId = `${atlasKey}-source-wikidata-${record.entity.id}`;
      evidences.push({
        id: evidenceId,
        sourceId,
        locator: `${record.item.id} ${property} ${claimItem(statement)}`,
        accessedAt: retrievedAt,
        note: `Declaração estruturada do Wikidata; pendente de avaliação editorial e historiográfica. Referências registradas na declaração: ${statementReferences(statement) || 'nenhuma referência anexada no registro consultado.'}`,
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
const mergeById = (...collections) => [
  ...new Map(collections.flat().map((record) => [record.id, record])).values(),
];
const entityIds = atlasEntities.map((entity) => entity.id);
const uniqueRelations = [...new Map(relations.map((relation) => [relation.id, relation])).values()];
const atlas = {
  id: config.id,
  slug: config.slug,
  title: config.title,
  description: config.description,
  version: '1.0.0',
  updatedAt: retrievedAt,
  entityIds,
  entities: atlasEntities,
  sources: mergeById(oldAtlas?.sources ?? [], sources),
  evidences: mergeById(oldAtlas?.evidences ?? [], evidences),
  citations: oldAtlas?.citations ?? [],
  claims: oldAtlas?.claims ?? [],
  reviews: oldAtlas?.reviews ?? [],
  assetLicenses: mergeById(oldAtlas?.assetLicenses ?? [], assetLicenses),
  relations: mergeById(oldAtlas?.relations ?? [], uniqueRelations),
  learningPaths: oldAtlas?.learningPaths ?? [],
};
if (oldAtlas) graph.atlases.splice(graph.atlases.indexOf(oldAtlas), 1);
graph.atlases.push(atlas);
graph.updatedAt = retrievedAt;
const formatting = (await prettier.resolveConfig(graphFilename)) ?? {};
await writeFile(
  graphPath,
  await prettier.format(JSON.stringify(graph), { ...formatting, parser: 'json' }),
);
console.log(
  `Ingested ${records.length} entities (${addedEntities.length} new graph records), ${uniqueRelations.length} typed/discovery relations, ${assetLicenses.length} licensed Commons images.`,
);
console.log(
  `Wikidata IDs: ${records.map((record) => `${record.entity.title}=${record.item.id}`).join(', ')}`,
);
