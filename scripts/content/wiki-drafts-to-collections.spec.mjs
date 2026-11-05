import './register-source-modules.mjs';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { formatJson, sha256, sourceDirectory, validateSourceGraph } from './source-graph.mjs';
import {
  REVIEW_NOTE,
  classificationForKind,
  convertDrafts,
  convertDraftsToCollections,
  kindForDraft,
  mergeTraditions,
  slugify,
} from './wiki-drafts-to-collections.mjs';

function draft({
  id,
  label,
  type = 'pessoa',
  language = 'pt',
  title = label.replaceAll(' ', '_'),
  qid = 'Q1',
  revision = '100',
  truncated,
  dates = [],
  relations = [],
  claims = [],
}) {
  return {
    entity: { id, label, type, qid },
    source: {
      url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      revision,
      language,
      retrievedAt: '2026-11-03T17:39:13.117Z',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      truncated,
    },
    review: { by: 'assistant', model: 'assistente-chat', method: 'chat', status: 'draft' },
    summary: `Resumo de ${label}.`,
    dates,
    relations,
    claims,
  };
}

const item = (tradition, file, value) => ({ tradition, file, draft: value });

function fixtureItems() {
  return [
    item(
      'marxismo',
      'topic-karl-marx.json',
      draft({
        id: 'topic-karl-marx',
        label: 'Karl Marx',
        type: 'topic',
        qid: 'Q9061',
        title: 'Karl_Marx',
        truncated: true,
        dates: [{ date: '1818', event: 'Nascimento em Trier', quote: 'nasceu em Trier, em 1818' }],
        relations: [
          {
            target: 'Friedrich Engels',
            relation: 'colaborou com Engels',
            quote: 'junto com Friedrich Engels',
          },
        ],
        claims: [
          { statement: 'Marx escreveu O Capital.', kind: 'fact', quote: 'escreveu O Capital' },
          {
            statement: 'A mais-valia é a base da exploração.',
            kind: 'interpretation',
            quote: 'base da exploração',
          },
          {
            statement: 'A teoria do valor de Marx é contestada.',
            kind: 'controversy',
            quote: 'é contestada',
          },
        ],
      }),
    ),
    item(
      'marxismo',
      'topic-marxismo.json',
      draft({
        id: 'topic-marxismo',
        label: 'Marxismo',
        type: 'topic',
        qid: 'Q7264',
        truncated: true,
        claims: [
          { statement: 'O marxismo analisa classes.', kind: 'fact', quote: 'analisa classes' },
        ],
      }),
    ),
    item(
      'marxismo',
      'topic-comunismo.json',
      draft({
        id: 'topic-comunismo',
        label: 'Comunismo',
        type: 'topic',
        qid: 'Q6186',
        title: 'Comunismo',
        claims: [{ statement: 'Comunismo menor.', kind: 'fact', quote: 'menor' }],
      }),
    ),
    item(
      'outras-ideologias',
      'topic-comunismo.json',
      draft({
        id: 'topic-comunismo',
        label: 'Comunismo',
        type: 'topic',
        qid: 'Q6186',
        title: 'Comunismo',
        dates: [{ date: '1917', event: 'Revolução Russa', quote: 'Revolução Russa de 1917' }],
        relations: [{ target: 'Lenin', relation: 'ligado a Lenin', quote: 'Lenin' }],
        claims: [
          { statement: 'Comunismo completo.', kind: 'fact', quote: 'completo' },
          { statement: 'Comunismo interpretado.', kind: 'interpretation', quote: 'interpretado' },
        ],
      }),
    ),
    item(
      'social-democracia',
      'topic-social-democracia.json',
      draft({
        id: 'topic-social-democracia',
        label: 'Social-democracia',
        type: 'topic',
        qid: 'Q121254',
        title: 'Social-democracia',
        claims: [{ statement: 'Social-democracia pt.', kind: 'fact', quote: 'pt' }],
      }),
    ),
    item(
      'social-democracia',
      'topic-social-democracy.json',
      draft({
        id: 'topic-social-democracy',
        label: 'Social democracy',
        type: 'topic',
        language: 'en',
        qid: 'Q121254',
        title: 'Social_democracy',
        claims: [{ statement: 'Social democracy en.', kind: 'interpretation', quote: 'en' }],
      }),
    ),
    item(
      'liberalismo',
      'topic-mercado-livre.json',
      draft({
        id: 'topic-mercado-livre',
        label: 'Mercado livre',
        type: 'topic',
        qid: 'Q46607',
        claims: [{ statement: 'Mercado livre fato.', kind: 'fact', quote: 'mercado' }],
      }),
    ),
  ];
}

test('mapeia tipos declarados, tópicos genéricos e classificações', () => {
  assert.equal(kindForDraft(draft({ id: 'p', label: 'P', type: 'pessoa' })), 'person');
  assert.equal(kindForDraft(draft({ id: 'i', label: 'I', type: 'ideologia' })), 'ideology');
  assert.equal(kindForDraft(draft({ id: 'c', label: 'C', type: 'conceito' })), 'concept');
  assert.equal(kindForDraft(draft({ id: 'o', label: 'O', type: 'obra' })), 'work');
  assert.equal(kindForDraft(draft({ id: 'g', label: 'G', type: 'organização' })), 'institution');
  assert.equal(kindForDraft(draft({ id: 'topic-karl-marx', label: 'K', type: 'topic' })), 'person');
  assert.equal(
    kindForDraft(draft({ id: 'topic-marxismo', label: 'M', type: 'topic' })),
    'ideology',
  );
  assert.equal(
    kindForDraft(draft({ id: 'topic-mais-valia', label: 'V', type: 'topic' })),
    'concept',
  );
  assert.throws(
    () => kindForDraft(draft({ id: 'x', label: 'X', type: 'desconhecido' })),
    /sem mapeamento/,
  );
  assert.equal(classificationForKind('fact'), 'documented-fact');
  assert.equal(classificationForKind('interpretation'), 'interpretation');
  assert.equal(classificationForKind('controversy'), 'contested-claim');
  assert.throws(() => classificationForKind('opinião'), /sem mapeamento/);
});

test('mantém toda afirmação, revisão e entidade pendentes sem revisor humano', () => {
  const { atlases } = convertDrafts(fixtureItems());
  const claims = atlases.flatMap((atlas) => atlas.claims);
  const reviews = atlases.flatMap((atlas) => atlas.reviews);
  assert.ok(claims.length > 0);
  assert.equal(reviews.length, claims.length);
  for (const claim of claims) assert.equal(claim.editorialStatus, 'pending');
  for (const review of reviews) {
    assert.equal(review.status, 'pending');
    assert.equal(review.reviewer, null);
    assert.equal(review.reviewedAt, null);
    assert.equal(review.note, REVIEW_NOTE);
  }
  for (const entity of atlases.flatMap((atlas) => atlas.entities)) {
    assert.equal(entity.editorialStatus, 'pending');
  }
});

test('toda citação aponta para fonte, evidência e afirmação existentes', () => {
  const { atlases } = convertDrafts(fixtureItems());
  for (const atlas of atlases) {
    const sources = new Set(atlas.sources.map((source) => source.id));
    const evidences = new Map(atlas.evidences.map((evidence) => [evidence.id, evidence]));
    const citations = new Map(atlas.citations.map((citation) => [citation.id, citation]));
    for (const evidence of atlas.evidences) assert.ok(sources.has(evidence.sourceId));
    for (const citation of atlas.citations) assert.ok(evidences.has(citation.evidenceId));
    for (const claim of atlas.claims) {
      assert.ok(claim.citationIds.length > 0);
      for (const citationId of claim.citationIds) {
        const citation = citations.get(citationId);
        assert.ok(citation, `citação ausente: ${citationId}`);
        assert.ok(evidences.get(citation.evidenceId).locator.length > 0);
      }
    }
  }
  assert.doesNotThrow(() =>
    validateSourceGraph({
      id: 'knowledge-graph-atlas',
      version: '1.1.0',
      updatedAt: '2026-11-04',
      atlases,
    }),
  );
});

test('mesma URL vira um rascunho; idiomas do mesmo item se fundem numa entidade', () => {
  const report = convertDrafts(fixtureItems());
  assert.deepEqual(
    report.dropped.map((entry) => entry.id),
    ['marxismo/topic-comunismo'],
  );
  const entities = report.atlases.flatMap((atlas) => atlas.entities);
  assert.equal(entities.filter((entity) => entity.id === 'wiki-topic-comunismo').length, 1);
  assert.equal(
    entities.some((entity) => entity.id === 'wiki-topic-social-democracy'),
    false,
  );
  const social = report.atlases.find((atlas) => atlas.id === 'atlas-social-democracia');
  assert.equal(social.sources.length, 2);
  assert.deepEqual(report.merged, [
    {
      entity: 'wiki-topic-social-democracia',
      drafts: [
        'social-democracia/topic-social-democracia',
        'social-democracia/topic-social-democracy',
      ],
    },
  ]);
});

test('ajusta slug que colide com coleção existente e mantém os demais', () => {
  const existing = [
    {
      id: 'atlas-existente',
      slug: 'existente',
      entities: [{ id: 'person-karl-marx', slug: 'karl-marx' }],
    },
  ];
  const entities = convertDrafts(fixtureItems(), { existingAtlases: existing }).atlases.flatMap(
    (atlas) => atlas.entities,
  );
  const marx = entities.find((entity) => entity.id === 'wiki-topic-karl-marx');
  assert.equal(marx.slug, 'karl-marx-wikipedia');
  assert.equal(slugify('Mao Tsé-Tung'), 'mao-tse-tung');
  assert.equal(slugify('Adamántios Koraís'), 'adamantios-korais');
});

test('conversão é idempotente: mesmos bytes em duas execuções', async () => {
  const first = convertDrafts(fixtureItems()).atlases;
  const second = convertDrafts(fixtureItems()).atlases;
  assert.equal(first.length, second.length);
  for (const [index, atlas] of first.entries()) {
    assert.equal(await formatJson(atlas), await formatJson(second[index]));
  }
});

test('gravação em duas execuções produz os mesmos arquivos e preserva coleções existentes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'atlas-wiki-drafts-'));
  const drafts = join(root, 'drafts');
  const knowledge = join(root, 'knowledge');
  await mkdir(join(knowledge, 'collections'), { recursive: true });
  for (const { tradition, file, draft: value } of fixtureItems()) {
    const dir = join(drafts, tradition, 'extracts');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, file), JSON.stringify(value), 'utf8');
  }

  const realManifest = JSON.parse(await readFile(join(sourceDirectory, 'manifest.json'), 'utf8'));
  const existingEntry = realManifest.collections.find((entry) => entry.id === 'atlas-methodology');
  const existingBytes = await readFile(join(sourceDirectory, existingEntry.file));
  await writeFile(join(knowledge, existingEntry.file), existingBytes);
  await writeFile(
    join(knowledge, 'manifest.json'),
    await formatJson({ ...realManifest, collections: [existingEntry] }),
  );

  await convertDraftsToCollections({ root: drafts, directory: knowledge });
  const manifestOnce = await readFile(join(knowledge, 'manifest.json'), 'utf8');
  const filesOnce = (await readdir(join(knowledge, 'collections'))).sort();
  await convertDraftsToCollections({ root: drafts, directory: knowledge });
  const manifestTwice = await readFile(join(knowledge, 'manifest.json'), 'utf8');
  const filesTwice = (await readdir(join(knowledge, 'collections'))).sort();

  assert.equal(manifestTwice, manifestOnce);
  assert.deepEqual(filesTwice, filesOnce);
  const manifest = JSON.parse(manifestTwice);
  assert.equal(manifest.collections[0].id, 'atlas-methodology');
  assert.deepEqual(manifest.collections[0], existingEntry);
  assert.deepEqual(
    manifest.collections.map((entry) => entry.id),
    [
      'atlas-methodology',
      'atlas-marxismo',
      'atlas-liberalismo',
      'atlas-social-democracia',
      'atlas-outras-ideologias',
    ],
  );
  assert.deepEqual(await readFile(join(knowledge, existingEntry.file)), existingBytes);
});

// A collection that already holds Karl Marx (same Wikidata item as the draft).
function existingAtlasFixture() {
  return {
    id: 'atlas-existente',
    slug: 'existente',
    title: 'Coleção existente',
    description: 'Coleção de teste com uma entidade já publicada.',
    version: '1.0.0',
    updatedAt: '2026-11-03',
    entityIds: ['person-karl-marx'],
    entities: [
      {
        id: 'person-karl-marx',
        kind: 'person',
        slug: 'karl-marx',
        title: 'Karl Marx',
        summary: 'Resumo existente.',
        aliases: [],
        context: 'Contexto existente.',
        temporalExtent: null,
        uncertainty: 'low',
        revision: 1,
        sections: [{ heading: 'Contexto', paragraphs: ['Texto existente.'] }],
        externalIds: { wikidata: 'Q9061', wikipedia: 'Karl Marx' },
      },
    ],
    sources: [],
    evidences: [],
    citations: [],
    claims: [],
    reviews: [],
    assetLicenses: [],
    relations: [],
    learningPaths: [],
  };
}

test('rascunho cujo QID já é entidade existente é mesclado nela, sem entidade nova', () => {
  const report = convertDrafts(fixtureItems(), { existingAtlases: [existingAtlasFixture()] });
  const newEntities = report.atlases.flatMap((atlas) => atlas.entities);
  assert.equal(
    newEntities.some((entity) => entity.id === 'wiki-topic-karl-marx'),
    false,
  );
  assert.deepEqual(report.mergedIntoExisting, [
    {
      entity: 'person-karl-marx',
      atlas: 'atlas-existente',
      drafts: ['marxismo/topic-karl-marx'],
    },
  ]);
  const [augmented] = report.augmentedAtlases;
  assert.equal(augmented.id, 'atlas-existente');
  const marxClaims = augmented.claims.filter((claim) => claim.entityId === 'person-karl-marx');
  assert.equal(marxClaims.length, 5); // 1 data + 1 relação + 3 afirmações
  assert.equal(augmented.reviews.length, augmented.claims.length);
  assert.doesNotThrow(() =>
    validateSourceGraph({
      id: 'knowledge-graph-atlas',
      version: '1.1.0',
      updatedAt: '2026-11-04',
      atlases: [augmented, ...report.atlases],
    }),
  );
});

test('coleção existente ampliada mantém posição e dá o mesmo resultado em nova execução', async () => {
  const root = await mkdtemp(join(tmpdir(), 'atlas-wiki-merge-'));
  const drafts = join(root, 'drafts');
  const knowledge = join(root, 'knowledge');
  await mkdir(join(knowledge, 'collections'), { recursive: true });
  for (const { tradition, file, draft: value } of fixtureItems()) {
    const dir = join(drafts, tradition, 'extracts');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, file), JSON.stringify(value), 'utf8');
  }
  const existing = existingAtlasFixture();
  const existingBytes = await formatJson(existing);
  const existingHash = sha256(existingBytes);
  const existingEntry = {
    id: existing.id,
    file: `collections/${existing.id}.${existingHash}.json`,
    sha256: existingHash,
  };
  await writeFile(join(knowledge, existingEntry.file), existingBytes);
  await writeFile(
    join(knowledge, 'manifest.json'),
    await formatJson({
      schemaVersion: 1,
      id: 'knowledge-graph-atlas',
      version: '1.0.0',
      updatedAt: '2026-11-03',
      collections: [existingEntry],
    }),
  );

  await convertDraftsToCollections({ root: drafts, directory: knowledge });
  const manifestOnce = await readFile(join(knowledge, 'manifest.json'), 'utf8');
  const augmentedEntry = JSON.parse(manifestOnce).collections[0];
  assert.equal(augmentedEntry.id, 'atlas-existente');
  assert.notEqual(augmentedEntry.sha256, existingHash);
  const augmented = JSON.parse(await readFile(join(knowledge, augmentedEntry.file), 'utf8'));
  assert.equal(augmented.claims.filter((claim) => claim.entityId === 'person-karl-marx').length, 5);
  assert.equal(await readFile(join(knowledge, existingEntry.file), 'utf8'), existingBytes);

  await convertDraftsToCollections({ root: drafts, directory: knowledge });
  assert.equal(await readFile(join(knowledge, 'manifest.json'), 'utf8'), manifestOnce);
  assert.equal(
    await readFile(join(knowledge, augmentedEntry.file), 'utf8'),
    await formatJson(augmented),
  );
});

// Arestas, conteúdo rico, rótulos do Wikidata e imagens

const richDraft = ({ id, label, qid, relations = [], sections = [], glossary = [], oneLine }) => ({
  ...draft({ id, label, qid, type: 'pessoa' }),
  contract: 'rich-v1',
  oneLine,
  sections,
  glossary,
  relations,
});
const edgeRelation = (overrides = {}) => ({
  target: 'Friedrich Engels',
  targetQid: 'Q2',
  nature: 'influenciou',
  direction: 'entidade-para-alvo',
  sentence: 'Marx influenciou Engels',
  quote: 'Marx influenciou profundamente Friedrich Engels',
  verified: true,
  ...overrides,
});
const richItems = (relations) => [
  item('marxismo', 'a.json', richDraft({ id: 'a', label: 'Karl Marx', qid: 'Q1', relations })),
  item('marxismo', 'b.json', richDraft({ id: 'b', label: 'Friedrich Engels', qid: 'Q2' })),
];
const graphOf = (report, existing = []) =>
  validateSourceGraph({
    id: 'knowledge-graph-atlas',
    version: '1.1.0',
    updatedAt: '2026-11-04',
    atlases: [...existing, ...report.atlases],
  });

test('relação confirmada vira aresta com tipo, direção, evidência literal, fonte e revisão pendente', () => {
  const report = convertDrafts(richItems([edgeRelation()]));
  const [atlas] = report.atlases;
  assert.equal(atlas.relations.length, 1);
  const [edge] = atlas.relations;
  assert.equal(edge.type, 'influenced');
  assert.equal(edge.fromEntityId, 'wiki-a');
  assert.equal(edge.toEntityId, 'wiki-b');
  assert.equal(edge.editorialStatus, 'pending');
  assert.equal(edge.provenance.source, 'wikipedia');
  assert.equal(edge.provenance.url, 'https://pt.wikipedia.org/wiki/Karl_Marx');
  assert.doesNotMatch(edge.context, /Wikip[eé]dia|Extraído por IA|Revisão humana/);
  const evidence = atlas.evidences.find((e) => e.id === edge.evidenceIds[0]);
  assert.equal(evidence.locator, 'Marx influenciou profundamente Friedrich Engels');
  assert.equal(evidence.sourceId, 'src-wiki-a');
  assert.equal(atlas.claims.length, 0, 'aresta não duplica como afirmação');
  graphOf(report);
});

test('direção alvo-para-entidade inverte a aresta; tipo fora da lista vira associação nomeada ou nada', () => {
  const report = convertDrafts(richItems([edgeRelation({ direction: 'alvo-para-entidade' })]));
  const [edge] = report.atlases[0].relations;
  assert.equal(edge.fromEntityId, 'wiki-b');
  assert.equal(edge.toEntityId, 'wiki-a');
  const founded = convertDrafts(richItems([edgeRelation({ nature: 'fundou' })])).atlases[0]
    .relations[0];
  assert.equal(founded.type, 'documented-association');
  assert.equal(founded.label, 'fundou');
});

test('sem confirmação, sem QID, alvo fora do grafo ou tipo estranho: nada de aresta, tudo no relatório', () => {
  const report = convertDrafts(
    richItems([
      edgeRelation({ verified: false }),
      edgeRelation({ targetQid: null }),
      edgeRelation({ targetQid: 'Q999' }),
      edgeRelation({ nature: 'semelhante-a' }),
      edgeRelation({ targetQid: 'Q1' }),
    ]),
  );
  assert.equal(report.atlases[0].relations.length, 0);
  assert.deepEqual(
    report.pendingRelations.map((p) => p.reason),
    [
      'sem confirmação da segunda passada',
      'alvo sem QID',
      'alvo fora do grafo',
      'natureza fora da lista: semelhante-a',
      'alvo é a própria entidade',
    ],
  );
  graphOf(report);
});

test('aresta liga rascunho a entidade já existente no grafo, por QID', () => {
  const existing = existingAtlasFixture();
  const qid = existing.entities[0].externalIds.wikidata;
  const report = convertDrafts(
    [
      item(
        'marxismo',
        'z.json',
        richDraft({
          id: 'z',
          label: 'Outra Pessoa',
          qid: 'Q777',
          relations: [edgeRelation({ targetQid: qid })],
        }),
      ),
    ],
    { existingAtlases: [existing] },
  );
  assert.equal(report.atlases[0].relations[0].toEntityId, existing.entities[0].id);
});

test('conteúdo rico vira hover, seções, apelidos e afirmações com citação', () => {
  const report = convertDrafts([
    item(
      'marxismo',
      'a.json',
      richDraft({
        id: 'a',
        label: 'Karl Marx',
        qid: 'Q1',
        oneLine: 'Filósofo e economista alemão.',
        sections: [
          { kind: 'origem', text: 'Nasceu em Trier', quote: 'nasceu em Trier em 1818' },
          {
            kind: 'controversias',
            text: 'A teoria é disputada',
            quote: 'a teoria do valor é disputada',
          },
        ],
        glossary: [
          { term: 'Karl Marx', pt: ['Marx'], en: ['Karl Marx', 'Marx'], aliases: ['o Mouro'] },
        ],
      }),
    ),
  ]);
  const [atlas] = report.atlases;
  const [entity] = atlas.entities;
  assert.equal(entity.discoveryMetadata.description, 'Filósofo e economista alemão.');
  assert.deepEqual(entity.aliases, ['Marx', 'o Mouro']);
  assert.deepEqual(
    entity.sections.map((s) => s.heading),
    ['Resumo', 'Origem', 'Controvérsias'],
  );
  assert.deepEqual(
    atlas.claims.map((c) => c.classification),
    ['documented-fact', 'contested-claim'],
  );
  assert.ok(atlas.reviews.every((r) => r.status === 'pending' && r.reviewer === null));
  graphOf(report);
});

test('rótulo do Wikidata (P737, P1142) entra como associação, nunca como influência', () => {
  const statement = (property) => ({
    qid: 'Q1',
    property,
    targetQid: 'Q2',
    url: `https://www.wikidata.org/wiki/Q1#${property}`,
  });
  const report = convertDrafts(richItems([]), {
    wikidataLabels: [
      statement('P737'),
      statement('P1142'),
      statement('P737'),
      { ...statement('P737'), targetQid: 'Q999' },
    ],
  });
  const relations = report.atlases[0].relations;
  assert.equal(relations.length, 2);
  for (const relation of relations) {
    assert.equal(relation.type, 'associated_with');
    assert.equal(relation.provenance.source, 'wikidata');
    assert.match(relation.context, /Não é influência documentada/);
  }
  assert.ok(report.atlases[0].sources.some((s) => s.url === 'https://www.wikidata.org/wiki/Q1'));
  graphOf(report);
  const withEdge = convertDrafts(richItems([edgeRelation()]), {
    wikidataLabels: [statement('P737')],
  });
  assert.equal(withEdge.atlases[0].relations.length, 1, 'aresta documentada dispensa o rótulo');
  assert.equal(withEdge.atlases[0].relations[0].type, 'influenced');
});

test('imagem licenciada vira ativo uma só vez; sem licença fica o ícone, no relatório', () => {
  const asset = {
    assetPath: 'https://upload.wikimedia.org/thumb/m.jpg',
    sourceUrl: 'https://upload.wikimedia.org/m.jpg',
    creator: 'Fulana',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    status: 'known',
    reproduction: 'allowed',
    fileTitle: 'm.jpg',
    filePageUrl: 'https://commons.wikimedia.org/wiki/File:m.jpg',
    attribution: 'm.jpg, Fulana, CC BY 4.0',
    retrievedAt: '2026-11-04',
  };
  const report = convertDrafts(richItems([]), {
    images: {
      a: { status: 'licensed', asset },
      b: { status: 'icon', icon: 'person', reason: 'licença não aceita' },
    },
  });
  const [atlas] = report.atlases;
  assert.equal(atlas.assetLicenses.length, 1);
  assert.equal(atlas.assetLicenses[0].entityId, 'wiki-a');
  assert.deepEqual(report.iconOnly, [
    { entity: 'wiki-b', icon: 'person', reason: 'licença não aceita' },
  ]);
  graphOf(report);
});

test('rascunho enxuto antigo continua virando afirmação em texto, sem aresta', () => {
  const report = convertDrafts(fixtureItems());
  assert.ok(report.atlases.every((atlas) => atlas.relations.length === 0));
  assert.ok(report.atlases.some((atlas) => atlas.claims.some((c) => /^Relação com /.test(c.text))));
});

test('tradição registrada entra na lista sem mudar a ordem das fixas', () => {
  const merged = mergeTraditions(
    [{ key: 'b', label: 'B' }],
    [
      { slug: 'z', titles: { pt: 'Zê' } },
      { slug: 'b', titles: { pt: 'Outro B' } },
      { slug: 'c', titles: { pt: 'Cê' } },
    ],
  );
  assert.deepEqual(merged, [
    { key: 'b', label: 'B' },
    { key: 'c', label: 'Cê' },
    { key: 'z', label: 'Zê' },
  ]);
});

test('rascunhos de uma tradição não apagam a coleção de outra', async () => {
  const root = await mkdtemp(join(tmpdir(), 'atlas-wiki-parcial-'));
  const drafts = join(root, 'drafts');
  const knowledge = join(root, 'knowledge');
  await mkdir(join(knowledge, 'collections'), { recursive: true });
  const write = async (tradition, value) => {
    const dir = join(drafts, tradition, 'extracts');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${value.entity.id}.json`), JSON.stringify(value), 'utf8');
  };
  await write('marxismo', draft({ id: 'a', label: 'Vladimir Lenin', qid: 'Q1001' }));
  await write('anarquismo', draft({ id: 'b', label: 'Emma Goldman', qid: 'Q1002' }));
  const existing = existingAtlasFixture();
  const bytes = await formatJson(existing);
  const hash = sha256(bytes);
  const file = `collections/${existing.id}.${hash}.json`;
  await writeFile(join(knowledge, file), bytes);
  await writeFile(
    join(knowledge, 'manifest.json'),
    await formatJson({
      schemaVersion: 1,
      id: 'knowledge-graph-atlas',
      version: '1.0.0',
      updatedAt: '2026-11-03',
      collections: [{ id: existing.id, file, sha256: hash }],
    }),
  );
  await convertDraftsToCollections({ root: drafts, directory: knowledge });
  await rm(join(drafts, 'marxismo'), { recursive: true });
  await convertDraftsToCollections({ root: drafts, directory: knowledge });
  const { collections } = JSON.parse(await readFile(join(knowledge, 'manifest.json'), 'utf8'));
  assert.deepEqual(collections.map((entry) => entry.id).sort(), [
    'atlas-anarquismo',
    'atlas-existente',
    'atlas-marxismo',
  ]);
});
