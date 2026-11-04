import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { fetchArticle } from './article.mjs';
import { rankMentions } from './discovery.mjs';
import { createHttp, recordingHttp, replayHttp } from './http.mjs';
import { loadCapture, saveCapture } from './raw.mjs';

const pageHtml = `<html><body>
<section><p>Social-democracia é um movimento reformista. <a rel="mw:WikiLink" href="./Eduard_Bernstein">Bernstein</a> defendeu reformas.</p></section>
<section><h2>Referências</h2><ul><li><a rel="mw:WikiLink" href="./Ferdinand_Lassalle">Lassalle</a></li></ul></section>
</body></html>`;

const qidOf = {
  'Social-democracia': 'Q121254',
  'Eduard Bernstein': 'Q75786',
  'Ferdinand Lassalle': 'Q75784',
};

/** Offline transport: answers the MediaWiki, Parsoid and Wikidata shapes used by fetchArticle. */
function fakeTransport(calls) {
  const json = (value) => ({
    bytes: Buffer.from(JSON.stringify(value)),
    contentType: 'application/json',
  });
  return createHttp(async (url) => {
    calls.push(String(url));
    const target = new URL(url);
    if (target.pathname.startsWith('/api/rest_v1/'))
      return {
        bytes: Buffer.from(pageHtml),
        contentType: 'text/html',
        etag: '"4242/uuid"',
      };
    const action = target.searchParams.get('action');
    if (action === 'query') {
      const titles = target.searchParams.get('titles').split('|');
      return json({
        query: {
          pages: titles.map((title) => ({
            title,
            pageprops: { wikibase_item: qidOf[title] },
          })),
        },
      });
    }
    if (action === 'wbgetentities') {
      const ids = target.searchParams.get('ids').split('|');
      const entities = Object.fromEntries(
        ids.map((id) => [
          id,
          id === 'Q121254'
            ? { claims: {} }
            : { claims: { P31: [{ mainsnak: { datavalue: { value: { id: 'Q5' } } } }] } },
        ]),
      );
      return json({ entities });
    }
    throw Error(`URL inesperada no teste: ${url}`);
  });
}

const article = ({
  lang = 'pt',
  title,
  links,
  targets,
  sections = [{ index: 0, heading: '', text: 'x' }],
}) => ({
  lang,
  title,
  sections,
  links,
  targets,
});

test('counts a mention once per article, from body links only', () => {
  const targets = [
    { title: 'Eduard Bernstein', qid: 'Q75786', type: 'pessoa' },
    { title: 'Ferdinand Lassalle', qid: 'Q75784', type: 'pessoa' },
  ];
  const first = article({
    title: 'Artigo A',
    targets,
    sections: [
      { index: 0, heading: '', text: 'x' },
      { index: 1, heading: 'Vida', text: 'y' },
    ],
    links: [
      { section: 0, target: 'Eduard Bernstein' },
      { section: 1, target: 'Eduard Bernstein' },
      { section: 2, target: 'Ferdinand Lassalle' },
    ],
  });
  const second = article({
    title: 'Artigo B',
    targets,
    links: [{ section: 0, target: 'Eduard Bernstein' }],
  });
  const ranked = rankMentions([first, second], { minShared: 2 });
  assert.deepEqual(
    ranked.map(({ title, sharedByCount, linkedFrom, origin }) => ({
      title,
      sharedByCount,
      linkedFrom,
      origin,
    })),
    [
      {
        title: 'Eduard Bernstein',
        sharedByCount: 2,
        linkedFrom: ['pt:Artigo A', 'pt:Artigo B'],
        origin: 'mention',
      },
    ],
  );
});

test('keeps only typed mention targets and drops keys the candidates already hold', () => {
  const targets = [
    { title: 'Eduard Bernstein', qid: 'Q75786', type: 'pessoa' },
    { title: 'Caixa', qid: 'Q9', type: 'não-artigo' },
    { title: 'Ferdinand Lassalle', qid: 'Q75784', type: 'pessoa' },
  ];
  const links = [
    { section: 0, target: 'Eduard Bernstein' },
    { section: 0, target: 'Caixa' },
    { section: 0, target: 'Ferdinand Lassalle' },
  ];
  const articles = [
    article({ title: 'A', targets, links }),
    article({ title: 'B', targets, links }),
  ];
  const ranked = rankMentions(articles, { minShared: 2, excluded: new Set(['Q75786']) });
  assert.deepEqual(
    ranked.map((candidate) => candidate.title),
    ['Ferdinand Lassalle'],
  );
});

test('replays a captured article without touching the network', async () => {
  const calls = [];
  const recorder = recordingHttp(fakeTransport(calls));
  const recorded = await fetchArticle('pt', 'Social-democracia', recorder.http);
  const liveCalls = calls.length;
  assert.ok(liveCalls > 0);
  assert.equal(recorded.revision, '4242');
  assert.deepEqual(
    recorded.targets.map(({ title, type }) => ({ title, type })),
    [
      { title: 'Eduard Bernstein', type: 'pessoa' },
      { title: 'Ferdinand Lassalle', type: 'pessoa' },
    ],
  );

  const replayed = await fetchArticle('pt', 'Social-democracia', replayHttp(recorder.responses));
  assert.deepEqual(replayed, recorded);
  assert.equal(calls.length, liveCalls);
});

test('refuses a URL that the capture does not contain', async () => {
  const recorder = recordingHttp(fakeTransport([]));
  await fetchArticle('pt', 'Social-democracia', recorder.http);
  await assert.rejects(
    () => replayHttp(new Map()).resource('https://pt.wikipedia.org/w/api.php?action=query'),
    /Resposta ausente na captura/,
  );
});

test('saves a capture with digests, loads it back and rejects a tampered body', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'atlas-wiki-capture-'));
  try {
    const recorder = recordingHttp(fakeTransport([]));
    await fetchArticle('pt', 'Social-democracia', recorder.http);
    const saved = await saveCapture('social-democracia', recorder.responses, {
      root: directory,
      capturedAt: new Date('2026-11-03T12:30:00.123Z'),
    });
    assert.match(saved, /social-democracia[\\/]2026-11-03T12-30-00-123Z$/);
    const loaded = await loadCapture(saved);
    assert.equal(loaded.manifest.requests.length, recorder.responses.size);
    assert.ok(loaded.manifest.requests.every((request) => /^[a-f0-9]{64}$/.test(request.sha256)));

    const html = [...loaded.manifest.requests].find((request) => request.kind === 'html');
    await writeFile(join(saved, 'blobs', `${html.sha256}.bin`), 'corrompido');
    await assert.rejects(() => loadCapture(saved), /Falha de integridade\/hash/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
