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
  resolveTarget,
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

test('membro fundador não vira fundador', () => {
  const relation = {
    target: 'PDT',
    nature: 'fundou',
    direction: 'entidade-para-alvo',
    sentence: 'Dilma foi membro fundadora do PDT.',
    quote: 'Dilma foi membro fundadora do Partido Democrático Trabalhista',
  };
  assert.equal(
    checkRelation(relation, {
      ...ctx(),
      normalizedSource: normalizeText(relation.quote),
    }).problem,
    'membro-fundador-nao-e-fundador',
  );
});

test('relação sem link no artigo fica sem QID, sem virar aresta depois', () => {
  assert.equal(checkRelation(good, { ...ctx(), index: new Map() }).relation.targetQid, null);
  const short = { ...good, target: 'Kautsky' };
  assert.equal(checkRelation(short, ctx()).relation.targetQid, 'Q60025', 'sobrenome único resolve');
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

test('calibração sobre a rodada real: verdadeiras passam e "contato próximo" continua barrado', () => {
  const source =
    'Opõe-se, nessa época, aos marxistas ortodoxos, cujo líder, Jules Guesde, discordava.\nRosa Luxemburgo condenou o Socialismo de Bernstein em seu ensaio.\nLá ele teve contato próximo com Friedrich Engels.';
  const check = (relation) =>
    checkRelation(
      { sentence: 'Frase.', direction: 'entidade-para-alvo', ...relation },
      { ...ctx(), normalizedSource: normalizeText(source) },
    );
  assert.equal(
    check({
      target: 'Jules Guesde',
      nature: 'reagiu-contra',
      quote: 'Opõe-se, nessa época, aos marxistas ortodoxos, cujo líder, Jules Guesde',
    }).problem,
    undefined,
  );
  assert.equal(
    check({
      target: 'Rosa Luxemburgo',
      nature: 'reagiu-contra',
      direction: 'alvo-para-entidade',
      quote: 'Rosa Luxemburgo condenou o Socialismo de Bernstein',
    }).problem,
    undefined,
  );
  assert.equal(
    check({
      target: 'Friedrich Engels',
      nature: 'influenciou',
      direction: 'alvo-para-entidade',
      quote: 'Lá ele teve contato próximo com Friedrich Engels.',
    }).problem,
    'sem-verbo-do-tipo',
  );
});

test('alvo genérico sem link não é nó do grafo; corrente em minúscula com link continua', () => {
  const source =
    'A Terceira Via já foi criticada por sociais-democratas irredutíveis e pelo marxismo.';
  const quote =
    'A Terceira Via já foi criticada por sociais-democratas irredutíveis e pelo marxismo';
  const base = {
    nature: 'reagiu-contra',
    direction: 'alvo-para-entidade',
    sentence: 'Frase.',
    quote,
  };
  const context = { ...ctx(), normalizedSource: normalizeText(source) };
  assert.equal(
    checkRelation({ ...base, target: 'sociais-democratas irredutíveis' }, context).problem,
    'alvo-generico',
  );
  const linked = new Map([['marxismo', { title: 'Marxismo', qid: 'Q7264' }]]);
  assert.equal(
    checkRelation({ ...base, target: 'marxismo' }, { ...context, index: linked }).relation
      .targetQid,
    'Q7264',
  );
});

test('título em seção de obras afirma autoria; fora dela, ou de outro autor, não', () => {
  const works = {
    ...article,
    sections: [
      { heading: 'Obras', text: 'Les Deux Méthodes (1900)\nVers la république sociale' },
      { heading: 'Vida', text: 'Les Deux Méthodes (1900) foi citado por muitos autores' },
    ],
  };
  const base = {
    target: 'Les Deux Méthodes',
    nature: 'escreveu',
    direction: 'entidade-para-alvo',
    sentence: 'Escreveu a obra.',
    quote: 'Les Deux Méthodes (1900)',
  };
  const source = normalizeText(works.sections.map((s) => s.text).join('\n'));
  const run = (relation, used = works) =>
    checkRelation(relation, { ...ctx(), article: used, normalizedSource: source });
  assert.equal(run(base).relation.listedIn, 'Obras');
  assert.equal(run({ ...base, direction: 'alvo-para-entidade' }).problem, 'sem-verbo-do-tipo');
  assert.equal(run(base, { ...works, sections: [works.sections[1]] }).problem, 'sem-verbo-do-tipo');
});

test('alvo escrito de outro jeito resolve o QID só quando há um único candidato', () => {
  const engels = { title: 'Friedrich Engels', qid: 'Q1' };
  const hegelA = { title: 'Georg Hegel', qid: 'Q2' };
  const hegelB = { title: 'Hegel Filho', qid: 'Q3' };
  const one = new Map([['friedrich engels', engels]]);
  assert.equal(resolveTarget('Engels', one), engels);
  assert.equal(resolveTarget('Friedrich Engels', one), engels);
  assert.equal(resolveTarget('Friedrich Engels (filósofo)', one), engels);
  assert.equal(resolveTarget('Eng', one), null);
  assert.equal(resolveTarget('Engelsberg', one), null, 'só palavra inteira');
  const two = new Map([
    ['georg hegel', hegelA],
    ['hegel filho', hegelB],
  ]);
  assert.equal(resolveTarget('Hegel', two), null, 'dois candidatos: sem palpite');
});

test('resumo longo fica nas frases inteiras que cabem, com registro; sem frase que caiba, sai', () => {
  const long = `${'Primeira frase curta. '.repeat(25)}${'x'.repeat(100)}.`;
  const cut = guardExtraction({ ...fullOutput(), summary: long }, { text, entity, article });
  assert.ok(cut.extraction.summary.length <= 600);
  assert.ok(cut.extraction.summary.endsWith('curta.'));
  assert.ok(cut.rejected.some((r) => r.reason === 'campo-cortado-na-frase'));
  const none = guardExtraction(
    { ...fullOutput(), summary: 'x'.repeat(700) },
    { text, entity, article },
  );
  assert.equal(none.extraction.summary, null);
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
