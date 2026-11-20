import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  applyCandidates,
  candidateSchema,
  candidateToSeed,
  dedupeCandidates,
  discoverFromGraphGaps,
  discoverFromMarxists,
  isDisqualifiedTitle,
  loadTopics,
  runDiscovery,
  scoreCandidate,
  slugifyTitle,
  wikipediaUrl,
} from './discover.mjs';
import {
  countWords,
  detectHttpOrSoftError,
  extractHeadings,
  loadSeeds,
  sha256Text,
} from './extract.mjs';

describe('firecrawl-local ingestion', () => {
  it('validates the curated seeds catalog and enforces unique slugs/urls', async () => {
    const catalog = await loadSeeds();
    assert.ok(catalog.seeds.length >= 30, 'expected at least 30 curated seeds');

    const slugs = new Set();
    const urls = new Set();
    for (const seed of catalog.seeds) {
      assert.ok(!slugs.has(seed.slug), `duplicate slug: ${seed.slug}`);
      assert.ok(!urls.has(seed.url), `duplicate url: ${seed.url}`);
      slugs.add(seed.slug);
      urls.add(seed.url);
    }
  });

  it('extracts headings, counts words, and computes stable sha256 digests', () => {
    const md =
      '# Título Principal\n\nTexto introdutório com [link](https://example.com).\n\n## Seção 1\nConteúdo relevante.';
    assert.deepEqual(extractHeadings(md), ['Título Principal', 'Seção 1']);
    assert.equal(countWords(md), 10);
    assert.equal(sha256Text('atlas'), sha256Text('atlas'));
    assert.equal(sha256Text('atlas').length, 64);
  });

  it('rejects HTTP >= 400 and short soft-404 pages', () => {
    assert.ok(detectHttpOrSoftError('ok', { statusCode: 404 }));
    assert.ok(detectHttpOrSoftError('# Not Found\nError 404 on this server.', {}));
    assert.equal(
      detectHttpOrSoftError('# Montesquieu\n' + 'palavra '.repeat(100), { statusCode: 200 }),
      null,
    );
  });
});

describe('firecrawl discovery', () => {
  it('validates the topic catalog with unique ids', async () => {
    const catalog = await loadTopics();
    assert.ok(catalog.topics.length >= 5);
    const ids = catalog.topics.map((topic) => topic.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const topic of catalog.topics) {
      assert.ok(topic.atlasGap.length > 0);
      assert.ok(topic.domain.length > 0);
    }
  });

  it('builds stable slugs and canonical Wikipedia URLs', () => {
    assert.equal(slugifyTitle('Ato Institucional n.º 5'), 'ato-institucional-n-5');
    assert.equal(slugifyTitle('  Raízes do Brasil '), 'raizes-do-brasil');
    assert.equal(slugifyTitle('???'), '');
    assert.equal(
      wikipediaUrl('pt', 'Golpe de Estado no Brasil em 1964'),
      'https://pt.wikipedia.org/wiki/Golpe_de_Estado_no_Brasil_em_1964',
    );
    assert.equal(
      wikipediaUrl('en', "1964 Brazilian coup d'état"),
      "https://en.wikipedia.org/wiki/1964_Brazilian_coup_d'%C3%A9tat",
    );
  });

  it('disqualifies namespaces, lists and disambiguation pages', () => {
    assert.ok(isDisqualifiedTitle('Categoria:Marxismo'));
    assert.ok(isDisqualifiedTitle('Lista de marxistas'));
    assert.ok(isDisqualifiedTitle('Marx (desambiguação)'));
    assert.ok(!isDisqualifiedTitle('Materialismo histórico'));
  });

  it('ranks category and link evidence above isolated Wikidata labels', () => {
    const strong = scoreCandidate({ pageLength: 4000, viaCategory: true });
    const linked = scoreCandidate({ pageLength: 4000, viaLink: true });
    const wikidata = scoreCandidate({ pageLength: 4000, viaWikidata: true });
    const short = scoreCandidate({ pageLength: 500, viaCategory: true });
    assert.ok(strong > linked);
    assert.ok(linked > wikidata);
    assert.ok(short < strong);
    assert.ok(scoreCandidate({}) >= 0);
  });

  it('dedupes by URL and disambiguates repeated slugs', () => {
    const base = {
      title: 'Tema',
      domain: 'filosofia-politica',
      language: 'pt-BR',
      sourceName: 'Wikipédia (pt)',
      license: 'CC BY-SA 4.0',
      usagePolicy: 'open-reuse',
      atlasGap: 'Tema',
      topicId: 'tema',
      origin: 'discovery',
      discoveredFrom: 'wikipedia-category:Categoria:Tema',
      discoveredAt: '2026-11-19T00:00:00.000Z',
    };
    const items = dedupeCandidates([
      candidateSchema.parse({
        ...base,
        slug: 'wiki-pt-tema',
        url: 'https://pt.wikipedia.org/wiki/Tema',
        score: 60,
      }),
      candidateSchema.parse({
        ...base,
        slug: 'wiki-pt-tema',
        url: 'https://pt.wikipedia.org/wiki/Tema',
        score: 80,
      }),
      candidateSchema.parse({
        ...base,
        slug: 'wiki-pt-tema',
        url: 'https://pt.wikipedia.org/wiki/Tema_2',
        score: 70,
      }),
    ]);
    assert.equal(items.length, 2);
    assert.equal(items[0].score, 80);
    assert.equal(items[1].slug, 'wiki-pt-tema-2');
  });

  it('maps a candidate to a pending seed without inventing a licence', () => {
    const seed = candidateToSeed({
      slug: 'wiki-pt-marxismo',
      title: 'Marxismo',
      domain: 'filosofia-politica',
      language: 'pt-BR',
      sourceName: 'Wikipédia (pt)',
      url: 'https://pt.wikipedia.org/wiki/Marxismo',
      license: 'CC BY-SA 4.0',
      usagePolicy: 'open-reuse',
      atlasGap: 'Marxismo',
      origin: 'discovery',
      discoveredFrom: 'wikipedia-links:Marxismo',
      discoveredAt: '2026-11-19T00:00:00.000Z',
      score: 85,
    });
    assert.equal(seed.origin, 'discovery');
    assert.equal(seed.review, 'pending');
    assert.equal(seed.usagePolicy, 'open-reuse');
    assert.equal(seed.score, 85);
  });

  it('discovers offline with injected sources and dedupes candidates', async () => {
    const topic = {
      id: 'marxismo',
      domain: 'filosofia-politica',
      atlasGap: 'Marxismo',
      wikidata: ['Q7264'],
      wikipedia: { pt: ['Marxismo'] },
      categories: { pt: ['Categoria:Marxismo'] },
      marxists: [],
    };
    const dir = await mkdtemp(join(tmpdir(), 'atlas-discovery-'));
    const topicsPath = join(dir, 'topics.json');
    await writeFile(
      topicsPath,
      JSON.stringify({ schemaVersion: 1, description: 'teste', topics: [topic] }),
      'utf8',
    );
    const outputPath = join(dir, 'candidates.json');

    const { payload } = await runDiscovery({
      topicsPath,
      outputPath,
      wikipedia: true,
      wikidata: true,
      marxists: false,
      discoverCategoryMembersImpl: async () => ['Marxismo', 'Materialismo histórico'],
      discoverLinkedArticlesImpl: async () => ['Marxismo', 'Categoria:Ignorada'],
      fetchPageInfoImpl: async (_lang, titles) =>
        titles.map((title) => ({
          title,
          url: wikipediaUrl('pt', title),
          length: 5000,
        })),
      discoverFromWikidataImpl: async () => [
        {
          lang: 'pt',
          title: 'Marxismo',
          kind: 'ideology',
          discoveredFrom: 'wikidata:Q7264',
          viaWikidata: true,
        },
      ],
    });

    assert.equal(payload.summary.topics, 1);
    assert.equal(payload.items.length, 2);
    assert.ok(payload.items.every((item) => item.origin === 'discovery'));
    assert.equal(payload.items[0].score, 95);
  });

  it('applies only candidates above the score floor and skips known URLs', async () => {
    const catalog = await loadSeeds();
    const dir = await mkdtemp(join(tmpdir(), 'atlas-seeds-'));
    const seedsPath = join(dir, 'seeds.json');
    await writeFile(
      seedsPath,
      JSON.stringify({
        schemaVersion: 1,
        description: 'teste',
        seeds: catalog.seeds.slice(0, 2),
      }),
      'utf8',
    );

    const known = catalog.seeds[0];
    const candidates = [
      candidateSchema.parse({
        slug: 'wiki-pt-novo',
        title: 'Novo',
        domain: 'filosofia-politica',
        language: 'pt-BR',
        sourceName: 'Wikipédia (pt)',
        url: 'https://pt.wikipedia.org/wiki/Novo',
        license: 'CC BY-SA 4.0',
        usagePolicy: 'open-reuse',
        atlasGap: 'Novo',
        topicId: 'novo',
        origin: 'discovery',
        discoveredFrom: 'wikipedia-category:Categoria:Novo',
        discoveredAt: '2026-11-19T00:00:00.000Z',
        score: 90,
      }),
      candidateSchema.parse({
        slug: 'wiki-pt-baixo',
        title: 'Baixo',
        domain: 'filosofia-politica',
        language: 'pt-BR',
        sourceName: 'Wikipédia (pt)',
        url: 'https://pt.wikipedia.org/wiki/Baixo',
        license: 'CC BY-SA 4.0',
        usagePolicy: 'open-reuse',
        atlasGap: 'Baixo',
        topicId: 'baixo',
        origin: 'discovery',
        discoveredFrom: 'wikipedia-category:Categoria:Baixo',
        discoveredAt: '2026-11-19T00:00:00.000Z',
        score: 10,
      }),
      candidateSchema.parse({
        slug: 'wiki-pt-conhecido',
        title: 'Conhecido',
        domain: 'filosofia-politica',
        language: 'pt-BR',
        sourceName: 'Wikipédia (pt)',
        url: known.url,
        license: 'CC BY-SA 4.0',
        usagePolicy: 'open-reuse',
        atlasGap: 'Conhecido',
        topicId: 'conhecido',
        origin: 'discovery',
        discoveredFrom: 'wikipedia-category:Categoria:Conhecido',
        discoveredAt: '2026-11-19T00:00:00.000Z',
        score: 95,
      }),
    ];

    const result = await applyCandidates({ candidates, seedsPath, limit: 10, minScore: 55 });
    assert.equal(result.applied.length, 1);
    assert.equal(result.applied[0].slug, 'wiki-pt-novo');
    const written = JSON.parse(await readFile(seedsPath, 'utf8'));
    assert.equal(written.seeds.length, 3);
    assert.equal(written.seeds.at(-1).review, 'pending');
  });

  it('turns graph gaps into candidates and prefers the exact title', async () => {
    const queue = {
      items: [
        {
          id: 'gap-graph-person-sergio-buarque',
          entityId: 'person-sergio-buarque',
          topic: 'Sérgio Buarque de Holanda',
          domain: 'historia-brasil',
          query: 'Sérgio Buarque de Holanda historiador',
          queueMode: 'fonte',
        },
        {
          id: 'gap-graph-concept-mais-valia',
          entityId: 'concept-mais-valia',
          topic: 'Mais-valia',
          domain: 'filosofia-politica',
          query: 'Mais-valia',
          queueMode: 'relacao',
        },
      ],
    };
    const { candidates, requests } = await discoverFromGraphGaps(queue, {
      limit: 5,
      mode: 'fonte',
      discoveredAt: '2026-11-19T00:00:00.000Z',
      searchImpl: async (lang) =>
        lang === 'pt' ? ['Sérgio Buarque de Holanda', 'Sérgio Buarque'] : [],
      fetchPageInfoImpl: async (lang, titles) =>
        titles.map((title, index) => ({
          title,
          url: wikipediaUrl(lang, title),
          length: index === 0 ? 6000 : 900,
        })),
    });
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].title, 'Sérgio Buarque de Holanda');
    assert.equal(candidates[0].score, 95);
    assert.equal(candidates[0].discoveredFrom, 'graph-gap:person-sergio-buarque');
    assert.equal(candidates[0].language, 'pt-BR');
    assert.equal(requests.length, 1);
  });

  it('runs discovery from a graph queue without repeating the topic catalog', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'atlas-graph-discovery-'));
    const topicsPath = join(dir, 'topics.json');
    const outputPath = join(dir, 'candidates.json');
    await writeFile(
      topicsPath,
      JSON.stringify({
        schemaVersion: 1,
        description: 'teste',
        topics: [
          {
            id: 'marxismo',
            domain: 'filosofia-politica',
            atlasGap: 'Marxismo',
            wikipedia: {},
            categories: {},
            marxists: [],
          },
        ],
      }),
      'utf8',
    );

    // A queue fixture keeps the test independent of the local, unversioned gap queue.
    const graphQueuePath = join(dir, 'lacunas-do-grafo.json');
    await writeFile(graphQueuePath, JSON.stringify({ schemaVersion: 1, items: [] }), 'utf8');

    const { payload } = await runDiscovery({
      topicsPath,
      outputPath,
      graphQueuePath,
      topics: false,
      graph: true,
      graphMode: 'fonte',
      graphLimit: 3,
      discoverFromGraphGapsImpl: async () => ({
        candidates: [
          {
            slug: 'wiki-pt-mais-valia',
            title: 'Mais-valia',
            domain: 'filosofia-politica',
            language: 'pt-BR',
            sourceName: 'Wikipédia (pt)',
            url: 'https://pt.wikipedia.org/wiki/Mais-valia',
            license: 'CC BY-SA 4.0',
            usagePolicy: 'open-reuse',
            atlasGap: 'Mais-valia',
            topicId: 'concept-mais-valia',
            origin: 'discovery',
            discoveredFrom: 'graph-gap:concept-mais-valia',
            discoveredAt: '2026-11-19T00:00:00.000Z',
            score: 90,
          },
        ],
        requests: [{ source: 'graph-gap-search', found: 1 }],
      }),
    });

    assert.equal(payload.summary.topics, 0);
    assert.equal(payload.summary.graph.candidates, 1);
    assert.equal(payload.items.length, 1);
    assert.equal(payload.items[0].discoveredFrom, 'graph-gap:concept-mais-valia');
  });

  it('refuses non-Marxists hosts in the Marxists adapter', async () => {
    await assert.rejects(
      () => discoverFromMarxists('https://example.com/index.htm'),
      /não autorizado/,
    );
  });
});
