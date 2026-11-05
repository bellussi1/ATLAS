import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyVerdicts,
  checkRelation,
  contractGaps,
  guardExtraction,
  normalizeText,
  passageFor,
  quoteProblem,
} from './guards.mjs';
import {
  cacheControl,
  messageJson,
  richParams,
  richSourceText,
  richSystem,
  verifyParams,
} from './prompts.mjs';
import { relationNatures, richExtractionSchema } from './rich.mjs';

const text = [
  'Eduard Bernstein nasceu em Berlim em 1850 e foi membro do Partido Social-Democrata da Alemanha.',
  'Foi influenciado por Friedrich Engels durante o exílio em Londres.',
  'Bernstein criticou Karl Kautsky por sua leitura ortodoxa do marxismo.',
  'Karl Marx e Bernstein são frequentemente comparados em estudos sobre o socialismo.',
].join('\n');

const entity = { id: 'p', label: 'Eduard Bernstein', type: 'pessoa', qid: 'Q1' };
const article = {
  qid: 'Q1',
  targets: [
    { title: 'Friedrich Engels', qid: 'Q34943', type: 'pessoa', redirectedFrom: ['Engels'] },
    { title: 'Karl Kautsky', qid: 'Q60025', type: 'pessoa', redirectedFrom: [] },
    {
      title: 'Partido Social-Democrata da Alemanha',
      qid: 'Q49768',
      type: 'partido',
      redirectedFrom: ['SPD'],
    },
  ],
  links: [{ text: 'SPD', target: 'Partido Social-Democrata da Alemanha' }],
};
const ctx = () => ({
  entity,
  article,
  normalizedSource: normalizeText(text),
  index: new Map([
    ['friedrich engels', article.targets[0]],
    ['karl kautsky', article.targets[1]],
    ['partido social-democrata da alemanha', article.targets[2]],
  ]),
});
const good = {
  target: 'Karl Kautsky',
  nature: 'reagiu-contra',
  direction: 'entidade-para-alvo',
  sentence: 'Bernstein criticou Kautsky.',
  quote: 'Bernstein criticou Karl Kautsky por sua leitura ortodoxa',
};

test('citação: só tipografia é normalizada; curta ou inventada é rejeitada com motivo', () => {
  const source = normalizeText('Ele disse “fim” — e saiu da sala do congresso.');
  assert.equal(quoteProblem('ele disse "fim" - e saiu da sala', source), null);
  assert.equal(quoteProblem('Karl Marx', source), 'citacao-curta');
  assert.equal(
    quoteProblem('ele disse outra coisa na sala do congresso', source),
    'citacao-nao-literal',
  );
  assert.equal(quoteProblem(`${'palavra '.repeat(50)}`, source), 'citacao-longa');
});

test('relação boa passa e resolve o QID do alvo pelos links do artigo', () => {
  const { relation, problem } = checkRelation(good, ctx());
  assert.equal(problem, undefined);
  assert.equal(relation.targetQid, 'Q60025');
  assert.equal(relation.verified, false);
});

test('relação sem link no artigo fica sem QID, sem virar aresta depois', () => {
  const { relation } = checkRelation(
    {
      ...good,
      target: 'Kautsky',
      quote: 'Bernstein criticou Karl Kautsky por sua leitura ortodoxa',
    },
    ctx(),
  );
  assert.equal(relation.targetQid, null);
});

test('travas de relação: tipo, direção, alvo na citação, verbo do tipo e voz passiva', () => {
  const cases = [
    [{ nature: 'semelhante-a' }, 'tipo-fora-da-lista'],
    [{ nature: 'related_to' }, 'tipo-fora-da-lista'],
    [{ direction: 'tanto-faz' }, 'direcao-invalida'],
    [{ target: 'Friedrich Engels' }, 'alvo-fora-da-citacao'],
    [
      {
        target: 'Eduard Bernstein',
        quote: 'Bernstein criticou Karl Kautsky por sua leitura ortodoxa',
      },
      'alvo-igual-a-entidade',
    ],
    [{ nature: 'fundou' }, 'sem-verbo-do-tipo'],
    [{ quote: 'Bernstein elogiou Karl Kautsky sem reservas' }, 'citacao-nao-literal'],
    [
      {
        target: 'Friedrich Engels',
        nature: 'influenciou',
        direction: 'entidade-para-alvo',
        quote: 'Foi influenciado por Friedrich Engels durante o exílio',
      },
      'direcao-contraditoria',
    ],
    [{ sentence: '' }, 'frase-ausente'],
  ];
  for (const [change, expected] of cases)
    assert.equal(
      checkRelation({ ...good, ...change }, ctx()).problem,
      expected,
      JSON.stringify(change),
    );
  const passive = checkRelation(
    {
      ...good,
      target: 'Friedrich Engels',
      nature: 'influenciou',
      direction: 'alvo-para-entidade',
      quote: 'Foi influenciado por Friedrich Engels durante o exílio',
    },
    ctx(),
  );
  assert.equal(passive.problem, undefined);
});

test('menção não é relação: citação que só compara não passa', () => {
  const { problem } = checkRelation(
    {
      ...good,
      target: 'Karl Marx',
      nature: 'influenciou',
      quote: 'Karl Marx e Bernstein são frequentemente comparados',
    },
    ctx(),
  );
  assert.equal(problem, 'sem-verbo-do-tipo');
});

const fullOutput = () => ({
  oneLine: 'Teórico alemão do revisionismo social-democrata.',
  summary: 'Resumo neutro.',
  sections: [
    {
      kind: 'origem',
      text: 'Nasceu em Berlim.',
      quote: 'Eduard Bernstein nasceu em Berlim em 1850',
    },
    { kind: 'opiniao', text: 'x', quote: 'Eduard Bernstein nasceu em Berlim em 1850' },
  ],
  glossary: [{ term: 'Bernstein', pt: ['Eduard Bernstein'], en: [], aliases: [] }],
  relations: [good, { ...good, nature: 'semelhante-a' }, good],
  dates: [
    { date: '1850', event: 'Nascimento', quote: 'Eduard Bernstein nasceu em Berlim em 1850' },
    { date: '1851', event: 'Errada', quote: 'Eduard Bernstein nasceu em Berlim em 1850' },
    { date: 'mil e oitocentos', event: 'x', quote: 'Eduard Bernstein nasceu em Berlim em 1850' },
  ],
  claims: [
    {
      statement: 'Foi membro do SPD.',
      kind: 'fact',
      quote: 'foi membro do Partido Social-Democrata da Alemanha',
    },
    { statement: 'Inventada.', kind: 'fact', quote: 'esta frase não está no artigo original' },
    {
      statement: 'Tipo ruim.',
      kind: 'opiniao',
      quote: 'foi membro do Partido Social-Democrata da Alemanha',
    },
  ],
});

test('a resposta inteira passa pelas travas, item a item, com motivo e contagem', () => {
  const { extraction, rejected, counts } = guardExtraction(fullOutput(), { text, entity, article });
  assert.equal(extraction.relations.length, 1);
  assert.equal(extraction.sections.length, 1);
  assert.equal(extraction.dates.length, 1);
  assert.equal(extraction.claims.length, 1);
  const reasons = rejected.map((r) => `${r.list}:${r.reason}`).sort();
  assert.deepEqual(reasons, [
    'claims:citacao-nao-literal',
    'claims:tipo-fora-da-lista',
    'dates:ano-fora-da-citacao',
    'dates:data-invalida',
    'relations:duplicada',
    'relations:tipo-fora-da-lista',
    'sections:secao-fora-da-lista',
  ]);
  assert.equal(counts.relations, 3);
  assert.equal(counts.quotes, 11);
  assert.deepEqual(contractGaps(extraction), []);
  assert.ok(richExtractionSchema.safeParse(extraction).success);
});

test('linha ou resumo longos saem do rascunho e a lacuna fica visível; nada é cortado em silêncio', () => {
  const { extraction, rejected } = guardExtraction(
    { ...fullOutput(), oneLine: 'x'.repeat(141) },
    { text, entity, article },
  );
  assert.equal(extraction.oneLine, null);
  assert.ok(rejected.some((r) => r.list === 'oneLine' && r.reason === 'campo-longo'));
  assert.deepEqual(contractGaps(extraction), ['oneLine']);
});

test('segunda passada: só "confirma" fica; inverte, nao-sustenta e silêncio saem com motivo', () => {
  const relations = [{ target: 'A' }, { target: 'B' }, { target: 'C' }, { target: 'D' }];
  const { relations: kept, rejected } = applyVerdicts(
    relations,
    {
      verdicts: [
        { index: 0, verdict: 'confirma', reason: 'ok' },
        { index: 1, verdict: 'inverte', reason: 'é o outro' },
        { index: 2, verdict: 'nao-sustenta', reason: 'só cita' },
      ],
    },
    { model: 'm' },
  );
  assert.deepEqual(kept, [{ target: 'A', verified: true, verifiedBy: 'm' }]);
  assert.deepEqual(
    rejected.map((r) => r.reason),
    ['segunda-passada:inverte', 'segunda-passada:nao-sustenta', 'segunda-passada:sem-veredito'],
  );
});

test('o trecho da segunda passada é o parágrafo da citação, com limite', () => {
  assert.equal(passageFor('criticou Karl Kautsky por', text), text.split('\n')[2]);
  assert.equal(passageFor('não existe aqui', text), 'não existe aqui');
  const long = `${'a '.repeat(2000)}citação central${' b'.repeat(2000)}`;
  const passage = passageFor('citação central', long, 300);
  assert.ok(passage.length <= 300 && passage.includes('citação central'));
});

test('o pedido fixa modelo, effort, formato e cache só no prompt fixo', () => {
  const params = richParams({
    entity,
    text,
    model: 'claude-haiku-5-5',
    effort: 'low',
    requestCount: 20,
  });
  assert.equal(params.model, 'claude-haiku-5-5');
  assert.equal(params.output_config.effort, 'low');
  assert.equal(params.output_config.format.type, 'json_schema');
  assert.deepEqual(params.system[0].cache_control, { type: 'ephemeral', ttl: '1h' });
  assert.ok(!params.system[0].text.includes(entity.label), 'o prefixo não varia por entidade');
  assert.ok(params.messages[0].content.includes(entity.label));
  assert.equal(cacheControl(2), null);
  assert.equal(
    richParams({ entity, text, model: 'm', effort: 'low', requestCount: 2 }).system[0]
      .cache_control,
    undefined,
  );
  // Mínimo cacheável do Haiku 5.5: 512 tokens; a 4 caracteres por token, o prompt precisa passar de 2 mil.
  assert.ok(richSystem.length > 2500, `prompt fixo com ${richSystem.length} caracteres`);
  for (const nature of relationNatures) assert.ok(richSystem.includes(nature), nature);
  const verify = verifyParams({
    entity,
    relations: [good],
    text,
    model: 'm',
    effort: 'low',
  });
  assert.ok(
    verify.messages[0].content.includes(
      'Bernstein criticou Karl Kautsky por sua leitura ortodoxa do marxismo.',
    ),
  );
});

test('o modelo lê texto e bibliografia; as citações são conferidas contra o mesmo texto', () => {
  const { text: read, truncated } = richSourceText({
    sections: [{ index: 0, heading: '', text: 'Corpo do artigo.' }],
    references: { bibliography: [{ text: 'Bernstein, E. As premissas do socialismo (1899).' }] },
  });
  assert.ok(read.includes('Corpo do artigo.'));
  assert.ok(read.includes('As premissas do socialismo'));
  assert.equal(truncated, false);
});

test('resposta recusada, cortada ou vazia vira erro, nunca rascunho vazio', () => {
  const text = (value) => [
    { type: 'thinking', thinking: '' },
    { type: 'text', text: value },
  ];
  assert.deepEqual(messageJson({ stop_reason: 'end_turn', content: text('{"a":1}') }), { a: 1 });
  assert.throws(() => messageJson({ stop_reason: 'refusal', content: [] }), /refusal/);
  assert.throws(
    () => messageJson({ stop_reason: 'max_tokens', content: text('{"a"') }),
    /max_tokens/,
  );
  assert.throws(() => messageJson({ stop_reason: 'end_turn', content: [] }), /sem bloco/);
});
