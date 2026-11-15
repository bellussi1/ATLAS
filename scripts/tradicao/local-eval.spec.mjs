import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildLocalExtractMessages,
  evaluateLocalDraft,
  loadSampleRecords20,
} from './local-eval.mjs';
import { richSourceText } from './prompts.mjs';

const sampleEntity = {
  id: 'person-eduard-bernstein',
  label: 'Eduard Bernstein',
  type: 'pessoa',
  qid: 'Q75786',
};

const sampleArticle = {
  url: 'https://pt.wikipedia.org/wiki/Eduard_Bernstein',
  revision: '12345',
  sections: [
    {
      index: 0,
      heading: 'Biografia',
      text: 'Eduard Bernstein escreveu As Premissas do Socialismo em 1899 e criticou a ortodoxia de Karl Kautsky. Friedrich Engels foi seu amigo próximo em Londres.',
    },
  ],
  links: [
    {
      text: 'Karl Kautsky',
      target: 'Karl Kautsky',
      section: 0,
      heading: 'Biografia',
      paragraph: 0,
    },
    {
      text: 'Friedrich Engels',
      target: 'Friedrich Engels',
      section: 0,
      heading: 'Biografia',
      paragraph: 0,
    },
  ],
  targets: [
    { title: 'Karl Kautsky', qid: 'Q76516', type: 'pessoa', missing: false, redirectedFrom: [] },
    {
      title: 'Friedrich Engels',
      qid: 'Q36998',
      type: 'pessoa',
      missing: false,
      redirectedFrom: [],
    },
  ],
  references: { bibliography: [] },
};

test('loadSampleRecords20 locates all 20 benchmark articles from model-choice.json', async () => {
  const { ids, records } = await loadSampleRecords20();
  assert.equal(ids.length, 20);
  assert.equal(records.length, 20);
  assert.ok(records.every((record) => record.article && record.entity?.id));
});

test('evaluateLocalDraft enforces guards.mjs literal quotes, relation verification, and QID resolution', () => {
  const { text } = richSourceText(sampleArticle);
  const messages = buildLocalExtractMessages({
    entity: sampleEntity,
    article: sampleArticle,
    text,
  });
  assert.equal(messages.length, 2);
  assert.match(messages[1].content, /Karl Kautsky \(pessoa, Q76516\)/);

  const rawExtraction = {
    oneLine: 'Teórico alemão do revisionismo socialista.',
    summary: 'Eduard Bernstein formulou o revisionismo democrático no final do século XIX.',
    sections: [
      {
        kind: 'ideias-centrais',
        text: 'Defendeu a revisão da ortodoxia marxista defendida por Kautsky.',
        quote:
          'Eduard Bernstein escreveu As Premissas do Socialismo em 1899 e criticou a ortodoxia de Karl Kautsky.',
      },
    ],
    glossary: [
      { term: 'Eduard Bernstein', pt: ['Eduard Bernstein'], en: ['Eduard Bernstein'], aliases: [] },
    ],
    relations: [
      {
        target: 'Karl Kautsky',
        nature: 'reagiu-contra',
        direction: 'entidade-para-alvo',
        sentence: 'Bernstein criticou a ortodoxia de Karl Kautsky em 1899.',
        quote:
          'Eduard Bernstein escreveu As Premissas do Socialismo em 1899 e criticou a ortodoxia de Karl Kautsky.',
      },
      {
        target: 'Friedrich Engels',
        nature: 'influenciou',
        direction: 'alvo-para-entidade',
        sentence: 'Citação inventada que deve ser rejeitada pelas travas de código.',
        quote: 'Frase que nao existe em lugar algum do artigo original.',
      },
    ],
    dates: [
      {
        date: '1899',
        event: 'Publicou As Premissas do Socialismo.',
        quote: 'Eduard Bernstein escreveu As Premissas do Socialismo em 1899',
      },
    ],
    claims: [
      {
        statement: 'Eduard Bernstein criticou a ortodoxia de Karl Kautsky em 1899.',
        kind: 'fact',
        quote:
          'Eduard Bernstein escreveu As Premissas do Socialismo em 1899 e criticou a ortodoxia de Karl Kautsky.',
      },
    ],
  };

  const draft = evaluateLocalDraft({
    entity: sampleEntity,
    article: sampleArticle,
    text,
    rawExtraction,
    rawVerdicts: {
      verdicts: [
        { index: 0, verdict: 'confirma', reason: 'A citação afirma a crítica diretamente.' },
      ],
    },
    model: 'gemma2:9b-instruct-q4_K_M',
  });

  assert.equal(draft.relations.length, 1);
  assert.equal(draft.relations[0].targetQid, 'Q76516');
  assert.equal(draft.relations[0].verified, true);
  assert.ok(
    draft.rejected.some((item) => item.list === 'relations' && item.reason.startsWith('citacao-')),
  );
});
