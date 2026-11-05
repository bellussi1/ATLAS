import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildGlossary,
  modelChoiceSchema,
  richExtractionSchema,
  richGaps,
  unverifiedQuotes,
} from './rich.mjs';
import { decide, defaults, expand, isGenericTitle, scoreCandidate, summarize } from './scoring.mjs';

test('títulos genéricos nunca são entidade', () => {
  for (const title of [
    'Lista de partidos',
    'Mercúrio (desambiguação)',
    '1917',
    'Século XIX',
    '1990s',
  ])
    assert.ok(isGenericTitle(title), title);
  for (const title of ['Revolução de 1917', 'Eduard Bernstein', 'Terceira via'])
    assert.ok(!isGenericTitle(title), title);
});

test('a pontuação é global primeiro: idiomas, nós que citam e posição do link', () => {
  const base = { languages: 20, citedByAccepted: 1, linkPosition: 1 };
  assert.ok(scoreCandidate({ ...base, languages: 60 }) > scoreCandidate(base));
  assert.ok(scoreCandidate({ ...base, citedByAccepted: 5 }) > scoreCandidate(base));
  assert.ok(scoreCandidate({ ...base, linkPosition: 0 }) > scoreCandidate(base));
  assert.equal(scoreCandidate({ languages: 500 }), scoreCandidate({ languages: 80 }));
});

test('faixas: aceita acima do limite alto, revisa no meio, descarta abaixo; regional com limiar menor', () => {
  const t = defaults.thresholds;
  assert.equal(decide({ title: 'A', score: t.accept }).decision, 'accept');
  assert.equal(decide({ title: 'A', score: t.review }).decision, 'review');
  assert.equal(decide({ title: 'A', score: t.review - 1 }).decision, 'discard');
  const regional = decide(
    { title: 'Integralismo', score: t.regionalReview },
    { regional: 'América Latina ou Brasil' },
  );
  assert.equal(regional.decision, 'review');
  assert.match(regional.reason, /regional/);
  assert.equal(decide({ title: 'Lista de coisas', score: 999 }).decision, 'discard');
});

/** Fake Wikidata: root -> a, b (ring 1); a -> c, b; c -> d (ring 3 only if c is accepted). */
const graph = {
  Q1: [
    { qid: 'Q2', title: 'A', languages: 70, linkPosition: 0 },
    { qid: 'Q3', title: 'B', languages: 5, linkPosition: 0.9 },
    { qid: 'Q9', title: 'Lista de A', languages: 80, linkPosition: 0 },
  ],
  Q2: [
    // Fora do anel 1, a posição do link não prova relevância: C entra por vínculo declarado.
    { qid: 'Q4', title: 'C', languages: 70, linkPosition: 0.1, via: ['P737'] },
    { qid: 'Q3', title: 'B', languages: 5, linkPosition: 0.2 },
  ],
  Q4: [{ qid: 'Q5', title: 'D', languages: 70, linkPosition: 0.1 }],
};

test('a expansão reconcilia por QID, respeita anéis e teto e não abre o que não foi aceito', async () => {
  const found = await expand(['Q1'], async (qid) => graph[qid] ?? [], {
    thresholds: { accept: 60, review: 30, regionalReview: 20 },
    ringCaps: { 1: 2, 2: 5, 3: 5 },
  });
  const by = Object.fromEntries(found.map((c) => [c.qid, c]));
  assert.equal(by.Q2.decision, 'accept');
  assert.equal(by.Q2.ring, 1);
  assert.equal(by.Q9.decision, 'discard');
  assert.equal(by.Q3.ring, 1, 'B já visto no anel 1 não reaparece no 2');
  assert.equal(by.Q4.ring, 2);
  assert.equal(by.Q5.ring, 3);
  assert.equal(found.filter((c) => c.qid === 'Q3').length, 1);
  assert.deepEqual(
    found
      .filter((c) => c.ring === 1)
      .map((c) => c.qid)
      .sort(),
    ['Q2', 'Q3', 'Q9'],
  );
  assert.equal(
    summarize(found).byDecision.accept,
    found.filter((c) => c.decision === 'accept').length,
  );
});

test('o teto do anel descarta o excedente com motivo', async () => {
  const wide = {
    Q1: Array.from({ length: 6 }, (_, i) => ({
      qid: `Q${10 + i}`,
      title: `N${i}`,
      languages: 70,
      linkPosition: 0,
    })),
  };
  const found = await expand(['Q1'], async (qid) => wide[qid] ?? [], {
    ringCaps: { 1: 3, 2: 3, 3: 3 },
  });
  assert.equal(found.filter((c) => c.decision === 'accept').length, 3);
  assert.equal(found.filter((c) => /teto do anel/.test(c.reason)).length, 3);
});

const rich = () => ({
  oneLine: 'Corrente que busca reformar o capitalismo por vias democráticas.',
  summary: 'Resumo curto.',
  sections: [
    { kind: 'origem', text: 'Nasce na Alemanha.', quote: 'nasceu na Alemanha do século XIX' },
  ],
  glossary: [{ term: 'Revisionismo', pt: ['revisionismo'], en: ['revisionism'], aliases: [] }],
  relations: [
    {
      target: 'Karl Marx',
      nature: 'reagiu-contra',
      direction: 'entidade-para-alvo',
      sentence: 'Criticou Marx.',
      quote: 'criticou Marx',
    },
  ],
  dates: [],
  claims: [],
});

test('conteúdo rico: contrato, citação literal e rascunho enxuto', () => {
  assert.ok(richExtractionSchema.safeParse(rich()).success);
  assert.equal(
    richExtractionSchema.safeParse({ ...rich(), oneLine: 'x'.repeat(141) }).success,
    false,
  );
  const similar = rich();
  similar.relations[0].nature = 'semelhante-a';
  assert.equal(richExtractionSchema.safeParse(similar).success, false);
  const source = 'O movimento nasceu na Alemanha do século XIX e criticou Marx.';
  assert.deepEqual(unverifiedQuotes(rich(), source), []);
  assert.equal(unverifiedQuotes(rich(), 'outro texto').length, 2);
  assert.deepEqual(richGaps(rich()), []);
  assert.ok(
    richGaps({ summary: 'curto', dates: [], relations: [], claims: [] }).includes('oneLine'),
  );
});

test('glossário: termo de uma entidade liga; termo disputado, curto ou comum não', () => {
  const entity = (id, ...terms) => ({
    id,
    glossary: terms.map((term) => ({ term, pt: [], en: [], aliases: [] })),
  });
  const { links, ambiguous } = buildGlossary([
    entity('a', 'Revisionismo', 'Estado', 'Via'),
    entity('b', 'revisionismo', 'Reformismo'),
    entity('c', 'Terceira Via'),
  ]);
  assert.deepEqual(links.map((l) => l.term).sort(), ['reformismo', 'terceira via']);
  assert.deepEqual(ambiguous, [{ term: 'revisionismo', entityIds: ['a', 'b'] }]);
});

test('escolha de modelo exige Haiku low e medium medidos; só relações pode subir sem medição', () => {
  const candidate = (model, effort) => ({
    model,
    effort,
    residualError: 0.03,
    quotesRejected: 0.1,
    relationsRejected: 0.3,
    costUsd: 0.1,
  });
  const choice = {
    measuredAt: '2026-11-04',
    sample: { size: 10, entityIds: Array.from({ length: 10 }, (_, i) => `e${i}`) },
    candidates: [candidate('claude-haiku-5-5', 'low'), candidate('claude-haiku-5-5', 'medium')],
    chosen: { extracao: { model: 'claude-haiku-5-5', effort: 'medium' } },
    rationale: 'Haiku medium ficou abaixo de 5% de erro restante.',
  };
  assert.ok(modelChoiceSchema.safeParse(choice).success);
  assert.equal(
    modelChoiceSchema.safeParse({ ...choice, candidates: choice.candidates.slice(0, 1) }).success,
    false,
  );
  assert.ok(
    modelChoiceSchema.safeParse({
      ...choice,
      chosen: {
        extracao: { model: 'claude-haiku-5-5', effort: 'medium' },
        relacoes: { model: 'claude-sonnet-5-5', effort: 'low' },
      },
    }).success,
  );
  assert.equal(
    modelChoiceSchema.safeParse({
      ...choice,
      chosen: { extracao: { model: 'claude-opus-5-5', effort: 'low' } },
    }).success,
    false,
  );
});

test('nos anéis 2 e 3, lugar e conceito saem e pessoa sem vínculo regional vai para a lista curta', async () => {
  const graph = {
    Q1: [{ qid: 'Q2', title: 'Ideia', type: 'ideologia', languages: 70, linkPosition: 0 }],
    Q2: [
      { qid: 'Q3', title: 'México', type: 'lugar', languages: 70, linkPosition: 0, via: ['P17'] },
      {
        qid: 'Q4',
        title: 'Pobreza',
        type: 'conceito',
        languages: 70,
        linkPosition: 0,
        via: ['P17'],
      },
      { qid: 'Q5', title: 'Kant', type: 'pessoa', languages: 70, linkPosition: 0, via: ['P737'] },
      {
        qid: 'Q6',
        title: 'Lula',
        type: 'pessoa',
        languages: 70,
        linkPosition: 0,
        regions: ['Q155'],
      },
    ],
  };
  const found = await expand(['Q1'], async (qid) => graph[qid] ?? [], {
    thresholds: { accept: 60, review: 30, regionalReview: 20 },
  });
  const by = Object.fromEntries(found.map((c) => [c.title, c.decision]));
  assert.deepEqual(by, {
    Ideia: 'accept',
    México: 'discard',
    Pobreza: 'discard',
    Kant: 'review',
    Lula: 'accept',
  });
  assert.equal(decide({ title: 'Língua castelhana', score: 999 }).decision, 'discard');
  assert.equal(decide({ title: '11 de setembro', score: 999 }).decision, 'discard');
});
